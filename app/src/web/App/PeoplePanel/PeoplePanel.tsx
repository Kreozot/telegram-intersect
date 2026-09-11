import { Button, Checkbox, TextInput } from "@mantine/core";
import { useState } from "react";
import type { Person, PersonSource, Scan } from "../../../shared/contracts.js";
import { limitSelection } from "../../../shared/selection.js";
import styles from "./PeoplePanel.module.css";
import { PersonRow } from "./PersonRow/PersonRow.js";

interface Props {
  people: Person[];
  selected: Set<string>;
  scan: Scan | null;
  demo: boolean;
  busy: boolean;
  maxSelectedPeople: number;
  onToggle: (id: string) => void;
  onSelect: (ids: Set<string>) => void;
  onLoad: (source: PersonSource) => Promise<void>;
  onCancel: () => Promise<void>;
  onResume: () => Promise<void>;
}
/** Owns catalog filtering and selection controls while its rows remain independent display components. */
export function PeoplePanel({
  people,
  selected,
  scan,
  demo,
  busy,
  maxSelectedPeople,
  onToggle,
  onSelect,
  onLoad,
  onCancel,
  onResume,
}: Props) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | PersonSource>("all");
  const filtered = people.filter(
    (person) =>
      (source === "all" || person.sources.includes(source)) &&
      `${person.name} ${person.username ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const allSelected = filtered.length > 0 && filtered.every((person) => selected.has(person.id));
  /** Selects or clears only currently visible people, leaving other filters' selections intact. */
  function selectVisible(): void {
    const next = new Set(selected);
    if (!allSelected) {
      onSelect(
        limitSelection(
          next,
          filtered.map((item) => item.id),
          maxSelectedPeople,
        ),
      );
      return;
    }
    for (const person of filtered) next.delete(person.id);
    onSelect(next);
  }
  return (
    <section className={styles.panel}>
      <div className={styles.title}>
        <span>YOUR PEOPLE</span>
        <span>{people.length}</span>
      </div>
      <h2>Start with who you know.</h2>
      <p className={styles.subtitle}>Choose the people you want to connect.</p>
      {!demo && (
        <div className={styles.imports}>
          <Button
            size="xs"
            variant="light"
            loading={busy}
            disabled={scan?.running ?? false}
            onClick={() => {
              void onLoad("contacts");
            }}
          >
            Load contacts
          </Button>
          <Button
            size="xs"
            variant="default"
            loading={busy}
            disabled={scan?.running ?? false}
            onClick={() => {
              void onLoad("dialogs");
            }}
          >
            Load dialogs
          </Button>
        </div>
      )}
      <div className={styles.tabs}>
        {(["all", "contacts", "dialogs"] as const).map((item) => (
          <button
            type="button"
            key={item}
            className={source === item ? styles.active : ""}
            onClick={() => setSource(item)}
          >
            {item === "all" ? "Everyone" : item === "contacts" ? "Contacts" : "Dialogs"}
          </button>
        ))}
      </div>
      <TextInput
        aria-label="Search people"
        placeholder="Search people…"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <div className={styles.selection}>
        <Checkbox
          size="xs"
          label="Select visible"
          checked={allSelected}
          indeterminate={!allSelected && filtered.some((p) => selected.has(p.id))}
          onChange={selectVisible}
        />
        <button type="button" onClick={() => onSelect(new Set())}>
          Clear
        </button>
      </div>
      <div className={styles.list}>
        {filtered.map((person) => {
          const scanResult = scan?.people.find((entry) => entry.personId === person.id);
          return (
            <PersonRow
              key={person.id}
              person={person}
              checked={selected.has(person.id)}
              disabled={!selected.has(person.id) && selected.size >= maxSelectedPeople}
              status={scanResult?.status ?? null}
              commonGroupCount={
                scanResult?.status === "completed" ? scanResult.groups.length : null
              }
              onToggle={onToggle}
            />
          );
        })}
        {!filtered.length && (
          <p className={styles.empty}>
            {people.length
              ? "No people match this filter."
              : "Load contacts or dialog identities to begin."}
          </p>
        )}
      </div>
      <div className={styles.bottom}>
        <div>
          <strong>{selected.size}</strong> / {maxSelectedPeople} people selected
        </div>
        {scan?.running ? (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => {
              void onCancel();
            }}
          >
            Cancel scan
          </Button>
        ) : scan?.people.some((p) => p.status !== "completed") && !demo ? (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => {
              void onResume();
            }}
          >
            Resume unfinished scan
          </Button>
        ) : null}
        <p>
          Selecting people checks their shared groups in the background. Only groups shared with
          your account are requested.
        </p>
      </div>
    </section>
  );
}
