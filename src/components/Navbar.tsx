import { useState } from "react";
import { motion } from "framer-motion";
import { Plane, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { label: "Solutions", href: "/#solutions", isHash: true },
  { label: "Dashboard", href: "/dashboard", isHash: false },
  { label: "Live Map", href: "/dashboard", isHash: false },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-lg tracking-wider">
            WRECK<span className="text-primary">LINK</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) =>
            l.isHash ? (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.href}
                className="text-sm font-mono text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase"
              >
                {l.label}
              </Link>
            )
          )}
          <Link
            to="/dashboard"
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-display font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] transition-all"
          >
            Launch App
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
        >
          <div className="p-4 space-y-3">
            {navLinks.map((l) =>
              l.isHash ? (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-sm font-mono text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-sm font-mono text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase"
                >
                  {l.label}
                </Link>
              )
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
