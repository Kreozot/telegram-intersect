import type { Snapshot } from "../shared/contracts.js";

const avatarColors = [
  ["#f0a36b", "#713c72"],
  ["#73c8b7", "#245b78"],
  ["#f2c66d", "#a7554b"],
  ["#9ab8ef", "#514a91"],
  ["#df8ea3", "#784a74"],
  ["#78c6d0", "#276475"],
] as const;

/** Creates a compact illustrated portrait that stays entirely inside the synthetic demo. */
function demoAvatar(name: string, index: number): string {
  const colors = avatarColors[index % avatarColors.length] ?? avatarColors[0];
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs>
    <rect width="96" height="96" rx="48" fill="url(#b)"/>
    <circle cx="48" cy="35" r="17" fill="#f8ddc5"/>
    <path d="M18 92c2-24 13-36 30-36s28 12 30 36" fill="#17394a" opacity=".88"/>
    <path d="M31 33c1-15 8-22 19-22 13 0 20 10 18 26-5-8-13-13-25-14-3 6-7 10-12 10Z" fill="#29343f"/>
    <text x="48" y="86" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white">${initials}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
    "Product people",
    "Indie makers",
    "City culture club",
  ];
  const memberships = [
    [0, 1, 2, 3, 5, 6],
    [0, 1, 3, 5, 7],
    [0, 2, 3, 4, 7],
    [0, 1, 2, 5, 6],
    [1, 2, 4, 5, 6],
    [0, 2, 3, 4, 7],
    [1, 2, 4, 6, 7],
    [0, 1, 3, 5, 7],
    [0, 2, 3, 4, 6],
    [1, 2, 4, 5, 7],
    [0, 1, 3, 5, 6],
    [0, 2, 4, 6, 7],
  ] as const;
  const people = names.map((name, index) => ({
    id: `user:${index + 1}`,
    name,
    username: null,
    avatarUrl: demoAvatar(name, index),
    sources:
      index % 3 === 0
        ? (["contacts", "dialogs"] as ("contacts" | "dialogs")[])
        : (["contacts"] as ("contacts" | "dialogs")[]),
  }));
  return {
    people,
    avatarLoading: false,
    scan: {
      id: "demo",
      createdAt: "2026-09-10T12:00:00Z",
      running: false,
      people: people.map((person, index) => ({
        personId: person.id,
        status: "completed",
        groups: (memberships[index] ?? []).map((groupIndex) => ({
          id: `group:${groupIndex + 1}`,
          title: titles[groupIndex] ?? "Demo community",
        })),
        cursor: "0",
        error: null,
        retryAt: null,
        observedAt: "2026-09-10T12:00:00Z",
      })),
    },
  };
}
