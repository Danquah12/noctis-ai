#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-07.py
PortSwigger Lab: JWT authentication bypass via algorithm confusion (RS256 -> HS256)
"""
import unittest

def verify_key_algorithm_binding(key_type: str, token_alg: str) -> bool:
    if key_type == "RSA_PUBLIC" and token_alg != "RS256":
        raise PermissionError(f"Algorithm confusion blocked: RSA public key cannot verify {token_alg}")
    if key_type == "HMAC_SECRET" and token_alg != "HS256":
        raise PermissionError(f"Algorithm mismatch for HMAC key: {token_alg}")
    return True

class TestJwtLab07AlgorithmConfusion(unittest.TestCase):
    def test_blocks_rs256_to_hs256_public_key_confusion(self) -> None:
        with self.assertRaises(PermissionError):
            verify_key_algorithm_binding("RSA_PUBLIC", "HS256")
        self.assertTrue(verify_key_algorithm_binding("RSA_PUBLIC", "RS256"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
