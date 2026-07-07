import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
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
export function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
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

      <Controls />

      {/* Subtle vignette + very fine grain. Deliberately nothing else. */}
      <EffectComposer multisampling={4}>
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.28} />
      </EffectComposer>
    </Canvas>
  );
}
