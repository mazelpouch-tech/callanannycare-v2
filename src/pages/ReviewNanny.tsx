import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Star, Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface BookingInfo {
  id: number;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  nannyName: string;
  nannyImage: string;
  nannyId: number | null;
}

interface ExistingReview {
  id: number;
  rating: number;
  comment: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function ReviewNanny() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id || !token) {
      setError("Invalid review link.");
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/reviews?booking_id=${id}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBooking(data.booking);
          if (data.existingReview) {
            setExistingReview(data.existingReview);
          }
        }
      })
      .catch(() => setError("Failed to load booking information."))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: Number(id), token, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit review.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Error state
  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Already reviewed
  if (existingReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Reviewed!</h1>
          <p className="text-gray-600 mb-4">
            You already left a review for {booking?.nannyName}.
          </p>
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-6 h-6 ${s <= existingReview.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            ))}
          </div>
          {existingReview.comment && (
            <p className="text-gray-600 text-sm italic">"{existingReview.comment}"</p>
          )}
          <p className="text-gray-400 text-xs mt-4">Thank you for your feedback!</p>
        </div>
      </div>
    );
  }

  // Successfully submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your review for <strong>{booking?.nannyName}</strong> has been submitted.
          </p>
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-6 h-6 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            ))}
          </div>
          {comment && <p className="text-gray-600 text-sm italic">"{comment}"</p>}
          <p className="text-gray-400 text-xs mt-6">Call a Nanny — Marrakech</p>
        </div>
      </div>
    );
  }

  // Review form
  const displayRating = hoverRating || rating;
  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-8 text-center text-white">
          <h1 className="text-xl font-bold font-serif mb-1">Rate Your Experience</h1>
          <p className="text-white/90 text-sm">Your feedback helps us improve!</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Nanny info */}
          {booking && (
            <div className="flex items-center gap-4">
              {booking.nannyImage ? (
                <img src={booking.nannyImage} alt={booking.nannyName} className="w-14 h-14 rounded-full object-cover border-2 border-orange-200" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white text-xl font-bold">
                  {booking.nannyName?.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{booking.nannyName}</p>
                <p className="text-sm text-gray-500">{booking.date} &middot; {booking.startTime} - {booking.endTime}</p>
                <p className="text-xs text-gray-400">Booking #{booking.id}</p>
              </div>
            </div>
          )}

          {/* Star rating */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">How was your experience with {booking?.nannyName}?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      s <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 hover:text-amber-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-sm font-medium text-amber-600 mt-2">{ratingLabels[displayRating]}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tell us more <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like? Any suggestions?"
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/1000</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? "Submitting..." : "Submit Review"}
          </button>

          <p className="text-center text-xs text-gray-400">
            Call a Nanny — Professional Childcare, Marrakech
          </p>
        </div>
      </div>
    </div>
  );
}
