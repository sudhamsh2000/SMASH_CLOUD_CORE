"""VERONICA: a decoder-only Transformer language model, written from scratch.

The job of a language model: given tokens t_1..t_n, output a probability for every
possible next token t_{n+1}. Generation is just doing that in a loop.

Data flow for a batch of shape (B, T) token ids:

    ids (B,T) ──embed──▶ x (B,T,C) ──[Block × n_layer]──▶ RMSNorm ──▶ logits (B,T,V)

    Block:  x = x + Attention(RMSNorm(x))      "look at earlier tokens, gather information"
            x = x + MLP(RMSNorm(x))            "think about what was gathered"

B = batch size, T = sequence length, C = model width (d_model), V = vocab size.

Components are the modern choices used by Llama-style models rather than the original
2017 / GPT-2 ones; each class says what it replaced and why.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class ModelConfig:
    vocab_size: int = 8192
    context_len: int = 256  # max tokens the model can see at once
    d_model: int = 384  # width of every token vector
    n_layer: int = 6  # number of Transformer blocks
    n_head: int = 6  # attention heads per block (d_model must divide evenly)
    dropout: float = 0.1  # randomly zero activations during training to reduce overfitting

    def to_dict(self) -> dict:
        return asdict(self)


class RMSNorm(nn.Module):
    """Rescales each vector to unit root-mean-square, then by a learned per-channel gain.

    Keeps activations at a stable scale as they pass through many layers. LayerNorm
    (the original choice) also subtracts the mean; RMSNorm skips that, is cheaper, and
    works just as well in practice.
    """

    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps) * self.weight


def rope_tables(head_dim: int, context_len: int, base: float = 10000.0) -> tuple[torch.Tensor, torch.Tensor]:
    """Precompute cos/sin tables for Rotary Position Embeddings (RoPE).

    Attention by itself has no idea of word order: it compares vectors as a bag. RoPE
    fixes this by *rotating* pairs of channels in the query and key vectors by an angle
    proportional to the token's position. When a query at position m is compared with a
    key at position n, the rotations combine so the score depends on (m - n), the
    *relative* distance. Each channel pair rotates at a different frequency, from fast
    (fine-grained nearby order) to slow (long-range position).
    """
    freqs = 1.0 / base ** (torch.arange(0, head_dim, 2).float() / head_dim)  # (head_dim/2,)
    angles = torch.outer(torch.arange(context_len).float(), freqs)  # (T, head_dim/2)
    return angles.cos(), angles.sin()


def apply_rope(x: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor) -> torch.Tensor:
    """Rotate channel pairs (x1, x2) of x (B, H, T, D) by the position angles."""
    x1, x2 = x[..., 0::2], x[..., 1::2]
    T = x.shape[-2]
    cos, sin = cos[:T], sin[:T]
    rotated = torch.stack((x1 * cos - x2 * sin, x1 * sin + x2 * cos), dim=-1)
    return rotated.flatten(-2)


class CausalSelfAttention(nn.Module):
    """Each token builds a query ("what am I looking for?"), a key ("what do I contain?")
    and a value ("what do I pass on if chosen?"). A token's output is a weighted average
    of earlier tokens' values, weighted by softmax(query · key / sqrt(head_dim)).

    "Causal" = position t may only attend to positions <= t. During training the model
    predicts every position in parallel, so without this mask it could cheat by looking
    at the very token it is supposed to predict.

    "Multi-head" = the channels are split into n_head independent attention patterns, so
    one head can track e.g. the subject of the sentence while another tracks quotes.
    """

    def __init__(self, cfg: ModelConfig):
        super().__init__()
        assert cfg.d_model % cfg.n_head == 0
        self.n_head = cfg.n_head
        self.head_dim = cfg.d_model // cfg.n_head
        self.qkv = nn.Linear(cfg.d_model, 3 * cfg.d_model, bias=False)  # all three projections in one matmul
        self.proj = nn.Linear(cfg.d_model, cfg.d_model, bias=False)
        self.dropout = cfg.dropout

    def forward(self, x: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        # (B, T, C) -> (B, n_head, T, head_dim): each head attends independently
        q, k, v = (t.view(B, T, self.n_head, self.head_dim).transpose(1, 2) for t in (q, k, v))
        q, k = apply_rope(q, cos, sin), apply_rope(k, cos, sin)
        # Fused kernel for softmax(q k^T / sqrt(d) + causal_mask) v. Same math as writing
        # it out by hand, but never materialises the full T x T matrix in slow memory.
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True, dropout_p=self.dropout if self.training else 0.0)
        y = y.transpose(1, 2).contiguous().view(B, T, C)  # re-join the heads
        return self.proj(y)


class SwiGLU(nn.Module):
    """The feed-forward ("MLP") half of a block: applied to each position separately.

    Original Transformers used Linear -> ReLU -> Linear. SwiGLU uses two parallel
    projections, one passed through SiLU, and multiplies them: the second acts as a
    learned *gate* deciding how much of each feature passes. It trains measurably better
    for the same parameter count, which is why Llama, PaLM and others use it.
    Hidden size 8/3 * d_model keeps the parameter count equal to a 4x ReLU MLP.
    """

    def __init__(self, cfg: ModelConfig):
        super().__init__()
        hidden = int(8 * cfg.d_model / 3)
        hidden = 64 * ((hidden + 63) // 64)  # round up to a multiple of 64 (faster matmuls)
        self.gate = nn.Linear(cfg.d_model, hidden, bias=False)
        self.up = nn.Linear(cfg.d_model, hidden, bias=False)
        self.down = nn.Linear(hidden, cfg.d_model, bias=False)
        self.drop = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.drop(self.down(F.silu(self.gate(x)) * self.up(x)))


class Block(nn.Module):
    """Pre-norm residual block. The `x + ...` residual connections are what make deep
    networks trainable: each block only has to learn a *correction* to x, and gradients
    flow straight back through the additions to the earliest layers."""

    def __init__(self, cfg: ModelConfig):
        super().__init__()
        self.norm1 = RMSNorm(cfg.d_model)
        self.attn = CausalSelfAttention(cfg)
        self.norm2 = RMSNorm(cfg.d_model)
        self.mlp = SwiGLU(cfg)
        self.drop = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor) -> torch.Tensor:
        x = x + self.drop(self.attn(self.norm1(x), cos, sin))
        x = x + self.mlp(self.norm2(x))
        return x


class Veronica(nn.Module):
    def __init__(self, cfg: ModelConfig):
        super().__init__()
        self.cfg = cfg
        self.embed = nn.Embedding(cfg.vocab_size, cfg.d_model)  # token id -> vector (a learned lookup table)
        self.drop = nn.Dropout(cfg.dropout)
        self.blocks = nn.ModuleList(Block(cfg) for _ in range(cfg.n_layer))
        self.norm = RMSNorm(cfg.d_model)
        self.head = nn.Linear(cfg.d_model, cfg.vocab_size, bias=False)  # vector -> score per vocab token
        # Weight tying: the output layer reuses the embedding matrix. "Which vector means
        # token 42" and "how much does this vector look like token 42" are the same
        # question, and sharing saves vocab_size * d_model parameters (~3M here).
        self.head.weight = self.embed.weight

        cos, sin = rope_tables(cfg.d_model // cfg.n_head, cfg.context_len)
        self.register_buffer("rope_cos", cos, persistent=False)
        self.register_buffer("rope_sin", sin, persistent=False)

        self.apply(self._init_weights)
        # Scale down the projections that write into the residual stream, so the sum of
        # 2 * n_layer contributions starts at a sensible size (GPT-2's init trick).
        for name, p in self.named_parameters():
            if name.endswith("proj.weight") or name.endswith("down.weight"):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * cfg.n_layer))

    @staticmethod
    def _init_weights(m: nn.Module) -> None:
        if isinstance(m, (nn.Linear, nn.Embedding)):
            nn.init.normal_(m.weight, mean=0.0, std=0.02)

    def num_params(self) -> int:
        return sum(p.numel() for p in self.parameters())

    def forward(self, ids: torch.Tensor, targets: torch.Tensor | None = None):
        """ids (B, T) -> logits (B, T, V). With targets, also returns the loss.

        Loss = cross-entropy = average of -log(probability the model gave the true next
        token). A model guessing uniformly over 8,192 tokens scores ln(8192) ≈ 9.01;
        every bit of learning pushes it lower.
        """
        assert ids.shape[1] <= self.cfg.context_len, "sequence longer than context_len"
        x = self.drop(self.embed(ids))
        for block in self.blocks:
            x = block(x, self.rope_cos, self.rope_sin)
        logits = self.head(self.norm(x))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))
        return logits, loss

    @torch.no_grad()
    def generate(self, ids: torch.Tensor, max_new_tokens: int, temperature: float = 0.8,
                 top_k: int | None = 50, stop_id: int | None = None):
        """Autoregressive sampling: predict a distribution, sample one token, append, repeat.

        temperature < 1 sharpens the distribution (safer, more repetitive); > 1 flattens
        it (more surprising, more errors). top_k discards all but the k likeliest tokens
        before sampling, which removes the long tail of nonsense.
        Yields each new token id so callers can stream text as it is produced.
        """
        self.eval()
        for _ in range(max_new_tokens):
            window = ids[:, -self.cfg.context_len:]  # the model can only see context_len tokens
            logits, _ = self(window)
            logits = logits[:, -1, :]  # only the last position predicts the *next* token
            if temperature <= 0:
                next_id = logits.argmax(-1, keepdim=True)  # greedy
            else:
                logits = logits / temperature
                if top_k:
                    kth = torch.topk(logits, min(top_k, logits.size(-1))).values[:, -1, None]
                    logits = logits.masked_fill(logits < kth, float("-inf"))
                next_id = torch.multinomial(F.softmax(logits, dim=-1), num_samples=1)
            ids = torch.cat([ids, next_id], dim=1)
            yield int(next_id)
            if stop_id is not None and int(next_id) == stop_id:
                break
