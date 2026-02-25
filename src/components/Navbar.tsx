import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, Globe, Shield, UserCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const location = useLocation();
  const { t, locale, setLocale } = useLanguage();

  const navLinks = [
    { label: t("nav.howItWorks"), to: "/how-it-works" },
    { label: t("nav.ourNannies"), to: "/nannies" },
    { label: t("nav.pricing"), to: "/#pricing" },
  ];

  const handlePricingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === "/") {
      e.preventDefault();
      const section = document.getElementById("pricing");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
      setMobileOpen(false);
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === "en" ? "fr" : "en");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 font-serif text-xl font-bold text-gradient-warm tracking-tight"
            >
              <img src="/logo-icon.png" alt="" className="w-10 h-10 object-contain" />
              call a nanny
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={link.to === "/#pricing" ? handlePricingClick : undefined}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}

              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
                aria-label="Switch language"
              >
                <Globe className="w-4 h-4" />
                {t("common.switchLang")}
              </button>

              <Link
                to="/book"
                className="gradient-warm text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                {t("common.bookNow")}
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
      </nav>

      {/* Mobile Overlay — rendered outside <nav> so backdrop-filter doesn't break position:fixed */}
      <div
        className={`fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Slide-in Panel — rendered outside <nav> */}
      <div
        className={`fixed top-0 right-0 z-[101] h-full w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="flex items-center gap-2 font-serif text-lg font-bold text-gradient-warm">
            <img src="/logo-icon.png" alt="" className="w-9 h-9 object-contain" />
            call a nanny
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col px-4 pt-4 gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => {
                if (link.to === "/#pricing") handlePricingClick(e);
                setMobileOpen(false);
              }}
              className="text-gray-800 hover:text-orange-500 font-medium py-3.5 px-4 rounded-xl hover:bg-orange-50 transition-all text-[15px]"
            >
              {link.label}
            </Link>
          ))}

          {/* Mobile Language Switcher */}
          <button
            onClick={() => {
              toggleLanguage();
              setMobileOpen(false);
            }}
            className="text-gray-800 hover:text-orange-500 font-medium py-3.5 px-4 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2.5 text-left text-[15px]"
          >
            <Globe className="w-[18px] h-[18px]" />
            {locale === "en" ? "Fran\u00e7ais" : "English"}
          </button>
        </div>

        {/* Book Now CTA */}
        <div className="px-5 mt-6">
          <Link
            to="/book"
            onClick={() => setMobileOpen(false)}
            className="gradient-warm text-white font-semibold py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 text-[15px]"
          >
            <Phone className="w-4 h-4" />
            {t("common.bookNow")}
          </Link>
        </div>

        {/* Portal Access */}
        <div className="px-4 mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
            {locale === "en" ? "Portal Access" : "Accès Portail"}
          </p>
          <Link
            to="/nanny/login"
            onClick={() => setMobileOpen(false)}
            className="text-gray-500 hover:text-orange-500 font-medium py-3 px-4 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2.5 text-[14px]"
          >
            <UserCircle className="w-[18px] h-[18px]" />
            {locale === "en" ? "Nanny Login" : "Connexion Nounou"}
          </Link>
          <Link
            to="/admin/login"
            onClick={() => setMobileOpen(false)}
            className="text-gray-500 hover:text-orange-500 font-medium py-3 px-4 rounded-xl hover:bg-orange-50 transition-all flex items-center gap-2.5 text-[14px]"
          >
            <Shield className="w-[18px] h-[18px]" />
            {locale === "en" ? "Admin Login" : "Connexion Admin"}
          </Link>
        </div>
      </div>
    </>
  );
}
