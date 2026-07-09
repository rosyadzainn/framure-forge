import { create } from 'zustand';
import type {
  GenerationStatus,
  MaterialHistoryEntry,
  MaterialMaps,
  MaterialState,
} from '../types/material';
import { generateMaterial } from '../generation/mockGenerator';
import { renderMaterialThumbnail } from '../utils/thumbnailRenderer';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  🔌  MATERIAL SLOT — THE AI PLUG POINT
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  This store is the single source of truth for the material applied to every
 *  hero object in the showroom, plus the generation history shown in the
 *  tray. It is deliberately decoupled from *where* textures come from.
 *
 *  The generation pipeline itself lives behind ONE function —
 *  `generateMaterial(prompt)` in src/generation/mockGenerator.ts — which is
 *  the single swap point for the real AI backend later. The `generate` action
 *  below orchestrates the flow (status → maps → thumbnail → history) and
 *  will not need to change when the mock is swapped out.
 *
 *  Direct injection stays possible too: `setMaterial(maps, options)` applies
 *  any map set immediately (the dev demo button uses this).
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Neutral material used when no maps are set. Mid-grey, semi-rough dielectric. */
export const DEFAULT_MATERIAL: MaterialState = {
  maps: {},
  tiling: 2,
  label: 'Neutral',
};

const HISTORY_CAP = 6;
const GENERATED_TILING = 2;

interface MaterialStore extends MaterialState {
  /** Generation pipeline status (drives prompt bar + scene cue). */
  status: GenerationStatus;
  /** Generated materials, newest first, capped at HISTORY_CAP. */
  history: MaterialHistoryEntry[];
  /** History entry currently applied to the heroes (null = demo/neutral). */
  activeId: string | null;
  /** True once any material has been generated or applied this session
   *  (never unset — drives the first-visit hint). */
  touched: boolean;

  /**
   * Replace the active material directly. Options let a caller also set the
   * tiling and label in one shot. Anything omitted falls back to the default
   * so partial payloads stay safe. Does not touch history.
   */
  setMaterial: (
    maps: MaterialMaps,
    options?: { tiling?: number; label?: string }
  ) => void;
  /** Adjust only the tiling / repeat factor. */
  setTiling: (tiling: number) => void;
  /** Return to the neutral default material. */
  resetMaterial: () => void;

  /** Run the (mock) generation pipeline. Resolves true on success. */
  generate: (prompt: string) => Promise<boolean>;
  /** Re-apply a material from the tray history. */
  applyEntry: (id: string) => void;
  /**
   * Seed the tray with an already-built material (the first-load default):
   * applies it to the showroom immediately (synchronously, so the first
   * frame isn't neutral), then adds it to the history as a normal,
   * clickable, active entry once its sphere thumbnail is rendered.
   */
  seedMaterial: (prompt: string, maps: MaterialMaps) => Promise<void>;
}

export const useMaterialStore = create<MaterialStore>((set, get) => ({
  ...DEFAULT_MATERIAL,
  status: 'idle',
  history: [],
  activeId: null,
  touched: false,

  setMaterial: (maps, options) =>
    set({
      maps,
      tiling: options?.tiling ?? DEFAULT_MATERIAL.tiling,
      label: options?.label ?? 'Custom material',
      activeId: null,
      touched: true,
    }),

  setTiling: (tiling) => set({ tiling }),

  resetMaterial: () => set({ ...DEFAULT_MATERIAL, activeId: null }),

  generate: async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed || get().status === 'generating') return false;
    set({ status: 'generating' });
    try {
      const maps = await generateMaterial(trimmed);
      const thumb = await renderMaterialThumbnail(maps);
      const entry: MaterialHistoryEntry = {
        id: crypto.randomUUID(),
        prompt: trimmed,
        maps,
        tiling: GENERATED_TILING,
        thumb,
        createdAt: Date.now(),
      };
      set((state) => ({
        status: 'idle',
        history: [entry, ...state.history].slice(0, HISTORY_CAP),
        activeId: entry.id,
        maps: entry.maps,
        tiling: entry.tiling,
        label: entry.prompt,
        touched: true,
      }));
      return true;
    } catch (err) {
      console.warn('[showroom] generation failed:', err);
      set({ status: 'error' });
      return false;
    }
  },

  applyEntry: (id) => {
    const entry = get().history.find((e) => e.id === id);
    if (!entry) return;
    set({
      maps: entry.maps,
      tiling: entry.tiling,
      label: entry.prompt,
      activeId: entry.id,
      status: 'idle',
      touched: true,
    });
  },

  seedMaterial: async (prompt, maps) => {
    // Apply immediately — `touched` also guards StrictMode double-invocation.
    set({ maps, tiling: GENERATED_TILING, label: prompt, touched: true });
    try {
      const thumb = await renderMaterialThumbnail(maps);
      const entry: MaterialHistoryEntry = {
        id: crypto.randomUUID(),
        prompt,
        maps,
        tiling: GENERATED_TILING,
        thumb,
        createdAt: Date.now(),
      };
      set((state) => ({
        // Seeded entry sits at the OLD end: newly generated materials keep
        // prepending in front of it, exactly as they do for each other.
        history: [...state.history, entry].slice(0, HISTORY_CAP),
        // Mark it active unless something else was applied in the meantime.
        activeId: state.activeId ?? entry.id,
      }));
    } catch (err) {
      console.warn('[showroom] failed to seed the tray thumbnail:', err);
    }
  },
}));
