import { Button, Checkbox, SegmentedControl, TextInput } from "@mantine/core";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Person, PersonSource, Scan } from "../../../shared/contracts.js";
import { limitSelection } from "../../../shared/selection.js";
import styles from "./PeoplePanel.module.css";
import { PersonRow } from "./PersonRow/PersonRow.js";
import { type PeopleSort, sortPeople } from "./sort-people.js";

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
  const [sort, setSort] = useState<PeopleSort>("recent");
  const [selectedFirst, setSelectedFirst] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingScrollTop = useRef<number | null>(null);
  const filtered = sortPeople(
    people.filter(
      (person) =>
        (source === "all" || person.sources.includes(source)) &&
        `${person.name} ${person.username ?? ""}`.toLowerCase().includes(query.toLowerCase()),
    ),
    sort,
    selectedFirst,
    selected,
  );
  const allSelected = filtered.length > 0 && filtered.every((person) => selected.has(person.id));
  useLayoutEffect(() => {
    if (pendingScrollTop.current === null || !listRef.current) return;
    listRef.current.scrollTop = pendingScrollTop.current;
    pendingScrollTop.current = null;
  });
  /** Captures the list viewport before selected-first ordering moves keyed rows. */
  const preserveSelectionScroll = useCallback((): void => {
    if (selectedFirst && listRef.current) pendingScrollTop.current = listRef.current.scrollTop;
  }, [selectedFirst]);
  /** Toggles one row while keeping the current viewport stable during selected-first reordering. */
  const togglePerson = useCallback(
    (id: string): void => {
      preserveSelectionScroll();
      onToggle(id);
    },
    [onToggle, preserveSelectionScroll],
  );
  /** Selects or clears only currently visible people, leaving other filters' selections intact. */
  function selectVisible(): void {
    preserveSelectionScroll();
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
        <span className={styles.titleCount}>{people.length}</span>
      </div>
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
            className={`${styles.tabButton} ${source === item ? styles.active : ""}`}
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
      <div className={styles.sortControls}>
        <SegmentedControl
          size="xs"
          aria-label="Sort people"
          data={[
            { value: "recent", label: "Recent" },
            { value: "alphabetical", label: "A–Z" },
          ]}
          value={sort}
          onChange={(value) => {
            if (value === "recent" || value === "alphabetical") setSort(value);
          }}
        />
        <Checkbox
          size="xs"
          classNames={{ label: styles.sortLabel }}
          label="Selected first"
          checked={selectedFirst}
          onChange={(event) => setSelectedFirst(event.currentTarget.checked)}
        />
      </div>
      <div className={styles.selection}>
        <Checkbox
          size="xs"
          label="Select visible"
          checked={allSelected}
          indeterminate={!allSelected && filtered.some((p) => selected.has(p.id))}
          onChange={selectVisible}
        />
        <button
          className={styles.selectionButton}
          type="button"
          onClick={() => {
            preserveSelectionScroll();
            onSelect(new Set());
          }}
        >
          Clear
        </button>
      </div>
      <div className={styles.list} ref={listRef}>
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
              onToggle={togglePerson}
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
        <div className={styles.selectionSummary}>
          <strong className={styles.selectionCount}>{selected.size}</strong> / {maxSelectedPeople}{" "}
          people selected
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
        <p className={styles.bottomNote}>
          Selecting people checks their shared groups in the background. Only groups shared with
          your account are requested.
        </p>
      </div>
    </section>
  );
}
