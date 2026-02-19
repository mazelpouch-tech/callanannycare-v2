import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Heart } from "lucide-react";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Our Nannies", to: "/nannies" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Book a Nanny", to: "/book" },
];

const services = [
  "Hourly Care",
  "Half-Day Care",
  "Full-Day Care",
  "Hotel Babysitting",
];

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold">call a nanny</h3>
            <p className="text-background/70 text-sm leading-relaxed">
              Trusted childcare services in Marrakech
            </p>
            <div className="flex items-center gap-1 text-sm text-background/50">
              Made with <Heart className="w-4 h-4 text-primary fill-primary" /> in Marrakech
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-background/90">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-background/70 hover:text-background text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-background/90">
              Services
            </h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li
                  key={service}
                  className="text-background/70 text-sm"
                >
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-background/90">
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contact@callananny.ma"
                  className="flex items-center gap-2 text-background/70 hover:text-background text-sm transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  contact@callananny.ma
                </a>
              </li>
              <li>
                <a
                  href="tel:+212XXXXXXXXX"
                  className="flex items-center gap-2 text-background/70 hover:text-background text-sm transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  +212 XXX-XXXXXX
                </a>
              </li>
              <li>
                <span className="flex items-center gap-2 text-background/70 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  Marrakech, Morocco
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-background/50">
          <p>&copy; {new Date().getFullYear()} call a nanny. All rights reserved.</p>
          <p>Professional Childcare Services</p>
        </div>
      </div>
    </footer>
  );
}
