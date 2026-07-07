# framure forge — 3D material showroom

An interactive, in-browser 3D material studio: describe a material, watch it
applied to a dark-gallery display, browse your generation history, inspect the
PBR maps, download them as a zip. The full product flow is wired against a
**mock generator** — there is no real AI backend yet, by design; every UI
state is real so the mock can be swapped for the real backend in one place.

Runs entirely in the browser on your local machine. No GPU required.

---

## Stack

- **Vite + React + TypeScript**
- **three** `0.180`, **@react-three/fiber** `9`, **@react-three/drei** `10`
  (versions verified mutually compatible; all code is written against the
  three `0.180` API)
- **@react-three/postprocessing** `3` — subtle vignette + fine film grain only
- **@fontsource/inter** — Inter, self-hosted (no runtime font CDN)
- **zustand** `5` for state
- A single global CSS file (`src/styles/global.css`) using CSS custom
  properties for design tokens — no CSS framework.

## Run it

```bash
npm install     # already done if you're reading this in the scaffold
npm run dev
```

Then open the URL Vite prints, which is:

**http://localhost:5173/**

Other commands:

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
```

---

## What's in the scene

The concept: **a dark gallery where the material is the only color.**

- Full-viewport R3F `<Canvas>`: antialias on, DPR capped to `[1, 2]`,
  ACESFilmic tone mapping, sRGB output, soft shadows.
- Explore camera: `PerspectiveCamera` + drei `OrbitControls` with damping —
  smooth orbit / zoom / pan, sensible min/max distance, and a slow **auto-rotate
  that runs when idle and stops the instant you interact** (resuming after a
  short pause). On load, the camera **glides in over ~2s** before handing over.
- Gallery staging: a soft main **spotlight** from above-front (soft shadows),
  dim fill, faint cool rim, plus a drei `<Environment>` (`studio` preset,
  reflections only). Near-black **reflective floor** (`MeshReflectorMaterial`,
  blurred + dim), scene fog dissolving the horizon, `<ContactShadows>`, and
  light post-processing (vignette + fine grain).
- Hero display: a high-subdivision **sphere**, a **torus knot**, a **cylinder**,
  and a flat **panel** on slim near-black pedestals. Every hero mesh shares one
  material from the store, so a single material applies to all of them at once.
  Material changes **cross-fade** (~0.55s dip-and-return); hovering an object
  lifts just that object (~150ms ease: brightness + reflection sheen + a small
  emissive floor). Each hero has its own material instance (textures shared) —
  required because three.js skips uniform refresh for consecutive draws that
  share one material, which silently kills per-object effects.
- Monochrome UI chrome (Inter, self-hosted): slim header/wordmark, a
  (non-functional) prompt bar, a materials tray of **sphere thumbnails**
  (`src/utils/thumbnailRenderer.ts` renders material balls offscreen — the
  first slot previews the active material), and a dev panel.

---

## ⭐ Where the real backend plugs in

**`src/generation/mockGenerator.ts`** — ONE function,
`generateMaterial(prompt): Promise<MaterialMaps>`, is the app's only source of
generated materials. Today it fakes ~2.5s latency, fails 5% of the time (to
exercise the error path), and derives a deterministic procedural material from
the prompt hash. Swap its body for the real AI call (return map URLs / object
URLs in the same shape, throw on failure) and the entire flow — prompt bar,
generating state, spotlight cue, cross-fade, tray history, thumbnails,
inspector, zip download — works unchanged.

### The material state itself

**`src/state/materialStore.ts`** — the zustand store is the single source of
truth for the applied material, generation status, and the tray history
(capped at 6, newest first). `generate(prompt)` orchestrates the pipeline;
`setMaterial(maps)` still allows direct injection (the dev demo uses it).

It holds a set of optional PBR map **sources** (albedo, normal, roughness, ao,
height, metalness), each a plain `string` — a `/public` path, a URL, or a
`blob:`/object URL. Because the source is just a string, a hand-authored file
and an AI-generated blob are interchangeable.

To apply a material from anywhere (this is exactly what the AI layer will do):

```ts
import { useMaterialStore } from './state/materialStore';

useMaterialStore.getState().setMaterial(
  {
    albedo:    generatedAlbedoObjectURL,   // decoded as sRGB
    normal:    generatedNormalObjectURL,   // linear
    roughness: generatedRoughnessObjectURL // linear
    // ao, height, metalness optional
  },
  { label: 'Prompt: “weathered copper”', tiling: 2 }
);
```

The whole showroom updates — no scene or mesh code changes.

### Supporting plug-point files

- **`src/hooks/useShowroomMaterial.ts`** — builds the single shared
  `MeshStandardMaterial` from the store. Handles color space correctly (albedo =
  sRGB; normal/roughness/ao/height/metalness = linear), sets `RepeatWrapping` +
  the `tiling` repeat factor, maxes anisotropy, and disposes old textures.
- **`src/types/material.ts`** — the `MaterialMaps` / `MaterialState` shape.

### Prove the apply-path today (before any AI exists)

Bottom-left **dev panel** → **"Load demo material"** applies a material to all
hero objects; **"Reset"** returns to the neutral default.

It prefers real files in `public/textures/demo/` (`albedo.jpg`, `normal.jpg`,
`roughness.jpg`). If those are absent, it **generates procedural `<canvas>`
placeholder textures at runtime** (tiling checker albedo, flat-ish normal, grey
roughness) so the button visibly changes the material with zero manual assets.

---

## File structure

```
public/favicon.svg             # monochrome mark
public/textures/demo/          # (unused; see its README)
src/
  components/
    Scene.tsx                  # <Canvas> + camera + tone mapping + post FX
    Lighting.tsx               # gallery spot (+ generating pulse) + Environment
    Staging.tsx                # reflective floor + <ContactShadows>
    HeroObjects.tsx            # the 4 hero meshes + per-object hover
    Controls.tsx               # intro glide + OrbitControls + idle auto-rotate
    ui/
      Header.tsx               # wordmark
      PromptBar.tsx            # functional prompt → generate (mock)
      MaterialsTray.tsx        # clickable generation history (sphere thumbs)
      MaterialInspector.tsx    # active maps strip + lightbox + zip download
      DevPanel.tsx             # dev-only demo/reset (receded, top-left)
  generation/
    mockGenerator.ts           # 🔌 THE BACKEND SWAP POINT
  hooks/
    useShowroomMaterial.ts     # per-hero materials + fade + hover driver
  state/
    materialStore.ts           # material state + history + generate action
  types/
    material.ts                # material + history + status types
  utils/
    proceduralMaterial.ts      # prompt-hash → tileable PBR maps
    proceduralTextures.ts      # runtime canvas demo textures (dev button)
    thumbnailRenderer.ts       # shared offscreen material-ball previews
  styles/
    global.css                 # monochrome design tokens + layout
  App.tsx                      # canvas + UI overlay composition
  main.tsx                     # React entry
```

## Next step (later, not now)

Replace the body of `generateMaterial()` in `src/generation/mockGenerator.ts`
with the real AI texture backend call. Nothing else should need to change.
