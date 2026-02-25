import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  MapPin,
  X,
  Save,
  Send,
  ShieldBan,
  ShieldCheck,
  Link2,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  DollarSign,
  Eye,
} from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import { useData } from "../../context/DataContext";
import PhoneInput from "../../components/PhoneInput";
import type { Nanny, NannyStatus } from "@/types";

const emptyForm = {
  name: "",
  location: "",
  rate: "",
  bio: "",
  languages: "",
  experience: "",
  specialties: "",
  image: "",
  email: "",
  pin: "",
  phone: "",
  available: true,
};

const STATUS_BADGES: Record<NannyStatus, { label: string; bg: string; text: string; border: string }> = {
  active: { label: "Active", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  invited: { label: "Invited", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  blocked: { label: "Blocked", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export default function AdminNannies() {
  const {
    nannies, addNanny, updateNanny, deleteNanny, toggleNannyAvailability,
    inviteNanny, toggleNannyStatus, resendInvite, bulkUpdateNannyRate,
    impersonateNanny,
  } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingNanny, setEditingNanny] = useState<Nanny | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Invite modal state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);

  const filteredNannies = useMemo(() => {
    if (!search.trim()) return nannies;
    const query = search.toLowerCase();
    return nannies.filter(
      (n) =>
        n.name?.toLowerCase().includes(query) ||
        n.location?.toLowerCase().includes(query) ||
        n.email?.toLowerCase().includes(query)
    );
  }, [nannies, search]);

  // --- Add/Edit Modal ---
  const openAddModal = () => {
    setEditingNanny(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (nanny: Nanny) => {
    setEditingNanny(nanny);
    setForm({
      name: nanny.name || "",
      location: nanny.location || "",
      rate: String(nanny.rate || ""),
      bio: nanny.bio || "",
      languages: Array.isArray(nanny.languages)
        ? nanny.languages.join(", ")
        : nanny.languages || "",
      experience: nanny.experience || "",
      specialties: Array.isArray(nanny.specialties)
        ? nanny.specialties.join(", ")
        : nanny.specialties || "",
      image: nanny.image || "",
      email: nanny.email || "",
      pin: nanny.pin || "",
      phone: nanny.phone || "",
      available: nanny.available ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNanny(null);
    setForm(emptyForm);
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nannyData = {
      name: form.name.trim(),
      location: form.location.trim(),
      rate: Number(form.rate) || 0,
      bio: form.bio.trim(),
      languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
      experience: form.experience.trim(),
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      image: form.image.trim(),
      email: form.email.trim(),
      pin: form.pin.trim(),
      phone: form.phone.trim(),
      available: form.available,
      rating: editingNanny?.rating || 5.0,
    };
    if (editingNanny) {
      updateNanny(editingNanny.id, nannyData);
    } else {
      addNanny(nannyData);
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    deleteNanny(id);
    setDeleteConfirm(null);
  };

  // --- Invite Modal ---
  const openInviteModal = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteError("");
    setInviteLink("");
    setInviteEmailSent(false);
    setLinkCopied(false);
    setShowManualLink(false);
    setInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteError("");
    setInviteLink("");
    setInviteEmailSent(false);
    setLinkCopied(false);
    setShowManualLink(false);
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    const result = await inviteNanny({ name: inviteName.trim(), email: inviteEmail.trim() });
    if (result.success) {
      setInviteLink(result.inviteLink);
      setInviteEmailSent(result.emailSent ?? false);
    } else {
      setInviteError(result.error);
    }
    setInviteLoading(false);
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // --- Bulk Rate Modal ---
  const [bulkRateModalOpen, setBulkRateModalOpen] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState("");
  const [bulkRateLoading, setBulkRateLoading] = useState(false);
  const [bulkRateError, setBulkRateError] = useState("");
  const [bulkRateSuccess, setBulkRateSuccess] = useState("");

  const handleBulkRateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rate = Number(bulkRateValue);
    if (!rate || rate <= 0) { setBulkRateError("Please enter a valid positive rate."); return; }
    setBulkRateLoading(true);
    setBulkRateError("");
    const result = await bulkUpdateNannyRate(rate);
    setBulkRateLoading(false);
    if (result.success) {
      setBulkRateSuccess(`Rate updated to ${rate} €/hr for ${result.nannyCount} nannies.`);
      setTimeout(() => { setBulkRateModalOpen(false); setBulkRateSuccess(""); setBulkRateValue(""); }, 2000);
    } else {
      setBulkRateError(result.error || "Failed to update rates.");
    }
  };

  // Resend invite handler
  const [resendLoading, setResendLoading] = useState<number | null>(null);
  const [resendLink, setResendLink] = useState<{ id: number; link: string } | null>(null);

  const handleResendInvite = async (nannyId: number) => {
    setResendLoading(nannyId);
    const result = await resendInvite(nannyId);
    if (result.success) {
      const sent = (result as { emailSent?: boolean }).emailSent;
      setResendLink({ id: nannyId, link: sent ? 'email_sent' : result.inviteLink });
      if (!sent) { try { await navigator.clipboard.writeText(result.inviteLink); } catch {} }
      setTimeout(() => setResendLink(null), 4000);
    }
    setResendLoading(null);
  };

  // Status badge helper
  const renderStatusBadge = (status: NannyStatus) => {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.active;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
            Manage Nannies
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {nannies.length} nann{nannies.length !== 1 ? "ies" : "y"} registered
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => { setBulkRateValue(""); setBulkRateError(""); setBulkRateSuccess(""); setBulkRateModalOpen(true); }}
            className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Set All Rates
          </button>
          <button
            onClick={openInviteModal}
            className="bg-accent text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Invite Nanny
          </button>
          <button
            onClick={openAddModal}
            className="gradient-warm text-white font-semibold px-5 py-2.5 rounded-xl shadow-warm hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Nanny
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, location, or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Nannies Grid */}
      {filteredNannies.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-soft">
          <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-medium text-foreground text-lg">No nannies found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search
              ? "Try adjusting your search terms."
              : "Invite your first nanny to get started."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nanny
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredNannies.map((nanny) => (
                    <tr
                      key={nanny.id}
                      className={`hover:bg-muted/30 transition-colors ${nanny.status === "blocked" ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {nanny.image ? (
                            <img
                              src={nanny.image}
                              alt={nanny.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                              <UserPlus className="w-5 h-5 text-primary/60" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {nanny.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {nanny.email || "No email"}
                            </p>
                            {nanny.phone && (
                              <p className="text-xs text-muted-foreground">
                                {nanny.phone}
                              </p>
                            )}
                            <p className="text-xs mt-0.5">
                              {nanny.status === "invited" ? (
                                <span className="text-amber-500 italic">PIN: Pending</span>
                              ) : nanny.pin ? (
                                <span className="font-mono text-primary/70">PIN: {nanny.pin}</span>
                              ) : (
                                <span className="text-muted-foreground/50 italic">No PIN</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {nanny.location || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">
                        {nanny.rate} €/hr
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(nanny.status || "active")}
                          {resendLink?.id === nanny.id && (
                            <span className="text-xs text-green-600 font-medium">{resendLink?.link === 'email_sent' ? 'Invite re-sent!' : 'Link copied!'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleNannyAvailability(nanny.id)}
                          className="flex items-center gap-2 group"
                          title={nanny.available ? "Click to mark unavailable" : "Click to mark available"}
                        >
                          {nanny.available ? (
                            <>
                              <ToggleRight className="w-7 h-7 text-accent" />
                              <span className="text-xs font-semibold text-accent">Available</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                              <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Block / Unblock */}
                          {nanny.status !== "invited" && (
                            <button
                              onClick={() => toggleNannyStatus(nanny.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                nanny.status === "blocked"
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              }`}
                              title={nanny.status === "blocked" ? "Unblock nanny" : "Block nanny"}
                            >
                              {nanny.status === "blocked" ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <ShieldBan className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Resend Invite (invited only) */}
                          {nanny.status === "invited" && (
                            <button
                              onClick={() => handleResendInvite(nanny.id)}
                              disabled={resendLoading === nanny.id}
                              className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                              title="Resend invitation (copies new link)"
                            >
                              {resendLoading === nanny.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link2 className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* View as Nanny */}
                          {nanny.status === "active" && (
                            <button
                              onClick={() => { impersonateNanny(nanny); navigate("/nanny"); }}
                              className="p-2 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
                              title={`View portal as ${nanny.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(nanny)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit nanny"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {deleteConfirm === nanny.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(nanny.id)}
                                className="text-xs font-medium text-white bg-destructive px-2.5 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg hover:bg-muted/80 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(nanny.id)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete nanny"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredNannies.map((nanny) => (
              <div
                key={nanny.id}
                className={`bg-card rounded-xl border border-border shadow-soft overflow-hidden ${nanny.status === "blocked" ? "opacity-60" : ""}`}
              >
                <div className="p-4 space-y-3">
                  {/* Nanny Header */}
                  <div className="flex items-start gap-3">
                    {nanny.image ? (
                      <img
                        src={nanny.image}
                        alt={nanny.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-border shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border shrink-0">
                        <UserPlus className="w-6 h-6 text-primary/60" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-foreground truncate">
                        {nanny.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{nanny.location || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {renderStatusBadge(nanny.status || "active")}
                        <span className="text-xs font-medium text-foreground">
                          {nanny.rate} €/hr
                        </span>
                      </div>
                      <p className="text-xs mt-1">
                        {nanny.status === "invited" ? (
                          <span className="text-amber-500 italic">PIN: Pending</span>
                        ) : nanny.pin ? (
                          <span className="font-mono text-primary/70">PIN: {nanny.pin}</span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">No PIN</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleNannyAvailability(nanny.id)}
                      className="flex items-center gap-2"
                    >
                      {nanny.available ? (
                        <>
                          <ToggleRight className="w-7 h-7 text-accent" />
                          <span className="text-xs font-semibold text-accent">Available</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>
                        </>
                      )}
                    </button>

                    {/* Block/Unblock on mobile */}
                    {nanny.status !== "invited" && (
                      <button
                        onClick={() => toggleNannyStatus(nanny.id)}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                          nanny.status === "blocked"
                            ? "text-green-600 bg-green-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        {nanny.status === "blocked" ? (
                          <><ShieldCheck className="w-3.5 h-3.5" /> Unblock</>
                        ) : (
                          <><ShieldBan className="w-3.5 h-3.5" /> Block</>
                        )}
                      </button>
                    )}
                    {nanny.status === "invited" && (
                      <button
                        onClick={() => handleResendInvite(nanny.id)}
                        disabled={resendLoading === nanny.id}
                        className="p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 text-amber-600 bg-amber-50 disabled:opacity-50"
                      >
                        {resendLoading === nanny.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><Link2 className="w-3.5 h-3.5" /> Resend</>
                        )}
                      </button>
                    )}
                  </div>

                  {resendLink?.id === nanny.id && (
                    <p className="text-xs text-green-600 font-medium text-center">{resendLink?.link === 'email_sent' ? 'Invite email re-sent!' : 'New invite link copied!'}</p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex border-t border-border divide-x divide-border">
                  {nanny.status === "active" && (
                    <button
                      onClick={() => { impersonateNanny(nanny); navigate("/nanny"); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View as
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(nanny)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>

                  {deleteConfirm === nanny.id ? (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
                      <button
                        onClick={() => handleDelete(nanny.id)}
                        className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(nanny.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invite Nanny Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={closeInviteModal}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <Send className="w-5 h-5 text-accent" />
                Invite a Nanny
              </h2>
              <button
                onClick={closeInviteModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!inviteLink ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter the nanny's name and email. An invitation email will be sent automatically with a registration link.
                  </p>

                  {inviteError && (
                    <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                      {inviteError}
                    </div>
                  )}

                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        required
                        placeholder="e.g. Layla Mansouri"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        placeholder="layla@example.com"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}
                      className="w-full bg-accent text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Invitation
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Success */}
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                    {inviteEmailSent ? (
                      <>
                        <p className="font-medium text-foreground">Invitation Sent!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          An email has been sent to <strong>{inviteEmail}</strong> with a registration link.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-foreground">Invitation Created!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Email could not be sent. Share the link below with <strong>{inviteName}</strong>.
                        </p>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center mb-4">
                    This link expires in 7 days. The nanny will fill in their profile and create a PIN to log in.
                  </p>

                  {/* Collapsible manual link */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowManualLink(!showManualLink)}
                      className="text-xs text-primary hover:underline font-medium flex items-center gap-1 mx-auto"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {showManualLink ? "Hide link" : "Copy link manually"}
                    </button>
                    {showManualLink && (
                      <div className="bg-muted/50 rounded-xl p-3 mt-2">
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-foreground bg-background rounded-lg px-3 py-2 break-all border border-border">
                            {inviteLink}
                          </code>
                          <button
                            onClick={() => copyLink(inviteLink)}
                            className={`p-2 rounded-lg transition-colors shrink-0 ${
                              linkCopied
                                ? "text-green-600 bg-green-50"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            }`}
                            title="Copy link"
                          >
                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        {linkCopied && (
                          <p className="text-xs text-green-600 mt-1.5 font-medium">Copied to clipboard!</p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={closeInviteModal}
                    className="w-full bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {editingNanny ? "Edit Nanny" : "Add New Nanny"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  required
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleFormChange("location", e.target.value)}
                  required
                  placeholder="e.g. Gueliz, Marrakech"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Rate and Experience */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Rate (€/hr) *</label>
                  <input
                    type="number"
                    value={form.rate}
                    onChange={(e) => handleFormChange("rate", e.target.value)}
                    required
                    min="0"
                    placeholder="150"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Experience</label>
                  <input
                    type="text"
                    value={form.experience}
                    onChange={(e) => handleFormChange("experience", e.target.value)}
                    placeholder="e.g. 5 years"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => handleFormChange("bio", e.target.value)}
                  rows={3}
                  placeholder="Short bio about the nanny..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Languages <span className="text-xs text-muted-foreground font-normal ml-1">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.languages}
                  onChange={(e) => handleFormChange("languages", e.target.value)}
                  placeholder="Arabic, French, English"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Specialties <span className="text-xs text-muted-foreground font-normal ml-1">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.specialties}
                  onChange={(e) => handleFormChange("specialties", e.target.value)}
                  placeholder="Infants, Toddlers, Creative Play"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Profile Photo Upload */}
              <ImageUpload
                currentImage={form.image}
                onImageChange={(base64) => handleFormChange("image", base64)}
              />

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <PhoneInput
                  value={form.phone}
                  onChange={(val) => handleFormChange("phone", val)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Portal Login Credentials */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Nanny Portal Login
                </p>
                {editingNanny?.status === "invited" ? (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                    PIN will be set by the nanny during registration.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => handleFormChange("email", e.target.value)}
                        placeholder="nanny@callananny.ma"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">PIN Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.pin}
                        onChange={(e) => handleFormChange("pin", e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all tracking-widest font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium text-foreground">Available for bookings</label>
                <button
                  type="button"
                  onClick={() => handleFormChange("available", !form.available)}
                  className="flex items-center gap-2"
                >
                  {form.available ? (
                    <ToggleRight className="w-8 h-8 text-accent" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-warm text-white font-semibold py-2.5 rounded-xl shadow-warm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingNanny ? "Save Changes" : "Add Nanny"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Rate Modal */}
      {bulkRateModalOpen && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="font-serif text-lg font-bold text-foreground">Set All Nanny Rates</h2>
              </div>
              <button onClick={() => setBulkRateModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This will update the hourly rate for all <strong>active</strong> and <strong>invited</strong> nannies at once.
            </p>
            <form onSubmit={handleBulkRateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Hourly Rate (€/hr)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={bulkRateValue}
                  onChange={(e) => setBulkRateValue(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
              {bulkRateError && <p className="text-sm text-destructive">{bulkRateError}</p>}
              {bulkRateSuccess && <p className="text-sm text-emerald-600 font-medium">{bulkRateSuccess}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={bulkRateLoading}
                  className="flex-1 bg-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkRateLoading ? "Updating..." : "Apply to All"}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkRateModalOpen(false)}
                  className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
