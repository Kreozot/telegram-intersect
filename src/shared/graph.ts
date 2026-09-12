import type { GraphData, Group, MapMode, Person, PersonSource, Scan } from "./contracts.js";

/** Keeps identities supplied by at least one enabled catalog source. */
export function filterPeopleBySources(
  people: readonly Person[],
  sources: ReadonlySet<PersonSource>,
): Person[] {
  return people.filter((person) => person.sources.some((source) => sources.has(source)));
}

/** Derives the selectable community catalog from all observed scan results. */
export function observedCommunities(scan: Scan | null): Group[] {
  const groups = new Map<string, Group>();
  for (const result of scan?.people ?? []) {
    for (const group of result.groups) {
      const old = groups.get(group.id);
      groups.set(group.id, {
        id: group.id,
        title: group.title,
        ...(group.avatarUrl || old?.avatarUrl
          ? { avatarUrl: group.avatarUrl ?? old?.avatarUrl ?? "" }
          : {}),
      });
    }
  }
  return [...groups.values()];
}

/** Derives observed membership edges for the explorer; unfinished people never imply absent membership. */
export function buildGraph(
  people: readonly Person[],
  scan: Scan | null,
  selected: ReadonlySet<string>,
  mode: MapMode = "people",
): GraphData {
  const nodes: GraphData["nodes"] = [];
  const edges: GraphData["edges"] = [];
  const groups = new Map<string, { title: string; count: number; avatarUrl?: string }>();
  for (const person of people) {
    const result = scan?.people.find((entry) => entry.personId === person.id);
    const unique = new Map(result?.groups.map((group) => [group.id, group]));
    if (mode === "people" && !selected.has(person.id)) continue;
    const includedGroups =
      mode === "communities"
        ? new Map([...unique].filter(([groupId]) => selected.has(groupId)))
        : unique;
    if (mode === "communities" && includedGroups.size === 0) continue;
    nodes.push({
      id: person.id,
      label: person.name,
      kind: "person",
      count: includedGroups.size,
      ...(person.avatarUrl ? { avatarUrl: person.avatarUrl } : {}),
    });
    for (const group of includedGroups.values()) {
      const current = groups.get(group.id);
      groups.set(group.id, {
        title: group.title,
        count: (current?.count ?? 0) + 1,
        ...(group.avatarUrl ? { avatarUrl: group.avatarUrl } : {}),
      });
      edges.push({
        id: `${person.id}/${group.id}`,
        source: person.id,
        target: group.id,
      });
    }
  }
  for (const [id, group] of groups)
    nodes.push({
      id,
      label: group.title,
      kind: "group",
      count: group.count,
      ...(group.avatarUrl ? { avatarUrl: group.avatarUrl } : {}),
    });
  return { nodes, edges };
}

/** Merges contact and dialog identities without retaining extra Telegram entity fields. */
export function mergePeople(people: readonly Person[]): Person[] {
  const merged = new Map<string, Person>();
  for (const person of people) {
    const old = merged.get(person.id);
    const avatarUrl = person.avatarUrl ?? old?.avatarUrl;
    const dialogOrder = person.dialogOrder ?? old?.dialogOrder;
    merged.set(person.id, {
      id: person.id,
      name: person.name,
      username: person.username,
      sources: [...new Set([...(old?.sources ?? []), ...person.sources])],
      ...(dialogOrder !== undefined ? { dialogOrder } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    });
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}
