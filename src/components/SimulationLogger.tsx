import { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu, Wind, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhysicsData {
    physics: {
        predicted_lat: number;
        predicted_lon: number;
        confidence: number;
        drift_vector_m: [number, number];
        process_noise: [number, number];
        dlat: number;
        dlon: number;
    };
    inputs: {
        wind_u_ms: number;
        wind_v_ms: number;
        drift_hours: number;
    };
}

interface SimulationLoggerProps {
    isVisible: boolean;
    coords: { lat: number; lon: number } | null;
}

export default function SimulationLogger({ isVisible, coords }: SimulationLoggerProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const [data, setData] = useState<PhysicsData | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && coords) {
            // Fetch physics data
            fetch('/simulate-drift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(coords),
            })
                .then((res) => res.json())
                .then((d) => {
                    setData(d);
                    startLogSequence(d);
                })
                .catch((err) => console.error("Sim Logger Error:", err));
        } else {
            setLogs([]);
            setData(null);
        }
    }, [isVisible, coords]);

    const startLogSequence = (d: PhysicsData) => {
        const sequence = [
            { text: `> INITIALIZING EKF_LITE_MODEL...`, delay: 100 },
            { text: `> TARGET_LOCK: [${coords?.lat.toFixed(4)}, ${coords?.lon.toFixed(4)}]`, delay: 600 },
            { text: `> FETCHING OCEAN_CURRENT_VECTORS...`, delay: 1200 },
            { text: `> VECTOR_U: ${d.inputs.wind_u_ms} m/s (EAST)`, delay: 1800, color: 'text-blue-400' },
            { text: `> VECTOR_V: ${d.inputs.wind_v_ms} m/s (NORTH)`, delay: 2000, color: 'text-blue-400' },
            { text: `> PROCESS_NOISE_INJECTION: [${d.physics.process_noise[0]}, ${d.physics.process_noise[1]}]`, delay: 2800, color: 'text-yellow-400' },
            { text: `> CALCULATING DRIFT (${d.inputs.drift_hours}h)...`, delay: 3500 },
            { text: `> DISPLACEMENT: [${d.physics.drift_vector_m[0]}m, ${d.physics.drift_vector_m[1]}m]`, delay: 4200 },
            { text: `> PREDICTED_IMPACT: [${d.physics.predicted_lat}, ${d.physics.predicted_lon}]`, delay: 5000, color: 'text-red-400 font-bold' },
            { text: `> CONFIDENCE_SCORE: ${d.physics.confidence}%`, delay: 5500, color: 'text-green-400' },
            { text: `> DEBRIS_PATTERN_GENERATION... DONE`, delay: 6000 },
        ];

        setLogs([]);
        sequence.forEach(({ text, delay, color }) => {
            setTimeout(() => {
                setLogs((prev) => [...prev, `<span class="${color || 'text-muted-foreground'}">${text}</span>`]);
            }, delay);
        });
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute top-24 left-4 z-[800] w-80 bg-black/80 backdrop-blur-md border border-border/50 rounded-lg overflow-hidden font-mono text-[10px] shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-secondary/20">
                        <div className="flex items-center gap-2 text-primary">
                            <Terminal className="w-3.5 h-3.5" />
                            <span className="font-bold tracking-wider">PHYSICS ENGINE</span>
                        </div>
                        <Activity className="w-3 h-3 text-green-500 animate-pulse" />
                    </div>

                    {/* Log Window */}
                    <div
                        ref={scrollRef}
                        className="h-48 overflow-y-auto p-3 flex flex-col gap-1 scrollbar-hide"
                    >
                        {logs.map((log, i) => (
                            <div key={i} dangerouslySetInnerHTML={{ __html: log }} />
                        ))}
                        <div className="animate-pulse text-primary">_</div>
                    </div>

                    {/* Footer Stats */}
                    {data && (
                        <div className="grid grid-cols-2 gap-px bg-border/50 border-t border-border/50">
                            <div className="bg-background/50 p-2">
                                <div className="text-muted-foreground mb-0.5">DRIFT ALGORITHM</div>
                                <div className="font-bold text-primary">EKF-LITE v2.0</div>
                            </div>
                            <div className="bg-background/50 p-2">
                                <div className="text-muted-foreground mb-0.5">EST. ERROR</div>
                                <div className="font-bold text-yellow-500">
                                    ±{(100 - data.physics.confidence) * 0.5}km
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
