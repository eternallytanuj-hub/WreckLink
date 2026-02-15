import { useState, useEffect, useCallback } from "react";
import { AircraftState, parseAircraftStates } from "@/lib/aviation";

export function useFlightData(refreshInterval = 30000) {
  const [aircraft, setAircraft] = useState<AircraftState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  /*
   * ADSB.lol API Implementation
   * Endpoint: /api/adsb/v2/point/{lat}/{lon}/{dist} (proxied to https://api.adsb.lol)
   * Returns: { ac: [ ...aircraft... ], ctime: number, msg: "No error", now: number, ... }
   */
  const fetchFlights = useCallback(async () => {
    try {
      // ADSB.lol API Implementation
      // ...
      // ADSB.lol point query with 1000nm radius for broad coverage
      // We'll use approx 15 strategic centers to cover major landmasses and air corridors.
      const regions = [
        // --- North America ---
        { lat: 38.0, lon: -120.0, dist: 1000 }, // US West
        { lat: 40.0, lon: -95.0, dist: 1000 },  // US Central
        { lat: 40.0, lon: -75.0, dist: 1000 },  // US East

        // --- South America ---
        { lat: 5.0, lon: -70.0, dist: 1000 },   // SA North
        { lat: -25.0, lon: -60.0, dist: 1000 }, // SA South

        // --- Europe & Africa ---
        { lat: 50.0, lon: 10.0, dist: 1000 },   // Europe Central
        { lat: 25.0, lon: 15.0, dist: 1000 },   // North Africa / Med
        { lat: 5.0, lon: 0.0, dist: 1000 },     // West Africa
        { lat: -25.0, lon: 25.0, dist: 1000 },  // South Africa
        { lat: 0.0, lon: 35.0, dist: 1000 },    // East Africa

        // --- Asia & Middle East ---
        { lat: 25.0, lon: 55.0, dist: 1000 },   // Middle East
        { lat: 22.0, lon: 79.0, dist: 1000 },   // India
        { lat: 15.0, lon: 100.0, dist: 1000 },  // SE Asia
        { lat: 35.0, lon: 135.0, dist: 1000 },  // East Asia

        // --- Oceania ---
        { lat: -25.0, lon: 135.0, dist: 1000 }, // Australia
        { lat: -40.0, lon: 175.0, dist: 1000 }, // New Zealand
      ];

      const fetchRegion = async (r: { lat: number, lon: number, dist: number }): Promise<any[]> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(
            `/api/adsb/v2/point/${r.lat}/${r.lon}/${r.dist}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
          if (!res.ok) return [];
          const data = await res.json();
          // ADSB.lol returns object with 'ac' array
          return data.ac || [];
        } catch {
          return [];
        }
      };

      const results = await Promise.all(regions.map(fetchRegion));
      const allAircraftRaw = results.flat();

      // Deduplicate based on 'hex'
      const seen = new Set<string>();
      const uniqueRaw = allAircraftRaw.filter((a) => {
        if (!a.hex) return false;
        if (seen.has(a.hex)) return false;
        seen.add(a.hex);
        return true;
      });

      // Parse to internal AircraftState
      const parsed = parseAircraftStates(uniqueRaw);

      if (parsed.length > 0) {
        setAircraft(parsed);
        setLastUpdate(new Date());
        setError(null);
      } else {
        // If empty, it might be just low traffic or API issue, but less likely to be rate limited
        if (uniqueRaw.length === 0) {
          setError("No aircraft found in monitored regions.");
        }
      }
    } catch (err: any) {
      console.error("Flight data fetch error:", err);
      setError(err.message || "Failed to fetch flight data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchFlights, refreshInterval]);

  return { aircraft, loading, error, lastUpdate, refetch: fetchFlights };
}
