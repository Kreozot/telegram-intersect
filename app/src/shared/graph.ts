import type { GraphData, Person, Scan } from "./contracts.js";

/** Derives observed membership edges for the explorer; unfinished people never imply absent membership. */
export function buildGraph(
  people: readonly Person[],
  scan: Scan | null,
  selected: ReadonlySet<string>,
): GraphData {
  const nodes: GraphData["nodes"] = [];
  const edges: GraphData["edges"] = [];
  const groups = new Map<string, { title: string; count: number }>();
  for (const person of people) {
    if (!selected.has(person.id)) continue;
    const result = scan?.people.find((entry) => entry.personId === person.id);
    const unique = new Map(result?.groups.map((group) => [group.id, group]));
    nodes.push({
      id: person.id,
      label: person.name,
      kind: "person",
      count: unique.size,
      ...(person.avatarUrl ? { avatarUrl: person.avatarUrl } : {}),
    });
    for (const group of unique.values()) {
      const current = groups.get(group.id);
      groups.set(group.id, {
        title: group.title,
        count: (current?.count ?? 0) + 1,
      });
      edges.push({
        id: `${person.id}/${group.id}`,
        source: person.id,
        target: group.id,
      });
    }
  }
  for (const [id, group] of groups)
    nodes.push({ id, label: group.title, kind: "group", count: group.count });
  return { nodes, edges };
}

/** Merges contact and dialog identities without retaining extra Telegram entity fields. */
export function mergePeople(people: readonly Person[]): Person[] {
  const merged = new Map<string, Person>();
  for (const person of people) {
    const old = merged.get(person.id);
    const avatarUrl = person.avatarUrl ?? old?.avatarUrl;
    merged.set(person.id, {
      id: person.id,
      name: person.name,
      username: person.username,
      sources: [...new Set([...(old?.sources ?? []), ...person.sources])],
      ...(avatarUrl ? { avatarUrl } : {}),
    });
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}
