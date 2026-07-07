import { useEffect } from 'react';
import { useMaterialStore } from '../../state/materialStore';
import { displayName } from '../../utils/displayName';
import {
  makeAlbedoDataURL,
  makeNormalDataURL,
  makeRoughnessDataURL,
} from '../../utils/proceduralTextures';

/** Apply the procedural demo material (the exact path the AI layer will use). */
function applyDemoMaterial(): void {
  useMaterialStore.getState().setMaterial(
    {
      albedo: makeAlbedoDataURL(),
      normal: makeNormalDataURL(),
      roughness: makeRoughnessDataURL(),
    },
    { label: 'Demo (procedural)', tiling: 2 }
  );
}

/**
 * DEV-ONLY control that proves the material apply-path works end to end,
 * TODAY, before any AI exists.
 *
 * "Load demo material" ALWAYS uses bold procedural <canvas> textures generated
 * at runtime — a high-contrast checker albedo, a strongly bumped normal map,
 * and checker-varied roughness — so the effect is impossible to miss.
 *
 * (A previous version preferred files from /public/textures/demo/ and used a
 * HEAD request to detect them. That was removed: Vite's dev-server SPA
 * fallback answers 200 + index.html for missing files, so the check
 * false-positived and the "loaded" material was invisible. Re-add a file path
 * later only with real content-type validation.)
 *
 * It drives the exact same setMaterial() entry point the AI layer will use.
 */
export function DevPanel() {
  const resetMaterial = useMaterialStore((s) => s.resetMaterial);
  const label = useMaterialStore((s) => s.label);

  // Dev-only acceptance hook: visiting /?demo=1 applies the demo material on
  // load, so the apply-path can be verified headlessly (no click needed).
  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
      applyDemoMaterial();
    }
  }, []);

  return (
    <div className="dev-panel">
      <span className="dev-panel__tag">dev</span>
      <div className="dev-panel__row">
        <button className="btn" onClick={applyDemoMaterial}>
          Load demo material
        </button>
        <button className="btn btn--ghost" onClick={resetMaterial}>
          Reset
        </button>
      </div>
      <span className="dev-panel__status" title={label}>
        active: <strong>{displayName(label)}</strong>
      </span>
    </div>
  );
}
