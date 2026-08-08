"""
ABDM M1 login via the mobile-search flow.

Flow:
  A. Get gateway session token
  B. Fetch public key
  C. Search ABHA accounts by mobile   -> returns list + txnId
  D. Request OTP using the index      -> OTP sent to that mobile

Run:  python abdm_search.py
"""

import base64
import json
import uuid
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

# ---------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------
CLIENT_ID = "SBXID_053766"
CLIENT_SECRET = "863c8977-a5db-47d9-b622-90bac71342fa"
MOBILE = "9566811062"          # 10-digit mobile linked to the ABHA

GATEWAY_URL = "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions"
ABHA_BASE = "https://abhasbx.abdm.gov.in/abha/api"


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
    print(f"[A] Token OK ({len(token)} chars)")
    return token


def get_public_key(token):
    r = requests.get(f"{ABHA_BASE}/v3/profile/public/certificate",
                     headers=hdr(token), timeout=30)
    r.raise_for_status()
    key_b64 = r.json()["publicKey"]
    print("[B] Public key fetched")
    return serialization.load_der_public_key(base64.b64decode(key_b64.strip()))


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


def search_by_mobile(token, pub):
    payload = {
        "scope": ["search-abha"],
        "mobile": encrypt(pub, MOBILE),
    }
    r = requests.post(f"{ABHA_BASE}/v3/profile/account/abha/search",
                      headers=hdr(token), json=payload, timeout=30)
    print(f"[C] Search status {r.status_code}")
    print(json.dumps(r.json(), indent=2) if r.text else "(empty)")
    r.raise_for_status()
    return r.json()


def request_otp_by_index(token, pub, txn_id, index):
    payload = {
        "scope": ["abha-login", "search-abha", "mobile-verify"],
        "loginHint": "index",
        "loginId": encrypt(pub, index),
        "otpSystem": "abdm",
        "txnId": txn_id,
    }
    r = requests.post(f"{ABHA_BASE}/v3/profile/login/request/otp",
                      headers=hdr(token), json=payload, timeout=30)
    print(f"[D] OTP request status {r.status_code}")
    print(json.dumps(r.json(), indent=2) if r.text else "(empty)")
    r.raise_for_status()
    return r.json()["txnId"]


def verify_login_otp(token, pub, txn_id, otp):
    payload = {
        "scope": ["abha-login", "mobile-verify"],
        "authData": {
            "authMethods": ["otp"],
            "otp": {
                "txnId": txn_id,
                "otpValue": encrypt(pub, otp),
            },
        },
    }
    r = requests.post(f"{ABHA_BASE}/v3/profile/login/verify",
                      headers=hdr(token), json=payload, timeout=30)
    print(f"\n[E] Verify status {r.status_code}")
    print(json.dumps(r.json(), indent=2) if r.text else "(empty)")
    return r


if __name__ == "__main__":
    try:
        tok = get_token()
        pub = get_public_key(tok)

        result = search_by_mobile(tok, pub)

        # Response is a list of transaction groups, each with its own txnId + ABHA list
        if not result or not isinstance(result, list):
            print("\nUnexpected response shape — no accounts found.")
            raise SystemExit(1)

        first_group = result[0]
        txn_id = first_group.get("txnId")
        accounts = first_group.get("ABHA", [])

        if not accounts:
            print("\nNo ABHA accounts found for this mobile in the sandbox.")
            print("This means the number isn't registered in the sandbox environment.")
        else:
            print(f"\nFound {len(accounts)} account(s):")
            for acc in accounts:
                print(f"  index={acc['index']}  ABHA={acc['ABHANumber']}  name={acc.get('name')}")

            chosen_index = accounts[0]["index"]
            print(f"\nUsing index {chosen_index}.")
            login_txn_id = request_otp_by_index(tok, pub, txn_id, chosen_index)

            otp = input("\nEnter the OTP you just received on your phone: ").strip()
            verify_login_otp(tok, pub, login_txn_id, otp)

    except requests.HTTPError as e:
        print(f"\nHTTP error: {e}")
        print(f"Body: {e.response.text[:800]}")
    except Exception as e:
        print(f"\nError: {type(e).__name__}: {e}")