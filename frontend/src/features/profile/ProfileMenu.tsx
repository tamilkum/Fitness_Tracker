import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../../app/AuthContext";
import { api } from "../../services/api";

// ── helpers ──────────────────────────────────────────────────────────────────

function getAccountsStore() {
  try {
    return JSON.parse(
      localStorage.getItem("fitness-challenge-accounts") ?? "{}",
    ) as Record<
      string,
      {
        user_id: string;   // UUID
        profile: Record<string, unknown>;
        email: string;
        password: string;
      }
    >;
  } catch {
    return {};
  }
}

function saveAccountsStore(
  accounts: Record<
    string,
    {
      user_id: string;   // UUID
      profile: Record<string, unknown>;
      email: string;
      password: string;
    }
  >,
) {
  localStorage.setItem("fitness-challenge-accounts", JSON.stringify(accounts));
}

// ── InfoRow for view mode ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileMenu() {
  const { user, updateUser } = useAuth();

  // Dropdown open
  const [dropOpen, setDropOpen] = useState(false);
  // Edit pane open
  const [editOpen, setEditOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state — all fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [cityVillage, setCityVillage] = useState("");
  const [address, setAddress] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
        setSaveSuccess(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Close edit pane on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setEditOpen(false);
        setSaveError("");
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function openEdit() {
    // Seed form with current values
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setAge(user?.age != null ? String(user.age) : "");
    setDob(user?.date_of_birth ?? "");
    setCountry(user?.country ?? "");
    setStateProvince(user?.state_province ?? "");
    setCityVillage(user?.city_village ?? "");
    setAddress(user?.address ?? "");
    setSaveError("");
    setSaveSuccess(false);
    setDropOpen(false);   // close the small dropdown
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setSaveError("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();

    if (!trimFirst || !trimLast) {
      setSaveError("First name and last name are required.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      // Send ALL profile fields to the backend in one PATCH request
      const updatedBackend = await api.updateUser(user.id, {
        first_name: trimFirst,
        last_name: trimLast,
        age: age ? Number(age) : null,
        date_of_birth: dob || null,
        country: country.trim() || null,
        state_province: stateProvince.trim() || null,
        city: cityVillage.trim() || null,
        house_address: address.trim() || null,
      });

      // Merge the backend response (now contains all fields) with local email
      const merged = {
        ...updatedBackend,
        email: user.email,
        // keep city_village / address aliases so the rest of the UI still works
        city_village: updatedBackend.city ?? user.city_village,
        address: updatedBackend.house_address ?? user.address,
      };

      // Keep localStorage in sync for email (the only field not in the DB)
      const accounts = getAccountsStore();
      for (const key of Object.keys(accounts)) {
        if (accounts[key].user_id === user.id) {
          accounts[key].profile = {
            ...accounts[key].profile,
            first_name: trimFirst,
            last_name: trimLast,
          };
        }
      }
      saveAccountsStore(accounts);

      updateUser(merged);
      setSaveSuccess(true);
      setEditOpen(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Could not save changes.";

      if (raw.toLowerCase().includes("already registered")) {
        setSaveError(
          "This name is already taken. Please use a nickname as your first name or last name to make it unique.",
        );
      } else {
        setSaveError(raw);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const initials =
    (user.first_name[0] ?? "").toUpperCase() +
    (user.last_name[0] ?? "").toUpperCase();

  return (
    <>
      {/* ── Avatar button + small dropdown ── */}
      <div className="profile-menu-wrap" ref={dropRef}>
        <button
          className="profile-avatar-btn"
          onClick={() => { setDropOpen((v) => !v); setSaveSuccess(false); }}
          aria-label="Open profile"
          aria-haspopup="true"
          aria-expanded={dropOpen}
        >
          <span className="profile-avatar-initials">{initials}</span>
        </button>

        {dropOpen && (
          <div className="profile-dropdown" role="menu">
            {/* Header */}
            <div className="profile-dropdown-header">
              <div className="profile-dropdown-avatar">{initials}</div>
              <div>
                <p className="profile-dropdown-name">
                  {user.first_name} {user.last_name}
                </p>
                {user.email && (
                  <p className="profile-dropdown-email">{user.email}</p>
                )}
              </div>
            </div>

            {/* Info rows */}
            <div className="profile-info-grid">
              {user.age != null && (
                <InfoRow label="Age" value={String(user.age)} />
              )}
              {user.date_of_birth && (
                <InfoRow label="Date of birth" value={user.date_of_birth} />
              )}
              {user.country && (
                <InfoRow label="Country" value={user.country} />
              )}
              {user.state_province && (
                <InfoRow label="State / Province" value={user.state_province} />
              )}
              {user.city_village && (
                <InfoRow label="City / Village" value={user.city_village} />
              )}
              {user.address && (
                <InfoRow label="Address" value={user.address} />
              )}
            </div>

            {saveSuccess && (
              <p className="profile-save-success">Profile updated ✓</p>
            )}

            <button className="profile-edit-btn" onClick={openEdit}>
              Edit profile
            </button>
          </div>
        )}
      </div>

      {/* ── Right-side edit drawer ── */}
      <div
        className={`profile-edit-drawer ${editOpen ? "profile-edit-drawer--open" : ""}`}
        aria-hidden={!editOpen}
        role="complementary"
        aria-label="Edit profile"
      >
        <div className="profile-edit-drawer-inner">
          {/* Drawer header */}
          <div className="profile-edit-drawer-header">
            <h3 className="profile-edit-drawer-title">Edit profile</h3>
            <button
              className="profile-edit-drawer-close"
              onClick={closeEdit}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form
            className="profile-edit-drawer-form"
            onSubmit={handleSave}
            noValidate
          >
            {saveError && (
              <div className="profile-edit-error" role="alert">
                {saveError}
              </div>
            )}

            <p className="profile-edit-section-label">Personal information</p>

            <div className="profile-edit-row">
              <label>
                First name <span className="req">*</span>
                <input
                  required
                  maxLength={80}
                  value={firstName}
                  autoFocus={editOpen}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </label>
              <label>
                Last name <span className="req">*</span>
                <input
                  required
                  maxLength={80}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </label>
            </div>

            <div className="profile-edit-row">
              <label>
                Age
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                />
              </label>
              <label>
                Date of birth
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </label>
            </div>

            <p className="profile-edit-section-label">Location</p>

            <div className="profile-edit-row">
              <label>
                Country
                <input
                  maxLength={80}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                />
              </label>
              <label>
                State / Province
                <input
                  maxLength={80}
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="e.g. California"
                />
              </label>
            </div>

            <label>
              City / Village
              <input
                maxLength={100}
                value={cityVillage}
                onChange={(e) => setCityVillage(e.target.value)}
                placeholder="e.g. San Francisco"
              />
            </label>

            <label>
              House address
              <input
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, apartment, etc."
              />
            </label>

            {/* Actions */}
            <div className="profile-edit-drawer-actions">
              <button
                type="button"
                className="modal-cancel"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Overlay behind the drawer */}
      {editOpen && (
        <div
          className="profile-edit-overlay"
          onClick={closeEdit}
          aria-hidden="true"
        />
      )}
    </>
  );
}
