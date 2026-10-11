import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AccountsDashboard.css";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const dateText = (value) => value ? String(value).slice(0, 10) : "—";

export default function AccountsDashboard() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [profileOpen, setProfileOpen] = useState(false);
  const pageSize = 8;

  const username = localStorage.getItem("username") || "Accounts User";
  const avatar = username.trim().charAt(0).toUpperCase() || "A";

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/accounts/vouchers");
      setVouchers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load Accounts vouchers:", err);
      setError(err.response?.status === 401
        ? "Your session has expired. Please log in again."
        : err.response?.status === 403
          ? "Access denied. Please log in with an Accounts account."
          : "Unable to load vouchers. Check the backend and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);
  useEffect(() => { setPage(1); }, [search, status, department, category, fromDate, toDate]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const departments = useMemo(
    () => [...new Set(vouchers.map((v) => v.departmentName).filter(Boolean))].sort(),
    [vouchers]
  );
  const categories = useMemo(
    () => [...new Set(vouchers.map((v) => v.expenseCategory).filter(Boolean))].sort(),
    [vouchers]
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      const searchable = [
        v.voucherNumber, v.expenseTitle, v.departmentName, v.expenseCategory, v.expenseDescription,
      ].join(" ").toLowerCase();
      const date = dateText(v.voucherDate);
      return (!term || searchable.includes(term))
        && (status === "ALL" || v.status === status)
        && (department === "ALL" || v.departmentName === department)
        && (category === "ALL" || v.expenseCategory === category)
        && (!fromDate || (date !== "—" && date >= fromDate))
        && (!toDate || (date !== "—" && date <= toDate));
    });
  }, [vouchers, search, status, department, category, fromDate, toDate]);

  const approved = vouchers.filter((v) => v.status === "APPROVED");
  const pending = vouchers.filter((v) => ["PENDING_APPROVAL", "PENDING"].includes(v.status));
  const rejected = vouchers.filter((v) => v.status === "REJECTED");
  const approvedTotal = approved.reduce((sum, v) => sum + Number(v.amount || 0), 0);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCSV = () => {
    const columns = [
      ["Voucher Number", "voucherNumber"], ["Voucher Date", "voucherDate"],
      ["Department", "departmentName"], ["Expense Title", "expenseTitle"],
      ["Category", "expenseCategory"], ["Amount", "amount"], ["Status", "status"],
    ];
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      columns.map(([label]) => quote(label)).join(","),
      ...filtered.map((v) => columns.map(([, key]) => quote(v[key])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "accounts-vouchers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const openBill = async (voucher) => {
    if (voucher.status !== "APPROVED") return alert("Accounts can view bills only for approved vouchers.");
    if (!voucher.billPhoto) return alert("No bill has been uploaded for this voucher.");

    let fileUrl;
    try {
      const response = await api.get(`/vouchers/${voucher.id}/bill`, { responseType: "blob" });
      const type = response.headers["content-type"] || response.data.type;
      if (!type || !(type.startsWith("image/") || type === "application/pdf")) {
        throw new Error("Unexpected file type");
      }
      fileUrl = URL.createObjectURL(new Blob([response.data], { type }));
      const tab = window.open(fileUrl, "_blank");
      if (!tab) {
        URL.revokeObjectURL(fileUrl);
        return alert("Allow pop-ups in your browser to view the bill.");
      }
      tab.opener = null;
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      console.error("Unable to open bill:", err);
      alert(err.response?.status === 403
        ? "You are not permitted to view this voucher's bill."
        : err.response?.status === 404
          ? "The bill file was not found on the server."
          : "Could not open the bill. Check the backend and file path.");
    }
  };

  const logout = () => {
    ["token", "userId", "username", "role", "accountsId", "employeeId", "directorId"]
      .forEach((key) => localStorage.removeItem(key));
    navigate("/", { replace: true });
  };

  return (
    <div className="accounts-app">
      <aside className="accounts-sidebar">
        <div className="accounts-brand">
          <span className="brand-mark">EV</span>
          <span className="brand-copy">EXPENSE VOUCHER<small>MANAGEMENT</small></span>
        </div>
        <nav className="accounts-nav" aria-label="Accounts navigation">
          <a href="#dashboard" className="nav-link active"><span className="nav-icon">▦</span><span>Dashboard</span></a>
          <a href="#voucher-records" className="nav-link"><span className="nav-icon">▤</span><span>Vouchers</span></a>
          <a href="#voucher-records" className="nav-link"><span className="nav-icon">▥</span><span>Reports</span></a>
        </nav>
        <button type="button" className="sidebar-logout" onClick={logout}><span className="nav-icon">↪</span><span>Logout</span></button>
      </aside>

      <main className="accounts-main" id="dashboard">
        <header className="accounts-topbar">
          <span className="topbar-caption">Finance &amp; Administration</span>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="accounts-user"
              onClick={() => setProfileOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              style={{ border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}
            >
              <span className="user-avatar">{avatar}</span>
              <span><strong>{username}</strong><small>ACCOUNTS</small></span>
              <span aria-hidden="true">⌄</span>
            </button>
            {profileOpen && (
              <div role="menu" style={{
                position: "absolute", right: 0, top: "calc(100% + 10px)", zIndex: 20,
                width: 220, padding: 8, background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 12, boxShadow: "0 14px 35px rgba(15, 23, 42, .16)",
              }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid #edf0f5", marginBottom: 5 }}>
                  <strong style={{ display: "block", color: "#17365d" }}>{username}</strong>
                  <small style={{ color: "#64748b" }}>Accounts account</small>
                </div>
                <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                  style={menuButtonStyle}>✎ Update Profile</button>
                <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                  style={menuButtonStyle}>🔒 Change Password</button>
                <button type="button" role="menuitem" onClick={logout} style={{ ...menuButtonStyle, color: "#b42318" }}>↪ Sign Out</button>
              </div>
            )}
          </div>
        </header>

        <div className="accounts-content">
          <section className="accounts-heading">
            <div><span className="section-eyebrow">OVERVIEW</span><h1>Accounts Dashboard</h1><p>Monitor voucher records, approvals, and expenses.</p></div>
            <button type="button" className="button-secondary" onClick={loadVouchers} disabled={loading}>↻ {loading ? "Refreshing..." : "Refresh"}</button>
          </section>

          {error && <div className="accounts-alert" role="alert"><span>{error}</span><button type="button" onClick={loadVouchers}>Try again</button></div>}

          <section className="accounts-metrics" aria-label="Voucher summary">
            <article className="metric-card metric-blue"><div className="metric-icon">▤</div><div><span>Total Vouchers</span><strong>{vouchers.length}</strong><small>All retrieved records</small></div></article>
            <article className="metric-card metric-green"><div className="metric-icon">✓</div><div><span>Approved Vouchers</span><strong>{approved.length}</strong><small>Successfully approved</small></div></article>
            <article className="metric-card metric-orange"><div className="metric-icon">◷</div><div><span>Pending Vouchers</span><strong>{pending.length}</strong><small>Awaiting approval</small></div></article>
            <article className="metric-card metric-red"><div className="metric-icon">×</div><div><span>Rejected Vouchers</span><strong>{rejected.length}</strong><small>Rejected by Director</small></div></article>
            <article className="metric-card metric-purple"><div className="metric-icon">₹</div><div><span>Approved Amount</span><strong>{money(approvedTotal)}</strong><small>Approved voucher total</small></div></article>
          </section>

          <section className="accounts-panel" id="voucher-records">
            <div className="panel-heading">
              <div><h2>Voucher Records</h2><p>Search, filter, and export voucher information.</p></div>
              <button type="button" className="button-primary" onClick={exportCSV} disabled={!filtered.length}>↓ Export CSV</button>
            </div>

            <div className="accounts-filters">
              <input aria-label="Search vouchers" placeholder="⌕ Search voucher, title, department..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending approval</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
              </select>
              <select aria-label="Filter by department" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="ALL">All departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="ALL">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="date-filter">
                <input aria-label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input aria-label="To date" type="date" min={fromDate || undefined} value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>

            {loading ? <div className="accounts-empty">Loading voucher records...</div>
              : pageRows.length === 0 ? <div className="accounts-empty">No vouchers match your filters.</div>
                : <div className="accounts-table-wrap"><table className="accounts-table">
                  <thead><tr><th>#</th><th>Voucher No.</th><th>Date</th><th>Department</th><th>Expense Title</th><th>Category</th><th>Amount</th><th>Status</th><th>Bill</th></tr></thead>
                  <tbody>{pageRows.map((v, index) => <tr key={v.id ?? v.voucherNumber}>
                    <td>{(page - 1) * pageSize + index + 1}</td><td className="voucher-number">{v.voucherNumber || `#${v.id}`}</td>
                    <td>{dateText(v.voucherDate)}</td><td>{v.departmentName || "—"}</td><td className="expense-title-cell">{v.expenseTitle || "—"}</td>
                    <td>{v.expenseCategory || "—"}</td><td className="amount-cell">{money(v.amount)}</td>
                    <td><span className={`status-pill status-${String(v.status || "unknown").toLowerCase()}`}>{String(v.status || "UNKNOWN").replaceAll("_", " ")}</span></td>
                    <td>{!v.billPhoto ? <span className="bill-missing">No bill</span> : v.status === "APPROVED"
                      ? <button type="button" className="bill-view-button" onClick={() => openBill(v)}>↗ View bill</button>
                      : <span className="bill-missing" title="Bill viewing is available after approval.">Available after approval</span>}</td>
                  </tr>)}</tbody>
                </table></div>}

            <footer className="table-footer">
              <span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} vouchers</span>
              <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">‹</button><span>{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Next page">›</button></div>
            </footer>
          </section>
          <footer className="accounts-footer"><span>© 2026 Expense Voucher Management System</span><span>Accounts Dashboard · Version 1.0</span></footer>
        </div>
      </main>
    </div>
  );
}

const menuButtonStyle = {
  display: "block",
  width: "100%",
  border: 0,
  background: "transparent",
  textAlign: "left",
  borderRadius: 8,
  padding: "11px 12px",
  cursor: "pointer",
  color: "#243b5a",
};
