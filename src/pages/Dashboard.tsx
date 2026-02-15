import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FlightMap from "@/components/FlightMap";
import FlightSearch from "@/components/FlightSearch";
import AircraftPanel from "@/components/AircraftPanel";
import AltitudeLegend from "@/components/AltitudeLegend";
import SignalLossFeed from "@/components/SignalLossFeed";
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

  const handleSelect = useCallback((a: AircraftState | null) => setSelectedAircraft(a), []);

  const airborneCount = aircraft.filter((a) => !a.onGround).length;
  const groundedCount = aircraft.filter((a) => a.onGround).length;
  const avgAlt = aircraft.length
    ? Math.round(
      aircraft.reduce((sum, a) => sum + (a.baroAltitude ?? 0), 0) / aircraft.filter((a) => a.baroAltitude).length || 0
    )
    : 0;

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
          />
          <FlightSearch aircraft={aircraft} onSelect={handleSelect} />
          <AltitudeLegend />
          {selectedAircraft && (
            <AircraftPanel aircraft={selectedAircraft} onClose={() => setSelectedAircraft(null)} />
          )}

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
        <SignalLossFeed aircraft={aircraft} onSelect={handleSelect} />
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
