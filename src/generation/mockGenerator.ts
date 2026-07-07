import type { MaterialMaps } from '../types/material';
import { makeProceduralMaps, paramsFromPrompt } from '../utils/proceduralMaterial';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  🔌  GENERATION SWAP POINT — replace THIS function with the real backend
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  `generateMaterial(prompt)` is the ONLY place the app asks for a material
 *  to be created. Everything else (store, prompt bar, tray history,
 *  thumbnails, inspector, download) consumes its result generically.
 *
 *  Today: a MOCK — ~2.5s fake latency, 5% random failure, and a procedural
 *  material deterministically derived from the prompt string.
 *
 *  Later: swap the body for the real AI texture backend (e.g. the AMD GPU
 *  service) — call it, receive albedo/normal/roughness/... images, and return
 *  them as URLs / object URLs in the same `MaterialMaps` shape. Reject/throw
 *  on failure; the UI already handles the error state.
 * ─────────────────────────────────────────────────────────────────────────
 */

const MOCK_LATENCY_MS = 2500;
const MOCK_FAILURE_RATE = 0.05;

/**
 * Rough expected duration of one generation, used by the UI to pace its
 * staged loading copy ("composing surface…" → "deriving maps…" →
 * "applying…"). Update alongside the real backend's typical latency.
 */
export const EXPECTED_GENERATION_MS = MOCK_LATENCY_MS;

export async function generateMaterial(prompt: string): Promise<MaterialMaps> {
  // Fake network/inference latency (slightly jittered so it feels organic).
  const wait = MOCK_LATENCY_MS * (0.85 + Math.random() * 0.3);
  await new Promise((resolve) => setTimeout(resolve, wait));

  // Exercise the failure path deliberately.
  if (Math.random() < MOCK_FAILURE_RATE) {
    throw new Error('mock generation failure');
  }

  return makeProceduralMaps(paramsFromPrompt(prompt));
}
