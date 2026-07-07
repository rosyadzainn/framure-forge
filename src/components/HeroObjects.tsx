import { useMemo, type ReactNode } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useShowroomMaterials } from '../hooks/useShowroomMaterial';

/**
 * The showroom display: 4 hero meshes arranged as a small, centered stand.
 * Every hero mesh reads its material from the central store (via
 * useShowroomMaterials), so one generated material applies to all of them at
 * once. Nothing here hardcodes a surface.
 *
 * Each mesh has its own material INSTANCE (visually identical, textures
 * shared) so the hover highlight can lift just the hovered object — see the
 * note in useShowroomMaterial.ts. Hover state itself is eased and applied
 * centrally there; this file only reports pointer over/out per index.
 *
 * Geometry is heavily subdivided so normal/height detail reads on curves.
 */

const PEDESTAL_HEIGHT = 0.25;
const HERO_COUNT = 4;

interface HeroProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.MeshStandardMaterial;
  onHover: (hovering: boolean) => void;
  children: ReactNode;
}

function Hero({ position, rotation, material, onHover, children }: HeroProps) {
  return (
    <mesh
      position={position}
      rotation={rotation ?? [0, 0, 0]}
      material={material}
      castShadow
      onPointerOver={() => onHover(true)}
      onPointerOut={() => onHover(false)}
    >
      {children}
    </mesh>
  );
}

export function HeroObjects() {
  // The store-driven hero materials — this is what the AI plug point drives.
  const { materials, hoverTargets } = useShowroomMaterials(HERO_COUNT);

  const hover = (index: number) => (hovering: boolean) => {
    hoverTargets.current[index] = hovering ? 1 : 0;
  };

  // Fixed materials for the pedestals — near-black, faintly satin, so the
  // hero surfaces stay the only statement.
  const pedestalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a0a0b',
        roughness: 0.8,
        metalness: 0.08,
        envMapIntensity: 0.5,
      }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* — Sphere — high subdivision so normal maps show real detail. */}
      <Pedestal position={[-3, 0, 0.4]} material={pedestalMaterial} />
      <Hero
        position={[-3, PEDESTAL_HEIGHT + 0.85, 0.4]}
        material={materials[0]}
        onHover={hover(0)}
      >
        <sphereGeometry args={[0.85, 128, 128]} />
      </Hero>

      {/* — Torus knot — the rounded / organic form. */}
      <Pedestal position={[-0.9, 0, -0.2]} material={pedestalMaterial} />
      <Hero
        position={[-0.9, PEDESTAL_HEIGHT + 0.8, -0.2]}
        rotation={[0.3, 0, 0]}
        material={materials[1]}
        onHover={hover(1)}
      >
        <torusKnotGeometry args={[0.5, 0.19, 256, 32]} />
      </Hero>

      {/* — Cylinder — a clean primitive. */}
      <Pedestal position={[1.2, 0, 0.3]} material={pedestalMaterial} />
      <Hero
        position={[1.2, PEDESTAL_HEIGHT + 0.75, 0.3]}
        material={materials[2]}
        onHover={hover(2)}
      >
        <cylinderGeometry args={[0.55, 0.55, 1.5, 128, 48]} />
      </Hero>

      {/* — Flat panel — a slab to read tiling/flat detail cleanly. */}
      <Pedestal position={[3.2, 0, -0.1]} material={pedestalMaterial} />
      <RoundedBox
        position={[3.2, PEDESTAL_HEIGHT + 1.0, -0.1]}
        rotation={[0, -0.35, 0]}
        args={[1.4, 1.9, 0.14]}
        radius={0.06}
        smoothness={6}
        steps={12}
        material={materials[3]}
        castShadow
        onPointerOver={() => hover(3)(true)}
        onPointerOut={() => hover(3)(false)}
      />
    </group>
  );
}

interface PedestalProps {
  position: [number, number, number];
  material: THREE.Material;
}

/** Slim near-black pedestal: a thin column with a subtle wider top cap that
 *  reads as a bevel. Two low-poly cylinders — deliberately cheap. */
function Pedestal({ position, material }: PedestalProps) {
  const capHeight = 0.035;
  const columnHeight = PEDESTAL_HEIGHT - capHeight;
  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh position={[0, columnHeight / 2, 0]} material={material} castShadow>
        <cylinderGeometry args={[0.68, 0.72, columnHeight, 64]} />
      </mesh>
      {/* Top cap, a touch wider — a cheap bevel read. */}
      <mesh
        position={[0, columnHeight + capHeight / 2, 0]}
        material={material}
        castShadow
      >
        <cylinderGeometry args={[0.74, 0.74, capHeight, 64]} />
      </mesh>
    </group>
  );
}
