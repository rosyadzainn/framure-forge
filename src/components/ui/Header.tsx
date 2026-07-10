import { useEffect, useRef, useState } from 'react';
import { isBackendLive } from '../../generation/mockGenerator';
import { useLanguageStore, type Lang } from '../../state/languageStore';
import { useStrings } from '../../i18n/strings';

/** Re-check the backend health this often. */
const LIVE_RECHECK_MS = 60_000;

/** EN | ID language switcher, persisted via the language store. */
function LangToggle() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);

  const btn = (code: Lang) => (
    <button
      className={`lang-toggle__btn${lang === code ? ' lang-toggle__btn--active' : ''}`}
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
    >
      {code}
    </button>
  );

  return (
    <span className="lang-toggle" role="group" aria-label="Language">
      {btn('en')}
      <span className="lang-toggle__sep" aria-hidden="true">
        |
      </span>
      {btn('id')}
    </span>
  );
}

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
  const t = useStrings();

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
        {live ? t.badgeLive : t.badgeMock}
      </button>
      {open && (
        <div className="gpu-pop" role="tooltip">
          {live ? t.badgeLiveInfo : t.badgeMockInfo}
        </div>
      )}
    </div>
  );
}

/**
 * Slim header: wordmark on the left; language toggle, live-GPU badge and
 * version readout on the right.
 */
export function Header() {
  const t = useStrings();
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true" />
        <span className="header__wordmark">framure forge</span>
      </div>
      <div className="header__right">
        <LangToggle />
        <GpuBadge />
        <span className="header__meta">{t.headerMeta}</span>
      </div>
    </header>
  );
}
