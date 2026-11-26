#!/usr/bin/env python3
"""Offline Python consumer of PR #14's private SFT export contract.

Returns validated in-memory train/development rows; never opens a held-out
file, contacts a provider, loads ML packages, or launches a training job.
The expected manifest digest must come from a separately trusted record.
"""
import argparse
import hashlib
import json
import os
import re
import stat
import sys
import unicodedata

MAX_BYTES = 50_000_000
MAX_ROWS = 200_000
HASH = re.compile(r"[0-9a-f]{64}\Z")
FILES = {"manifest.json", "train.jsonl", "development.jsonl"}


class InputBlocked(ValueError):
    pass


def require(condition, code):
    if not condition:
        raise InputBlocked(code)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def is_hash(value):
    return isinstance(value, str) and HASH.fullmatch(value) is not None


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate_json_key")
        result[key] = value
    return result


def reject_constant(_):
    raise InputBlocked("invalid_json_constant")


def decode_json(data):
    try:
        return json.loads(data.decode("utf-8"), object_pairs_hook=unique_object,
                          parse_constant=reject_constant)
    except (ValueError, UnicodeError, RecursionError) as exc:
        if isinstance(exc, InputBlocked):
            raise
        raise InputBlocked("invalid_utf8_or_json") from None


def read_private(directory_fd, name):
    # O_NONBLOCK avoids hanging on a FIFO before fstat rejects it.
    fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
    with os.fdopen(fd, "rb") as handle:
        info = os.fstat(handle.fileno())
        require(stat.S_ISREG(info.st_mode) and not info.st_mode & 0o077
                and info.st_nlink == 1 and info.st_size <= MAX_BYTES,
                "private_regular_file_required")
        data = handle.read(MAX_BYTES + 1)
        require(len(data) <= MAX_BYTES, "file_too_large")
        return data


def normalize_prompt(value):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def parse_rows(data, expected_count, expected_examples, seen_prompts):
    lines = data.split(b"\n")
    if lines[-1] == b"":
        lines.pop()
    require(len(lines) == expected_count and all(lines), "row_count_or_blank_line")
    rows, example_hashes = [], []
    for line in lines:
        row = decode_json(line)
        require(isinstance(row, dict) and set(row) == {"messages"}, "unexpected_row_fields")
        messages = row["messages"]
        require(isinstance(messages, list) and len(messages) == 2, "invalid_chatml")
        for msg, role, limit in zip(messages, ("user", "assistant"), (12000, 24000)):
            require(isinstance(msg, dict) and set(msg) == {"role", "content"}
                    and msg["role"] == role, "invalid_chatml")
            value = msg["content"]
            require(isinstance(value, str) and bool(value.strip())
                    and value == value.strip(), "invalid_message_content")
            try:
                # JS producer counts UTF-16 code units, not Python code points.
                length = len(value.encode("utf-16-le")) // 2
                require(length <= limit, "invalid_message_content")
            except UnicodeError:
                raise InputBlocked("invalid_message_content") from None
        prompt, completion = (m["content"] for m in messages)
        key = normalize_prompt(prompt)
        require(key not in seen_prompts, "duplicate_or_cross_split_prompt")
        seen_prompts.add(key)
        example_hashes.append(digest((prompt + "\n" + completion).encode("utf-8")))
        rows.append(row)
    require(digest("\n".join(sorted(example_hashes)).encode("ascii")) == expected_examples,
            "example_fingerprint_mismatch")
    return rows


def load_governed_export(directory, expected_manifest_sha256):
    """Return (train_rows, development_rows, metadata), all from verified bytes.

    No subsequent file reopening is necessary for a future Dataset.from_list
    caller. The manifest hash is an integrity pin, not a signature or rights
    attestation. Upstream semantic contamination and independent review still
    require verification; the sealed heldout fingerprint cannot prove its
    contents to this consumer.
    """
    require(is_hash(expected_manifest_sha256), "expected_manifest_sha256_required")
    require(hasattr(os, "O_NOFOLLOW") and hasattr(os, "O_DIRECTORY"),
            "posix_private_file_checks_required")
    try:
        directory_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            info = os.fstat(directory_fd)
            require(stat.S_ISDIR(info.st_mode) and not info.st_mode & 0o077,
                    "private_directory_required")
            require(set(os.listdir(directory_fd)) == FILES, "unexpected_export_files")
            raw_manifest = read_private(directory_fd, "manifest.json")
            require(digest(raw_manifest) == expected_manifest_sha256, "manifest_pin_mismatch")
            manifest = decode_json(raw_manifest)
            require(isinstance(manifest, dict)
                    and manifest.get("schema") == "noctis.sft.preflight.v1"
                    and manifest.get("mode") == "private_sft_files_exported"
                    and manifest.get("outcome") == "offline_compatibility_preflight_only",
                    "invalid_export_manifest")
            for name in ("train_file_sha256", "development_file_sha256", "train_sha256",
                         "development_sha256", "sealed_heldout_sha256", "input_manifest_sha256"):
                require(is_hash(manifest.get(name)), "invalid_manifest_digest")
            counts = [manifest.get(name) for name in
                      ("train_count", "development_count", "sealed_heldout_count")]
            require(all(type(n) is int and 0 < n <= MAX_ROWS for n in counts)
                    and sum(counts) <= MAX_ROWS, "invalid_manifest_counts")
            seen = set()
            partitions = []
            for name, count in zip(("train", "development"), counts):
                raw = read_private(directory_fd, name + ".jsonl")
                require(digest(raw) == manifest[name + "_file_sha256"], "split_file_checksum_mismatch")
                partitions.append(parse_rows(raw, count, manifest[name + "_sha256"], seen))
        finally:
            os.close(directory_fd)
    except OSError:
        raise InputBlocked("private_export_unreadable") from None
    metadata = {
        "schema": "noctis.trainer.input.v1",
        "manifest_sha256": expected_manifest_sha256,
        "input_manifest_sha256": manifest["input_manifest_sha256"],
        "train_file_sha256": manifest["train_file_sha256"],
        "development_file_sha256": manifest["development_file_sha256"],
        "train_count": counts[0],
        "development_count": counts[1],
        "sealed_heldout_count": counts[2],
        "sealed_heldout_sha256": manifest["sealed_heldout_sha256"],
        "heldout_contents_loaded": False,
        "training_executed": False,
        "outcome": "offline_trainer_input_validated_only",
    }
    return partitions[0], partitions[1], metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--expected-manifest-sha256", required=True)
    args = parser.parse_args()
    try:
        _, _, metadata = load_governed_export(args.input_dir, args.expected_manifest_sha256)
    except InputBlocked as exc:
        print("Noctis trainer input blocked: " + str(exc), file=sys.stderr)
        return 2
    print(json.dumps(metadata, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
