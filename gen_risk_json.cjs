const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'Airplane_Crashes_and_Fatalities_Since_1908.csv');
const outputPath = path.join(__dirname, 'src/data/risk_zones.json');

// Manual Geocoding Map for Top Locations
const locationMap = {
    "Sao Paulo, Brazil": { lat: -23.5505, lon: -46.6333 },
    "Moscow, Russia": { lat: 55.7558, lon: 37.6173 },
    "Rio de Janeiro, Brazil": { lat: -22.9068, lon: -43.1729 },
    "Bogota, Colombia": { lat: 4.7110, lon: -74.0721 },
    "Manila, Philippines": { lat: 14.5995, lon: 120.9842 },
    "Anchorage, Alaska": { lat: 61.2181, lon: -149.9003 },
    "New York, New York": { lat: 40.7128, lon: -74.0060 },
    "Cairo, Egypt": { lat: 30.0444, lon: 31.2357 },
    "Chicago, Illinois": { lat: 41.8781, lon: -87.6298 },
    "Near Moscow, Russia": { lat: 55.5, lon: 37.6 }, // Slightly offset
    "Atlantic Ocean": { lat: 25.0, lon: -40.0 }, // General area
    "Tehran, Iran": { lat: 35.6892, lon: 51.3890 },
    "Paris, France": { lat: 48.8566, lon: 2.3522 },
    "Amsterdam, Netherlands": { lat: 52.3676, lon: 4.9041 },
    "Denver, Colorado": { lat: 39.7392, lon: -104.9903 },
    "Ankara, Turkey": { lat: 39.9334, lon: 32.8597 },
    "Rome, Italy": { lat: 41.9028, lon: 12.4964 },
    "Cleveland, Ohio": { lat: 41.4993, lon: -81.6944 },
    "Bucharest, Romania": { lat: 44.4268, lon: 26.1025 },
    "Burbank, California": { lat: 34.1808, lon: -118.3089 }
};

function parseCSV(text) {
    const result = [];
    const lines = text.split('\n');
    const headers = lines[0].split(','); // Naive header split

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Improved regex for CSV parsing to handle quoted commas
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // The above regex is imperfect for empty fields. Let's use a standard char loop.

        const row = [];
        let current = '';
        let inQuote = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') { inQuote = !inQuote; continue; }
            if (char === ',' && !inQuote) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());

        // Map to friendly object
        // Date,Time,Location,Operator,Flight #,Route,Type,Registration,cn/In,Aboard,Fatalities,Ground,Summary
        if (row.length > 2) {
            result.push({
                date: row[0],
                location: row[2],
                operator: row[3],
                type: row[6],
                fatalities: row[10],
                summary: row[12]
            });
        }
    }
    return result;
}

const rawData = fs.readFileSync(csvPath, 'utf8');
const crashes = parseCSV(rawData);

const riskZones = {};

crashes.forEach(crash => {
    let loc = crash.location;
    if (!loc) return;

    // Normalize location key
    const key = Object.keys(locationMap).find(k => loc.includes(k) || k.includes(loc));

    if (key) {
        if (!riskZones[key]) {
            riskZones[key] = {
                name: key,
                lat: locationMap[key].lat,
                lon: locationMap[key].lon,
                count: 0,
                totalFatalities: 0,
                crashes: [],
                causes: {} // For analyzing "why"
            };
        }

        const zone = riskZones[key];
        zone.count++;
        zone.totalFatalities += parseInt(crash.fatalities) || 0;

        // Add crash snippet (limit to 5 most recent for detail view, or all for filtering)
        zone.crashes.push({
            date: crash.date,
            operator: crash.operator,
            fatalities: crash.fatalities,
            summary: crash.summary
        });

        // Simple keyword extraction for "Cause"
        if (crash.summary) {
            const lowerSum = crash.summary.toLowerCase();
            if (lowerSum.includes('fog')) zone.causes['Fog'] = (zone.causes['Fog'] || 0) + 1;
            if (lowerSum.includes('mountain')) zone.causes['Mountainous Terrain'] = (zone.causes['Mountainous Terrain'] || 0) + 1;
            if (lowerSum.includes('engine')) zone.causes['Engine Failure'] = (zone.causes['Engine Failure'] || 0) + 1;
            if (lowerSum.includes('storm') || lowerSum.includes('rain') || lowerSum.includes('snow')) zone.causes['Severe Weather'] = (zone.causes['Severe Weather'] || 0) + 1;
            if (lowerSum.includes('stall')) zone.causes['Stall'] = (zone.causes['Stall'] || 0) + 1;
            if (lowerSum.includes('shot down')) zone.causes['Conflict'] = (zone.causes['Conflict'] || 0) + 1;
            if (lowerSum.includes('fire')) zone.causes['Fire'] = (zone.causes['Fire'] || 0) + 1;
        }
    }
});

// Post-process to determine primary risk factor
const output = Object.values(riskZones).map(z => {
    let topCause = "Unknown";
    let max = 0;
    Object.entries(z.causes).forEach(([cause, count]) => {
        if (count > max) {
            max = count;
            topCause = cause;
        }
    });

    // Calculate intensity (0-1) based on count relative to max observed (approx 15)
    const intensity = Math.min(z.count / 15, 1);

    return {
        ...z,
        primaryRisk: topCause,
        riskIntensity: intensity,
        description: `High risk zone with ${z.count} recorded incidents. Primary factor: ${topCause}.`
    };
});

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Risk zones data generated at ${outputPath}`);
