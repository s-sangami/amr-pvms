"""
abha_real.py — Real ABDM M1 integration (login by ABHA number / mobile).

This module talks to the actual ABDM sandbox (not a mock). It mirrors the
same function names as abha.py so main.py can switch between them with
one flag.

Required environment variables (set these in Render, never commit them):
    ABDM_CLIENT_ID
    ABDM_CLIENT_SECRET

Flow:
    1. get_gateway_token()      -> app-level access token (cached ~20 min)
    2. get_public_key()         -> ABDM's RSA public key (cached ~1 hour)
    3. search_by_mobile()       -> find ABHA accounts linked to a mobile
    4. request_login_otp()      -> trigger OTP for a chosen account
    5. verify_login_otp()       -> verify OTP, get patient session + profile
"""

import base64
import os
import time
import uuid
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

CLIENT_ID = os.getenv("ABDM_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("ABDM_CLIENT_SECRET", "")

GATEWAY_URL = "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions"
ABHA_BASE = "https://abhasbx.abdm.gov.in/abha/api"

# ---------------------------------------------------------------
# Simple in-memory caches (fine for a single-process demo deployment)
# ---------------------------------------------------------------
_token_cache = {"token": None, "expires_at": 0}
_pubkey_cache = {"key": None, "expires_at": 0}


def _now_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _headers(token=None):
    h = {
        "Content-Type": "application/json",
        "REQUEST-ID": str(uuid.uuid4()),
        "TIMESTAMP": _now_ts(),
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _check_credentials():
    if not CLIENT_ID or not CLIENT_SECRET:
        raise RuntimeError(
            "ABDM_CLIENT_ID / ABDM_CLIENT_SECRET are not set. "
            "Set them as environment variables before using real ABHA."
        )


# ---------------------------------------------------------------
# STEP 1 — gateway session token (cached, refreshed before it expires)
# ---------------------------------------------------------------
def get_gateway_token():
    _check_credentials()

    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    h = _headers()
    h["X-CM-ID"] = "sbx"
    payload = {
        "clientId": CLIENT_ID,
        "clientSecret": CLIENT_SECRET,
        "grantType": "client_credentials",
    }
    r = requests.post(GATEWAY_URL, headers=h, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()

    token = data["accessToken"]
    expires_in = data.get("expiresIn", 1200)

    # Refresh 60s early to avoid edge-of-expiry failures
    _token_cache["token"] = token
    _token_cache["expires_at"] = time.time() + expires_in - 60

    return token


# ---------------------------------------------------------------
# STEP 2 — public certificate (cached for an hour; it rarely changes)
# ---------------------------------------------------------------
def get_public_key():
    if _pubkey_cache["key"] and time.time() < _pubkey_cache["expires_at"]:
        return _pubkey_cache["key"]

    token = get_gateway_token()
    r = requests.get(
        f"{ABHA_BASE}/v3/profile/public/certificate",
        headers=_headers(token),
        timeout=30,
    )
    r.raise_for_status()
    key_b64 = r.json()["publicKey"]
    key = serialization.load_der_public_key(base64.b64decode(key_b64.strip()))

    _pubkey_cache["key"] = key
    _pubkey_cache["expires_at"] = time.time() + 3600

    return key


def _encrypt(plaintext):
    public_key = get_public_key()
    ciphertext = public_key.encrypt(
        str(plaintext).encode(),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA1()),
            algorithm=hashes.SHA1(),
            label=None,
        ),
    )
    return base64.b64encode(ciphertext).decode()


# ---------------------------------------------------------------
# STEP 3 — search ABHA accounts by mobile number
# ---------------------------------------------------------------
def search_by_mobile(mobile: str):
    token = get_gateway_token()
    payload = {"scope": ["search-abha"], "mobile": _encrypt(mobile)}
    r = requests.post(
        f"{ABHA_BASE}/v3/profile/account/abha/search",
        headers=_headers(token),
        json=payload,
        timeout=30,
    )
    if r.status_code == 404:
        return {"found": False, "accounts": [], "txn_id": None}

    r.raise_for_status()
    result = r.json()

    if not result or not isinstance(result, list):
        return {"found": False, "accounts": [], "txn_id": None}

    first_group = result[0]
    accounts = first_group.get("ABHA", [])
    return {
        "found": bool(accounts),
        "accounts": accounts,
        "txn_id": first_group.get("txnId"),
    }


# ---------------------------------------------------------------
# STEP 4 — request login OTP for a chosen account index
# ---------------------------------------------------------------
def request_login_otp(txn_id: str, index: int):
    token = get_gateway_token()
    payload = {
        "scope": ["abha-login", "search-abha", "mobile-verify"],
        "loginHint": "index",
        "loginId": _encrypt(index),
        "otpSystem": "abdm",
        "txnId": txn_id,
    }
    r = requests.post(
        f"{ABHA_BASE}/v3/profile/login/request/otp",
        headers=_headers(token),
        json=payload,
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return {"txn_id": data["txnId"], "message": data.get("message")}


# ---------------------------------------------------------------
# STEP 5 — verify the OTP, returns patient session + profile
# ---------------------------------------------------------------
def verify_login_otp(txn_id: str, otp: str):
    token = get_gateway_token()
    payload = {
        "scope": ["abha-login", "mobile-verify"],
        "authData": {
            "authMethods": ["otp"],
            "otp": {"txnId": txn_id, "otpValue": _encrypt(otp)},
        },
    }
    r = requests.post(
        f"{ABHA_BASE}/v3/profile/login/verify",
        headers=_headers(token),
        json=payload,
        timeout=30,
    )
    data = r.json()

    if r.status_code != 200 or data.get("authResult") != "success":
        return {
            "verified": False,
            "message": data.get("message", "Verification failed"),
        }

    account = (data.get("accounts") or [{}])[0]
    return {
        "verified": True,
        "abha_number": account.get("ABHANumber"),
        "abha_address": account.get("preferredAbhaAddress"),
        "name": account.get("name"),
        "status": account.get("status"),
        "patient_token": data.get("token"),
        "refresh_token": data.get("refreshToken"),
    }


# ---------------------------------------------------------------
# Wrapper functions matching abha.py's interface, for main.py to call
# ---------------------------------------------------------------
def verify_abha_send_otp(abha_or_mobile: str):
    """
    Matches abha.py's verify_abha_send_otp(abha_number) signature.
    Takes a mobile number, searches for accounts, requests OTP for the
    first match. Returns a dict main.py can pass straight back to the app.
    """
    search = search_by_mobile(abha_or_mobile)

    if not search["found"]:
        return {
            "sent": False,
            "message": "No ABHA account found for this number.",
        }

    first_account = search["accounts"][0]
    otp_result = request_login_otp(search["txn_id"], first_account["index"])

    return {
        "sent": True,
        "message": otp_result["message"],
        "txn_id": otp_result["txn_id"],
        "name": first_account.get("name"),
    }


def verify_abha_confirm_otp(txn_id: str, otp: str):
    """Matches abha.py's verify_abha_confirm_otp(abha_number, otp) shape,
    but takes txn_id instead of abha_number (the app must pass through the
    txn_id it received from the send-otp step)."""
    result = verify_login_otp(txn_id, otp)
    if not result["verified"]:
        return {"verified": False, "message": result["message"]}

    return {
        "verified": True,
        "abha_number": result["abha_number"],
        "name": result["name"],
    }``