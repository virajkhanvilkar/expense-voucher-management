
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

const API_URL = "http://localhost:8080/api/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRequestOtp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }

      setOtpSent(true);
      setMessage(
        data.message ||
          "If the account exists, an OTP will be sent to its registered email."
      );
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that Spring Boot is running on port 8080."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit OTP.");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      setError("Password must be between 8 and 72 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Reset failed (${response.status})`);
      }

      setMessage(data.message || "Password reset successful.");

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Check that Spring Boot is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="forgot-page">
      <section className="forgot-card">
        <div className="forgot-icon" aria-hidden="true">🔐</div>

        <h1>Forgot Password?</h1>

        <p className="forgot-subtitle">
          {otpSent
            ? "Enter the OTP sent to your registered email."
            : "Enter your username. We will send an OTP to the email registered in your account."}
        </p>

        {error && (
          <div className="forgot-alert error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="forgot-alert success" role="status">
            {message}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleRequestOtp}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              maxLength={100}
              required
              disabled={loading}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <label htmlFor="username-display">Username</label>
            <input id="username-display" value={username} readOnly />

            <label htmlFor="otp">Six-digit OTP</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              autoComplete="one-time-code"
              required
              disabled={loading}
            />

            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              disabled={loading}
            />

            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              disabled={loading}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setMessage("");
                setError("");
              }}
            >
              Back
            </button>
          </form>
        )}

        <p className="back-login">
          <Link to="/login">← Back to Login</Link>
        </p>
      </section>
    </main>
  );
}
