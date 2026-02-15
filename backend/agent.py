
import os
import json
import math
import random
from datetime import datetime
from dotenv import load_dotenv

# Load Env (User must provide GROQ_API_KEY in .env)
# Load Env (User must provide GROQ_API_KEY in .env)
# Load Env (User must provide GROQ_API_KEY in .env)
# We use a try/except block to allow the app to run in "mock" mode if key is missing
try:
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv())
    from langchain_groq import ChatGroq
    from langchain_core.tools import tool
    from langchain.agents import create_tool_calling_agent, AgentExecutor
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_community.tools import DuckDuckGoSearchRun
    HAS_LANGCHAIN = True
except ImportError as e:
    HAS_LANGCHAIN = False
    print(f"LangChain/Groq/Community modules not found. Running in degradation mode. Error: {e}")

# --- TOOLS ---

def calculate_drift_physics(last_known_lat: float, last_known_lon: float, wind_u: float, wind_v: float, hours: float) -> dict:
    # ... (Keep existing implementation)
    """
    Core physics model for drift calculation (EKF-lite).
    Returns detailed intermediate steps for visualization.
    """
    R = 6371000  # Earth radius in meters
    
    # Simple drift model: position += velocity * time
    drift_lat_m = wind_v * 3600 * hours
    drift_lon_m = wind_u * 3600 * hours
    
    # Process noise (stochastic)
    noise_lat = random.gauss(0, 0.05)
    noise_lon = random.gauss(0, 0.05)
    
    # Coordinate conversion
    dlat = (drift_lat_m / R) * (180 / math.pi)
    dlon = (drift_lon_m / (R * math.cos(math.radians(last_known_lat)))) * (180 / math.pi)
    
    pred_lat = last_known_lat + dlat + noise_lat
    pred_lon = last_known_lon + dlon + noise_lon
    
    confidence = max(0, 100 - (hours * 2))
    
    return {
        "predicted_lat": round(pred_lat, 4),
        "predicted_lon": round(pred_lon, 4),
        "confidence": round(confidence, 1),
        "drift_vector_m": [round(drift_lat_m, 2), round(drift_lon_m, 2)],
        "process_noise": [round(noise_lat, 5), round(noise_lon, 5)],
        "dlat": round(dlat, 5),
        "dlon": round(dlon, 5)
    }

from weather_handler import get_weather_data

@tool
def ekf_trajectory(last_known_lat: float, last_known_lon: float, wind_u: float = None, wind_v: float = None, hours: float = 6.0) -> str:
    """
    Calculates the predicted crash zone using a simplified physics model (EKF-lite).
    Inputs:
    - last_known_lat/lon: Decimal degrees
    - wind_u/v: Zonal/Meridional wind components in m/s (Optional: Will fetch live data if omitted)
    - hours: Time elapsed since signal loss
    """
    
    source = "Static Model"
    
    # Fetch live weather if wind not provided (or if passed as 0 defaults by LLM)
    if wind_u is None and wind_v is None:
        weather = get_weather_data(last_known_lat, last_known_lon)
        if weather:
            wind_u = weather["wind_u"]
            wind_v = weather["wind_v"]
            source = f"Live Weather ({weather['description']}, {weather['wind_speed']}m/s)"
        else:
            # Fallback defaults
            wind_u = 10.0
            wind_v = 5.0
    
    # Ensure floats
    wind_u = float(wind_u) if wind_u is not None else 10.0
    wind_v = float(wind_v) if wind_v is not None else 5.0
            
    result = calculate_drift_physics(last_known_lat, last_known_lon, wind_u, wind_v, hours)
    
    return json.dumps({
        "predicted_lat": result["predicted_lat"],
        "predicted_lon": result["predicted_lon"],
        "confidence": f"{result['confidence']}%",
        "method": f"Physics-based Drift (EKF-lite) using {source}",
        "conditions": source
    })

