/**
 * Derive a short, human display label from a prompt:
 * strip filler words, title-case, cap at ~24 chars on a word boundary.
 * e.g. "weathered copper, oxidized patina" → "Weathered Copper"
 *
 * Used for the status readout and inspector title only — tray tooltips and
 * the download zip slug keep the full original prompt.
 */

const MAX_LENGTH = 24;

const FILLER = new Set([
  'a',
  'an',
  'the',
  'of',
  'with',
  'and',
  'in',
  'on',
  'for',
  'very',
  'some',
  'slightly',
  'subtle',
]);

export function displayName(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !FILLER.has(w));

  let out = '';
  for (const word of words) {
    const titled = word.charAt(0).toUpperCase() + word.slice(1);
    const next = out ? `${out} ${titled}` : titled;
    if (next.length > MAX_LENGTH) break;
    out = next;
  }
  return out || prompt.slice(0, MAX_LENGTH);
}
