import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Heart } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  const quickLinks = [
    { label: t("footer.home"), to: "/" },
    { label: t("footer.ourNannies"), to: "/nannies" },
    { label: t("footer.howItWorks"), to: "/how-it-works" },
    { label: t("footer.bookANanny"), to: "/book" },
  ];

  const services = [
    t("footer.hourlyCare"),
    t("footer.hotelBabysitting"),
    t("footer.eventChildcare"),
    t("footer.regularCare"),
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold flex items-center gap-3">
              <img src="/logo-icon.png" alt="" className="w-10 h-10 object-contain brightness-200" />
              call a nanny
            </h3>
            <p className="text-background/70 text-sm leading-relaxed">
              {t("footer.description")}
            </p>
            <div className="flex items-center gap-1 text-sm text-background/50">
              {t("footer.madeWith")} <Heart className="w-4 h-4 text-primary fill-primary" /> {t("footer.inMarrakech")}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-4 text-background/90">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
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
              {t("footer.services")}
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
              {t("footer.contact")}
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
          <p>&copy; {new Date().getFullYear()} call a nanny. {t("footer.allRights")}</p>
          <p>{t("footer.professionalChildcare")}</p>
        </div>
      </div>
    </footer>
  );
}
