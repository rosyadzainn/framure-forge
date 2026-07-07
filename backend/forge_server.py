# Framure Forge — inference backend
# Runs inside AMD hackathon JupyterLab (ROCm 7.2 + PyTorch 2.9).
# SDXL generates the albedo; normal + roughness are derived on CPU.
#
# Run (in a Jupyter cell):
#   %pip install -q fastapi uvicorn pydantic
#   then in a new cell:
#   from forge_server import run
#   run()
# Expose publicly with cloudflared (see notes at bottom).

import base64
import io
import time

import numpy as np
import torch
from PIL import Image

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------- app setup

app = FastAPI(title="Framure Forge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon demo; tighten later
    allow_methods=["*"],
    allow_headers=["*"],
)

PIPE = None  # loaded lazily on first request or via preload()

PROMPT_TEMPLATE = (
    "seamless tileable texture, {desc}, top-down flat surface, "
    "photorealistic material, uniform lighting, no objects"
)

NEGATIVE_PROMPT = "object, shadow, perspective, border, frame, text, watermark"


def load_pipe():
    global PIPE
    if PIPE is None:
        from diffusers import StableDiffusionXLPipeline

        t0 = time.time()
        PIPE = StableDiffusionXLPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
        ).to("cuda")
        print(f"[forge] model loaded in {time.time() - t0:.1f}s")
    return PIPE


def preload():
    """Call once after starting the server to absorb the JIT/warmup cost
    before the demo, so the first real request is already fast."""
    pipe = load_pipe()
    t0 = time.time()
    pipe(
        PROMPT_TEMPLATE.format(desc="gray concrete"),
        num_inference_steps=4,
        width=512,
        height=512,
    )
    print(f"[forge] warmup done in {time.time() - t0:.1f}s")


# ------------------------------------------------------------- map derivation

def derive_normal(albedo: Image.Image, strength: float = 2.5) -> Image.Image:
    """Sobel-style height-from-luminance normal map. Cheap but reads well."""
    g = np.asarray(albedo.convert("L"), dtype=np.float32) / 255.0
    gy, gx = np.gradient(g)
    nx = -gx * strength
    ny = gy * strength  # +Y up (OpenGL convention, matches three.js default)
    nz = np.ones_like(g)
    length = np.sqrt(nx**2 + ny**2 + nz**2)
    n = np.stack(
        [(nx / length + 1) / 2, (ny / length + 1) / 2, (nz / length + 1) / 2],
        axis=-1,
    )
    return Image.fromarray((n * 255).astype(np.uint8), mode="RGB")


def derive_roughness(albedo: Image.Image) -> Image.Image:
    """Heuristic: local contrast + inverted brightness -> rougher.
    Good enough for a believable PBR read in the showroom."""
    g = np.asarray(albedo.convert("L"), dtype=np.float32) / 255.0
    inv = 1.0 - g
    # normalize to a sane roughness band (0.35..0.95) so nothing looks mirror-like
    r = 0.35 + inv * 0.60
    return Image.fromarray((r * 255).astype(np.uint8), mode="L").convert("RGB")


def to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# -------------------------------------------------------------------- routes

class GenerateRequest(BaseModel):
    prompt: str
    steps: int = 30
    size: int = 1024


@app.get("/health")
def health():
    """Also serves as live proof of AMD compute for judges."""
    props = torch.cuda.get_device_properties(0)
    return {
        "status": "ok",
        "torch": torch.__version__,
        "gpu_arch": props.gcnArchName,       # e.g. gfx1100 -> AMD RDNA3
        "vram_gb": round(props.total_memory / 1e9, 1),
        "backend": "ROCm",
        "model_loaded": PIPE is not None,
    }


@app.post("/generate")
def generate(req: GenerateRequest):
    pipe = load_pipe()
    full_prompt = PROMPT_TEMPLATE.format(desc=req.prompt.strip())

    t0 = time.time()
    albedo = pipe(
        full_prompt,
        negative_prompt=NEGATIVE_PROMPT,
        num_inference_steps=req.steps,
        width=req.size,
        height=req.size,
    ).images[0]
    gen_seconds = time.time() - t0

    normal = derive_normal(albedo)
    roughness = derive_roughness(albedo)

    return {
        "prompt": req.prompt,
        "seconds": round(gen_seconds, 1),
        "maps": {
            "albedo": to_b64(albedo),
            "normal": to_b64(normal),
            "roughness": to_b64(roughness),
        },
    }


# --------------------------------------------------------------------- runner

def run(port: int = 8000):
    """Start the server from inside a Jupyter cell (blocks that cell)."""
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=port)


# cloudflared quick tunnel (run in a JupyterLab Terminal, separate from the
# server cell):
#
#   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
#   chmod +x cloudflared
#   ./cloudflared tunnel --url http://localhost:8000
#
# It prints a https://<random>.trycloudflare.com URL — that is the public
# endpoint the frontend will call.
