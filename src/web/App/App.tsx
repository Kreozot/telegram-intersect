import { Alert } from "@mantine/core";
import { useState } from "react";
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
  const eligiblePeople = filterPeopleBySources(
    workspace.snapshot.people,
    workspace.demo ? new Set(["contacts", "dialogs"]) : workspace.enabledSources,
  );
  const graph = buildGraph(
    eligiblePeople,
    workspace.snapshot.scan,
    mode === "people" ? workspace.selected : workspace.selectedCommunities,
    mode,
  );
  const visibleGraph = filterIntersections(graph, intersectionsOnly, mode);
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
        connected={connected}
        onDemo={workspace.demo ? workspace.leaveDemo : workspace.showDemo}
        onLock={() => {
          void workspace.command("access", undefined, "DELETE");
        }}
        authenticated={workspace.authenticated}
        accessMode={workspace.accessMode}
      />
      {workspace.error && (
        <Alert
          color="red"
          title="Something needs attention"
          withCloseButton
          className={styles.alert}
        >
          {workspace.error}
        </Alert>
      )}
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
          onConfirm={setConfirm}
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
        <span className={styles.dot} />
        {workspace.demo
          ? "Synthetic demo · no Telegram requests"
          : "Private workspace · no message history requested or stored"}
        <span className={styles.footerTagline}>Shared context, made visible.</span>
      </footer>
    </div>
  );
}
