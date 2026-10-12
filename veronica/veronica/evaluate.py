"""Evaluate a trained VERONICA checkpoint on the *entire* held-out validation set.

    python -m veronica.evaluate --run v0.1            # writes runs/v0.1/eval.json

Training reports validation loss from 40 random batches: quick but noisy. This walks
every validation token once, deterministically, and reports:

  loss            mean cross-entropy per token (nats). Lower is better; uniform = ln(V).
  perplexity      e^loss: "as uncertain as choosing among this many tokens".
  bits_per_char   loss converted to bits, divided by characters instead of tokens.
                  Per-token loss can't be compared across tokenizers (a model with bigger
                  tokens predicts fewer, harder tokens). Bits per character can: it's the
                  compression rate the model achieves on the text. Plain gzip gets about
                  2.5-3 bits/char on English; strong LLMs get under 1.

It also generates from fixed prompts at several temperatures, so runs can be compared by eye.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import torch

from .model import ModelConfig, Veronica
from .tokenizer import Tokenizer
from .train import pick_device

PROMPTS = [
    "It was a dark and stormy night, and",
    "“I cannot believe it,” said Elizabeth, “that",
    "The ship sailed",
    "Chapter I\n\n",
]


@torch.no_grad()
def full_loss(model: Veronica, tokens: np.ndarray, device: str, batch: int = 16) -> float:
    """Average next-token loss over all tokens, using non-overlapping context-length windows."""
    T = model.cfg.context_len
    n_windows = (len(tokens) - 1) // T
    total, count = 0.0, 0
    for start in range(0, n_windows, batch):
        idx = range(start, min(start + batch, n_windows))
        chunk = np.stack([tokens[i * T : i * T + T + 1] for i in idx]).astype(np.int64)
        xy = torch.from_numpy(chunk).to(device)
        _, loss = model(xy[:, :-1], xy[:, 1:])
        total += loss.item() * len(idx) * T
        count += len(idx) * T
    return total / count


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run", required=True)
    ap.add_argument("--runs-dir", default="runs")
    ap.add_argument("--data-dir", default="data/gutenberg")
    ap.add_argument("--device", default=None, help="default: best available (cuda > mps > cpu)")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    run_dir, data_dir = Path(args.runs_dir) / args.run, Path(args.data_dir)
    device = args.device or pick_device()
    ckpt = torch.load(run_dir / "ckpt_best.pt", map_location=device)
    model = Veronica(ModelConfig(**ckpt["model_config"])).to(device).eval()
    model.load_state_dict(ckpt["model"])
    tok = Tokenizer.load(data_dir / "tokenizer.json")
    meta = json.loads((data_dir / "manifest.json").read_text())

    t0 = time.time()
    val = np.memmap(data_dir / "val.bin", dtype=np.uint16, mode="r")
    loss = full_loss(model, val, device)
    # characters per token measured on the validation text itself
    chars = len(tok.decode(val.tolist()))
    bpc = loss / math.log(2) * len(val) / chars

    torch.manual_seed(args.seed)
    samples = []
    for prompt in PROMPTS:
        for temp in (0.0, 0.8, 1.2):
            ids = torch.tensor([tok.encode(prompt)], device=device)
            out = tok.decode(list(model.generate(ids, 60, temperature=temp, top_k=50, stop_id=tok.eot_id)))
            samples.append({"prompt": prompt, "temperature": temp, "text": out})

    result = {
        "run": args.run, "checkpoint_step": ckpt["step"], "params": model.num_params(),
        "val_tokens": int(len(val)), "loss": round(loss, 4), "perplexity": round(math.exp(loss), 2),
        "bits_per_char": round(bpc, 4), "uniform_loss": round(math.log(meta["vocab_size"]), 4),
        "eval_seconds": round(time.time() - t0, 1), "samples": samples,
    }
    (run_dir / "eval.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"{args.run} @ step {ckpt['step']}: loss {loss:.4f} | perplexity {math.exp(loss):.1f} | "
          f"{bpc:.3f} bits/char  (over {len(val):,} validation tokens)")
    for s in samples:
        print(f"\n[T={s['temperature']}] {s['prompt']!r} →\n  {s['text'][:200]!r}")


if __name__ == "__main__":
    main()
