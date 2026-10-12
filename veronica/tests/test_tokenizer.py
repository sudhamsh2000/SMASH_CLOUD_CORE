from veronica.tokenizer import Tokenizer

SAMPLE = "the cat sat on the mat. the dog sat on the log. " * 50


def test_roundtrip_any_text():
    tok = Tokenizer.train(SAMPLE, vocab_size=300)
    for text in [SAMPLE, "unseen words: zebra quokka!", "emoji 🚀 and accents café", "", "   spaces  "]:
        assert tok.decode(tok.encode(text)) == text


def test_merges_compress():
    tok = Tokenizer.train(SAMPLE, vocab_size=300)
    assert len(tok.encode(SAMPLE)) < len(SAMPLE.encode()) / 3
    # " the" is the most common word, so it should be a single token
    assert len(tok.encode(" the")) == 1


def test_save_load(tmp_path):
    tok = Tokenizer.train(SAMPLE, vocab_size=280)
    tok.save(tmp_path / "tok.json")
    again = Tokenizer.load(tmp_path / "tok.json")
    assert again.encode(SAMPLE) == tok.encode(SAMPLE)
    assert again.vocab_size == tok.vocab_size
