import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

// Declare gtag on window
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function BookingConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const value = searchParams.get("value");

  // Fire Google Ads conversion + GA4 purchase event on page load
  useEffect(() => {
    if (typeof window.gtag === "function") {
      // Google Ads conversion
      window.gtag("event", "conversion", {
        send_to: "AW-18034320545/KBenCLqPio4cEKHJt5dD",
        value: value ? parseFloat(value) : undefined,
        currency: "EUR",
      });
      // GA4 purchase event
      window.gtag("event", "purchase", {
        value: value ? parseFloat(value) : 0,
        currency: "EUR",
      });
    }
  }, [value]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-6 inline-block">
          <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center shadow-warm animate-bounce">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground mb-3">
          Booking Confirmed!
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Thank you for your booking. We'll be in touch shortly.
        </p>
        <button
          onClick={() => navigate("/")}
          className="gradient-warm text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
