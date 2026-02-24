import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Star, Loader2 } from "lucide-react";

interface NannyInfo {
  id: number;
  name: string;
  image: string;
  bio: string;
  rating: number;
  location: string;
  languages: string[];
  specialties: string[];
}

interface Review {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
  date: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function ReviewNannyPublic() {
  const { id } = useParams<{ id: string }>();
  const [nanny, setNanny] = useState<NannyInfo | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Invalid link.");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`${API_BASE}/api/nannies/${id}`).then((r) => r.json()),
      fetch(`${API_BASE}/api/reviews?nanny_id=${id}`).then((r) => r.json()),
    ])
      .then(([nannyData, reviewsData]) => {
        if (nannyData.error) {
          setError("Nanny not found.");
          return;
        }
        setNanny({
          id: nannyData.id,
          name: nannyData.name,
          image: nannyData.image,
          bio: nannyData.bio,
          rating: nannyData.rating,
          location: nannyData.location,
          languages: nannyData.languages || [],
          specialties: nannyData.specialties || [],
        });
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      })
      .catch(() => setError("Failed to load nanny information."))
      .finally(() => setLoading(false));
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

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : nanny.rating || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-8 text-center text-white">
            {nanny.image ? (
              <img
                src={nanny.image}
                alt={nanny.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/30 mx-auto mb-3"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                {nanny.name?.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-bold font-serif">{nanny.name}</h1>
            {nanny.location && (
              <p className="text-white/80 text-sm mt-1">{nanny.location}</p>
            )}
          </div>

          <div className="p-6">
            {/* Rating summary */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-6 h-6 ${
                      s <= Math.round(avgRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {avgRating > 0 ? `${avgRating.toFixed(1)} out of 5` : "No ratings yet"} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Bio */}
            {nanny.bio && (
              <p className="text-sm text-gray-600 text-center mb-6">{nanny.bio}</p>
            )}

            {/* Tags */}
            {(nanny.languages.length > 0 || nanny.specialties.length > 0) && (
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {nanny.languages.map((l) => (
                  <span key={l} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{l}</span>
                ))}
                {nanny.specialties.map((s) => (
                  <span key={s} className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">
              No reviews yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{review.client_name}</span>
                    <span className="text-xs text-gray-400">
                      {review.date || new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Call a Nanny — Professional Childcare, Marrakech
        </p>
      </div>
    </div>
  );
}
