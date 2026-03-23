import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plane,
  ShieldCheck,
  Clock,
  Languages,
  Heart,
  Star,
  MapPin,
  CalendarCheck,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Calendar,
  Baby,
  Hotel,
  Sparkles,
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

export default function HolidayChildcareMarrakech() {
  const { t } = useLanguage();

  usePageMeta({
    title: t("seo.holidayChildcare.metaTitle"),
    description: t("seo.holidayChildcare.metaDesc"),
    canonicalPath: "/nounou-marrakech-vacances",
  });

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Holiday Childcare Services in Marrakech",
    description: t("seo.holidayChildcare.metaDesc"),
    url: "https://callanannycare.vercel.app/nounou-marrakech-vacances",
    provider: {
      "@type": "LocalBusiness",
      name: "Call a Nanny",
      areaServed: { "@type": "City", name: "Marrakech" },
    },
    serviceType: "Holiday Childcare",
    audience: {
      "@type": "Audience",
      audienceType: "Traveling families with children",
      geographicArea: {
        "@type": "Place",
        name: "Europe",
      },
    },
  });

  const benefits = [
    { icon: CalendarCheck, title: t("seo.holidayChildcare.benefit1Title"), desc: t("seo.holidayChildcare.benefit1Desc") },
    { icon: ShieldCheck, title: t("seo.holidayChildcare.benefit2Title"), desc: t("seo.holidayChildcare.benefit2Desc") },
    { icon: Languages, title: t("seo.holidayChildcare.benefit3Title"), desc: t("seo.holidayChildcare.benefit3Desc") },
    { icon: Hotel, title: t("seo.holidayChildcare.benefit4Title"), desc: t("seo.holidayChildcare.benefit4Desc") },
  ];

  const steps = [
    { icon: MessageCircle, title: t("seo.holidayChildcare.step1Title"), desc: t("seo.holidayChildcare.step1Desc") },
    { icon: CalendarCheck, title: t("seo.holidayChildcare.step2Title"), desc: t("seo.holidayChildcare.step2Desc") },
    { icon: Plane, title: t("seo.holidayChildcare.step3Title"), desc: t("seo.holidayChildcare.step3Desc") },
    { icon: Sparkles, title: t("seo.holidayChildcare.step4Title"), desc: t("seo.holidayChildcare.step4Desc") },
  ];

  const reasons = [
    { icon: Clock, title: t("seo.holidayChildcare.reason1Title"), desc: t("seo.holidayChildcare.reason1Desc") },
    { icon: Star, title: t("seo.holidayChildcare.reason2Title"), desc: t("seo.holidayChildcare.reason2Desc") },
    { icon: Heart, title: t("seo.holidayChildcare.reason3Title"), desc: t("seo.holidayChildcare.reason3Desc") },
    { icon: MapPin, title: t("seo.holidayChildcare.reason4Title"), desc: t("seo.holidayChildcare.reason4Desc") },
  ];

  const faqs = [
    { question: t("seo.holidayChildcare.faq1Q"), answer: t("seo.holidayChildcare.faq1A") },
    { question: t("seo.holidayChildcare.faq2Q"), answer: t("seo.holidayChildcare.faq2A") },
    { question: t("seo.holidayChildcare.faq3Q"), answer: t("seo.holidayChildcare.faq3A") },
    { question: t("seo.holidayChildcare.faq4Q"), answer: t("seo.holidayChildcare.faq4A") },
    { question: t("seo.holidayChildcare.faq5Q"), answer: t("seo.holidayChildcare.faq5A") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — speaks directly to traveling parents */}
      <section className="gradient-warm py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Plane className="w-4 h-4" />
            {t("seo.holidayChildcare.badge")}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            {t("seo.holidayChildcare.title")}
          </h1>
          <p className="text-white/85 text-lg sm:text-xl max-w-2xl mx-auto mb-4">
            {t("seo.holidayChildcare.subtitle")}
          </p>
          <p className="text-white/70 text-base max-w-xl mx-auto mb-8">
            {t("seo.holidayChildcare.subtitleExtra")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-white/90 transition-opacity shadow-warm text-lg"
            >
              <Calendar className="w-5 h-5" />
              {t("seo.holidayChildcare.ctaBookBefore")}
            </Link>
            <a
              href="https://wa.me/212656643375"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/15 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/25 transition-colors text-lg border border-white/30"
            >
              <MessageCircle className="w-5 h-5" />
              {t("seo.holidayChildcare.ctaWhatsapp")}
            </a>
          </div>
        </div>
      </section>

      {/* Trust banner */}
      <section className="bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-1">
              <Baby className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("seo.holidayChildcare.stat1")}</span>
              <span className="text-xs text-muted-foreground">{t("seo.holidayChildcare.stat1Label")}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("seo.holidayChildcare.stat2")}</span>
              <span className="text-xs text-muted-foreground">{t("seo.holidayChildcare.stat2Label")}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("seo.holidayChildcare.stat3")}</span>
              <span className="text-xs text-muted-foreground">{t("seo.holidayChildcare.stat3Label")}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Languages className="w-6 h-6 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("seo.holidayChildcare.stat4")}</span>
              <span className="text-xs text-muted-foreground">{t("seo.holidayChildcare.stat4Label")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why book before you travel */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
          {t("seo.holidayChildcare.whyBookTitle")}
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          {t("seo.holidayChildcare.whyBookSubtitle")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6 shadow-soft"
              >
                <div className="w-10 h-10 gradient-warm rounded-full flex items-center justify-center shrink-0 shadow-warm">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                    {b.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How to book from abroad — 4 steps */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
            {t("seo.holidayChildcare.howTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="text-center">
                  <div className="mx-auto mb-5 relative">
                    <div className="w-16 h-16 gradient-warm rounded-full flex items-center justify-center shadow-warm mx-auto">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-7 h-7 bg-accent text-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-soft">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why families trust us */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
          {t("seo.holidayChildcare.trustTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="flex items-start gap-4 bg-card border border-border rounded-2xl p-6 shadow-soft"
              >
                <div className="w-10 h-10 gradient-warm rounded-full flex items-center justify-center shrink-0 shadow-warm">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                    {r.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {r.desc}
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
            {t("seo.holidayChildcare.faqTitle")}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-4">
            {t("seo.holidayChildcare.finalCtaTitle")}
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            {t("seo.holidayChildcare.finalCtaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-white/90 transition-opacity shadow-warm text-lg"
            >
              <Calendar className="w-5 h-5" />
              {t("seo.holidayChildcare.ctaBookBefore")}
            </Link>
            <a
              href="https://wa.me/212656643375"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/15 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/25 transition-colors text-lg border border-white/30"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
