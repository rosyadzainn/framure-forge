import { useMaterialStore } from '../../state/materialStore';

/**
 * Materials tray: the generation HISTORY as circular material-ball slots
 * (newest first, capped in the store). Clicking a filled slot re-applies that
 * material (the heroes cross-fade); the active slot gets a ring highlight;
 * hovering shows the prompt as a tooltip. Only filled slots render; with no
 * history yet, a quiet label holds the space so nothing jumps when the first
 * material arrives.
 */
export function MaterialsTray() {
  const history = useMaterialStore((s) => s.history);
  const activeId = useMaterialStore((s) => s.activeId);
  const applyEntry = useMaterialStore((s) => s.applyEntry);

  return (
    <div className="tray">
      <div className="tray__label">materials</div>
      <div className="tray__slots">
        {history.length === 0 ? (
          <span className="tray__empty">generated materials appear here</span>
        ) : (
          history.map((entry) => {
            const active = entry.id === activeId;
            return (
              <button
                key={entry.id}
                className={`swatch swatch--filled${active ? ' swatch--active' : ''}`}
                type="button"
                onClick={() => applyEntry(entry.id)}
                data-tip={entry.prompt}
                aria-label={`Apply material: ${entry.prompt}`}
                aria-pressed={active}
              >
                <img className="swatch__img" src={entry.thumb} alt="" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
