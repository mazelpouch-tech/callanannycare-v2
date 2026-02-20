import { useState } from "react";
import { Navigate } from "react-router-dom";
import { UserCircle, Mail, Key, ArrowRight, Loader2 } from "lucide-react";
import { useData } from "../../context/DataContext";
import { Link } from "react-router-dom";

export default function NannyLogin() {
  const { isNanny, nannyLogin } = useData();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isNanny) return <Navigate to="/nanny" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await nannyLogin(email, pin);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-sand flex items-center justify-center px-4">
      {/* Decorative background blurs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="gradient-warm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              Nanny Portal
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to view your schedule and bookings
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-6 text-sm px-4 py-3 rounded-lg border flex items-start gap-2 ${
              error.includes("suspended")
                ? "bg-red-50 text-red-700 border-red-200"
                : error.includes("registration")
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-red-50 text-red-600 border-red-100"
            }`}>
              <span className="mt-0.5 shrink-0">
                {error.includes("suspended") ? "🚫" : error.includes("registration") ? "📧" : "⚠️"}
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  placeholder="your.email@callananny.ma"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                PIN Code
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition tracking-[0.5em] text-center font-mono text-lg"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || pin.length < 4}
              className="w-full gradient-warm text-white rounded-lg px-6 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-6 space-y-1">
            <p>
              <Link to="/nanny/register" className="text-accent hover:underline font-medium">
                Have an invitation? Register here
              </Link>
            </p>
            <p>
              <Link to="/admin/login" className="text-primary hover:underline">
                Looking for the admin panel?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
