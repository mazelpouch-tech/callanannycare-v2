import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Lock, Mail, LogIn, AlertCircle } from "lucide-react";
import { useData } from "../../context/DataContext";

export default function AdminLogin() {
  const { isAdmin, adminLogin } = useData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate a brief loading state
    setTimeout(() => {
      const result = adminLogin(email, password);
      if (!result.success) {
        setError("Invalid credentials. Please try again.");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Call A Nanny
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Administration Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Admin Login
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access the dashboard
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@callananny.ma"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-warm text-white font-semibold py-3 rounded-xl shadow-warm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
