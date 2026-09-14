import { useDeferredValue, useMemo, useState } from "react";
import type { MapMode } from "../../shared/contracts.js";
import { buildGraph, filterPeopleBySources } from "../../shared/graph.js";
import { filterIntersections } from "../../shared/graph-filter.js";
import styles from "./App.module.css";
import { ConfirmationAlert, type ConfirmationKind } from "./ConfirmationAlert/ConfirmationAlert.js";
import { DetailsPanel } from "./DetailsPanel/DetailsPanel.js";
import { Explorer } from "./Explorer/Explorer.js";
import { Header } from "./Header/Header.js";
import { useWorkspace } from "./useWorkspace.js";
import { WorkspaceSidebar } from "./WorkspaceSidebar/WorkspaceSidebar.js";

/** Composes the workspace panels; data coordination stays in useWorkspace and rendering in private children. */
export function App() {
  const workspace = useWorkspace();
  const [focus, setFocus] = useState<string | null>(null);
  const [intersectionsOnly, setIntersectionsOnly] = useState(true);
  const [mode, setMode] = useState<MapMode>("people");
  const [confirm, setConfirm] = useState<ConfirmationKind | null>(null);
  const selection = mode === "people" ? workspace.selected : workspace.selectedCommunities;
  const deferredSelection = useDeferredValue(selection);
  const eligiblePeople = useMemo(
    () =>
      filterPeopleBySources(
        workspace.snapshot.people,
        workspace.demo ? new Set(["contacts", "dialogs"]) : workspace.enabledSources,
      ),
    [workspace.demo, workspace.enabledSources, workspace.snapshot.people],
  );
  const graph = useMemo(
    () => buildGraph(eligiblePeople, workspace.snapshot.scan, deferredSelection, mode),
    [deferredSelection, eligiblePeople, mode, workspace.snapshot.scan],
  );
  const visibleGraph = useMemo(
    () => filterIntersections(graph, intersectionsOnly, mode),
    [graph, intersectionsOnly, mode],
  );
  const connected = workspace.telegram.stage === "authorized";
  /** Performs the selected destructive user action after an explicit in-app confirmation. */
  async function confirmAction(): Promise<void> {
    if (confirm === "logout") await workspace.command("telegram", undefined, "DELETE");
    if (confirm === "data") await workspace.command("analysis", undefined, "DELETE");
    setConfirm(null);
  }
  return (
    <div className={styles.app}>
      <Header
        demo={workspace.demo}
        demoOnly={workspace.demoOnly}
        connected={connected}
        onDemo={workspace.demo ? workspace.leaveDemo : workspace.showDemo}
        onLock={() => {
          void workspace.command("access", undefined, "DELETE");
        }}
        authenticated={workspace.authenticated}
        accessMode={workspace.accessMode}
      />
      {confirm && (
        <ConfirmationAlert
          kind={confirm}
          busy={workspace.busy}
          onConfirm={() => {
            void confirmAction();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <main className={styles.workspace}>
        <WorkspaceSidebar
          workspace={workspace}
          connected={connected}
          mode={mode}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            setFocus(null);
          }}
        />
        <Explorer
          graph={graph}
          visibleGraph={visibleGraph}
          intersectionsOnly={intersectionsOnly}
          onIntersectionsChange={(value) => {
            setIntersectionsOnly(value);
            setFocus(null);
          }}
          focus={focus}
          onFocus={setFocus}
          demo={workspace.demo}
          scan={workspace.snapshot.scan}
          mode={mode}
        />
        <DetailsPanel
          className={styles.detailsPanel ?? ""}
          graph={visibleGraph}
          focus={focus}
          onFocus={setFocus}
          scan={workspace.snapshot.scan}
        />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerStatus}>
          <span className={styles.dot} />
          {workspace.demo
            ? "Synthetic demo · no Telegram requests"
            : "Private workspace · no message history requested or stored"}
        </div>
        {workspace.authenticated && connected && !workspace.demo && (
          <div className={styles.accountActions}>
            <button
              className={styles.accountButton}
              type="button"
              onClick={() => setConfirm("data")}
            >
              Clear local data
            </button>
            <button
              className={styles.accountButton}
              type="button"
              onClick={() => setConfirm("logout")}
            >
              Disconnect Telegram
            </button>
          </div>
        )}
        <span className={styles.footerTagline}>Shared context, made visible.</span>
      </footer>
    </div>
  );
}
