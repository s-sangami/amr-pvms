"""
ABDM M1 Login OTP test script.

Run:  python abdm_test.py

Steps performed:
  A. Get gateway session token
  B. Fetch ABDM public certificate
  C. RSA-encrypt the ABHA number
  D. Request login OTP
"""

import base64
import json
import uuid
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

# ---------------------------------------------------------------
# CONFIG — change ABHA_NUMBER to the real one you're testing with
# ---------------------------------------------------------------
CLIENT_ID = "SBXID_053766"
CLIENT_SECRET = "863c8977-a5db-47d9-b622-90bac71342fa"
ABHA_NUMBER = "91137332838630"   # no dashes

GATEWAY_URL = "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions"
ABHA_BASE = "https://abhasbx.abdm.gov.in/abha/api"


def now_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def base_headers(token=None):
    h = {
        "Content-Type": "application/json",
        "REQUEST-ID": str(uuid.uuid4()),
        "TIMESTAMP": now_ts(),
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


# ---------------------------------------------------------------
# STEP A — session token
# ---------------------------------------------------------------
def get_token():
    headers = base_headers()
    headers["X-CM-ID"] = "sbx"
    payload = {
        "clientId": CLIENT_ID,
        "clientSecret": CLIENT_SECRET,
        "grantType": "client_credentials",
    }
    r = requests.post(GATEWAY_URL, headers=headers, json=payload, timeout=30)
    r.raise_for_status()
    token = r.json()["accessToken"]
    print(f"[A] Token OK (length {len(token)})")
    return token


# ---------------------------------------------------------------
# STEP B — public certificate
# ---------------------------------------------------------------
def get_public_key(token):
    url = f"{ABHA_BASE}/v3/profile/public/certificate"
    r = requests.get(url, headers=base_headers(token), timeout=30)
    r.raise_for_status()

    data = r.json()
    key_b64 = data.get("publicKey") or data.get("certificate")
    if not key_b64:
        raise RuntimeError(f"Could not find key in response: {r.text[:400]}")

    print(f"[B] Certificate fetched (algorithm: {data.get('encryptionAlgorithm')})")

    # ABDM returns a bare base64-encoded DER key, not PEM
    der_bytes = base64.b64decode(key_b64.strip())
    return serialization.load_der_public_key(der_bytes)


# ---------------------------------------------------------------
# STEP C — encrypt
# ---------------------------------------------------------------
def encrypt(public_key, plaintext):
    ciphertext = public_key.encrypt(
        plaintext.encode(),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA1()),
            algorithm=hashes.SHA1(),
            label=None,
        ),
    )
    encoded = base64.b64encode(ciphertext).decode()
    print(f"[C] Encrypted (length {len(encoded)})")
    return encoded


# ---------------------------------------------------------------
# STEP D — request OTP
# ---------------------------------------------------------------
def request_otp(token, encrypted_abha):
    url = f"{ABHA_BASE}/v3/profile/login/request/otp"
    payload = {
        "scope": ["abha-login", "mobile-verify"],
        "loginHint": "abha-number",
        "loginId": 91137332838630,
        "otpSystem": "abdm",
    }
    r = requests.post(url, headers=base_headers(token), json=payload, timeout=30)
    print(f"[D] Status {r.status_code}")
    print(json.dumps(r.json(), indent=2) if r.text else "(empty response)")
    return r


if __name__ == "__main__":
    try:
        tok = get_token()
        pub = get_public_key(tok)
        enc = encrypt(pub, ABHA_NUMBER)
        request_otp(tok, enc)
    except requests.HTTPError as e:
        print(f"HTTP error: {e}")
        print(f"Response body: {e.response.text[:1000]}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")