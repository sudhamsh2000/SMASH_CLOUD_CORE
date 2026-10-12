# VERONICA API (serving only; training runs natively on the GPU machine).
FROM python:3.12-slim

WORKDIR /srv
# CPU-only PyTorch wheel: ~200 MB instead of ~2 GB of CUDA libraries. A 14M-parameter
# model generates fast enough on CPU. Swap the index URL for a CUDA build on the GPU server.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir "numpy>=2.0" "regex>=2024.0" "fastapi>=0.115" "uvicorn[standard]>=0.30" "pyjwt>=2.9"
COPY veronica ./veronica

ENV VERONICA_RUNS_DIR=/srv/runs VERONICA_DATA_DIR=/srv/data/gutenberg
EXPOSE 8000
CMD ["uvicorn", "veronica.server:app", "--host", "0.0.0.0", "--port", "8000"]
