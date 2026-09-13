import type { Group } from "../../../shared/contracts.js";
import type { PeopleSort } from "./sort-people.js";

/** Orders observed communities by discovery, title, or observed-person count. */
export function sortCommunities(
  communities: readonly Group[],
  sort: PeopleSort,
  selectedFirst: boolean,
  selected: ReadonlySet<string>,
  commonPeopleCounts: ReadonlyMap<string, number>,
): Group[] {
  return communities
    .map((community, discoveryOrder) => ({ community, discoveryOrder }))
    .sort((left, right) => {
      if (selectedFirst) {
        const selectedDifference =
          Number(selected.has(right.community.id)) - Number(selected.has(left.community.id));
        if (selectedDifference !== 0) return selectedDifference;
      }
      if (sort === "recent") return left.discoveryOrder - right.discoveryOrder;
      if (sort === "common") {
        const countDifference =
          (commonPeopleCounts.get(right.community.id) ?? 0) -
          (commonPeopleCounts.get(left.community.id) ?? 0);
        if (countDifference !== 0) return countDifference;
      }
      return left.community.title.localeCompare(right.community.title);
    })
    .map(({ community }) => community);
}
