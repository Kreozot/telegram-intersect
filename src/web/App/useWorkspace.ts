import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AppStatus,
  PersonSource,
  Snapshot,
  TelegramStatus,
  WorkspaceEvent,
} from "../../shared/contracts.js";
import { limitSelection, toggleSelection } from "../../shared/selection.js";
import { ApiError, api } from "../api/client.js";
import { demoSnapshot } from "../demo.js";
import { shouldPollWorkspace } from "./workspace-refresh.js";

/** Presents recoverable workspace failures without permanently changing the page layout. */
function showErrorNotification(failure: unknown, fallback: string): void {
  notifications.show({
    id: "workspace-error",
    color: "red",
    title: "Something needs attention",
    message: failure instanceof Error ? failure.message : fallback,
    autoClose: 8000,
    withCloseButton: true,
  });
}

/** Describes successful user commands that benefit from explicit completion feedback. */
function commandSuccessMessage(path: string, body: unknown, method: string): string | null {
  if (path === "people" && typeof body === "object" && body !== null && "source" in body) {
    return `${body.source === "contacts" ? "Contacts" : "Dialogs"} loaded successfully.`;
  }
  if (path === "scans/resume") return "Background scan resumed.";
  if (path === "scans/cancel") return "Background scan cancelled.";
  if (path === "analysis" && method === "DELETE") return "Local analysis data cleared.";
  if (path === "telegram" && method === "DELETE") return "Telegram disconnected.";
  if (path === "access" && method === "POST") return "Workspace unlocked.";
  return null;
}

/** Shows short-lived confirmation after a user-visible load or update completes. */
function showSuccessNotification(message: string): void {
  notifications.show({ color: "teal", title: "Done", message });
}

