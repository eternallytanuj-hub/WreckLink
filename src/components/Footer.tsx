import { motion } from "framer-motion";
import { Plane } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border py-12 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-primary" />
          <span className="font-display font-bold tracking-wider text-sm">
            WRECK<span className="text-primary">LINK</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          © 2026 WreckLink Aviation Monitoring Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
