import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';

/**
 * The stage: a near-black floor with a soft, blurred, dim reflection — like
 * polished dark stone — plus soft contact shadows so the hero objects feel
 * grounded. Reflector resolution is capped for performance; scene fog
 * dissolves the floor's far edge so no horizon line shows.
 */
export function Staging() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <MeshReflectorMaterial
          color="#09090a"
          roughness={0.85}
          metalness={0.1}
          envMapIntensity={0.1}
          resolution={512}
          mirror={0.4}
          mixStrength={0.65}
          mixBlur={1}
          blur={[260, 80]}
        />
      </mesh>

      {/* Soft, blurred contact shadows pooled under the display. */}
      <ContactShadows
        position={[0, 0, 0]}
        scale={22}
        far={6}
        blur={2.6}
        opacity={0.5}
        resolution={1024}
        color="#000000"
      />
    </>
  );
}
