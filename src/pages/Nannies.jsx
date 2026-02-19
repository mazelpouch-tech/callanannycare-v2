import { useState, useMemo } from "react";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { useData } from "../context/DataContext";
import NannyCard from "../components/NannyCard";

export default function Nannies() {
  const { nannies } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sortBy, setSortBy] = useState("rating");

  const filteredNannies = useMemo(() => {
    let result = [...nannies];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((nanny) =>
        nanny.name.toLowerCase().includes(query)
      );
    }

    // Filter by availability
    if (availability === "available") {
      result = result.filter((nanny) => nanny.available);
    }

    // Sort
    if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "experience") {
      result.sort(
        (a, b) => parseInt(b.experience) - parseInt(a.experience)
      );
    }

    return result;
  }, [nannies, searchQuery, availability, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Our Verified Nannies
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Browse our verified nannies in Marrakech
          </p>
        </div>
      </section>

      {/* Filter / Search Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-card rounded-2xl shadow-soft p-4 sm:p-6 border border-border">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-sm font-medium">Filter & Sort</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name..."
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
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Nanny Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {filteredNannies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNannies.map((nanny) => (
              <NannyCard key={nanny.id} nanny={nanny} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No nannies found
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Try adjusting your search or filter criteria to find available
              nannies.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
