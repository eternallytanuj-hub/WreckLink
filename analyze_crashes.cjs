const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'Airplane_Crashes_and_Fatalities_Since_1908.csv');
const content = fs.readFileSync(csvPath, 'utf8');

// Simple CSV parser handling quotes
function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const row = [];
        let currentField = '';
        let insideQuotes = false;

        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                row.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        row.push(currentField.trim());
        result.push(row);
    }
    return result;
}

const data = parseCSV(content);
const locationCounts = {};

data.forEach(row => {
    // Location is index 2
    let loc = row[2];
    if (loc) {
        // Clean up location (remove quotes if still present, trim)
        loc = loc.replace(/^"|"$/g, '').trim();
        if (loc) {
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
    }
});

const sortedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

console.log("Top 20 Crash Locations:");
sortedLocations.forEach(([loc, count]) => {
    console.log(`${loc}: ${count}`);
});
