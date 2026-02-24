import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Star, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

function toArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

export default function ReviewNannyPublic() {
  const { id } = useParams<{ id: string }>();
  const [nanny, setNanny] = useState<Record<string, unknown> | null>(null);
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setError("Invalid link."); setLoading(false); return; }

    (async () => {
      try {
        const [nannyRes, reviewsRes] = await Promise.all([
          fetch(`${API_BASE}/api/nannies/${id}`),
          fetch(`${API_BASE}/api/reviews?nanny_id=${id}`),
        ]);
        const nannyData = await nannyRes.json();
        const reviewsData = await reviewsRes.json();

        if (!nannyRes.ok || nannyData.error || !nannyData.id) {
          setError("Nanny not found.");
          return;
        }
        setNanny(nannyData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch {
        setError("Failed to load nanny information.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !nanny) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-gray-600">{error || "Not found"}</p>
        </div>
      </div>
    );
  }

  const name = String(nanny.name || "Nanny");
  const image = String(nanny.image || "");
  const bio = String(nanny.bio || "");
  const location = String(nanny.location || "");
  const nannyRating = Number(nanny.rating) || 0;
  const languages = toArray(nanny.languages);
  const specialties = toArray(nanny.specialties);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
    : nannyRating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-8 text-center text-white">
            {image ? (
              <img src={image} alt={name} className="w-24 h-24 rounded-full object-cover border-4 border-white/30 mx-auto mb-3" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                {name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-bold font-serif">{name}</h1>
            {location && <p className="text-white/80 text-sm mt-1">{location}</p>}
          </div>

          <div className="p-6">
            {/* Rating summary */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-6 h-6 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {avgRating > 0 ? `${avgRating.toFixed(1)} out of 5` : "No ratings yet"} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </p>
            </div>

            {bio && <p className="text-sm text-gray-600 text-center mb-6">{bio}</p>}

            {(languages.length > 0 || specialties.length > 0) && (
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {languages.map((l, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{l}</span>
                ))}
                {specialties.map((s, i) => (
                  <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">No reviews yet.</div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, idx) => (
                <div key={String(review.id || idx)} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{String(review.client_name || "Client")}</span>
                    <span className="text-xs text-gray-400">
                      {String(review.date || (review.created_at ? new Date(String(review.created_at)).toLocaleDateString() : ""))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= (Number(review.rating) || 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm text-gray-600">{String(review.comment)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">Call a Nanny — Professional Childcare, Marrakech</p>
      </div>
    </div>
  );
}
