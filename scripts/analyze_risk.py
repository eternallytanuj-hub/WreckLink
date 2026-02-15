import json
import math
import os
from datetime import datetime

def analyze_risk():
    input_path = os.path.join(os.getcwd(), 'src/data/risk_zones.json')
    output_path = os.path.join(os.getcwd(), 'public/data/advanced_analytics.json')
    
    # Ensure output dir exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        with open(input_path, 'r') as f:
            zones = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {input_path}")
        return

    analytics_data = {
        "globalStats": {
            "totalIncidents": 0,
            "totalFatalities": 0,
            "mostDangerousZone": "",
            "yearTrend": {}
        },
        "zones": []
    }

    # Process each zone
    for zone in zones:
        # 1. Severity Score (0-10)
        # Weight fatalities higher than simple counts
        fatality_weight = 0.7
        incident_weight = 0.3
        
        # Normalize (assuming max fatalities in a zone ~1000 for scaling)
        severity = (min(zone['totalFatalities'] / 500, 1.0) * 10 * fatality_weight) + \
                   (min(zone['count'] / 50, 1.0) * 10 * incident_weight)
        
        severity = round(min(severity, 10.0), 1)

        # 2. Trend Analysis (Linear Regression Slope)
        years = []
        for crash in zone['crashes']:
            try:
                # Handle various date formats if necessary, but assuming MM/DD/YYYY based on sample
                if not crash['date']: continue
                dt = datetime.strptime(crash['date'], '%m/%d/%Y')
                years.append(dt.year)
                
                # Global Year Trend
                y_str = str(dt.year)
                analytics_data["globalStats"]["yearTrend"][y_str] = \
                    analytics_data["globalStats"]["yearTrend"].get(y_str, 0) + 1
            except (ValueError, TypeError):
                continue
        
        years.sort()
        
        # Simple trend (incidents per decade)
        trend_status = "Stable"
        if len(years) > 1:
            recent_count = len([y for y in years if y > 1990])
            old_count = len([y for y in years if y <= 1990])
            if recent_count > old_count:
                trend_status = "Increasing"
            elif recent_count < old_count:
                trend_status = "Decreasing"

        # 3. Drift Prediction (Mock Physics)
        # Generate a "Drift Vector" based on latitude
        lat = zone['lat']
        u_wind = 0
        v_wind = 0
        
        # Simple atmospheric circulation approximation
        if 0 <= abs(lat) < 30:
            # Trade winds (East to West)
            u_wind = -5.0 # m/s (Westward)
            v_wind = -2.0 if lat > 0 else 2.0 # Towards equator ideally
        elif 30 <= abs(lat) < 60:
            # Westerlies (West to East)
            u_wind = 8.0 # m/s (Eastward)
            v_wind = 2.0
        else:
            # Polar Easterlies
            u_wind = -3.0
            v_wind = -1.0

        analytics_data["zones"].append({
            "name": zone['name'],
            "lat": zone['lat'],
            "lon": zone['lon'],
            "severityScore": severity,
            "trend": trend_status,
            "primaryRisk": zone['primaryRisk'],
            "driftVector": {"u": u_wind, "v": v_wind},
            "fatalities": zone['totalFatalities'] 
        })

        analytics_data["globalStats"]["totalIncidents"] += zone['count']
        analytics_data["globalStats"]["totalFatalities"] += zone['totalFatalities']

    # Identify most dangerous
    if analytics_data["zones"]:
        most_dangerous = max(analytics_data["zones"], key=lambda x: x['severityScore'])
        analytics_data["globalStats"]["mostDangerousZone"] = most_dangerous['name']

    # Save
    with open(output_path, 'w') as f:
        json.dump(analytics_data, f, indent=2)
    
    print(f"Successfully generated analytics for {len(zones)} zones at {output_path}")

if __name__ == "__main__":
    analyze_risk()
