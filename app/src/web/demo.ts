import type { Snapshot } from "../shared/contracts.js";

/** Provides an explicitly labeled synthetic graph so visitors can inspect the UI without Telegram access. */
export function demoSnapshot(): Snapshot {
  const names = [
    "Alex Morgan",
    "Sofia Chen",
    "Max Rivera",
    "Lena Novak",
    "Oliver Park",
    "Maya Brooks",
    "Noah Kim",
    "Emma Wilson",
    "Leo Martin",
    "Iris Cohen",
    "Daniel Reed",
    "Nina Patel",
  ];
  const titles = [
    "Design collective",
    "Builders & founders",
    "Belgrade community",
    "Creative coding",
    "Weekend outdoors",
  ];
  const people = names.map((name, index) => ({
    id: `user:${index + 1}`,
    name,
    username: null,
    sources:
      index % 3 === 0
        ? (["contacts", "dialogs"] as ("contacts" | "dialogs")[])
        : (["contacts"] as ("contacts" | "dialogs")[]),
  }));
  return {
    people,
    scan: {
      id: "demo",
      createdAt: "2026-09-10T12:00:00Z",
      running: false,
      people: people.map((person, index) => ({
        personId: person.id,
        status: "completed",
        groups: titles.flatMap((title, groupIndex) =>
          (index + groupIndex * 3) % (groupIndex + 2) === 0 || index % 5 === groupIndex
            ? [{ id: `group:${groupIndex + 1}`, title }]
            : [],
        ),
        cursor: "0",
        error: null,
        retryAt: null,
        observedAt: "2026-09-10T12:00:00Z",
      })),
    },
  };
}
