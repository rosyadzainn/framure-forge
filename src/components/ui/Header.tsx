import { useEffect, useRef, useState } from 'react';
import { isBackendLive } from '../../generation/mockGenerator';

/** Re-check the backend health this often. */
const LIVE_RECHECK_MS = 60_000;

const MOCK_INFO =
  'Live inference runs on an AMD Radeon PRO W7900 (ROCm) via the FastAPI ' +
  'backend — see the demo video. This deployment serves mock data so the ' +
  'showroom is always explorable.';
const LIVE_INFO = 'Connected to live SDXL backend on AMD ROCm.';

/**
 * Backend status badge, fully self-contained: its polling state lives HERE,
 * in the smallest leaf, so the periodic health check can never re-render the
 * header (or anything above it). Pings GET /health on mount and every 60s.
 *
 * An info popover explains the mode: shown on hover, and toggled by click
 * (for touch devices — dismissed by clicking anywhere outside). Absolutely
 * positioned under the badge, so the header layout never moves.
 */
function GpuBadge() {
  const [live, setLive] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      void isBackendLive().then((v) => {
        if (!cancelled) setLive(v);
      });
    };
    check();
    const interval = setInterval(check, LIVE_RECHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Click-outside dismiss while the popover is pinned open.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPinned(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [pinned]);

  const open = pinned || hovered;

  return (
    <div
      className="gpu-badge-wrap"
      ref={wrapRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        className={`gpu-badge${live ? ' gpu-badge--live' : ''}`}
        type="button"
        aria-expanded={open}
        onClick={() => setPinned((p) => !p)}
      >
        <span className="gpu-badge__dot" aria-hidden="true" />
        {live ? 'live · amd gpu (rocm)' : 'mock mode'}
      </button>
      {open && (
        <div className="gpu-pop" role="tooltip">
          {live ? LIVE_INFO : MOCK_INFO}
        </div>
      )}
    </div>
  );
}

/**
 * Slim header: wordmark on the left; live-GPU badge + version readout on the
 * right. Holds no state of its own — it renders exactly once.
 */
export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true" />
        <span className="header__wordmark">framure forge</span>
      </div>
      <div className="header__right">
        <GpuBadge />
        <span className="header__meta">material showroom · v0.1</span>
      </div>
    </header>
  );
}
