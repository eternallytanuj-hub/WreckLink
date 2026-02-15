import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AircraftState, getAltitudeColor } from "@/lib/aviation";
import riskZonesData from "@/data/risk_zones.json";
import { useFlightTrack } from "@/hooks/useFlightTrack";

interface FlightMapProps {
  aircraft: AircraftState[];
  selectedAircraft: AircraftState | null;
  onSelectAircraft: (a: AircraftState | null) => void;
  showRiskZones: boolean;
  showFlightPaths: boolean;
}

function createPlaneIcon(rotation: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:rotate(${rotation ?? 0}deg);color:${color};font-size:14px;filter:drop-shadow(0 0 6px ${color}80);line-height:1;transition:transform 0.3s;">✈</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function FlightMap({
  aircraft,
  selectedAircraft,
  onSelectAircraft,
  showRiskZones,
}: FlightMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const riskLayerRef = useRef<L.LayerGroup | null>(null);

  // useFlightTrack hook with callsign support
  const { path, plannedPath, flightInfo } = useFlightTrack(
    selectedAircraft?.icao24 || null,
    selectedAircraft?.callsign || null,
    selectedAircraft ? {
      lat: selectedAircraft.latitude,
      lon: selectedAircraft.longitude,
      heading: selectedAircraft.trueTrack
    } : null
  );

  const pathRef = useRef<L.Polyline | null>(null);
  const plannedPathRef = useRef<L.Polyline | null>(null);
  const routeMarkersRef = useRef<L.LayerGroup | null>(null);
  const selectionLayerRef = useRef<L.LayerGroup | null>(null);

  // Map State for LOD
  const [zoom, setZoom] = useState(4);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true, // IMPORTANT: Use Canvas renderer by default
    });

    // Use a dark blue-tinted tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 18 }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    riskLayerRef.current = L.layerGroup().addTo(map);
    selectionLayerRef.current = L.layerGroup().addTo(map);
    routeMarkersRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Track zoom and bounds for LOD
    const updateMapState = () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    };

    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);

    // Initial state
    updateMapState();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers with LOD
  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;

    const map = mapRef.current;
    const group = markersRef.current;

    // Clear existing
    group.clearLayers();

    // LOD Logic
    const isHighZoom = zoom >= 7; // Switch to icons at zoom 7+

    // Performance: If low zoom, render mostly dots. If high zoom, render icons but ONLY in bounds.

    const visibleAircraft = aircraft.filter(a => {
      if (!a.latitude || !a.longitude) return false;
      // In high zoom, strict bounds check
      if (isHighZoom && bounds) {
        return bounds.contains([a.latitude, a.longitude]);
      }
      return true;
    });

    if (isHighZoom) {
      // High Detail: Render DOM icons (but only for visible)
      visibleAircraft.forEach((a) => {
        if (a.latitude === null || a.longitude === null) return;

        const isSignalLost = a.signalLost;
        const color = isSignalLost ? "#ff3333" : getAltitudeColor(a.baroAltitude);

        const iconHtml = isSignalLost
          ? `<div style="font-size:16px;filter:drop-shadow(0 0 8px ${color});animation:pulse 1s infinite;">⚠️</div>`
          : `<div style="transform:rotate(${a.trueTrack ?? 0}deg);color:${color};font-size:14px;filter:drop-shadow(0 0 6px ${color}80);line-height:1;transition:transform 0.3s;">✈</div>`;

        const icon = L.divIcon({
          className: "",
          html: iconHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([a.latitude, a.longitude], { icon })
          .on("click", () => onSelectAircraft(a))
          .bindTooltip(
            // Tooltip content (same as before)
            `<div class="flight-tt">
                  <div class="flight-tt-header" style="color:${isSignalLost ? '#ff3333' : ''}">
                    ${isSignalLost ? '⚠️ ' : ''}${a.callsign || a.icao24.toUpperCase()}
                  </div>
                  ${isSignalLost ? '<div class="flight-tt-row"><span style="color:#ff3333">STATUS</span><span style="color:#ff3333;font-weight:bold">SIGNAL LOST</span></div>' : ''}
                  <div class="flight-tt-row"><span>ALT</span><span style="color:${color}">${a.baroAltitude ? Math.round(a.baroAltitude) + "m" : "N/A"}</span></div>
                  <div class="flight-tt-row"><span>SPD</span><span>${a.velocity ? Math.round(a.velocity * 3.6) + "km/h" : "N/A"}</span></div>
                  <div class="flight-tt-row"><span>FROM</span><span>${a.originCountry}</span></div>
                </div>`,
            { direction: "top", className: "flight-tooltip-custom", offset: [0, -6] }
          );

        group.addLayer(marker);
      });
    } else {
      // Low Detail: Render Canvas CircleMarkers (much faster)
      visibleAircraft.forEach((a) => {
        if (a.latitude === null || a.longitude === null) return;
        const isSignalLost = a.signalLost;
        const color = isSignalLost ? "#ff3333" : getAltitudeColor(a.baroAltitude);

        const marker = L.circleMarker([a.latitude, a.longitude], {
          radius: 2, // Small dot
          color: color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 0, // No border stroke for performance
          interactive: true // Still clickable
        })
          .on("click", () => onSelectAircraft(a)); // Clickable!

        // Simple tooltip for dots
        marker.bindTooltip(
          `${a.callsign || a.icao24}`,
          { direction: "top", className: "flight-tooltip-custom", offset: [0, -5] }
        );

        group.addLayer(marker);
      });
    }

  }, [aircraft, onSelectAircraft, zoom, bounds]);

  // Risk zones
  // Risk Zones from CSV Data
  useEffect(() => {
    if (!mapRef.current || !riskLayerRef.current) return;

    riskLayerRef.current.clearLayers();

    if (showRiskZones) {
      riskZonesData.forEach((zone: any) => {
        // Color based on primary risk factor
        let color = '#ff0000'; // Default red
        if (zone.primaryRisk === 'Severe Weather' || zone.primaryRisk === 'Fog') color = '#ff8800'; // Orange for weather
        if (zone.primaryRisk === 'Mountainous Terrain') color = '#884400'; // Brown for terrain

        const circle = L.circle([zone.lat, zone.lon], {
          color: color,
          fillColor: color,
          fillOpacity: 0.1,
          radius: 100000 * (0.5 + zone.riskIntensity), // Scale radius by intensity
          weight: 1,
          dashArray: "4 4"
        }).addTo(riskLayerRef.current!);

        // Detail popup
        const details = zone.crashes.slice(0, 3).map((c: any) =>
          `<li style="margin-bottom: 4px;"><b>${c.date}:</b> ${c.summary ? c.summary.substring(0, 80) + '...' : 'No details'}</li>`
        ).join('');

        circle.bindTooltip(
          `<div style="min-width: 200px; font-family: monospace;">
            <h3 style="margin: 0 0 5px; color: ${color}; font-weight: bold; font-size: 14px; text-transform: uppercase;">⚠ ${zone.name}</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
              <span>Risk Level:</span> <span style="font-weight: bold;">${(zone.riskIntensity * 10).toFixed(1)}/10</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
              <span>Factor:</span> <span style="font-weight: bold;">${zone.primaryRisk}</span>
            </div>
             <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
              <span>Incidents:</span> <span style="font-weight: bold;">${zone.count}</span>
            </div>
            <hr style="opacity: 0.2; margin: 5px 0; border: 0; border-top: 1px solid #ccc;">
            <ul style="padding-left: 15px; margin: 0; font-size: 11px; opacity: 0.8;">
              ${details}
            </ul>
          </div>`,
          {
            direction: "top",
            className: "flight-tooltip-custom",
            opacity: 1
          }
        );
      });
    }
  }, [showRiskZones]);

  // Update Flight Paths
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous
    if (pathRef.current) { pathRef.current.remove(); pathRef.current = null; }
    if (plannedPathRef.current) { plannedPathRef.current.remove(); plannedPathRef.current = null; }
    if (routeMarkersRef.current) { routeMarkersRef.current.clearLayers(); }

    if (!selectedAircraft) return;

    // 1. Render Actual Flown Path (History)
    if (path && path.length > 0) {
      pathRef.current = L.polyline(path, {
        color: '#00d4ff', // Cyan for actual
        weight: 3,
        opacity: 0.9,
        lineCap: 'round',
        className: 'animate-draw' // Optional CSS animation class
      }).addTo(map);
    }

    // 2. Render Planned/Direct Path
    if (plannedPath && plannedPath.length > 0) {
      // Dashed Amber Line for "Planned"
      plannedPathRef.current = L.polyline(plannedPath, {
        color: '#ffaa00', // Amber
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 10', // Dashed
        lineCap: 'round',
      }).addTo(map);

      // Add Airport Markers
      const markers = routeMarkersRef.current!;
      if (flightInfo?.originLat && flightInfo?.originLon) {
        L.circleMarker([flightInfo.originLat, flightInfo.originLon], {
          radius: 4, color: '#ffaa00', fillColor: '#000', fillOpacity: 0.5
        }).bindTooltip(`ORIGIN: ${flightInfo.origin}`, { permanent: true, direction: "left", offset: [-10, 0], className: "airport-label" }).addTo(markers);
      }
      if (flightInfo?.destLat && flightInfo?.destLon) {
        L.circleMarker([flightInfo.destLat, flightInfo.destLon], {
          radius: 4, color: '#ffaa00', fillColor: '#000', fillOpacity: 0.5
        }).bindTooltip(`DEST: ${flightInfo.destination}`, { permanent: true, direction: "right", offset: [10, 0], className: "airport-label" }).addTo(markers);
      }
    }

  }, [selectedAircraft, path, plannedPath, flightInfo]);

  // Follow selected aircraft & Highlight Signal Lost
  useEffect(() => {
    if (!mapRef.current || !selectedAircraft) return;

    // Remove existing selection highlight if exists (we might want to store this in a ref to clean up properly)
    // For now, let's just add a temporary marker that cleans itself up or use a dedicated layer.
    // Actually, let's use a ref for the selection marker to avoid leaks.
  }, [selectedAircraft]);



  useEffect(() => {
    if (!mapRef.current || !selectionLayerRef.current) return;

    selectionLayerRef.current.clearLayers();

    if (selectedAircraft && selectedAircraft.latitude !== null && selectedAircraft.longitude !== null) {
      const map = mapRef.current;

      // Fly to logic
      const zoom = map.getZoom();
      const targetZoom = zoom < 8 ? 8 : zoom;
      map.flyTo([selectedAircraft.latitude, selectedAircraft.longitude], targetZoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });

      // Special highlight for signal lost
      if (selectedAircraft.signalLost) {
        const pulseIcon = L.divIcon({
          className: '',
          html: `
            <div class="relative">
              <div class="absolute -top-[50px] -left-[50px] w-[100px] h-[100px] border-2 border-destructive/50 rounded-full animate-ping"></div>
              <div class="absolute -top-[50px] -left-[50px] w-[100px] h-[100px] border border-destructive rounded-full opacity-50"></div>
              <div class="absolute top-[60px] -left-[60px] w-[120px] text-center">
                 <span class="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-lg animate-pulse">LAST CONTACT</span>
              </div>
            </div>
          `,
          iconSize: [0, 0]
        });

        L.marker([selectedAircraft.latitude, selectedAircraft.longitude], { icon: pulseIcon, zIndexOffset: 1000 })
          .addTo(selectionLayerRef.current);
      }
    }
  }, [selectedAircraft]);

  return (
    <>
      <style>{`
      .flight - tooltip - custom {
      background: hsl(220 18 % 6 % / 0.95)!important;
      border: 1px solid hsl(215 20 % 18 %)!important;
      color: hsl(200 20 % 92 %)!important;
      border - radius: 10px!important;
      padding: 0!important;
      box - shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px hsl(215 20 % 14 %)!important;
      backdrop - filter: blur(12px)!important;
    }
        .flight - tooltip - custom::before {
      border - top - color: hsl(215 20 % 18 %)!important;
    }
        .flight - tt {
      font - family: 'Share Tech Mono', monospace;
      font - size: 11px;
      padding: 8px 10px;
      min - width: 120px;
    }
        .flight - tt - header {
      font - family: 'Orbitron', sans - serif;
      font - weight: 700;
      font - size: 11px;
      letter - spacing: 0.05em;
      margin - bottom: 6px;
      color: hsl(190 100 % 50 %);
    }
        .flight - tt - row {
      display: flex;
      justify - content: space - between;
      gap: 12px;
      padding: 1px 0;
    }
        .flight - tt - row span: first - child {
      color: hsl(215 15 % 45 %);
      text - transform: uppercase;
      font - size: 10px;
      letter - spacing: 0.05em;
    }
        .flight - tt - row span: last - child {
      color: hsl(200 20 % 85 %);
      font - weight: 600;
    }
        .leaflet - control - zoom a {
      background: hsl(220 18 % 7 %)!important;
      color: hsl(190 100 % 50 %)!important;
      border - color: hsl(215 20 % 16 %)!important;
      font - weight: 300!important;
      transition: all 0.2s!important;
    }
        .leaflet - control - zoom a:hover {
      background: hsl(220 18 % 10 %)!important;
      box - shadow: 0 0 12px hsl(190 100 % 50 % / 0.15)!important;
    }
        .leaflet - control - zoom {
      border: none!important;
      border - radius: 10px!important;
      overflow: hidden!important;
      box - shadow: 0 4px 20px rgba(0, 0, 0, 0.4)!important;
    }
    `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}
