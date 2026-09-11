import { useCallback, useEffect, useState } from "react";
import type { AppStatus, Snapshot, TelegramStatus } from "../../shared/contracts.js";
import { api } from "../api/client.js";
import { demoSnapshot } from "../demo.js";

/** Coordinates workspace API state and explicit demo mode for the root application. */
export function useWorkspace() {
  const [authenticated, setAuthenticated] = useState(false);
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
  /** Refreshes only normalized metadata; polling never asks Telegram for message history. */
  const refresh = useCallback(async () => {
    const access = await api<AppStatus>("access");
    setAuthenticated(access.authenticated);
    if (!access.authenticated) {
      setSnapshot({ people: [], scan: null });
      setTelegram({ stage: "idle", qr: null, error: null, configured: false });
      return;
    }
    const [state, data] = await Promise.all([
      api<TelegramStatus>("telegram"),
      api<Snapshot>("snapshot"),
    ]);
    setTelegram(state);
    setSnapshot(data);
  }, []);
  useEffect(() => {
    if (demo) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    /** Polls serially so slow responses cannot create an unbounded request queue. */
    async function poll(): Promise<void> {
      try {
        await refresh();
      } catch (failure) {
        if (!disposed) setError(failure instanceof Error ? failure.message : "Connection failed.");
      }
      if (!disposed) timer = setTimeout(poll, 1800);
    }
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [demo, refresh]);
  useEffect(() => {
    if (demo || !authenticated || telegram.stage !== "authorized" || selected.size === 0) return;
    const ids = [...selected];
    const timer = setTimeout(() => {
      /** Enqueues the settled selection without blocking further catalog interaction. */
      async function enqueueSelection(): Promise<void> {
        try {
          await api("scans", "POST", { ids });
          await refresh();
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : "Scan could not be queued.");
        }
      }
      void enqueueSelection();
    }, 250);
    return () => clearTimeout(timer);
  }, [authenticated, demo, refresh, selected, telegram.stage]);
  /** Executes a user command and refreshes its outcome while presenting recoverable failures. */
  async function command(path: string, body?: unknown, method = "POST"): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api(path, method, body);
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  /** Switches to isolated synthetic data without writing it to server storage. */
  function showDemo(): void {
    const data = demoSnapshot();
    setDemo(true);
    setSelected(new Set(data.people.map((person) => person.id)));
    setError(null);
  }
  /** Leaves synthetic data and reloads the owner's actual workspace. */
  function leaveDemo(): void {
    setDemo(false);
    setSelected(new Set());
  }
  /** Toggles one person by stable identity while preserving independent source selections. */
  function toggle(id: string): void {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return {
    authenticated,
    demo,
    snapshot: demo ? demoSnapshot() : snapshot,
    telegram,
    selected,
    setSelected,
    error,
    busy,
    command,
    showDemo,
    leaveDemo,
    toggle,
  };
}
