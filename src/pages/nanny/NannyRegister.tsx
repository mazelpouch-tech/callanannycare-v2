import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  UserCircle, Key, Loader2, CheckCircle, AlertCircle,
  MapPin, Clock, Globe, Star, Image, FileText, ArrowRight
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

interface InviteInfo {
  name: string;
  email: string;
  success?: boolean;
  error?: string;
}

type RegisterStatus = "loading" | "valid" | "expired" | "invalid" | "success";

export default function NannyRegister() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<RegisterStatus>("loading");
  const [nannyInfo, setNannyInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [location, setLocation] = useState("Marrakech");
  const [experience, setExperience] = useState("");
  const [image, setImage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        token,
        pin,
        bio: bio || undefined,
        languages: languages ? languages.split(",").map((l) => l.trim()).filter(Boolean) : undefined,
        specialties: specialties ? specialties.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        location: location || undefined,
        experience: experience || undefined,
        image: image || undefined,
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
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    }
    setSubmitting(false);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen gradient-sand flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating your invitation...</p>
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
              {status === "expired" ? "Invitation Expired" : "Invalid Invitation"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {status === "expired"
                ? "This invitation link has expired. Please contact the admin to request a new one."
                : "This invitation link is invalid or has already been used."}
            </p>
            <Link
              to="/nanny/login"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Go to Nanny Login
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
              Registration Complete!
            </h1>
            <p className="text-muted-foreground mb-6">
              Welcome to call a nanny! You can now sign in with your email and PIN.
            </p>
            <Link
              to="/nanny/login"
              className="inline-flex items-center gap-2 gradient-warm text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm"
            >
              Sign In Now
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
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative">
        <div className="bg-card rounded-2xl shadow-soft border border-border p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="gradient-warm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              Welcome, {nannyInfo?.name}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete your registration to join call a nanny
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
            {/* PIN Section */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Set Your PIN Code
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">PIN (4-6 digits)</label>
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
                  <label className="block text-xs text-muted-foreground mb-1">Confirm PIN</label>
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
                <p className="text-xs text-red-500 mt-1">PINs do not match</p>
              )}
            </div>

            {/* Profile Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                Your Profile
              </h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    About You
                  </span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none text-sm"
                  placeholder="Tell families about your experience and approach to childcare..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Location
                    </span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                    placeholder="e.g., Gueliz, Marrakech"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      Experience
                    </span>
                  </label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                    placeholder="e.g., 3 years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Languages
                  </span>
                </label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                  placeholder="Arabic, French, English (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-muted-foreground" />
                    Specialties
                  </span>
                </label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                  placeholder="Toddler Care, First Aid (comma-separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-muted-foreground" />
                    Profile Photo URL
                  </span>
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                  placeholder="https://example.com/your-photo.jpg"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || pin.length < 4 || pin !== confirmPin}
              className="w-full gradient-warm text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Complete Registration
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already registered?{" "}
            <Link to="/nanny/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
