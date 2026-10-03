"""Inspect what the ABDM public certificate endpoint actually returns."""

import uuid
from datetime import datetime, timezone

import requests

CLIENT_ID = "SBXID_053766"
CLIENT_SECRET = "863c8977-a5db-47d9-b622-90bac71342fa"
GATEWAY_URL = "https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions"
ABHA_BASE = "https://abhasbx.abdm.gov.in/abha/api"


def now_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


# Get token
headers = {
    "Content-Type": "application/json",
    "REQUEST-ID": str(uuid.uuid4()),
    "TIMESTAMP": now_ts(),
    "X-CM-ID": "sbx",
}
payload = {
    "clientId": CLIENT_ID,
    "clientSecret": CLIENT_SECRET,
    "grantType": "client_credentials",
}
token = requests.post(GATEWAY_URL, headers=headers, json=payload, timeout=30).json()["accessToken"]
print("Token OK\n")

# Fetch certificate
cert_headers = {
    "Content-Type": "application/json",
    "REQUEST-ID": str(uuid.uuid4()),
    "TIMESTAMP": now_ts(),
    "Authorization": f"Bearer {token}",
}
r = requests.get(f"{ABHA_BASE}/v3/profile/public/certificate", headers=cert_headers, timeout=30)

print(f"Status code : {r.status_code}")
print(f"Content-Type: {r.headers.get('Content-Type')}")
print(f"Body length : {len(r.text)}")
print("\n--- FIRST 600 CHARACTERS OF BODY ---")
print(repr(r.text[:600]))
print("\n--- LAST 200 CHARACTERS OF BODY ---")
print(repr(r.text[-200:]))