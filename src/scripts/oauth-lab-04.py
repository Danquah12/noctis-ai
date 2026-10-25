#!/usr/bin/env python3
"""
DSTRIKE Lab Verifier: oauth-lab-04.py
Lab: Stealing OAuth access tokens via an open redirect (CWE-601 / CWE-22)
"""
import unittest
from urllib.parse import unquote

def verify_canonical_redirect_uri(redirect_uri: str, expected_exact: str) -> bool:
    decoded = unquote(redirect_uri)
    if ".." in decoded or "\\" in decoded or decoded != expected_exact:
        raise PermissionError("Path traversal or open-redirect chaining in redirect_uri blocked")
    return True

class TestOAuthLab04OpenRedirectChain(unittest.TestCase):
    def test_blocks_dot_segment_traversal_in_redirect_uri(self) -> None:
        expected = "https://client-app.local/oauth-callback"
        self.assertTrue(verify_canonical_redirect_uri(expected, expected))
        with self.assertRaises(PermissionError):
            verify_canonical_redirect_uri("https://client-app.local/oauth-callback/../post/next?path=https://evil.test", expected)

if __name__ == "__main__":
    unittest.main(verbosity=2)
