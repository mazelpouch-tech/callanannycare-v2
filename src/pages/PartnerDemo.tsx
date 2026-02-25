import { useState } from "react";
import {
  CheckCircle2,
  Calendar,
  Bell,
  FileText,
  Globe,
  Smartphone,
  Users,
  LayoutDashboard,
  MessageSquare,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Clock,
  ChevronDown,
  Phone,
  Mail,
} from "lucide-react";

// ─── Copy (bilingual) ────────────────────────────────────────────────────────

const copy = {
  en: {
    nav: { contact: "Contact Us", demo: "Book a Demo" },
    hero: {
      badge: "For Hotels & Riads in Marrakech",
      title: "Offer Premium Childcare to Your Guests",
      sub: "Call a Nanny is the complete digital platform to manage certified nannies — from instant booking to automated invoicing. Zero paperwork, 100% professional.",
      cta1: "Book a Partnership Demo",
      cta2: "See How It Works",
      trustLine: "Trusted by properties across Marrakech · 50+ verified nannies",
    },
    stats: [
      { value: "50+", label: "Verified Nannies" },
      { value: "3", label: "Languages (EN · FR · AR)" },
      { value: "<10 min", label: "Average Booking Time" },
      { value: "100%", label: "Digital & Paperless" },
    ],
    howTitle: "How It Works — End to End",
    howSub: "Three roles, one seamless platform. Your guests book, you manage, nannies deliver.",
    steps: [
      {
        num: "01",
        role: "Guest",
        title: "Books in Minutes",
        desc: "A simple online form — date, time, number of children. Guests receive instant WhatsApp & email confirmation with booking details and tracking link.",
      },
      {
        num: "02",
        role: "Admin",
        title: "Assigns Instantly",
        desc: "The admin dashboard auto-assigns the best available nanny. Real-time overview of all bookings, statuses, and revenue. Full control from any device.",
      },
      {
        num: "03",
        role: "Nanny",
        title: "Confirms & Delivers",
        desc: "Nanny receives a push notification with full booking details. She confirms via her personal portal. On checkout, an invoice is sent automatically.",
      },
    ],
    featuresTitle: "Everything You Need. Nothing You Don't.",
    featuresSub: "Built specifically for hospitality childcare operations in Marrakech.",
    features: [
      { icon: Calendar, title: "Smart Booking System", desc: "Multi-step booking form with date, time, children count. Conflict detection built in." },
      { icon: LayoutDashboard, title: "Admin Dashboard", desc: "Full booking overview, nanny management, revenue tracking, calendar view." },
      { icon: Users, title: "Nanny Portal", desc: "Each nanny has her own app — schedule, bookings, notifications, profile." },
      { icon: Bell, title: "Push Notifications", desc: "Real-time alerts to both admin and nannies when bookings are created or updated." },
      { icon: FileText, title: "Automated Invoicing", desc: "Invoices are generated and emailed automatically when a booking is completed." },
      { icon: MessageSquare, title: "WhatsApp Integration", desc: "Automatic WhatsApp confirmations, reminders, and invoices to guests." },
      { icon: Globe, title: "Multi-Language", desc: "Full English & French interface. Guests can book in their preferred language." },
      { icon: Smartphone, title: "Progressive Web App", desc: "Works on any device. No app store needed — install directly from the browser." },
    ],
    partnerTitle: "Why Partner With Us",
    partnerSub: "Add a premium service to your offering with zero operational cost.",
    benefits: [
      { icon: Star, title: "Elevate Guest Experience", desc: "Offer a fully managed, professional childcare service under your hotel brand." },
      { icon: Zap, title: "Zero Operational Overhead", desc: "We handle nanny management, scheduling, and invoicing. You stay focused on hospitality." },
      { icon: Shield, title: "Verified & Insured Nannies", desc: "All nannies are background-checked, trained, and professionally managed." },
      { icon: Clock, title: "Live in Days, Not Months", desc: "Setup is fast. Your branded booking link is ready in 48 hours." },
    ],
    platformTitle: "Platform Preview",
    platformSub: "A polished, professional interface your guests and team will love.",
    panels: [
      { label: "Guest Booking", color: "from-[#c17448] to-[#d4895a]" },
      { label: "Admin Dashboard", color: "from-[#4a7a5c] to-[#5a9470]" },
      { label: "Nanny Portal", color: "from-[#7a5c8c] to-[#9a7aaa]" },
    ],
    ctaTitle: "Ready to Offer Childcare at Your Property?",
    ctaSub: "Get in touch and we'll set up a personalised demo walkthrough for your team.",
    ctaBtn: "Book a Demo Call",
    ctaOr: "or reach us directly",
    footer: "© 2026 Call a Nanny · Marrakech, Morocco · callanannycare.com",
  },
  fr: {
    nav: { contact: "Nous Contacter", demo: "Réserver un Demo" },
    hero: {
      badge: "Pour Hôtels & Riads à Marrakech",
      title: "Offrez une Garde d'Enfants Premium à Vos Clients",
      sub: "Call a Nanny est la plateforme digitale complète pour gérer des nounous certifiées — de la réservation instantanée à la facturation automatique. Zéro paperasse, 100% professionnel.",
      cta1: "Réserver un Demo Partenariat",
      cta2: "Voir Comment Ça Marche",
      trustLine: "Partenaire de propriétés à Marrakech · 50+ nounous vérifiées",
    },
    stats: [
      { value: "50+", label: "Nounous Vérifiées" },
      { value: "3", label: "Langues (EN · FR · AR)" },
      { value: "<10 min", label: "Temps de Réservation" },
      { value: "100%", label: "Digital & Sans Papiers" },
    ],
    howTitle: "Comment Ça Marche — De A à Z",
    howSub: "Trois rôles, une plateforme fluide. Vos clients réservent, vous gérez, les nounous livrent.",
    steps: [
      {
        num: "01",
        role: "Client",
        title: "Réserve en Minutes",
        desc: "Un formulaire simple — date, heure, nombre d'enfants. Confirmation instantanée par WhatsApp & email avec lien de suivi.",
      },
      {
        num: "02",
        role: "Admin",
        title: "Assigne Instantanément",
        desc: "Le tableau de bord assigne automatiquement la meilleure nounou disponible. Vue en temps réel de toutes les réservations et revenus.",
      },
      {
        num: "03",
        role: "Nounou",
        title: "Confirme & Intervient",
        desc: "La nounou reçoit une notification push avec les détails complets. Elle confirme via son portail. La facture est envoyée automatiquement au départ.",
      },
    ],
    featuresTitle: "Tout ce Dont Vous Avez Besoin.",
    featuresSub: "Conçu spécifiquement pour les opérations de garde d'enfants hôtelière à Marrakech.",
    features: [
      { icon: Calendar, title: "Système de Réservation", desc: "Formulaire multi-étapes avec date, heure, nombre d'enfants. Détection de conflits intégrée." },
      { icon: LayoutDashboard, title: "Tableau de Bord Admin", desc: "Vue complète des réservations, gestion des nounous, suivi des revenus, vue calendrier." },
      { icon: Users, title: "Portail Nounou", desc: "Chaque nounou a sa propre appli — planning, réservations, notifications, profil." },
      { icon: Bell, title: "Notifications Push", desc: "Alertes en temps réel à l'admin et aux nounous lors de nouvelles réservations ou mises à jour." },
      { icon: FileText, title: "Facturation Automatique", desc: "Les factures sont générées et envoyées par email automatiquement à la fin de la prestation." },
      { icon: MessageSquare, title: "Intégration WhatsApp", desc: "Confirmations, rappels et factures automatiques par WhatsApp aux clients." },
      { icon: Globe, title: "Multilingue", desc: "Interface complète en anglais et français. Les clients réservent dans leur langue." },
      { icon: Smartphone, title: "Application Web Progressive", desc: "Fonctionne sur tout appareil. Aucun app store nécessaire — installation directe depuis le navigateur." },
    ],
    partnerTitle: "Pourquoi Nous Rejoindre",
    partnerSub: "Ajoutez un service premium à votre offre sans coût opérationnel.",
    benefits: [
      { icon: Star, title: "Améliorez l'Expérience Client", desc: "Proposez un service de garde professionnel et géré sous la marque de votre hôtel." },
      { icon: Zap, title: "Zéro Surcharge Opérationnelle", desc: "Nous gérons les nounous, le planning et la facturation. Vous restez focus sur l'hospitalité." },
      { icon: Shield, title: "Nounous Vérifiées & Assurées", desc: "Toutes les nounous sont vérifiées, formées et gérées professionnellement." },
      { icon: Clock, title: "Opérationnel en 48h", desc: "La configuration est rapide. Votre lien de réservation personnalisé est prêt en 48 heures." },
    ],
    platformTitle: "Aperçu de la Plateforme",
    platformSub: "Une interface soignée et professionnelle que vos clients et votre équipe adoreront.",
    panels: [
      { label: "Réservation Client", color: "from-[#c17448] to-[#d4895a]" },
      { label: "Tableau de Bord", color: "from-[#4a7a5c] to-[#5a9470]" },
      { label: "Portail Nounou", color: "from-[#7a5c8c] to-[#9a7aaa]" },
    ],
    ctaTitle: "Prêt à Proposer la Garde d'Enfants dans Votre Établissement ?",
    ctaSub: "Contactez-nous et nous organiserons une démonstration personnalisée pour votre équipe.",
    ctaBtn: "Réserver un Appel Demo",
    ctaOr: "ou contactez-nous directement",
    footer: "© 2026 Call a Nanny · Marrakech, Maroc · callanannycare.com",
  },
};

