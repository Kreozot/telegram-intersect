import type { Group } from "../../../shared/contracts.js";
import type { PeopleSort } from "./sort-people.js";

/** Orders observed communities by discovery or title, optionally prioritizing selected rows. */
export function sortCommunities(
  communities: readonly Group[],
  sort: PeopleSort,
  selectedFirst: boolean,
  selected: ReadonlySet<string>,
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
      return left.community.title.localeCompare(right.community.title);
    })
    .map(({ community }) => community);
}
