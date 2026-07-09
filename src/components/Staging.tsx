import { useRef, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useInteractionStore } from '../state/interactionStore';

/**
 * The stage: a near-black floor with a soft, blurred, dim reflection — like
 * polished dark stone — plus soft contact shadows.
 *
 * Performance design:
 *  - The reflector re-renders the scene every frame, which is one of the
 *    biggest GPU costs. While the user drags the camera, the reflector mesh
 *    is hidden entirely (skipping that pass) and a PLAIN dark floor with the
 *    same base look shows instead — at drag speeds the dim blurred
 *    reflection is unreadable anyway. On release the reflection fades back
 *    in over ~0.3s by ramping mixStrength.
 *  - ContactShadows renders once (frames={1}): the objects never move, so
 *    re-rendering it per frame (the default) buys nothing.
 */

const FLOOR_COLOR = '#09090a';
const FLOOR_ROUGHNESS = 0.85;
const FLOOR_METALNESS = 0.1;
const FLOOR_ENV = 0.1;
const REFLECTOR_MIX = 0.65;

export function Staging() {
  const reflectorMesh = useRef<THREE.Mesh>(null);
  // drei's MeshReflectorMaterial exposes its uniforms as plain properties.
  const reflectorMat = useRef<ComponentRef<typeof MeshReflectorMaterial>>(null);
  const fade = useRef(1);

  useFrame((_, dt) => {
    const interacting = useInteractionStore.getState().interacting;
    const mesh = reflectorMesh.current;
    const mat = reflectorMat.current;
    if (!mesh || !mat) return;

    if (interacting) {
      // Drop the reflection pass immediately — that's the whole saving.
      fade.current = 0;
      mesh.visible = false;
    } else {
      // Quick ease back in after release.
      fade.current += (1 - fade.current) * Math.min(1, dt * 10);
      mesh.visible = true;
      mat.mixStrength = REFLECTOR_MIX * fade.current;
    }
  });

  return (
    <>
      {/* Plain dark floor, always present just below the reflector: identical
          base look, so hiding the reflector never changes the floor tone. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial
          color={FLOOR_COLOR}
          roughness={FLOOR_ROUGHNESS}
          metalness={FLOOR_METALNESS}
          envMapIntensity={FLOOR_ENV}
        />
      </mesh>

      <mesh
        ref={reflectorMesh}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        receiveShadow
      >
        <planeGeometry args={[70, 70]} />
        <MeshReflectorMaterial
          ref={reflectorMat}
          color={FLOOR_COLOR}
          roughness={FLOOR_ROUGHNESS}
          metalness={FLOOR_METALNESS}
          envMapIntensity={FLOOR_ENV}
          // Small buffer + blur: the reflection is dim and heavily blurred on
          // a near-black floor, so low resolution is visually invisible.
          resolution={256}
          mirror={0.4}
          mixStrength={REFLECTOR_MIX}
          mixBlur={1}
          blur={[180, 60]}
        />
      </mesh>

      {/* Soft contact shadows, rendered ONCE — the display never moves. */}
      <ContactShadows
        position={[0, 0, 0]}
        scale={22}
        far={6}
        blur={2.6}
        opacity={0.5}
        resolution={1024}
        frames={1}
        color="#000000"
      />
    </>
  );
}
