import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Clock,
  DollarSign,
  Shield,
  MapPin,
  Users,
  CheckCircle,
  Send,
  Globe,
  Briefcase,
  Star,
  Baby,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import PhoneInput from "../components/PhoneInput";

const T = {
  fr: {
    heroTitle: "Rejoignez l'Équipe Call a Nanny",
    heroSubtitle:
      "Nous recrutons des nounous passionnées à travers tout le Maroc. Rejoignez notre réseau de professionnelles de la garde d'enfants.",
    applyNow: "Postuler Maintenant",
    whyJoin: "Pourquoi Nous Rejoindre ?",
    benefits: [
      {
        title: "Horaires Flexibles",
        desc: "Choisissez vos disponibilités et travaillez selon votre emploi du temps.",
      },
      {
        title: "Rémunération Attractive",
        desc: "Salaires compétitifs avec paiement régulier et transparent.",
      },
      {
        title: "Formation Continue",
        desc: "Bénéficiez de formations en premiers secours et développement de l'enfant.",
      },
      {
        title: "Environnement Sûr",
        desc: "Travaillez avec des familles vérifiées dans un cadre professionnel.",
      },
      {
        title: "Opportunités de Croissance",
        desc: "Évoluez au sein de notre réseau grandissant à travers le Maroc.",
      },
      {
        title: "Accompagnement",
        desc: "Notre équipe vous soutient au quotidien pour une expérience réussie.",
      },
    ],
    formTitle: "Formulaire de Candidature",
    formSubtitle: "Remplissez le formulaire ci-dessous pour postuler",
    personalInfo: "Informations Personnelles",
    fullName: "Nom complet",
    fullNamePlaceholder: "Votre nom et prénom",
    phone: "Numéro de téléphone",
    email: "Adresse email",
    emailPlaceholder: "votre.email@exemple.com",
    age: "Âge",
    agePlaceholder: "Votre âge",
    city: "Ville",
    cityPlaceholder: "Sélectionnez votre ville",
    otherCity: "Autre ville",
    otherCityPlaceholder: "Précisez votre ville",
    experience: "Expérience & Compétences",
    yearsExperience: "Années d'expérience en garde d'enfants",
    yearsPlaceholder: "Ex: 3",
    languages: "Langues parlées",
    languagesPlaceholder: "Ex: Arabe, Français, Anglais",
    hasFirstAid: "Avez-vous une formation en premiers secours ?",
    yes: "Oui",
    no: "Non",
    availability: "Disponibilité",
    availabilityOptions: "Quand êtes-vous disponible ?",
    fullTime: "Temps plein",
    partTime: "Temps partiel",
    weekends: "Week-ends uniquement",
    evenings: "Soirées uniquement",
    flexible: "Flexible",
    startDate: "Date de début souhaitée",
    motivation: "Motivation",
    whyNanny: "Pourquoi souhaitez-vous devenir nounou chez Call a Nanny ?",
    whyNannyPlaceholder:
      "Parlez-nous de votre passion pour la garde d'enfants, votre expérience et ce qui vous motive...",
    submit: "Envoyer ma Candidature",
    submitting: "Envoi en cours...",
    successTitle: "Candidature Envoyée !",
    successMessage:
      "Merci pour votre candidature ! Notre équipe vous contactera dans les plus brefs délais. Vous pouvez également nous envoyer votre candidature par WhatsApp.",
    sendWhatsApp: "Envoyer par WhatsApp",
    newApplication: "Nouvelle Candidature",
    backHome: "Retour à l'accueil",
    required: "Requis",
    lookingFor: "Ce Que Nous Recherchons",
    lookingForItems: [
      "Expérience avec les enfants de tous âges",
      "Fiabilité et ponctualité",
      "Maîtrise de l'arabe et/ou du français",
      "Attitude positive et patience",
      "Références vérifiables",
      "Résidence au Maroc",
    ],
  },
  en: {
    heroTitle: "Join the Call a Nanny Team",
    heroSubtitle:
      "We're hiring passionate nannies across Morocco. Join our network of professional childcare providers.",
    applyNow: "Apply Now",
    whyJoin: "Why Join Us?",
    benefits: [
      {
        title: "Flexible Schedule",
        desc: "Choose your availability and work on your own terms.",
      },
      {
        title: "Competitive Pay",
        desc: "Attractive salaries with regular and transparent payments.",
      },
      {
        title: "Ongoing Training",
        desc: "Get trained in first aid and child development.",
      },
      {
        title: "Safe Environment",
        desc: "Work with verified families in a professional setting.",
      },
      {
        title: "Growth Opportunities",
        desc: "Grow with our expanding network across Morocco.",
      },
      {
        title: "Team Support",
        desc: "Our team supports you daily for a successful experience.",
      },
    ],
    formTitle: "Application Form",
    formSubtitle: "Fill in the form below to apply",
    personalInfo: "Personal Information",
    fullName: "Full name",
    fullNamePlaceholder: "Your full name",
    phone: "Phone number",
    email: "Email address",
    emailPlaceholder: "your.email@example.com",
    age: "Age",
    agePlaceholder: "Your age",
    city: "City",
    cityPlaceholder: "Select your city",
    otherCity: "Other city",
    otherCityPlaceholder: "Specify your city",
    experience: "Experience & Skills",
    yearsExperience: "Years of childcare experience",
    yearsPlaceholder: "e.g. 3",
    languages: "Languages spoken",
    languagesPlaceholder: "e.g. Arabic, French, English",
    hasFirstAid: "Do you have first aid training?",
    yes: "Yes",
    no: "No",
    availability: "Availability",
    availabilityOptions: "When are you available?",
    fullTime: "Full-time",
    partTime: "Part-time",
    weekends: "Weekends only",
    evenings: "Evenings only",
    flexible: "Flexible",
    startDate: "Desired start date",
    motivation: "Motivation",
    whyNanny: "Why do you want to become a nanny at Call a Nanny?",
    whyNannyPlaceholder:
      "Tell us about your passion for childcare, your experience, and what motivates you...",
    submit: "Submit Application",
    submitting: "Submitting...",
    successTitle: "Application Sent!",
    successMessage:
      "Thank you for your application! Our team will contact you as soon as possible. You can also send your application via WhatsApp.",
    sendWhatsApp: "Send via WhatsApp",
    newApplication: "New Application",
    backHome: "Back to Home",
    required: "Required",
    lookingFor: "What We're Looking For",
    lookingForItems: [
      "Experience with children of all ages",
      "Reliability and punctuality",
      "Fluency in Arabic and/or French",
      "Positive attitude and patience",
      "Verifiable references",
      "Resident in Morocco",
    ],
  },
};

