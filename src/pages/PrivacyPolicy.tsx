import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const T = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: February 2026",
    backToHome: "Back to Home",
    sections: [
      {
        heading: "1. Introduction",
        body: "Call a Nanny (\"we\", \"our\", or \"us\") provides professional childcare services in Marrakech, Morocco. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website (callanannycare.com) and mobile application.",
      },
      {
        heading: "2. Information We Collect",
        body: "We collect the following information when you make a booking:\n\n\u2022 Full name\n\u2022 Email address\n\u2022 Phone number\n\u2022 Hotel or accommodation name\n\u2022 Number and ages of children\n\u2022 Booking dates and times\n\u2022 Any additional notes you provide\n\nWe do not collect payment card details through our app. Payment is handled directly with the caregiver at the end of service.",
      },
      {
        heading: "3. How We Use Your Information",
        body: "Your personal information is used to:\n\n\u2022 Process and manage your childcare bookings\n\u2022 Assign a qualified nanny to your booking\n\u2022 Send booking confirmations and invoices via email\n\u2022 Communicate with you about your booking via WhatsApp or email\n\u2022 Improve our services and customer experience",
      },
      {
        heading: "4. Data Storage and Security",
        body: "Your data is stored securely on cloud servers (Neon PostgreSQL database) with encryption in transit (HTTPS/TLS). We retain your booking data for a reasonable period to provide you with invoices and enable quick rebooking. We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, or destruction.",
      },
      {
        heading: "5. Third-Party Services",
        body: "We use the following third-party services to operate:\n\n\u2022 Resend \u2014 for sending booking confirmation and invoice emails\n\u2022 Vercel \u2014 for hosting our website and application\n\u2022 WhatsApp Business API \u2014 for sending booking notifications\n\nThese services may process your data in accordance with their own privacy policies. We do not sell, rent, or share your personal information with third parties for marketing purposes.",
      },
      {
        heading: "6. Your Rights",
        body: "You have the right to:\n\n\u2022 Request access to the personal data we hold about you\n\u2022 Request correction of inaccurate data\n\u2022 Request deletion of your data\n\u2022 Withdraw consent for communications at any time\n\nTo exercise any of these rights, please contact us at info@callanannycare.com.",
      },
      {
        heading: "7. Cookies and Local Storage",
        body: "Our website uses browser local storage to remember your booking details for a smoother rebooking experience. This data stays on your device and is not transmitted to our servers unless you make a booking. We do not use tracking cookies or third-party analytics.",
      },
      {
        heading: "8. Children\u2019s Privacy",
        body: "Our service is intended for parents and guardians booking childcare. We collect children's ages solely to match them with appropriate caregivers. We do not knowingly collect personal information directly from children.",
      },
      {
        heading: "9. Changes to This Policy",
        body: "We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.",
      },
      {
        heading: "10. Contact Us",
        body: "If you have any questions about this Privacy Policy or our data practices, please contact us:\n\n\u2022 Email: info@callanannycare.com\n\u2022 Website: callanannycare.com\n\u2022 Location: Marrakech, Morocco",
      },
    ],
  },
  fr: {
    title: "Politique de Confidentialit\u00e9",
    lastUpdated: "Derni\u00e8re mise \u00e0 jour : F\u00e9vrier 2026",
    backToHome: "Retour \u00e0 l\u2019Accueil",
    sections: [
      {
        heading: "1. Introduction",
        body: "Call a Nanny (\u00ab nous \u00bb, \u00ab notre \u00bb) fournit des services professionnels de garde d\u2019enfants \u00e0 Marrakech, Maroc. Cette Politique de Confidentialit\u00e9 explique comment nous collectons, utilisons et prot\u00e9geons vos informations personnelles lorsque vous utilisez notre site web (callanannycare.com) et notre application mobile.",
      },
      {
        heading: "2. Informations Collect\u00e9es",
        body: "Nous collectons les informations suivantes lors de votre r\u00e9servation :\n\n\u2022 Nom complet\n\u2022 Adresse email\n\u2022 Num\u00e9ro de t\u00e9l\u00e9phone\n\u2022 Nom de l\u2019h\u00f4tel ou h\u00e9bergement\n\u2022 Nombre et \u00e2ges des enfants\n\u2022 Dates et heures de r\u00e9servation\n\u2022 Toute note suppl\u00e9mentaire\n\nNous ne collectons pas les informations de carte bancaire via notre application. Le paiement est effectu\u00e9 directement avec la nounou \u00e0 la fin du service.",
      },
      {
        heading: "3. Utilisation de Vos Informations",
        body: "Vos informations personnelles sont utilis\u00e9es pour :\n\n\u2022 Traiter et g\u00e9rer vos r\u00e9servations\n\u2022 Assigner une nounou qualifi\u00e9e \u00e0 votre r\u00e9servation\n\u2022 Envoyer des confirmations et factures par email\n\u2022 Communiquer avec vous par WhatsApp ou email\n\u2022 Am\u00e9liorer nos services et l\u2019exp\u00e9rience client",
      },
      {
        heading: "4. Stockage et S\u00e9curit\u00e9 des Donn\u00e9es",
        body: "Vos donn\u00e9es sont stock\u00e9es de mani\u00e8re s\u00e9curis\u00e9e sur des serveurs cloud (base de donn\u00e9es Neon PostgreSQL) avec chiffrement en transit (HTTPS/TLS). Nous conservons vos donn\u00e9es de r\u00e9servation pendant une p\u00e9riode raisonnable pour vous fournir des factures et faciliter la re-r\u00e9servation. Nous mettons en \u0153uvre des mesures techniques et organisationnelles appropri\u00e9es pour prot\u00e9ger vos donn\u00e9es.",
      },
      {
        heading: "5. Services Tiers",
        body: "Nous utilisons les services tiers suivants :\n\n\u2022 Resend \u2014 pour l\u2019envoi d\u2019emails de confirmation et de factures\n\u2022 Vercel \u2014 pour l\u2019h\u00e9bergement de notre site web\n\u2022 WhatsApp Business API \u2014 pour les notifications de r\u00e9servation\n\nCes services peuvent traiter vos donn\u00e9es conform\u00e9ment \u00e0 leurs propres politiques. Nous ne vendons, ne louons et ne partageons pas vos informations personnelles \u00e0 des fins commerciales.",
      },
      {
        heading: "6. Vos Droits",
        body: "Vous avez le droit de :\n\n\u2022 Demander l\u2019acc\u00e8s \u00e0 vos donn\u00e9es personnelles\n\u2022 Demander la correction de donn\u00e9es inexactes\n\u2022 Demander la suppression de vos donn\u00e9es\n\u2022 Retirer votre consentement \u00e0 tout moment\n\nPour exercer vos droits, contactez-nous \u00e0 info@callanannycare.com.",
      },
      {
        heading: "7. Cookies et Stockage Local",
        body: "Notre site utilise le stockage local du navigateur pour m\u00e9moriser vos informations de r\u00e9servation afin de faciliter la re-r\u00e9servation. Ces donn\u00e9es restent sur votre appareil et ne sont pas transmises \u00e0 nos serveurs sauf lors d\u2019une r\u00e9servation. Nous n\u2019utilisons pas de cookies de suivi ni d\u2019analyses tierces.",
      },
      {
        heading: "8. Confidentialit\u00e9 des Enfants",
        body: "Notre service est destin\u00e9 aux parents et tuteurs r\u00e9servant des services de garde. Nous collectons les \u00e2ges des enfants uniquement pour les associer \u00e0 des gardes d\u2019enfants appropri\u00e9s. Nous ne collectons pas sciemment d\u2019informations personnelles directement aupr\u00e8s des enfants.",
      },
      {
        heading: "9. Modifications de Cette Politique",
        body: "Nous pouvons mettre \u00e0 jour cette Politique de Confidentialit\u00e9. Toute modification sera publi\u00e9e sur cette page avec une date de r\u00e9vision mise \u00e0 jour.",
      },
      {
        heading: "10. Nous Contacter",
        body: "Pour toute question concernant cette Politique de Confidentialit\u00e9 :\n\n\u2022 Email : info@callanannycare.com\n\u2022 Site web : callanannycare.com\n\u2022 Adresse : Marrakech, Maroc",
      },
    ],
  },
};

export default function PrivacyPolicy() {
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const s = T[locale];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-6 text-center text-white relative">
        <h1 className="text-2xl font-bold font-serif tracking-tight">call a nanny</h1>
        <p className="text-white/80 text-xs mt-1">Professional Childcare · Marrakech</p>
        <button
          onClick={() => setLocale((l) => (l === "en" ? "fr" : "en"))}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
        >
          {locale === "en" ? "FR" : "EN"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-4">
            <Shield className="w-7 h-7 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-serif">{s.title}</h2>
          <p className="text-gray-400 text-sm mt-2">{s.lastUpdated}</p>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {s.sections.map((section, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < s.sections.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <h3 className="font-semibold text-gray-900 text-sm mb-2">{section.heading}</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {s.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
