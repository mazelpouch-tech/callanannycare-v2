import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Clock,
  Star,
  Check,
  ArrowRight,
  Users,
  Heart,
  ChevronRight,
  X,
  MapPin,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { pricingPlans } from "../data/initialData";
import NannyCard from "../components/NannyCard";
import { useLanguage } from "../context/LanguageContext";
import type { Nanny } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function Home() {
  const { nannies } = useData();
  const { t } = useLanguage();
  const [selectedNanny, setSelectedNanny] = useState<Nanny | null>(null);
  const [nannyReviews, setNannyReviews] = useState<Record<string, unknown>[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!selectedNanny) { setNannyReviews([]); return; }
    setReviewsLoading(true);
    fetch(`${API_BASE}/api/reviews?nanny_id=${selectedNanny.id}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setNannyReviews(data); })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [selectedNanny]);

  const features = [
    {
      icon: Shield,
      title: t("home.featureVerifiedTitle"),
      description: t("home.featureVerifiedDesc"),
    },
    {
      icon: Clock,
      title: t("home.featureFlexibleTitle"),
      description: t("home.featureFlexibleDesc"),
    },
    {
      icon: Star,
      title: t("home.featureTrustedTitle"),
      description: t("home.featureTrustedDesc"),
    },
  ];

  const steps = [
    {
      number: 1,
      title: t("home.step1Title"),
      description: t("home.step1Desc"),
    },
    {
      number: 2,
      title: t("home.step2Title"),
      description: t("home.step2Desc"),
    },
    {
      number: 3,
      title: t("home.step3Title"),
      description: t("home.step3Desc"),
    },
  ];

  const featuredNannies = nannies.filter((n) => n.available).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* ===== Hero Title ===== */}
      <section className="gradient-sand pt-8 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            {t("home.heroTitle")}{" "}
            <span className="text-orange-500">{t("home.heroHighlight")}</span>
          </h1>
        </div>
      </section>

      {/* ===== Hero Photo ===== */}
      <section>
        <div className="w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden">
          <img
            src="/hero-photo.jpg"
            alt="A nanny playing with children in a beautiful Marrakech garden"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* ===== Content below the photo ===== */}
      <section className="gradient-sand py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("home.heroSubtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/book"
              className="gradient-warm text-white rounded-full px-8 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2"
            >
              {t("common.bookANanny")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/nannies"
              className="border border-primary text-primary rounded-full px-8 py-3 font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2"
            >
              {t("common.browseNannies")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
            <div className="flex items-center gap-3">
              <div className="gradient-warm w-10 h-10 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold text-foreground">50+</p>
                <p className="text-sm text-muted-foreground">{t("home.verifiedNannies")}</p>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-border" />

            <div className="flex items-center gap-3">
              <div className="gradient-warm w-10 h-10 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold text-foreground">1000+</p>
                <p className="text-sm text-muted-foreground">{t("home.happyFamilies")}</p>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-border" />

            <div className="flex items-center gap-3">
              <div className="gradient-warm w-10 h-10 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xl font-bold text-foreground">4.9</p>
                <p className="text-sm text-muted-foreground">{t("home.averageRating")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us Section ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              {t("home.whyChoose")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              {t("home.whyChooseSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-card rounded-xl p-8 shadow-soft hover:shadow-warm transition-shadow duration-300"
                >
                  <div className="gradient-warm w-14 h-14 rounded-full flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== How It Works Section ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 gradient-sand">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              {t("home.howItWorksTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="gradient-warm w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-xl font-bold shadow-warm">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Featured Nannies Section ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              {t("home.topNannies")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              {t("home.topNanniesSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredNannies.map((nanny) => (
              <NannyCard key={nanny.id} nanny={nanny} onViewDetails={() => setSelectedNanny(nanny)} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/nannies"
              className="border border-primary text-primary rounded-full px-8 py-3 font-semibold hover:bg-primary/5 transition-colors inline-flex items-center gap-2"
            >
              {t("home.browseAll")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Pricing Section ===== */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 gradient-sand">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              {t("home.pricingTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-card rounded-xl p-8 relative ${
                  plan.highlight
                    ? "border-2 border-primary shadow-warm md:-mt-4 md:mb-0"
                    : "shadow-soft"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="gradient-warm text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                      {t("home.mostPopular")}
                    </span>
                  </div>
                )}

                <div className={plan.highlight ? "pt-2" : ""}>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-lg">
                      € / {plan.unit}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-muted-foreground"
                      >
                        <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/book"
                    className={`w-full flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition-all ${
                      plan.highlight
                        ? "gradient-warm text-white hover:opacity-90 shadow-warm"
                        : "border border-primary text-primary hover:bg-primary/5"
                    }`}
                  >
                    {t("common.bookNow")}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Taxi fee note */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            🚕 {t("home.pricingTaxiNote")}
          </p>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-6">
            {t("home.ctaTitle")}
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            {t("home.ctaSubtitle")}
          </p>
          <Link
            to="/book"
            className="gradient-warm text-white rounded-full px-10 py-4 font-semibold text-lg hover:opacity-90 transition-opacity shadow-warm inline-flex items-center gap-2"
          >
            {t("common.bookNow")}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Nanny Detail Modal */}
      {selectedNanny && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedNanny(null)}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setSelectedNanny(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative">
              {selectedNanny.image ? (
                <img src={selectedNanny.image} alt={selectedNanny.name} className="w-full h-56 object-cover rounded-t-2xl" />
              ) : (
                <div className="w-full h-56 bg-gradient-to-br from-primary/20 to-accent/20 rounded-t-2xl flex items-center justify-center">
                  <span className="text-5xl font-bold text-primary/30">{selectedNanny.name?.charAt(0)}</span>
                </div>
              )}
              {!selectedNanny.available && (
                <span className="absolute top-4 left-4 bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  {t("nannies.currentlyUnavailable")}
                </span>
              )}
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h2 className="font-serif text-2xl font-bold text-foreground">{selectedNanny.name}</h2>
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
                      {selectedNanny.experience} {t("nannies.experience")}
                    </span>
                  )}
                </div>
              </div>

              {selectedNanny.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{t("nannies.about")}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedNanny.bio}</p>
                </div>
              )}

              {selectedNanny.specialties?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{t("nannies.specialties")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNanny.specialties.map((s) => (
                      <span key={s} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNanny.languages?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{t("nannies.languages")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNanny.languages.map((l) => (
                      <span key={l} className="bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent Reviews */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("nannies.reviews") || "Reviews"} ({nannyReviews.length})
                  </h3>
                </div>
                {reviewsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : nannyReviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("nannies.noReviews") || "No reviews yet."}</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {nannyReviews.map((review, idx) => (
                      <div key={String(review.id || idx)} className="bg-muted/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-xs">{String(review.client_name || "Parent")}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {review.created_at ? new Date(String(review.created_at)).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mb-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= (Number(review.rating) || 0) ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{String(review.comment)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Book */}
              {selectedNanny.available && (
                <div className="flex justify-end pt-4 border-t border-border">
                  <Link
                    to="/book"
                    onClick={() => setSelectedNanny(null)}
                    className="gradient-warm text-white font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2"
                  >
                    {t("common.bookNow")}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
