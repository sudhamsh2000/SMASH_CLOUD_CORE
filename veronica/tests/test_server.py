import json
from datetime import UTC, datetime

import jwt
import pytest
import torch
from fastapi.testclient import TestClient

from veronica import server
from veronica.model import ModelConfig, Veronica
from veronica.tokenizer import Tokenizer

SECRET = "test-secret"


@pytest.fixture
def client(tmp_path, monkeypatch):
    data, runs = tmp_path / "data", tmp_path / "runs" / "t1"
    data.mkdir()
    runs.mkdir(parents=True)
    tok = Tokenizer.train("hello world, hello there. " * 20, vocab_size=270)
    tok.save(data / "tokenizer.json")
    cfg = ModelConfig(vocab_size=tok.vocab_size, context_len=16, d_model=32, n_layer=1, n_head=2)
    torch.save({"model": Veronica(cfg).state_dict(), "model_config": cfg.to_dict()}, runs / "ckpt_best.pt")
    now = datetime.now(UTC).isoformat()
    (runs / "status.json").write_text(json.dumps({"run": "t1", "state": "running", "step": 20, "total_steps": 40,
                                                  "updated_at": now, "checkpoint": "step-20"}))
    (runs / "config.json").write_text(json.dumps({"model": cfg.to_dict(), "train": {"eval_every": 10}}))
    (runs / "metrics.jsonl").write_text("\n".join(json.dumps({"step": s, "train_loss": l, "val_loss": l + 0.1})
                                                  for s, l in [(10, 5.0), (20, 4.0)]) + "\n")
    monkeypatch.setattr(server, "RUNS_DIR", tmp_path / "runs")
    monkeypatch.setattr(server, "DATA_DIR", data)
    monkeypatch.setattr(server, "JWT_SECRET", SECRET)
    c = TestClient(server.app)
    c.headers["Authorization"] = "Bearer " + jwt.encode({"sub": "owner"}, SECRET, algorithm="HS256")
    return c


def test_requires_token(client):
    del client.headers["Authorization"]
    assert client.get("/api/veronica/summary").status_code == 401
    assert client.get("/api/veronica/health").status_code == 200  # health stays public


def test_summary_shape(client):
    s = client.get("/api/veronica/summary").json()
    assert s["run"] == "t1" and s["step"] == 20 and s["val_loss"] == 4.1
    assert s["val_loss_delta"] == -1.0
    assert s["series"]["train"] == [5.0, 4.0]


def test_unknown_run_404(client):
    assert client.get("/api/veronica/runs/nope").status_code == 404
    assert client.get("/api/veronica/runs/..").status_code == 404


def test_generate_streams(client):
    r = client.post("/api/veronica/generate", json={"prompt": "hello", "max_tokens": 5})
    events = [line.split(": ", 1)[1] for line in r.text.splitlines() if line.startswith("event:")]
    assert events[0] == "meta" and events[-1] == "done"
