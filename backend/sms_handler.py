import os
from twilio.rest import Client

def send_crash_alert(lat: float, lon: float, flight_id: str, wind_data: str = "Unknown") -> dict:
    """
    Sends a critical MAYDAY SMS to the registered emergency contact.
    Target Number: +919267930214
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    to_number = "+919267930214"

    if not all([account_sid, auth_token, from_number]):
        print(f"\n{'='*30}\n 🚨 [MOCK SMS ALERT] (Twilio Creds Missing)\n 📲 Sending to: {to_number}\n 🚁 Flight: {flight_id}\n 📍 Loc: {lat:.4f}, {lon:.4f}\n 🌪 Wind: {wind_data}\n{'='*30}\n")
        return {"status": "mock_sent", "message": f"Simulated SMS sent to {to_number}"}

    try:
        client = Client(account_sid, auth_token)

        body = (
            f"🚨 MAYDAY ALERT 🚨\n\n"
            f"Flight {flight_id} has declared an emergency.\n"
            f"📍 Crash Site: {lat:.4f}, {lon:.4f}\n"
            f"🌪 Wind: {wind_data}\n"
            f"📡 Status: Signal Lost (Simulated)\n\n"
            f"Immediate SAR dispatch requested."
        )

        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number
        )

        return {"status": "sent", "sid": message.sid}

    except Exception as e:
        print(f"Twilio SMS Error: {e}")
        return {"status": "error", "message": str(e)}
