import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Profile.css";

const API_URL = "http://localhost:8080/api/profile";

const DASHBOARD_PATHS = {
  EMPLOYEE: "/employee",
  ACCOUNTS: "/accounts",
  DIRECTOR: "/director",
};

export default function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const dashboardPath = DASHBOARD_PATHS[role] || "/";

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    department: "",
    employeeCode: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        ["token", "userId", "directorId", "employeeId", "accountsId", "role", "username"]
          .forEach((key) => localStorage.removeItem(key));
        navigate("/", { replace: true });
      }
      throw new Error(data.message || data.error || `Request failed (${response.status})`);
    }

    return data;
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const data = await apiRequest("/me");
        if (!active) return;

        setProfile(data);
        setForm({
          fullName: data.fullName || "",
          email: data.email || "",
          department: data.department || "",
          employeeCode: data.employeeCode || "",
        });
      } catch (err) {
        if (active) setError(err.message || "Unable to load your profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();
    return () => { active = false; };
    // Load once for the authenticated session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiRequest("/me", {
        method: "PUT",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim() || null,
          department: form.department.trim(),
          employeeCode: form.employeeCode.trim() || null,
        }),
      });

      setProfile(updated);
      setForm({
        fullName: updated.fullName || "",
        email: updated.email || "",
        department: updated.department || "",
        employeeCode: updated.employeeCode || "",
      });
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (passwords.newPassword.length < 8 || passwords.newPassword.length > 72) {
      setError("New password must contain between 8 and 72 characters.");
      return;
    }

    if (passwords.currentPassword === passwords.newPassword) {
      setError("New password must differ from your current password.");
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest("/change-password", {
        method: "POST",
        body: JSON.stringify(passwords),
      });
      setMessage(data.message || "Password changed successfully.");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="profile-page"><p>Loading profile...</p></main>;
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <p className="profile-error" role="alert">{error || "Unable to load your profile."}</p>
        <Link className="profile-back" to={dashboardPath}>Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <p className="profile-eyebrow">ACCOUNT SETTINGS</p>
          <h1>My Profile</h1>
          <p>Manage your account information and security.</p>
        </div>
        <Link className="profile-back" to={dashboardPath}>← Back to Dashboard</Link>
      </header>

      {message && <div className="profile-success" role="status">{message}</div>}
      {error && <div className="profile-error" role="alert">{error}</div>}

      <section className="profile-card">
        <div className="profile-identity">
          <div className="profile-avatar">
            {(profile.fullName || profile.username || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{profile.fullName || profile.username}</h2>
            <p>{profile.role}</p>
            <span>Username: {profile.username}</span>
          </div>
        </div>

        <form onSubmit={saveProfile}>
          <h2>Personal Information</h2>
          <div className="profile-grid">
            <label>
              Full Name
              <input name="fullName" value={form.fullName} onChange={updateField} maxLength={100} required />
            </label>
            <label>
              Username
              <input value={profile.username || ""} readOnly />
            </label>
            <label>
              Email Address
              <input name="email" type="email" value={form.email} onChange={updateField} maxLength={254} />
            </label>
            <label>
              Department
              <input name="department" value={form.department} onChange={updateField} maxLength={100} required />
            </label>
            <label>
              Employee Code
              <input name="employeeCode" value={form.employeeCode} onChange={updateField} maxLength={50} />
            </label>
            <label>
              Role
              <input value={profile.role || role} readOnly />
            </label>
          </div>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      </section>

      <section className="profile-card">
        <h2>Change Password</h2>
        <p>Enter your current password to set a new one.</p>
        <form onSubmit={changePassword}>
          <div className="profile-grid">
            <label>
              Current Password
              <input
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                minLength={8}
                maxLength={72}
                required
              />
            </label>
          </div>
          <button type="submit" disabled={saving}>{saving ? "Please wait..." : "Change Password"}</button>
        </form>
      </section>
    </main>
  );
}
