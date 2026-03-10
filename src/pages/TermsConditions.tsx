import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const T = {
  en: {
    title: "General Terms & Conditions",
    lastUpdated: "Last updated: March 2026",
    backToHome: "Back to Home",
    sections: [
      {
        heading: "1. Service Description",
        body: "Call-a-Nanny provides on-demand babysitting and childcare services for families staying in hotels, riads, villas, or private residences. Our role is to connect families with qualified childcare providers for short-term or temporary supervision of children.",
      },
      {
        heading: "2. Booking Confirmation",
        body: "All bookings must be made through our official communication channels (website, email, WhatsApp, or approved booking platform).\n\nA booking is considered confirmed once availability has been verified and the reservation is acknowledged by Call-a-Nanny.\n\nA minimum booking of 3 hours is required for all services.",
      },
      {
        heading: "3. Payment Terms",
        body: "Payment for the service is due at the end of the client's stay at the hotel or accommodation, before check-out.\n\nPayment may be made via cash, credit card, or any approved payment method communicated at the time of booking.\n\nThe hourly rate is \u20ac10 per hour per nanny.\n\nPayment may be made in:\n\u2022 Euros (\u20ac)\n\u2022 Moroccan Dirhams (MAD)\n\nIf payment is made in Moroccan Dirhams, the amount will be calculated based on the current exchange rate, and currency conversion differences may apply.\n\nRates may vary depending on:\n\u2022 Number of children\n\u2022 Service hours\n\u2022 Late-night or holiday services\n\u2022 Special requests\n\nFor services starting after 7:00 PM, a \u20ac10 taxi fee will be added to cover the nanny's transportation.",
      },
      {
        heading: "4. Cancellation Policy",
        body: "Clients may cancel or modify their booking free of charge up to 24 hours before the scheduled service time.\n\nIf a cancellation occurs less than 24 hours before the service, the client will be charged for the hours originally booked, except in cases of force majeure.",
      },
      {
        heading: "5. Changes to Bookings",
        body: "Changes to the booking (time, location, number of children, or special requests) must be communicated as early as possible.\n\nCall-a-Nanny will make every effort to accommodate changes, but availability cannot be guaranteed.",
      },
      {
        heading: "6. Babysitter Continuity",
        body: "Call-a-Nanny will make every effort to assign the same babysitter for the entire duration of a family's stay.\n\nHowever, due to scheduling constraints or availability, it may occasionally be necessary to assign a different qualified babysitter.",
      },
      {
        heading: "7. Parental Responsibility",
        body: "Parents or legal guardians remain fully responsible for their children at all times.\n\nClients must inform the nanny of:\n\u2022 Medical conditions\n\u2022 Allergies\n\u2022 Emergency contacts\n\u2022 Specific instructions regarding the child's care",
      },
      {
        heading: "8. Liability Disclaimer",
        body: "Call-a-Nanny acts as a facilitator of childcare services.\n\nWhile we carefully select and screen our childcare providers, Call-a-Nanny cannot be held liable for:\n\u2022 Accidents or incidents occurring during the service\n\u2022 Loss or damage to personal belongings\n\u2022 Medical emergencies involving the child\n\u2022 Circumstances beyond our reasonable control\n\nParents acknowledge that childcare services inherently involve risks and accept responsibility for their children's safety.",
      },
      {
        heading: "9. Safe Working Environment",
        body: "Clients must ensure a safe and respectful environment for the nanny during the service.\n\nCall-a-Nanny reserves the right to terminate a service immediately if the nanny feels unsafe or if working conditions are inappropriate.",
      },
      {
        heading: "10. Service Hours & Overtime",
        body: "Services are booked for a specified number of hours.\n\nAny time exceeding the booked period will be charged at the applicable hourly rate.",
      },
      {
        heading: "11. Emergency Situations",
        body: "In case of emergency, the nanny may contact:\n\u2022 The parents or guardians\n\u2022 Local emergency services if necessary\n\nParents must provide a reachable phone number during the entire service period.",
      },
      {
        heading: "12. Force Majeure",
        body: "Call-a-Nanny shall not be held responsible for delays or inability to provide service due to circumstances beyond its control, including but not limited to:\n\u2022 Transportation disruptions\n\u2022 Severe weather\n\u2022 Government restrictions\n\u2022 Health emergencies",
      },
      {
        heading: "13. Acceptance of Terms",
        body: "By confirming a booking with Call-a-Nanny, the client acknowledges that they have read, understood, and accepted these General Terms and Conditions.",
      },
    ],
  },
  fr: {
    title: "Conditions G\u00e9n\u00e9rales",
    lastUpdated: "Derni\u00e8re mise \u00e0 jour : Mars 2026",
    backToHome: "Retour \u00e0 l\u2019Accueil",
    sections: [
      {
        heading: "1. Description du Service",
        body: "Call-a-Nanny fournit des services de baby-sitting et de garde d\u2019enfants \u00e0 la demande pour les familles s\u00e9journant dans des h\u00f4tels, riads, villas ou r\u00e9sidences priv\u00e9es. Notre r\u00f4le est de mettre en relation les familles avec des prestataires de garde d\u2019enfants qualifi\u00e9s pour une supervision temporaire.",
      },
      {
        heading: "2. Confirmation de R\u00e9servation",
        body: "Toutes les r\u00e9servations doivent \u00eatre effectu\u00e9es via nos canaux de communication officiels (site web, email, WhatsApp ou plateforme de r\u00e9servation approuv\u00e9e).\n\nUne r\u00e9servation est consid\u00e9r\u00e9e comme confirm\u00e9e une fois la disponibilit\u00e9 v\u00e9rifi\u00e9e et la r\u00e9servation reconnue par Call-a-Nanny.\n\nUne r\u00e9servation minimum de 3 heures est requise pour tous les services.",
      },
      {
        heading: "3. Conditions de Paiement",
        body: "Le paiement du service est d\u00fb \u00e0 la fin du s\u00e9jour du client \u00e0 l\u2019h\u00f4tel ou \u00e0 l\u2019h\u00e9bergement, avant le d\u00e9part.\n\nLe paiement peut \u00eatre effectu\u00e9 en esp\u00e8ces, par carte de cr\u00e9dit ou tout autre mode de paiement approuv\u00e9 communiqu\u00e9 lors de la r\u00e9servation.\n\nLe tarif horaire est de 10\u20ac par heure et par nounou.\n\nLe paiement peut \u00eatre effectu\u00e9 en :\n\u2022 Euros (\u20ac)\n\u2022 Dirhams marocains (MAD)\n\nSi le paiement est effectu\u00e9 en dirhams marocains, le montant sera calcul\u00e9 sur la base du taux de change en vigueur, et des diff\u00e9rences de conversion peuvent s\u2019appliquer.\n\nLes tarifs peuvent varier en fonction de :\n\u2022 Nombre d\u2019enfants\n\u2022 Heures de service\n\u2022 Services de nuit ou jours f\u00e9ri\u00e9s\n\u2022 Demandes sp\u00e9ciales\n\nPour les services commen\u00e7ant apr\u00e8s 19h00, des frais de taxi de 10\u20ac seront ajout\u00e9s pour couvrir le transport de la nounou.",
      },
      {
        heading: "4. Politique d\u2019Annulation",
        body: "Les clients peuvent annuler ou modifier leur r\u00e9servation sans frais jusqu\u2019\u00e0 24 heures avant l\u2019heure pr\u00e9vue du service.\n\nSi une annulation survient moins de 24 heures avant le service, le client sera factur\u00e9 pour les heures initialement r\u00e9serv\u00e9es, sauf en cas de force majeure.",
      },
      {
        heading: "5. Modifications des R\u00e9servations",
        body: "Les modifications de la r\u00e9servation (heure, lieu, nombre d\u2019enfants ou demandes sp\u00e9ciales) doivent \u00eatre communiqu\u00e9es le plus t\u00f4t possible.\n\nCall-a-Nanny fera tout son possible pour accommoder les changements, mais la disponibilit\u00e9 ne peut \u00eatre garantie.",
      },
      {
        heading: "6. Continuit\u00e9 de la Baby-sitter",
        body: "Call-a-Nanny fera tout son possible pour assigner la m\u00eame baby-sitter pendant toute la dur\u00e9e du s\u00e9jour d\u2019une famille.\n\nCependant, en raison de contraintes de planification ou de disponibilit\u00e9, il peut occasionnellement \u00eatre n\u00e9cessaire d\u2019assigner une baby-sitter qualifi\u00e9e diff\u00e9rente.",
      },
      {
        heading: "7. Responsabilit\u00e9 Parentale",
        body: "Les parents ou tuteurs l\u00e9gaux restent enti\u00e8rement responsables de leurs enfants \u00e0 tout moment.\n\nLes clients doivent informer la nounou de :\n\u2022 Conditions m\u00e9dicales\n\u2022 Allergies\n\u2022 Contacts d\u2019urgence\n\u2022 Instructions sp\u00e9cifiques concernant les soins de l\u2019enfant",
      },
      {
        heading: "8. Clause de Non-Responsabilit\u00e9",
        body: "Call-a-Nanny agit en tant que facilitateur de services de garde d\u2019enfants.\n\nBien que nous s\u00e9lectionnons et v\u00e9rifions soigneusement nos prestataires, Call-a-Nanny ne peut \u00eatre tenu responsable de :\n\u2022 Accidents ou incidents survenant pendant le service\n\u2022 Perte ou dommage aux effets personnels\n\u2022 Urgences m\u00e9dicales impliquant l\u2019enfant\n\u2022 Circonstances ind\u00e9pendantes de notre volont\u00e9\n\nLes parents reconnaissent que les services de garde d\u2019enfants comportent inh\u00e9remment des risques et acceptent la responsabilit\u00e9 de la s\u00e9curit\u00e9 de leurs enfants.",
      },
      {
        heading: "9. Environnement de Travail S\u00fbr",
        body: "Les clients doivent assurer un environnement s\u00fbr et respectueux pour la nounou pendant le service.\n\nCall-a-Nanny se r\u00e9serve le droit de mettre fin imm\u00e9diatement \u00e0 un service si la nounou se sent en danger ou si les conditions de travail sont inappropri\u00e9es.",
      },
      {
        heading: "10. Heures de Service & Heures Suppl\u00e9mentaires",
        body: "Les services sont r\u00e9serv\u00e9s pour un nombre d\u2019heures sp\u00e9cifi\u00e9.\n\nTout d\u00e9passement du temps r\u00e9serv\u00e9 sera factur\u00e9 au tarif horaire applicable.",
      },
      {
        heading: "11. Situations d\u2019Urgence",
        body: "En cas d\u2019urgence, la nounou peut contacter :\n\u2022 Les parents ou tuteurs\n\u2022 Les services d\u2019urgence locaux si n\u00e9cessaire\n\nLes parents doivent fournir un num\u00e9ro de t\u00e9l\u00e9phone joignable pendant toute la dur\u00e9e du service.",
      },
      {
        heading: "12. Force Majeure",
        body: "Call-a-Nanny ne pourra \u00eatre tenu responsable des retards ou de l\u2019impossibilit\u00e9 de fournir le service en raison de circonstances ind\u00e9pendantes de sa volont\u00e9, notamment :\n\u2022 Perturbations des transports\n\u2022 Conditions m\u00e9t\u00e9orologiques s\u00e9v\u00e8res\n\u2022 Restrictions gouvernementales\n\u2022 Urgences sanitaires",
      },
      {
        heading: "13. Acceptation des Conditions",
        body: "En confirmant une r\u00e9servation avec Call-a-Nanny, le client reconna\u00eet avoir lu, compris et accept\u00e9 les pr\u00e9sentes Conditions G\u00e9n\u00e9rales.",
      },
    ],
  },
};

export default function TermsConditions() {
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 mb-4">
            <FileText className="w-7 h-7 text-orange-500" />
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
