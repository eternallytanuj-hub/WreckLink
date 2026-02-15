import { motion } from "framer-motion";
import {
  Radar,
  Satellite,
  Radio,
  Route,
  LayoutDashboard,
  Plane,
} from "lucide-react";
import { Link } from "react-router-dom";

const solutions = [
  {
    icon: Radar,
    title: "Real-Time Aircraft Monitoring",
    description:
      "Track planes in real-time and detect anomalies — sudden altitude loss, speed drops, off-course deviations — with instant alerts.",
    features: ["Live flight positions", "Anomaly detection", "Historical replay", "Search zone prediction"],
    color: "primary",
  },
  {
    icon: Plane,
    title: "ADS-B Signal Loss Detection",
    description:
      "Monitor ADS-B transponder signals and detect when aircraft stop transmitting. Estimate crash zones from last known trajectory.",
    features: ["Signal monitoring", "Auto-alert on loss", "Crash zone estimation", "Coverage mapping"],
    color: "accent",
  },
  {
    icon: Satellite,
    title: "Satellite Imagery Analysis",
    description:
      "Retrieve and compare satellite imagery for crash site detection. Before/after comparison with annotation tools.",
    features: ["Sentinel Hub integration", "Before/after viewer", "Region overlay", "Debris annotation"],
    color: "info",
  },
  {
    icon: Radio,
    title: "Emergency Beacon Tracking",
    description:
      "Track ELT/EPIRB emergency beacon signals with real-time triangulation display and beacon registration lookup.",
    features: ["406 MHz simulation", "Triangulation display", "Beacon lookup", "SAR notification"],
    color: "warning",
  },
  {
    icon: Route,
    title: "Flight Plan Deviation",
    description:
      "Compare actual flight paths vs. filed plans. Predict crash zones using physics, ML, and wind data modeling.",
    features: ["Path comparison", "Deviation alerts", "Crash zone prediction", "Weather integration"],
    color: "danger",
  },
  {
    icon: LayoutDashboard,
    title: "Multi-Source Fusion Dashboard",
    description:
      "Unified command center combining ADS-B, satellite, beacon, and ML data into one incident management view.",
    features: ["Unified view", "Incident timeline", "SAR coordination", "PDF/CSV export"],
    color: "success",
  },
];

const colorMap: Record<string, string> = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  info: "hsl(var(--info))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--danger))",
  success: "hsl(var(--success))",
};

const borderColorMap: Record<string, string> = {
  primary: "border-primary/30 hover:border-primary/60",
  accent: "border-accent/30 hover:border-accent/60",
  info: "border-info/30 hover:border-info/60",
  warning: "border-warning/30 hover:border-warning/60",
  danger: "border-destructive/30 hover:border-destructive/60",
  success: "border-success/30 hover:border-success/60",
};

const textColorMap: Record<string, string> = {
  primary: "text-primary",
  accent: "text-accent",
  info: "text-info",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
};

export default function SolutionsSection() {
  return (
    <section id="solutions" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono tracking-[0.3em] uppercase text-primary mb-4 block">
            Platform Solutions
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            6 Integrated Detection Systems
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-body text-lg">
            Each module operates independently or fuses together into a unified command center
            for comprehensive crash detection and search & rescue coordination.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {solutions.map((sol, i) => (
            <motion.div
              key={sol.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group relative rounded-lg border bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:bg-card/80 ${borderColorMap[sol.color]}`}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${colorMap[sol.color]}15` }}
              >
                <sol.icon className={`w-6 h-6 ${textColorMap[sol.color]}`} />
              </div>

              <h3 className="text-lg font-display font-semibold text-foreground mb-2">{sol.title}</h3>
              <p className="text-sm text-muted-foreground font-body mb-4 leading-relaxed">{sol.description}</p>

              {/* Features */}
              <ul className="space-y-1.5 mb-6">
                {sol.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/dashboard"
                className={`inline-flex items-center gap-2 text-xs font-display font-semibold tracking-wider uppercase ${textColorMap[sol.color]} opacity-70 group-hover:opacity-100 transition-opacity`}
              >
                Launch Dashboard →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
