import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      const data = response.data;
      const token = data.token;
      const role = data.role;
      const loggedInUser = data.username;
      const databaseId = data.id ?? data.userId;

      if (!token || !role) {
        throw new Error("Invalid login response from server.");
      }

      // Clear the previous session
      localStorage.clear();

      // Store login information
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("username", loggedInUser ?? username);

      if (databaseId != null) {
        localStorage.setItem("userId", String(databaseId));
      }

      if (role === "EMPLOYEE") {
        const empId = data.employeeId ?? databaseId;

        if (empId == null) {
          setError("Employee ID is missing from the login response.");
          return;
        }

        localStorage.setItem("employeeId", String(empId));
        navigate("/employee");
      } else if (role === "DIRECTOR") {
        const dirId = data.directorId ?? databaseId;

        if (dirId == null) {
          setError(
            "Director ID is missing from the login response. " +
            "Please update the backend login response."
          );
          return;
        }

        localStorage.setItem("directorId", String(dirId));
        navigate("/director");
      } else if (role === "ACCOUNTS") {
        navigate("/accounts");
      } else {
        localStorage.clear();
        setError("Unknown user role.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Login failed. Check your username and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <div className="brand-icon">EV</div>

        <h1>Expense Voucher</h1>

        <p className="subtitle">
          Sign in to manage your expense vouchers
        </p>

        {error && <div className="error">{error}</div>}

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="login-footer">
          Prachay Securities Private Limited
        </p>
      </form>
    </div>
  );
}