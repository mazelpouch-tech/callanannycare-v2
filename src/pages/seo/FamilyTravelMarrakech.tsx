import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Flower2,
  Sun,
  UtensilsCrossed,
  Compass,
  Waves,
  Droplets,
  BedDouble,
  Baby,
  Heart,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Calendar,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePageMeta, useJsonLd } from "../../hooks/usePageMeta";

function FAQItem({ faq }: { faq: { question: string; answer: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-primary shrink-0" />
          <span className="font-medium text-foreground">{faq.question}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="pl-8 text-muted-foreground text-sm leading-relaxed">
            {faq.answer}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyTravelMarrakech() {
  const { t } = useLanguage();

  usePageMeta({
    title: t("seo.familyTravel.metaTitle"),
    description: t("seo.familyTravel.metaDesc"),
    canonicalPath: "/family-travel-marrakech",
  });

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: "Family Travel Guide to Marrakech",
    description: t("seo.familyTravel.metaDesc"),
    url: "https://callanannycare.vercel.app/family-travel-marrakech",
    location: {
      "@type": "City",
      name: "Marrakech",
      addressCountry: "MA",
    },
  });

  const things = [
    { icon: Flower2, title: t("seo.familyTravel.thing1Title"), desc: t("seo.familyTravel.thing1Desc") },
    { icon: Sun, title: t("seo.familyTravel.thing2Title"), desc: t("seo.familyTravel.thing2Desc") },
    { icon: UtensilsCrossed, title: t("seo.familyTravel.thing3Title"), desc: t("seo.familyTravel.thing3Desc") },
    { icon: Compass, title: t("seo.familyTravel.thing4Title"), desc: t("seo.familyTravel.thing4Desc") },
    { icon: Waves, title: t("seo.familyTravel.thing5Title"), desc: t("seo.familyTravel.thing5Desc") },
  ];

  const tips = [
    { icon: Droplets, title: t("seo.familyTravel.tip1Title"), desc: t("seo.familyTravel.tip1Desc") },
    { icon: BedDouble, title: t("seo.familyTravel.tip2Title"), desc: t("seo.familyTravel.tip2Desc") },
    { icon: Baby, title: t("seo.familyTravel.tip3Title"), desc: t("seo.familyTravel.tip3Desc") },
    { icon: Heart, title: t("seo.familyTravel.tip4Title"), desc: t("seo.familyTravel.tip4Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t("seo.familyTravel.title")}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {t("seo.familyTravel.subtitle")}
          </p>
        </div>
      </section>

      {/* Why Marrakech for Families */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
          {t("seo.familyTravel.whyTitle")}
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto text-lg leading-relaxed">
          {t("seo.familyTravel.whyDesc")}
        </p>
      </section>

      {/* Things to Do */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
            {t("seo.familyTravel.thingsTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {things.map((thing) => {
              const Icon = thing.icon;
              return (
                <div
                  key={thing.title}
                  className="bg-card border border-border rounded-2xl p-6 shadow-soft"
                >
                  <div className="w-12 h-12 gradient-warm rounded-full flex items-center justify-center mb-4 shadow-warm">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                    {thing.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {thing.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
          {t("seo.familyTravel.tipsTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6 shadow-soft"
              >
                <div className="w-10 h-10 gradient-warm rounded-full flex items-center justify-center shrink-0 shadow-warm">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                    {tip.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How a Nanny Helps */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {t("seo.familyTravel.nannyTitle")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            {t("seo.familyTravel.nannyDesc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/babysitting-marrakech"
              className="text-primary font-medium hover:underline"
            >
              {t("seo.babysitting.title")} &rarr;
            </Link>
            <Link
              to="/hotel-nanny-marrakech"
              className="text-primary font-medium hover:underline"
            >
              {t("seo.hotelNanny.title")} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-4">
            {t("seo.familyTravel.ctaTitle")}
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            {t("seo.familyTravel.ctaSubtitle")}
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-white/90 transition-opacity shadow-warm text-lg"
          >
            <Calendar className="w-5 h-5" />
            {t("common.bookANanny")}
          </Link>
        </div>
      </section>
    </div>
  );
}
