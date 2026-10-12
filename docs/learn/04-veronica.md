# 04 · VERONICA: a language model built from nothing

FRIDAY *uses* language models. VERONICA *is* one: every piece written in this repo, trained
on your Mac's GPU, from random numbers to readable English. Nothing is downloaded except
public-domain books and PyTorch (the library that does matrix math on the GPU and computes
gradients for us).

```
veronica/
  veronica/tokenizer.py   text <-> integers (byte-level BPE)
  veronica/data.py        download books -> clean -> train tokenizer -> token files
  veronica/model.py       the Transformer
  veronica/train.py       the training loop
  veronica/server.py      API: training status + text generation
  tests/                  proofs that each piece does what it claims
```

Run it yourself:

```bash
cd veronica
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m veronica.data                     # ~1.5 min
.venv/bin/python -m veronica.train --run mine --steps 4000   # ~1 h on an M2
.venv/bin/python -m pytest tests                      # 11 tests
```

---

## The one idea everything rests on

A language model learns a single skill: **given some text, predict the next token.**

- Training: show it billions of "here's text, what comes next?" examples where we know
  the answer, and nudge its numbers to make the right answer more likely.
- Generation: predict a next token, append it, predict again, in a loop.

Everything (grammar, facts, style, reasoning in big models) is a side effect of getting
better at that one prediction. Keep that in mind for every section below.

---

## Step 1 · Data (`data.py`)

**Choice: 42 public-domain novels from Project Gutenberg, ~30M characters.**

Why these: public-domain text has no licence question. That matters because you intend to
grow VERONICA, and the terms of commercial AI APIs (Anthropic, OpenAI) restrict using
their *outputs* to train competing models. `manifest.json` records the URL and SHA-256 of
every book: **data provenance**, so you can always answer "what was this trained on?".

Cleaning:
- Strip Gutenberg's licence header/footer: it repeats in all 42 books, and the model would
  waste capacity memorising boilerplate.
- **Unwrap lines.** The files hard-wrap at ~70 characters. Left alone, the model would learn
  "insert a newline every 70 chars", a typesetting artifact rather than language.

**Train/validation split.** The last 3% of *every* book is held out as validation data,
never trained on. This is the most important number in the whole project:

- **training loss** = how well it predicts text it has seen
- **validation loss** = how well it predicts text it has *never* seen

If training loss keeps falling but validation loss rises, the model is **memorising**
(overfitting) instead of **learning**. Holding out the tail of every book (rather than whole
books) means validation covers every author's style.

---

## Step 2 · Tokenizer (`tokenizer.py`)

Neural networks consume numbers. A tokenizer maps text ↔ integer ids.

**Options and why BPE won:**

| Approach | Vocab | Problem |
|---|---|---|
| Characters | ~100 | Sequences are long; the model must spend capacity learning to spell |
| Whole words | 100,000s | Huge vocab; any unseen word is "unknown" |
| **Byte-level BPE** | chosen size (8,192) | none of the above: frequent words are 1 token, rare words split into pieces, and every possible string is encodable |

**The algorithm.** Start with the 256 byte values as tokens. Count every adjacent pair in
the corpus. Merge the most frequent pair into a new token. Repeat 7,935 times. You watched
it happen:

```
merge 1: ' t'     merge 2: 'he'     merge 7: ' the'
merge 2500: ' clothes'     merge 4500: ' apparently'
```

Note the leading space: `' the'` is one token that includes the space before it, so spaces
are nearly free.

**Pre-tokenization.** Before counting, a regex splits text into word-like chunks, and merges
never cross chunk boundaries. Without this you'd get tokens like `'g.'` or `'e, and'`, which
waste vocabulary on accidental punctuation pairings.

**Making it fast in pure Python:**
1. Count each *unique* word once with its frequency (" the" appears ~400,000 times but is
   processed once with weight 400,000).
2. After each merge, update only the words containing that pair, using a pair→words index.
Result: 7,935 merges over 30M characters in **20 seconds**.

**Encoding** applies merges in the order they were learned (the `ranks` table), with a
per-word cache: there are only ~100k distinct words, so most lookups are instant.

Result: **3.87 characters per token**, so 30M characters → 7.7M tokens.

---

## Step 3 · The model (`model.py`)

### Shape of the computation

```
token ids (B,T) → embedding (B,T,384) → 6 × Block → RMSNorm → logits (B,T,8192)
```

- **Embedding**: a learned table, one 384-number vector per token. Training moves vectors
  of related tokens near each other.
- **Logits**: for every position, 8,192 scores, one per possible next token. Softmax turns
  scores into probabilities.

Every position predicts its own next token *simultaneously*: one forward pass over 256
tokens is 256 training examples. That parallelism is why Transformers replaced RNNs.

### The Block: attention then MLP, each with a residual

```python
x = x + attention(norm(x))   # communicate: gather info from earlier tokens
x = x + mlp(norm(x))         # compute: process it, per position
```

