import { AircraftState } from "@/lib/aviation";
import { AlertTriangle, MapPin, Radio } from "lucide-react";

interface SignalLossFeedProps {
    aircraft: AircraftState[];
    onSelect: (aircraft: AircraftState) => void;
    simulatedAircraft?: AircraftState | null;
}

export default function SignalLossFeed({ aircraft, onSelect, simulatedAircraft }: SignalLossFeedProps) {
    // Filter for aircraft with lost signal AND NOT on ground
    let lostAircraft = aircraft.filter((a) => a.signalLost && !a.onGround);

    // Inject simulated crash alert
    if (simulatedAircraft) {
        // Deduplicate
        lostAircraft = lostAircraft.filter(a => a.icao24 !== simulatedAircraft.icao24);
        // Add to top essentially forcing it as an alert
        lostAircraft.unshift({ ...simulatedAircraft, signalLost: true });
    }

    // If no lost signals, render nothing or maybe a "Good Status" placeholder? 
    // User asked for "show signal lost messages", implying if there are any.
    // We can show a collapsed state or nothing. Let's return null if empty to save space,
    // or maybe better to show a "System Normal" empty state if we want the sidebar to be permanent.
    // Given "side of the map... to reduce lag", implies it takes space.
    // Let's make it conditional: only show if there are alerts, or create a permanent sidebar 
    // that shows "Monitoring..." when empty. 
    // For now, let's make it appear when there are alerts to maximize map space when things are good.

    if (lostAircraft.length === 0) return null;

    return (
        <div className="w-80 bg-background/95 backdrop-blur-md border-l border-white/10 flex flex-col h-full z-20 shadow-2xl transition-all duration-300">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                    <h3 className="font-display font-bold tracking-wider text-sm">SIGNAL LOST ALERTS</h3>
                </div>
                <span className="font-mono bg-destructive text-destructive-foreground px-2 py-0.5 rounded text-xs font-bold animate-pulse">
                    {lostAircraft.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {lostAircraft.map((a) => (
                    <div
                        key={a.icao24}
                        onClick={() => onSelect(a)}
                        className="group relative p-3 rounded-lg bg-card/40 border border-white/5 hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer transition-all duration-200 overflow-hidden"
                    >
                        {/* Scanline effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-destructive/5 to-transparent translate-y-[-100%] group-hover:animate-scanline pointer-events-none" />

                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <div className="flex flex-col">
                                <span className="font-mono font-bold text-destructive text-lg leading-none">
                                    {a.callsign || a.icao24.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-destructive/60 font-mono mt-0.5">
                                    ID: {a.icao24}
                                </span>
                            </div>
                            <span className="text-[10px] uppercase text-muted-foreground font-mono bg-secondary/30 border border-white/5 px-1.5 py-0.5 rounded">
                                {a.originCountry || "Unknown"}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3 font-mono relative z-10">
                            <div className="bg-background/30 p-1.5 rounded border border-white/5">
                                <span className="opacity-50 block text-[9px] uppercase tracking-wider mb-0.5">Last Altitude</span>
                                <span className="text-foreground">{a.baroAltitude ? Math.round(a.baroAltitude).toLocaleString() : 0}m</span>
                            </div>
                            <div className="bg-background/30 p-1.5 rounded border border-white/5">
                                <span className="opacity-50 block text-[9px] uppercase tracking-wider mb-0.5">Last Speed</span>
                                <span className="text-foreground">{a.velocity ? Math.round(a.velocity * 3.6) : 0}km/h</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between relative z-10 text-[10px] mt-1">
                            <div className="flex items-center gap-1.5 text-destructive font-medium group-hover:text-destructive/100 transition-colors">
                                <Radio className="w-3 h-3 animate-pulse" />
                                <span>Connection Lost</span>
                            </div>
                            <div className="flex items-center gap-1 text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                                <span className="uppercase tracking-wider">Locate</span>
                                <MapPin className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-white/10 bg-muted/20 text-[10px] text-muted-foreground text-center font-mono">
                Click items to track last known position
            </div>
        </div>
    );
}
