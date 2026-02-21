import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  UserCircle, Key, Loader2, CheckCircle, AlertCircle,
  FileText, ArrowRight, Camera, Phone, Calendar, X, Globe
} from "lucide-react";
import PhoneInput from "../../components/PhoneInput";
import { useLanguage } from "../../context/LanguageContext";

const API = import.meta.env.VITE_API_URL || "";

interface InviteInfo {
  name: string;
  email: string;
  success?: boolean;
  error?: string;
}

type RegisterStatus = "loading" | "valid" | "expired" | "invalid" | "success";

/** Resize an image file to max 200×200 JPEG, return base64 data URL */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 200;
        let w = img.width;
        let h = img.height;
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else { w = Math.round((w * MAX) / h); h = MAX; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function NannyRegister() {
  const { t, locale, setLocale } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<RegisterStatus>("loading");
  const [nannyInfo, setNannyInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string>(""); // base64 data URL
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`${API}/api/nanny/invite?token=${token}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setNannyInfo(data);
          setName(data.name || "");
          setStatus("valid");
        } else if (data.error?.includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validateToken();
  }, [token]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("nanny.register.imageError"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t("nanny.register.imageTooLarge"));
      return;
    }
    try {
      const base64 = await resizeImage(file);
      setPhoto(base64);
      setError("");
    } catch {
      setError(t("nanny.register.imageProcessError"));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("nanny.register.nameRequired"));
      return;
    }
    if (!age.trim()) {
      setError(t("nanny.register.ageRequired"));
      return;
    }
    if (!phone.trim()) {
      setError(t("nanny.register.phoneRequired"));
      return;
    }
    if (pin.length < 4) {
      setError(t("nanny.register.pinMinLength"));
      return;
    }
    if (pin !== confirmPin) {
      setError(t("nanny.register.pinsMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        token,
        pin,
        name: name.trim(),
        age: age.trim(),
        phone: phone.trim(),
        bio: bio.trim() || undefined,
        image: photo || undefined,
      };

      const res = await fetch(`${API}/api/nanny/invite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
      } else {
        setError(data.error || t("nanny.register.registrationFailed"));
      }
    } catch {
      setError(t("nanny.register.networkError"));
    }
    setSubmitting(false);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen gradient-sand flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("nanny.register.validating")}</p>
        </div>
      </div>
    );
  }

  // Invalid / expired token
  if (status === "invalid" || status === "expired") {
    return (
      <div className="min-h-screen gradient-sand flex items-center justify-center px-4">
        <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="w-full max-w-md relative">
          <div className="bg-card rounded-2xl shadow-soft border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
              {status === "expired" ? t("nanny.register.expiredTitle") : t("nanny.register.invalidTitle")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {status === "expired"
                ? t("nanny.register.expiredMessage")
                : t("nanny.register.invalidMessage")}
            </p>
            <Link
              to="/nanny/login"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              {t("nanny.register.goToLogin")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen gradient-sand flex items-center justify-center px-4">
        <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="w-full max-w-md relative">
          <div className="bg-card rounded-2xl shadow-soft border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
              {t("nanny.register.successTitle")}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t("nanny.register.successMessage")}
            </p>
            <Link
              to="/nanny/login"
              className="inline-flex items-center gap-2 gradient-warm text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm"
            >
              {t("nanny.register.signInNow")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid token — show registration form
  return (
    <div className="min-h-screen gradient-sand flex items-center justify-center px-4 py-8">
      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setLocale(locale === "en" ? "fr" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border text-sm font-medium text-muted-foreground hover:bg-card transition-colors shadow-sm"
        >
          <Globe className="w-4 h-4" />
          {locale === "en" ? "FR" : "EN"}
        </button>
      </div>

      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative">
        <div className="bg-card rounded-2xl shadow-soft border border-border p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="call a nanny" className="w-36 h-36 object-contain mx-auto mb-2" />
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {t("nanny.register.welcomeTitle")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("nanny.register.welcomeSubtitle")}
            </p>
            <p className="text-sm text-primary mt-1 font-medium">{nannyInfo?.email}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photo Upload */}
            <div className="flex flex-col items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <div className="relative group">
                {photo ? (
                  <div className="relative">
                    <img
                      src={photo}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setPhoto("")}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">{t("nanny.register.addPhoto")}</span>
                  </button>
                )}
              </div>
              {photo && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs text-primary hover:underline font-medium"
                >
                  {t("nanny.register.changePhoto")}
                </button>
              )}
            </div>

            {/* Personal Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-accent" />
                {t("nanny.register.personalInfo")}
              </h3>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("nanny.register.fullName")} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                  placeholder={t("nanny.register.yourFullName")}
                  required
                />
              </div>

              {/* Age and Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      {t("nanny.register.age")} *
                    </span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={age}
                    onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                    placeholder={t("nanny.register.agePlaceholder")}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {t("shared.phone")} *
                    </span>
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={(val) => setPhone(val)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("nanny.register.aboutYou")}
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none text-sm"
                  placeholder={t("nanny.register.aboutPlaceholder")}
                />
              </div>
            </div>

            {/* PIN Section */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                {t("nanny.register.createPin")}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {t("nanny.register.pinDescription")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("nanny.register.pinLabel")}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition tracking-[0.3em] text-center font-mono"
                    placeholder="••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t("nanny.register.confirmPin")}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    className={`w-full px-3 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition tracking-[0.3em] text-center font-mono ${
                      confirmPin && confirmPin !== pin
                        ? "border-red-300 focus:border-red-400"
                        : "border-border focus:border-primary"
                    }`}
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>
              {confirmPin && confirmPin !== pin && (
                <p className="text-xs text-red-500 mt-1">{t("nanny.register.pinsMismatch")}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !name.trim() || !age.trim() || !phone.trim() || pin.length < 4 || pin !== confirmPin}
              className="w-full gradient-warm text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t("nanny.register.completeRegistration")}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("nanny.register.alreadyRegistered")}{" "}
            <Link to="/nanny/login" className="text-primary hover:underline">
              {t("nanny.register.signInHere")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
