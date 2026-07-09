import { useEffect, useState } from 'react';
import { isBackendLive } from '../../generation/mockGenerator';

/** Re-check the backend health this often. */
const LIVE_RECHECK_MS = 60_000;

/**
 * Backend status badge, fully self-contained: its polling state lives HERE,
 * in the smallest leaf, so the periodic health check can never re-render the
 * header (or anything above it). Pings GET /health on mount and every 60s.
 */
function GpuBadge() {
  const [live, setLive] = useState(false);

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

  return (
    <span className={`gpu-badge${live ? ' gpu-badge--live' : ''}`} role="status">
      <span className="gpu-badge__dot" aria-hidden="true" />
      {live ? 'live · amd gpu (rocm)' : 'mock mode'}
    </span>
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
