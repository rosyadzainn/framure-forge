import { Scene } from './components/Scene';
import { Header } from './components/ui/Header';
import { PromptBar } from './components/ui/PromptBar';
import { MaterialsTray } from './components/ui/MaterialsTray';
import { MaterialInspector } from './components/ui/MaterialInspector';
import { DevPanel } from './components/ui/DevPanel';

/**
 * App shell. The 3D <Scene> fills the viewport; the monochrome UI chrome is an
 * overlay layer on top (header, prompt bar, materials tray, inspector, and a
 * receded dev panel in the corner).
 */
export function App() {
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

        {/* Dev tool, tucked into the corner — not product UI. */}
        <DevPanel />

        {/* Non-interactive credit line, in the gap below the dock. */}
        <div className="footer-credit" aria-hidden="true">
          framure forge — ai materials on amd instinct
        </div>
      </div>
    </div>
  );
}
