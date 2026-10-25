#!/usr/bin/env python3
"""
DSTRIKE Lab Verifier: oauth-lab-05.py
Lab: SSRF via OpenID dynamic client registration (CWE-918)
"""
import ipaddress
import unittest
from urllib.parse import urlparse

def validate_oidc_client_metadata_uri(uri: str, resolved_ip: str) -> bool:
    parsed = urlparse(uri)
    if parsed.scheme != "https":
        raise PermissionError("OIDC metadata URI must use HTTPS")
    addr = ipaddress.ip_address(resolved_ip)
    if addr.is_private or addr.is_loopback or addr.is_link_local:
        raise PermissionError(f"SSRF blocked for internal/IMDS address: {resolved_ip}")
    return True

class TestOAuthLab05OidcSsrf(unittest.TestCase):
    def test_blocks_imds_logo_uri_ssrf(self) -> None:
        with self.assertRaises(PermissionError):
            validate_oidc_client_metadata_uri("http://169.254.169.254/latest/meta-data/iam/security-credentials/admin/", "169.254.169.254")
        self.assertTrue(validate_oidc_client_metadata_uri("https://cdn.example.com/logo.png", "93.184.216.34"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
