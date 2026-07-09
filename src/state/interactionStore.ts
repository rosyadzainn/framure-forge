import { create } from 'zustand';

/**
 * Tiny scene-interaction state: whether the user is actively manipulating the
 * camera (drag/zoom). Set by Controls; consumed by Staging to pause the
 * floor-reflection render pass while the camera moves — at drag speeds nobody
 * reads reflections, and the pass is one of the most expensive per-frame
 * costs on modest GPUs.
 */
interface InteractionStore {
  interacting: boolean;
  setInteracting: (v: boolean) => void;
  /** True once the R3F scene has rendered its first frame (never unset).
   *  The loading screen waits for this instead of a fixed timeout. */
  sceneReady: boolean;
  setSceneReady: () => void;
}

export const useInteractionStore = create<InteractionStore>((set) => ({
  interacting: false,
  setInteracting: (v) => set({ interacting: v }),
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),
}));
