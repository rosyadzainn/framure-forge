import { useEffect, useState, type FormEvent } from 'react';
import { useMaterialStore } from '../../state/materialStore';
import { EXPECTED_GENERATION_MS } from '../../generation/mockGenerator';

/**
 * The material-generation prompt box. Submits to the store's `generate`
 * action (behind the single swap point in src/generation/mockGenerator.ts).
 *
 * UX details:
 *  - autofocused on load; Enter submits.
 *  - first-visit hint above the bar — click fills the prompt AND generates;
 *    gone once anything has been generated or applied this session.
 *  - placeholder rotates through example prompts (~4s, subtle fade); paused
 *    while the user has text in the box or a generation is running.
 *  - while generating: staged copy paced against the expected duration
 *    ("composing surface…" → "deriving maps…" → "applying…").
 *  - on failure: quiet inline error, prompt kept for retry.
 */

const HINT_PROMPT = 'weathered copper, oxidized patina';

const EXAMPLES = [
  'brushed titanium, fine grain',
  'honed basalt tile',
  'aged oak parquet',
  'hammered pewter',
  'cracked desert clay',
];

const STAGES = ['composing surface…', 'deriving maps…', 'applying…'];

/** Stage from elapsed fraction of the expected duration. */
function stageFor(fraction: number): string {
  if (fraction < 0.45) return STAGES[0] as string;
  if (fraction < 0.8) return STAGES[1] as string;
  return STAGES[2] as string;
}

export function PromptBar() {
  const [value, setValue] = useState('');
  const [exampleIdx, setExampleIdx] = useState(0);
  const [placeholderFading, setPlaceholderFading] = useState(false);
  const [stage, setStage] = useState<string>(STAGES[0] as string);

  const status = useMaterialStore((s) => s.status);
  const touched = useMaterialStore((s) => s.touched);
  const generate = useMaterialStore((s) => s.generate);
  const generating = status === 'generating';

  const submit = async (prompt: string) => {
    if (generating) return;
    const ok = await generate(prompt);
    // Keep the prompt on failure so the user can retry it unchanged.
    if (ok) setValue('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(value);
  };

  const onHint = () => {
    setValue(HINT_PROMPT);
    void submit(HINT_PROMPT);
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

  // Staged loading copy, paced against the expected generation duration.
  useEffect(() => {
    if (!generating) return;
    setStage(stageFor(0));
    const start = performance.now();
    const interval = setInterval(() => {
      setStage(stageFor((performance.now() - start) / EXPECTED_GENERATION_MS));
    }, 120);
    return () => clearInterval(interval);
  }, [generating]);

  return (
    <div className="promptbar-wrap">
      {!touched && status === 'idle' && (
        <button className="prompt-hint" type="button" onClick={onHint}>
          try: “{HINT_PROMPT}”
        </button>
      )}
      <form className="promptbar" onSubmit={onSubmit}>
        <input
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
              {stage}
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
