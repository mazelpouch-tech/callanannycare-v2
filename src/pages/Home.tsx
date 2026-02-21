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
} from "lucide-react";
import { useData } from "../context/DataContext";
import { pricingPlans } from "../data/initialData";
import NannyCard from "../components/NannyCard";
import { useLanguage } from "../context/LanguageContext";

export default function Home() {
  const { nannies } = useData();
  const { t } = useLanguage();

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
      {/* ===== Hero Photo Banner ===== */}
      <section className="relative">
        <div className="w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] overflow-hidden">
          <img
            src="/hero-photo.jpg"
            alt="A nanny playing with children in a beautiful Marrakech garden"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>

        {/* Only the title on the photo */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full pb-10 sm:pb-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl text-center">
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-lg">
                {t("home.heroTitle")}{" "}
                <span className="text-orange-200">{t("home.heroHighlight")}</span>
              </h1>
            </div>
          </div>
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
              <NannyCard key={nanny.id} nanny={nanny} />
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
                      MAD / {plan.unit}
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
    </div>
  );
}
