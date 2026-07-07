import type { MaterialMaps } from '../types/material';

/**
 * Parameterized procedural PBR material generator (canvas-based).
 *
 * Used by the MOCK generation flow: a prompt string is hashed into a
 * deterministic parameter set (pattern, hue, scale, roughness, bump), so
 * different prompts visibly produce different materials and the same prompt
 * always reproduces the same one. All maps are tileable and returned as data
 * URLs — the same `string` shape the real backend will return later.
 */

const SIZE = 512;

export interface ProceduralParams {
  pattern: 'checker' | 'stripes' | 'dots' | 'tiles';
  /** Accent hue (deg). The material is the only color allowed on screen. */
  hue: number;
  /** Accent saturation (%). */
  sat: number;
  /** Accent lightness (%). */
  light: number;
  /** Pattern cells per tile (controls visual scale). */
  cells: number;
  /** Roughness of the accent regions (0..1). */
  roughAccent: number;
  /** Roughness of the dark regions (0..1). */
  roughBase: number;
  /** Normal-map bump slope multiplier. */
  bump: number;
}

/** FNV-1a 32-bit string hash. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PATTERNS: ProceduralParams['pattern'][] = ['checker', 'stripes', 'dots', 'tiles'];

/** Derive a deterministic parameter set from a prompt string. */
export function paramsFromPrompt(prompt: string): ProceduralParams {
  const rand = mulberry32(hashString(prompt.trim().toLowerCase()));
  return {
    pattern: PATTERNS[Math.floor(rand() * PATTERNS.length)] ?? 'checker',
    hue: Math.floor(rand() * 360),
    sat: 35 + rand() * 50,
    light: 42 + rand() * 18,
    cells: 4 + Math.floor(rand() * 8),
    roughAccent: 0.15 + rand() * 0.35,
    roughBase: 0.6 + rand() * 0.35,
    bump: 0.8 + rand() * 1.8,
  };
}

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context');
  return { canvas, ctx };
}

/** Deterministic pseudo-random in [0, 1) for stable per-pixel noise. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pattern mask in [0,1]: 1 = accent region, 0 = dark base region.
 * All variants are periodic over SIZE/cells, so every map tiles seamlessly.
 */
function mask(params: ProceduralParams, x: number, y: number): number {
  const { pattern, cells } = params;
  const cell = SIZE / cells;
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  const fx = (x % cell) / cell;
  const fy = (y % cell) / cell;
  switch (pattern) {
    case 'checker':
      return (cx + cy) % 2 === 0 ? 1 : 0;
    case 'stripes':
      // Diagonal bands, period-safe across the tile edge.
      return Math.floor(((x + y) / cell) % 2) === 0 ? 1 : 0;
    case 'dots': {
      const dx = fx - 0.5;
      const dy = fy - 0.5;
      return dx * dx + dy * dy < 0.32 * 0.32 ? 1 : 0;
    }
    case 'tiles': {
      // Tiles with grout: accent everywhere except thin cell borders.
      const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
      return edge > 0.06 ? 1 : 0;
    }
  }
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
}

/** Albedo: dark base + hue accent following the pattern. sRGB. */
function makeAlbedo(params: ProceduralParams): string {
  const { canvas, ctx } = createCanvas();
  const img = ctx.createImageData(SIZE, SIZE);
  // Pre-render the two tones once via fillStyle parsing.
  const probe = createCanvas();
  probe.ctx.fillStyle = hsl(params.hue, params.sat, params.light);
  probe.ctx.fillRect(0, 0, 1, 1);
  probe.ctx.fillStyle = hsl(params.hue, Math.min(30, params.sat * 0.4), 9);
  probe.ctx.fillRect(1, 0, 1, 1);
  const tones = probe.ctx.getImageData(0, 0, 2, 1).data;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const m = mask(params, x, y);
      const o = m > 0.5 ? 0 : 4;
      const jitter = (noise(x * 0.7 + y * 1.3) - 0.5) * 14;
      img.data[i] = Math.max(0, Math.min(255, (tones[o] ?? 0) + jitter));
      img.data[i + 1] = Math.max(0, Math.min(255, (tones[o + 1] ?? 0) + jitter));
      img.data[i + 2] = Math.max(0, Math.min(255, (tones[o + 2] ?? 0) + jitter));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Normal: tileable dome/ridge relief scaled by `bump`. Linear. */
function makeNormal(params: ProceduralParams): string {
  const { canvas, ctx } = createCanvas();
  const img = ctx.createImageData(SIZE, SIZE);
  const freq = (params.cells * Math.PI) / SIZE;
  const s = params.bump;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const u = x * freq;
      const v = y * freq;
      // Stripes get 1D ridges; everything else gets 2D domes.
      const gx =
        params.pattern === 'stripes'
          ? -Math.cos(u + v) * s
          : -Math.cos(u) * Math.sin(v) * s;
      const gy =
        params.pattern === 'stripes'
          ? -Math.cos(u + v) * s
          : -Math.sin(u) * Math.cos(v) * s;
      const len = Math.sqrt(gx * gx + gy * gy + 1);
      img.data[i] = Math.round((gx / len) * 0.5 * 255 + 127.5);
      img.data[i + 1] = Math.round((gy / len) * 0.5 * 255 + 127.5);
      img.data[i + 2] = Math.round((1 / len) * 0.5 * 255 + 127.5);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Roughness: pattern-aligned two-level roughness + light noise. Linear. */
function makeRoughness(params: ProceduralParams): string {
  const { canvas, ctx } = createCanvas();
  const img = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const m = mask(params, x, y);
      const base = (m > 0.5 ? params.roughAccent : params.roughBase) * 255;
      const n = (noise(x * 0.17 + y * 0.31) - 0.5) * 22;
      const v = Math.max(0, Math.min(255, Math.round(base + n)));
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Build the full tileable PBR map set for a parameter set. */
export function makeProceduralMaps(params: ProceduralParams): MaterialMaps {
  return {
    albedo: makeAlbedo(params),
    normal: makeNormal(params),
    roughness: makeRoughness(params),
  };
}
