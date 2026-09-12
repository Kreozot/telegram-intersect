import { useCallback, useEffect, useState } from "react";
import type { AppStatus, Snapshot, TelegramStatus } from "../../shared/contracts.js";
import { limitSelection, toggleSelection } from "../../shared/selection.js";
import { ApiError, api } from "../api/client.js";
import { demoSnapshot } from "../demo.js";
import { shouldPollWorkspace } from "./workspace-refresh.js";

/** Coordinates workspace API state and explicit demo mode for the root application. */
export function useWorkspace() {
  const [authenticated, setAuthenticated] = useState(false);
  const [maxSelectedPeople, setMaxSelectedPeople] = useState(50);
  const [demo, setDemo] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    people: [],
    scan: null,
  });
  const [telegram, setTelegram] = useState<TelegramStatus>({
    stage: "idle",
    qr: null,
    error: null,
    configured: false,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pollingRequired = shouldPollWorkspace(authenticated, telegram.stage, snapshot.scan);
  /** Clears protected browser state after locking, expiry, or an unauthorized API response. */
  const clearWorkspace = useCallback(() => {
    setAuthenticated(false);
    setSnapshot({ people: [], scan: null });
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
        setError(failure instanceof Error ? failure.message : "Connection failed.");
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
        await refreshWorkspace();
      } catch (failure) {
        if (!disposed) setError(failure instanceof Error ? failure.message : "Connection failed.");
      }
      if (!disposed) timer = setTimeout(poll, 1800);
    }
    timer = setTimeout(poll, 1800);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [demo, pollingRequired, refreshWorkspace]);

  useEffect(() => {
    if (demo) return;
    /** Refreshes once when the page becomes visible after browser suspension or tab switching. */
    function refreshWhenVisible(): void {
      if (document.visibilityState !== "visible") return;
      const refresh = authenticated ? refreshWorkspace : initializeWorkspace;
      void refresh().catch((failure: unknown) => {
        setError(failure instanceof Error ? failure.message : "Connection failed.");
      });
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [authenticated, demo, initializeWorkspace, refreshWorkspace]);
  useEffect(() => {
    if (demo || !authenticated || telegram.stage !== "authorized" || selected.size === 0) return;
    const ids = [...selected];
    const timer = setTimeout(() => {
      /** Enqueues the settled selection without blocking further catalog interaction. */
      async function enqueueSelection(): Promise<void> {
        try {
          await api("scans", "POST", { ids });
          await refreshWorkspace();
        } catch (failure) {
          if (failure instanceof ApiError && failure.status === 401) clearWorkspace();
          setError(failure instanceof Error ? failure.message : "Scan could not be queued.");
        }
      }
      void enqueueSelection();
    }, 250);
    return () => clearTimeout(timer);
  }, [authenticated, clearWorkspace, demo, refreshWorkspace, selected, telegram.stage]);
  /** Executes a user command and refreshes its outcome while presenting recoverable failures. */
  async function command(path: string, body?: unknown, method = "POST"): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api<unknown>(path, method, body);
      if (path === "access") {
        const access = result as AppStatus;
        setAuthenticated(access.authenticated);
        setMaxSelectedPeople(access.maxSelectedPeople);
        if (access.authenticated) await refreshWorkspace();
        else clearWorkspace();
      } else {
        await refreshWorkspace();
      }
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) clearWorkspace();
      setError(failure instanceof Error ? failure.message : "Request failed.");
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
    setError(null);
  }
  /** Leaves synthetic data and reloads the owner's actual workspace. */
  function leaveDemo(): void {
    setDemo(false);
    setSelected(new Set());
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
    demo,
    snapshot: demo ? demoSnapshot() : snapshot,
    telegram,
    selected,
    select,
    maxSelectedPeople,
    error,
    busy,
    command,
    showDemo,
    leaveDemo,
    toggle,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
