import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useInteractionStore } from '../state/interactionStore';

/**
 * Orbit / zoom / pan with damping, plus:
 *  - INTRO: on load the camera starts further out/higher and glides to the
 *    default framing over ~2s (ease-out cubic). Controls and auto-rotate are
 *    disabled during the glide and handed over cleanly when it lands.
 *  - a subtle auto-rotate that runs only when idle and stops the instant the
 *    user interacts, resuming after a short delay.
 */

const IDLE_RESUME_MS = 3000;
const AUTO_ROTATE_SPEED = 0.35; // slow + tasteful

const TARGET = new THREE.Vector3(0, 1.1, 0);
/** Where the camera starts (exported so Scene mounts it there — no flash). */
export const INTRO_FROM = new THREE.Vector3(9.5, 6.8, 14);
/** The default framing the intro lands on. */
const INTRO_TO = new THREE.Vector3(5.5, 3.4, 8.5);
const INTRO_SECONDS = 2;

export function Controls() {
  const ref = useRef<OrbitControlsImpl>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introStart = useRef<number | null>(null);
  const introDone = useRef(false);

  // Intro glide. Runs before the controls are enabled, so it never fights
  // OrbitControls; on landing it enables them and starts auto-rotate.
  useFrame(({ camera, clock }) => {
    if (introDone.current) return;
    const controls = ref.current;
    if (!controls) return;

    if (introStart.current === null) {
      introStart.current = clock.elapsedTime;
      controls.enabled = false;
      controls.autoRotate = false;
    }

    const t = Math.min(1, (clock.elapsedTime - introStart.current) / INTRO_SECONDS);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    camera.position.lerpVectors(INTRO_FROM, INTRO_TO, eased);
    camera.lookAt(TARGET);

    if (t >= 1) {
      introDone.current = true;
      controls.enabled = true;
      controls.autoRotate = true;
      controls.update(); // sync the controls' internal state to the camera
    }
  });

  // Idle auto-rotate management (unchanged behavior).
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;

    const setInteracting = useInteractionStore.getState().setInteracting;

    const stop = () => {
      controls.autoRotate = false;
      setInteracting(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };

    const scheduleResume = () => {
      setInteracting(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        controls.autoRotate = true;
      }, IDLE_RESUME_MS);
    };

    controls.addEventListener('start', stop);
    controls.addEventListener('end', scheduleResume);

    return () => {
      controls.removeEventListener('start', stop);
      controls.removeEventListener('end', scheduleResume);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      // autoRotate is switched on by the intro handoff, not at mount.
      autoRotate={false}
      autoRotateSpeed={AUTO_ROTATE_SPEED}
      target={[TARGET.x, TARGET.y, TARGET.z]}
      minDistance={4}
      maxDistance={16}
      // Keep the camera above the floor so we never orbit underneath the stage.
      maxPolarAngle={Math.PI / 2.05}
      enableRotate
      enableZoom
      enablePan
    />
  );
}
