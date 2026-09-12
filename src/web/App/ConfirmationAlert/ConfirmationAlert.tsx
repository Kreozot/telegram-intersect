import { Alert, Button } from "@mantine/core";
import styles from "./ConfirmationAlert.module.css";

export type ConfirmationKind = "logout" | "data";

interface Props {
  kind: ConfirmationKind;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Presents the consequences and controls for a destructive workspace action. */
export function ConfirmationAlert({ kind, busy, onConfirm, onCancel }: Props) {
  const disconnecting = kind === "logout";
  return (
    <Alert
      color="orange"
      title={
        disconnecting
          ? "Disconnect Telegram and delete local account data?"
          : "Delete all cached people and graph data?"
      }
      className={styles.alert}
    >
      {disconnecting
        ? "This revokes this app's Telegram session. Other Telegram clients stay connected."
        : "Your Telegram session stays connected. This does not affect Telegram contacts or chats."}
      <div className={styles.actions}>
        <Button color="red" onClick={onConfirm} loading={busy}>
          Confirm
        </Button>
        <Button variant="default" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Alert>
  );
}
