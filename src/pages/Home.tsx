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

const features = [
  {
    icon: Shield,
    title: "Verified Nannies",
    description:
      "Every nanny is background-checked and certified for your peace of mind.",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description:
      "Book by the hour \u2014 flexible scheduling to fit your needs.",
  },
  {
    icon: Star,
    title: "Trusted Care",
    description:
      "Rated and reviewed by Marrakech families just like yours.",
  },
];

const steps = [
  {
    number: 1,
    title: "Browse Nannies",
    description: "Browse verified nannies in your area of Marrakech.",
  },
  {
    number: 2,
    title: "Book a Session",
    description: "Select your date, time, and preferred nanny.",
  },
  {
    number: 3,
    title: "Enjoy Peace of Mind",
    description: "Enjoy peace of mind with trusted childcare.",
  },
];

export default function Home() {
  const { nannies } = useData();

  const featuredNannies = nannies.filter((n) => n.available).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* ===== Hero Section ===== */}
      <section className="gradient-sand pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div className="text-center lg:text-left">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                Trusted Childcare in{" "}
                <span className="text-gradient-warm">Marrakech</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Connect with verified, caring nannies for your little ones. Book in
                minutes, relax for hours.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link
                  to="/book"
                  className="gradient-warm text-white rounded-full px-8 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2"
                >
                  Book a Nanny
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/nannies"
                  className="border border-primary text-primary rounded-full px-8 py-3 font-semibold hover:bg-primary/5 transition-colors flex items-center gap-2"
                >
                  Browse Nannies
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="mt-12 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-8 sm:gap-10">
                <div className="flex items-center gap-3">
                  <div className="gradient-warm w-10 h-10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-foreground">50+</p>
                    <p className="text-sm text-muted-foreground">Verified Nannies</p>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-10 bg-border" />

                <div className="flex items-center gap-3">
                  <div className="gradient-warm w-10 h-10 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-foreground">1000+</p>
                    <p className="text-sm text-muted-foreground">Happy Families</p>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-10 bg-border" />

                <div className="flex items-center gap-3">
                  <div className="gradient-warm w-10 h-10 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-foreground">4.9</p>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Column */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-warm">
                <img
                  src="/hero-photo.jpg"
                  alt="A nanny playing with children in a beautiful Marrakech garden"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 gradient-warm rounded-2xl -z-10 opacity-30" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-accent rounded-full -z-10 opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us Section ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
              Why Choose call a nanny?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              We make finding trusted childcare in Marrakech simple and stress-free.
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
              Booking a nanny in Marrakech has never been easier
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
              Our Top Nannies
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Meet some of our most loved and highly rated nannies in Marrakech.
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
              Browse All Nannies
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
              Choose the plan that fits your family's needs
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
                      Most Popular
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
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-6">
            Ready to Find Your Perfect Nanny?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Join hundreds of Marrakech families who trust call a nanny for
            reliable childcare.
          </p>
          <Link
            to="/book"
            className="gradient-warm text-white rounded-full px-10 py-4 font-semibold text-lg hover:opacity-90 transition-opacity shadow-warm inline-flex items-center gap-2"
          >
            Book Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
