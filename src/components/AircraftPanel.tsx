import { motion } from "framer-motion";
import { AircraftState, getAltitudeColor } from "@/lib/aviation";
import {
  X,
  Plane,
  ArrowUp,
  ArrowDown,
  Gauge,
  MapPin,
  Globe,
  Compass,
  Radio,
} from "lucide-react";

interface AircraftPanelProps {
  aircraft: AircraftState;
  onClose: () => void;
}

export default function AircraftPanel({ aircraft, onClose }: AircraftPanelProps) {
  const altColor = getAltitudeColor(aircraft.baroAltitude);
  const isSignalLost = aircraft.signalLost;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`absolute top-4 right-4 z-[1000] w-80 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${isSignalLost
        ? "border-destructive/60 bg-destructive/10"
        : "border-border/60 bg-card/95"
        }`}
    >
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: isSignalLost
              ? `linear-gradient(135deg, #ff0000, transparent)`
              : `linear-gradient(135deg, ${altColor}, transparent)`,
          }}
        />

        {/* Signal Lost Banner */}
        {isSignalLost && (
          <div className="bg-destructive text-destructive-foreground text-[10px] font-bold text-center py-1 tracking-widest uppercase animate-pulse">
            ⚠️ Signal Lost at {new Date(aircraft.lastContact * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}

        <div className="relative flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSignalLost ? "bg-destructive/20" : ""
                }`}
              style={{ backgroundColor: !isSignalLost ? `${altColor}18` : undefined }}
            >
              {isSignalLost ? (
                <Radio className="w-5 h-5 text-destructive animate-pulse" />
              ) : (
                <Plane
                  className="w-5 h-5"
                  style={{
                    color: altColor,
                    transform: `rotate(${aircraft.trueTrack ?? 0}deg)`,
                  }}
                />
              )}
            </div>
            <div>
              <h3 className={`font-display font-bold tracking-wider text-sm ${isSignalLost ? "text-destructive" : "text-foreground"}`}>
                {aircraft.callsign || aircraft.icao24.toUpperCase()}
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                {aircraft.originCountry}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider ${isSignalLost
            ? "bg-destructive/20 text-destructive border border-destructive/30 font-bold"
            : aircraft.onGround
              ? "bg-warning/12 text-warning border border-warning/20"
              : "bg-success/12 text-success border border-success/20"
            }`}
        >
          {isSignalLost ? "LOST SIGNAL" : aircraft.onGround ? "On Ground" : "Airborne"}
        </span>
        {aircraft.squawk && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground border border-border/40">
            SQK {aircraft.squawk}
          </span>
        )}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground border border-border/40 uppercase">
          {aircraft.icao24}
        </span>
      </div>

      {/* Telemetry grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <TelemetryCard
            icon={<ArrowUp className="w-3.5 h-3.5" />}
            label={isSignalLost ? "Last Alt" : "Altitude"}
            value={aircraft.baroAltitude ? `${Math.round(aircraft.baroAltitude)}` : "—"}
            unit="m"
            accent={isSignalLost ? undefined : altColor}
            isWarning={isSignalLost}
          />
          <TelemetryCard
            icon={<Gauge className="w-3.5 h-3.5" />}
            label={isSignalLost ? "Last Spd" : "Speed"}
            value={aircraft.velocity ? `${Math.round(aircraft.velocity * 3.6)}` : "—"}
            unit="km/h"
            isWarning={isSignalLost}
          />
          <TelemetryCard
            icon={<ArrowDown className="w-3.5 h-3.5" />}
            label="V/S"
            value={aircraft.verticalRate ? `${aircraft.verticalRate.toFixed(1)}` : "—"}
            unit="m/s"
            accent={
              aircraft.verticalRate && !isSignalLost
                ? aircraft.verticalRate < -5
                  ? "hsl(var(--destructive))"
                  : aircraft.verticalRate > 5
                    ? "hsl(var(--success))"
                    : undefined
                : undefined
            }
            isWarning={isSignalLost}
          />
          <TelemetryCard
            icon={<Compass className="w-3.5 h-3.5" />}
            label="Heading"
            value={aircraft.trueTrack ? `${Math.round(aircraft.trueTrack)}` : "—"}
            unit="°"
            isWarning={isSignalLost}
          />
        </div>
        {isSignalLost && (
          <div className="mt-3 text-[10px] text-destructive/80 font-mono text-center border-t border-destructive/20 pt-2">
            Connection lost at last known coordinates.
            <br />
            Target may have landed or gone out of range.
          </div>
        )}
      </div>

      {/* Coordinates */}
      {aircraft.latitude && aircraft.longitude && (
        <div className="px-4 pb-3 pt-1 border-t border-border/40">
          <div className="flex items-center gap-2">
            <MapPin className={`w-3 h-3 ${isSignalLost ? "text-destructive" : "text-muted-foreground/50"}`} />
            <span className={`text-[11px] font-mono ${isSignalLost ? "text-destructive" : "text-muted-foreground/70"}`}>
              {aircraft.latitude.toFixed(4)}°, {aircraft.longitude.toFixed(4)}°
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TelemetryCard({
  icon,
  label,
  value,
  unit,
  accent,
  isWarning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent?: string;
  isWarning?: boolean;
}) {
  return (
    <div className={`rounded-lg p-2.5 border ${isWarning
      ? "bg-destructive/10 border-destructive/20"
      : "bg-secondary/40 border-border/30"
      }`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={isWarning ? "text-destructive/70" : "text-muted-foreground/60"}>{icon}</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider ${isWarning ? "text-destructive/70" : "text-muted-foreground"
          }`}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-lg font-mono font-bold leading-none ${isWarning ? "text-destructive" : "text-foreground"
            }`}
          style={accent && !isWarning ? { color: accent } : {}}
        >
          {value}
        </span>
        <span className={`text-[10px] font-mono ${isWarning ? "text-destructive/60" : "text-muted-foreground"
          }`}>{unit}</span>
      </div>
    </div>
  );
}
