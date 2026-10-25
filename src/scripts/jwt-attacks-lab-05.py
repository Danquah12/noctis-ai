#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-05.py
PortSwigger Lab: JWT authentication bypass via jku header injection
Upstream: rkhal101/Web-Security-Academy-Series/main/jwt-attacks/lab-05/jwt-attacks-lab-05.py
"""
import unittest

PINNED_JWKS_URIS = frozenset(["https://idp.dstrike.internal/.well-known/jwks.json"])

def validate_jwt_jku_header(header: dict) -> bool:
    if "x5u" in header:
        raise PermissionError("x5u header is prohibited")
    if "jku" in header and header["jku"] not in PINNED_JWKS_URIS:
        raise PermissionError(f"Untrusted jku URL rejected: {header['jku']}")
    return True

class TestJwtLab05JkuHeaderInjection(unittest.TestCase):
    def test_blocks_external_exploit_server_jku(self) -> None:
        with self.assertRaises(PermissionError):
            validate_jwt_jku_header({"alg": "RS256", "jku": "https://exploit-server.net/jwks.json"})
        self.assertTrue(validate_jwt_jku_header({"alg": "RS256", "jku": "https://idp.dstrike.internal/.well-known/jwks.json"}))

if __name__ == "__main__":
    unittest.main(verbosity=2)
