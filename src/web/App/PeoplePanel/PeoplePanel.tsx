import { Checkbox, SegmentedControl, TextInput } from "@mantine/core";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Group, MapMode, Person, PersonSource, Scan } from "../../../shared/contracts.js";
import { matchesSearchQuery } from "../../../shared/search.js";
import { limitSelection, toggleSelection } from "../../../shared/selection.js";
import { CommunityRow } from "./CommunityRow/CommunityRow.js";
import styles from "./PeoplePanel.module.css";
import { PersonRow } from "./PersonRow/PersonRow.js";
import { ScanActions } from "./ScanActions/ScanActions.js";
import { sortCommunities } from "./sort-communities.js";
import { type PeopleSort, sortPeople } from "./sort-people.js";

interface Props {
  people: Person[];
  selected: Set<string>;
  selectedCommunities: Set<string>;
  communities: Group[];
  mode: MapMode;
  enabledSources: Set<PersonSource>;
  scan: Scan | null;
  demo: boolean;
  busy: boolean;
  maxSelectedPeople: number;
  onToggle: (id: string) => void;
  onSelect: (ids: Set<string>) => void;
  onSelectCommunities: (ids: Set<string>) => void;
  onModeChange: (mode: MapMode) => void;
  onSourceChange: (source: PersonSource, enabled: boolean) => Promise<void>;
  onCancel: () => Promise<void>;
  onResume: () => Promise<void>;
}
/** Owns catalog filtering and selection controls while its rows remain independent display components. */
export function PeoplePanel({
  people,
  selected,
  selectedCommunities,
  communities,
  mode,
  enabledSources,
  scan,
  demo,
  busy,
  maxSelectedPeople,
  onToggle,
  onSelect,
  onSelectCommunities,
  onModeChange,
  onSourceChange,
  onCancel,
  onResume,
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PeopleSort>("recent");
  const [selectedFirst, setSelectedFirst] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingScrollTop = useRef<number | null>(null);
  const commonGroupCounts = new Map(
    (scan?.people ?? []).map((entry) => [
      entry.personId,
      new Set(entry.groups.map((group) => group.id)).size,
    ]),
  );
  const commonPeopleCounts = new Map<string, number>();
  for (const person of people) {
    if (!person.sources.some((source) => enabledSources.has(source))) continue;
    const groupIds = new Set(
      scan?.people.find((entry) => entry.personId === person.id)?.groups.map((group) => group.id),
    );
    for (const groupId of groupIds) {
      commonPeopleCounts.set(groupId, (commonPeopleCounts.get(groupId) ?? 0) + 1);
    }
  }
  const filtered = sortPeople(
    people.filter(
      (person) =>
        person.sources.some((source) => enabledSources.has(source)) &&
        matchesSearchQuery(`${person.name} ${person.username ?? ""}`, query),
    ),
    sort,
    selectedFirst,
    selected,
    commonGroupCounts,
  );
  const selectablePeople = filtered.slice(0, maxSelectedPeople);
  const allSelected =
    selectablePeople.length > 0 && selectablePeople.every((person) => selected.has(person.id));
  const filteredCommunities = sortCommunities(
    communities.filter((community) => matchesSearchQuery(community.title, query)),
    sort,
    selectedFirst,
    selectedCommunities,
    commonPeopleCounts,
  );
  const selectableCommunities = filteredCommunities.slice(0, maxSelectedPeople);
  const allCommunitiesSelected =
    selectableCommunities.length > 0 &&
    selectableCommunities.every((community) => selectedCommunities.has(community.id));
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
  /** Selects the visible limit-sized batch or clears it when that whole batch is selected. */
  function selectVisible(): void {
    preserveSelectionScroll();
    const next = new Set(selected);
    if (!allSelected) {
      onSelect(
        limitSelection(
          next,
          selectablePeople.map((item) => item.id),
          maxSelectedPeople,
        ),
      );
      return;
    }
    for (const person of selectablePeople) next.delete(person.id);
    onSelect(next);
  }
  /** Selects the visible limit-sized community batch or clears it when fully selected. */
  function selectVisibleCommunities(): void {
    preserveSelectionScroll();
    const next = new Set(selectedCommunities);
    if (!allCommunitiesSelected) {
      onSelectCommunities(
        limitSelection(
          next,
          selectableCommunities.map((community) => community.id),
          maxSelectedPeople,
        ),
      );
      return;
    }
    for (const community of selectableCommunities) next.delete(community.id);
    onSelectCommunities(next);
  }
  return (
    <section className={styles.panel}>
      <div className={styles.title}>
        <span>MAP INPUTS</span>
        <span className={styles.titleCount}>
          {mode === "people" ? filtered.length : communities.length}
        </span>
      </div>
      {!demo && (
        <div className={styles.imports}>
          {(["contacts", "dialogs"] as const).map((source) => (
            <Checkbox
              key={source}
              size="xs"
              label={source === "contacts" ? "Contacts" : "Dialogs"}
              checked={enabledSources.has(source)}
              disabled={busy}
              onChange={(event) => {
                void onSourceChange(source, event.currentTarget.checked);
              }}
            />
          ))}
        </div>
      )}
      <div className={styles.tabs}>
        {(["people", "communities"] as const).map((item) => (
          <button
            type="button"
            key={item}
            className={`${styles.tabButton} ${mode === item ? styles.active : ""}`}
            onClick={() => onModeChange(item)}
          >
            {item === "people" ? "People" : "Communities"}
          </button>
        ))}
      </div>
      <TextInput
        aria-label={mode === "people" ? "Search people" : "Search communities"}
        placeholder={mode === "people" ? "Search people…" : "Search communities…"}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <div className={styles.sortControls}>
        <SegmentedControl
          size="xs"
          aria-label={mode === "people" ? "Sort people" : "Sort communities"}
          data={[
            { value: "recent", label: "Recent" },
            { value: "alphabetical", label: "A–Z" },
            { value: "common", label: "Common" },
          ]}
          value={sort}
          onChange={(value) => {
            if (value === "recent" || value === "alphabetical" || value === "common") {
              setSort(value);
            }
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
          label={
            mode === "people"
              ? filtered.length > maxSelectedPeople
                ? `Select first ${maxSelectedPeople}`
                : `Select all ${filtered.length}`
              : filteredCommunities.length > maxSelectedPeople
                ? `Select first ${maxSelectedPeople}`
                : `Select all ${filteredCommunities.length}`
          }
          checked={mode === "people" ? allSelected : allCommunitiesSelected}
          indeterminate={
            mode === "people"
              ? !allSelected && selectablePeople.some((p) => selected.has(p.id))
              : !allCommunitiesSelected &&
                selectableCommunities.some((group) => selectedCommunities.has(group.id))
          }
          onChange={mode === "people" ? selectVisible : selectVisibleCommunities}
        />
        <button
          className={styles.selectionButton}
          type="button"
          onClick={() => {
            preserveSelectionScroll();
            if (mode === "people") onSelect(new Set());
            else onSelectCommunities(new Set());
          }}
        >
          Clear
        </button>
      </div>
      <div className={styles.list} ref={listRef}>
        {mode === "people" &&
          filtered.map((person) => {
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
        {mode === "communities" &&
          filteredCommunities.map((community) => {
            const observedPeople = people.filter(
              (person) =>
                person.sources.some((source) => enabledSources.has(source)) &&
                scan?.people
                  .find((entry) => entry.personId === person.id)
                  ?.groups.some((group) => group.id === community.id),
            ).length;
            return (
              <CommunityRow
                key={community.id}
                community={community}
                checked={selectedCommunities.has(community.id)}
                disabled={
                  !selectedCommunities.has(community.id) &&
                  selectedCommunities.size >= maxSelectedPeople
                }
                observedPeople={observedPeople}
                onToggle={(id) => {
                  preserveSelectionScroll();
                  onSelectCommunities(toggleSelection(selectedCommunities, id, maxSelectedPeople));
                }}
              />
            );
          })}
        {!(mode === "people" ? filtered.length : filteredCommunities.length) && (
          <p className={styles.empty}>
            {mode === "people"
              ? enabledSources.size === 0
                ? "Enable Contacts or Dialogs to show people."
                : "No people match this filter."
              : communities.length
                ? "No communities match this search."
                : "Communities appear after people have been scanned."}
          </p>
        )}
      </div>
      <div className={styles.bottom}>
        <div className={styles.selectionSummary}>
          <strong className={styles.selectionCount}>
            {mode === "people" ? selected.size : selectedCommunities.size}
          </strong>{" "}
          / {maxSelectedPeople} {mode === "people" ? "people" : "communities"} selected
        </div>
        <ScanActions scan={scan} demo={demo} onCancel={onCancel} onResume={onResume} />
      </div>
    </section>
  );
}
