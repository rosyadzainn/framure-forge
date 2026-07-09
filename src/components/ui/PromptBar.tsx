import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMaterialStore } from '../../state/materialStore';

/**
 * The material-generation prompt box. Submits to the store's `generate`
 * action (behind the single swap point in src/generation/mockGenerator.ts).
 *
 * UX details:
 *  - autofocused on load; Enter submits.
 *  - example chips above the bar fill the input and focus it (no submit);
 *    kept invisible (but space-preserving) while a generation runs.
 *  - placeholder rotates through example prompts (~4s, subtle fade); paused
 *    while the user has text in the box or a generation is running.
 *  - while generating: honest, time-based progress. Real GPU runs take
 *    15–60s, so the staged copy is driven by actual elapsed seconds and the
 *    final stage holds with a ticking counter until the promise resolves.
 *    In mock mode (no VITE_FORGE_API_URL) the copy says so.
 *  - on failure: quiet inline error, prompt kept for retry.
 */

const CHIPS = [
  'weathered copper, oxidized patina',
  'rusty steel plate',
  'mossy stone bricks',
  'aged oak parquet',
];

const EXAMPLES = [
  'brushed titanium, fine grain',
  'honed basalt tile',
  'aged oak parquet',
  'hammered pewter',
  'cracked desert clay',
];

/** Whether a real backend is configured (mode, not liveness). */
const BACKEND_CONFIGURED = (() => {
  const raw: unknown = import.meta.env.VITE_FORGE_API_URL;
  return typeof raw === 'string' && raw.trim() !== '';
})();

/** Staged, honest generating copy driven by real elapsed seconds. */
function generatingCopy(elapsedSec: number): string {
  if (!BACKEND_CONFIGURED) return `rendering (mock) · ${elapsedSec}s`;
  if (elapsedSec < 4) return `composing surface… · ${elapsedSec}s`;
  if (elapsedSec < 10) return `deriving maps… · ${elapsedSec}s`;
  // Final stage holds and ticks until the promise resolves.
  return `rendering on AMD GPU · ${elapsedSec}s`;
}

/**
 * The ticking elapsed label, isolated in the smallest possible leaf: it is
 * mounted only while generating, and its 4×/s state updates re-render ONLY
 * this text fragment — never the prompt bar, and nothing on the path to the
 * 3D canvas.
 */
function GeneratingLabel() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((performance.now() - start) / 1000));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return <>{generatingCopy(elapsed)}</>;
}

export function PromptBar() {
  const [value, setValue] = useState('');
  const [exampleIdx, setExampleIdx] = useState(0);
  const [placeholderFading, setPlaceholderFading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = useMaterialStore((s) => s.status);
  const generate = useMaterialStore((s) => s.generate);
  const generating = status === 'generating';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (generating) return;
    const ok = await generate(value);
    // Keep the prompt on failure so the user can retry it unchanged.
    if (ok) setValue('');
  };

  const onChip = (chip: string) => {
    setValue(chip);
    inputRef.current?.focus();
  };

  // Rotate the placeholder example (~4s with a short fade); paused while the
  // user has typed something or a generation is running.
  useEffect(() => {
    if (value !== '' || generating) return;
    const interval = setInterval(() => {
      setPlaceholderFading(true);
      setTimeout(() => {
        setExampleIdx((i) => (i + 1) % EXAMPLES.length);
        setPlaceholderFading(false);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [value, generating]);

  return (
    <div className="promptbar-wrap">
      <div className={`chips${generating ? ' chips--hidden' : ''}`} aria-hidden={generating}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            className="chip"
            type="button"
            tabIndex={generating ? -1 : 0}
            onClick={() => onChip(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
      <form className="promptbar" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className={`promptbar__input${placeholderFading ? ' promptbar__input--fading' : ''}`}
          type="text"
          placeholder={`Describe a material…  e.g. “${EXAMPLES[exampleIdx]}”`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={generating}
          autoFocus
          aria-label="Material prompt"
        />
        <button
          className="promptbar__submit"
          type="submit"
          disabled={generating || value.trim() === ''}
        >
          {generating ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <GeneratingLabel />
            </>
          ) : (
            'Generate'
          )}
        </button>
      </form>
      {status === 'error' && (
        <div className="promptbar__error" role="alert">
          Generation failed — try again
        </div>
      )}
    </div>
  );
}
