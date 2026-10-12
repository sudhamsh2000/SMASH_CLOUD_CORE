"""Train VERONICA.

    python -m veronica.train --run v0.1 --steps 6000          # fresh run
    python -m veronica.train --run v0.1 --steps 9000 --resume # continue a run

Everything a run produces lives in runs/<name>/:
    config.json     model + training settings
    metrics.jsonl   one JSON line per eval: step, losses, learning rate, throughput
    samples.jsonl   text generated at each eval, to *see* the model improve
    status.json     live state (running / done / failed); the API and dashboard read this
    ckpt_last.pt    latest weights + optimizer (for resuming)
    ckpt_best.pt    weights with the lowest validation loss so far (for serving)
"""

from __future__ import annotations

import argparse
import json
import math
import time
from contextlib import nullcontext
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import torch

from .model import ModelConfig, Veronica
from .tokenizer import Tokenizer


@dataclass
class TrainConfig:
    data_dir: str = "data/gutenberg"
    steps: int = 6000
    batch_size: int = 32  # sequences per step; tokens/step = batch_size * context_len
    lr: float = 1e-3  # peak learning rate
    min_lr: float = 1e-4  # floor of the cosine schedule
    warmup_steps: int = 200
    weight_decay: float = 0.1
    grad_clip: float = 1.0
    eval_every: int = 250
    eval_batches: int = 40
    seed: int = 1337


def pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"  # NVIDIA GPU (the future SMASH server)
    if torch.backends.mps.is_available():
        return "mps"  # Apple Silicon GPU via Metal
    return "cpu"


class Batches:
    """Samples random windows from the token file.

    Each example is context_len + 1 consecutive tokens: x is the first context_len,
    y is the same window shifted one to the right. So y[i] is "the token after x[i]",
    and a single forward pass trains context_len predictions at once.
    """

    def __init__(self, path: Path, context_len: int, batch_size: int, device: str, seed: int):
        self.data = np.memmap(path, dtype=np.uint16, mode="r")
        self.T, self.B, self.device = context_len, batch_size, device
        self.rng = np.random.default_rng(seed)

    def __call__(self) -> tuple[torch.Tensor, torch.Tensor]:
        starts = self.rng.integers(0, len(self.data) - self.T - 1, self.B)
        chunk = np.stack([self.data[s : s + self.T + 1] for s in starts]).astype(np.int64)
        xy = torch.from_numpy(chunk).to(self.device)
        return xy[:, :-1], xy[:, 1:]


def lr_at(step: int, tc: TrainConfig) -> float:
    """Linear warmup, then cosine decay to min_lr.

    Warmup: at step 0 the weights are random and gradients are large and noisy, and
    Adam's running statistics are still empty. Big steps then can wreck the model, so
    the rate ramps up. Cosine decay: late in training smaller steps let the model settle
    into a good minimum instead of bouncing around it.
    """
    if step < tc.warmup_steps:
        return tc.lr * (step + 1) / tc.warmup_steps
    progress = min(1.0, (step - tc.warmup_steps) / max(1, tc.steps - tc.warmup_steps))
    return tc.min_lr + 0.5 * (tc.lr - tc.min_lr) * (1 + math.cos(math.pi * progress))


def make_optimizer(model: Veronica, tc: TrainConfig) -> torch.optim.AdamW:
    """AdamW, with weight decay only on matrices.

    Weight decay pulls weights toward zero each step, a mild pressure toward simpler
    solutions. It makes sense for the big weight matrices but not for norm gains
    (1-D vectors), which should be free to sit wherever they need to.
    betas=(0.9, 0.95): the 0.95 makes Adam adapt faster to changing gradient scale,
    the standard choice for Transformers.
    """
    decay = [p for p in model.parameters() if p.dim() >= 2]
    no_decay = [p for p in model.parameters() if p.dim() < 2]
    groups = [{"params": decay, "weight_decay": tc.weight_decay}, {"params": no_decay, "weight_decay": 0.0}]
    return torch.optim.AdamW(groups, lr=tc.lr, betas=(0.9, 0.95))


