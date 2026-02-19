import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";

const navLinks = [
  { label: "How It Works", to: "/how-it-works" },
  { label: "Our Nannies", to: "/nannies" },
  { label: "Pricing", to: "/#pricing" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handlePricingClick = (e) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const section = document.getElementById("pricing");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
      setMobileOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="font-serif text-xl font-bold text-gradient-warm tracking-tight"
          >
            call a nanny
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={link.to === "/#pricing" ? handlePricingClick : undefined}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/book"
              className="gradient-warm text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Book Now
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-background shadow-xl transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-serif text-lg font-bold text-gradient-warm">
            call a nanny
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 text-foreground hover:text-primary transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col p-4 gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              onClick={(e) => {
                if (link.to === "/#pricing") handlePricingClick(e);
                setMobileOpen(false);
              }}
              className="text-foreground hover:text-primary font-medium py-3 px-3 rounded-lg hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-4 pt-4 border-t border-border">
            <Link
              to="/book"
              onClick={() => setMobileOpen(false)}
              className="gradient-warm text-white font-semibold py-3 px-5 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
