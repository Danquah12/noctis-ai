#!/usr/bin/env python3
"""
DSTRIKE Lab Verifier: oauth-lab-01.py
Lab: Authentication bypass via OAuth implicit flow (CWE-287 / CWE-345)
Upstream status: notes.txt only in rkhal101/Web-Security-Academy-Series
"""
import unittest

def vulnerable_authenticate_endpoint(client_payload: dict, token_store: dict[str, str]) -> str:
    # FLAW: Server checks that token is valid, but trusts client-supplied email without binding check
    token = client_payload.get("token", "")
    if token not in token_store:
        raise PermissionError("Invalid OAuth access token")
    return f"SESSION_CREATED:{client_payload.get('email')}"

def hardened_authenticate_endpoint(client_payload: dict, token_store: dict[str, str]) -> str:
    # FIX: Resolve identity exclusively from server-side token introspection
    token = client_payload.get("token", "")
    verified_email = token_store.get(token)
    if not verified_email or verified_email != client_payload.get("email"):
        raise PermissionError("OAuth token-to-identity binding mismatch blocked")
    return f"SESSION_CREATED:{verified_email}"

class TestOAuthLab01ImplicitBypass(unittest.TestCase):
    def test_implicit_flow_email_tampering_blocked(self) -> None:
        token_store = {"tok_wiener_123": "wiener@normal-user.net"}
        tampered = {"username": "wiener", "email": "carlos@carlos-montoya.net", "token": "tok_wiener_123"}
        self.assertEqual(vulnerable_authenticate_endpoint(tampered, token_store), "SESSION_CREATED:carlos@carlos-montoya.net")
        with self.assertRaises(PermissionError):
            hardened_authenticate_endpoint(tampered, token_store)

if __name__ == "__main__":
    unittest.main(verbosity=2)
