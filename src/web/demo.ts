import type { Group, Snapshot } from "../shared/contracts.js";

const palettes = [
  ["#f0a36b", "#713c72", "#17394a"],
  ["#73c8b7", "#245b78", "#f5d7bd"],
  ["#f2c66d", "#a7554b", "#26384a"],
  ["#9ab8ef", "#514a91", "#f4cdb5"],
  ["#df8ea3", "#784a74", "#243746"],
  ["#78c6d0", "#276475", "#e8bfa8"],
  ["#b6d77a", "#39705f", "#4b3049"],
  ["#ee8c78", "#3f608c", "#f1c9a8"],
] as const;

/** Encodes a small synthetic SVG as a self-contained browser image. */
function svgUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Creates varied illustrated portraits without using or resembling real contact photos. */
function personAvatar(name: string, index: number): string {
  const colors = palettes[index % palettes.length] ?? palettes[0];
  const skin = ["#f6d2b8", "#d99b72", "#8f5d45", "#f0bd96", "#b97855"][index % 5];
  const hair = ["#25232a", "#7c4930", "#d1a35b", "#4a3029", "#ddd4bf"][index % 5];
  const initials = name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toUpperCase())
    .join("");
  const glasses =
    index % 4 === 1
      ? '<g fill="none" stroke="#25313d" stroke-width="2"><circle cx="39" cy="42" r="7"/><circle cx="57" cy="42" r="7"/><path d="M46 42h4"/></g>'
      : "";
  const accessory =
    index % 5 === 2
      ? `<path d="M20 37a28 28 0 0 1 56 0" fill="none" stroke="${colors[0]}" stroke-width="7"/><rect x="16" y="35" width="8" height="18" rx="4" fill="${colors[0]}"/><rect x="72" y="35" width="8" height="18" rx="4" fill="${colors[0]}"/>`
      : "";
  const hairShape =
    index % 3 === 0
      ? `<path d="M29 38c-1-20 9-29 22-29 16 0 22 13 18 31-7-10-18-15-33-12-1 5-3 8-7 10Z" fill="${hair}"/>`
      : index % 3 === 1
        ? `<path d="M27 43c-4-19 6-33 22-33 18 0 26 15 20 35l-7-17-9 5-10-7-10 15Z" fill="${hair}"/>`
        : `<path d="M30 32c4-17 12-23 24-21 12 2 18 12 15 28-10-9-23-12-39-7Z" fill="${hair}"/>`;
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#b)"/><circle cx="48" cy="42" r="21" fill="${skin}"/>${hairShape}${glasses}${accessory}<path d="M12 96c3-27 16-39 36-39s33 12 36 39" fill="${colors[2]}"/><text x="48" y="87" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="white">${initials}</text></svg>`,
  );
}

/** Creates distinct scenic and symbolic thumbnails for communities and local chats. */
function groupAvatar(index: number): string {
  const colors = palettes[(index + 3) % palettes.length] ?? palettes[0];
  const motifs = [
    '<path d="M25 67 43 34l10 19 9-11 14 25Z" fill="#fff" opacity=".88"/><circle cx="70" cy="25" r="9" fill="#ffd86b"/>',
    '<path d="M24 63h48M31 63V35h34v28M39 35v-9h18v9M38 44h7v7h-7m13-7h7v7h-7" fill="none" stroke="#fff" stroke-width="5"/>',
    '<circle cx="48" cy="48" r="24" fill="none" stroke="#fff" stroke-width="5"/><path d="m48 28 6 14 14 6-14 6-6 14-6-14-14-6 14-6Z" fill="#fff"/>',
    '<path d="M24 61c10-22 17-31 24-31s14 9 24 31" fill="none" stroke="#fff" stroke-width="6"/><circle cx="48" cy="47" r="8" fill="#fff"/>',
    '<path d="M25 33h46v34H25z" fill="none" stroke="#fff" stroke-width="5"/><path d="M35 27v12m26-12v12M25 45h46" stroke="#fff" stroke-width="5"/>',
    '<path d="M29 65V38l19-10 19 10v27M39 65V49h18v16" fill="none" stroke="#fff" stroke-width="5"/><circle cx="48" cy="39" r="4" fill="#fff"/>',
  ];
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="96" height="96" rx="24" fill="url(#g)"/>${motifs[index % motifs.length]}</svg>`,
  );
}

const communityTitles = [
  "Balkan Product Circle",
  "Creative Coding Lab",
  "Belgrade Runners",
  "Analog Photo Walks",
  "Indie Makers Europe",
  "Friday Board Games",
  "Danube Kayak Crew",
  "Tiny Gardens",
  "Mila's rooftop birthday",
  "UX Research Exchange",
  "Jazz cellar regulars",
  "Parents of 3B",
  "Sunday flea market",
  "Open Source Maintainers",
  "Kopaonik ski weekend",
  "Building 14 neighbors",
] as const;

const memberships = [
  [0, 1, 4, 9, 13],
  [0, 4, 5, 13],
  [0, 2, 6, 14],
  [1, 3, 10, 12],
  [0, 5, 8, 10],
  [0, 1, 3, 4, 9, 13],
  [0, 2, 5, 6, 14],
  [0, 5, 7, 11, 15],
  [3, 10, 12],
  [0, 5, 8, 15],
  [0, 1, 4, 5, 9, 13],
  [2],
  [5, 8, 15],
  [0, 3, 5, 10],
  [7, 11, 12, 15],
  [0, 1, 2, 4, 5, 9, 13],
  [0, 5, 6, 14],
  [7, 12, 15],
  [0, 4],
  [0, 3, 8, 10, 12],
] as const;

/** Provides an explicitly labeled synthetic graph so visitors can inspect the UI without Telegram access. */
export function demoSnapshot(): Snapshot {
  const names = [
    "Alex Morgan",
    "sofia.exe",
    "Max",
    "Lena Novak",
    "Oli P.",
    "Maya Brooks",
    "n0ah",
    "Em",
    "Leo from Zemun",
    "iris.jpg",
    "Daniel Reed",
    "Nina",
    "Auntie Liv",
    "moss",
    "Dragan K.",
    "Sam / product",
    "Yuki",
    "Casey 🚲",
    "Rae",
    "Boris 'Boki'",
  ];
  const groups: Group[] = communityTitles.map((title, index) => ({
    id: `group:${index + 1}`,
    title,
    avatarUrl: groupAvatar(index),
  }));
  const people = names.map((name, index) => ({
    id: `user:${index + 1}`,
    name,
    username: index % 4 === 0 ? `demo_${index + 1}` : null,
    avatarUrl: personAvatar(name, index),
    sources:
      index % 4 === 0
        ? (["contacts", "dialogs"] as const)
        : index % 4 === 1
          ? (["dialogs"] as const)
          : (["contacts"] as const),
  }));
  return {
    people: people.map((person) => ({ ...person, sources: [...person.sources] })),
    avatarLoading: false,
    scan: {
      id: "demo",
      createdAt: "2026-09-10T12:00:00Z",
      running: false,
      people: people.map((person, index) => ({
        personId: person.id,
        status: "completed",
        groups: (memberships[index] ?? []).map((groupIndex) => groups[groupIndex] as Group),
        cursor: "0",
        error: null,
        retryAt: null,
        observedAt: "2026-09-10T12:00:00Z",
      })),
    },
  };
}
