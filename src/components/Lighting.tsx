import { Suspense, useEffect, useRef } from 'react';
import { Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { SpotLight } from 'three';
import { useMaterialStore } from '../state/materialStore';

const SPOT_INTENSITY = 110;
/** Reveal pulse: up ~20% and back over ~1s when a generation lands. */
const PULSE_SECONDS = 1.0;
const PULSE_LIFT = 0.2;

/**
 * Gallery lighting: one soft main spotlight from above-front onto the display
 * (gentle falloff, soft shadows), a dim fill so shadow sides don't go dead,
 * and a faint cool rim from behind for edge separation. The Environment stays
 * for PBR reflections only — dialled down so it reads in the materials, not
 * as a visible backdrop.
 */
export function Lighting() {
  const spotRef = useRef<SpotLight>(null);
  const status = useMaterialStore((s) => s.status);
  const prevStatus = useRef(status);
  // Reveal-pulse timeline: null = idle; -1 = armed (started on next frame).
  const pulseStart = useRef<number | null>(null);

  // The pulse fires exactly on the generating → idle transition (success),
  // i.e. AFTER the breathe ends and as the new material applies — sequenced,
  // never layered on top of the breathe.
  useEffect(() => {
    if (prevStatus.current === 'generating' && status === 'idle') {
      pulseStart.current = -1;
    }
    prevStatus.current = status;
  }, [status]);

  // Spot intensity driver: generating = dim + gentle breathe; a fresh result
  // = one ~1s welcome pulse up ~20% and back; otherwise ease to base.
  useFrame(({ clock }, dt) => {
    const spot = spotRef.current;
    if (!spot) return;
    let target = SPOT_INTENSITY;
    if (status === 'generating') {
      pulseStart.current = null; // a new run cancels any pending pulse
      target = SPOT_INTENSITY * (0.68 + 0.1 * Math.sin(clock.elapsedTime * 2.6));
    } else if (pulseStart.current !== null) {
      if (pulseStart.current < 0) pulseStart.current = clock.elapsedTime;
      const t = (clock.elapsedTime - pulseStart.current) / PULSE_SECONDS;
      if (t >= 1) {
        pulseStart.current = null;
      } else {
        target = SPOT_INTENSITY * (1 + PULSE_LIFT * Math.sin(Math.PI * t));
      }
    }
    spot.intensity += (target - spot.intensity) * Math.min(1, dt * 6);
  });

  return (
    <>
      {/* Whisper of ambient so nothing clips to pure black. */}
      <ambientLight intensity={0.12} />

      {/* MAIN — gallery spot from above-front. The only shadow-caster. */}
      <spotLight
        ref={spotRef}
        position={[2.5, 9, 6]}
        angle={0.48}
        penumbra={0.9}
        intensity={SPOT_INTENSITY}
        decay={2}
        distance={40}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-radius={6}
      />

      {/* FILL — dim, front-left, lifts the shadow side just enough. */}
      <directionalLight position={[-6, 3, 4]} intensity={0.28} color="#c9ccd1" />

      {/* RIM — faint, cool, from behind for silhouette separation. */}
      <directionalLight position={[-2, 4.5, -7]} intensity={0.85} color="#b7c4d6" />

      {/*
        Image-based lighting for PBR reflections ONLY (never the backdrop);
        intensity kept low so it doesn't wash out the gallery staging.
        The preset HDR loads over the network, so it gets its OWN Suspense:
        the rest of the scene must never block on (or be hidden by) that fetch.
      */}
      <Suspense fallback={null}>
        <Environment preset="studio" background={false} environmentIntensity={0.45} />
      </Suspense>
    </>
  );
}
