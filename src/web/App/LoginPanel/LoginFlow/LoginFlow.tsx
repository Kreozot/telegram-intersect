import { Button, PasswordInput, TextInput } from "@mantine/core";
import { useState } from "react";
import type { TelegramStatus } from "../../../../shared/contracts.js";
import styles from "./LoginFlow.module.css";

interface Props {
  status: TelegramStatus;
  busy: boolean;
  onStart: (mode: "phone" | "qr") => Promise<void>;
  onAnswer: (value: string) => Promise<void>;
  onCancel: () => Promise<void>;
}

/** Owns ephemeral credentials and controls for the configured Telegram sign-in workflow. */
export function LoginFlow({ status, busy, onStart, onAnswer, onCancel }: Props) {
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
    <>
      <div className={styles.buttons}>
        <Button
          onClick={() => void onStart("qr")}
          disabled={!["idle", "error"].includes(status.stage)}
          loading={busy}
        >
          Sign in with QR
        </Button>
        <Button
          variant="default"
          onClick={() => void onStart("phone")}
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
      {status.stage === "qr" && (
        <p className={styles.statusText}>Telegram → Settings → Devices → Link Desktop Device.</p>
      )}
      {challenge && (
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
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
      {status.stage === "connecting" && <p className={styles.statusText}>Connecting securely…</p>}
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
  );
}
