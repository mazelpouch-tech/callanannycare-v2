import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, MessageCircle, Calendar, ArrowLeft } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// This page is the ONLY place the Google Ads / GA4 booking conversion fires.
// Tracking is gated on router state passed from Book.tsx after a successful
// submission — a direct visit, refresh, bot crawl, or ad-preview fetch will
// NOT fire the conversion because it will lack that state.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface BookingConfirmedState {
  bookingData?: {
    dates?: string[];
    startTime?: string;
    endTime?: string;
    totalPrice?: number;
    childNames?: string;
  };
}

export default function BookingConfirmed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const state = (location.state as BookingConfirmedState | null) ?? null;
  const bookingData = state?.bookingData;

  const conversionFiredRef = useRef(false);
  const whatsappOpenedRef = useRef(false);

  // If there is no booking data in router state, this is not a real post-booking
  // visit. Send them home and fire nothing.
  useEffect(() => {
    if (!bookingData) {
      navigate("/", { replace: true });
    }
  }, [bookingData, navigate]);

  // Fire the real conversion — once per mount, only when we have booking data.
  useEffect(() => {
    if (!bookingData || conversionFiredRef.current) return;
    conversionFiredRef.current = true;

    if (typeof window.gtag !== "function") return;

    const price = bookingData.totalPrice
      ? parseFloat(String(bookingData.totalPrice))
      : 0;

    window.gtag("event", "conversion", {
      send_to: "AW-18034320545/6JUVCP-fhpIcEKHJt5dD",
      value: price || 1.0,
      currency: "EUR",
    });
    window.gtag("event", "booking_submitted", {
      value: price,
      currency: "EUR",
    });
  }, [bookingData]);

  const buildWhatsAppUrl = () => {
    const datesText = bookingData?.dates?.join(", ") ?? "";
    const msg = encodeURIComponent(
      `Hi! I just booked a nanny session with Call a Nanny.\n\nDates: ${datesText}\nTime: ${bookingData?.startTime ?? ""}${bookingData?.endTime ? ` - ${bookingData.endTime}` : ""}\nChild${bookingData?.childNames?.includes(",") ? "ren" : ""}: ${bookingData?.childNames ?? ""}\n\nLooking forward to it!`
    );
    return `https://wa.me/212656643375?text=${msg}`;
  };

  // Auto-open WhatsApp once, matching the old inline success screen.
  useEffect(() => {
    if (!bookingData || whatsappOpenedRef.current) return;
    whatsappOpenedRef.current = true;
    const timer = setTimeout(() => {
      window.open(buildWhatsAppUrl(), "_blank");
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData]);

  if (!bookingData) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center shadow-warm animate-bounce">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full gradient-warm opacity-30 animate-ping" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t("book.successTitle")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mb-6">
            {t("book.successMessage")}
          </p>

          <div className="w-full max-w-md mb-6 bg-green-50 border-2 border-green-400 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-green-800 font-semibold text-left text-sm leading-relaxed">
                {t("book.whatsappUrgent")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.open(buildWhatsAppUrl(), "_blank")}
              className="w-full bg-green-500 text-white font-bold px-6 py-4 rounded-full hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
            >
              <MessageCircle className="w-5 h-5" />
              {t("book.sendWhatsApp")}
            </button>
          </div>

          <p className="text-muted-foreground text-sm max-w-md mb-6">
            📧 {t("email.confirmationSent")}
          </p>

          <div className="w-full max-w-md">
            <button
              type="button"
              onClick={() => navigate("/book")}
              className="w-full gradient-warm text-white font-semibold px-5 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {t("book.bookAnother")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("book.backToHome")}
          </button>
        </div>
      </div>
    </div>
  );
}
