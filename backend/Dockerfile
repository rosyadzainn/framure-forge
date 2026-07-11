# Framure Forge — inference backend (SDXL on AMD ROCm)
#
# Pinned to the image matching the verified hackathon environment
# (ROCm 7.2 + PyTorch 2.9.1). `rocm/pytorch:latest` also works but moves.
FROM rocm/pytorch:rocm7.2_ubuntu24.04_py3.12_pytorch_release_2.9.1

WORKDIR /app

RUN pip install --no-cache-dir \
    diffusers transformers accelerate safetensors fastapi uvicorn pillow

COPY forge_server.py .

EXPOSE 8000

# The SDXL weights (~7 GB) download from Hugging Face on first request.
# Mount a volume at /root/.cache/huggingface to persist them across runs.
CMD ["python", "-m", "uvicorn", "forge_server:app", "--host", "0.0.0.0", "--port", "8000"]
