import { useState, useEffect } from "react";
import {
  UserPlus, Shield, ShieldOff, Trash2, Key, Mail, User,
  AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Clock,
  LogIn, Copy, Search, X, ShieldCheck, Crown, Pencil
} from "lucide-react";
import { useData } from "../../context/DataContext";
import type { AdminUser, AdminRole } from "@/types";

const ROLE_BADGES: Record<AdminRole, { label: string; color: string; icon: typeof Crown }> = {
  super_admin: { label: "Super Admin", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Crown },
  admin: { label: "Admin", color: "bg-blue-50 text-blue-700 border-blue-200", icon: ShieldCheck },
  supervisor: { label: "Supervisor", color: "bg-violet-50 text-violet-700 border-violet-200", icon: Eye },
};

export default function AdminUsers() {
  const {
    adminProfile,
    adminUsers,
    fetchAdminUsers,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    changeAdminPassword,
    forgotAdminPassword,
  } = useData();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "" });
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Change Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);

  // Edit Name Modal
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    fetchAdminUsers().finally(() => setLoading(false));
  }, [fetchAdminUsers]);

  const filteredUsers = adminUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // --- Add User (invite by email) ---
  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    setAddLoading(true);
    const result = await addAdminUser(addForm);
    if (result.success) {
      setAddSuccess("Invitation sent! A registration email has been sent to " + addForm.email);
      setAddForm({ name: "", email: "" });
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess("");
      }, 3000);
    } else {
      setAddError(result.error);
    }
    setAddLoading(false);
  };

  // --- Change Password ---
  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (!adminProfile?.id) return;
    setPasswordLoading(true);
    const result = await changeAdminPassword(
      adminProfile.id,
      passwordForm.currentPassword,
      passwordForm.newPassword
    );
    if (result.success) {
      setPasswordSuccess("Password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } else {
      setPasswordError(result.error);
    }
    setPasswordLoading(false);
  };

  // --- Reset Password ---
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError("");
    setResetLink("");
    setResetLoading(true);
    const result = await forgotAdminPassword(resetEmail);
    if (result.success && result.resetLink) {
      setResetLink(result.resetLink);
    } else if (result.success) {
      setResetLink("");
      setResetError(result.message || "If that email is registered, a reset link has been generated.");
    } else {
      setResetError(result.error);
    }
    setResetLoading(false);
  };

  const copyResetLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resetLink);
    } else {
      const ta = document.createElement("textarea");
      ta.value = resetLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  // --- Toggle Active ---
  const handleToggleActive = async (user: AdminUser) => {
    await updateAdminUser(user.id, { isActive: !user.isActive });
  };

  // --- Delete User ---
  const handleDelete = async (id: number) => {
    const result = await deleteAdminUser(id);
    if (!result.success) {
      alert(result.error);
    }
    setDeleteConfirm(null);
  };

  // --- Edit Name ---
  const openEditName = (user: AdminUser) => {
    setEditUser(user);
    setEditName(user.name);
    setEditError("");
  };

  const handleEditName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser || !editName.trim()) return;
    setEditError("");
    setEditLoading(true);
    const result = await updateAdminUser(editUser.id, { name: editName.trim() });
    if (result.success) {
      setEditUser(null);
      setEditName("");
    } else {
      setEditError(result.error);
    }
    setEditLoading(false);
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Admin Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage admin accounts and access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">Change Password</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 gradient-warm text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-warm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Admin</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search admins..."
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Users Table (Desktop) */}
      <div className="hidden md:block bg-card rounded-2xl shadow-soft border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Login</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logins</th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => {
              const role = ROLE_BADGES[user.role] || ROLE_BADGES.admin;
              const RoleIcon = role.icon;
              const isMe = user.id === adminProfile?.id;

              return (
                <tr key={user.id} className={`hover:bg-muted/20 transition-colors ${!user.isActive ? "opacity-60" : ""}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        user.role === "super_admin" ? "bg-purple-100" : "bg-primary/10"
                      }`}>
                        <span className={`text-sm font-bold ${
                          user.role === "super_admin" ? "text-purple-700" : "text-primary"
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.name}
                          {isMe && (
                            <span className="ml-2 text-[10px] font-semibold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${role.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {role.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      user.isActive
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      {user.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(user.lastLogin)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <LogIn className="w-3.5 h-3.5" />
                      {user.loginCount}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit name button */}
                      <button
                        onClick={() => openEditName(user)}
                        title="Edit name"
                        className="p-2 rounded-lg text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Reset password button */}
                      <button
                        onClick={() => { setResetEmail(user.email); setShowResetModal(true); setResetLink(""); setResetError(""); }}
                        title="Reset password"
                        className="p-2 rounded-lg text-muted-foreground hover:bg-amber-50 hover:text-amber-600 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {/* Toggle active (not for yourself) */}
                      {!isMe && (
                        <button
                          onClick={() => handleToggleActive(user)}
                          title={user.isActive ? "Disable account" : "Enable account"}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive
                              ? "text-muted-foreground hover:bg-red-50 hover:text-red-600"
                              : "text-muted-foreground hover:bg-green-50 hover:text-green-600"
                          }`}
                        >
                          {user.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </button>
                      )}
                      {/* Delete (not for yourself, not last super_admin) */}
                      {!isMe && (
                        <button
                          onClick={() => setDeleteConfirm(user)}
                          title="Remove admin"
                          className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No admin users found
          </div>
        )}
      </div>

      {/* Users Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => {
          const role = ROLE_BADGES[user.role] || ROLE_BADGES.admin;
          const RoleIcon = role.icon;
          const isMe = user.id === adminProfile?.id;

          return (
            <div
              key={user.id}
              className={`bg-card rounded-xl border border-border p-4 shadow-soft ${!user.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.role === "super_admin" ? "bg-purple-100" : "bg-primary/10"
                  }`}>
                    <span className={`text-sm font-bold ${
                      user.role === "super_admin" ? "text-purple-700" : "text-primary"
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.name}
                      {isMe && (
                        <span className="ml-2 text-[10px] font-semibold uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${role.color}`}>
                  <RoleIcon className="w-3 h-3" />
                  {role.label}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  {user.isActive ? "Active" : "Disabled"}
                </span>
                <span className="flex items-center gap-1">
                  <LogIn className="w-3 h-3" />
                  {user.loginCount} logins
                </span>
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                <Clock className="w-3 h-3 inline mr-1" />
                Last login: {formatDate(user.lastLogin)}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => openEditName(user)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Name
                </button>
                <button
                  onClick={() => { setResetEmail(user.email); setShowResetModal(true); setResetLink(""); setResetError(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  Reset PW
                </button>
                {!isMe && (
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      user.isActive
                        ? "border border-red-200 text-red-600 hover:bg-red-50"
                        : "border border-green-200 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {user.isActive ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    {user.isActive ? "Disable" : "Enable"}
                  </button>
                )}
                {!isMe && (
                  <button
                    onClick={() => setDeleteConfirm(user)}
                    className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Invite Admin Modal ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-lg font-bold text-foreground">Invite Admin</h2>
                <p className="text-xs text-muted-foreground mt-1">A registration email will be sent to set their password</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddError(""); setAddSuccess(""); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            {addSuccess && (
              <div className="mb-4 bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg border border-green-100 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{addSuccess}</span>
              </div>
            )}

            {!addSuccess && (
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Full Name
                    </span>
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                    placeholder="e.g., Sarah Manager"
                    autoComplete="name"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Email Address
                    </span>
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                    placeholder="sarah@callananny.ma"
                    autoComplete="email"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                </div>
                <div className="bg-amber-50 text-amber-700 text-xs px-4 py-3 rounded-lg border border-amber-100 flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>The admin will receive an email with a registration link to set their own password. The link expires in 24 hours.</span>
                </div>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full gradient-warm text-white rounded-lg px-4 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Send Invitation</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== Change Password Modal ===== */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold text-foreground">Change Your Password</h2>
              <button onClick={() => { setShowPasswordModal(false); setPasswordError(""); setPasswordSuccess(""); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg border border-green-100 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password (min 6 characters)</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm pr-10"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={`w-full px-3 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm ${
                    passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                      ? "border-red-300"
                      : "border-border focus:border-primary"
                  }`}
                  required
                />
                {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full gradient-warm text-white rounded-lg px-4 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Key className="w-4 h-4" /> Change Password</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== Reset Password Modal ===== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold text-foreground">Reset Password</h2>
              <button onClick={() => { setShowResetModal(false); setResetLink(""); setResetError(""); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-lg border border-amber-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetLink ? (
              <div className="space-y-4">
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-100 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Reset link generated! Share it securely with the user. It expires in 1 hour.</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resetLink}
                    readOnly
                    className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-muted/50 text-xs font-mono text-foreground"
                  />
                  <button
                    onClick={copyResetLink}
                    className="flex items-center gap-1.5 px-4 py-2.5 gradient-warm text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-warm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a password reset link for this admin user. Share the link securely (e.g., WhatsApp, SMS).
                </p>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Admin Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full gradient-warm text-white rounded-lg px-4 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Key className="w-4 h-4" /> Generate Reset Link</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== Edit Name Modal ===== */}
      {editUser && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold text-foreground">Edit Admin Name</h2>
              <button onClick={() => { setEditUser(null); setEditError(""); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Full Name
                  </span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition text-sm"
                  placeholder="Enter new name"
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Editing: {editUser.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setEditUser(null); setEditError(""); }}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editName.trim() || editName.trim() === editUser.name}
                  className="flex-1 gradient-warm text-white rounded-lg px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Pencil className="w-4 h-4" /> Save Name</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground mb-2">Remove Admin?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to remove <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
