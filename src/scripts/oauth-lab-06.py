#!/usr/bin/env python3
"""
DSTRIKE Lab Verifier: oauth-lab-06.py
Lab: Stealing OAuth access tokens via a proxy page (CWE-345 / postMessage('*'))
"""
import unittest

def validate_postmessage_policy(target_origin: str, payload_contains_location_href: bool, allowed_origin: str) -> bool:
    if target_origin == "*" or target_origin != allowed_origin:
        raise PermissionError("Wildcard or untrusted postMessage targetOrigin blocked")
    if payload_contains_location_href:
        raise PermissionError("Transmitting raw window.location.href with URL fragments is prohibited")
    return True

class TestOAuthLab06ProxyPageLeak(unittest.TestCase):
    def test_blocks_wildcard_postmessage_and_fragment_leak(self) -> None:
        with self.assertRaises(PermissionError):
            validate_postmessage_policy("*", True, "https://client-app.local")
        self.assertTrue(validate_postmessage_policy("https://client-app.local", False, "https://client-app.local"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