const CITIES = [
  "Marrakech",
  "Casablanca",
  "Rabat",
  "Tanger",
  "Fès",
  "Agadir",
  "Essaouira",
  "Meknès",
  "Oujda",
  "Kénitra",
  "Tétouan",
  "El Jadida",
  "Nador",
  "Béni Mellal",
  "Ifrane",
];

const inputClass =
  "w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow";

const benefitIcons = [Clock, DollarSign, Shield, Heart, Star, Users];

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  age: string;
  city: string;
  otherCity: string;
  yearsExperience: string;
  languages: string;
  hasFirstAid: boolean | null;
  availability: string;
  startDate: string;
  motivation: string;
}

const initialForm: FormData = {
  fullName: "",
  phone: "",
  email: "",
  age: "",
  city: "",
  otherCity: "",
  yearsExperience: "",
  languages: "",
  hasFirstAid: null,
  availability: "",
  startDate: "",
  motivation: "",
};

function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: typeof Heart;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <Icon className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground flex-1 text-left">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function Careers() {
  const { locale } = useLanguage();
  const t = T[locale];
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const buildSummary = () => {
    const city = form.city === "other" ? form.otherCity : form.city;
    const firstAid =
      form.hasFirstAid === true ? t.yes : form.hasFirstAid === false ? t.no : "—";
    return [
      `📋 *${locale === "fr" ? "CANDIDATURE NOUNOU" : "NANNY APPLICATION"}*`,
      ``,
      `👤 *${t.personalInfo}*`,
      `${t.fullName}: ${form.fullName}`,
      `${t.phone}: ${form.phone}`,
      `${t.email}: ${form.email || "—"}`,
      `${t.age}: ${form.age}`,
      `${t.city}: ${city}`,
      ``,
      `💼 *${t.experience}*`,
      `${t.yearsExperience}: ${form.yearsExperience}`,
      `${t.languages}: ${form.languages}`,
      `${t.hasFirstAid}: ${firstAid}`,
      ``,
      `📅 *${t.availability}*`,
      `${t.availabilityOptions}: ${form.availability}`,
      `${t.startDate}: ${form.startDate || "—"}`,
      ``,
      `💬 *${t.motivation}*`,
      form.motivation || "—",
    ].join("\n");
  };

  const isValid =
    form.fullName.trim() &&
    form.phone.trim() &&
    form.age.trim() &&
    (form.city && (form.city !== "other" || form.otherCity.trim())) &&
    form.yearsExperience.trim() &&
    form.languages.trim() &&
    form.availability;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSending(true);
    // Send directly via WhatsApp
    const summary = buildSummary();
    const url = `https://wa.me/212656643375?text=${encodeURIComponent(summary)}`;
    window.open(url, "_blank");
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
    }, 500);
  };

  const handleWhatsApp = () => {
    const summary = buildSummary();
    window.open(
      `https://wa.me/212656643375?text=${encodeURIComponent(summary)}`,
      "_blank"
    );
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-foreground">
            {t.successTitle}
          </h2>
          <p className="text-muted-foreground">{t.successMessage}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleWhatsApp}
              className="w-full py-3 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t.sendWhatsApp}
            </button>
            <button
              onClick={() => {
                setForm(initialForm);
                setSubmitted(false);
              }}
              className="w-full py-3 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              {t.newApplication}
            </button>
            <Link
              to="/"
              className="text-sm text-primary hover:underline"
            >
              {t.backHome}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-warm py-20 px-4">
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Briefcase className="w-4 h-4" />
            {locale === "fr" ? "Nous recrutons !" : "We're hiring!"}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
            {t.heroSubtitle}
          </p>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-white/90 transition-colors shadow-lg"
          >
            <Send className="w-4 h-4" />
            {t.applyNow}
          </a>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-white" />
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-16 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center text-foreground mb-12">
            {t.whyJoin}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.benefits.map((b, i) => {
              const Icon = benefitIcons[i];
              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-soft transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What We're Looking For */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center text-foreground mb-10">
            {t.lookingFor}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {t.lookingForItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-card border border-border rounded-lg p-4"
              >
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <span className="text-foreground text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-16 px-4 bg-background scroll-mt-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-3">
              {t.formTitle}
            </h2>
            <p className="text-muted-foreground">{t.formSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <Section icon={Users} title={t.personalInfo}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.fullName} <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.phone} <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  defaultCountry="MA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder={t.emailPlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.age} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="65"
                    className={inputClass}
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                    placeholder={t.agePlaceholder}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.city} <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    required
                  >
                    <option value="">{t.cityPlaceholder}</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="other">
                      {locale === "fr" ? "Autre..." : "Other..."}
                    </option>
                  </select>
                </div>
              </div>

              {form.city === "other" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.otherCity} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.otherCity}
                    onChange={(e) => set("otherCity", e.target.value)}
                    placeholder={t.otherCityPlaceholder}
                    required
                  />
                </div>
              )}
            </Section>

            {/* Experience */}
            <Section icon={Briefcase} title={t.experience}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.yearsExperience} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.yearsExperience}
                    onChange={(e) => set("yearsExperience", e.target.value)}
                    placeholder={t.yearsPlaceholder}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t.languages} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.languages}
                    onChange={(e) => set("languages", e.target.value)}
                    placeholder={t.languagesPlaceholder}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.hasFirstAid}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="firstAid"
                      checked={form.hasFirstAid === true}
                      onChange={() => set("hasFirstAid", true)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">{t.yes}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="firstAid"
                      checked={form.hasFirstAid === false}
                      onChange={() => set("hasFirstAid", false)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">{t.no}</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Availability */}
            <Section icon={Clock} title={t.availability}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.availabilityOptions} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "full-time", label: t.fullTime },
                    { key: "part-time", label: t.partTime },
                    { key: "weekends", label: t.weekends },
                    { key: "evenings", label: t.evenings },
                    { key: "flexible", label: t.flexible },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => set("availability", opt.key)}
                      className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        form.availability === opt.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.startDate}
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
            </Section>

            {/* Motivation */}
            <Section icon={Heart} title={t.motivation}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t.whyNanny}
                </label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  value={form.motivation}
                  onChange={(e) => set("motivation", e.target.value)}
                  placeholder={t.whyNannyPlaceholder}
                  rows={4}
                />
              </div>
            </Section>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || sending}
              className="w-full gradient-warm text-white font-semibold py-4 rounded-full hover:opacity-90 transition-opacity shadow-warm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              <Send className="w-5 h-5" />
              {sending ? t.submitting : t.submit}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
