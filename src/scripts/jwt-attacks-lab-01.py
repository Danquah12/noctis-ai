#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-01.py
PortSwigger Lab: JWT authentication bypass via unverified signature
Upstream: rkhal101/Web-Security-Academy-Series/main/jwt-attacks/lab-01/jwt-attacks-lab-01.py
"""
import base64
import hashlib
import hmac
import json
import unittest

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def b64url_decode(segment: str) -> bytes:
    pad = "=" * ((4 - len(segment) % 4) % 4)
    return base64.urlsafe_b64decode(segment + pad)

def forge_unverified_jwt_payload(jwt_token: str, new_sub: str) -> str:
    header_b64, payload_b64, sig_b64 = jwt_token.split(".")
    claims = json.loads(b64url_decode(payload_b64))
    claims["sub"] = new_sub
    new_payload_b64 = b64url_encode(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
    return f"{header_b64}.{new_payload_b64}.{sig_b64}"

def verify_jwt_hs256_strict(jwt_token: str, secret: bytes) -> dict:
    header_b64, payload_b64, sig_b64 = jwt_token.split(".")
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = b64url_encode(hmac.new(secret, signing_input, hashlib.sha256).digest())
    if not hmac.compare_digest(expected_sig, sig_b64):
        raise PermissionError("JWT signature verification failed: tampered payload rejected")
    return json.loads(b64url_decode(payload_b64))

class TestJwtLab01UnverifiedSignature(unittest.TestCase):
    def test_tampered_sub_claim_rejected_by_verifier(self) -> None:
        secret = b"production-256-bit-signing-secret"
        hdr = b64url_encode(b'{"alg":"HS256","typ":"JWT"}')
        pay = b64url_encode(b'{"sub":"wiener"}')
        sig = b64url_encode(hmac.new(secret, f"{hdr}.{pay}".encode("ascii"), hashlib.sha256).digest())
        valid_token = f"{hdr}.{pay}.{sig}"
        forged_token = forge_unverified_jwt_payload(valid_token, "administrator")
        self.assertEqual(verify_jwt_hs256_strict(valid_token, secret)["sub"], "wiener")
        with self.assertRaises(PermissionError):
            verify_jwt_hs256_strict(forged_token, secret)

if __name__ == "__main__":
    unittest.main(verbosity=2)
