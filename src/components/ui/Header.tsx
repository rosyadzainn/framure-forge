import { useEffect, useState } from 'react';
import { isBackendLive } from '../../generation/mockGenerator';

/** Re-check the backend health this often. */
const LIVE_RECHECK_MS = 60_000;

/**
 * Slim header: wordmark on the left; on the right, a live-GPU status badge
 * (pings GET /health on mount and every 60s) next to the version readout.
 */
export function Header() {
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
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true" />
        <span className="header__wordmark">framure forge</span>
      </div>
      <div className="header__right">
        <span
          className={`gpu-badge${live ? ' gpu-badge--live' : ''}`}
          role="status"
        >
          <span className="gpu-badge__dot" aria-hidden="true" />
          {live ? 'live · amd gpu (rocm)' : 'mock mode'}
        </span>
        <span className="header__meta">material showroom · v0.1</span>
      </div>
    </header>
  );
}
