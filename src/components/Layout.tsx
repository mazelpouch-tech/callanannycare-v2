import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Layout() {
  const { t } = useLanguage();

  const openWhatsApp = () => {
    const msg = encodeURIComponent(t("layout.whatsappMessage"));
    window.open(`https://wa.me/212656643375?text=${msg}`, "_blank");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />

      {/* WhatsApp Floating Button (#26) */}
      <button
        onClick={openWhatsApp}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-3 bg-card text-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-soft border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {t("layout.whatsappTooltip")}
        </span>
      </button>
    </div>
  );
}
