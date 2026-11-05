const PREFIX = '#/share';
const MAX_IDS = 100;

export function buildShareUrl(ids: string[], base: string): string {
  return `${base}${PREFIX}?c=${ids.map(encodeURIComponent).join(',')}`;
}

const safeDecode = (s: string): string | null => {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
};

/** Returns null when `hash` is not a share link; otherwise the valid, de-duplicated ids in order. */
export function parseShareHash(hash: string, known: Set<string>): string[] | null {
  if (hash !== PREFIX && !hash.startsWith(`${PREFIX}?`)) return null;
  const raw = hash.slice(PREFIX.length + 1).match(/(?:^|&)c=([^&]*)/)?.[1] ?? '';
  const ids: string[] = [];
  for (const part of raw.split(',')) {
    const id = safeDecode(part);
    if (id && known.has(id) && !ids.includes(id)) ids.push(id);
    if (ids.length === MAX_IDS) break;
  }
  return ids;
}

export function clearShareHash(): void {
  history.replaceState(history.state, '', location.pathname + location.search);
}
