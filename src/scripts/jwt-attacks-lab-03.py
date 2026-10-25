#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-03.py
PortSwigger Lab: JWT authentication bypass via weak signing key
Upstream: rkhal101/Web-Security-Academy-Series/main/jwt-attacks/lab-03/jwt-attacks-lab-03.py
"""
import secrets
import unittest

WEAK_DICTIONARY_SECRETS = {"secret", "secret1", "password", "123456", "jwtsecret", "changeme"}

def validate_hmac_key_strength(secret_key: bytes) -> bool:
    if len(secret_key) < 32:
        raise ValueError(f"HMAC secret key too short ({len(secret_key)} bytes < 32 bytes / 256 bits)")
    if secret_key.decode("utf-8", errors="ignore").lower() in WEAK_DICTIONARY_SECRETS:
        raise ValueError("Weak dictionary HMAC secret rejected")
    return True

class TestJwtLab03WeakSigningKey(unittest.TestCase):
    def test_rejects_weak_secret1_and_accepts_256bit_csprng_key(self) -> None:
        with self.assertRaises(ValueError):
            validate_hmac_key_strength(b"secret1")
        self.assertTrue(validate_hmac_key_strength(secrets.token_bytes(32)))

if __name__ == "__main__":
    unittest.main(verbosity=2)
