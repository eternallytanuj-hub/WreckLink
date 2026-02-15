export interface AircraftState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  sensors: number[] | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  signalLost?: boolean;
}

export interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null)[][] | null;
}

export function parseAircraftStates(data: any): AircraftState[] {
  if (Array.isArray(data)) {
    const now = Date.now() / 1000;
    return data.map((ac: any) => {
      const lastContact = ac.seen ? (now - ac.seen) : now;
      return {
        icao24: ac.hex,
        callsign: ac.flight ? ac.flight.trim() : null,
        originCountry: "Unknown",
        timePosition: now,
        lastContact: lastContact,
        longitude: ac.lon || null,
        latitude: ac.lat || null,
        baroAltitude: typeof ac.alt_baro === 'number' ? ac.alt_baro * 0.3048 : null,
        onGround: false,
        velocity: typeof ac.gs === 'number' ? ac.gs * 0.514444 : null,
        trueTrack: ac.track || null,
        verticalRate: ac.baro_rate || null,
        sensors: null,
        geoAltitude: typeof ac.alt_geom === 'number' ? ac.alt_geom * 0.3048 : null,
        squawk: ac.squawk || null,
        spi: false,
        positionSource: 0,
        signalLost: ac.seen > 60
      };
    }).filter((a: any) => a.latitude !== null && a.longitude !== null);
  }
  return [];
}

export function getAltitudeColor(altitude: number | null): string {
  if (altitude === null) return "#888888";
  if (altitude < 1000) return "#00ff88";
  if (altitude < 5000) return "#00ddff";
  if (altitude < 10000) return "#00aaff";
  if (altitude < 20000) return "#ffaa00";
  if (altitude < 30000) return "#ff6600";
  return "#ff2200";
}

export const highRiskZones = [
  { name: "Bermuda Triangle", lat: 25.0, lng: -71.0, radius: 500000, incidents: 75 },
  { name: "Alps Region", lat: 46.5, lng: 8.0, radius: 200000, incidents: 42 },
  { name: "Andes Mountains", lat: -15.0, lng: -70.0, radius: 300000, incidents: 38 },
  { name: "Indonesian Archipelago", lat: -5.0, lng: 115.0, radius: 400000, incidents: 55 },
  { name: "Congo Basin", lat: 0.0, lng: 25.0, radius: 350000, incidents: 30 },
  { name: "Himalayas", lat: 28.0, lng: 85.0, radius: 250000, incidents: 35 },
  { name: "Gulf of Guinea", lat: 3.0, lng: 3.0, radius: 300000, incidents: 28 },
  { name: "Sea of Japan", lat: 40.0, lng: 135.0, radius: 200000, incidents: 22 },
];
