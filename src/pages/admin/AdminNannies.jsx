import { useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  MapPin,
  Star,
  X,
  Save,
} from "lucide-react";
import { useData } from "../../context/DataContext";

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
  available: true,
};

export default function AdminNannies() {
  const { nannies, addNanny, updateNanny, deleteNanny, toggleNannyAvailability } =
    useData();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNanny, setEditingNanny] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filteredNannies = useMemo(() => {
    if (!search.trim()) return nannies;
    const query = search.toLowerCase();
    return nannies.filter(
      (n) =>
        n.name.toLowerCase().includes(query) ||
        n.location.toLowerCase().includes(query)
    );
  }, [nannies, search]);

  const openAddModal = () => {
    setEditingNanny(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (nanny) => {
    setEditingNanny(nanny);
    setForm({
      name: nanny.name || "",
      location: nanny.location || "",
      rate: nanny.rate || "",
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
      available: nanny.available ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNanny(null);
    setForm(emptyForm);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();

    const nannyData = {
      name: form.name.trim(),
      location: form.location.trim(),
      rate: Number(form.rate) || 0,
      bio: form.bio.trim(),
      languages: form.languages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
      experience: form.experience.trim(),
      specialties: form.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      image: form.image.trim(),
      email: form.email.trim(),
      pin: form.pin.trim(),
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

  const handleDelete = (id) => {
    deleteNanny(id);
    setDeleteConfirm(null);
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
        <button
          onClick={openAddModal}
          className="gradient-warm text-white font-semibold px-5 py-2.5 rounded-xl shadow-warm hover:opacity-90 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          Add Nanny
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nannies by name or location..."
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
              : "Add your first nanny to get started."}
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
                      Rating
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
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
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={nanny.image}
                            alt={nanny.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                          />
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {nanny.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {nanny.experience} experience
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {nanny.location}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">
                        {nanny.rate} MAD/hr
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-foreground">
                            {nanny.rating}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleNannyAvailability(nanny.id)}
                          className="flex items-center gap-2 group"
                          title={
                            nanny.available
                              ? "Click to mark unavailable"
                              : "Click to mark available"
                          }
                        >
                          {nanny.available ? (
                            <>
                              <ToggleRight className="w-7 h-7 text-accent" />
                              <span className="text-xs font-semibold text-accent">
                                Available
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                              <span className="text-xs font-semibold text-muted-foreground">
                                Unavailable
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(nanny)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit nanny"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

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
                className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {/* Nanny Header */}
                  <div className="flex items-start gap-3">
                    <img
                      src={nanny.image}
                      alt={nanny.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-foreground truncate">
                        {nanny.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{nanny.location}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium text-foreground">
                            {nanny.rating}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {nanny.rate} MAD/hr
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Availability Toggle */}
                  <button
                    onClick={() => toggleNannyAvailability(nanny.id)}
                    className="flex items-center gap-2 w-full"
                  >
                    {nanny.available ? (
                      <>
                        <ToggleRight className="w-7 h-7 text-accent" />
                        <span className="text-xs font-semibold text-accent">
                          Available
                        </span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          Unavailable
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Card Actions */}
                <div className="flex border-t border-border divide-x divide-border">
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Name *
                </label>
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
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Location *
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleFormChange("location", e.target.value)}
                  required
                  placeholder="e.g. Gueliz, Marrakech"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Rate and Experience Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Rate (MAD/hr) *
                  </label>
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Experience
                  </label>
                  <input
                    type="text"
                    value={form.experience}
                    onChange={(e) =>
                      handleFormChange("experience", e.target.value)
                    }
                    placeholder="e.g. 5 years"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Bio
                </label>
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
                  Languages
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    (comma-separated)
                  </span>
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
                  Specialties
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    (comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.specialties}
                  onChange={(e) =>
                    handleFormChange("specialties", e.target.value)
                  }
                  placeholder="Infants, Toddlers, Creative Play"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => handleFormChange("image", e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Portal Login Credentials */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Nanny Portal Login
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                      placeholder="nanny@callananny.ma"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pin}
                      onChange={(e) =>
                        handleFormChange("pin", e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="123456"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all tracking-widest font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium text-foreground">
                  Available for bookings
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleFormChange("available", !form.available)
                  }
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
    </div>
  );
}
