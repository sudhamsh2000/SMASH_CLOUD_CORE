"""VERONICA API: training status for the dashboard, and text generation.

    uvicorn veronica.server:app --port 8001         (or via docker compose)

Training runs natively (it needs the GPU; Docker on macOS can't reach Apple's GPU).
This server only *reads* the runs/ directory that training writes, so the two never
need to talk to each other directly: files are the interface.

Endpoints (all under /api/veronica, all require the SMASH login token except health):
    GET  /health
    GET  /runs                    every run with its status
    GET  /runs/{run}              config, status, full metric history, latest samples
    GET  /summary                 the newest run, shaped for the dashboard panel
    POST /generate                stream a continuation of a prompt (Server-Sent Events)
"""

from __future__ import annotations

import json
import os
import threading
from datetime import UTC, datetime
from pathlib import Path

import jwt
import torch
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from .model import ModelConfig, Veronica
from .tokenizer import Tokenizer

RUNS_DIR = Path(os.environ.get("VERONICA_RUNS_DIR", "runs"))
DATA_DIR = Path(os.environ.get("VERONICA_DATA_DIR", "data/gutenberg"))
JWT_SECRET = os.environ.get("SMASH_JWT_SECRET", "")

app = FastAPI(title="VERONICA", version="0.1.0", docs_url="/api/veronica/docs",
              openapi_url="/api/veronica/openapi.json")
API = "/api/veronica"
bearer = HTTPBearer(auto_error=False)


def require_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    """Same check as FRIDAY: verify the JWT that smash-api issued at login."""
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        return jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


# ── Reading run directories ───────────────────────────────────────────────
def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _read_jsonl(path: Path) -> list[dict]:
    try:
        lines = path.read_text().splitlines()
    except FileNotFoundError:
        return []
    out = []
    for line in lines:
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            pass  # the trainer may be mid-write on the last line
    return out


def _run_dirs() -> list[Path]:
    if not RUNS_DIR.exists():
        return []
    dirs = [d for d in RUNS_DIR.iterdir() if (d / "status.json").exists()]
    return sorted(dirs, key=lambda d: (d / "status.json").stat().st_mtime, reverse=True)


def _run_dir(name: str) -> Path:
    d = RUNS_DIR / name
    if "/" in name or name.startswith(".") or not (d / "status.json").exists():
        raise HTTPException(404, f"No run named {name!r}")
    return d


def _status(d: Path) -> dict:
    s = _read_json(d / "status.json") or {}
    # A trainer killed hard (power loss, kill -9) never writes "stopped". If a run says
    # "running" but hasn't updated in 15 minutes, report it as stalled rather than lying.
    if s.get("state") == "running" and s.get("updated_at"):
        age = (datetime.now(UTC) - datetime.fromisoformat(s["updated_at"])).total_seconds()
        if age > 900:
            s["state"] = "stalled"
    return s


@app.get(f"{API}/health")
def health() -> dict:
    return {"service": "veronica", "status": "ok", "runs": len(_run_dirs())}


@app.get(f"{API}/runs")
def list_runs(_: str = Depends(require_user)) -> list[dict]:
    return [_status(d) for d in _run_dirs()]


@app.get(f"{API}/runs/{{run}}")
def get_run(run: str, _: str = Depends(require_user)) -> dict:
    d = _run_dir(run)
    return {"status": _status(d), "config": _read_json(d / "config.json"),
            "metrics": _read_jsonl(d / "metrics.jsonl"), "samples": _read_jsonl(d / "samples.jsonl")[-5:]}


