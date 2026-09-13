const RUSSIAN_TRANSLITERATION = {
  а: ["a"],
  б: ["b"],
  в: ["v"],
  г: ["g"],
  д: ["d"],
  е: ["e"],
  ё: ["yo", "e", "jo"],
  ж: ["zh"],
  з: ["z"],
  и: ["i"],
  й: ["y", "i", "j"],
  к: ["k"],
  л: ["l"],
  м: ["m"],
  н: ["n"],
  о: ["o"],
  п: ["p"],
  р: ["r"],
  с: ["s"],
  т: ["t"],
  у: ["u"],
  ф: ["f"],
  х: ["kh", "h"],
  ц: ["ts", "c"],
  ч: ["ch"],
  ш: ["sh"],
  щ: ["shch", "shh"],
  ъ: ["", "ie"],
  ы: ["y"],
  ь: [""],
  э: ["e"],
  ю: ["yu", "iu", "ju"],
  я: ["ya", "ia", "ja"],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/** Normalizes casing and spacing without collapsing distinct Russian letters such as й and ё. */
function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ru").normalize("NFC").replace(/\s+/g, " ").trim();
}

/** Removes Latin diacritics after Russian letters have retained their semantic distinctions. */
function removeDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "");
}

/** Returns every accepted Latin spelling for one Russian character, or the character itself. */
function characterAlternatives(character: string): readonly string[] {
  return RUSSIAN_TRANSLITERATION[character as keyof typeof RUSSIAN_TRANSLITERATION] ?? [character];
}

/** Advances every viable text position through one character's transliteration alternatives. */
function advancePositions(
  text: string,
  positions: ReadonlySet<number>,
  alternatives: readonly string[],
): ReadonlySet<number> {
  const next = new Set<number>();
  for (const position of positions) {
    for (const alternative of alternatives) {
      if (text.startsWith(alternative, position)) next.add(position + alternative.length);
    }
  }
  return next;
}

/** Finds a full Cyrillic or mixed-script pattern inside Latin text using per-letter alternatives. */
function transliteratedPatternOccurs(pattern: string, text: string): boolean {
  for (let start = 0; start <= text.length; start += 1) {
    let positions: ReadonlySet<number> = new Set([start]);
    for (const character of pattern) {
      positions = advancePositions(text, positions, characterAlternatives(character));
      if (positions.size === 0) break;
    }
    if (positions.size > 0) return true;
  }
  return false;
}

/** Finds a Latin query within any contiguous part of text containing Russian characters. */
function transliteratedTextContains(text: string, query: string): boolean {
  const characters = [...text];
  for (let start = 0; start < characters.length; start += 1) {
    let positions: ReadonlySet<number> = new Set([0]);
    for (let index = start; index < characters.length && positions.size > 0; index += 1) {
      const character = characters[index];
      if (character === undefined) break;
      positions = advancePositions(query, positions, characterAlternatives(character));
      if (positions.has(query.length)) return true;
    }
  }
  return false;
}

/** Matches normalized text across arbitrary mixtures of supported Russian transliteration rules. */
export function matchesSearchQuery(value: string, query: string): boolean {
  const normalizedValue = normalizeSearchText(value);
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return true;
  if (normalizedValue.includes(normalizedQuery)) return true;

  const latinValue = removeDiacritics(normalizedValue);
  const latinQuery = removeDiacritics(normalizedQuery);
  return (
    latinValue.includes(latinQuery) ||
    transliteratedPatternOccurs(normalizedQuery, latinValue) ||
    transliteratedTextContains(normalizedValue, latinQuery)
  );
}
