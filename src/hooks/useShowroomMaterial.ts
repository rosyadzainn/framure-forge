import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMaterialStore } from '../state/materialStore';
import type { MaterialMaps } from '../types/material';

/**
 * Builds the hero materials from the material store, so calling
 * `setMaterial(...)` anywhere updates the whole showroom at once.
 *
 * Each hero mesh gets its OWN MeshStandardMaterial instance. They are kept
 * visually identical (same textures, same scalars, same shader program), but
 * separate instances are required for the per-object hover highlight:
 * three.js skips re-uploading material uniforms for consecutive draw calls
 * that share one material, so per-object uniform tweaks on a shared material
 * are silently dropped. Texture objects ARE shared across the instances, so
 * GPU cost is unchanged.
 *
 * Responsibilities that matter for materials looking correct:
 *  - albedo is decoded as sRGB; every data map (normal/roughness/ao/height/
 *    metalness) is kept linear (NoColorSpace).
 *  - all maps use RepeatWrapping with a shared tiling factor.
 *  - anisotropy is maxed for crisp grazing-angle detail.
 *  - previous textures are disposed when the material changes (no GPU leak).
 *  - material changes CROSS-FADE via a short brightness dip-and-return
 *    (~0.55s). The dip multiplies base color and env intensity only — PBR
 *    maps are untouched, so nothing breaks.
 *  - HOVER: per-object highlight (~150ms ease) = brightness lift + env sheen
 *    boost + a small emissive floor, so it reads on flat neutral AND on busy
 *    dark/bright textures alike. Write targets via `hoverTargets`.
 */

// slot: [store key, material property, isColorMap]
type Slot = [keyof MaterialMaps, keyof THREE.MeshStandardMaterial, boolean];

const SLOTS: Slot[] = [
  ['albedo', 'map', true],
  ['normal', 'normalMap', false],
  ['roughness', 'roughnessMap', false],
  ['ao', 'aoMap', false],
  ['height', 'displacementMap', false],
  ['metalness', 'metalnessMap', false],
];

const NEUTRAL_COLOR = '#8a8a8a';
const FADE_SECONDS = 0.55;
/** How deep the brightness dips at the midpoint of a transition (0..1). */
const FADE_DEPTH = 0.88;
const BASE_ENV_INTENSITY = 1.0;

/** Hover: ~30% brightness lift + 50% reflection sheen + small emissive floor. */
const HOVER_COLOR_LIFT = 0.3;
const HOVER_ENV_LIFT = 0.5;
const HOVER_EMISSIVE = 0.06;
/** Exponential ease time constant; reaches ~95% in 3τ ≈ 150ms. */
const HOVER_TAU = 0.05;

export interface ShowroomMaterials {
  /** One material per hero mesh, index-aligned with `hoverTargets`. */
  materials: THREE.MeshStandardMaterial[];
  /** Per-object hover target (0 or 1); set from pointer handlers. */
  hoverTargets: RefObject<number[]>;
}