// ─── Booking UI Mockup ───────────────────────────────────────────────────────

function BookingMockup() {
  return (
    <div className="bg-[#faf7f4] rounded-2xl overflow-hidden shadow-xl border border-[#e8dfd6] text-[#2b1f17]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-white border-b border-[#e8dfd6] px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-2 text-xs text-[#9a8878]">callanannycare.com/book</span>
      </div>
      <div className="p-5">
        <div className="flex gap-2 mb-4">
          {[1,2,3,4].map(n => (
            <div key={n} className={`flex-1 h-1.5 rounded-full ${n === 1 ? "bg-[#c17448]" : "bg-[#e8dfd6]"}`} />
          ))}
        </div>
        <p className="text-xs font-semibold text-[#c17448] uppercase tracking-wider mb-1">Step 1 of 4</p>
        <h3 className="font-bold text-base text-[#2b1f17] mb-3">Choose Date & Time</h3>
        <div className="bg-white rounded-xl border border-[#e8dfd6] p-3 mb-3">
          <div className="text-center text-xs font-semibold text-[#2b1f17] mb-2">March 2026</div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-[#9a8878] mb-1">
            {["S","M","T","W","T","F","S"].map((d,i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
            {["","","","","","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"].map((d,i) => (
              <div key={i} className={`py-0.5 rounded-full ${d === "15" ? "bg-[#c17448] text-white font-bold" : "text-[#2b1f17]"}`}>{d}</div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white rounded-lg border border-[#e8dfd6] p-2 text-[11px]">
            <p className="text-[#9a8878] text-[10px] mb-0.5">Start time</p>
            <p className="font-semibold text-[#2b1f17]">10:00 AM</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e8dfd6] p-2 text-[11px]">
            <p className="text-[#9a8878] text-[10px] mb-0.5">End time</p>
            <p className="font-semibold text-[#2b1f17]">2:00 PM</p>
          </div>
        </div>
        <button className="w-full py-2 rounded-xl text-white text-sm font-semibold" style={{background: "linear-gradient(135deg, #c17448, #d4895a)"}}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Admin Dashboard Mockup ──────────────────────────────────────────────────

function AdminMockup() {
  const bookings = [
    { name: "Sarah Johnson", nanny: "Fatima B.", status: "confirmed", time: "10:00 AM", color: "bg-green-100 text-green-700" },
    { name: "Marc Dupont", nanny: "Kenza A.", status: "pending", time: "2:00 PM", color: "bg-amber-100 text-amber-700" },
    { name: "Emma Clarke", nanny: "Doha E.", status: "confirmed", time: "4:00 PM", color: "bg-green-100 text-green-700" },
  ];
  return (
    <div className="bg-[#faf7f4] rounded-2xl overflow-hidden shadow-xl border border-[#e8dfd6]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-white border-b border-[#e8dfd6] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#c17448] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">CaN</span>
          </div>
          <span className="text-xs font-bold text-[#2b1f17]">Admin Dashboard</span>
        </div>
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded-full bg-[#f0ebe5] flex items-center justify-center">
            <Bell className="w-3 h-3 text-[#9a8878]" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Today", val: "8", color: "text-[#c17448]" },
            { label: "Nannies", val: "12", color: "text-[#4a7a5c]" },
            { label: "Revenue", val: "€640", color: "text-[#7a5c8c]" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-2 border border-[#e8dfd6] text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[9px] text-[#9a8878]">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-[#9a8878] uppercase tracking-wider mb-2">Today's Bookings</p>
        <div className="space-y-1.5">
          {bookings.map((b, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e8dfd6] px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#2b1f17]">{b.name}</p>
                <p className="text-[9px] text-[#9a8878]">{b.nanny} · {b.time}</p>
              </div>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${b.color}`}>{b.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Nanny Portal Mockup ─────────────────────────────────────────────────────

function NannyMockup() {
  return (
    <div className="bg-[#faf7f4] rounded-2xl overflow-hidden shadow-xl border border-[#e8dfd6]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-white border-b border-[#e8dfd6] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#e8dfd6] flex items-center justify-center text-[11px] font-bold text-[#c17448]">FZ</div>
        <div>
          <p className="text-[11px] font-bold text-[#2b1f17]">Fatima Zahra</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-[9px] text-green-600">Available</p>
          </div>
        </div>
        <div className="ml-auto relative">
          <Bell className="w-4 h-4 text-[#9a8878]" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[7px] font-bold">2</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-semibold text-[#9a8878] uppercase tracking-wider mb-2">My Bookings</p>
        <div className="space-y-2">
          {[
            { client: "Sarah Johnson", date: "Today · 10:00 AM", hotel: "Riad Yasmine", kids: "2 children", status: "confirmed", color: "bg-green-100 text-green-700" },
            { client: "Emma Clarke", date: "Today · 4:00 PM", hotel: "La Mamounia", kids: "1 child", status: "pending", color: "bg-amber-100 text-amber-700" },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e8dfd6] p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-[#2b1f17]">{b.client}</p>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${b.color}`}>{b.status}</span>
              </div>
              <p className="text-[9px] text-[#9a8878]">{b.date}</p>
              <p className="text-[9px] text-[#9a8878]">{b.hotel} · {b.kids}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-[#c17448]/10 rounded-xl p-2.5 border border-[#c17448]/20">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-[#c17448]" />
            <p className="text-[10px] font-semibold text-[#c17448]">New booking assigned!</p>
          </div>
          <p className="text-[9px] text-[#9a8878] mt-0.5 ml-5">Emma Clarke · Today 4:00 PM</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PartnerDemo() {
  const [lang, setLang] = useState<"en" | "fr">("en");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const c = copy[lang];

  const faqs = lang === "en" ? [
    { q: "How quickly can we get started?", a: "Setup takes 48 hours. We configure your branded booking link, onboard your team, and you're live." },
    { q: "Do we need a separate app?", a: "No. The platform is a Progressive Web App — guests and nannies install it directly from the browser, no app store required." },
    { q: "What languages do guests see?", a: "The booking form is fully bilingual (EN/FR). Language is auto-detected or guest-selected." },
    { q: "How are invoices handled?", a: "Invoices are automatically generated and emailed to guests when a booking is completed. Your team gets a WhatsApp notification too." },
  ] : [
    { q: "Combien de temps pour démarrer ?", a: "La configuration prend 48 heures. Nous configurons votre lien de réservation personnalisé, formons votre équipe et vous êtes opérationnel." },
    { q: "Faut-il une application séparée ?", a: "Non. La plateforme est une Progressive Web App — les clients et nounous l'installent directement depuis le navigateur, sans app store." },
    { q: "Quelles langues pour les clients ?", a: "Le formulaire de réservation est entièrement bilingue (EN/FR). La langue est détectée automatiquement ou choisie par le client." },
    { q: "Comment sont gérées les factures ?", a: "Les factures sont automatiquement générées et envoyées par email aux clients à la fin de la prestation. Votre équipe reçoit aussi une notification WhatsApp." },
  ];

  return (
    <div className="min-h-screen bg-[#faf7f4]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#2b1f17" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e8dfd6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Call a Nanny" className="w-9 h-9 object-contain" />
            <span className="font-bold text-lg text-[#2b1f17]" style={{ fontFamily: "'Playfair Display', serif" }}>
              call a nanny
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(l => l === "en" ? "fr" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#9a8878] hover:bg-[#f0ebe5] transition-colors"
            >
              <Globe className="w-4 h-4" />
              {lang === "en" ? "FR" : "EN"}
            </button>
            <a
              href="https://wa.me/212600000000"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #c17448, #d4895a)" }}
            >
              {c.nav.demo}
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#c17448]/5 to-[#4a7a5c]/5" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#c17448]/10 text-[#c17448] border border-[#c17448]/20 mb-5">
                <Star className="w-3.5 h-3.5" />
                {c.hero.badge}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
                {c.hero.title.split("Childcare").map((part, i) => (
                  i === 0
                    ? <span key={i}>{part}<span className="text-[#c17448]">Childcare</span></span>
                    : <span key={i}>{part}</span>
                ))}
              </h1>
              <p className="text-[#6b5a50] text-base sm:text-lg leading-relaxed mb-7 max-w-lg">
                {c.hero.sub}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <a
                  href="mailto:info@callanannycare.com"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:opacity-90 hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #c17448, #d4895a)" }}
                >
                  {c.hero.cta1}
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border-2 border-[#e8dfd6] text-[#6b5a50] hover:bg-[#f0ebe5] transition-colors"
                >
                  {c.hero.cta2}
                </a>
              </div>
              <p className="text-xs text-[#9a8878] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4a7a5c]" />
                {c.hero.trustLine}
              </p>
            </div>
            {/* Real hero photo */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/hero-photo.jpg"
                  alt="Professional childcare in Marrakech"
                  className="w-full h-[360px] object-cover"
                />
              </div>
              {/* Floating cards */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-3 border border-[#e8dfd6] flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2b1f17]">Booking Confirmed</p>
                  <p className="text-[10px] text-[#9a8878]">WhatsApp sent to guest</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-3 border border-[#e8dfd6]">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-[10px] font-semibold text-[#2b1f17]">"Exceptional service!"</p>
                <p className="text-[9px] text-[#9a8878]">— Hotel guest review</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-white border-y border-[#e8dfd6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {c.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold text-[#c17448] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
                <p className="text-sm text-[#9a8878]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              {c.howTitle}
            </h2>
            <p className="text-[#6b5a50] max-w-xl mx-auto">{c.howSub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {c.steps.map((step, i) => (
              <div key={i} className="relative bg-white rounded-2xl border border-[#e8dfd6] p-6 shadow-soft">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 -right-3 z-10">
                    <ArrowRight className="w-6 h-6 text-[#c17448]/40" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-[#c17448]/20" style={{ fontFamily: "'Playfair Display', serif" }}>{step.num}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#c17448]/10 text-[#c17448]">{step.role}</span>
                </div>
                <h3 className="font-bold text-lg text-[#2b1f17] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{step.title}</h3>
                <p className="text-sm text-[#6b5a50] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Preview (Mockups) ── */}
      <section className="py-16 bg-white border-y border-[#e8dfd6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              {c.platformTitle}
            </h2>
            <p className="text-[#6b5a50]">{c.platformSub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-center text-sm font-semibold text-[#9a8878] mb-3">{c.panels[0].label}</p>
              <BookingMockup />
            </div>
            <div>
              <p className="text-center text-sm font-semibold text-[#9a8878] mb-3">{c.panels[1].label}</p>
              <AdminMockup />
            </div>
            <div>
              <p className="text-center text-sm font-semibold text-[#9a8878] mb-3">{c.panels[2].label}</p>
              <NannyMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              {c.featuresTitle}
            </h2>
            <p className="text-[#6b5a50] max-w-lg mx-auto">{c.featuresSub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {c.features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-white rounded-2xl border border-[#e8dfd6] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#c17448]/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[#c17448]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#2b1f17] mb-1.5">{f.title}</h3>
                  <p className="text-xs text-[#6b5a50] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Partner Benefits ── */}
      <section className="py-16 bg-[#2b1f17] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              {c.partnerTitle}
            </h2>
            <p className="text-[#c8b5a5]">{c.partnerSub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {c.benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#c17448]/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-[#c17448]" />
                  </div>
                  <h3 className="font-bold text-sm mb-2">{b.title}</h3>
                  <p className="text-xs text-[#c8b5a5] leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10" style={{ fontFamily: "'Playfair Display', serif" }}>
            {lang === "en" ? "Common Questions" : "Questions Fréquentes"}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#e8dfd6] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-sm text-[#2b1f17]">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#9a8878] shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-[#6b5a50] leading-relaxed border-t border-[#e8dfd6] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#c17448] to-[#a85e38] text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            {c.ctaTitle}
          </h2>
          <p className="text-white/80 mb-8 text-sm sm:text-base leading-relaxed">{c.ctaSub}</p>
          <a
            href="mailto:info@callanannycare.com?subject=Partnership Demo Request"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[#c17448] font-bold text-sm shadow-xl hover:bg-white/95 transition-all hover:-translate-y-0.5 mb-6"
          >
            <Mail className="w-4 h-4" />
            {c.ctaBtn}
          </a>
          <p className="text-white/60 text-xs mb-4">{c.ctaOr}</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="mailto:info@callanannycare.com" className="flex items-center gap-2 text-white/90 text-sm hover:text-white transition-colors">
              <Mail className="w-4 h-4" /> info@callanannycare.com
            </a>
            <span className="text-white/30">·</span>
            <a href="https://wa.me/212600000000" className="flex items-center gap-2 text-white/90 text-sm hover:text-white transition-colors">
              <Phone className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#2b1f17] text-[#9a8878] text-center py-6 text-xs">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/logo-icon.png" alt="Call a Nanny" className="w-6 h-6 object-contain opacity-60" />
          <span className="font-semibold text-white/60">call a nanny</span>
        </div>
        {c.footer}
      </footer>
    </div>
  );
}