@app.get(f"{API}/summary")
def summary(_: str = Depends(require_user)) -> dict:
    """The newest run in one compact object: what the dashboard's VERONICA panel shows."""
    dirs = _run_dirs()
    if not dirs:
        return {"run": None}
    d = dirs[0]
    s, cfg, metrics = _status(d), _read_json(d / "config.json") or {}, _read_jsonl(d / "metrics.jsonl")
    samples = _read_jsonl(d / "samples.jsonl")
    last, prev = (metrics[-1] if metrics else {}), (metrics[-2] if len(metrics) > 1 else {})
    model = cfg.get("model", {})
    return {
        "run": s.get("run"), "state": s.get("state"), "device": s.get("device"), "params": s.get("params"),
        "architecture": f"{model.get('n_layer')} layers · d_model {model.get('d_model')} · "
                        f"{model.get('n_head')} heads · context {model.get('context_len')}" if model else None,
        "step": s.get("step"), "total_steps": s.get("total_steps"),
        "checkpoint": s.get("checkpoint"), "checkpoint_saved_at": s.get("updated_at"),
        "val_loss": last.get("val_loss"), "val_loss_delta": round(last["val_loss"] - prev["val_loss"], 4) if prev else None,
        "best_val_loss": s.get("best_val_loss"), "tokens_per_sec": last.get("tokens_per_sec"),
        "tokens_seen": last.get("tokens_seen"), "dataset": cfg.get("dataset"),
        "eval_every": cfg.get("train", {}).get("eval_every"),
        "series": {"step": [m["step"] for m in metrics], "train": [m["train_loss"] for m in metrics],
                   "val": [m["val_loss"] for m in metrics]},
        "latest_sample": samples[-1] if samples else None,
    }


# ── Generation ────────────────────────────────────────────────────────────
class Loaded:
    """Keeps one model in memory and reloads it when a newer best checkpoint appears."""

    def __init__(self):
        self.lock = threading.Lock()
        self.key: tuple | None = None
        self.model: Veronica | None = None
        self.tok: Tokenizer | None = None

    def get(self, run: str | None) -> tuple[Veronica, Tokenizer, str]:
        d = _run_dir(run) if run else next((d for d in _run_dirs() if (d / "ckpt_best.pt").exists()), None)
        if d is None or not (d / "ckpt_best.pt").exists():
            raise HTTPException(409, "No trained checkpoint yet. Run: python -m veronica.train --run v0.1")
        ckpt_path = d / "ckpt_best.pt"
        key = (str(ckpt_path), ckpt_path.stat().st_mtime)
        with self.lock:
            if key != self.key:
                ckpt = torch.load(ckpt_path, map_location="cpu")
                model = Veronica(ModelConfig(**ckpt["model_config"]))
                model.load_state_dict(ckpt["model"])
                self.model, self.tok, self.key = model.eval(), Tokenizer.load(DATA_DIR / "tokenizer.json"), key
            return self.model, self.tok, d.name


loaded = Loaded()


class GenerateIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    max_tokens: int = Field(200, ge=1, le=1000)
    temperature: float = Field(0.8, ge=0.0, le=2.0)
    top_k: int | None = Field(50, ge=1, le=8192)
    run: str | None = None


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post(f"{API}/generate")
def generate(body: GenerateIn, _: str = Depends(require_user)):
    """Streams `meta`, then one `delta` per decoded chunk, then `done`.

    Tokens are not always whole characters (an emoji can be 2-3 tokens), so text is
    decoded from the full sequence each step and only the newly completed part is sent.
    """
    model, tok, run_name = loaded.get(body.run)

    def events():
        prompt_ids = tok.encode(body.prompt)[-model.cfg.context_len:]
        yield _sse("meta", {"run": run_name, "prompt_tokens": len(prompt_ids)})
        ids = torch.tensor([prompt_ids])
        new: list[int] = []
        sent = ""
        for t in model.generate(ids, body.max_tokens, body.temperature, body.top_k, stop_id=tok.eot_id):
            new.append(t)
            text = tok.decode(new)
            if not text.endswith("�"):  # wait until a multi-byte character is complete
                yield _sse("delta", {"text": text[len(sent):]})
                sent = text
        yield _sse("done", {"tokens": len(new)})

    # A plain (sync) generator runs in FastAPI's threadpool, so a long generation
    # doesn't block other requests.
    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
