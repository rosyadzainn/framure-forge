import { useMaterialStore } from '../../state/materialStore';

/**
 * Materials tray: the generation HISTORY as circular material-ball slots
 * (newest first, capped in the store). Clicking a filled slot re-applies that
 * material (the heroes cross-fade); the active slot gets a ring highlight;
 * hovering shows the prompt as a tooltip. Empty slots are placeholders.
 */

const SWATCH_COUNT = 6;

export function MaterialsTray() {
  const history = useMaterialStore((s) => s.history);
  const activeId = useMaterialStore((s) => s.activeId);
  const applyEntry = useMaterialStore((s) => s.applyEntry);

  return (
    <div className="tray">
      <div className="tray__label">materials</div>
      <div className="tray__slots">
        {Array.from({ length: SWATCH_COUNT }).map((_, i) => {
          const entry = history[i];
          if (!entry) {
            return (
              <span
                key={`empty-${i}`}
                className="swatch"
                aria-label={`Material slot ${i + 1} (empty)`}
              />
            );
          }
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
        })}
      </div>
    </div>
  );
}
