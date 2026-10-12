import math

import torch

from veronica.model import ModelConfig, Veronica, apply_rope, rope_tables

TINY = ModelConfig(vocab_size=64, context_len=16, d_model=32, n_layer=2, n_head=4, dropout=0.0)


def test_initial_loss_is_near_uniform():
    torch.manual_seed(0)
    model = Veronica(TINY)
    ids, targets = torch.randint(0, 64, (4, 16)), torch.randint(0, 64, (4, 16))
    _, loss = model(ids, targets)
    assert abs(loss.item() - math.log(64)) < 0.3  # untrained = guessing uniformly


def test_causal_future_cannot_leak():
    """Changing a later token must not change predictions at earlier positions."""
    torch.manual_seed(0)
    model = Veronica(TINY).eval()
    a = torch.randint(0, 64, (1, 16))
    b = a.clone()
    b[0, 10:] = (b[0, 10:] + 1) % 64
    la, _ = model(a)
    lb, _ = model(b)
    assert torch.allclose(la[0, :10], lb[0, :10], atol=1e-5)
    assert not torch.allclose(la[0, 10:], lb[0, 10:])


def test_rope_depends_only_on_relative_position():
    cos, sin = rope_tables(8, 32)
    q, k = torch.randn(8), torch.randn(8)

    def score(m, n):
        qm = apply_rope(q.expand(1, 1, m + 1, 8), cos, sin)[0, 0, m]
        kn = apply_rope(k.expand(1, 1, n + 1, 8), cos, sin)[0, 0, n]
        return (qm * kn).sum()

    assert torch.allclose(score(5, 3), score(12, 10), atol=1e-4)


def test_can_overfit_a_tiny_batch():
    """If a model can't memorise 2 sequences, something is broken."""
    torch.manual_seed(0)
    model = Veronica(TINY)
    ids = torch.randint(0, 64, (2, 17))
    opt = torch.optim.AdamW(model.parameters(), lr=3e-3)
    for _ in range(150):
        _, loss = model(ids[:, :-1], ids[:, 1:])
        opt.zero_grad()
        loss.backward()
        opt.step()
    assert loss.item() < 0.1
