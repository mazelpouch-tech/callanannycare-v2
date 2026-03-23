import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  Languages,
  MapPin,
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

export default function BabysittingMarrakech() {
  const { t } = useLanguage();

  usePageMeta({
    title: t("seo.babysitting.metaTitle"),
    description: t("seo.babysitting.metaDesc"),
    canonicalPath: "/babysitting-marrakech",
  });

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Call a Nanny - Babysitting Marrakech",
    description: t("seo.babysitting.metaDesc"),
    url: "https://callanannycare.vercel.app/babysitting-marrakech",
    areaServed: {
      "@type": "City",
      name: "Marrakech",
    },
    serviceType: "Babysitting",
    priceRange: "150-300 MAD/hr",
  });

  const features = [
    {
      icon: ShieldCheck,
      title: t("seo.babysitting.card1Title"),
      desc: t("seo.babysitting.card1Desc"),
    },
    {
      icon: Clock,
      title: t("seo.babysitting.card2Title"),
      desc: t("seo.babysitting.card2Desc"),
    },
    {
      icon: Languages,
      title: t("seo.babysitting.card3Title"),
      desc: t("seo.babysitting.card3Desc"),
    },
  ];

  const areas = [
    t("seo.babysitting.areaGueliz"),
    t("seo.babysitting.areaMedina"),
    t("seo.babysitting.areaHivernage"),
    t("seo.babysitting.areaPalmeraie"),
  ];

  const faqs = [
    { question: t("seo.babysitting.faq1Q"), answer: t("seo.babysitting.faq1A") },
    { question: t("seo.babysitting.faq2Q"), answer: t("seo.babysitting.faq2A") },
    { question: t("seo.babysitting.faq3Q"), answer: t("seo.babysitting.faq3A") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t("seo.babysitting.title")}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {t("seo.babysitting.subtitle")}
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-white/90 transition-opacity shadow-warm text-lg mt-8"
          >
            <Calendar className="w-5 h-5" />
            {t("common.bookANanny")}
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
          {t("seo.babysitting.whyTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-2xl p-8 text-center shadow-soft"
              >
                <div className="w-16 h-16 gradient-warm rounded-full flex items-center justify-center mx-auto mb-5 shadow-warm">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Service Areas */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            {t("seo.babysitting.areasTitle")}
          </h2>
          <p className="text-muted-foreground text-center mb-10">
            {t("seo.babysitting.areasDesc")}
          </p>
          <div className="space-y-4">
            {areas.map((area) => (
              <div
                key={area}
                className="flex items-start gap-3 bg-card border border-border rounded-xl p-5 shadow-soft"
              >
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground text-sm leading-relaxed">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
            {t("seo.babysitting.faqTitle")}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-4">
            {t("seo.babysitting.ctaTitle")}
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            {t("seo.babysitting.ctaSubtitle")}
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
