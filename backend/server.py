
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
import json

# Add current dir to path to find agent
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent import run_agent, ekf_trajectory, calculate_drift_physics
from ais_handler import fetch_nearby_ships

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    query: str
    lat: float
    lon: float

@app.get("/")
def health_check():
    return {"status": "AI Agent Online", "model": "Llama-3-70b via Groq"}

@app.post("/predict")
def predict_crash_zone(request: PredictRequest):
    """
    Endpoint for the AI Agent.
    Receives current signal loss location and runs the agent to predict crash site.
    """
    try:
        # Construct a natural language query for the agent if not provided specifically
        full_query = (
            f"{request.query} "
            f"The last known position was Latitude {request.lat}, Longitude {request.lon}. "
            f"Assume a wind vector of 10 m/s North-East for 6 hours drift."
        )
        
        result = run_agent(full_query)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SimulationRequest(BaseModel):
    lat: float
    lon: float
    radius: int = 300

from weather_handler import get_weather_data

@app.post("/simulate-drift")
def simulate_drift_physics(request: SimulationRequest):
    """
    Returns the raw physics calculation steps for visualization.
    Fetches real-time weather for accuracy.
    """
    try:
        # Defaults
        wind_u = 12.5
        wind_v = 4.2
        source = "Static Fallback"
        
        # Try to get real weather
        weather = get_weather_data(request.lat, request.lon)
        if weather:
            wind_u = weather["wind_u"]
            wind_v = weather["wind_v"]
            source = f"Live: {weather['description']} ({weather['wind_speed']} m/s)"
            
        hours = 4.5
        
        physics_data = calculate_drift_physics(request.lat, request.lon, wind_u, wind_v, hours)
        
        return {
            "physics": physics_data,
            "inputs": {
                "wind_u_ms": round(wind_u, 2),
                "wind_v_ms": round(wind_v, 2),
                "drift_hours": hours,
                "source": source
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ships")
async def get_nearby_ships(request: SimulationRequest):
    """
    Fetches real-time ship data from AISStream.io near the crash site.
    """
    try:
        ships = await fetch_nearby_ships(request.lat, request.lon, request.radius)
        
        # Sort by distance
        ships.sort(key=lambda x: x["distance_km"])
        
        return {"ships": ships, "count": len(ships)}
    except Exception as e:
        print(f"AIS Error: {e}")
        # Return empty list on error instead of 500 to avoid breaking UI
        return {"ships": [], "count": 0, "error": str(e)}

class HelplineRequest(BaseModel):
    lat: float
    lon: float

@app.post("/api/rescue-helpline")
def get_rescue_helpline(request: HelplineRequest):
    """
    Uses the AI agent to find the nearest rescue coordination center.
    """
    try:
        # Prompt the agent to use its lookup tool
        prompt = (
            f"Find the nearest Maritime Rescue Coordination Center (MRCC) for Latitude {request.lat}, Longitude {request.lon}. "
            f"Use the lookup_helpline_info tool."
            f"Return ONLY a JSON object with keys: 'country', 'agency', 'number'. "
            f"Do not include any other text."
        )
        
        result = run_agent(prompt)
        
        # Attempt to parse JSON from agent output if it's a string
        output = result.get("output", "{}")
        try:
            # Clean up potential markdown code blocks
            clean_output = output.replace("```json", "").replace("```", "").strip()
            # Sometimes agent returns text before JSON, try to find the JSON brackes
            if "{" in clean_output:
                clean_output = clean_output[clean_output.find("{"):clean_output.rfind("}")+1]
                
            data = json.loads(clean_output)
            return data
        except:
            # Fallback if parsing fails - try to extract from raw output or use default
            return {
                "country": "Unknown Region",
                "agency": "Global Distress Channel",
                "number": "112",
                "raw_output": output
            }
            
    except Exception as e:
        print(f"Agent Error: {e}")
        return {
            "country": "Error",
            "agency": "System Failure",
            "number": "N/A"
        }

from sms_handler import send_crash_alert
from agent import analyze_terrain

class ValidationRequest(BaseModel):
    lat: float
    lon: float

class AlertRequest(BaseModel):
    lat: float
    lon: float
    flight_id: str
    wind_data: str = "Unknown"

@app.post("/api/send-alert")
def trigger_sms_alert(request: AlertRequest):
    """
    Triggers an SMS alert for the simulated crash.
    """
    return send_crash_alert(request.lat, request.lon, request.flight_id, request.wind_data)

@app.post("/api/recon")
def get_recon_data(request: ValidationRequest):
    """
    Analyzes terrain and location context.
    Using ValidationRequest (lat/lon) for simplicity.
    """
    try:
        # We can call the tool directly as a function since it's a @tool
        # But @tool makes it a StructuredTool object.
        # We can access the underlying function or invoke it.
        # Simplest is to just invoke it if it was designed as a standalone, 
        # but here we can just use the function logic or better yet, asking the agent or just search.
        # Actually, let's just use the logic inside valid for direct call if we extracted it, 
        # but since it's wrapped, let's just use the search directly here or call the agent.
        # Calling the agent might be overkill for just a search, but let's use the tool we defined.
        
        # Accessing the func from the tool
        result = analyze_terrain.invoke({"lat": request.lat, "lon": request.lon})
        return {"recon": result}
    except Exception as e:
        return {"recon": "Recon unavailable", "error": str(e)}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
