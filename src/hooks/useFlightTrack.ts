import { useState, useEffect } from "react";

export interface FlightTrack {
    time: number | null;
    latitude: number | null;
    longitude: number | null;
    baro_altitude: number | null;
    true_track: number | null;
    on_ground: boolean;
}

const AVIATION_STACK_KEY = "f942e34732be256427d4a1c2eb6f0794";

export function useFlightTrack(icao24: string | null, callsign: string | null = null) {
    const [path, setPath] = useState<[number, number][]>([]); // Actual flown path
    const [plannedPath, setPlannedPath] = useState<[number, number][]>([]); // Planned / Deviated path
    const [loading, setLoading] = useState(false);
    const [flightInfo, setFlightInfo] = useState<{
        origin: string | null;
        destination: string | null;
        originLat?: number;
        originLon?: number;
        destLat?: number;
        destLon?: number;
    } | null>(null);

    useEffect(() => {
        if (!icao24) {
            setPath([]);
            setPlannedPath([]);
            setFlightInfo(null);
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Actual Trace (ADSB.lol)
                // Using the v2 trace endpoint
                const traceRes = await fetch(`/api/adsb/v2/trace/${icao24}`);
                if (traceRes.ok) {
                    const traceData = await traceRes.json();
                    if (traceData.trace) {
                        // ADSB.lol trace format: [time, lat, lon, alt, speed, track, flags, ...]
                        const validPoints = traceData.trace
                            .filter((t: any[]) => t[1] && t[2]) // Filter invalid lat/lon
                            .map((t: any[]) => [t[1], t[2]] as [number, number]);
                        setPath(validPoints);
                    }
                }

                // 2. Fetch Planned Route Info (AviationStack)
                // 2. Fetch Planned Route Info (AviationStack)
                if (callsign) {
                    const asRes = await fetch(`/api/aviationstack/v1/flights?access_key=${AVIATION_STACK_KEY}&flight_icao=${callsign.trim()}&limit=1`);

                    if (asRes.ok) {
                        const asData = await asRes.json();

                        if (asData.data && asData.data.length > 0) {
                            const flight = asData.data[0];
                            const dep = flight.departure;
                            const arr = flight.arrival;

                            let originLat = null, originLon = null;
                            let destLat = null, destLon = null;

                            // Helper to fetch airport coords
                            const fetchAirport = async (code: string, type: 'iata' | 'icao') => {
                                try {
                                    const param = type === 'iata' ? 'iata_code' : 'icao_code';
                                    const res = await fetch(`/api/aviationstack/v1/airports?access_key=${AVIATION_STACK_KEY}&${param}=${code}`);
                                    if (res.ok) {
                                        const data = await res.json();
                                        if (data.data && data.data.length > 0) {
                                            return {
                                                lat: parseFloat(data.data[0].latitude),
                                                lon: parseFloat(data.data[0].longitude),
                                                name: data.data[0].airport_name
                                            };
                                        }
                                    }
                                } catch (e) { console.error("Airport fetch failed", e); }
                                return null;
                            };

                            // We need coordinates. Flight object might NOT have them.
                            // If they are missing, fetch them using IATA or ICAO codes.

                            // Origin
                            if (dep?.iata) {
                                const coords = await fetchAirport(dep.iata, 'iata');
                                if (coords) { originLat = coords.lat; originLon = coords.lon; }
                            } else if (dep?.icao) {
                                const coords = await fetchAirport(dep.icao, 'icao');
                                if (coords) { originLat = coords.lat; originLon = coords.lon; }
                            }

                            // Destination
                            if (arr?.iata) {
                                const coords = await fetchAirport(arr.iata, 'iata');
                                if (coords) { destLat = coords.lat; destLon = coords.lon; }
                            } else if (arr?.icao) {
                                const coords = await fetchAirport(arr.icao, 'icao');
                                if (coords) { destLat = coords.lat; destLon = coords.lon; }
                            }

                            if (originLat && originLon && destLat && destLon) {
                                setFlightInfo({
                                    origin: dep.airport || dep.iata || dep.icao,
                                    destination: arr.airport || arr.iata || arr.icao,
                                    originLat: originLat,
                                    originLon: originLon,
                                    destLat: destLat,
                                    destLon: destLon,
                                });

                                setPlannedPath([
                                    [originLat, originLon],
                                    [destLat, destLon]
                                ]);
                            } else {
                                // Partial info or still missing - render what we can or just info
                                setFlightInfo({
                                    origin: dep?.airport || dep?.iata || dep?.icao || "Unknown",
                                    destination: arr?.airport || arr?.iata || arr?.icao || "Unknown",
                                    originLat: originLat || undefined,
                                    originLon: originLon || undefined,
                                    destLat: destLat || undefined,
                                    destLon: destLon || undefined,
                                });
                            }
                        }
                    }
                }

            } catch (err) {
                console.error("Flight track fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [icao24, callsign]);

    return { path, plannedPath, flightInfo, loading };
}
