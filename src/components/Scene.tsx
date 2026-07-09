import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useInteractionStore } from '../state/interactionStore';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Lighting } from './Lighting';
import { Staging } from './Staging';
import { HeroObjects } from './HeroObjects';
import { Controls, INTRO_FROM } from './Controls';

/**
 * Full-viewport R3F canvas for the showroom — staged as a dark gallery.
 *  - antialias on, devicePixelRatio capped to [1, 2]
 *  - ACESFilmic tone mapping + sRGB output (correct color management)
 *  - soft shadows from the gallery spotlight
 *  - fog dissolves the floor's horizon line into the dark backdrop
 *  - light post-processing: subtle vignette + fine film grain only
 */
/** Flags the store on the scene's first rendered frame — the DOM loading
 *  screen fades out on this signal, not on a timeout. */
function SceneReadySignal() {
  const signalled = useRef(false);
  useFrame(() => {
    if (signalled.current) return;
    signalled.current = true;
    useInteractionStore.getState().setSceneReady();
  });
  return null;
}

/**
 * The objects and the shadow-casting spotlight never move, so the shadow map
 * is re-rendered exactly once instead of every frame (three's default).
 * Pixel-identical output; removes a whole depth pass per frame.
 */
function FrozenShadowMaps() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);
  return null;
}

export function Scene() {
  // frameloop stays "always" (default): idle auto-rotate and OrbitControls
  // damping both need continuous frames, so "demand" would break them.
  return (
    <Canvas
      // Cap at 1.25x: on 2x laptop screens this renders ~61% fewer pixels —
      // the single biggest GPU saving. Slight softness is the accepted trade.
      dpr={[1, 1.25]}
      shadows="soft"
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      {/* Matches the CSS backdrop so distant geometry melts into the page. */}
      <fog attach="fog" args={['#08080a', 14, 38]} />

      {/* Camera starts at the intro position; Controls glides it in. */}
      <PerspectiveCamera
        makeDefault
        fov={42}
        position={INTRO_FROM}
        near={0.1}
        far={100}
      />

      <Suspense fallback={null}>
        <Lighting />
        <HeroObjects />
        <Staging />
      </Suspense>

      <FrozenShadowMaps />
      <SceneReadySignal />

      <Controls />

      {/*
        Post audit: Vignette and Noise are single fullscreen-shader effects,
        merged by postprocessing into ONE pass — per-pixel cost is trivial.
        The composer's real expense was its 4x-multisampled render target;
        MSAA 2 halves those samples and the edge quality difference is barely
        visible at 1.5x DPR. Deliberately nothing else (no bloom, no DOF).
      */}
      <EffectComposer multisampling={2}>
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.28} />
      </EffectComposer>
    </Canvas>
  );
}
