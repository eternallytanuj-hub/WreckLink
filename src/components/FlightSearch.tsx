import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plane, ArrowUp } from "lucide-react";
import { AircraftState, getAltitudeColor } from "@/lib/aviation";

interface FlightSearchProps {
  aircraft: AircraftState[];
  onSelect: (a: AircraftState) => void;
}

export default function FlightSearch({ aircraft, onSelect }: FlightSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const results =
    query.length >= 2
      ? aircraft
        .filter(
          (a) =>
            a.callsign?.toLowerCase().includes(query.toLowerCase()) ||
            a.icao24.toLowerCase().includes(query.toLowerCase()) ||
            a.originCountry.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 12)
      : [];

  return (
    <div className="absolute top-4 left-4 z-[1000] w-72">
      {/* Search input */}
      <div
        className={`relative rounded-xl border transition-all duration-300 ${focused
            ? "border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.12)] bg-card/98"
            : "border-border/60 bg-card/90"
          } backdrop-blur-xl`}
      >
        <Search
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${focused ? "text-primary" : "text-muted-foreground"
            }`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="Search flights..."
          className="w-full h-10 pl-10 pr-8 rounded-xl bg-transparent text-foreground text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mt-2 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl max-h-72 overflow-auto shadow-2xl"
          >
            <div className="p-1.5 space-y-0.5">
              {results.map((a, i) => (
                <button
                  key={a.icao24}
                  onClick={() => {
                    onSelect(a);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/8 transition-all duration-200 text-left group"
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${getAltitudeColor(a.baroAltitude)}15` }}
                  >
                    <Plane
                      className="w-3.5 h-3.5"
                      style={{
                        color: getAltitudeColor(a.baroAltitude),
                        transform: `rotate(${a.trueTrack ?? 0}deg)`,
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-semibold truncate ${a.signalLost ? "text-destructive" : "text-foreground"}`}>
                        {a.callsign || a.icao24.toUpperCase()}
                      </span>
                      {a.signalLost ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-destructive/15 text-destructive uppercase animate-pulse">
                          LOST
                        </span>
                      ) : a.onGround ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-warning/15 text-warning uppercase">
                          GND
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {a.originCountry}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-2.5 h-2.5 text-muted-foreground" />
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: getAltitudeColor(a.baroAltitude) }}
                      >
                        {a.baroAltitude ? `${Math.round(a.baroAltitude)}m` : "—"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {a.velocity ? `${Math.round(a.velocity * 3.6)}km/h` : "—"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {open && query.length >= 2 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl p-4 text-center"
          >
            <Search className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
            <span className="text-xs text-muted-foreground font-mono">No aircraft found</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
