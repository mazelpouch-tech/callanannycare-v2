import { useState, useEffect } from "react";
import {
  User,
  Mail,
  MapPin,
  Star,
  Clock,
  DollarSign,
  Globe,
  Award,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Lock,
  Info,
  X,
  Eye,
  EyeOff,
  Link,
  Check,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import ImageUpload from "../../components/ImageUpload";
import { calcActualHoursWorked, calcNannyPayBreakdown } from "@/utils/shiftHelpers";
import type { NannyProfile as NannyProfileType } from "@/types";

export default function NannyProfile() {
  const { nannyProfile, updateNannyProfile, nannyBookings, fetchNannyBookings } = useData();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    bio: "",
    languages: "",
    specialties: "",
    image: "",
    available: true,
  });

  // Change PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinMessage, setPinMessage] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [fullProfile, setFullProfile] = useState<NannyProfileType | null>(null);

  useEffect(() => {
    fetchNannyBookings();
  }, [fetchNannyBookings]);

  // Calculate total hours & pay breakdown from actual clock data
  const totalHoursWorked = nannyBookings
    .filter((b) => b.clockIn && b.clockOut && b.status !== "cancelled")
    .reduce((sum, b) => sum + calcActualHoursWorked(b.clockIn!, b.clockOut!), 0);

  const payBreakdown = nannyBookings
    .filter((b) => b.status !== "cancelled")
    .reduce(
      (acc, b) => {
        const bd = calcNannyPayBreakdown(b);
        return { basePay: acc.basePay + bd.basePay, taxiFee: acc.taxiFee + bd.taxiFee, total: acc.total + bd.total };
      },
      { basePay: 0, taxiFee: 0, total: 0 }
    );

  useEffect(() => {
    if (nannyProfile?.id) {
      fetch(`/api/nanny/profile?nannyId=${nannyProfile.id}`)
        .then((res) => res.json())
        .then((data) => {
          const langs =
            typeof data.languages === "string"
              ? JSON.parse(data.languages)
              : data.languages || [];
          const specs =
            typeof data.specialties === "string"
              ? JSON.parse(data.specialties)
              : data.specialties || [];
          setFullProfile({ ...data, languages: langs, specialties: specs });
          setForm({
            bio: data.bio || "",
            languages: langs.join(", "),
            specialties: specs.join(", "),
            image: data.image || "",
            available: data.available !== false,
          });
        })
        .catch(() => {});
    }
  }, [nannyProfile]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const updates = {
      bio: form.bio,
      languages: form.languages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      specialties: form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      image: form.image,
      available: form.available,
    };
    const result = await updateNannyProfile(updates);
    setSaving(false);
    if (result?.success) {
      setMessage(t("nanny.profile.updateSuccess"));
      setEditing(false);
      setFullProfile((prev) => prev ? ({ ...prev, ...updates }) : null);
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage(t("nanny.profile.updateFailed"));
    }
  };

  const handleChangePin = async () => {
    setPinMessage("");
    if (!pinForm.currentPin || !pinForm.newPin) {
      setPinMessage(t("nanny.profile.fillAllFields"));
      return;
    }
    if (pinForm.newPin.length < 4 || pinForm.newPin.length > 6) {
      setPinMessage(t("nanny.profile.pinLength"));
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinMessage(t("nanny.profile.pinsMismatch"));
      return;
    }
    setPinSaving(true);
    try {
      const res = await fetch("/api/nanny/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nannyId: nannyProfile!.id,
          changePin: true,
          currentPin: pinForm.currentPin,
          newPin: pinForm.newPin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setPinMessage(t("nanny.profile.pinSuccess"));
        setTimeout(() => {
          setShowPinModal(false);
          setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
          setPinMessage("");
        }, 1500);
      } else {
        setPinMessage(data.error || t("nanny.profile.pinFailed"));
      }
    } catch {
      setPinMessage(t("nanny.profile.pinFailed"));
    }
    setPinSaving(false);
  };

  const profile = fullProfile || nannyProfile;
  if (!profile) return null;

  const languages =
    typeof profile.languages === "string"
      ? JSON.parse(profile.languages)
      : profile.languages || [];
  const specialties =
    typeof profile.specialties === "string"
      ? JSON.parse(profile.specialties)
      : profile.specialties || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          {t("nanny.profile.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("nanny.profile.subtitle")}
        </p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.includes("success")
              ? "bg-green-50 text-green-700 border border-green-100"
              : "bg-red-50 text-red-700 border border-red-100"
          }`}
        >
          {message}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative">
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-accent/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center ring-4 ring-accent/20">
                <User className="w-10 h-10 text-accent" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl font-bold text-foreground">
              {profile.name}
            </h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              {profile.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {profile.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-500" />
                {profile.rating}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {profile.experience}
              </span>
            </div>
            {/* Hours & Pay summary */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary">{parseFloat(totalHoursWorked.toFixed(1))}<span className="text-sm font-normal ml-1">hrs</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("nanny.dashboard.hoursWorked")}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{payBreakdown.total}<span className="text-sm font-normal ml-1">DH</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("nanny.dashboard.myPay")}</p>
              </div>
            </div>
            {/* Pay breakdown detail */}
            {payBreakdown.total > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{t("nanny.dashboard.hourlyPay")}: <span className="font-semibold text-foreground">{payBreakdown.basePay} DH</span></span>
                {payBreakdown.taxiFee > 0 && (
                  <span>{t("nanny.dashboard.taxiFee")}: <span className="font-semibold text-orange-600">+{payBreakdown.taxiFee} DH</span></span>
                )}
              </div>
            )}
            {/* Nanny pay info */}
            <div className="mt-3 flex items-start gap-2 text-xs bg-accent/5 border border-accent/20 rounded-lg px-3 py-2.5">
              <DollarSign className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
              <span className="text-foreground/80">
                <span className="font-semibold">{t("nanny.profile.yourPay")}</span> {t("nanny.profile.payDetails")}
              </span>
            </div>
            {/* Admin-controlled fields note */}
            <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground/70 bg-muted/30 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {t("nanny.profile.adminNote")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Link Section */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Star className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Review Link</h3>
              <p className="text-xs text-muted-foreground">Copy & share with parents to collect reviews</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const reviewUrl = `${window.location.origin}/review/nanny/${profile.id}`;
              try {
                await navigator.clipboard.writeText(reviewUrl);
              } catch {
                const textArea = document.createElement("textarea");
                textArea.value = reviewUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
              }
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              linkCopied
                ? "bg-green-50 text-green-600"
                : "bg-amber-50 text-amber-600 hover:bg-amber-100"
            }`}
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Link className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{t("nanny.profile.loginPin")}</h3>
              <p className="text-xs text-muted-foreground">{t("nanny.profile.changePinDesc")}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPinModal(true)}
            className="text-sm text-accent hover:underline font-medium"
          >
            {t("nanny.profile.changePin")}
          </button>
        </div>
      </div>

      {/* Editable Section */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t("nanny.profile.profileDetails")}</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-accent hover:underline font-medium"
            >
              {t("nanny.profile.editProfile")}
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-muted-foreground hover:underline"
            >
              {t("shared.cancel")}
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("nanny.profile.bio")}
            </label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                placeholder={t("nanny.profile.bioPlaceholder")}
              />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.bio || t("nanny.profile.noBio")}
              </p>
            )}
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Globe className="w-4 h-4 inline mr-1.5" />
              {t("nanny.profile.languages")}
            </label>
            {editing ? (
              <input
                type="text"
                value={form.languages}
                onChange={(e) =>
                  setForm({ ...form, languages: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder={t("nanny.profile.languagesPlaceholder")}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {languages.map((lang: string) => (
                  <span
                    key={lang}
                    className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-medium"
                  >
                    {lang}
                  </span>
                ))}
                {languages.length === 0 && (
                  <span className="text-sm text-muted-foreground">{t("nanny.profile.noneSet")}</span>
                )}
              </div>
            )}
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Award className="w-4 h-4 inline mr-1.5" />
              {t("nanny.profile.specialties")}
            </label>
            {editing ? (
              <input
                type="text"
                value={form.specialties}
                onChange={(e) =>
                  setForm({ ...form, specialties: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder={t("nanny.profile.specialtiesPlaceholder")}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {specialties.map((spec: string) => (
                  <span
                    key={spec}
                    className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium"
                  >
                    {spec}
                  </span>
                ))}
                {specialties.length === 0 && (
                  <span className="text-sm text-muted-foreground">{t("nanny.profile.noneSet")}</span>
                )}
              </div>
            )}
          </div>

          {/* Profile Photo Upload */}
          {editing && (
            <ImageUpload
              currentImage={form.image}
              onImageChange={(base64) => setForm({ ...form, image: base64 })}
            />
          )}

          {/* Availability Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("nanny.profile.availableForBookings")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.available
                  ? t("nanny.profile.visibleToParents")
                  : t("nanny.profile.hiddenFromParents")}
              </p>
            </div>
            <button
              onClick={() => {
                if (editing) {
                  setForm({ ...form, available: !form.available });
                }
              }}
              disabled={!editing}
              className={`transition ${!editing ? "opacity-60" : ""}`}
            >
              {form.available ? (
                <ToggleRight className="w-10 h-10 text-accent" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Save Button */}
          {editing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="gradient-warm text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t("nanny.profile.saveChanges")}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-lg font-bold text-foreground">{t("nanny.profile.changePin")}</h2>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
                  setPinMessage("");
                }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pinMessage && (
              <div
                className={`mb-4 px-3 py-2 rounded-lg text-sm font-medium ${
                  pinMessage.includes("success")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {pinMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("nanny.profile.currentPin")}
                </label>
                <div className="relative">
                  <input
                    type={showPins ? "text" : "password"}
                    value={pinForm.currentPin}
                    onChange={(e) =>
                      setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                    }
                    placeholder={t("nanny.profile.currentPinPlaceholder")}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPins(!showPins)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("nanny.profile.newPin")}
                </label>
                <input
                  type={showPins ? "text" : "password"}
                  value={pinForm.newPin}
                  onChange={(e) =>
                    setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                  }
                  placeholder={t("nanny.profile.newPinPlaceholder")}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("nanny.profile.confirmNewPin")}
                </label>
                <input
                  type={showPins ? "text" : "password"}
                  value={pinForm.confirmPin}
                  onChange={(e) =>
                    setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                  }
                  placeholder={t("nanny.profile.confirmPinPlaceholder")}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <button
                onClick={handleChangePin}
                disabled={pinSaving}
                className="w-full gradient-warm text-white rounded-lg py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pinSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {t("nanny.profile.updatePin")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
