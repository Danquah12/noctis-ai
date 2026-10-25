#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-06.py
PortSwigger Lab: JWT authentication bypass via kid header path traversal
Upstream: rkhal101/Web-Security-Academy-Series/main/jwt-attacks/lab-06/jwt-attacks-lab-06.py
"""
import re
import unittest

SAFE_KID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{4,64}$")
KEY_REGISTRY = {"key-2025-prod": b"32-byte-super-secret-signing-key"}

def resolve_signing_key_by_kid(kid: str) -> bytes:
    if not SAFE_KID_PATTERN.match(kid) or ".." in kid or "/" in kid or "\\" in kid:
        raise PermissionError(f"Path traversal in JWT kid blocked: {kid}")
    if kid not in KEY_REGISTRY:
        raise KeyError(f"Unknown kid: {kid}")
    return KEY_REGISTRY[kid]

class TestJwtLab06KidPathTraversal(unittest.TestCase):
    def test_blocks_dev_null_kid_traversal(self) -> None:
        with self.assertRaises(PermissionError):
            resolve_signing_key_by_kid("../../../../../../../dev/null")
        self.assertEqual(resolve_signing_key_by_kid("key-2025-prod"), b"32-byte-super-secret-signing-key")

if __name__ == "__main__":
    unittest.main(verbosity=2)
