"""Byte-level BPE tokenizer, written from scratch.

How it works (see docs/learn/04-veronica.md for the long version):

1. Every string is UTF-8 bytes, so the 256 byte values are the starting vocabulary.
   Any text at all can be encoded; there is no "unknown token".
2. Training repeatedly finds the most frequent *adjacent pair* of tokens in the
   corpus and merges it into one new token. After N merges the vocabulary is
   256 + N tokens, and frequent words have become single tokens.
3. Before counting pairs, text is split into "words" with a regex (letters, digits,
   punctuation and whitespace runs). Merges never cross those boundaries, so
   "dog." never produces a token that glues "g" to ".". This is the same idea GPT-2 uses.

Two tricks keep this fast enough in pure Python:
- We train on *unique* words with their counts, not the raw text. "the" appearing
  200,000 times is processed once with weight 200,000.
- After a merge we only update the words that contained that pair, using an index
  from pair -> words, instead of recounting everything.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

import regex

# GPT-2's split pattern: contractions, letter runs, number runs, punctuation runs, spaces.
# A leading space stays attached to the word (" the"), so spaces cost no extra tokens.
SPLIT_PATTERN = r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""

# Special tokens live after the learned vocabulary. <|endoftext|> separates documents
# so the model learns where one book ends and the next begins.
EOT = "<|endoftext|>"


def _merge_word(word: tuple[int, ...], pair: tuple[int, int], new_id: int) -> tuple[int, ...]:
    """Replace every occurrence of `pair` in `word` with `new_id`."""
    out, i = [], 0
    while i < len(word):
        if i < len(word) - 1 and word[i] == pair[0] and word[i + 1] == pair[1]:
            out.append(new_id)
            i += 2
        else:
            out.append(word[i])
            i += 1
    return tuple(out)


class Tokenizer:
    def __init__(self, merges: list[tuple[int, int]] | None = None):
        self.merges: list[tuple[int, int]] = merges or []
        self._pattern = regex.compile(SPLIT_PATTERN)
        self._build_tables()

    # ── Training ──────────────────────────────────────────────────────────
    @classmethod
    def train(cls, text: str, vocab_size: int, verbose: bool = False) -> "Tokenizer":
        assert vocab_size > 256, "vocab must be larger than the 256 byte tokens"
        pattern = regex.compile(SPLIT_PATTERN)

        # word (as a tuple of byte ids) -> how many times it appears
        word_counts = Counter(tuple(w.encode("utf-8")) for w in pattern.findall(text))
        words = list(word_counts.keys())
        counts = [word_counts[w] for w in words]

        # pair -> total frequency, and pair -> which words contain it
        pair_counts: dict[tuple[int, int], int] = defaultdict(int)
        pair_where: dict[tuple[int, int], set[int]] = defaultdict(set)
        for wi, w in enumerate(words):
            for a, b in zip(w, w[1:]):
                pair_counts[(a, b)] += counts[wi]
                pair_where[(a, b)].add(wi)

        merges: list[tuple[int, int]] = []
        for new_id in range(256, vocab_size):
            if not pair_counts:
                break
            best = max(pair_counts, key=pair_counts.__getitem__)
            if pair_counts[best] < 2:
                break  # nothing repeats any more; more merges would just memorize
            merges.append(best)

            # Update only the words that contain `best`.
            for wi in list(pair_where[best]):
                old = words[wi]
                new = _merge_word(old, best, new_id)
                c = counts[wi]
                for a, b in zip(old, old[1:]):  # remove the old word's pairs...
                    pair_counts[(a, b)] -= c
                    if pair_counts[(a, b)] <= 0:
                        del pair_counts[(a, b)]
                    pair_where[(a, b)].discard(wi)
                for a, b in zip(new, new[1:]):  # ...and add the new word's pairs
                    pair_counts[(a, b)] += c
                    pair_where[(a, b)].add(wi)
                words[wi] = new

            if verbose and (len(merges) % 500 == 0 or len(merges) <= 10):
                tok = cls(merges)
                print(f"merge {len(merges):>5}: {tok.vocab[new_id]!r}")
        return cls(merges)

    # ── Lookup tables ─────────────────────────────────────────────────────
    def _build_tables(self) -> None:
        # rank = when a merge was learned. Encoding applies merges in learned order.
        self.ranks = {pair: i for i, pair in enumerate(self.merges)}
        self.vocab: dict[int, bytes] = {i: bytes([i]) for i in range(256)}
        for i, (a, b) in enumerate(self.merges):
            self.vocab[256 + i] = self.vocab[a] + self.vocab[b]
        self.eot_id = 256 + len(self.merges)
        self.special = {EOT: self.eot_id}
        self._cache: dict[str, list[int]] = {}

    @property
    def vocab_size(self) -> int:
        return 256 + len(self.merges) + len(self.special)

    # ── Encoding / decoding ───────────────────────────────────────────────
    def _encode_word(self, word: str) -> list[int]:
        cached = self._cache.get(word)
        if cached is not None:
            return cached
        ids = list(word.encode("utf-8"))
        while len(ids) >= 2:
            # Of all adjacent pairs, apply the one that was learned earliest.
            pairs = list(zip(ids, ids[1:]))
            pair = min(pairs, key=lambda p: self.ranks.get(p, float("inf")))
            if pair not in self.ranks:
                break
            ids = list(_merge_word(tuple(ids), pair, 256 + self.ranks[pair]))
        if len(self._cache) < 500_000:
            self._cache[word] = ids
        return ids

    def encode(self, text: str) -> list[int]:
        out: list[int] = []
        for word in self._pattern.findall(text):
            out.extend(self._encode_word(word))
        return out

    def decode(self, ids: list[int]) -> str:
        inv_special = {v: k.encode() for k, v in self.special.items()}
        data = b"".join(self.vocab.get(i) or inv_special.get(i, b"") for i in ids)
        # A sampled sequence can end mid-character; replace broken bytes instead of crashing.
        return data.decode("utf-8", errors="replace")

    # ── Persistence ───────────────────────────────────────────────────────
    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps({"version": 1, "pattern": SPLIT_PATTERN, "merges": self.merges}))

    @classmethod
    def load(cls, path: str | Path) -> "Tokenizer":
        data = json.loads(Path(path).read_text())
        return cls([tuple(m) for m in data["merges"]])
