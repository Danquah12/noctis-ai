#!/usr/bin/env python3
"""
DSTRIKE Lab Verifier: oauth-lab-03.py
Lab: OAuth account hijacking via redirect_uri (CWE-601)
"""
import unittest

REGISTERED_REDIRECT_URIS = {"client-blog": frozenset(["https://client-app.local/oauth-callback"])}

def validate_oauth_redirect_uri(client_id: str, redirect_uri: str) -> bool:
    allowed = REGISTERED_REDIRECT_URIS.get(client_id, frozenset())
    if redirect_uri not in allowed:
        raise PermissionError(f"Unregistered redirect_uri rejected: {redirect_uri}")
    return True

class TestOAuthLab03RedirectUriHijack(unittest.TestCase):
    def test_exact_redirect_uri_allowlist(self) -> None:
        self.assertTrue(validate_oauth_redirect_uri("client-blog", "https://client-app.local/oauth-callback"))
        with self.assertRaises(PermissionError):
            validate_oauth_redirect_uri("client-blog", "https://exploit-server.net/callback")

if __name__ == "__main__":
    unittest.main(verbosity=2)
