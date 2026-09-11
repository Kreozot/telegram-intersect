import { Alert, Button } from "@mantine/core";
import { useState } from "react";
import { buildGraph } from "../../shared/graph.js";
import { filterCommunities } from "../../shared/graph-filter.js";
import { AccessPanel } from "./AccessPanel/AccessPanel.js";
import styles from "./App.module.css";
import { DetailsPanel } from "./DetailsPanel/DetailsPanel.js";
import { Explorer } from "./Explorer/Explorer.js";
import { Header } from "./Header/Header.js";
import { LoginPanel } from "./LoginPanel/LoginPanel.js";
import { PeoplePanel } from "./PeoplePanel/PeoplePanel.js";
import { useWorkspace } from "./useWorkspace.js";

/** Composes the workspace panels; data coordination stays in useWorkspace and rendering in private children. */
export function App() {
  const workspace = useWorkspace();
  const [focus, setFocus] = useState<string | null>(null);
  const [intersectionsOnly, setIntersectionsOnly] = useState(true);
  const [confirm, setConfirm] = useState<"logout" | "data" | null>(null);
  const graph = buildGraph(workspace.snapshot.people, workspace.snapshot.scan, workspace.selected);
  const visibleGraph = filterCommunities(graph, intersectionsOnly);
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
        <Alert
          color="orange"
          title={
            confirm === "logout"
              ? "Disconnect Telegram and delete local account data?"
              : "Delete all cached people and graph data?"
          }
          className={styles.alert}
        >
          {confirm === "logout"
            ? "This revokes this app's Telegram session. Other Telegram clients stay connected."
            : "Your Telegram session stays connected. This does not affect Telegram contacts or chats."}
          <div className={styles.actions}>
            <Button
              color="red"
              onClick={() => {
                void confirmAction();
              }}
              loading={workspace.busy}
            >
              Confirm
            </Button>
            <Button variant="default" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
          </div>
        </Alert>
      )}
      <main className={styles.workspace}>
        <aside className={styles.sidebar}>
          {!workspace.authenticated && !workspace.demo ? (
            <AccessPanel
              onUnlock={(key) => workspace.command("access", { key })}
              busy={workspace.busy}
              onDemo={workspace.showDemo}
            />
          ) : !connected && !workspace.demo ? (
            <LoginPanel
              status={workspace.telegram}
              busy={workspace.busy}
              onStart={(mode) => workspace.command("telegram/login", { mode })}
              onAnswer={(value) => workspace.command("telegram/answer", { value })}
              onCancel={() => workspace.command("telegram/cancel")}
            />
          ) : (
            <PeoplePanel
              people={workspace.snapshot.people}
              selected={workspace.selected}
              scan={workspace.snapshot.scan}
              demo={workspace.demo}
              busy={workspace.busy}
              maxSelectedPeople={workspace.maxSelectedPeople}
              onToggle={workspace.toggle}
              onSelect={workspace.select}
              onLoad={(source) => workspace.command("people", { source })}
              onCancel={() => workspace.command("scans/cancel")}
              onResume={() => workspace.command("scans/resume")}
            />
          )}
          {workspace.authenticated && connected && !workspace.demo && (
            <div className={styles.accountActions}>
              <button type="button" onClick={() => setConfirm("data")}>
                Clear local data
              </button>
              <button type="button" onClick={() => setConfirm("logout")}>
                Disconnect Telegram
              </button>
            </div>
          )}
        </aside>
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
        />
        <DetailsPanel
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
        <span>Shared context, made visible.</span>
      </footer>
    </div>
  );
}
