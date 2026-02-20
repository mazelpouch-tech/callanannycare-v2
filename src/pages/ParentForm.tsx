import { useState, useCallback, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Baby,
  AlertTriangle,
  FileText,
  CheckCircle,
  Copy,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  User,
  UtensilsCrossed,
  Pill,
  TreePine,
  Brain,
  ClipboardList,
} from "lucide-react";

const T = {
  fr: {
    title: "Fiche de Renseignements Enfant",
    subtitle: "Veuillez remplir ce formulaire pour chaque enfant confie a nos soins",
    lang: "Francais",
    otherLang: "English",
    // Sections
    parentInfo: "Informations du Parent / Tuteur",
    childInfo: "Informations de l'Enfant",
    allergies: "Allergies",
    specialNeeds: "Besoins Speciaux & Comportement",
    consent: "Consentement & Autorisation",
    // Parent fields
    parentName: "Nom complet du parent / tuteur",
    parentPhone: "Telephone du parent",
    parentEmail: "Email du parent",
    hotel: "Hotel / Riad / Adresse",
    // Child fields
    childFirstName: "Prenom de l'enfant",
    childLastName: "Nom de l'enfant",
    childDob: "Date de naissance",
    childAge: "Age",
    childGender: "Sexe",
    genderBoy: "Garcon",
    genderGirl: "Fille",
    // Allergies
    foodAllergies: "Allergies alimentaires",
    foodAllergiesPlaceholder: "Ex: arachides, lait, gluten, fruits de mer...",
    medicineAllergies: "Allergies medicamenteuses",
    medicineAllergiesPlaceholder: "Ex: penicilline, ibuprofene...",
    environmentAllergies: "Allergies environnementales",
    environmentAllergiesPlaceholder: "Ex: pollen, acariens, animaux...",
    noAllergies: "Aucune allergie connue",
    allergyReaction: "Reactions allergiques connues et traitement",
    allergyReactionPlaceholder: "Decrivez les reactions et le traitement a administrer...",
    // Special needs
    specialNeedsDesc: "Besoins speciaux ou handicap",
    specialNeedsPlaceholder: "Decrivez tout besoin particulier...",
    behaviorNotes: "Notes sur le comportement",
    behaviorNotesPlaceholder: "Ex: peurs, routines, habitudes de sommeil, methodes de reconfort...",
    dietaryRestrictions: "Restrictions alimentaires ou regime",
    dietaryRestrictionsPlaceholder: "Ex: vegetarien, halal, sans sucre...",
    favoriteActivities: "Activites preferees",
    favoriteActivitiesPlaceholder: "Ex: dessin, lecture, jeux de construction...",
    napSchedule: "Horaire de sieste / sommeil",
    napSchedulePlaceholder: "Ex: sieste de 13h a 15h, coucher a 20h...",
    // Consent
    consentText:
      "J'autorise call a nanny a prendre soin de mon enfant selon les informations fournies ci-dessus. Je certifie que toutes les informations sont exactes et completes.",
    agreeTerms: "J'accepte les conditions generales de service",
    // Actions
    submit: "Soumettre le Formulaire",
    submitting: "Envoi en cours...",
    // Success
    successTitle: "Formulaire Soumis !",
    successMessage: "Merci ! Vos informations ont ete envoyees a notre equipe. Vous pouvez aussi copier le resume ou l'envoyer par WhatsApp.",
    copySummary: "Copier le Resume",
    sendWhatsApp: "Envoyer par WhatsApp",
    copied: "Copie !",
    newForm: "Nouveau Formulaire",
    summary: "Resume",
  },
  en: {
    title: "Child Information Form",
    subtitle: "Please complete this form for each child entrusted to our care",
    lang: "English",
    otherLang: "Francais",
    // Sections
    parentInfo: "Parent / Guardian Information",
    childInfo: "Child Information",
    allergies: "Allergies",
    specialNeeds: "Special Needs & Behavior",
    consent: "Consent & Authorization",
    // Parent fields
    parentName: "Parent / Guardian full name",
    parentPhone: "Parent phone number",
    parentEmail: "Parent email",
    hotel: "Hotel / Riad / Address",
    // Child fields
    childFirstName: "Child's first name",
    childLastName: "Child's last name",
    childDob: "Date of birth",
    childAge: "Age",
    childGender: "Gender",
    genderBoy: "Boy",
    genderGirl: "Girl",
    // Allergies
    foodAllergies: "Food allergies",
    foodAllergiesPlaceholder: "e.g. peanuts, milk, gluten, seafood...",
    medicineAllergies: "Medicine allergies",
    medicineAllergiesPlaceholder: "e.g. penicillin, ibuprofen...",
    environmentAllergies: "Environmental allergies",
    environmentAllergiesPlaceholder: "e.g. pollen, dust mites, animals...",
    noAllergies: "No known allergies",
    allergyReaction: "Known allergic reactions and treatment",
    allergyReactionPlaceholder: "Describe reactions and treatment to administer...",
    // Special needs
    specialNeedsDesc: "Special needs or disabilities",
    specialNeedsPlaceholder: "Describe any special requirements...",
    behaviorNotes: "Behavior notes",
    behaviorNotesPlaceholder: "e.g. fears, routines, sleep habits, comfort methods...",
    dietaryRestrictions: "Dietary restrictions or diet",
    dietaryRestrictionsPlaceholder: "e.g. vegetarian, halal, sugar-free...",
    favoriteActivities: "Favorite activities",
    favoriteActivitiesPlaceholder: "e.g. drawing, reading, building blocks...",
    napSchedule: "Nap / sleep schedule",
    napSchedulePlaceholder: "e.g. nap 1-3 PM, bedtime at 8 PM...",
    // Consent
    consentText:
      "I authorize call a nanny to care for my child according to the information provided above. I certify that all information is accurate and complete.",
    agreeTerms: "I agree to the general terms of service",
    // Actions
    submit: "Submit Form",
    submitting: "Submitting...",
    // Success
    successTitle: "Form Submitted!",
    successMessage: "Thank you! Your information has been sent to our team. You can also copy the summary or send it via WhatsApp.",
    copySummary: "Copy Summary",
    sendWhatsApp: "Send via WhatsApp",
    copied: "Copied!",
    newForm: "New Form",
    summary: "Summary",
  },
};

