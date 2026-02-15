import os
import requests
import math

def get_weather_data(lat: float, lon: float) -> dict:
    """
    Fetches real-time weather data from OpenWeatherMap for the given coordinates.
    Returns a dictionary with wind components and other relevant data.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        print("Warning: OPENWEATHER_API_KEY not found. Using default wind model.")
        return None

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric"  # m/s for wind speed
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        # Extract wind data
        wind_speed = data.get("wind", {}).get("speed", 0) # m/s
        wind_deg = data.get("wind", {}).get("deg", 0)     # degrees (meteorological)

        # Convert meteorological wind direction (coming FROM) to mathematical (going TO)
        # Mathematical 0 is East, 90 is North.
        # Wind 0 deg (North) means blowing FROM North (blowing South) -> Math 270 (-90)
        # U = -speed * sin(deg)
        # V = -speed * cos(deg)
        
        wind_rad = math.radians(wind_deg)
        wind_u = -wind_speed * math.sin(wind_rad)
        wind_v = -wind_speed * math.cos(wind_rad)

        return {
            "wind_speed": wind_speed,
            "wind_deg": wind_deg,
            "wind_u": wind_u,
            "wind_v": wind_v,
            "description": data.get("weather", [{}])[0].get("description", "unknown"),
            "temp": data.get("main", {}).get("temp"),
            "source": "OpenWeatherMap (Real-time)"
        }

    except Exception as e:
        print(f"Weather API Error: {e}")
        return None
