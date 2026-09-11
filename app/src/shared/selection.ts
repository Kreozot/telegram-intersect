/** Retains existing choices first and adds candidates only until the configured limit is reached. */
export function limitSelection(
  selected: ReadonlySet<string>,
  candidates: Iterable<string>,
  maximum: number,
): Set<string> {
  const next = new Set([...selected].slice(0, maximum));
  for (const id of candidates) {
    if (next.size >= maximum) break;
    next.add(id);
  }
  return next;
}

/** Toggles one identity without allowing a new choice beyond the configured simultaneous limit. */
export function toggleSelection(
  selected: ReadonlySet<string>,
  id: string,
  maximum: number,
): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else if (next.size < maximum) next.add(id);
  return next;
}
