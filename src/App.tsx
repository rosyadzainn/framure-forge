import { useEffect } from 'react';
import { Scene } from './components/Scene';
import { Header } from './components/ui/Header';
import { PromptBar } from './components/ui/PromptBar';
import { MaterialsTray } from './components/ui/MaterialsTray';
import { MaterialInspector } from './components/ui/MaterialInspector';
import { DevPanel } from './components/ui/DevPanel';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { applyFirstLoadMaterialIfPristine } from './utils/demoMaterial';

/**
 * App shell. The 3D <Scene> fills the viewport; the monochrome UI chrome is an
 * overlay layer on top (header, prompt bar, materials tray, inspector, and —
 * in dev builds only — a receded dev panel in the corner).
 */
export function App() {
  // First frame should show the product working, not neutral gray objects.
  // No network involved — the material is procedural. Skips if anything is
  // already active (guard lives in the util; StrictMode-safe).
  useEffect(() => {
    applyFirstLoadMaterialIfPristine();
  }, []);

  return (
    <div className="app">
      {/* 3D layer */}
      <div className="app__canvas">
        <Scene />
      </div>

      {/* UI overlay layer */}
      <div className="app__ui">
        <Header />

        <div className="app__spacer" />

        <div className="app__dock">
          <MaterialsTray />
          <PromptBar />
        </div>

        {/* Right-side inspector for the active material's maps. */}
        <MaterialInspector />

        {/* Dev tool — stripped from production builds entirely. */}
        {import.meta.env.DEV && <DevPanel />}

        {/* Non-interactive credit line, in the gap below the dock. */}
        <div className="footer-credit" aria-hidden="true">
          framure forge — ai materials · powered by amd radeon pro w7900 · rocm
        </div>
      </div>

      {/* Branded loading overlay — plain DOM, unmounts after first frame. */}
      <LoadingScreen />
    </div>
  );
}