**Attention.** Each token produces three vectors:
- **query**: what am I looking for? (e.g. a verb looking for its subject)
- **key**: what do I offer? (e.g. "I'm a plural noun")
- **value**: what I'll pass along if selected

Score = query · key for every earlier token, scaled by √head_dim and softmaxed into weights;
the output is the weighted sum of values. With **6 heads**, the 384 channels split into six
64-wide independent attention patterns, so different heads specialise.

**The causal mask.** Position t may only look at positions ≤ t. Otherwise, during
training, the model would simply read the answer. `tests/test_model.py::test_causal_future_cannot_leak`
proves it: changing tokens 10–15 leaves predictions at 0–9 bit-identical.

**MLP (SwiGLU).** Attention moves information *between* positions; the MLP transforms it
*within* each position. It's where much of the "knowledge" is stored.

**Residual connections (`x + ...`).** Each layer adds a correction rather than replacing x.
Gradients flow straight through the additions, which is what makes deep stacks trainable.

### The modern components (and what they replaced)

| Ours | Original (2017 / GPT-2) | Why the change |
|---|---|---|
| **RMSNorm** | LayerNorm | Same stabilising effect, cheaper (no mean subtraction) |
| **RoPE** rotary positions | Learned position vectors added to the input | Encodes *relative* distance directly in attention; generalises better |
| **SwiGLU** MLP | Linear→ReLU→Linear | A learned gate; better quality at equal parameter count |
| **Pre-norm** | Post-norm | Normalise *before* each sublayer; much more stable to train |
| **Weight tying** | separate output matrix | Embedding and output layer share weights, saving 3.1M params |

**RoPE in one paragraph.** Attention compares vectors with a dot product, which knows
nothing about order: "dog bites man" = "man bites dog". RoPE rotates pairs of channels in
each query and key by an angle proportional to position. A dot product between two
rotated vectors depends on the *difference* of their angles, so the attention score
depends on *how far apart* two tokens are, not where they sit absolutely.
`test_rope_depends_only_on_relative_position` checks that (5 vs 3) scores equal (12 vs 10).

### Size

| | |
|---|---|
| layers × width × heads | 6 × 384 × 6 |
| context length | 256 tokens (~1,000 characters) |
| parameters | **13.77M** (GPT-2 small: 124M; frontier models: ~trillions) |

### The loss

**Cross-entropy** = average of `-ln(probability given to the correct next token)`.
- Untrained (uniform over 8,192): `ln(8192) = 9.01`
- Perfect: 0
- A useful intuition: **perplexity** = e^loss = "the model is as uncertain as if choosing
  uniformly among *that many* tokens". Loss 4.0 ≈ choosing among 55.

---

## Step 4 · Training (`train.py`)

One step:

```python
x, y = batches["train"]()        # 32 random 256-token windows; y = x shifted by one
_, loss = model(x, y)             # forward: predict, measure error
loss.backward()                    # backprop: gradient of loss w.r.t. all 13.77M weights
clip_grad_norm_(..., 1.0)          # cap freak gradients
opt.step()                         # AdamW: move each weight a little downhill
```

**Backpropagation** applies the chain rule backwards through every operation to compute,
for each weight, "if this weight increased slightly, how would the loss change?". PyTorch
records operations during the forward pass and does this automatically (autograd).

**AdamW** improves on plain "weight -= lr × gradient":
- keeps a running average of each weight's gradient (*momentum*: smooths noise),
- and of its squared gradient (*adaptive scale*: weights with consistently tiny
  gradients get relatively larger steps),
- plus **weight decay** (the W): a slight pull toward zero, discouraging over-complicated
  solutions. Applied to matrices only, not to norm gains.

**Learning-rate schedule:** 200 steps of linear *warmup* (random weights + empty Adam
statistics = dangerously large early updates), then *cosine decay* from 1e-3 to 1e-4 so
late training makes fine adjustments.

**Dropout 0.1:** randomly zeroes 10% of activations during training, so the model can't
rely on any single pathway. A regulariser against memorisation, important here because
7.4M tokens is small for 13.8M parameters.

**Checkpoints:** `ckpt_last.pt` (with optimizer state, for `--resume`) every eval;
`ckpt_best.pt` only when validation loss improves. That's what gets served, so even if
later steps overfit, the API keeps the best model.

### A measured surprise: precision

Modern GPUs train in 16-bit "bfloat16" for speed. Measured on this M2:

| precision | tokens/sec |
|---|---|
| float32 | 11,031 |
| bfloat16 | 8,545 (**25% slower**) |
| float16 | 10,971 |

The M2 GPU has no native bfloat16 units, so it's emulated. `train.py` therefore uses bf16
only on CUDA (NVIDIA). **Always measure; don't assume.**

---

## Step 5 · Results: VERONICA v0.1

Trained 2026-10-11 on an Apple M2 (10-core GPU): 4,000 steps, 32.8M tokens (≈4.4 passes over
the books), **1 h 34 min**. Throughput fell from 11k to ~6k tokens/s because the GPU was
shared with Docker and a browser preview: a reminder that benchmarks run on an idle machine.

