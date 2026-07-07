import type { MaterialMaps } from '../types/material';
import { makeProceduralMaps, paramsFromPrompt } from '../utils/proceduralMaterial';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  🔌  GENERATION SWAP POINT — backend-aware since this revision
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  `generateMaterial(prompt)` is the ONLY place the app asks for a material
 *  to be created. Everything else (store, prompt bar, tray history,
 *  thumbnails, inspector, download) consumes its result generically as
 *  `MaterialMaps` source strings (data URLs and object URLs are equivalent
 *  to consumers).
 *
 *  Selection logic:
 *   - If VITE_FORGE_API_URL is set, POST {base}/generate on the FastAPI
 *     backend (AMD GPU service) and convert its base64 PNGs to object URLs.
 *   - If the env var is unset/empty, or the backend call fails or times
 *     out, fall back to the built-in mock (procedural material derived
 *     deterministically from the prompt) with a console.warn of the reason.
 *
 *  `isBackendLive()` is exported for the UI to later show a "live GPU"
 *  badge; nothing calls it yet.
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ── Mock ──────────────────────────────────────────────────────────────── */

const MOCK_LATENCY_MS = 2500;
const MOCK_FAILURE_RATE = 0.05;

/**
 * Rough expected duration of one generation, used by the UI to pace its
 * staged loading copy ("composing surface…" → "deriving maps…" →
 * "applying…"). Update alongside the real backend's typical latency.
 */
export const EXPECTED_GENERATION_MS = MOCK_LATENCY_MS;

/** The original mock: ~2.5s fake latency, 5% random failure, procedural maps. */
async function generateMaterialMock(prompt: string): Promise<MaterialMaps> {
  // Fake network/inference latency (slightly jittered so it feels organic).
  const wait = MOCK_LATENCY_MS * (0.85 + Math.random() * 0.3);
  await new Promise((resolve) => setTimeout(resolve, wait));

  // Exercise the failure path deliberately.
  if (Math.random() < MOCK_FAILURE_RATE) {
    throw new Error('mock generation failure');
  }

  return makeProceduralMaps(paramsFromPrompt(prompt));
}

/* ── FastAPI backend client ────────────────────────────────────────────── */

/** Generous timeout: the first request after a backend cold start is slow. */
const GENERATE_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 5_000;
const GENERATE_STEPS = 30;
const GENERATE_SIZE = 1024;

/** POST {base}/generate response shape (maps are base64 PNGs, no prefix). */
interface ForgeGenerateResponse {
  prompt: string;
  seconds: number;
  maps: {
    albedo: string;
    normal: string;
    roughness: string;
  };
}

/** Normalized backend base URL, or null when not configured. */
function apiBaseUrl(): string | null {
  const raw: unknown = import.meta.env.VITE_FORGE_API_URL;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed === '' ? null : trimmed;
}

/** Decode a raw base64 PNG into a blob-backed object URL. The result is a
 *  plain source string, interchangeable with the mock's data URLs for every
 *  consumer (three.js TextureLoader, <img>, zip download via fetch). */
function base64PngToObjectURL(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}

async function generateMaterialViaApi(
  baseUrl: string,
  prompt: string
): Promise<MaterialMaps> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps: GENERATE_STEPS, size: GENERATE_SIZE }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`backend responded ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as ForgeGenerateResponse;
    const maps = data?.maps;
    if (!maps?.albedo || !maps.normal || !maps.roughness) {
      throw new Error('backend response is missing one or more maps');
    }
    return {
      albedo: base64PngToObjectURL(maps.albedo),
      normal: base64PngToObjectURL(maps.normal),
      roughness: base64PngToObjectURL(maps.roughness),
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Public API (signature unchanged) ──────────────────────────────────── */

let warnedNoBackend = false;

export async function generateMaterial(prompt: string): Promise<MaterialMaps> {
  const baseUrl = apiBaseUrl();

  if (baseUrl === null) {
    if (!warnedNoBackend) {
      warnedNoBackend = true;
      console.warn(
        '[forge] VITE_FORGE_API_URL is not set — using the mock generator.'
      );
    }
    return generateMaterialMock(prompt);
  }

  try {
    return await generateMaterialViaApi(baseUrl, prompt);
  } catch (err) {
    console.warn(
      '[forge] backend generation failed — falling back to the mock:',
      err
    );
    return generateMaterialMock(prompt);
  }
}

/** True when the configured backend answers GET {base}/health within 5s.
 *  Always false when no backend is configured. For a future UI badge. */
export async function isBackendLive(): Promise<boolean> {
  const baseUrl = apiBaseUrl();
  if (baseUrl === null) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
