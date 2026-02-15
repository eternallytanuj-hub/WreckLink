import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FlightMap from "@/components/FlightMap";
import FlightSearch from "@/components/FlightSearch";
import AircraftPanel from "@/components/AircraftPanel";
import AltitudeLegend from "@/components/AltitudeLegend";
import SignalLossFeed from "@/components/SignalLossFeed";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import SimulationLogger from "@/components/SimulationLogger";
import { useFlightData } from "@/hooks/useFlightData";
import { AircraftState } from "@/lib/aviation";
import {
  Plane,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Radio,
  Globe,
  Activity,
  Shield,
} from "lucide-react";

const Dashboard = () => {
  const { aircraft, loading, error, lastUpdate, refetch } = useFlightData();
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showFlightPaths, setShowFlightPaths] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);

  // Simulation State
  const [simState, setSimState] = useState<'idle' | 'crashing' | 'impact' | 'scanning' | 'detected'>('idle');
  const [simCoords, setSimCoords] = useState<{ lat: number, lon: number } | null>(null);
  const [ships, setShips] = useState<any[]>([]);
  const [loadingShips, setLoadingShips] = useState(false);
  const [helplineInfo, setHelplineInfo] = useState<{ agency: string, number: string, country: string } | null>(null);
  const [loadingHelpline, setLoadingHelpline] = useState(false);
  const [reconData, setReconData] = useState<string | null>(null);
  const [loadingRecon, setLoadingRecon] = useState(false);
  const [showShips, setShowShips] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number, lon: number } | null>(null);

  const [locateTrigger, setLocateTrigger] = useState(0);

  const handleSelect = useCallback((a: AircraftState | null) => {
    setSelectedAircraft(a);
    if (a && a.latitude && a.longitude) {
      setLocateTrigger((t) => t + 1); // Trigger map movement
      // Reset simulation state when a new aircraft is selected
      setSimState('idle');
      setSimCoords(null);
      setHelplineInfo(null);
      setReconData(null);

      // Fetch nearest ships and helpline for the selected aircraft
      setLoadingShips(true);
      setLoadingHelpline(true);

      // Parallel fetch
      Promise.all([
        fetch('/api/ships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: a.latitude,
            lon: a.longitude,
            radius: 200
          })
        }).then(res => res.json()),
        fetch('/api/rescue-helpline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: a.latitude, lon: a.longitude })
        }).then(res => res.json())
      ]).then(([shipData, helplineData]) => {
        if (shipData.ships) setShips(shipData.ships);
        if (helplineData && !helplineData.error) setHelplineInfo(helplineData);
      })
        .catch(err => console.error("Failed to fetch contextual data", err))
        .finally(() => {
          setLoadingShips(false);
          setLoadingHelpline(false);
        });

    } else {
      setShips([]);
      setHelplineInfo(null);
    }
  }, []);

  const handleSimulateCrash = useCallback((coords: { lat: number, lon: number }) => {
    setSimState('crashing');
    setSimCoords(coords);
    setShips([]); // Clear previous ships
    setHelplineInfo(null); // Clear previous helpline info
    setReconData(null);
    setLoadingRecon(true);

    // Trigger SMS Alert
    if (selectedAircraft) {
      fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coords.lat,
          lon: coords.lon,
          flight_id: selectedAircraft.callsign || selectedAircraft.icao24,
          wind_data: "Evaluating..." // Could pass real wind if we had it here easily, but server has it too
        })
      }).catch(e => console.error("SMS Alert Failed", e));
    }

    // Fetch Recon Data immediately
    fetch('/api/recon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: coords.lat, lon: coords.lon })
    })
      .then(res => res.json())
      .then(data => setReconData(data.recon))
      .catch(e => setReconData("Recon unavailable."))
      .finally(() => setLoadingRecon(false));

    // Simulation sequence
    setTimeout(() => setSimState('impact'), 3000);
    setTimeout(() => {
      setSimState('scanning');
      // Fetch ships and verify helpline on simulate
      Promise.all([
        fetch('/api/ships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...coords, radius: 200 })
        }).then(res => res.json()),
        // Re-fetch helpline for precise crash location if needed, or use existing
        fetch('/api/rescue-helpline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: coords.lat, lon: coords.lon })
        }).then(res => res.json())
      ]).then(([shipData, helplineData]) => {
        if (shipData.ships) setShips(shipData.ships);
        if (helplineData && !helplineData.error) setHelplineInfo(helplineData);
      })
        .catch(err => console.error("Failed to fetch simulation context", err));

      // Fetch Rescue Helpline Info
      fetch('/api/rescue-helpline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords)
      })
        .then(res => res.json())
        .then(data => setHelplineInfo(data))
        .catch(err => console.error("Failed to fetch helpline", err));

    }, 5000);
    setTimeout(() => setSimState('detected'), 8000);
  }, []);

  const airborneCount = aircraft.filter((a) => !a.onGround).length;
  const groundedCount = aircraft.filter((a) => a.onGround).length;
  const avgAlt = aircraft.length
    ? Math.round(
      aircraft.reduce((sum, a) => sum + (a.baroAltitude ?? 0), 0) / aircraft.filter((a) => a.baroAltitude).length || 0
    )
    : 0;

  // Fetch ships when toggled
  useEffect(() => {
    if (showShips && mapCenter) {
      const fetchShips = async () => {
        setLoadingShips(true);
        try {
          const res = await fetch('/api/ships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: mapCenter.lat, lon: mapCenter.lon })
          });
          const data = await res.json();
          if (data.ships) {
            setShips(data.ships);
          }
        } catch (e) {
          console.error("Ship fetch failed", e);
        } finally {
          setLoadingShips(false);
        }
      };

      // Debounce slightly
      const timer = setTimeout(fetchShips, 500);
      return () => clearTimeout(timer);
    } else if (!showShips && simState === 'idle') {
      setShips([]);
    }
  }, [showShips, mapCenter, simState]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      {/* Status bar */}
      <div className="pt-16 flex items-center justify-between px-3 py-2 border-b border-border/60 bg-card/60 backdrop-blur-xl z-30">
        {/* Left: Stats */}
        <div className="flex items-center gap-1.5">
          <StatChip
            icon={<Radio className="w-3 h-3" />}
            label="TRACKING"
            value={loading ? "..." : aircraft.length.toLocaleString()}
            color="primary"
            pulse={loading}
          />
          <StatChip
            icon={<Plane className="w-3 h-3" />}
            label="AIRBORNE"
            value={airborneCount.toLocaleString()}
            color="success"
          />
          <StatChip
            icon={<Globe className="w-3 h-3" />}
            label="GROUNDED"
            value={groundedCount.toLocaleString()}
            color="warning"
          />
          <StatChip
            icon={<Activity className="w-3 h-3" />}
            label="AVG ALT"
            value={`${avgAlt.toLocaleString()}m`}
            color="info"
          />
          {lastUpdate && (
            <span className="text-[10px] font-mono text-muted-foreground ml-2 hidden lg:block opacity-60">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          {error && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-destructive ml-2">
              <AlertTriangle className="w-3 h-3" />
              <span className="hidden sm:inline">{error}</span>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowRiskZones(!showRiskZones)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all duration-300 ${showRiskZones
              ? "bg-destructive/15 text-destructive border border-destructive/25 shadow-[0_0_12px_hsl(var(--destructive)/0.15)]"
              : "bg-secondary/60 text-muted-foreground border border-border/60 hover:border-border"
              }`}
          >
            <Shield className="w-3 h-3" />
            {showRiskZones ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span className="hidden sm:inline">Risk</span>
          </button>

          <button
            onClick={() => setShowShips(!showShips)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all duration-300 ${showShips
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              : "bg-secondary/60 text-muted-foreground border border-border/60 hover:border-border"
              }`}
          >
            {loadingShips ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="text-lg leading-none">⚓</span>}
            <span className="hidden sm:inline">Maritime</span>
          </button>

          <button
            onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all duration-300 ${showAnalyticsPanel
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
              : "bg-secondary/60 text-muted-foreground border border-border/60 hover:border-border"
              }`}
          >
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={loading}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 text-muted-foreground border border-border/60 text-[11px] font-mono uppercase tracking-wider hover:text-primary hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)] transition-all duration-300 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
            )}
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Container */}
        <div className="flex-1 relative">
          <FlightMap
            aircraft={aircraft}
            selectedAircraft={selectedAircraft}
            onSelectAircraft={handleSelect}
            showRiskZones={showRiskZones}
            showFlightPaths={showFlightPaths}

            locateTrigger={locateTrigger}
            simulation={{ state: simState, coords: simCoords }}
            ships={ships}
            onMapMove={setMapCenter}
          />
          <FlightSearch aircraft={aircraft} onSelect={handleSelect} />
          <AltitudeLegend />
          {selectedAircraft && (
            <AircraftPanel
              aircraft={selectedAircraft}
              onClose={() => handleSelect(null)}
              onSimulate={handleSimulateCrash}
              simState={simState}
              helplineInfo={helplineInfo}
              loadingHelpline={loadingHelpline}
              nearestShip={ships[0]}
              loadingShips={loadingShips}
              reconData={reconData}
              loadingRecon={loadingRecon}
            />
          )}

          {/* Analytics Panel Overlay */}
          {showAnalyticsPanel && (
            <div className="absolute top-4 left-4 z-[900] w-[400px]">
              <AnalyticsPanel />
            </div>
          )}

          {/* Physics Simulation Logger Overlay */}
          <SimulationLogger
            isVisible={simState !== 'idle' && selectedAircraft !== null}
            coords={simCoords}
          />

          {/* Loading overlay */}
          {loading && aircraft.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-md z-[1001]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <Plane className="absolute inset-0 m-auto w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-display text-foreground tracking-wider mb-1">
                  ACQUIRING SIGNALS
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  Connecting to flight network...
                </p>
              </motion.div>
            </div>
          )}
        </div>

        {/* Signal Loss Feed Sidebar */}
        <SignalLossFeed
          aircraft={aircraft}
          onSelect={handleSelect}
          simulatedAircraft={simState !== 'idle' ? selectedAircraft : null}
        />
      </div>
    </div>
  );
};

/* Stat chip component */
function StatChip({
  icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "primary" | "success" | "warning" | "info";
  pulse?: boolean;
}) {
  const colorMap = {
    primary: {
      dot: "bg-primary",
      text: "text-primary",
      bg: "bg-primary/8",
      border: "border-primary/15",
    },
    success: {
      dot: "bg-success",
      text: "text-success",
      bg: "bg-success/8",
      border: "border-success/15",
    },
    warning: {
      dot: "bg-warning",
      text: "text-warning",
      bg: "bg-warning/8",
      border: "border-warning/15",
    },
    info: {
      dot: "bg-info",
      text: "text-info",
      bg: "bg-info/8",
      border: "border-info/15",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${c.bg} ${c.border} transition-all`}
    >
      <div className="relative">
        <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${pulse ? "animate-pulse" : ""}`} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden xl:inline">
        {label}
      </span>
      <span className={`text-xs font-mono font-semibold ${c.text}`}>{value}</span>
    </div>
  );
}

export default Dashboard;
