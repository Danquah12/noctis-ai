#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-04.py
PortSwigger Lab: JWT authentication bypass via jwk header injection
Upstream: rkhal101/Web-Security-Academy-Series/main/jwt-attacks/lab-04/jwt-attacks-lab-04.py
"""
import unittest

def verify_jwt_header_no_embedded_jwk(header: dict, trusted_kids: set[str]) -> bool:
    if "jwk" in header or "x5c" in header:
        raise PermissionError("Embedded JWK/x5c public key in JWT header is forbidden")
    if header.get("kid") not in trusted_kids:
        raise PermissionError("Untrusted JWT kid rejected")
    return True

class TestJwtLab04JwkHeaderInjection(unittest.TestCase):
    def test_blocks_embedded_jwk_header(self) -> None:
        injected_hdr = {
            "alg": "RS256",
            "kid": "attacker-key-1",
            "jwk": {"kty": "RSA", "e": "AQAB", "n": "attacker_modulus"},
        }
        with self.assertRaises(PermissionError):
            verify_jwt_header_no_embedded_jwk(injected_hdr, {"server-key-2025"})
        self.assertTrue(verify_jwt_header_no_embedded_jwk({"alg": "RS256", "kid": "server-key-2025"}, {"server-key-2025"}))

if __name__ == "__main__":
    unittest.main(verbosity=2)
