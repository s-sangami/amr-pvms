"""
ABDM sandbox — create an ABHA number using Aadhaar OTP.

WARNING: This uses a REAL Aadhaar number and sends a REAL OTP to the
Aadhaar-linked mobile. Get your mentor's approval before running.
The ABHA created here exists only in the SANDBOX environment.

Run:  python abdm_enroll.py
"""

import base64
import json
import uuid
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

# ---------------------------------------------------------------
CLIENT_ID = "SBXID_053766"
CLIENT_SECRET = "863c8977-a5db-47d9-b622-90bac71342fa"

GATEWAY_URL = "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions"
ABHA_BASE = "https://abhasbx.abdm.gov.in/abha/api"
# ---------------------------------------------------------------


def now_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def hdr(token=None):
    h = {
        "Content-Type": "application/json",
        "REQUEST-ID": str(uuid.uuid4()),
        "TIMESTAMP": now_ts(),
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def verhoeff_valid(number):
    """Aadhaar checksum validation (Verhoeff algorithm)."""
    d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ]
    p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ]
    c = 0
    for i, item in enumerate(reversed(number)):
        c = d[c][p[i % 8][int(item)]]
    return c == 0


def get_token():
    h = hdr()
    h["X-CM-ID"] = "sbx"
    payload = {
        "clientId": CLIENT_ID,
        "clientSecret": CLIENT_SECRET,
        "grantType": "client_credentials",
    }
    r = requests.post(GATEWAY_URL, headers=h, json=payload, timeout=30)
    r.raise_for_status()
    token = r.json()["accessToken"]
    print(f"[1] Token OK ({len(token)} chars)")
    return token


def get_public_key(token):
    r = requests.get(f"{ABHA_BASE}/v3/profile/public/certificate",
                     headers=hdr(token), timeout=30)
    r.raise_for_status()
    print("[2] Public key fetched")
    return serialization.load_der_public_key(
        base64.b64decode(r.json()["publicKey"].strip())
    )


def encrypt(public_key, plaintext):
    ct = public_key.encrypt(
        str(plaintext).encode(),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA1()),
            algorithm=hashes.SHA1(),
            label=None,
        ),
    )
    return base64.b64encode(ct).decode()


def request_aadhaar_otp(token, pub, aadhaar):
    payload = {
        "loginHint": "aadhaar",
        "loginId": encrypt(pub, aadhaar),
        "otpSystem": "aadhaar",
        "scope": ["abha-enrol"],
        "txnId": "",
    }
    r = requests.post(f"{ABHA_BASE}/v3/enrollment/request/otp",
                      headers=hdr(token), json=payload, timeout=60)
    print(f"[3] OTP request status {r.status_code}")
    print(json.dumps(r.json(), indent=2) if r.text else "(empty)")
    r.raise_for_status()
    return r.json()["txnId"]


def enrol_by_aadhaar(token, pub, txn_id, otp, mobile):
    payload = {
        "authData": {
            "authMethods": ["otp"],
            "otp": {
                "mobile": mobile,
                "otpValue": encrypt(pub, otp),
                "timeStamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "txnId": txn_id,
            },
        },
        "consent": {"code": "abha-enrollment", "version": "1.4"},
    }
    r = requests.post(f"{ABHA_BASE}/v3/enrollment/enrol/byAadhaar",
                      headers=hdr(token), json=payload, timeout=60)
    print(f"\n[5] Enrollment status {r.status_code}")
    return r


if __name__ == "__main__":
    print("=" * 60)
    print("ABDM SANDBOX — ABHA ENROLLMENT VIA AADHAAR")
    print("=" * 60)
    print("This sends a REAL OTP to your Aadhaar-linked mobile.")
    print("The ABHA created exists only in the sandbox environment.\n")

    aadhaar = input("Enter your 12-digit Aadhaar number: ").strip().replace(" ", "")

    if len(aadhaar) != 12 or not aadhaar.isdigit():
        print("ERROR: Aadhaar must be exactly 12 digits.")
        raise SystemExit(1)

    if not verhoeff_valid(aadhaar):
        print("ERROR: That Aadhaar number failed the checksum test.")
        print("Please re-check the digits you entered.")
        raise SystemExit(1)

    print("Aadhaar format valid.\n")

    try:
        tok = get_token()
        pub = get_public_key(tok)
        txn_id = request_aadhaar_otp(tok, pub, aadhaar)

        print(f"\n[4] OTP sent. Transaction ID: {txn_id}")
        otp = input("    Enter the OTP you received: ").strip()
        mobile = input("    Enter your 10-digit mobile number: ").strip()

        resp = enrol_by_aadhaar(tok, pub, txn_id, otp, mobile)

        try:
            data = resp.json()
        except ValueError:
            print(resp.text[:800])
            raise SystemExit(1)

        profile = data.get("ABHAProfile")
        if profile:
            print("\n" + "=" * 60)
            print("SUCCESS — SANDBOX ABHA CREATED")
            print("=" * 60)
            print(f"ABHA Number  : {profile.get('ABHANumber')}")
            print(f"Name         : {profile.get('name')}")
            print(f"ABHA Address : {profile.get('phrAddress')}")
            print(f"Status       : {profile.get('abhaStatus')}")
            print(f"New account  : {data.get('isNew')}")
            print("\nSAVE THE ABHA NUMBER ABOVE — use it for login testing.")
        else:
            print(json.dumps(data, indent=2))

    except requests.HTTPError as e:
        print(f"\nHTTP error: {e}")
        print(f"Body: {e.response.text[:800]}")
    except Exception as e:
        print(f"\nError: {type(e).__name__}: {e}")