/** Coordinates server-backed workspace state and the interactive or build-time demo modes. */
export function useWorkspace() {
  const demoOnly = import.meta.env.MODE === "demo";
  const [authenticated, setAuthenticated] = useState(false);
  const [accessMode, setAccessMode] = useState<AppStatus["accessMode"]>("key");
  const [maxSelectedPeople, setMaxSelectedPeople] = useState(50);
  const [demo, setDemo] = useState(demoOnly);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    people: [],
    scan: null,
    avatarLoading: false,
  });
  const [telegram, setTelegram] = useState<TelegramStatus>({
    stage: "idle",
    qr: null,
    error: null,
    configured: false,
  });
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!demoOnly) return new Set();
    return new Set(demoSnapshot().people.map((person) => person.id));
  });
  const [selectedCommunities, setSelectedCommunities] = useState<Set<string>>(new Set());
  const [enabledSources, setEnabledSources] = useState<Set<PersonSource>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("intersect.catalog-sources") ?? "[]");
      return new Set(
        Array.isArray(saved)
          ? saved.filter(
              (source): source is PersonSource => source === "contacts" || source === "dialogs",
            )
          : [],
      );
    } catch {
      return new Set();
    }
  });
  const [busy, setBusy] = useState(false);
  const catalogCountsRequested = useRef(false);
  const pollingRequired = shouldPollWorkspace(authenticated, telegram.stage);
  /** Clears protected browser state after locking, expiry, or an unauthorized API response. */
  const clearWorkspace = useCallback(() => {
    catalogCountsRequested.current = false;
    setAuthenticated(false);
    setSnapshot({ people: [], scan: null, avatarLoading: false });
    setTelegram({ stage: "idle", qr: null, error: null, configured: false });
  }, []);

  /** Refreshes normalized workspace data and converts an expired session into the locked UI state. */
  const refreshWorkspace = useCallback(async () => {
    try {
      const [state, data] = await Promise.all([
        api<TelegramStatus>("telegram"),
        api<Snapshot>("snapshot"),
      ]);
      setTelegram(state);
      setSnapshot(data);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        clearWorkspace();
        return;
      }
      throw failure;
    }
  }, [clearWorkspace]);

  /** Checks the browser session at startup, then loads protected data only when it is unlocked. */
  const initializeWorkspace = useCallback(async () => {
    const access = await api<AppStatus>("access");
    setAuthenticated(access.authenticated);
    setAccessMode(access.accessMode);
    setMaxSelectedPeople(access.maxSelectedPeople);
    if (access.authenticated) await refreshWorkspace();
    else clearWorkspace();
  }, [clearWorkspace, refreshWorkspace]);

  useEffect(() => {
    if (demo) return;
    /** Loads access and workspace state once when the real workspace is opened. */
    async function initialize(): Promise<void> {
      try {
        await initializeWorkspace();
      } catch (failure) {
        showErrorNotification(failure, "Connection failed.");
      }
    }
    void initialize();
  }, [demo, initializeWorkspace]);

  useEffect(() => {
    if (demo || !pollingRequired) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    /** Polls after each prior refresh settles so slow responses never overlap. */
    async function poll(): Promise<void> {
      try {
        setTelegram(await api<TelegramStatus>("telegram"));
      } catch (failure) {
        if (!disposed) showErrorNotification(failure, "Connection failed.");
      }
      if (!disposed) timer = setTimeout(poll, 1800);
    }
    timer = setTimeout(poll, 1800);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [demo, pollingRequired]);

  useEffect(() => {
    if (demo || !authenticated) return;
    const source = new EventSource("/api/events", { withCredentials: true });
    /** Applies one server delta without retransmitting unchanged catalog and scan records. */
    function applyWorkspaceEvent(message: MessageEvent<string>): void {
      const event = JSON.parse(message.data) as WorkspaceEvent;
      if (event.type === "resync") {
        void refreshWorkspace();
        return;
      }
      setSnapshot((current) => {
        if (event.type === "avatar-state") return { ...current, avatarLoading: event.running };
        if (event.type === "avatar") {
          return {
            ...current,
            people: current.people.map((person) =>
              person.id === event.entityId ? { ...person, avatarUrl: event.avatarUrl } : person,
            ),
            scan: current.scan
              ? {
                  ...current.scan,
                  people: current.scan.people.map((person) => ({
                    ...person,
                    groups: person.groups.map((group) =>
                      group.id === event.entityId
                        ? { ...group, avatarUrl: event.avatarUrl }
                        : group,
                    ),
                  })),
                }
              : null,
            avatarLoading: current.avatarLoading,
          };
        }
        if (event.type === "scan-state") {
          if (!current.scan || current.scan.id !== event.scanId) {
            return {
              ...current,
              scan: {
                id: event.scanId,
                createdAt: event.createdAt,
                running: event.running,
                people: [],
              },
            };
          }
          return { ...current, scan: { ...current.scan, running: event.running } };
        }
        const existing = current.scan?.id === event.scanId ? current.scan.people : [];
        const people = existing.some((person) => person.personId === event.person.personId)
          ? existing.map((person) =>
              person.personId === event.person.personId ? event.person : person,
            )
          : [...existing, event.person];
        return {
          ...current,
          scan: {
            id: event.scanId,
            createdAt: event.createdAt,
            running: true,
            people,
          },
        };
      });
    }
    source.addEventListener("message", applyWorkspaceEvent);
    return () => source.close();
  }, [authenticated, demo, refreshWorkspace]);

  useEffect(() => {
    if (demo || !authenticated || telegram.stage !== "authorized" || catalogCountsRequested.current)
      return;
    catalogCountsRequested.current = true;
    /** Restarts missing catalog-wide counts once after opening an authorized workspace. */
    async function queueCatalogCounts(): Promise<void> {
      try {
        await api("scans/catalog", "POST");
        await refreshWorkspace();
      } catch (failure) {
        catalogCountsRequested.current = false;
        if (failure instanceof ApiError && failure.status === 401) clearWorkspace();
        showErrorNotification(failure, "Catalog scan could not be queued.");
      }
    }
    void queueCatalogCounts();
  }, [authenticated, clearWorkspace, demo, refreshWorkspace, telegram.stage]);

  useEffect(() => {
    if (demo) return;
    /** Refreshes once when the page becomes visible after browser suspension or tab switching. */
    function refreshWhenVisible(): void {
      if (document.visibilityState !== "visible") return;
      const refresh = authenticated ? refreshWorkspace : initializeWorkspace;
      void refresh().catch((failure: unknown) => {
        showErrorNotification(failure, "Connection failed.");
      });
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [authenticated, demo, initializeWorkspace, refreshWorkspace]);
  useEffect(() => {
    if (demo || busy || !authenticated || telegram.stage !== "authorized" || selected.size === 0)
      return;
    const ids = [...selected];
    const timer = setTimeout(() => {
      /** Enqueues the settled selection without blocking further catalog interaction. */
      async function enqueueSelection(): Promise<void> {
        try {
          await api("scans", "POST", { ids });
          await refreshWorkspace();
        } catch (failure) {
          if (failure instanceof ApiError && failure.status === 401) clearWorkspace();
          showErrorNotification(failure, "Scan could not be queued.");
        }
      }
      void enqueueSelection();
    }, 250);
    return () => clearTimeout(timer);
  }, [authenticated, busy, clearWorkspace, demo, refreshWorkspace, selected, telegram.stage]);
  /** Executes a user command and refreshes its outcome while presenting recoverable failures. */
  async function command(path: string, body?: unknown, method = "POST"): Promise<void> {
    setBusy(true);
    try {
      const result = await api<unknown>(path, method, body);
      if (path === "access") {
        const access = result as AppStatus;
        setAuthenticated(access.authenticated);
        setAccessMode(access.accessMode);
        setMaxSelectedPeople(access.maxSelectedPeople);
        if (access.authenticated) await refreshWorkspace();
        else clearWorkspace();
      } else {
        await refreshWorkspace();
      }
      const successMessage = commandSuccessMessage(path, body, method);
      if (successMessage) showSuccessNotification(successMessage);
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearWorkspace();
      showErrorNotification(failure, "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  /** Switches to isolated synthetic data without writing it to server storage. */
  function showDemo(): void {
    const data = demoSnapshot();
    setDemo(true);
    setSelected(
      limitSelection(
        new Set(),
        data.people.map((person) => person.id),
        maxSelectedPeople,
      ),
    );
  }
  /** Leaves synthetic data and reloads the owner's actual workspace. */
  function leaveDemo(): void {
    if (demoOnly) return;
    setDemo(false);
    setSelected(new Set());
  }
  /** Enables or hides a catalog source and loads it when the owner activates it. */
  async function setSourceEnabled(source: PersonSource, enabled: boolean): Promise<void> {
    const next = new Set(enabledSources);
    if (enabled) next.add(source);
    else next.delete(source);
    setEnabledSources(next);
    localStorage.setItem("intersect.catalog-sources", JSON.stringify([...next]));
    if (enabled && !demo) await command("people", { source });
  }
  /** Toggles one person by stable identity while preserving independent source selections. */
  const toggle = useCallback(
    (id: string): void => {
      setSelected((old) => toggleSelection(old, id, maxSelectedPeople));
    },
    [maxSelectedPeople],
  );
  /** Applies bulk selection while preserving earlier choices up to the configured limit. */
  const select = useCallback(
    (ids: Set<string>): void => {
      setSelected(limitSelection(new Set(), ids, maxSelectedPeople));
    },
    [maxSelectedPeople],
  );
  return {
    authenticated,
    accessMode,
    demo,
    demoOnly,
    snapshot: demo ? demoSnapshot() : snapshot,
    telegram,
    selected,
    selectedCommunities,
    selectCommunities: setSelectedCommunities,
    enabledSources,
    setSourceEnabled,
    select,
    maxSelectedPeople,
    busy,
    command,
    showDemo,
    leaveDemo,
    toggle,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
