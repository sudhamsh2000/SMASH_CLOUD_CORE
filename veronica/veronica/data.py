"""Build VERONICA's training data: download -> clean -> tokenize -> binary token files.

    python -m veronica.data            # writes data/gutenberg/{train,val}.bin, tokenizer.json, manifest.json

Source: public-domain books from Project Gutenberg. Public domain means there is no
licence question about training on them, which matters for a model you build yourself.
Every book is recorded in manifest.json with its URL and checksum (data provenance).

Output format: a flat array of uint16 token ids (vocab < 65,536 so 2 bytes per token).
Training reads it with numpy.memmap, so the file is never loaded into RAM all at once.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path

import numpy as np

from .tokenizer import EOT, Tokenizer

# (Gutenberg id, title). Novels and stories in plain modern-ish English.
BOOKS = [
    (1342, "Pride and Prejudice"), (84, "Frankenstein"), (11, "Alice's Adventures in Wonderland"),
    (1661, "The Adventures of Sherlock Holmes"), (98, "A Tale of Two Cities"), (2701, "Moby Dick"),
    (1400, "Great Expectations"), (174, "The Picture of Dorian Gray"), (345, "Dracula"),
    (1260, "Jane Eyre"), (768, "Wuthering Heights"), (158, "Emma"), (161, "Sense and Sensibility"),
    (105, "Persuasion"), (76, "Adventures of Huckleberry Finn"), (74, "The Adventures of Tom Sawyer"),
    (120, "Treasure Island"), (43, "Dr Jekyll and Mr Hyde"), (2554, "Crime and Punishment"),
    (36, "The War of the Worlds"), (35, "The Time Machine"), (5230, "The Invisible Man"),
    (164, "Twenty Thousand Leagues under the Sea"), (103, "Around the World in Eighty Days"),
    (2852, "The Hound of the Baskervilles"), (244, "A Study in Scarlet"), (730, "Oliver Twist"),
    (766, "David Copperfield"), (46, "A Christmas Carol"), (219, "Heart of Darkness"),
    (514, "Little Women"), (45, "Anne of Green Gables"), (113, "The Secret Garden"),
    (16, "Peter Pan"), (55, "The Wonderful Wizard of Oz"), (215, "The Call of the Wild"),
    (910, "White Fang"), (1184, "The Count of Monte Cristo"), (2600, "War and Peace"),
    (6130, "The Iliad (Butler)"), (1727, "The Odyssey (Butler)"), (1497, "The Republic (Plato)"),
]

URL = "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt"


def strip_gutenberg(text: str) -> str:
    """Keep only the book: drop the licence header/footer and normalise line endings."""
    text = text.replace("\r\n", "\n")
    start = re.search(r"\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n", text)
    end = re.search(r"\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK", text)
    text = text[start.end() if start else 0 : end.start() if end else len(text)]
    # Books hard-wrap lines at ~70 chars. Unwrap paragraphs so the model learns prose,
    # not the line width of a 1990s text file. Blank lines (paragraph breaks) survive.
    paragraphs = [" ".join(p.split()) for p in re.split(r"\n\s*\n", text)]
    return "\n\n".join(p for p in paragraphs if p).strip()


def download(raw_dir: Path) -> list[dict]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    for gid, title in BOOKS:
        path = raw_dir / f"pg{gid}.txt"
        url = URL.format(id=gid)
        if not path.exists():
            print(f"  downloading {title} ({url})")
            req = urllib.request.Request(url, headers={"User-Agent": "SMASH-Cloud-VERONICA/0.1 (personal research)"})
            with urllib.request.urlopen(req, timeout=60) as r:
                path.write_bytes(r.read())
            time.sleep(1.0)  # be polite to Gutenberg's servers
        raw = path.read_bytes()
        manifest.append({"id": gid, "title": title, "url": url, "license": "Public domain (Project Gutenberg)",
                         "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
    return manifest


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="data/gutenberg")
    ap.add_argument("--vocab-size", type=int, default=8192)
    ap.add_argument("--val-fraction", type=float, default=0.03)
    args = ap.parse_args()

    out = Path(args.out)
    print("1/4 downloading books")
    manifest = download(out / "raw")

    print("2/4 cleaning")
    docs = []
    for entry in manifest:
        text = strip_gutenberg((out / "raw" / f"pg{entry['id']}.txt").read_text(encoding="utf-8", errors="replace"))
        entry["clean_chars"] = len(text)
        docs.append(text)
    print(f"    {len(docs)} books, {sum(map(len, docs)) / 1e6:.1f}M characters")

    print(f"3/4 training BPE tokenizer (vocab {args.vocab_size})")
    t0 = time.time()
    # The tokenizer reserves one id for <|endoftext|>, so learn vocab_size - 1 tokens.
    tok = Tokenizer.train("\n\n".join(docs), vocab_size=args.vocab_size - 1, verbose=True)
    tok.save(out / "tokenizer.json")
    print(f"    done in {time.time() - t0:.0f}s, vocab size {tok.vocab_size}")

    print("4/4 tokenizing")
    train_ids: list[int] = []
    val_ids: list[int] = []
    for entry, text in zip(manifest, docs):
        ids = tok.encode(text) + [tok.eot_id]
        cut = int(len(ids) * (1 - args.val_fraction))
        # The tail of every book is held out, so validation covers every author/style.
        train_ids += ids[:cut]
        val_ids += ids[cut:]
        entry["tokens"] = len(ids)
    np.array(train_ids, dtype=np.uint16).tofile(out / "train.bin")
    np.array(val_ids, dtype=np.uint16).tofile(out / "val.bin")

    total_chars = sum(e["clean_chars"] for e in manifest)
    total_tokens = len(train_ids) + len(val_ids)
    meta = {"vocab_size": tok.vocab_size, "eot": EOT, "train_tokens": len(train_ids), "val_tokens": len(val_ids),
            "chars_per_token": round(total_chars / total_tokens, 2), "books": manifest}
    (out / "manifest.json").write_text(json.dumps(meta, indent=2))
    print(f"    train {len(train_ids):,} tokens, val {len(val_ids):,} tokens, "
          f"{meta['chars_per_token']} chars/token")


if __name__ == "__main__":
    main()
