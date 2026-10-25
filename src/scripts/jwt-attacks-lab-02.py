#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-02.py
PortSwigger Lab: JWT authentication bypass via flawed signature verification (alg: none)
Upstream: rkhal101/Web-Security-Academy-Series/main/jwt-attacks/lab-02/jwt-attacks-lab-02.py
"""
import base64
import json
import unittest

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def build_alg_none_token(sub: str) -> str:
    hdr = b64url_encode(json.dumps({"alg": "none", "typ": "JWT"}).encode("utf-8"))
    pay = b64url_encode(json.dumps({"sub": sub}).encode("utf-8"))
    return f"{hdr}.{pay}."

def enforce_pinned_jwt_alg(header: dict, signature: str, allowed_algs: set[str]) -> bool:
    alg = str(header.get("alg", ""))
    if alg.lower() == "none" or alg not in allowed_algs or not signature:
        raise PermissionError(f"Rejected insecure or unpinned JWT algorithm: {alg}")
    return True

class TestJwtLab02AlgNoneBypass(unittest.TestCase):
    def test_alg_none_token_rejected(self) -> None:
        forged = build_alg_none_token("administrator")
        hdr_b64, _, sig = forged.split(".")
        pad = "=" * ((4 - len(hdr_b64) % 4) % 4)
        header = json.loads(base64.urlsafe_b64decode(hdr_b64 + pad))
        with self.assertRaises(PermissionError):
            enforce_pinned_jwt_alg(header, sig, {"RS256", "HS256"})

if __name__ == "__main__":
    unittest.main(verbosity=2)
