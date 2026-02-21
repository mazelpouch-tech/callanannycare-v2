import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Lock, Mail, LogIn, AlertCircle, CheckCircle, ArrowLeft, Key, Loader2, UserPlus } from "lucide-react";
import { useData } from "../../context/DataContext";

export default function AdminLogin() {
  const { isAdmin, adminLogin, forgotAdminPassword, resetAdminPassword, registerAdmin } = useData();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("reset");
  const registerToken = searchParams.get("register");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Reset / Register password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await adminLogin(email, password);
    if (!result.success) {
      setError(result.error || "Invalid credentials. Please try again.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setForgotLoading(true);
    const result = await forgotAdminPassword(forgotEmail);
    if (result.success) {
      setForgotMessage(result.message || "If that email is registered, a reset link has been generated. Contact the super admin for the link.");
    } else {
      setForgotError(result.error || "Something went wrong");
    }
    setForgotLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match");
      return;
    }

    if (!resetToken) return;
    setResetLoading(true);
    const result = await resetAdminPassword(resetToken, newPassword);
    if (result.success) {
      setResetMessage(result.message || "Password has been reset. You can now sign in.");
    } else {
      setResetError(result.error || "Failed to reset password");
    }
    setResetLoading(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match");
      return;
    }

    if (!registerToken) return;
    setResetLoading(true);
    const result = await registerAdmin(registerToken, newPassword);
    if (result.success) {
      setResetMessage(result.message || "Registration complete! You can now sign in.");
    } else {
      setResetError(result.error || "Failed to complete registration");
    }
    setResetLoading(false);
  };

  // --- Registration View (new admin completing invite) ---
  if (registerToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="call a nanny" className="w-28 h-28 object-contain mx-auto mb-2" />
            <h1 className="font-serif text-3xl font-bold text-foreground">call a nanny</h1>
            <p className="text-muted-foreground mt-1 text-sm">Administration Portal</p>
          </div>

          <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
                <UserPlus className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Complete Registration</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set your password to activate your admin account
              </p>
            </div>

            {resetError && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetMessage ? (
              <div className="text-center">
                <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-6">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{resetMessage}</span>
                </div>
                <a
                  href="/admin/login"
                  className="inline-flex items-center gap-2 gradient-warm text-white font-semibold py-3 px-6 rounded-xl shadow-warm hover:opacity-90 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In Now
                </a>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Create Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className={`w-full pl-11 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm ${
                        confirmNewPassword && confirmNewPassword !== newPassword
                          ? "border-red-300"
                          : "border-border focus:border-primary"
                      }`}
                    />
                  </div>
                  {confirmNewPassword && confirmNewPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full gradient-warm text-white font-semibold py-3 rounded-xl shadow-warm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4.5 h-4.5" />
                      Complete Registration
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            This registration link expires in 24 hours
          </p>
        </div>
      </div>
    );
  }

  // --- Reset Password View ---
  if (resetToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="call a nanny" className="w-28 h-28 object-contain mx-auto mb-2" />
            <h1 className="font-serif text-3xl font-bold text-foreground">call a nanny</h1>
            <p className="text-muted-foreground mt-1 text-sm">Administration Portal</p>
          </div>

          <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
                <Key className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Reset Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a new password for your account
              </p>
            </div>

            {resetError && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetMessage ? (
              <div className="text-center">
                <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-6">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{resetMessage}</span>
                </div>
                <a
                  href="/admin/login"
                  className="inline-flex items-center gap-2 gradient-warm text-white font-semibold py-3 px-6 rounded-xl shadow-warm hover:opacity-90 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In Now
                </a>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      className={`w-full pl-11 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-sm ${
                        confirmNewPassword && confirmNewPassword !== newPassword
                          ? "border-red-300"
                          : "border-border focus:border-primary"
                      }`}
                    />
                  </div>
                  {confirmNewPassword && confirmNewPassword !== newPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full gradient-warm text-white font-semibold py-3 rounded-xl shadow-warm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Key className="w-4.5 h-4.5" />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Forgot Password View ---
  if (showForgot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="call a nanny" className="w-28 h-28 object-contain mx-auto mb-2" />
            <h1 className="font-serif text-3xl font-bold text-foreground">call a nanny</h1>
            <p className="text-muted-foreground mt-1 text-sm">Administration Portal</p>
          </div>

          <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
                <Mail className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Forgot Password?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email and we'll generate a reset link
              </p>
            </div>

            {forgotError && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}
            {forgotMessage && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-6">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{forgotMessage}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@callananny.ma"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full gradient-warm text-white font-semibold py-3 rounded-xl shadow-warm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Key className="w-4.5 h-4.5" />
                    Request Reset Link
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => { setShowForgot(false); setForgotError(""); setForgotMessage(""); }}
              className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            The reset link will be generated for the super admin to share with you
          </p>
        </div>
      </div>
    );
  }

  // --- Login View ---
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground">call a nanny</h1>
          <p className="text-muted-foreground mt-1 text-sm">Administration Portal</p>
        </div>

        <div className="bg-card rounded-2xl shadow-soft border border-border p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Admin Login</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access the dashboard
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-warm text-white font-semibold py-3 rounded-xl shadow-warm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
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
