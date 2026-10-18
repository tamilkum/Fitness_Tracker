import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { api } from "../services/api";

type Mode = "login" | "register";

// ── Sign-in form ──────────────────────────────────────────────────────────────

function SignInForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const user = await api.signIn(email, password);
      login(user);
      navigate("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <label>
        Email address
        <input
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label>
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />
      </label>

      <button className="primary-button login-submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

// ── Registration form ─────────────────────────────────────────────────────────

function RegisterForm({ onSuccess: _onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const newUser = await api.createAccount({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        age: Number(age),
        date_of_birth: dob,
        country: country.trim(),
        state_province: state.trim(),
        city_village: city.trim(),
        address: address.trim(),
      });

      login(newUser);
      navigate("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <p className="form-section-label">Personal information</p>

      <div className="form-row">
        <label>
          First name <span className="req">*</span>
          <input
            required
            maxLength={80}
            autoFocus
            value={firstName}
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

      <div className="form-row">
        <label>
          Age <span className="req">*</span>
          <input
            type="number"
            required
            min={5}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 28"
          />
        </label>

        <label>
          Date of birth <span className="req">*</span>
          <input
            type="date"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
      </div>

      <p className="form-section-label">Location</p>

      <div className="form-row">
        <label>
          Country <span className="req">*</span>
          <input
            required
            maxLength={80}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. United States"
          />
        </label>

        <label>
          State / Province <span className="req">*</span>
          <input
            required
            maxLength={80}
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. California"
          />
        </label>
      </div>

      <label>
        City / Village <span className="req">*</span>
        <input
          required
          maxLength={100}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. San Francisco"
        />
      </label>

      <label>
        House address <span className="req">*</span>
        <input
          required
          maxLength={200}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, apartment, etc."
        />
      </label>

      <p className="form-section-label">Account credentials</p>

      <label>
        Email address <span className="req">*</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <div className="form-row">
        <label>
          Password <span className="req">*</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
          />
        </label>

        <label>
          Confirm password <span className="req">*</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
          />
        </label>
      </div>

      <button className="primary-button login-submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");

  function switchMode(next: Mode) {
    setMode(next);
  }

  return (
    <div className="login-shell">
      <div className={`login-card ${mode === "register" ? "login-card--wide" : ""}`}>
        <div className="login-brand">
          <span className="brand-icon">S</span>
          <span className="login-title">stride</span>
        </div>

        <p className="login-subtitle">Fitness Challenge</p>

        <div className="mode-tabs">
          <button
            className={mode === "login" ? "mode-tab active" : "mode-tab"}
            onClick={() => switchMode("login")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={mode === "register" ? "mode-tab active" : "mode-tab"}
            onClick={() => switchMode("register")}
            type="button"
          >
            Create account
          </button>
        </div>

        {mode === "login" ? (
          <SignInForm />
        ) : (
          <RegisterForm onSuccess={() => switchMode("login")} />
        )}

        <p className="login-hint">
          {mode === "login" ? "No account yet? " : "Already have an account? "}
          <button
            className="link-button"
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create one" : "Sign in instead"}
          </button>
        </p>
      </div>
    </div>
  );
}
