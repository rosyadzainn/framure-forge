/**
 * Slim header with the wordmark placeholder. Intentionally minimal.
 */
export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true" />
        <span className="header__wordmark">framure forge</span>
      </div>
      <span className="header__meta">material showroom · v0.1</span>
    </header>
  );
}
