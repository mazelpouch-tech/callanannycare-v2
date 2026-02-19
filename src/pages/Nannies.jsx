import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Globe,
  X,
  MapPin,
  Star,
  ArrowRight,
} from "lucide-react";
import { useData } from "../context/DataContext";
import NannyCard from "../components/NannyCard";

export default function Nannies() {
  const { nannies } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [selectedNanny, setSelectedNanny] = useState(null);

  // Collect all unique languages from nannies
  const allLanguages = useMemo(() => {
    const langSet = new Set();
    nannies.forEach((n) => {
      if (Array.isArray(n.languages)) n.languages.forEach((l) => langSet.add(l));
    });
    return Array.from(langSet).sort();
  }, [nannies]);

  const filteredNannies = useMemo(() => {
    let result = nannies.filter((n) => n.status !== "invited" && n.status !== "blocked");

    // Filter by search (name, location, specialties)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (nanny) =>
          nanny.name?.toLowerCase().includes(query) ||
          nanny.location?.toLowerCase().includes(query) ||
          nanny.bio?.toLowerCase().includes(query) ||
          (Array.isArray(nanny.specialties) &&
            nanny.specialties.some((s) => s.toLowerCase().includes(query)))
      );
    }

    // Filter by availability
    if (availability === "available") {
      result = result.filter((nanny) => nanny.available);
    }

    // Filter by language
    if (languageFilter !== "all") {
      result = result.filter(
        (nanny) =>
          Array.isArray(nanny.languages) &&
          nanny.languages.some((l) => l.toLowerCase() === languageFilter.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "experience") {
      result.sort((a, b) => parseInt(b.experience || 0) - parseInt(a.experience || 0));
    } else if (sortBy === "price-low") {
      result.sort((a, b) => (a.rate || 0) - (b.rate || 0));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    }

    return result;
  }, [nannies, searchQuery, availability, sortBy, languageFilter]);

  const activeFilterCount = [
    availability !== "all",
    languageFilter !== "all",
    searchQuery.trim() !== "",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Our Verified Nannies
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Browse our verified nannies in Marrakech. Filter by language, specialty, or availability.
          </p>
        </div>
      </section>

      {/* Filter / Search Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-sm font-medium">Filter & Sort</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setAvailability("all");
                  setLanguageFilter("all");
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Name, location, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* Availability Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
              >
                <option value="all">All Nannies</option>
                <option value="available">Available Only</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
              >
                <option value="all">All Languages</option>
                {allLanguages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer"
              >
                <option value="rating">Sort by Rating</option>
                <option value="name">Sort by Name</option>
                <option value="experience">Sort by Experience</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results count */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <p className="text-sm text-muted-foreground">
          {filteredNannies.length} nann{filteredNannies.length !== 1 ? "ies" : "y"} found
        </p>
      </section>

      {/* Nanny Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-12">
        {filteredNannies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNannies.map((nanny) => (
              <NannyCard
                key={nanny.id}
                nanny={nanny}
                onViewDetails={() => setSelectedNanny(nanny)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No nannies found
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Try adjusting your search or filter criteria to find available nannies.
            </p>
          </div>
        )}
      </section>

      {/* Nanny Detail Modal (#19) */}
      {selectedNanny && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedNanny(null)}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-lg max-h-[85vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setSelectedNanny(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo header */}
            <div className="relative">
              {selectedNanny.image ? (
                <img
                  src={selectedNanny.image}
                  alt={selectedNanny.name}
                  className="w-full h-56 object-cover rounded-t-2xl"
                />
              ) : (
                <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-accent/20 rounded-t-2xl flex items-center justify-center">
                  <span className="text-5xl font-bold text-primary/30">
                    {selectedNanny.name?.charAt(0)}
                  </span>
                </div>
              )}
              {!selectedNanny.available && (
                <span className="absolute top-4 left-4 bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Currently Unavailable
                </span>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* Name & basics */}
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  {selectedNanny.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedNanny.location || "Marrakech"}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-foreground">{selectedNanny.rating}</span>
                  </div>
                  {selectedNanny.experience && (
                    <span className="text-sm text-muted-foreground">
                      {selectedNanny.experience} experience
                    </span>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedNanny.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedNanny.bio}
                  </p>
                </div>
              )}

              {/* Specialties */}
              {selectedNanny.specialties?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNanny.specialties.map((s) => (
                      <span
                        key={s}
                        className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {selectedNanny.languages?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNanny.languages.map((l) => (
                      <span
                        key={l}
                        className="bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rate & Book */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Hourly Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedNanny.rate} <span className="text-sm font-normal text-muted-foreground">MAD/hr</span>
                  </p>
                </div>
                {selectedNanny.available && (
                  <Link
                    to="/book"
                    onClick={() => setSelectedNanny(null)}
                    className="gradient-warm text-white font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2"
                  >
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
