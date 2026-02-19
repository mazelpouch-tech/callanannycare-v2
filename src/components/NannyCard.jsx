import { Link } from "react-router-dom";
import { MapPin, Star, Clock, Globe, Eye } from "lucide-react";

export default function NannyCard({ nanny, showBookButton = true, onViewDetails }) {
  const { id, name, location, rate, rating, bio, available, languages, specialties, image } = nanny;

  return (
    <div
      className={`relative bg-card rounded-xl shadow-soft hover:shadow-warm transition-all duration-300 p-5 ${
        !available ? "opacity-75" : ""
      }`}
    >
      {/* Unavailable Badge */}
      {!available && (
        <span className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
          Unavailable
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
              +{specialties.length - 3} more
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

      {/* Rate + Buttons */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-base font-semibold text-card-foreground">
            {rate} MAD
          </span>
          <span className="text-sm text-muted-foreground">/hr</span>
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              Details
            </button>
          )}
          {showBookButton && available && (
            <Link
              to={`/book?nanny=${id}`}
              className="gradient-warm text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Book Now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
