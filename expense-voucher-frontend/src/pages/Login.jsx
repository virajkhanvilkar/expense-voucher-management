
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const API_URL = "http://localhost:8080/api/auth/login";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Clear stale session data before a new login.
      localStorage.removeItem("directorId");
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      localStorage.removeItem("token");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Login failed (HTTP ${response.status})`
        );
      }

      // Support top-level and nested response formats.
      const user = data.user ?? data;

      const token = data.token ?? data.accessToken ?? data.jwt;

      const userId =
        data.id ??
        data.userId ??
        user.id ??
        user.userId;

      const role = String(user.role ?? data.role ?? "")
        .trim()
        .toUpperCase();

      const loggedInUsername =
        user.username ?? data.username ?? username.trim();

      if (!token) {
        throw new Error("JWT token is missing from the login response.");
      }

      if (!role) {
        throw new Error("User role is missing from the login response.");
      }

      if (
        ["DIRECTOR", "EMPLOYEE", "ACCOUNTS"].includes(role) &&
        userId == null
      ) {
        throw new Error(
          "User ID is missing from the login response. " +
            "Check AuthController.java and the Postman response."
        );
      }

      // Save the authenticated session.
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("username", loggedInUsername);

      if (userId != null) {
        localStorage.setItem("userId", String(userId));
      }

      if (role === "DIRECTOR") {
        localStorage.setItem("directorId", String(userId));
      }

      // Log session metadata only; never log the JWT.
      console.log("Login session saved:", {
        userId: localStorage.getItem("userId"),
        directorId: localStorage.getItem("directorId"),
        role: localStorage.getItem("role"),
        username: localStorage.getItem("username"),
      });

      switch (role) {
        case "DIRECTOR":
          navigate("/director", { replace: true });
          break;

        case "ACCOUNTS":
          navigate("/accounts", { replace: true });
          break;

        case "EMPLOYEE":
          navigate("/employee", { replace: true });
          break;

        default:
          navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={login}>
        <h2>Expense Voucher Management</h2>
        <p>Sign in to your account</p>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username">Username</label>

          <input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>

          <div className="password-input-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={loading}
            >
              {showPassword ? (
                // Eye-off icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.59a2 2 0 002.83 2.83" />
                  <path d="M9.88 5.09A10.94 10.94 0 0112 4.9c5 0 8.27 4.11 9 7.1a9.7 9.7 0 01-2.1 3.7" />
                  <path d="M6.61 6.61A11.8 11.8 0 003 12c.73 2.99 4 7.1 9 7.1a10.8 10.8 0 004.39-.92" />
                </svg>
              ) : (
                // Eye icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="forgot-password-link">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        <button
          type="submit"
          className="login-submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;
