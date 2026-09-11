import { Button } from "@mantine/core";
import type { Scan } from "../../../../shared/contracts.js";

interface Props {
  scan: Scan | null;
  demo: boolean;
  onCancel: () => Promise<void>;
  onResume: () => Promise<void>;
}

/** Renders the single action appropriate to the current background scan state. */
export function ScanActions({ scan, demo, onCancel, onResume }: Props) {
  if (scan?.running) {
    return (
      <Button variant="subtle" size="xs" onClick={() => void onCancel()}>
        Cancel scan
      </Button>
    );
  }
  if (scan?.people.some((person) => person.status !== "completed") && !demo) {
    return (
      <Button variant="subtle" size="xs" onClick={() => void onResume()}>
        Resume unfinished scan
      </Button>
    );
  }
  return null;
}
