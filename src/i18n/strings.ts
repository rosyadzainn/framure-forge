import { useLanguageStore, type Lang } from '../state/languageStore';

/**
 * Tiny dependency-free i18n: one typed dictionary per language, selected by
 * the persisted language store via `useStrings()`.
 *
 * Deliberately NOT translated:
 *  - prompt chips and placeholder examples — they are the literal prompts
 *    sent to SDXL, which expects English;
 *  - PBR map names (albedo/normal/roughness) — technical terms;
 *  - the wordmark and footer brand line;
 *  - the dev-only panel.
 */

const en = {
  headerMeta: 'material showroom · v0.1',
  badgeMock: 'mock mode',
  badgeLive: 'live · amd gpu (rocm)',
  badgeMockInfo:
    'Live inference runs on an AMD Radeon PRO W7900 (ROCm) via the FastAPI ' +
    'backend — see the demo video. This deployment serves mock data so the ' +
    'showroom is always explorable.',
  badgeLiveInfo: 'Connected to live SDXL backend on AMD ROCm.',
  trayLabel: 'materials',
  trayEmpty: 'generated materials appear here',
  promptPlaceholder: (example: string) =>
    `Describe a material…  e.g. “${example}”`,
  promptAria: 'Material prompt',
  generate: 'Generate',
  genMock: (s: number) => `rendering (mock) · ${s}s`,
  genCompose: (s: number) => `composing surface… · ${s}s`,
  genDerive: (s: number) => `deriving maps… · ${s}s`,
  genGpu: (s: number) => `rendering on AMD GPU · ${s}s`,
  genError: 'Generation failed — try again',
  download: 'Download',
  packing: 'Packing…',
  applyAria: (prompt: string) => `Apply material: ${prompt}`,
};

export type Strings = typeof en;

const id: Strings = {
  headerMeta: 'showroom material · v0.1',
  badgeMock: 'mode mock',
  badgeLive: 'live · gpu amd (rocm)',
  badgeMockInfo:
    'Inferensi live berjalan di AMD Radeon PRO W7900 (ROCm) melalui backend ' +
    'FastAPI — lihat video demo. Deployment ini menyajikan data mock agar ' +
    'showroom selalu bisa dijelajahi.',
  badgeLiveInfo: 'Terhubung ke backend SDXL live di AMD ROCm.',
  trayLabel: 'material',
  trayEmpty: 'material hasil generate muncul di sini',
  promptPlaceholder: (example: string) =>
    `Deskripsikan material…  mis. “${example}”`,
  promptAria: 'Prompt material',
  generate: 'Buat',
  genMock: (s: number) => `merender (mock) · ${s}s`,
  genCompose: (s: number) => `menyusun permukaan… · ${s}s`,
  genDerive: (s: number) => `menghasilkan maps… · ${s}s`,
  genGpu: (s: number) => `merender di GPU AMD · ${s}s`,
  genError: 'Pembuatan gagal — coba lagi',
  download: 'Unduh',
  packing: 'Mengemas…',
  applyAria: (prompt: string) => `Terapkan material: ${prompt}`,
};

const STRINGS: Record<Lang, Strings> = { en, id };

/** Current language's string table (re-renders the consumer on switch). */
export function useStrings(): Strings {
  const lang = useLanguageStore((s) => s.lang);
  return STRINGS[lang];
}
