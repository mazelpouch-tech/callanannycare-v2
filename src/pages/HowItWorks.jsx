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

const steps = [
  {
    number: 1,
    title: "Browse & Choose",
    icon: Search,
    description:
      "Browse verified nannies in your area of Marrakech. View profiles, ratings, and specialties.",
  },
  {
    number: 2,
    title: "Book Your Session",
    icon: Calendar,
    description:
      "Select your date, time, and preferred nanny. Choose hourly, half-day, or full-day.",
  },
  {
    number: 3,
    title: "Enjoy Peace of Mind",
    icon: Heart,
    description:
      "Enjoy peace of mind with trusted childcare. Rate your experience.",
  },
];

const faqs = [
  {
    question: "How are nannies verified?",
    answer:
      "All our nannies undergo thorough background checks, provide verified certifications in childcare and first aid, and supply professional references that we personally contact. We also conduct in-person interviews to ensure the highest standard of care for your children.",
  },
  {
    question: "Can I book same-day?",
    answer:
      "Yes, same-day bookings are available subject to nanny availability. We recommend booking as early as possible to secure your preferred nanny, but our platform is designed to accommodate last-minute needs whenever possible.",
  },
  {
    question: "What if I need to cancel?",
    answer:
      "We offer free cancellation up to 24 hours before your scheduled session. Cancellations made within 24 hours may be subject to a cancellation fee. You can manage your bookings easily through your account.",
  },
  {
    question: "Do nannies come to our hotel?",
    answer:
      "Yes, our nannies provide in-home and in-hotel childcare services anywhere in Marrakech. Whether you are staying at a riad, hotel, or private villa, our nannies will come directly to your location for your convenience.",
  },
  {
    question: "What ages do you cover?",
    answer:
      "Our nannies are experienced with children aged 0 to 12 years. Each nanny has specialties listed on their profile, so you can find the best match for your child's age group and specific needs.",
  },
];

function FAQItem({ faq }) {
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
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-warm py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            How It Works
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Booking a nanny in Marrakech has never been easier
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
                FAQ
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Frequently Asked Questions
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
            Ready to Book?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Find the perfect nanny for your family in Marrakech today.
          </p>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 gradient-warm text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-warm text-lg"
          >
            <Calendar className="w-5 h-5" />
            Book a Nanny
          </Link>
        </div>
      </section>
    </div>
  );
}
