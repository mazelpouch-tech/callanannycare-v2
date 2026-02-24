import { Link } from "react-router-dom";
import { MapPin, Star, Globe, Eye, MessageSquare } from "lucide-react";
import type { Nanny } from "../types";
import { useLanguage } from "../context/LanguageContext";

interface NannyCardProps {
  nanny: Nanny;
  showBookButton?: boolean;
  onViewDetails?: () => void;
  reviews?: Record<string, unknown>[];
}

export default function NannyCard({ nanny, showBookButton = true, onViewDetails, reviews }: NannyCardProps) {
  const { name, location, rating, bio, available, languages, specialties, image } = nanny;
  const { t } = useLanguage();

  return (
    <div
      className={`relative bg-card rounded-xl shadow-soft hover:shadow-warm transition-all duration-300 p-5 ${
        !available ? "opacity-75" : ""
      }`}
    >
      {/* Unavailable Badge */}
      {!available && (
        <span className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
          {t("nannyCard.unavailable")}
        </span>
      )}

      {/* Header: Avatar + Name + Location + Rating */}
      <div className="flex items-start gap-4">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-20 h-20 rounded-full object-cover shrink-0 ring-2 ring-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-border">
            <span className="text-2xl font-bold text-primary/40">{name?.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-card-foreground truncate">
            {name}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-card-foreground">{rating}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {bio}
      </p>

      {/* Specialties */}
      {specialties && specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialties.slice(0, 3).map((specialty) => (
            <span
              key={specialty}
              className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {specialty}
            </span>
          ))}
          {specialties.length > 3 && (
            <span className="text-xs text-muted-foreground py-1">
              +{specialties.length - 3} {t("nannyCard.more")}
            </span>
          )}
        </div>
      )}

      {/* Languages */}
      {languages && languages.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>{languages.join(", ")}</span>
        </div>
      )}

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
          </div>
          {reviews.slice(0, 2).map((review, idx) => (
            <div key={String(review.id || idx)} className="bg-muted/40 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-card-foreground text-xs">{String(review.client_name || "Parent")}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-2.5 h-2.5 ${s <= (Number(review.rating) || 0) ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{String(review.comment)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-border">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            {t("nannyCard.details")}
          </button>
        )}
        {showBookButton && available && (
          <Link
            to="/book"
            className="gradient-warm text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            {t("common.bookNow")}
          </Link>
        )}
      </div>
    </div>
  );
}
