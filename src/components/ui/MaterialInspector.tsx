import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { useMaterialStore } from '../../state/materialStore';
import { displayName } from '../../utils/displayName';
import { useStrings } from '../../i18n/strings';
import type { MaterialMaps } from '../../types/material';

/**
 * Compact inspector for the ACTIVE material: tiny flat thumbnails of its PBR
 * maps in the technical-readout style. Clicking a map opens it in a simple
 * monochrome lightbox; "Download" zips the maps as PNGs (named by prompt
 * slug) — real functionality that stays when the mock generator is swapped.
 */

const MAP_LABELS: [keyof MaterialMaps, string][] = [
  ['albedo', 'albedo'],
  ['normal', 'normal'],
  ['roughness', 'roughness'],
  ['ao', 'ao'],
  ['height', 'height'],
  ['metalness', 'metalness'],
];

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'material'
  );
}

async function downloadZip(maps: MaterialMaps, label: string): Promise<void> {
  const zip = new JSZip();
  for (const [key, name] of MAP_LABELS) {
    const src = maps[key];
    if (!src) continue;
    // fetch handles data URLs, object URLs and http paths alike.
    const blob = await (await fetch(src)).blob();
    zip.file(`${name}.png`, blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `framure-${slugify(label)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MaterialInspector() {
  const maps = useMaterialStore((s) => s.maps);
  const label = useMaterialStore((s) => s.label);
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null);
  const [zipping, setZipping] = useState(false);
  const t = useStrings();

  // Escape closes the lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const present = MAP_LABELS.filter(([key]) => Boolean(maps[key]));
  if (present.length === 0) return null;

  const onDownload = async () => {
    setZipping(true);
    try {
      await downloadZip(maps, label);
    } catch (err) {
      console.warn('[showroom] zip download failed:', err);
    } finally {
      setZipping(false);
    }
  };

  return (
    <>
      <aside className="inspector" aria-label="Active material maps">
        {/* Short humanized name; full prompt on hover. Zip keeps full slug. */}
        <div className="inspector__title" title={label}>
          {displayName(label)}
        </div>
        <div className="inspector__maps">
          {present.map(([key, name]) => (
            <button
              key={key}
              className="inspector__map"
              type="button"
              onClick={() => setLightbox({ src: maps[key] as string, name })}
              aria-label={`View ${name} map`}
            >
              <img className="inspector__img" src={maps[key]} alt="" />
              <span className="inspector__label">{name}</span>
            </button>
          ))}
        </div>
        <button
          className="btn btn--ghost inspector__download"
          type="button"
          onClick={onDownload}
          disabled={zipping}
        >
          {zipping ? t.packing : t.download}
        </button>
      </aside>

      {lightbox && (
        <div
          className="lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label={`${lightbox.name} map (click to close)`}
        >
          <figure className="lightbox__figure">
            <img className="lightbox__img" src={lightbox.src} alt="" />
            <figcaption className="lightbox__caption">{lightbox.name}</figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
