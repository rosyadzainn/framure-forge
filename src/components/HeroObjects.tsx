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

/**
 * Pointer-path cost control: R3F raycasts every mesh that carries pointer
 * handlers on each pointer move, and three.js tests raycasts per-triangle.
 * The render geometry is heavily subdivided (~65k triangles across the four
 * heroes), which puts real milliseconds on the main thread during camera
 * drags. Each hero therefore raycasts against an invisible LOW-POLY stand-in
 * of the same shape (~1.6k triangles total, ~40× cheaper). Purely a hit-test
 * change: rendering, hover behavior, and the scene graph are untouched.
 */
const RAYCAST_PROXIES = {
  sphere: new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12)),
  knot: new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.19, 48, 8)),
  cylinder: new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 16, 1)),
  panel: new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.9, 0.14)),
} as const;

type ProxyShape = keyof typeof RAYCAST_PROXIES;

function proxyRaycast(shape: ProxyShape): THREE.Mesh['raycast'] {
  const proxy = RAYCAST_PROXIES[shape];
  return function (this: THREE.Mesh, raycaster, intersects) {
    proxy.matrixWorld = this.matrixWorld;
    const before = intersects.length;
    proxy.raycast(raycaster, intersects);
    // Report hits as coming from the real mesh, not the stand-in.
    for (let i = before; i < intersects.length; i++) {
      const hit = intersects[i];
      if (hit) hit.object = this;
    }
  };
}

interface HeroProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.MeshStandardMaterial;
  proxy: ProxyShape;
  onHover: (hovering: boolean) => void;
  children: ReactNode;
}

function Hero({ position, rotation, material, proxy, onHover, children }: HeroProps) {
  const raycast = useMemo(() => proxyRaycast(proxy), [proxy]);
  return (
    <mesh
      position={position}
      rotation={rotation ?? [0, 0, 0]}
      material={material}
      castShadow
      raycast={raycast}
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
        proxy="sphere"
        onHover={hover(0)}
      >
        {/* 64×48 (~6k tris, was 128×128/~32k): silhouette chord error at demo
            distance is sub-pixel; normal-map detail is per-fragment anyway. */}
        <sphereGeometry args={[0.85, 64, 48]} />
      </Hero>

      {/* — Torus knot — the rounded / organic form. */}
      <Pedestal position={[-0.9, 0, -0.2]} material={pedestalMaterial} />
      <Hero
        position={[-0.9, PEDESTAL_HEIGHT + 0.8, -0.2]}
        rotation={[0.3, 0, 0]}
        material={materials[1]}
        proxy="knot"
        onHover={hover(1)}
      >
        {/* 160×24 (~7.7k tris, was 256×32/~16k): the knot path stays fluid;
            the tube cross-section keeps 24 segments so its edge reads round. */}
        <torusKnotGeometry args={[0.5, 0.19, 160, 24]} />
      </Hero>

      {/* — Cylinder — a clean primitive. */}
      <Pedestal position={[1.2, 0, 0.3]} material={pedestalMaterial} />
      <Hero
        position={[1.2, PEDESTAL_HEIGHT + 0.75, 0.3]}
        material={materials[2]}
        proxy="cylinder"
        onHover={hover(2)}
      >
        {/* 64×1 (~0.4k tris, was 128×48/~12k): height segments add nothing —
            lighting is per-fragment and no displacement map is used. */}
        <cylinderGeometry args={[0.55, 0.55, 1.5, 64, 1]} />
      </Hero>

      {/* — Flat panel — a slab to read tiling/flat detail cleanly. */}
      <Pedestal position={[3.2, 0, -0.1]} material={pedestalMaterial} />
      <RoundedBox
        position={[3.2, PEDESTAL_HEIGHT + 1.0, -0.1]}
        rotation={[0, -0.35, 0]}
        args={[1.4, 1.9, 0.14]}
        radius={0.06}
        smoothness={4}
        material={materials[3]}
        castShadow
        raycast={proxyRaycast('panel')}
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
