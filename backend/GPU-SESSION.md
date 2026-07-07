# GPU Session Startup Checklist

Runbook for bringing the Framure Forge backend live on the AMD hackathon
JupyterLab (notebooks.amd.com/hackathon). Total time: ~15–20 min, mostly
waiting. Follow in order.

Facts learned the hard way:
- `/workspace` files SURVIVE session turn-off; `/opt/venv` libraries and the
  HuggingFace model cache DO NOT. Reinstall + re-download every session.
- The Jupyter kernel and the Terminal use DIFFERENT Pythons. Always use the
  explicit path `/opt/venv/bin/python` in terminals.
- The tunnel URL CHANGES every session. Update `.env` on the laptop each time.

---

## 1. Launch

- notebooks.amd.com/hackathon → **Launch Notebook** (image: ROCm 7.2 + PyTorch 2.9)
- Wait for JupyterLab. Check `forge_server.py` is still in the file browser.
  (If missing, upload from `backend/` via the upload arrow.)

## 2. Terminal A — install deps + start server

Open a Terminal (Launcher → Other → Terminal), then:

```
/opt/venv/bin/python -m pip install -q fastapi uvicorn pydantic diffusers transformers accelerate safetensors
/opt/venv/bin/python -m uvicorn forge_server:app --host 0.0.0.0 --port 8000
```

Wait for: `Uvicorn running on http://0.0.0.0:8000`. Leave this terminal alone.

## 3. Terminal B — tunnel

Open a SECOND Terminal:

```
./cloudflared tunnel --url http://localhost:8000
```

(`cloudflared` binary survives in /workspace. If it's ever missing:
`wget --no-check-certificate https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared && chmod +x cloudflared`)

Wait for the boxed URL: `https://<random-words>.trycloudflare.com`
**Copy it — it is different every session.** Leave this terminal alone too.

## 4. Terminal C — warmup (absorbs model download + JIT before demo)

Open a THIRD Terminal:

```
curl -s -X POST http://localhost:8000/generate -H "Content-Type: application/json" -d '{"prompt": "gray concrete", "steps": 30, "size": 1024}' -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n"
```

First run of a fresh session: 5–10 min (7GB model download + aiter JIT).
Expect `HTTP 200`. After this, requests take ~15–60s through the tunnel.

## 5. Laptop — point frontend at the new URL

- Edit `.env` in the repo root: replace the value of `VITE_FORGE_API_URL`
  with the new tunnel URL from step 3.
- Restart the dev server (Ctrl+C, then `npm run dev`) — `.env` is only read
  at startup.
- Sanity check: open `https://<tunnel-url>/health` in a browser → expect
  `"gpu_arch":"gfx1100"` and `"model_loaded":true` (true after step 4).

## 6. When done

- notebooks.amd.com/hackathon → **Turn-off Session** → **Confirm Turn-off**.
  Remaining quota within the 24h window is preserved.

---

## Quick triage

| Symptom | Cause | Fix |
|---|---|---|
| `No module named uvicorn/diffusers` | venv was reset | rerun step 2 install line |
| HTTP 500 instantly (<1s) | missing library on server | check Terminal A traceback |
| curl hangs after inference finishes | CPU map derivation + base64 encode | normal, wait ~1 min |
| Frontend shows mock result fast | fetch failed → fallback | check `.env` URL + tunnel alive; see console `[forge]` warn |
| `Port 5173 is already in use` (laptop) | stale vite process | `Get-NetTCPConnection -LocalPort 5173 \| Select-Object -ExpandProperty OwningProcess \| ForEach-Object { Stop-Process -Id $_ -Force }` |
| wget saves 0-byte file | TLS-intercepting proxy | add `--no-check-certificate` |
