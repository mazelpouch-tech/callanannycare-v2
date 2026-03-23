import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  UserCheck,
  PartyPopper,
  Building2,
  Home,
  Castle,
  BedDouble,
  ShieldCheck,
  HeartPulse,
  Languages,
  Palette,
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

export default function HotelNannyMarrakech() {
  const { t } = useLanguage();

  usePageMeta({
    title: t("seo.hotelNanny.metaTitle"),
    description: t("seo.hotelNanny.metaDesc"),
    canonicalPath: "/hotel-nanny-marrakech",
  });

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Hotel Babysitting Services in Marrakech",
    description: t("seo.hotelNanny.metaDesc"),
    url: "https://callanannycare.vercel.app/hotel-nanny-marrakech",
    provider: {
      "@type": "LocalBusiness",
      name: "Call a Nanny",
      areaServed: { "@type": "City", name: "Marrakech" },
    },
    serviceType: "Hotel Babysitting",
  });

  const steps = [
    { icon: ClipboardList, title: t("seo.hotelNanny.step1Title"), desc: t("seo.hotelNanny.step1Desc") },
    { icon: UserCheck, title: t("seo.hotelNanny.step2Title"), desc: t("seo.hotelNanny.step2Desc") },
    { icon: PartyPopper, title: t("seo.hotelNanny.step3Title"), desc: t("seo.hotelNanny.step3Desc") },
  ];

  const venues = [
    { icon: Castle, text: t("seo.hotelNanny.whereRiads") },
    { icon: Building2, text: t("seo.hotelNanny.whereHotels") },
    { icon: Home, text: t("seo.hotelNanny.whereVillas") },
    { icon: BedDouble, text: t("seo.hotelNanny.whereAirbnb") },
  ];

  const expectations = [
    { icon: ShieldCheck, title: t("seo.hotelNanny.expect1Title"), desc: t("seo.hotelNanny.expect1Desc") },
    { icon: HeartPulse, title: t("seo.hotelNanny.expect2Title"), desc: t("seo.hotelNanny.expect2Desc") },
    { icon: Languages, title: t("seo.hotelNanny.expect3Title"), desc: t("seo.hotelNanny.expect3Desc") },
    { icon: Palette, title: t("seo.hotelNanny.expect4Title"), desc: t("seo.hotelNanny.expect4Desc") },
  ];

  const faqs = [
    { question: t("seo.hotelNanny.faq1Q"), answer: t("seo.hotelNanny.faq1A") },
    { question: t("seo.hotelNanny.faq2Q"), answer: t("seo.hotelNanny.faq2A") },
    { question: t("seo.hotelNanny.faq3Q"), answer: t("seo.hotelNanny.faq3A") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t("seo.hotelNanny.title")}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {t("seo.hotelNanny.subtitle")}
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

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
          {t("seo.hotelNanny.howTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-6 relative">
                  <div className="w-20 h-20 gradient-warm rounded-full flex items-center justify-center shadow-warm mx-auto">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-foreground text-sm font-bold rounded-full flex items-center justify-center shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Where We Serve */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            {t("seo.hotelNanny.whereTitle")}
          </h2>
          <p className="text-muted-foreground text-center mb-10">
            {t("seo.hotelNanny.whereDesc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((venue) => {
              const Icon = venue.icon;
              return (
                <div
                  key={venue.text}
                  className="flex items-start gap-3 bg-card border border-border rounded-xl p-5 shadow-soft"
                >
                  <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-sm leading-relaxed">{venue.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
          {t("seo.hotelNanny.expectTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {expectations.map((exp) => {
            const Icon = exp.icon;
            return (
              <div
                key={exp.title}
                className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6 shadow-soft"
              >
                <div className="w-10 h-10 gradient-warm rounded-full flex items-center justify-center shrink-0 shadow-warm">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                    {exp.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {exp.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
            {t("seo.hotelNanny.faqTitle")}
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
            {t("seo.hotelNanny.ctaTitle")}
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            {t("seo.hotelNanny.ctaSubtitle")}
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
