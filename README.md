# Framure Forge

Text-to-PBR materials, generated on an AMD GPU, previewed live in the browser.

Type a material description — "weathered copper, oxidized patina" — and
Framure Forge turns it into a tileable PBR texture set: SDXL generates the
albedo on an AMD GPU, the normal and roughness maps are derived from it, and
the result is applied live to a set of hero objects in a Three.js showroom.
Every generation lands in a history tray, can be inspected map-by-map, and
downloads as a zip of PNGs ready for a game engine or DCC tool. Built for
indie game developers and 3D artists who want fast material exploration
without leaving the browser.

Submission for the AMD Developer Hackathon ACT II, Track 3 (lablab.ai).

## How it works

```
prompt ("weathered copper, oxidized patina")
  │
  ▼
FastAPI on AMD GPU ──────────────────────────── backend/forge_server.py
  ├─ SDXL fp16 on ROCm renders the tileable albedo            [GPU]
  ├─ normal map derived from albedo luminance gradients       [CPU]
  ├─ roughness derived from inverted brightness               [CPU]
  └─ returns { maps: { albedo, normal, roughness } }  (base64 PNGs)
  │
  ▼
Three.js showroom (this repo) ───────────────── src/
  ├─ maps become object URLs → MeshStandardMaterial
  │  (albedo sRGB; normal/roughness linear; tiling via RepeatWrapping)
  ├─ applied live to four hero meshes with a cross-fade
  ├─ history tray with sphere thumbnails, per-map inspector
  └─ zip download of the PNG maps
```

## AMD compute

The generation backend runs on an **AMD Radeon PRO W7900 (gfx1100, 48 GB)**
via the AMD Developer Cloud JupyterLab, on the **ROCm 7.2 + PyTorch 2.9**
image. SDXL base 1.0 runs in fp16; a measured warm generation of a 1024×1024
texture at 30 steps takes **~10 s** on this GPU (10.1 s in the recorded run).

Proof, reproducible:

- `backend/amd-gpu-spike.ipynb` — the GPU spike notebook with `rocm-smi`
  output, `torch.cuda` device properties (`gfx1100`, 51.5 × 10⁹ bytes VRAM),
  and the timed 30-step 1024 px generation embedded in the cell outputs.
- The live `GET /health` endpoint reports the hardware at runtime:

  ```json
  {"status":"ok","torch":"2.9.1+gitff65f5b","gpu_arch":"gfx1100",
   "vram_gb":51.5,"backend":"ROCm","model_loaded":true}
  ```

The server wraps every prompt in a tileable-texture template ("seamless
tileable texture, …, top-down flat surface") with a negative prompt, so the
raw SDXL output works as a repeating material map.

## Architecture

**Frontend** — Vite + React + TypeScript. React Three Fiber + drei for the
showroom (studio-lit dark gallery, reflective floor, orbit controls with idle
auto-rotate, light post-processing), zustand for state (active material,
generation status, capped history), jszip for the download. Textures are
plain source strings (data URLs or object URLs), so mock and GPU outputs are
interchangeable everywhere.

**Backend** — a single FastAPI file (`backend/forge_server.py`) with two
routes: `POST /generate` (SDXL albedo + CPU-derived normal/roughness, base64
PNGs) and `GET /health` (live hardware report). Exposed from JupyterLab
through a cloudflared quick tunnel.

**Mock fallback** — the app is fully usable with no backend at all.
`src/generation/mockGenerator.ts` exports the one function the UI calls,
`generateMaterial(prompt)`. If `VITE_FORGE_API_URL` is set it POSTs to the
backend (120 s timeout for cold starts) and converts the base64 maps to
object URLs; if it is unset, or the request fails, it falls back to a
deterministic procedural generator seeded by the prompt hash — same shape,
same downstream behavior, with the reason logged as a console warning.

## Run it

### Frontend only (no GPU needed)

```
npm install
npm run dev
```

Open http://localhost:5173 — generation uses the built-in mock.

### Full stack (AMD GPU backend)

1. Bring the backend live by following `backend/GPU-SESSION.md` (start the
   FastAPI server in the AMD JupyterLab, open the cloudflared tunnel, run the
   warmup request). First request of a fresh session takes minutes (model
   download + JIT); warm requests take roughly 15–60 s through the tunnel.
2. Point the frontend at the tunnel:

   ```
   cp .env.example .env
   # set VITE_FORGE_API_URL=https://<your-tunnel>.trycloudflare.com
   npm run dev
   ```

3. Sanity check: open `<tunnel-url>/health` — expect `"gpu_arch":"gfx1100"`.

## Run with Docker

Both halves are containerized. The backend container requires an **AMD
ROCm-capable host** with the kernel driver exposed to the container
(`/dev/kfd` and `/dev/dri` device passthrough) — it will not run on
NVIDIA/CPU-only hosts.

**Backend** (SDXL on ROCm; image pinned to ROCm 7.2 + PyTorch 2.9.1):

```
docker build -t framure-forge-backend ./backend
docker run --rm -p 8000:8000 \
  --device=/dev/kfd --device=/dev/dri \
  --group-add video --security-opt seccomp=unconfined \
  -v framure-hf-cache:/root/.cache/huggingface \
  framure-forge-backend
```

The SDXL weights (~7 GB) download on first request; the named volume keeps
them across restarts. Check `http://localhost:8000/health` for the live
hardware report.

**Frontend** (static build served by nginx; `VITE_FORGE_API_URL` is baked in
at build time — omit the build-arg for mock mode):

```
docker build -t framure-forge-web \
  --build-arg VITE_FORGE_API_URL=http://localhost:8000 .
docker run --rm -p 5173:80 framure-forge-web
```

Then open http://localhost:5173. The non-Docker instructions above remain
the everyday alternative.

## Project structure

```
src/
  components/                  R3F scene (Scene, Lighting, Staging,
                               HeroObjects, Controls) + UI chrome (ui/)
  generation/mockGenerator.ts  generateMaterial(): backend client with
                               mock fallback — the single swap point
  hooks/useShowroomMaterial.ts per-hero materials: color spaces, tiling,
                               cross-fade, hover highlight
  state/materialStore.ts       zustand store: active maps, status, history
  utils/                       procedural mock maps, sphere-thumbnail renderer
backend/
  forge_server.py              FastAPI + SDXL on ROCm; /generate, /health
  Dockerfile                   ROCm PyTorch image + server (port 8000)
  GPU-SESSION.md               session runbook (install, tunnel, warmup)
  amd-gpu-spike.ipynb          GPU proof notebook (rocm-smi + timed run)
Dockerfile                     frontend: Vite build → nginx static image
.env.example                   VITE_FORGE_API_URL template
```

## Team

Built solo by **Rosyad Zainurrahman** (Framure) for the AMD Developer
Hackathon ACT II.
