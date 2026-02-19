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
  Camera,
} from "lucide-react";
import { useData } from "../../context/DataContext";

export default function NannyProfile() {
  const { nannyProfile, updateNannyProfile, fetchNannyBookings } = useData();
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

  // Load full profile data
  const [fullProfile, setFullProfile] = useState(null);

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
      setMessage("Profile updated successfully!");
      setEditing(false);
      // Refresh profile
      setFullProfile((prev) => ({ ...prev, ...updates }));
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Failed to update profile. Please try again.");
    }
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
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your profile information
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
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                {profile.rate} MAD/hr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Section */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Profile Details</h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-accent hover:underline font-medium"
            >
              Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Bio
            </label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                placeholder="Tell parents about yourself..."
              />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {profile.bio || "No bio set"}
              </p>
            )}
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Globe className="w-4 h-4 inline mr-1.5" />
              Languages
            </label>
            {editing ? (
              <input
                type="text"
                value={form.languages}
                onChange={(e) =>
                  setForm({ ...form, languages: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Arabic, French, English"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-medium"
                  >
                    {lang}
                  </span>
                ))}
                {languages.length === 0 && (
                  <span className="text-sm text-muted-foreground">None set</span>
                )}
              </div>
            )}
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Award className="w-4 h-4 inline mr-1.5" />
              Specialties
            </label>
            {editing ? (
              <input
                type="text"
                value={form.specialties}
                onChange={(e) =>
                  setForm({ ...form, specialties: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Early Childhood, First Aid, Montessori"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {specialties.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium"
                  >
                    {spec}
                  </span>
                ))}
                {specialties.length === 0 && (
                  <span className="text-sm text-muted-foreground">None set</span>
                )}
              </div>
            )}
          </div>

          {/* Image URL */}
          {editing && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Camera className="w-4 h-4 inline mr-1.5" />
                Profile Image URL
              </label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="https://..."
              />
            </div>
          )}

          {/* Availability Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Available for Bookings
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.available
                  ? "You are visible to parents"
                  : "You are hidden from parents"}
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
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
