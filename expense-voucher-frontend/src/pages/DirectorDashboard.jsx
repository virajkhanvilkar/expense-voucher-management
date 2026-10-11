
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import api from "../services/api";
import "./DirectorDashboard.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatStatus = (status) =>
  String(status || "").replaceAll("_", " ");

const getInitial = (name) =>
  String(name || "D").trim().charAt(0).toUpperCase() || "D";

export default function DirectorDashboard() {
  const navigate = useNavigate();

  const [pending, setPending] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [processedFilter, setProcessedFilter] = useState("ALL");
  const [signaturePath, setSignaturePath] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const username = localStorage.getItem("username") || "Director";
  const role = localStorage.getItem("role") || "DIRECTOR";

  const directorId =
    localStorage.getItem("directorId") ||
    localStorage.getItem("userId");

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [pendingResponse, processedResponse] =
        await Promise.all([
          api.get("/director/pending"),
          api.get("/director/processed"),
        ]);

      setPending(
        Array.isArray(pendingResponse.data)
          ? pendingResponse.data
          : []
      );

      setProcessed(
        Array.isArray(processedResponse.data)
          ? processedResponse.data
          : []
      );
    } catch (err) {
      console.error("Failed to load director vouchers:", err);

      setError(
        err.response?.status === 401
          ? "Session expired. Please log in again."
          : err.response?.status === 403
          ? "Access denied. Please log in as Director."
          : "Could not load vouchers. Check the backend and API endpoints."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const allVouchers = useMemo(
    () => [...pending, ...processed],
    [pending, processed]
  );

  const totalPendingAmount = pending.reduce(
    (sum, voucher) => sum + Number(voucher.amount || 0),
    0
  );

  const approvedVouchers = processed.filter(
    (voucher) => voucher.status === "APPROVED"
  );

  const rejectedVouchers = processed.filter(
    (voucher) => voucher.status === "REJECTED"
  );

  const totalApprovedAmount = approvedVouchers.reduce(
    (sum, voucher) => sum + Number(voucher.amount || 0),
    0
  );

  const totalRejectedAmount = rejectedVouchers.reduce(
    (sum, voucher) => sum + Number(voucher.amount || 0),
    0
  );

  const statusData = [
    { name: "Pending", value: pending.length },
    { name: "Approved", value: approvedVouchers.length },
    { name: "Rejected", value: rejectedVouchers.length },
  ];

  const chartColors = ["#F59E0B", "#16A34A", "#DC2626"];

  const monthlyData = useMemo(() => {
    const months = new Map();

    allVouchers.forEach((voucher) => {
      const date = voucher.voucherDate || voucher.expenseDate;
      if (!date) return;

      const month = String(date).slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return;

      months.set(
        month,
        (months.get(month) || 0) +
          Number(voucher.amount || 0)
      );
    });

    return [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }));
  }, [allVouchers]);

  const filteredPending = pending.filter((voucher) => {
    const term = search.trim().toLowerCase();

    return (
      !term ||
      [
        voucher.voucherNumber,
        voucher.expenseTitle,
        voucher.departmentName,
        voucher.expenseCategory,
        voucher.expenseDescription,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  });

  const filteredProcessed = processed.filter((voucher) => {
    const matchesStatus =
      processedFilter === "ALL" ||
      voucher.status === processedFilter;

    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      [
        voucher.voucherNumber,
        voucher.expenseTitle,
        voucher.departmentName,
        voucher.expenseCategory,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);

    return matchesStatus && matchesSearch;
  });

  const openBill = async (voucher) => {
    if (!voucher.billPhoto) {
      alert("No bill has been uploaded for this voucher.");
      return;
    }

    let fileUrl;

    try {
      const response = await api.get(
        `/vouchers/${voucher.id}/bill`,
        { responseType: "blob" }
      );

      const type =
        response.headers["content-type"] ||
        response.data.type;

      if (
        !type ||
        !(
          type.startsWith("image/") ||
          type === "application/pdf"
        )
      ) {
        throw new Error(
          "The server did not return an image or PDF."
        );
      }

      fileUrl = URL.createObjectURL(
        new Blob([response.data], { type })
      );

      const tab = window.open(fileUrl, "_blank");

      if (!tab) {
        URL.revokeObjectURL(fileUrl);
        alert("Please allow pop-ups to view the bill.");
        return;
      }

      tab.opener = null;

      window.setTimeout(
        () => URL.revokeObjectURL(fileUrl),
        60000
      );
    } catch (err) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);

      console.error("Bill viewing failed:", err);

      alert(
        err.response?.status === 403
          ? "You are not authorized to view this bill."
          : "Unable to open the bill. Verify the bill endpoint and file."
      );
    }
  };

  const approveVoucher = async (voucher) => {
    if (!directorId) {
      alert("Director ID is missing. Check your login data.");
      return;
    }

    if (!signaturePath.trim()) {
      alert("Enter the uploaded Director signature path first.");
      return;
    }

    if (
      !window.confirm(
        `Approve voucher ${voucher.voucherNumber || voucher.id}?`
      )
    ) {
      return;
    }

    try {
      setBusyId(voucher.id);

      await api.post(
        `/director/approve/${directorId}/${voucher.id}`,
        { directorSignaturePath: signaturePath.trim() }
      );

      setSignaturePath("");
      await loadVouchers();
      alert("Voucher approved successfully.");
    } catch (err) {
      console.error("Approval failed:", err);

      alert(
        err.response?.data?.message ||
          "Approval failed. Check the Director ID and backend logs."
      );
    } finally {
      setBusyId(null);
    }
  };

  const rejectVoucher = async (voucher) => {
    if (!directorId) {
      alert("Director ID is missing. Check your login data.");
      return;
    }

    if (!rejectionReason.trim()) {
      alert("Enter a reason for rejection.");
      return;
    }

    if (
      !window.confirm(
        `Reject voucher ${voucher.voucherNumber || voucher.id}?`
      )
    ) {
      return;
    }

    try {
      setBusyId(voucher.id);

      await api.post(
        `/director/reject/${directorId}/${voucher.id}`,
        { rejectionReason: rejectionReason.trim() }
      );

      setRejectingId(null);
      setRejectionReason("");
      await loadVouchers();
      alert("Voucher rejected successfully.");
    } catch (err) {
      console.error("Rejection failed:", err);

      alert(
        err.response?.data?.message ||
          "Rejection failed. Check the Director ID and backend logs."
      );
    } finally {
      setBusyId(null);
    }
  };

  const goToProfile = () => {
    setProfileOpen(false);
    navigate("/director/profile");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("directorId");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    navigate("/", { replace: true });
  };

  return (
    <div className="director-app">
      <aside className="director-sidebar">
        <div className="director-brand">
          <span className="director-brand-mark">EV</span>

          <span>
            EXPENSE VOUCHER
            <small>MANAGEMENT</small>
          </span>
        </div>

        <nav className="director-nav" aria-label="Director navigation">
          <a className="director-nav-active" href="#overview">
            <span className="director-nav-icon">▦</span>
            <span>Dashboard</span>
          </a>

          <a href="#pending-vouchers">
            <span className="director-nav-icon">▤</span>
            <span>Pending Vouchers</span>
          </a>

          <a href="#processed-vouchers">
            <span className="director-nav-icon">✓</span>
            <span>Processed Vouchers</span>
          </a>

          <a href="#analytics">
            <span className="director-nav-icon">◷</span>
            <span>Analytics</span>
          </a>
        </nav>

        <button className="director-logout" onClick={logout}>
          <span className="director-nav-icon">↪</span>
          <span>Logout</span>
        </button>
      </aside>

      <main className="director-main">
        <header className="director-topbar">
          <div className="director-breadcrumb">
            <span>Administration</span>
            <span className="director-breadcrumb-divider">/</span>
            <span>Voucher Management</span>
          </div>

          <div className="director-account">
            <button
              type="button"
              className="director-account-trigger"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="director-avatar">
                {getInitial(username)}
              </span>

              <span className="director-account-info">
                <strong>{username}</strong>
                <small>{role.replaceAll("_", " ")}</small>
              </span>

              <span className="director-account-chevron">
                {profileOpen ? "▴" : "▾"}
              </span>
            </button>

            {profileOpen && (
              <>
                <button
                  type="button"
                  className="director-dropdown-backdrop"
                  aria-label="Close account menu"
                  onClick={() => setProfileOpen(false)}
                />

                <div className="director-account-menu" role="menu">
                  <div className="director-menu-heading">
                    <strong>{username}</strong>
                    <small>Signed in as Director</small>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={goToProfile}
                  >
                    <span>♙</span>
                    My Profile
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className="director-menu-logout"
                  >
                    <span>↪</span>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="director-content" id="overview">
          <section className="director-heading">
            <div>
              <span className="director-eyebrow">
                EXECUTIVE OVERVIEW
              </span>

              <h1>Director Dashboard</h1>

              <p>
                Review claims, track expenses, and monitor voucher
                decisions from one place.
              </p>
            </div>

            <button
              className="director-secondary"
              onClick={loadVouchers}
              disabled={loading}
            >
              ↻ {loading ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          {error && (
            <div className="director-error" role="alert">
              {error}
            </div>
          )}

          <section className="director-metrics">
            <article>
              <span>Pending Vouchers</span>
              <strong>{pending.length}</strong>
              <small>
                {money(totalPendingAmount)} awaiting review
              </small>
            </article>

            <article>
              <span>Approved Amount</span>
              <strong>{money(totalApprovedAmount)}</strong>
              <small>
                {approvedVouchers.length} approved vouchers
              </small>
            </article>

            <article>
              <span>Rejected Vouchers</span>
              <strong>{rejectedVouchers.length}</strong>
              <small>
                {money(totalRejectedAmount)} rejected amount
              </small>
            </article>
          </section>

          <section className="director-chart-grid" id="analytics">
            <article className="director-panel">
              <h2>Voucher Expense Trend</h2>
              <p>Voucher amounts by month</p>

              <div className="director-chart">
                {monthlyData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => money(value)}
                      />
                      <Bar
                        dataKey="amount"
                        name="Amount"
                        fill="#2563EB"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="director-empty">
                    No dated vouchers available for the chart.
                  </div>
                )}
              </div>
            </article>

            <article className="director-panel">
              <h2>Voucher Status</h2>
              <p>Current pending and processed distribution</p>

              <div className="director-chart">
                {statusData.some((item) => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData.filter(
                          (item) => item.value > 0
                        )}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {statusData
                          .filter((item) => item.value > 0)
                          .map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={
                                entry.name === "Pending"
                                  ? chartColors[0]
                                  : entry.name === "Approved"
                                  ? chartColors[1]
                                  : chartColors[2]
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="director-empty">
                    No voucher status data available.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="director-panel" id="pending-vouchers">
            <div className="director-panel-heading">
              <div>
                <h2>Pending Vouchers</h2>
                <p>Review the bill and make an approval decision.</p>
              </div>

              <input
                type="search"
                placeholder="Search voucher or department..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search vouchers"
              />
            </div>

            <div className="director-signature">
              <label htmlFor="director-signature-path">
                Director signature path
              </label>

              <input
                id="director-signature-path"
                value={signaturePath}
                onChange={(event) =>
                  setSignaturePath(event.target.value)
                }
                placeholder="Enter the uploaded signature path"
              />

              <small>
                Enter a valid path created by your secure
                signature-upload workflow.
              </small>
            </div>

            {loading ? (
              <div className="director-empty">
                Loading vouchers...
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="director-empty">
                No pending vouchers found.
              </div>
            ) : (
              <div className="director-table-wrap">
                <table className="director-table">
                  <thead>
                    <tr>
                      <th>Voucher</th>
                      <th>Date</th>
                      <th>Department</th>
                      <th>Expense</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Bill</th>
                      <th>Decision</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPending.map((voucher) => (
                      <tr key={voucher.id}>
                        <td className="director-voucher-number">
                          {voucher.voucherNumber || `#${voucher.id}`}
                        </td>

                        <td>
                          {voucher.voucherDate
                            ? String(voucher.voucherDate).slice(0, 10)
                            : "—"}
                        </td>

                        <td>{voucher.departmentName || "—"}</td>
                        <td>{voucher.expenseTitle || "—"}</td>
                        <td>{voucher.expenseCategory || "—"}</td>

                        <td className="director-amount">
                          {money(voucher.amount)}
                        </td>

                        <td>
                          {voucher.billPhoto ? (
                            <button
                              className="director-view-bill"
                              onClick={() => openBill(voucher)}
                            >
                              View bill
                            </button>
                          ) : (
                            <span className="director-no-bill">
                              No bill
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="director-actions">
                            <button
                              className="director-approve"
                              disabled={busyId !== null}
                              onClick={() => approveVoucher(voucher)}
                            >
                              {busyId === voucher.id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              className="director-reject"
                              disabled={busyId !== null}
                              onClick={() => {
                                setRejectingId(voucher.id);
                                setRejectionReason("");
                              }}
                            >
                              Reject
                            </button>
                          </div>

                          {rejectingId === voucher.id && (
                            <div className="director-rejection-form">
                              <textarea
                                value={rejectionReason}
                                onChange={(event) =>
                                  setRejectionReason(event.target.value)
                                }
                                placeholder="Reason for rejection..."
                                rows={3}
                                aria-label="Reason for rejection"
                              />

                              <div>
                                <button
                                  className="director-reject"
                                  disabled={busyId !== null}
                                  onClick={() => rejectVoucher(voucher)}
                                >
                                  Confirm rejection
                                </button>

                                <button
                                  className="director-cancel"
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectionReason("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            className="director-panel"
            id="processed-vouchers"
          >
            <div className="director-panel-heading">
              <div>
                <h2>Processed Vouchers</h2>
                <p>
                  Review previously approved and rejected vouchers.
                </p>
              </div>

              <select
                value={processedFilter}
                onChange={(event) =>
                  setProcessedFilter(event.target.value)
                }
                aria-label="Filter processed vouchers"
              >
                <option value="ALL">All processed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="director-empty">
                Loading processed vouchers...
              </div>
            ) : filteredProcessed.length === 0 ? (
              <div className="director-empty">
                No processed vouchers match your filter.
              </div>
            ) : (
              <div className="director-table-wrap">
                <table className="director-table">
                  <thead>
                    <tr>
                      <th>Voucher</th>
                      <th>Date</th>
                      <th>Department</th>
                      <th>Expense</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Bill</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProcessed.map((voucher) => (
                      <tr key={voucher.id}>
                        <td className="director-voucher-number">
                          {voucher.voucherNumber || `#${voucher.id}`}
                        </td>

                        <td>
                          {voucher.voucherDate
                            ? String(voucher.voucherDate).slice(0, 10)
                            : "—"}
                        </td>

                        <td>{voucher.departmentName || "—"}</td>
                        <td>{voucher.expenseTitle || "—"}</td>

                        <td className="director-amount">
                          {money(voucher.amount)}
                        </td>

                        <td>
                          <span
                            className={`director-status director-status-${String(
                              voucher.status || ""
                            ).toLowerCase()}`}
                          >
                            {formatStatus(voucher.status)}
                          </span>
                        </td>

                        <td>
                          {voucher.billPhoto ? (
                            <button
                              className="director-view-bill"
                              onClick={() => openBill(voucher)}
                            >
                              View bill
                            </button>
                          ) : (
                            <span className="director-no-bill">
                              No bill
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="director-panel director-ai-panel">
            <div>
              <span className="director-eyebrow">
                AI ASSISTANT
              </span>

              <h2>Expense Intelligence</h2>

              <p>
                Review the current figures and identify areas that may
                need attention.
              </p>
            </div>

            <div className="director-ai-insights">
              <article>
                <strong>Pending review</strong>
                <p>
                  {pending.length
                    ? `${pending.length} voucher(s), totalling ${money(
                        totalPendingAmount
                      )}, are awaiting a decision.`
                    : "There are currently no pending vouchers."}
                </p>
              </article>

              <article>
                <strong>Processed outcomes</strong>
                <p>
                  {approvedVouchers.length} approved and{" "}
                  {rejectedVouchers.length} rejected vouchers are
                  currently available in the processed list.
                </p>
              </article>

              <article>
                <strong>Suggested action</strong>
                <p>
                  Review high-value pending claims and verify their
                  supporting bills before making a decision.
                </p>
              </article>
            </div>

            <small className="director-ai-disclaimer">
              These are rule-based summaries, not LLM-generated or
              autonomous agent decisions.
            </small>
          </section>

          <footer className="director-footer">
            <span>© 2026 Expense Voucher Management System</span>
            <span>Director Dashboard · Analytics</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
