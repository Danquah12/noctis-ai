#!/usr/bin/env python3
"""
DSTRIKE Lab Verifier: oauth-lab-02.py
Lab: Forced OAuth profile linking via missing state parameter (CWE-352)
"""
import hmac
import unittest

def link_oauth_profile(session_state: str, request_state: str, auth_code: str) -> str:
    if not session_state or not request_state:
        raise PermissionError("Missing OAuth state parameter")
    if not hmac.compare_digest(session_state, request_state):
        raise PermissionError("Invalid OAuth state parameter (CSRF forced profile linking blocked)")
    return f"LINKED:{auth_code}"

class TestOAuthLab02ForcedProfileLinking(unittest.TestCase):
    def test_blocks_missing_or_mismatched_state(self) -> None:
        with self.assertRaises(PermissionError):
            link_oauth_profile("state_admin_99", "", "code_attacker_42")
        with self.assertRaises(PermissionError):
            link_oauth_profile("state_admin_99", "state_attacker_01", "code_attacker_42")
        self.assertEqual(link_oauth_profile("state_admin_99", "state_admin_99", "code_admin_99"), "LINKED:code_admin_99")

if __name__ == "__main__":
    unittest.main(verbosity=2)
