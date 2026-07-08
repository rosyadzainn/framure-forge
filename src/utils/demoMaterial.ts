import { useMaterialStore } from '../state/materialStore';
import {
  makeAlbedoDataURL,
  makeNormalDataURL,
  makeRoughnessDataURL,
} from './proceduralTextures';
import { makeProceduralMaps, paramsFromPrompt } from './proceduralMaterial';

/**
 * Apply the procedural checker demo material (zero network calls).
 * Used by the dev-only DevPanel button and the ?demo=1 test hook — kept out
 * of DevPanel itself, which is excluded from production builds.
 * Drives the exact same setMaterial() entry point the AI layer uses.
 */
export function applyDemoMaterial(): void {
  useMaterialStore.getState().setMaterial(
    {
      albedo: makeAlbedoDataURL(),
      normal: makeNormalDataURL(),
      roughness: makeRoughnessDataURL(),
    },
    { label: 'Demo (procedural)', tiling: 2 }
  );
}

const FIRST_LOAD_PROMPT = 'weathered bronze, dark patina';

/**
 * First-load bootstrap: if nothing has been applied yet this session, apply a
 * product-looking material so the first frame shows the app working instead
 * of neutral gray objects. Skips when any material is already active.
 *
 * Uses the SAME generator as the mock generation path
 * (paramsFromPrompt → makeProceduralMaps; zero network) with two deliberate
 * deviations, because this is a bootstrap rather than a simulated request:
 *  - no fake latency and no random failure (must be instant and reliable);
 *  - the hash-derived hue for this prompt lands on yellow-green, so the
 *    color fields are clamped to bronze to match the label.
 * Follows the demo pattern: applied directly, not added to the history tray.
 */
export function applyFirstLoadMaterialIfPristine(): void {
  const { touched, maps } = useMaterialStore.getState();
  if (touched || Object.keys(maps).length > 0) return;

  const params = {
    ...paramsFromPrompt(FIRST_LOAD_PROMPT),
    hue: 28,
    sat: 42,
    light: 44,
  };
  useMaterialStore
    .getState()
    .setMaterial(makeProceduralMaps(params), {
      label: FIRST_LOAD_PROMPT,
      tiling: 2,
    });
}
