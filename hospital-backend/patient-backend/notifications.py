import requests

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_notification(push_token: str, title: str, body: str):
    if not push_token:
        print("No push token on file — skipping notification")
        return
    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json={
                "to": push_token,
                "title": title,
                "body": body,
                "sound": "default",
            },
            headers={"Content-Type": "application/json"},
        )
        print(f"Push notification sent: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Failed to send push notification: {e}")