"""
ABHA verification — integration seam.

TODAY: mock implementation (ABDM sandbox approval pending).
LATER: when credentials arrive, replace the body of verify_abha_send_otp()
       and verify_abha_confirm_otp() with real ABDM V3 API calls.
       Everything else in the app stays the same.

Real ABDM V3 flow (for reference, to fill in later):
  1. POST to ABDM gateway /gateway/v3/sessions  -> get access token (client_id + secret)
  2. POST /abha/login/verify/send-otp  (ABDM sends OTP to the ABHA-linked mobile)
  3. POST /abha/login/verify/confirm-otp  -> returns verified ABHA profile
Docs: https://sandbox.abdm.gov.in/docs/
"""

import os
import random

# When real: read these from .env after approval
ABDM_CLIENT_ID = os.getenv("ABDM_CLIENT_ID", "")
ABDM_CLIENT_SECRET = os.getenv("ABDM_CLIENT_SECRET", "")

USE_REAL_ABDM = bool(ABDM_CLIENT_ID and ABDM_CLIENT_SECRET)

# In-memory mock OTP store keyed by ABHA number
_abha_otp_store = {}


def verify_abha_send_otp(abha_number: str) -> dict:
    """Start ABHA verification. Returns a transaction id (mock)."""
    if USE_REAL_ABDM:
        # ---- REAL ABDM CALL GOES HERE (after approval) ----
        # token = _get_abdm_access_token()
        # resp = requests.post(ABDM_SEND_OTP_URL, json={...}, headers={...})
        # return {"txn_id": resp.json()["txnId"], "mode": "real"}
        raise NotImplementedError("Real ABDM integration not wired yet")

    # ---- MOCK (today) ----
    otp = str(random.randint(100000, 999999))
    _abha_otp_store[abha_number] = otp
    print(f"[MOCK ABHA OTP] {abha_number} -> {otp}")
    return {"txn_id": f"mock-{abha_number}", "mock_otp": otp, "mode": "mock"}


def verify_abha_confirm_otp(abha_number: str, otp: str) -> dict:
    """Confirm the OTP. Returns verified profile (mock)."""
    if USE_REAL_ABDM:
        # ---- REAL ABDM CALL GOES HERE (after approval) ----
        # resp = requests.post(ABDM_CONFIRM_OTP_URL, json={"txnId":..., "otp": otp}, ...)
        # profile = resp.json()
        # return {"verified": True, "abha_number": profile["ABHANumber"],
        #         "name": profile["name"], "mode": "real"}
        raise NotImplementedError("Real ABDM integration not wired yet")

    # ---- MOCK (today) ----
    stored = _abha_otp_store.get(abha_number)
    if stored and stored == otp:
        del _abha_otp_store[abha_number]
        return {"verified": True, "abha_number": abha_number, "mode": "mock"}
    return {"verified": False, "mode": "mock"}