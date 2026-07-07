/**
 * PBR material definition used across the showroom.
 *
 * Each map is an optional source string: a path under /public, a regular URL,
 * or a blob:/object URL (e.g. `URL.createObjectURL(...)` from a generated
 * image). Keeping these as plain strings means the *source* of a texture is
 * irrelevant to the rest of the app — a hand-authored file and an
 * AI-generated blob are interchangeable here.
 */
export interface MaterialMaps {
  /** Base color / albedo. Interpreted as sRGB. */
  albedo?: string;
  /** Tangent-space normal map. Linear color space. */
  normal?: string;
  /** Roughness map (grayscale). Linear color space. */
  roughness?: string;
  /** Ambient occlusion map (grayscale). Linear color space. */
  ao?: string;
  /** Height / displacement map (grayscale). Linear color space. */
  height?: string;
  /** Metalness map (grayscale). Linear color space. */
  metalness?: string;
}

/** One generated material kept in the tray history. */
export interface MaterialHistoryEntry {
  id: string;
  /** The prompt that produced it (also used for tooltips and zip names). */
  prompt: string;
  maps: MaterialMaps;
  tiling: number;
  /** Sphere-preview data URL rendered at generation time. */
  thumb: string;
  createdAt: number;
}

/** UI-facing state of the (mock) generation pipeline. */
export type GenerationStatus = 'idle' | 'generating' | 'error';

/**
 * The full material state applied to every hero object at once.
 */
export interface MaterialState {
  /** The set of PBR map sources currently applied. */
  maps: MaterialMaps;
  /**
   * How many times tileable textures repeat across each object's UVs.
   * Applied uniformly to all maps via RepeatWrapping.
   */
  tiling: number;
  /** Human-readable label for the active material (shown in the UI). */
  label: string;
}