export function useShowroomMaterials(count: number): ShowroomMaterials {
  const gl = useThree((s) => s.gl);
  const maps = useMaterialStore((s) => s.maps);
  const tiling = useMaterialStore((s) => s.tiling);

  // Stable material instances for the lifetime of the component.
  const materials = useMemo(
    () =>
      Array.from(
        { length: count },
        () =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(NEUTRAL_COLOR),
            metalness: 0.0,
            roughness: 0.55,
            envMapIntensity: BASE_ENV_INTENSITY,
          })
      ),
    [count]
  );

  // Textures we currently own, so we can dispose them on the next change.
  const ownedTextures = useRef<THREE.Texture[]>([]);
  // The fade/hover driver multiplies this base tint; loads write here,
  // never to material.color directly.
  const baseColor = useRef(new THREE.Color(NEUTRAL_COLOR));
  // Cross-fade timeline. null = idle; -1 = requested (armed by the effect).
  const fadeStart = useRef<number | null>(null);
  const firstRun = useRef(true);
  // Per-object hover state (target set by pointer events, level eased here).
  const hoverTargets = useRef<number[]>(Array.from({ length: count }, () => 0));
  const hoverLevels = useRef<number[]>(Array.from({ length: count }, () => 0));

  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    const loader = new THREE.TextureLoader();
    let cancelled = false;

    // Every change after mount plays the dip-and-return transition.
    if (firstRun.current) {
      firstRun.current = false;
    } else {
      fadeStart.current = -1;
    }

    // Reset all materials fully to neutral. Each slot re-enables itself ONLY
    // when its texture actually finishes loading (below) — never eagerly from
    // the source string. A failed/missing load therefore degrades to the
    // neutral look instead of e.g. a blank white object.
    for (const material of materials) {
      for (const [, prop] of SLOTS) {
        // @ts-expect-error — writing a texture slot to null is valid at runtime.
        material[prop] = null;
      }
      material.roughness = 0.55;
      material.metalness = 0.0;
      material.displacementScale = 0;
      material.displacementBias = 0;
      material.needsUpdate = true;
    }
    baseColor.current.set(NEUTRAL_COLOR);

    const configure = (tex: THREE.Texture, isColor: boolean) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(tiling, tiling);
      tex.anisotropy = maxAniso;
      tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.needsUpdate = true;
    };

    const pending: Promise<void>[] = [];
    for (const [key, prop, isColor] of SLOTS) {
      const src = maps[key];
      if (!src) continue;
      pending.push(
        loader
          .loadAsync(src)
          .then((tex) => {
            if (cancelled) {
              tex.dispose();
              return;
            }
            configure(tex, isColor);
            ownedTextures.current.push(tex);
            // The SAME texture object is shared by every hero material.
            for (const material of materials) {
              // @ts-expect-error — assigning a Texture to a known map slot.
              material[prop] = tex;
              // Per-slot scalars flip only now that the map is really loaded,
              // so the texture (not the scalar) drives the channel.
              if (key === 'roughness') material.roughness = 1.0;
              else if (key === 'metalness') material.metalness = 1.0;
              else if (key === 'height') {
                material.displacementScale = 0.04;
                material.displacementBias = -0.02;
              }
              // Adding/removing a map changes the shader — force a recompile.
              material.needsUpdate = true;
            }
            if (key === 'albedo') baseColor.current.set('#ffffff');
          })
          .catch((err) => {
            console.warn(`[showroom] failed to load ${key} map:`, err);
          })
      );
    }

    // Dispose the textures owned before this run once the new set is applied.
    const previouslyOwned = ownedTextures.current;
    ownedTextures.current = [];
    Promise.allSettled(pending).then(() => {
      for (const tex of previouslyOwned) tex.dispose();
    });

    return () => {
      cancelled = true;
    };
  }, [gl, materials, maps, tiling]);

  // Single writer for color / env / emissive on every hero material:
  // cross-fade brightness (shared) × hover lift (per object), each frame.
  useFrame(({ clock }, dt) => {
    let brightness = 1;
    if (fadeStart.current !== null) {
      if (fadeStart.current < 0) fadeStart.current = clock.elapsedTime;
      const t = (clock.elapsedTime - fadeStart.current) / FADE_SECONDS;
      if (t >= 1) {
        fadeStart.current = null;
      } else {
        const dip = Math.sin(Math.PI * t) ** 2;
        brightness = 1 - FADE_DEPTH * dip;
      }
    }

    const ease = 1 - Math.exp(-dt / HOVER_TAU);
    materials.forEach((material, i) => {
      const target = hoverTargets.current[i] ?? 0;
      const level = (hoverLevels.current[i] ?? 0) + ((target - (hoverLevels.current[i] ?? 0)) * ease);
      hoverLevels.current[i] = level;

      material.color
        .copy(baseColor.current)
        .multiplyScalar(brightness * (1 + HOVER_COLOR_LIFT * level));
      material.envMapIntensity =
        BASE_ENV_INTENSITY * brightness * (1 + HOVER_ENV_LIFT * level);
      material.emissive.setScalar(HOVER_EMISSIVE * level);
    });
  });

  // Final teardown: dispose the materials and any textures still owned.
  useEffect(() => {
    return () => {
      for (const tex of ownedTextures.current) tex.dispose();
      for (const material of materials) material.dispose();
    };
  }, [materials]);

  return { materials, hoverTargets };
}
