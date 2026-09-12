import { Alert } from "@mantine/core";
import type { TelegramStatus } from "../../../shared/contracts.js";
import { LoginFlow } from "./LoginFlow/LoginFlow.js";
import styles from "./LoginPanel.module.css";
import { TelegramSetupNotice } from "./TelegramSetupNotice/TelegramSetupNotice.js";

interface Props {
  status: TelegramStatus;
  busy: boolean;
  onStart: (mode: "phone" | "qr") => Promise<void>;
  onAnswer: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
}

/** Frames Telegram setup and delegates the configured authentication workflow. */
export function LoginPanel({ status, busy, onStart, onAnswer, onCancel }: Props) {
  return (
    <section className={styles.panel}>
      <span className={styles.eyebrow}>01 / CONNECT</span>
      <h2 className={styles.heading}>
        Your Telegram.
        <br />A new perspective.
      </h2>
      <p className={styles.statusText}>
        Sign in to discover shared groups. Intersect never requests your message history.
      </p>
      {status.configured ? (
        <LoginFlow
          status={status}
          busy={busy}
          onStart={onStart}
          onAnswer={onAnswer}
          onCancel={onCancel}
        />
      ) : (
        <TelegramSetupNotice />
      )}
      {status.error && <Alert color="red">{status.error}</Alert>}
      <div className={styles.note}>
        Your session stays on this server. Login codes and passwords are never saved.
      </div>
    </section>
  );
}
