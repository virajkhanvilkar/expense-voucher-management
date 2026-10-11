import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import AccountsDashboard from "./pages/AccountsDashboard";
import DirectorDashboard from "./pages/DirectorDashboard";
import Profile from "./pages/Profile";

function RoleRoute({ allowedRoles, children }) {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toUpperCase();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    const roleHome = {
      EMPLOYEE: "/employee",
      ACCOUNTS: "/accounts",
      DIRECTOR: "/director",
    };

    return <Navigate to={roleHome[role] || "/"} replace />;
  }

  return children;
}

function HomeRoute() {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toUpperCase();

  if (!token) {
    return <Login />;
  }

  const roleHome = {
    EMPLOYEE: "/employee",
    ACCOUNTS: "/accounts",
    DIRECTOR: "/director",
  };

  return <Navigate to={roleHome[role] || "/"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<HomeRoute />} />

        {/* Forgot Password */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* Employee Dashboard */}
        <Route
          path="/employee"
          element={
            <RoleRoute allowedRoles={["EMPLOYEE"]}>
              <EmployeeDashboard />
            </RoleRoute>
          }
        />

        {/* Accounts Dashboard */}
        <Route
          path="/accounts"
          element={
            <RoleRoute allowedRoles={["ACCOUNTS"]}>
              <AccountsDashboard />
            </RoleRoute>
          }
        />

        {/* Director Dashboard */}
        <Route
          path="/director"
          element={
            <RoleRoute allowedRoles={["DIRECTOR"]}>
              <DirectorDashboard />
            </RoleRoute>
          }
        />

        {/* User Profile */}
        <Route
          path="/profile"
          element={
            <RoleRoute
              allowedRoles={[
                "EMPLOYEE",
                "ACCOUNTS",
                "DIRECTOR",
              ]}
            >
              <Profile />
            </RoleRoute>
          }
        />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}