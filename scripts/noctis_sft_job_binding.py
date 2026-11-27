#!/usr/bin/env python3
"""Offline SFT job identity contract; never launches training or loads models."""
import argparse
import json
import re
import sys

from noctis_governed_sft_input import (
    InputBlocked, decode_json, digest, is_hash, load_governed_export, require,
)

FIELDS = {"schema", "base_model", "base_revision", "dataset_manifest_sha256",
          "trainer_code_revision", "dependency_lock_sha256", "seed", "epochs",
          "batch_size", "gradient_accumulation", "learning_rate_millionths",
          "lora_rank", "lora_alpha", "max_sequence_length"}
REVISION = re.compile(r"[0-9a-f]{40}\Z")
MODEL = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,95}/[A-Za-z0-9][A-Za-z0-9_.-]{0,95}\Z")
BOUNDS = {
    "seed": (0, 2**32 - 1), "epochs": (1, 100), "batch_size": (1, 1024),
    "gradient_accumulation": (1, 1024), "learning_rate_millionths": (1, 100000),
    "lora_rank": (1, 1024), "lora_alpha": (1, 4096),
    "max_sequence_length": (64, 262144),
}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def prepare_job(export_dir, config_bytes, expected_config_sha256):
    """Bind exact validated data and a pinned proposed config.

    Returns verified in-memory rows and metadata, not permission to run.
    The model/code/dependency identifiers are declared, not independently fetched.
    """
    require(is_hash(expected_config_sha256), "expected_config_sha256_required")
    require(isinstance(config_bytes, bytes) and 0 < len(config_bytes) <= 16384,
            "invalid_config_size")
    require(digest(config_bytes) == expected_config_sha256, "config_pin_mismatch")
    config = decode_json(config_bytes)
    require(isinstance(config, dict) and set(config) == FIELDS
            and config["schema"] == "noctis.sft.job.v1", "invalid_job_schema")
    model = config["base_model"]
    require(isinstance(model, str) and MODEL.fullmatch(model) is not None
            and all(part not in (".", "..") for part in model.split("/")), "invalid_model_id")
    for field in ("base_revision", "trainer_code_revision"):
        value = config[field]
        require(isinstance(value, str) and REVISION.fullmatch(value) is not None
                and value != "0" * 40, "immutable_revision_required")
    for field in ("dataset_manifest_sha256", "dependency_lock_sha256"):
        require(is_hash(config[field]), "invalid_job_digest")
    for field, (low, high) in BOUNDS.items():
        value = config[field]
        require(type(value) is int and low <= value <= high, "invalid_" + field)
    train, dev, dataset = load_governed_export(export_dir, config["dataset_manifest_sha256"])
    binding = {
        "schema": "noctis.sft.job.binding.v1",
        "config_sha256": expected_config_sha256,
        "config": config,
        "dataset": dataset,
    }
    record = {
        **binding,
        "job_binding_sha256": digest(canonical(binding)),
        "outcome": "offline_job_binding_only",
        "model_revision_verified": False,
        "dependency_lock_verified": False,
        "trainer_code_verified": False,
        "execution_authorized": False,
        "training_executed": False,
        "resume_supported": False,
    }
    return train, dev, record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--expected-config-sha256", required=True)
    args = parser.parse_args()
    try:
        with open(args.config, "rb") as handle:
            config = handle.read(16385)
        _, _, record = prepare_job(args.input_dir, config, args.expected_config_sha256)
    except (InputBlocked, OSError):
        print("Noctis job binding blocked: invalid or unreadable input", file=sys.stderr)
        return 2
    print(json.dumps(record, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