@tool
def lookup_helpline_info(lat: float, lon: float) -> str:
    """
    Finds the nearest Maritime Rescue Coordination Center (MRCC) or emergency contact 
    based on the provided latitude and longitude.
    Returns JSON with 'country', 'agency', and 'number'.
    """
    # Comprehensive list of MRCCs and emergency contacts
    mrcc_database = [
        {"country": "USA", "agency": "US Coast Guard", "number": "+1-800-323-7233", "lat": 38.0, "lon": -77.0, "range": 5000}, # Changed to East/Central
        {"country": "USA (Pacific)", "agency": "US Coast Guard Pacific Area", "number": "+1-510-437-3701", "lat": 37.0, "lon": -122.0, "range": 3000},
        {"country": "UK", "agency": "HM Coastguard", "number": "999 / 112", "lat": 54.0, "lon": -2.0, "range": 1000},
        {"country": "Australia", "agency": "JRCC Australia", "number": "+61-2-6230-6811", "lat": -25.0, "lon": 133.0, "range": 4000},
        {"country": "New Zealand", "agency": "RCCNZ", "number": "+64-4-577-8030", "lat": -41.0, "lon": 174.0, "range": 2000},
        {"country": "China", "agency": "China MRCC", "number": "+86-10-6529-2218", "lat": 35.0, "lon": 104.0, "range": 3000},
        {"country": "India", "agency": "Indian Coast Guard", "number": "1554", "lat": 20.0, "lon": 78.0, "range": 3000},
        {"country": "Japan", "agency": "Japan Coast Guard", "number": "118", "lat": 36.0, "lon": 138.0, "range": 2000},
        {"country": "Brazil", "agency": "Salvamar Brasil", "number": "185", "lat": -14.0, "lon": -51.0, "range": 4000},
        {"country": "South Africa", "agency": "MRCC Cape Town", "number": "+27-21-938-3300", "lat": -30.0, "lon": 25.0, "range": 2500},
        {"country": "France", "agency": "CROSS Gris-Nez", "number": "+33-3-21-87-21-87", "lat": 46.0, "lon": 2.0, "range": 1500},
        {"country": "Spain", "agency": "Salvamento Marítimo", "number": "+34-900-202-202", "lat": 40.0, "lon": -4.0, "range": 1000},
        {"country": "Italy", "agency": "Guardia Costiera", "number": "1530", "lat": 41.0, "lon": 12.0, "range": 1000},
        {"country": "Canada", "agency": "JRCC Halifax/Victoria", "number": "1-800-567-5111", "lat": 56.0, "lon": -106.0, "range": 5000},
        {"country": "Russia", "agency": "MRCC Moscow", "number": "+7-495-626-10-52", "lat": 61.0, "lon": 105.0, "range": 6000},
        {"country": "Indonesia", "agency": "BASARNAS", "number": "115", "lat": -0.7, "lon": 113.9, "range": 3000},
        {"country": "Philippines", "agency": "Philippine Coast Guard", "number": "+63-2-527-3877", "lat": 12.8, "lon": 121.7, "range": 1500},
    ]

    # Cast to float to be safe
    lat = float(lat)
    lon = float(lon)

    # Find nearest
    nearest = None
    min_dist = float('inf')

    for entry in mrcc_database:
        # Simple Euclidean distance (good enough for this selection logic)
        dist = ((lat - entry["lat"])**2 + (lon - entry["lon"])**2)**0.5
        if dist < min_dist:
            min_dist = dist
            nearest = entry

    # Provide a fallback if somehow nothing matches (unlikely with this coverage)
    if not nearest:
         return "No internal database match found. Please use web search."

    return json.dumps({
        "country": nearest["country"],
        "agency": nearest["agency"],
        "number": nearest["number"],
        "distance_approx": f"{int(min_dist * 111)} km"
    })

@tool
def debris_ml_predict(region_name: str) -> str:
    """
    Simulates a query to a debris density ML model for a specific ocean region.
    Returns probability of debris findings based on historical currents.
    """
    # Mock ML Model Output
    base_probs = {
        "Indian Ocean": 0.85,
        "Pacific Ocean": 0.72,
        "Atlantic Ocean": 0.65
    }
    
    # Fuzzy match or default
    prob = 0.45
    for key, val in base_probs.items():
        if key.lower() in region_name.lower():
            prob = val
            break
            
    # Add some randomness
    prob += random.uniform(-0.05, 0.05)
    
    return json.dumps({
        "debris_probability": round(min(max(prob, 0), 0.99), 2),
        "model_version": "YOLO-v8-Ocean-Debris",
        "benchmark_accuracy": "92%"
    })

@tool
def analyze_terrain(lat: float, lon: float) -> str:
    """
    Analyzes the terrain at the given coordinates using search.
    Returns a description (e.g., "Ocean", "Desert", "Urban") and nearest landmark.
    """
    search = DuckDuckGoSearchRun()
    query = f"What is the geography and terrain at coordinates {lat}, {lon}? Is it ocean, desert, mountain, or city? Nearest landmark?"
    
    try:
        result = search.invoke(query)
        return result
    except Exception as e:
        return f"Terrain analysis failed: {e}"

# --- AGENT SETUP ---