### The learning curve

| step | train loss | val loss | gap | what the samples looked like |
|---|---|---|---|---|
| 0 | 9.01 | 9.01 | | random tokens (uniform guessing) |
| 40 | 7.06 | 7.02 | | commas, "the", "and", blank lines: just word frequencies |
| 250 | 4.93 | 5.02 | 0.09 | "it was in the little sound-ten, were all that it was all all his life": local grammar |
| 1,000 | 4.08 | 4.24 | 0.15 | real clauses, dialogue punctuation |
| 2,000 | 3.73 | 3.99 | 0.26 | |
| 3,750 | 3.44 | **3.785** ★ | 0.35 | best checkpoint (served by the API) |
| 4,000 | 3.44 | 3.803 | 0.37 | val ticked up |

Read the table the way a researcher would:

- **Steep, then slow.** Half the total improvement happened in the first 250 steps. Easy
  patterns (frequencies, spelling, punctuation) are learned first; each further gain costs more.
- **The gap is overfitting starting.** Train and val were equal early on; by the end the model
  is 0.35 better on text it has seen than on text it hasn't. With ~4.4 passes over only
  7.4M tokens, it began *memorising* the books. More data would help more than more steps.
- **Validation stopped improving at 3,750.** That's exactly why training saves `ckpt_best.pt`
  separately from the latest weights.
- **The cosine schedule is visible:** the biggest drops came while the learning rate was high;
  the last 1,000 steps (lr ≈ 1e-4) were fine-tuning.

### Full evaluation (`python -m veronica.evaluate --run v0.1`)

| metric | value | meaning |
|---|---|---|
| loss | 3.80 | over all 230,167 held-out tokens, not a random sample |
| perplexity | 44.7 | as uncertain as picking among ~45 tokens (vs 8,192 untrained) |
| **bits per character** | **1.409** | gzip manages ~2.5–3 on English; frontier LLMs get well under 1 |

### What it learned, from the samples

At temperature 0.8:

> "I cannot believe it," said Elizabeth, "that **Mr. Darcy**, I would not have been so surprised as to be in the way of a gentleman's life…"

> The ship sailed in the course of the year; but on the 5th of May I remember that the vessel was at the mercy of the vessel, and its latitude was not yet known to the **_Nautilus_**.

> "Adieu now," said **Dantès**…

- **Associations:** *Elizabeth* pulls in *Mr. Darcy* (Pride and Prejudice), *ship* pulls in the
  *Nautilus* (Verne, written in italics just as the source text uses `_underscores_`), and
  *Dantès* appears in sea stories (Monte Cristo). Nobody told it these facts; they're
  statistical regularities of the training text. This is the seed of what makes large models
  "know" things.
- **Style:** quotation marks, dialogue tags ("said Colin"), dates, chapter headings.
- **What it lacks:** meaning over more than a sentence or two ("the vessel was at the mercy of
  the vessel"). 13.8M parameters and 7M tokens can hold grammar and associations, not a plot.

**Greedy decoding loops.** At temperature 0 every prompt collapses into repetition:
*"I am sure I am not mistaken. I am sure I am not mistaken. I am sure…"*. Once a phrase
is likely, repeating it makes it *more* likely, and argmax never escapes. Sampling
(temperature 0.7–1.0 with top-k) breaks the cycle, which is why every chat model samples.

### How to make v0.2 better (in order of expected payoff)

1. **More data.** The gap says the model has run out of new text. Ten times more public-domain
   books would help more than anything else on this list.
2. **A bigger model *together with* more data.** Scaling laws (Chinchilla, 2022) say the
   compute-optimal amount of data is roughly 20 tokens per parameter. v0.1 saw ~2.4 tokens per
   parameter, so it's data-starved, not size-starved.
3. **Longer context** (256 → 512+) so it can keep a scene coherent.
4. **Instruction tuning:** a second training stage on question→answer examples, which turns a
   text-continuer into an assistant. Needs data you have rights to (see the provenance note
   in Step 1).

---

## Exercises

1. **Tokenizer intuition.** In a Python shell:
   `from veronica.tokenizer import Tokenizer; t = Tokenizer.load('data/gutenberg/tokenizer.json')`
   then compare `len(t.encode(...))` for an English sentence, a sentence of Python code, and
   one in another language. Why is the English one shortest?
2. **Temperature.** Call `/api/veronica/generate` with temperature 0 (greedy), 0.8, and 1.5.
   Describe what changes.
3. **Overfit on purpose.** Train with `--dropout 0 --steps 8000` and watch train/val diverge
   in `metrics.jsonl`.
4. **Scale.** Try `--n-layer 4 --d-model 256` (smaller) and compare best validation loss and
   speed. You're doing a tiny *scaling-law* experiment.
5. **Break causality.** In `CausalSelfAttention.forward` set `is_causal=False`, then run
   `pytest tests/test_model.py`. Which test fails, and what would training loss do?
