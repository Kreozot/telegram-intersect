import { Button, PasswordInput } from "@mantine/core";
import { useState } from "react";
import styles from "./AccessPanel.module.css";

interface Props {
  busy: boolean;
  onUnlock: (key: string) => Promise<void>;
  onDemo: () => void;
}
/** Collects the owner's local access key in memory and clears it immediately after submission. */
export function AccessPanel({ busy, onUnlock, onDemo }: Props) {
  const [key, setKey] = useState("");
  /** Submits the access key without saving it to browser storage or logs. */
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const value = key;
    setKey("");
    await onUnlock(value);
  }
  return (
    <section className={styles.panel}>
      <span className={styles.eyebrow}>YOUR PRIVATE WORKSPACE</span>
      <h1>
        Find the communities
        <br />
        you share.
      </h1>
      <p>Connect the dots between your people and the groups that bring them together.</p>
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <PasswordInput
          label="Workspace access key"
          placeholder="Paste your access key"
          value={key}
          onChange={(event) => setKey(event.currentTarget.value)}
          autoComplete="off"
        />
        <Button type="submit" fullWidth loading={busy} disabled={!key}>
          Unlock workspace
        </Button>
      </form>
      <p className={styles.hint}>
        On this computer, open <code>app/data/access-key</code>. For a hosted workspace, use the key
        configured by its owner.
      </p>
      <div className={styles.divider} />
      <h3>Just looking around?</h3>
      <p>Explore a sample map with fictional people. No account needed.</p>
      <Button variant="default" fullWidth onClick={onDemo}>
        Explore the demo →
      </Button>
    </section>
  );
}
