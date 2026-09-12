import type { MapMode } from "../../../shared/contracts.js";
import { observedCommunities } from "../../../shared/graph.js";
import { AccessPanel } from "../AccessPanel/AccessPanel.js";
import { LoginPanel } from "../LoginPanel/LoginPanel.js";
import { PeoplePanel } from "../PeoplePanel/PeoplePanel.js";
import type { Workspace } from "../useWorkspace.js";
import styles from "./WorkspaceSidebar.module.css";

interface Props {
  workspace: Workspace;
  connected: boolean;
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
  onConfirm: (kind: "logout" | "data") => void;
}

/** Selects the sidebar block for the current access, Telegram, or catalog workflow state. */
export function WorkspaceSidebar({ workspace, connected, mode, onModeChange, onConfirm }: Props) {
  let content: React.ReactNode;
  if (!workspace.authenticated && !workspace.demo) {
    content = (
      <AccessPanel
        onUnlock={(key) => workspace.command("access", { key })}
        busy={workspace.busy}
        onDemo={workspace.showDemo}
      />
    );
  } else if (!connected && !workspace.demo) {
    content = (
      <LoginPanel
        status={workspace.telegram}
        busy={workspace.busy}
        onStart={(mode) => workspace.command("telegram/login", { mode })}
        onAnswer={(value) => workspace.command("telegram/answer", { value })}
        onCancel={() => workspace.command("telegram/cancel")}
      />
    );
  } else {
    content = (
      <PeoplePanel
        people={workspace.snapshot.people}
        selected={workspace.selected}
        selectedCommunities={workspace.selectedCommunities}
        communities={observedCommunities(workspace.snapshot.scan)}
        mode={mode}
        enabledSources={
          workspace.demo ? new Set(["contacts", "dialogs"] as const) : workspace.enabledSources
        }
        scan={workspace.snapshot.scan}
        demo={workspace.demo}
        busy={workspace.busy}
        maxSelectedPeople={workspace.maxSelectedPeople}
        onToggle={workspace.toggle}
        onSelect={workspace.select}
        onSelectCommunities={workspace.selectCommunities}
        onModeChange={onModeChange}
        onSourceChange={workspace.setSourceEnabled}
        onCancel={() => workspace.command("scans/cancel")}
        onResume={() => workspace.command("scans/resume")}
      />
    );
  }
  const showAccountActions = workspace.authenticated && connected && !workspace.demo;
  return (
    <aside className={styles.sidebar}>
      {content}
      {showAccountActions && (
        <div className={styles.accountActions}>
          <button className={styles.accountButton} type="button" onClick={() => onConfirm("data")}>
            Clear local data
          </button>
          <button
            className={styles.accountButton}
            type="button"
            onClick={() => onConfirm("logout")}
          >
            Disconnect Telegram
          </button>
        </div>
      )}
    </aside>
  );
}
