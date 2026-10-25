#!/usr/bin/env python3
"""
DSTRIKE Lab Script & Verifier: jwt-attacks-lab-08.py
PortSwigger Lab: JWT authentication bypass via algorithm confusion with no exposed key
"""
import math
import unittest

def recover_toy_rsa_modulus_from_pairs(s1: int, m1: int, s2: int, m2: int, e: int) -> int:
    # Demonstrates mathematical GCD modulus recovery from two RSA signature pairs: s^e ≡ m (mod N)
    return math.gcd((s1 ** e) - m1, (s2 ** e) - m2)

def enforce_asymmetric_only_policy(token_alg: str) -> bool:
    if token_alg != "RS256":
        raise PermissionError("Symmetric HS256 rejected on asymmetric RS256 endpoint (even if RSA public key is recovered)")
    return True

class TestJwtLab08NoExposedKeyConfusion(unittest.TestCase):
    def test_gcd_modulus_recovery_and_hs256_rejection(self) -> None:
        # Toy RSA parameters: N = 3233 (61 * 53), e = 17, d = 2753
        n, e, d = 3233, 17, 2753
        m1, m2 = 65, 123
        s1, s2 = pow(m1, d, n), pow(m2, d, n)
        recovered_n = recover_toy_rsa_modulus_from_pairs(s1, m1, s2, m2, e)
        self.assertEqual(recovered_n % n, 0)
        with self.assertRaises(PermissionError):
            enforce_asymmetric_only_policy("HS256")

if __name__ == "__main__":
    unittest.main(verbosity=2)