class Run:
    """Owns a run directory and writes its files atomically, so readers never see half a file."""

    def __init__(self, root: Path):
        self.root = root
        root.mkdir(parents=True, exist_ok=True)

    def write_json(self, name: str, data: dict) -> None:
        tmp = self.root / f".{name}.tmp"
        tmp.write_text(json.dumps(data, indent=2))
        tmp.replace(self.root / name)

    def append(self, name: str, row: dict) -> None:
        with open(self.root / name, "a") as f:
            f.write(json.dumps(row) + "\n")


@torch.no_grad()
def evaluate(model: Veronica, batches: dict[str, Batches], n: int, autocast) -> dict[str, float]:
    model.eval()
    out = {}
    for split, get in batches.items():
        losses = []
        for _ in range(n):
            x, y = get()
            with autocast:
                _, loss = model(x, y)
            losses.append(loss.item())
        out[split] = sum(losses) / len(losses)
    model.train()
    return out


def sample_text(model: Veronica, tok: Tokenizer, device: str, prompt: str, n: int = 60) -> str:
    ids = torch.tensor([tok.encode(prompt)], device=device)
    new = list(model.generate(ids, n, temperature=0.8, top_k=50, stop_id=tok.eot_id))
    model.train()
    return prompt + tok.decode(new)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run", required=True, help="run name, e.g. v0.1")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--runs-dir", default="runs")
    for f, v in asdict(TrainConfig()).items():
        ap.add_argument(f"--{f.replace('_', '-')}", type=type(v), default=v)
    for f, v in asdict(ModelConfig()).items():
        if f != "vocab_size":
            ap.add_argument(f"--{f.replace('_', '-')}", type=type(v), default=v)
    args = ap.parse_args()

    run = Run(Path(args.runs_dir) / args.run)
    device = pick_device()
    tc = TrainConfig(**{f: getattr(args, f) for f in asdict(TrainConfig())})
    torch.manual_seed(tc.seed)

    data_dir = Path(tc.data_dir)
    meta = json.loads((data_dir / "manifest.json").read_text())
    tok = Tokenizer.load(data_dir / "tokenizer.json")

    start_step, best_val = 0, float("inf")
    if args.resume:
        ckpt = torch.load(run.root / "ckpt_last.pt", map_location=device)
        mc = ModelConfig(**ckpt["model_config"])
        model = Veronica(mc).to(device)
        model.load_state_dict(ckpt["model"])
        opt = make_optimizer(model, tc)
        opt.load_state_dict(ckpt["optimizer"])
        start_step, best_val = ckpt["step"], ckpt["best_val"]
    else:
        mc = ModelConfig(vocab_size=meta["vocab_size"],
                         **{f: getattr(args, f) for f in asdict(ModelConfig()) if f != "vocab_size"})
        model = Veronica(mc).to(device)
        opt = make_optimizer(model, tc)
        for f in ("metrics.jsonl", "samples.jsonl"):
            (run.root / f).unlink(missing_ok=True)

    # bfloat16 autocast runs matmuls in 16-bit (faster, half the memory traffic) while
    # keeping the weights and the loss in 32-bit. bfloat16 has float32's exponent range,
    # so unlike float16 it needs no loss scaling. CUDA only: measured on an M2, bf16
    # autocast was ~25% *slower* than float32 because the GPU has no native bf16 units.
    autocast = torch.autocast(device, dtype=torch.bfloat16) if device == "cuda" else nullcontext()

    batches = {s: Batches(data_dir / f"{s}.bin", mc.context_len, tc.batch_size, device, tc.seed + i)
               for i, s in enumerate(("train", "val"))}
    params = model.num_params()
    tokens_per_step = tc.batch_size * mc.context_len
    run.write_json("config.json", {"model": mc.to_dict(), "train": asdict(tc), "device": device, "params": params,
                                   "dataset": {"name": data_dir.name, "train_tokens": meta["train_tokens"],
                                               "val_tokens": meta["val_tokens"], "books": len(meta["books"])}})

    status = {"run": args.run, "state": "running", "device": device, "params": params, "step": start_step,
              "total_steps": tc.steps, "best_val_loss": None if best_val == float("inf") else best_val,
              "started_at": datetime.now(UTC).isoformat(), "updated_at": None, "checkpoint": None}

    def save_status(**changes) -> None:
        status.update(changes, updated_at=datetime.now(UTC).isoformat())
        run.write_json("status.json", status)

    save_status()
    print(f"VERONICA run '{args.run}': {params / 1e6:.2f}M params on {device}, "
          f"{tokens_per_step:,} tokens/step, steps {start_step}->{tc.steps}")
    print(f"  one epoch = {meta['train_tokens'] / tokens_per_step:,.0f} steps; "
          f"untrained loss would be ln({mc.vocab_size}) = {math.log(mc.vocab_size):.2f}")

    model.train()
    t_last, train_loss_acc, n_acc = time.time(), 0.0, 0
    try:
        for step in range(start_step, tc.steps):
            lr = lr_at(step, tc)
            for g in opt.param_groups:
                g["lr"] = lr

            x, y = batches["train"]()
            with autocast:
                _, loss = model(x, y)
            opt.zero_grad(set_to_none=True)
            loss.backward()  # backpropagation: d(loss)/d(weight) for all 13M weights
            # Gradient clipping: if a rare bad batch produces a huge gradient, scale it
            # down so one step can't throw the weights far off course.
            grad_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), tc.grad_clip)
            opt.step()
            train_loss_acc += loss.item()
            n_acc += 1

            done = step + 1
            if done % tc.eval_every == 0 or done == tc.steps:
                elapsed = time.time() - t_last
                losses = evaluate(model, batches, tc.eval_batches, autocast)
                row = {"step": done, "train_loss": round(losses["train"], 4), "val_loss": round(losses["val"], 4),
                       "running_train_loss": round(train_loss_acc / n_acc, 4), "lr": lr,
                       "grad_norm": round(float(grad_norm), 3),
                       "tokens_per_sec": int(n_acc * tokens_per_step / elapsed),
                       "tokens_seen": done * tokens_per_step, "time": datetime.now(UTC).isoformat()}
                run.append("metrics.jsonl", row)

                ckpt = {"model": model.state_dict(), "optimizer": opt.state_dict(), "model_config": mc.to_dict(),
                        "step": done, "best_val": min(best_val, losses["val"]), "tokenizer": str(data_dir / "tokenizer.json")}
                torch.save(ckpt, run.root / "ckpt_last.pt")
                improved = losses["val"] < best_val
                if improved:
                    best_val = losses["val"]
                    ckpt.pop("optimizer")  # serving only needs weights; keeps the file small
                    torch.save(ckpt, run.root / "ckpt_best.pt")

                text = sample_text(model, tok, device, "It was a dark and stormy night, and")
                run.append("samples.jsonl", {"step": done, "text": text})
                save_status(step=done, best_val_loss=round(best_val, 4),
                            checkpoint=f"step-{done}" if improved else status["checkpoint"])
                print(f"step {done:>6} | train {losses['train']:.3f} | val {losses['val']:.3f}"
                      f"{' *' if improved else '  '} | lr {lr:.2e} | {row['tokens_per_sec']:,} tok/s")
                print(f"         {text[:150]!r}")
                t_last, train_loss_acc, n_acc = time.time(), 0.0, 0
    except KeyboardInterrupt:
        save_status(state="stopped")
        print("stopped; resume with --resume")
        return
    except Exception as e:
        save_status(state="failed", error=f"{type(e).__name__}: {e}")
        raise
    save_status(state="done", finished_at=datetime.now(UTC).isoformat())


if __name__ == "__main__":
    main()
