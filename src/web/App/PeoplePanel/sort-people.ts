import type { Person } from "../../../shared/contracts.js";

export type PeopleSort = "recent" | "alphabetical" | "common";

/** Orders the visible catalog without mutating it; selection priority remains independent of the base order. */
export function sortPeople(
  people: readonly Person[],
  sort: PeopleSort,
  selectedFirst: boolean,
  selected: ReadonlySet<string>,
  commonGroupCounts: ReadonlyMap<string, number>,
): Person[] {
  return [...people].sort((left, right) => {
    if (selectedFirst) {
      const selectionDifference = Number(selected.has(right.id)) - Number(selected.has(left.id));
      if (selectionDifference !== 0) return selectionDifference;
    }
    if (sort === "recent") {
      const leftOrder = left.dialogOrder ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.dialogOrder ?? Number.POSITIVE_INFINITY;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    }
    if (sort === "common") {
      const countDifference =
        (commonGroupCounts.get(right.id) ?? 0) - (commonGroupCounts.get(left.id) ?? 0);
      if (countDifference !== 0) return countDifference;
    }
    return (
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) ||
      left.id.localeCompare(right.id)
    );
  });
}
