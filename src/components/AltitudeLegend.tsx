import { motion } from "framer-motion";

const altitudeBands = [
  { label: "Ground", range: "< 1km", color: "#00ff88" },
  { label: "Low", range: "1-5km", color: "#00ddff" },
  { label: "Mid", range: "5-10km", color: "#00aaff" },
  { label: "High", range: "10-20km", color: "#ffaa00" },
  { label: "Cruise", range: "20-30km", color: "#ff6600" },
  { label: "Strato", range: "> 30km", color: "#ff2200" },
];

export default function AltitudeLegend() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="absolute bottom-6 left-4 z-[999]"
    >
      <div className="rounded-xl border border-border/40 bg-card/85 backdrop-blur-xl p-3 shadow-xl">
        <span className="text-[10px] font-display text-muted-foreground uppercase tracking-widest mb-2 block">
          Altitude
        </span>
        <div className="space-y-1">
          {altitudeBands.map((band) => (
            <div key={band.label} className="flex items-center gap-2">
              <div
                className="w-3 h-1.5 rounded-full"
                style={{ backgroundColor: band.color, boxShadow: `0 0 6px ${band.color}40` }}
              />
              <span className="text-[10px] font-mono text-muted-foreground leading-none">
                {band.range}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
