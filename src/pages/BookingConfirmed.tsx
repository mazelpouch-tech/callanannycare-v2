import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

// NOTE: Conversion tracking has been REMOVED from this page.
// The actual conversion fires in Book.tsx after successful form submission.
// This page is a legacy route — conversions must NOT fire here to avoid
// double-counting from bots, ad previews, or direct URL visits.

export default function BookingConfirmed() {
  const navigate = useNavigate();

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
