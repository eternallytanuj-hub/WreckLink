import asyncio
import json
import websockets
from datetime import datetime
import os
import math
import ssl

# AISStream API Key
API_KEY = "66abbba48159a809cb31be6019067fb19bdeb031"

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

async def fetch_nearby_ships(lat, lon, radius_km=300):
    """
    Connects to AISStream.io, listens for 3 seconds, and returns unique ships
    within the specified radius.
    """
    ships = {}
    
    # Calculate bounding box (approximate 1 deg = 111km)
    # Increase to 3 degrees (~330km) to ensure we find ships even in open ocean
    min_lat = lat - 3.0
    max_lat = lat + 3.0
    min_lon = lon - 3.0
    max_lon = lon + 3.0

    subscription_message = {
        "Apikey": API_KEY,
        "BoundingBoxes": [[
            [min_lat, min_lon],
            [max_lat, max_lon]
        ]],
        "FiltersShipMMSI": [], # Optional: Filter by specific MMSI
        "FilterMessageTypes": ["PositionReport"] # Focus on position reports
    }

    async def connect_and_listen():
        uri = "wss://stream.aisstream.io/v0/stream"
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # print(f"Connecting to AIS Stream with bbox: {min_lat}, {min_lon} to {max_lat}, {max_lon}")
        try:
            async with websockets.connect(uri, ssl=ssl_context) as websocket:
                await websocket.send(json.dumps(subscription_message))
                # print("Subscribed to AIS Stream...")
                
                # Listen for 3.0 seconds to gather a snapshot
                end_time = asyncio.get_event_loop().time() + 3.0
                
                while asyncio.get_event_loop().time() < end_time:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                        data = json.loads(message)
                        
                        if "Message" in data and "PositionReport" in data["Message"]:
                            report = data["Message"]["PositionReport"]
                            meta = data["MetaData"]
                            
                            mmsi = report["UserID"]
                            ship_lat = report["Latitude"]
                            ship_lon = report["Longitude"]
                            
                            # Calculate distance
                            dist = haversine_distance(lat, lon, ship_lat, ship_lon)
                            
                            if dist <= radius_km:
                                ships[mmsi] = {
                                    "mmsi": mmsi,
                                    "name": meta.get("ShipName", f"Unknown Vessel {mmsi}").strip(),
                                    "lat": ship_lat,
                                    "lon": ship_lon,
                                    "distance_km": round(dist, 2),
                                    "type": "Ship",
                                    "callsign": meta.get("CallSign", "N/A"),
                                    "contact": f"MMSI: {mmsi} // VHF Ch. 16"
                                }
                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        print(f"Frame error: {e}")
                        break
                        
        except Exception as e:
            print(f"Connection error: {e}")
            
    await connect_and_listen()
    return list(ships.values())

# ... (Moving to top)