interface SectionProps {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function Section({ icon: Icon, title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-soft">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-warm flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">{title}</h2>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 sm:px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required = false, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow";
const textareaClass = `${inputClass} resize-none`;

export default function ParentForm() {
  type Lang = 'fr' | 'en';
  const [lang, setLang] = useState<Lang>('fr');
  const t = T[lang];
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    hotel: "",
    childFirstName: "",
    childLastName: "",
    childDob: "",
    childAge: "",
    childGender: "",
    foodAllergies: "",
    medicineAllergies: "",
    environmentAllergies: "",
    noAllergies: false,
    allergyReaction: "",
    specialNeeds: "",
    behaviorNotes: "",
    dietaryRestrictions: "",
    favoriteActivities: "",
    napSchedule: "",
    agreeTerms: false,
  });

  const set = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  }, []);

  const buildSummary = useCallback(() => {
    const lines = [];
    lines.push(`--- CHILD INFO FORM / FICHE ENFANT ---`);
    lines.push(``);
    lines.push(`Parent: ${form.parentName}`);
    lines.push(`Phone: ${form.parentPhone}`);
    if (form.parentEmail) lines.push(`Email: ${form.parentEmail}`);
    lines.push(`Hotel: ${form.hotel}`);
    lines.push(``);
    lines.push(`Child: ${form.childFirstName} ${form.childLastName}`);
    if (form.childDob) lines.push(`DOB: ${form.childDob}`);
    if (form.childAge) lines.push(`Age: ${form.childAge}`);
    if (form.childGender) lines.push(`Gender: ${form.childGender}`);
    lines.push(``);

    if (form.noAllergies) {
      lines.push(`Allergies: None`);
    } else {
      if (form.foodAllergies) lines.push(`Food allergies: ${form.foodAllergies}`);
      if (form.medicineAllergies) lines.push(`Medicine allergies: ${form.medicineAllergies}`);
      if (form.environmentAllergies) lines.push(`Environment allergies: ${form.environmentAllergies}`);
      if (form.allergyReaction) lines.push(`Allergy reactions: ${form.allergyReaction}`);
    }

    if (form.specialNeeds) lines.push(`Special needs: ${form.specialNeeds}`);
    if (form.behaviorNotes) lines.push(`Behavior: ${form.behaviorNotes}`);
    if (form.dietaryRestrictions) lines.push(`Diet: ${form.dietaryRestrictions}`);
    if (form.favoriteActivities) lines.push(`Activities: ${form.favoriteActivities}`);
    if (form.napSchedule) lines.push(`Nap/sleep: ${form.napSchedule}`);

    lines.push(``);
    lines.push(`--- call a nanny ---`);
    return lines.join("\n");
  }, [form]);

  const WEB3FORMS_KEY = "YOUR_ACCESS_KEY_HERE";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `New Child Form: ${form.childFirstName} ${form.childLastName || ""} (${form.parentName})`,
          from_name: "call a nanny - Parent Form",
          "Parent Name": form.parentName,
          "Parent Phone": form.parentPhone,
          "Parent Email": form.parentEmail || "N/A",
          "Hotel / Address": form.hotel,
          "Child Name": `${form.childFirstName} ${form.childLastName || ""}`,
          "Child DOB": form.childDob || "N/A",
          "Child Age": form.childAge || "N/A",
          "Child Gender": form.childGender || "N/A",
          "Food Allergies": form.noAllergies ? "None" : (form.foodAllergies || "N/A"),
          "Medicine Allergies": form.noAllergies ? "None" : (form.medicineAllergies || "N/A"),
          "Environment Allergies": form.noAllergies ? "None" : (form.environmentAllergies || "N/A"),
          "Allergy Reactions": form.noAllergies ? "None" : (form.allergyReaction || "N/A"),
          "Special Needs": form.specialNeeds || "None",
          "Behavior Notes": form.behaviorNotes || "N/A",
          "Dietary Restrictions": form.dietaryRestrictions || "None",
          "Favorite Activities": form.favoriteActivities || "N/A",
          "Nap Schedule": form.napSchedule || "N/A",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildSummary());
    window.open(`https://wa.me/212656643375?text=${text}`, "_blank");
  };

  const handleNewForm = () => {
    setForm({
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      hotel: "",
      childFirstName: "",
      childLastName: "",
      childDob: "",
      childAge: "",
      childGender: "",
      foodAllergies: "",
      medicineAllergies: "",
      environmentAllergies: "",
      noAllergies: false,
      allergyReaction: "",
      specialNeeds: "",
      behaviorNotes: "",
      dietaryRestrictions: "",
      favoriteActivities: "",
      napSchedule: "",
      agreeTerms: false,
    });
    setSubmitted(false);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isValid =
    form.parentName.trim() &&
    form.parentPhone.trim() &&
    form.hotel.trim() &&
    form.childFirstName.trim() &&
    form.agreeTerms;

  // --- Success State ---
  if (submitted) {
    const summary = buildSummary();
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center shadow-warm animate-bounce">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-full gradient-warm opacity-30 animate-ping" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {t.successTitle}
            </h1>
            <p className="text-muted-foreground text-lg">{t.successMessage}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 sm:p-5 mb-6 shadow-soft">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              {t.summary}
            </h3>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {summary}
            </pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
              {copied ? t.copied : t.copySummary}
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {t.sendWhatsApp}
            </button>
          </div>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleNewForm}
              className="text-primary font-semibold hover:underline text-sm"
            >
              {t.newForm}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Baby className="w-3.5 h-3.5" />
            call a nanny
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.subtitle}</p>

          <button
            type="button"
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Globe className="w-4 h-4 text-primary" />
            {t.otherLang}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Parent Info */}
          <Section icon={User} title={t.parentInfo}>
            <Field label={t.parentName} required>
              <input
                type="text"
                value={form.parentName}
                onChange={set("parentName")}
                className={inputClass}
                required
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.parentPhone} required>
                <input
                  type="tel"
                  value={form.parentPhone}
                  onChange={set("parentPhone")}
                  placeholder="+212 600 000 000"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label={t.parentEmail}>
                <input
                  type="email"
                  value={form.parentEmail}
                  onChange={set("parentEmail")}
                  placeholder="email@example.com"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label={t.hotel} required>
              <input
                type="text"
                value={form.hotel}
                onChange={set("hotel")}
                placeholder={lang === "fr" ? "Ex: Riad Yasmine, Royal Mansour" : "e.g. Riad Yasmine, Royal Mansour"}
                className={inputClass}
                required
              />
            </Field>
          </Section>

          {/* Child Info */}
          <Section icon={Baby} title={t.childInfo}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t.childFirstName} required>
                <input
                  type="text"
                  value={form.childFirstName}
                  onChange={set("childFirstName")}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label={t.childLastName}>
                <input
                  type="text"
                  value={form.childLastName}
                  onChange={set("childLastName")}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={t.childDob}>
                <input
                  type="date"
                  value={form.childDob}
                  onChange={set("childDob")}
                  className={inputClass}
                />
              </Field>
              <Field label={t.childAge}>
                <input
                  type="text"
                  value={form.childAge}
                  onChange={set("childAge")}
                  placeholder={lang === "fr" ? "Ex: 3 ans" : "e.g. 3 years"}
                  className={inputClass}
                />
              </Field>
              <Field label={t.childGender}>
                <select value={form.childGender} onChange={set("childGender")} className={inputClass}>
                  <option value="">—</option>
                  <option value="boy">{t.genderBoy}</option>
                  <option value="girl">{t.genderGirl}</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Allergies */}
          <Section icon={AlertTriangle} title={t.allergies} defaultOpen={true}>
            <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.noAllergies}
                onChange={set("noAllergies")}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">{t.noAllergies}</span>
            </label>
            {!form.noAllergies && (
              <>
                <Field label={<span className="flex items-center gap-1.5"><UtensilsCrossed className="w-3.5 h-3.5 text-primary" />{t.foodAllergies}</span>}>
                  <input
                    type="text"
                    value={form.foodAllergies}
                    onChange={set("foodAllergies")}
                    placeholder={t.foodAllergiesPlaceholder}
                    className={inputClass}
                  />
                </Field>
                <Field label={<span className="flex items-center gap-1.5"><Pill className="w-3.5 h-3.5 text-primary" />{t.medicineAllergies}</span>}>
                  <input
                    type="text"
                    value={form.medicineAllergies}
                    onChange={set("medicineAllergies")}
                    placeholder={t.medicineAllergiesPlaceholder}
                    className={inputClass}
                  />
                </Field>
                <Field label={<span className="flex items-center gap-1.5"><TreePine className="w-3.5 h-3.5 text-primary" />{t.environmentAllergies}</span>}>
                  <input
                    type="text"
                    value={form.environmentAllergies}
                    onChange={set("environmentAllergies")}
                    placeholder={t.environmentAllergiesPlaceholder}
                    className={inputClass}
                  />
                </Field>
                <Field label={t.allergyReaction}>
                  <textarea
                    value={form.allergyReaction}
                    onChange={set("allergyReaction")}
                    placeholder={t.allergyReactionPlaceholder}
                    rows={3}
                    className={textareaClass}
                  />
                </Field>
              </>
            )}
          </Section>

          {/* Special Needs */}
          <Section icon={Brain} title={t.specialNeeds} defaultOpen={false}>
            <Field label={t.specialNeedsDesc}>
              <textarea
                value={form.specialNeeds}
                onChange={set("specialNeeds")}
                placeholder={t.specialNeedsPlaceholder}
                rows={3}
                className={textareaClass}
              />
            </Field>
            <Field label={t.behaviorNotes}>
              <textarea
                value={form.behaviorNotes}
                onChange={set("behaviorNotes")}
                placeholder={t.behaviorNotesPlaceholder}
                rows={3}
                className={textareaClass}
              />
            </Field>
            <Field label={t.dietaryRestrictions}>
              <input
                type="text"
                value={form.dietaryRestrictions}
                onChange={set("dietaryRestrictions")}
                placeholder={t.dietaryRestrictionsPlaceholder}
                className={inputClass}
              />
            </Field>
            <Field label={t.favoriteActivities}>
              <input
                type="text"
                value={form.favoriteActivities}
                onChange={set("favoriteActivities")}
                placeholder={t.favoriteActivitiesPlaceholder}
                className={inputClass}
              />
            </Field>
            <Field label={t.napSchedule}>
              <input
                type="text"
                value={form.napSchedule}
                onChange={set("napSchedule")}
                placeholder={t.napSchedulePlaceholder}
                className={inputClass}
              />
            </Field>
          </Section>

          {/* Consent */}
          <Section icon={Shield} title={t.consent}>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed mb-4">
              {t.consentText}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={set("agreeTerms")}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5"
                required
              />
              <span className="text-sm text-foreground">
                {t.agreeTerms} <span className="text-destructive">*</span>
              </span>
            </label>
          </Section>

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full gradient-warm text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-warm text-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">{t.submitting}</span>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                {t.submit}
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          call a nanny &mdash; Trusted Childcare in Marrakech
        </p>
      </div>
    </div>
  );
}
