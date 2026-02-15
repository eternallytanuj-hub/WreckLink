import requests
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

try:
    from backend.weather_handler import get_weather_data
except ImportError:
    # Try local import if running from backend dir
    sys.path.append(os.getcwd())
    from weather_handler import get_weather_data

def test_direct_weather_fetch():
    print("\n--- Testing Direct Weather Fetch ---")
    # San Francisco coordinates
    lat, lon = 37.7749, -122.4194
    
    data = get_weather_data(lat, lon)
    
    if data:
        print("SUCCESS: Weather data fetched.")
        print(f"Description: {data['description']}")
        print(f"Wind Speed: {data['wind_speed']} m/s")
        print(f"Wind Deg: {data['wind_deg']}°")
        print(f"Calculated U: {data['wind_u']:.2f}")
        print(f"Calculated V: {data['wind_v']:.2f}")
        return True
    else:
        print("FAILURE: Could not fetch weather data.")
        return False

def test_simulation_endpoint():
    print("\n--- Testing Simulation Endpoint ---")
    url = "http://localhost:8000/simulate-drift"
    payload = {
        "lat": 37.7749,
        "lon": -122.4194,
        "radius": 300
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        inputs = data.get("inputs", {})
        source = inputs.get("source", "")
        
        print(f"Source reported by API: {source}")
        print(f"Wind U used: {inputs.get('wind_u_ms')}")
        print(f"Wind V used: {inputs.get('wind_v_ms')}")
        
        if "Live" in source or "OpenWeatherMap" in source:
            print("SUCCESS: Endpoint is using live weather data.")
            return True
        else:
            print("FAILURE: Endpoint is NOT using live weather data.")
            return False
            
    except Exception as e:
        print(f"Endpoint test error: {e}")
        return False

if __name__ == "__main__":
    success_direct = test_direct_weather_fetch()
    success_endpoint = test_simulation_endpoint()
    
    if success_direct and success_endpoint:
        print("\nALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\nTESTS FAILED")
        sys.exit(1)
