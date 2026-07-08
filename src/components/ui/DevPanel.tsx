import { useEffect } from 'react';
import { useMaterialStore } from '../../state/materialStore';
import { displayName } from '../../utils/displayName';
import { applyDemoMaterial } from '../../utils/demoMaterial';

/**
 * DEV-ONLY control for exercising the material apply-path by hand. Rendered
 * exclusively when import.meta.env.DEV (see App.tsx) — it does not exist in
 * production builds. The demo-material logic itself lives in
 * src/utils/demoMaterial.ts so the first-load bootstrap works without this
 * panel.
 */
export function DevPanel() {
  const resetMaterial = useMaterialStore((s) => s.resetMaterial);
  const label = useMaterialStore((s) => s.label);

  // Dev-only acceptance hook: visiting /?demo=1 applies the demo material on
  // load, so the apply-path can be verified headlessly (no click needed).
  useEffect(() => {
    if (new URLSearchParams(location.search).has('demo')) {
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
