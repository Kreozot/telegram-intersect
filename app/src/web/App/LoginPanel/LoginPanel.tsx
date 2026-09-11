import { Alert, Button, PasswordInput, TextInput } from "@mantine/core";
import { useState } from "react";
import type { TelegramStatus } from "../../../shared/contracts.js";
import styles from "./LoginPanel.module.css";

interface Props {
  status: TelegramStatus;
  busy: boolean;
  onStart: (mode: "phone" | "qr") => Promise<void>;
  onAnswer: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
}
/** Renders the current Telegram challenge while keeping phone/code/password values ephemeral. */
export function LoginPanel({ status, busy, onStart, onAnswer, onCancel }: Props) {
  const [value, setValue] = useState("");
  const challenge = ["phone", "code", "password"].includes(status.stage);
  /** Clears sensitive challenge input before dispatching the protected request. */
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const answer = value;
    setValue("");
    await onAnswer(answer);
  }
  return (
    <section className={styles.panel}>
      <span className={styles.eyebrow}>01 / CONNECT</span>
      <h2>
        Your Telegram.
        <br />A new perspective.
      </h2>
      <p>Sign in to discover shared groups. Intersect never requests your message history.</p>
      {!status.configured ? (
        <Alert title="Configure your Telegram app" color="teal">
          Add TELEGRAM_API_ID and TELEGRAM_API_HASH to app/.env, then restart. See the README for
          setup.
        </Alert>
      ) : (
        <>
          <div className={styles.buttons}>
            <Button
              onClick={() => {
                void onStart("qr");
              }}
              disabled={!["idle", "error"].includes(status.stage)}
              loading={busy}
            >
              Sign in with QR
            </Button>
            <Button
              variant="default"
              onClick={() => {
                void onStart("phone");
              }}
              disabled={!["idle", "error"].includes(status.stage)}
            >
              Use phone number
            </Button>
          </div>
          {status.qr && (
            <img
              className={styles.qr}
              src={status.qr}
              alt="Telegram sign-in QR code. Scan from Telegram Settings, Devices, Link Desktop Device."
            />
          )}
          {status.stage === "qr" && <p>Telegram → Settings → Devices → Link Desktop Device.</p>}
          {challenge && (
            <form
              onSubmit={(event) => {
                void submit(event);
              }}
            >
              {status.stage === "password" ? (
                <PasswordInput
                  label="Two-step verification password"
                  value={value}
                  onChange={(event) => setValue(event.currentTarget.value)}
                  autoComplete="off"
                />
              ) : (
                <TextInput
                  label={
                    status.stage === "phone"
                      ? "Phone number with country code"
                      : "Telegram sign-in code"
                  }
                  value={value}
                  onChange={(event) => setValue(event.currentTarget.value)}
                  autoComplete="off"
                />
              )}
              <Button type="submit" loading={busy} disabled={!value}>
                Continue
              </Button>
            </form>
          )}
          {status.stage === "connecting" && <p>Connecting securely…</p>}
          {!["idle", "error"].includes(status.stage) && (
            <Button
              variant="subtle"
              onClick={() => {
                setValue("");
                void onCancel();
              }}
            >
              Cancel sign-in
            </Button>
          )}
        </>
      )}
      {status.error && <Alert color="red">{status.error}</Alert>}
      <div className={styles.note}>
        Your session stays on this server. Login codes and passwords are never saved.
      </div>
    </section>
  );
}
