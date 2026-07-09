import { useEffect, useState } from 'react';
import { useInteractionStore } from '../../state/interactionStore';

/** Never dismiss before this — avoids a jarring flash on fast loads. */
const MIN_VISIBLE_MS = 600;
/** Must match the CSS opacity transition on .loading. */
const FADE_MS = 400;

/**
 * Branded full-viewport loading overlay. Plain DOM (outside the Canvas), so
 * it paints before Three.js initializes; same dark backdrop as the app, so
 * there is no flash. Fades out once the R3F scene reports its first rendered
 * frame (sceneReady flag — not a timeout), then unmounts entirely so no
 * invisible layer is left blocking clicks.
 */
export function LoadingScreen() {
  const sceneReady = useInteractionStore((s) => s.sceneReady);
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  const hiding = sceneReady && minElapsed;

  // Remove from the DOM once the fade has finished.
  useEffect(() => {
    if (!hiding) return;
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [hiding]);

  if (gone) return null;

  return (
    <div className={`loading${hiding ? ' loading--hide' : ''}`} aria-hidden={hiding}>
      <div className="loading__brand">
        <span className="header__mark" aria-hidden="true" />
        <span className="loading__wordmark">framure forge</span>
      </div>
      <div className="loading__dots" role="status" aria-label="Loading">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
