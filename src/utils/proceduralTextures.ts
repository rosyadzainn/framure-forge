/**
 * Runtime procedural demo textures drawn on a <canvas>.
 *
 * These are a DEV-PROOF tool, not a pretty material: their job is to make the
 * material apply-path unmistakably visible with zero image assets on disk.
 *  - albedo:    bold near-black / orange checker (high contrast)
 *  - normal:    strong tileable dome bumps (real, visible relief)
 *  - roughness: checker-matched — orange cells glossy, dark cells rough
 *
 * Every generator returns a data URL, so the output is a drop-in `string`
 * source for the material store — identical in shape to a file path or an
 * AI-generated object URL.
 */

const SIZE = 512;
/** Checker cells per texture tile (shared so all three maps stay aligned). */
const CELLS = 6;

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context for procedural textures');
  return { canvas, ctx };
}

/** Deterministic pseudo-random in [0, 1) so results are stable between runs. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Bold high-contrast checker: near-black vs. vivid orange. sRGB albedo. */
export function makeAlbedoDataURL(): string {
  const { canvas, ctx } = createCanvas();
  const cell = SIZE / CELLS;
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? '#ff6a00' : '#141417';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // Thin light grid lines so cell borders read even on curved silhouettes.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 4;
  for (let i = 0; i <= CELLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, SIZE);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(SIZE, i * cell);
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

/**
 * Strong tileable dome bumps, one per checker cell: normals derived
 * analytically from h(u,v) = sin(u)·sin(v). Linear (NoColorSpace).
 */
export function makeNormalDataURL(): string {
  const { canvas, ctx } = createCanvas();
  const img = ctx.createImageData(SIZE, SIZE);
  const freq = (CELLS * Math.PI) / SIZE; // one dome per checker cell, tileable
  const strength = 1.6; // bump slope multiplier — deliberately strong
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const u = x * freq;
      const v = y * freq;
      // Gradient of sin(u)·sin(v), scaled; z up; then normalize.
      const gx = -Math.cos(u) * Math.sin(v) * strength;
      const gy = -Math.sin(u) * Math.cos(v) * strength;
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

/**
 * Roughness aligned to the albedo checker: orange cells glossy (~0.18),
 * dark cells rough (~0.85), light noise on top. Grayscale, linear.
 */
export function makeRoughnessDataURL(): string {
  const { canvas, ctx } = createCanvas();
  const img = ctx.createImageData(SIZE, SIZE);
  const cell = SIZE / CELLS;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const even = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      const base = even ? 46 : 218; // glossy orange cells, rough dark cells
      const n = (rand(x * 0.17 + y * 0.31) - 0.5) * 24;
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
