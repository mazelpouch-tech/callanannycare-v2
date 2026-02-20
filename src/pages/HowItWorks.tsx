import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Calendar,
  Heart,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface FAQItemProps {
  faq: { question: string; answer: string };
}

function FAQItem({ faq }: FAQItemProps) {
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

export default function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      number: 1,
      title: t("howItWorks.step1Title"),
      icon: Search,
      description: t("howItWorks.step1Desc"),
    },
    {
      number: 2,
      title: t("howItWorks.step2Title"),
      icon: Calendar,
      description: t("howItWorks.step2Desc"),
    },
    {
      number: 3,
      title: t("howItWorks.step3Title"),
      icon: Heart,
      description: t("howItWorks.step3Desc"),
    },
  ];

  const faqs = [
    {
      question: t("howItWorks.faq1Q"),
      answer: t("howItWorks.faq1A"),
    },
    {
      question: t("howItWorks.faq2Q"),
      answer: t("howItWorks.faq2A"),
    },
    {
      question: t("howItWorks.faq3Q"),
      answer: t("howItWorks.faq3A"),
    },
    {
      question: t("howItWorks.faq4Q"),
      answer: t("howItWorks.faq4A"),
    },
    {
      question: t("howItWorks.faq5Q"),
      answer: t("howItWorks.faq5A"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t("howItWorks.title")}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="text-center">
                {/* Numbered Circle */}
                <div className="mx-auto mb-6 relative">
                  <div className="w-20 h-20 gradient-warm rounded-full flex items-center justify-center shadow-warm mx-auto">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-foreground text-sm font-bold rounded-full flex items-center justify-center shadow-soft">
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Connector line (visible on md+) */}
        <div className="hidden md:block relative -mt-[calc(20rem-2.5rem)]">
          <div className="absolute top-1/2 left-[20%] right-[20%] h-0.5 bg-border -z-10" />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {t("howItWorks.faqLabel")}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              {t("howItWorks.faqTitle")}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} faq={faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {t("howItWorks.ctaTitle")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            {t("howItWorks.ctaSubtitle")}
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 gradient-warm text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-warm text-lg"
          >
            <Calendar className="w-5 h-5" />
            {t("common.bookANanny")}
          </Link>
        </div>
      </section>
    </div>
  );
}
