"""No GPU, model, third-party data, external network, or private fixtures."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from noctis_governed_sft_input import InputBlocked, load_governed_export


def sha(data):
    return hashlib.sha256(data).hexdigest()


def row(prompt, answer):
    return {"messages": [{"role": "user", "content": prompt},
                         {"role": "assistant", "content": answer}]}


class GovernedInputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manifest = {
            "schema": "noctis.sft.preflight.v1",
            "mode": "private_sft_files_exported",
            "outcome": "offline_compatibility_preflight_only",
            "input_manifest_sha256": "a" * 64,
            "sealed_heldout_count": 1,
            "sealed_heldout_sha256": "b" * 64,
        }
        self.write_split("train", [row("What is 2 + 3?", "5")])
        self.write_split("development", [row("Name a primary color.", "Blue")])
        self.pin = self.save_manifest()

    def write_private(self, name, data):
        p = self.root / name
        p.write_bytes(data)
        p.chmod(0o600)

    def write_split(self, name, rows):
        raw = "".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) + "\n"
                      for x in rows).encode("utf-8")
        self.write_private(name + ".jsonl", raw)
        self.manifest[name + "_file_sha256"] = sha(raw)
        self.manifest[name + "_count"] = len(rows)
        hashes = [sha((x["messages"][0]["content"] + "\n" +
                       x["messages"][1]["content"]).encode("utf-8")) for x in rows]
        self.manifest[name + "_sha256"] = sha("\n".join(sorted(hashes)).encode("ascii"))

    def save_manifest(self):
        raw = json.dumps(self.manifest, indent=2).encode()
        self.write_private("manifest.json", raw)
        return sha(raw)

    def load(self, pin=None):
        return load_governed_export(self.root, self.pin if pin is None else pin)

    def test_valid_export(self):
        train, dev, meta = self.load()
        self.assertEqual(train[0]["messages"][1]["content"], "5")
        self.assertEqual(dev[0]["messages"][1]["content"], "Blue")
        self.assertFalse(meta["heldout_contents_loaded"])
        self.assertFalse(meta["training_executed"])
        self.assertNotIn("messages", meta)

    def test_file_tamper(self):
        self.write_private("train.jsonl", b"{}\n")
        with self.assertRaisesRegex(InputBlocked, "split_file_checksum_mismatch"):
            self.load()

    def test_rewritten_manifest_cannot_replace_independent_pin(self):
        self.write_split("train", [row("Changed question", "Changed answer")])
        self.save_manifest()
        with self.assertRaisesRegex(InputBlocked, "manifest_pin_mismatch"):
            self.load()

    def test_required_pin(self):
        with self.assertRaisesRegex(InputBlocked, "expected_manifest_sha256_required"):
            self.load("")

    def test_heldout_file_is_refused(self):
        self.write_private("heldout.jsonl", b"never read")
        with self.assertRaisesRegex(InputBlocked, "unexpected_export_files"):
            self.load()

    def test_nonprivate_file(self):
        (self.root / "train.jsonl").chmod(0o644)
        with self.assertRaisesRegex(InputBlocked, "private_regular_file_required"):
            self.load()

    def test_symlink_file(self):
        p = self.root / "train.jsonl"
        p.unlink()
        p.symlink_to(self.root / "development.jsonl")
        with self.assertRaisesRegex(InputBlocked, "private_export_unreadable"):
            self.load()

    def test_cross_split_normalized_duplicate(self):
        self.write_split("development", [row("WHAT  IS 2 + 3?", "Five")])
        with self.assertRaisesRegex(InputBlocked, "duplicate_or_cross_split_prompt"):
            self.load(self.save_manifest())

    def test_invalid_role_even_with_valid_hashes(self):
        item = row("Different prompt", "Answer")
        item["messages"][0]["role"] = "system"
        self.write_split("train", [item])
        with self.assertRaisesRegex(InputBlocked, "invalid_chatml"):
            self.load(self.save_manifest())

    def test_bad_example_digest(self):
        self.manifest["train_sha256"] = "0" * 64
        with self.assertRaisesRegex(InputBlocked, "example_fingerprint_mismatch"):
            self.load(self.save_manifest())

    def test_empty_or_boolean_count(self):
        for count in (0, True):
            with self.subTest(count=count):
                self.manifest["train_count"] = count
                with self.assertRaisesRegex(InputBlocked, "invalid_manifest_counts"):
                    self.load(self.save_manifest())

    def test_cli_does_not_print_examples(self):
        script = Path(__file__).with_name("noctis_governed_sft_input.py")
        args = [sys.executable, "-S", str(script), "--input-dir", str(self.root),
                "--expected-manifest-sha256", self.pin]
        result = subprocess.run(args, capture_output=True, text=True, check=True)
        self.assertNotIn("primary color", result.stdout)
        self.assertEqual(json.loads(result.stdout)["outcome"], "offline_trainer_input_validated_only")
        result = subprocess.run(args[:-1] + ["0" * 64], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("manifest_pin_mismatch", result.stderr)
        self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