def create_agent():
    if not HAS_LANGCHAIN:
        return None
    from langchain.agents import AgentExecutor

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("CRITICAL: GROQ_API_KEY not found in .env")
        return None

    llm_backend = os.getenv("LLM_BACKEND", "groq")

    if llm_backend == "ollama":
        try:
            from langchain_community.chat_models import ChatOllama
            llm = ChatOllama(model="llama3")
            print("Initialized Local Ollama Agent (llama3)")
        except ImportError:
            print("langchain_community not found or Ollama issue. Please install it.")
            return None
    elif api_key and api_key.startswith("xai-"):
        # Use OpenAI compatibility for xAI (Grok)
        try:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model="grok-2-latest",
                openai_api_key=api_key,
                openai_api_base="https://api.x.ai/v1",
                temperature=0
            )
            print("Initialized xAI Grok Agent")
        except ImportError:
            print("langchain_openai not found. Please install it.")
            return None
    else:
        # Use Groq Cloud
        llm = ChatGroq(
            temperature=0, 
            model_name="llama3-70b-8192", 
            groq_api_key=api_key
        )
        print("Initialized Groq Cloud Agent")

    search = DuckDuckGoSearchRun()
    
    # Wrap search in a structured tool if needed, or pass directly
    # Using 'tool' decorator or passing the class instance if compatible
    # But simpler to just use it as is if compatible with create_tool_calling_agent
    
    
    # Define analyze_terrain tool if not already present, or import it.
    # checking file content from step 2647, it is MISSING.
    # I need to add the tool definition before create_agent.
    
    tools = [lookup_helpline_info, ekf_trajectory, analyze_terrain, debris_ml_predict, search]

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an AI Flight Analyst specializing in crash site prediction and rescue coordination. "
                   "Use the provided tools to calculate drift vectors, debris probabilities, and find rescue contacts. "
                   "Always explain your reasoning clearly. "
                   "If the user asks for a helpline or rescue contact, FIRST use 'lookup_helpline_info'. "
                   "If the lookup returns a generic result or no match, THEN use the 'duckduckgo_search' tool to find the specific Maritime Rescue Coordination Center (MRCC) for that location. "
                   "After searching, return the Agency Name and Contact Number in JSON format. "
                   "If the user provides a location, FIRST infer the ocean region, THEN use the debris tool. "
                   "COMBINE the physics EKF result with the ML debris probability to give a final recommendation."),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    
    if llm_backend == "mock":
        # Mock Agent that returns static responses

        from langchain_core.runnables import RunnableLambda
        
        def mock_agent_run(input_dict):
            query = input_dict.get("input", "")
            if "helpline" in query.lower() or "mrcc" in query.lower():
                return {"output": json.dumps({"country": "Mock Region", "agency": "Mock Rescue Center", "number": "112-MOCK"})}
            elif "terrain" in query.lower():
                return {"output": "Mock Terrain: Rocky Mountains, Elevation 2400m. Nearest landmark: Mock Peak."}
            else:
                return {"output": "Mock AI Response: System verified. No anomalies detected."}
                
        agent_executor = RunnableLambda(mock_agent_run)
        print("Initialized MOCK Agent (No LLM required)")
        return agent_executor

    if llm_backend == "ollama":
        from langchain.agents import create_react_agent
        
        # Simple ReAct prompt
        react_prompt = ChatPromptTemplate.from_template("""Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}""")
        
        agent = create_react_agent(llm, tools, react_prompt)
    else:
        agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    return agent_executor


# Singleton instance
agent_instance = create_agent()

def _manual_fallback(query: str):
    """
    Attempts to manually extract coordinates from the query and look up helpline info.
    """
    import re
    # Look for typical lat/lon patterns in the query
    lat_match = re.search(r'Latitude\s*(-?\d+\.?\d*)', query, re.IGNORECASE)
    lon_match = re.search(r'Longitude\s*(-?\d+\.?\d*)', query, re.IGNORECASE)
    
    if lat_match and lon_match:
        try:
            lat = float(lat_match.group(1))
            lon = float(lon_match.group(1))
            # Call the tool directly
            result_json = lookup_helpline_info.invoke({"lat": lat, "lon": lon})
            return {"output": result_json}
        except Exception as e:
            print(f"Manual fallback error: {e}")

    return {
        "output": json.dumps({
            "country": "System Error",
            "agency": "AI Agent Unavailable (API Error/No Credits)",
            "number": "Please check API Key billing or .env",
            "fallback_failed": True
        })
    }

def run_agent(query: str):
    # 1. Try Agent if initialized
    if agent_instance:
        try:
            result = agent_instance.invoke({"input": query})
            return result
        except Exception as e:
            print(f"Agent runtime error: {e}. Switching to fallback.")
            # Fall through to fallback
            pass
    
    # 2. Fallback
    return _manual_fallback(query)

