
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./AccountsDashboard.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) =>
  value ? String(value).slice(0, 10) : "—";

export default function AccountsDashboard() {
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

  const pageSize = 8;

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/accounts/vouchers");

      setVouchers(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Failed to load Accounts vouchers:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Please log in with an Accounts account.");
      } else {
        setError("Unable to load vouchers. Check the backend and retry.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const departments = useMemo(
    () =>
      [...new Set(
        vouchers.map((v) => v.departmentName).filter(Boolean)
      )].sort(),
    [vouchers]
  );

  const categories = useMemo(
    () =>
      [...new Set(
        vouchers.map((v) => v.expenseCategory).filter(Boolean)
      )].sort(),
    [vouchers]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return vouchers.filter((v) => {
      const searchable = [
        v.voucherNumber,
        v.expenseTitle,
        v.departmentName,
        v.expenseCategory,
        v.expenseDescription,
      ]
        .join(" ")
        .toLowerCase();

      const voucherDate = dateText(v.voucherDate);

      return (
        (!term || searchable.includes(term)) &&
        (status === "ALL" || v.status === status) &&
        (department === "ALL" || v.departmentName === department) &&
        (category === "ALL" || v.expenseCategory === category) &&
        (!fromDate ||
          (voucherDate !== "—" && voucherDate >= fromDate)) &&
        (!toDate ||
          (voucherDate !== "—" && voucherDate <= toDate))
      );
    });
  }, [
    vouchers,
    search,
    status,
    department,
    category,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    setPage(1);
  }, [search, status, department, category, fromDate, toDate]);

  const approved = vouchers.filter(
    (v) => v.status === "APPROVED"
  );

  const pending = vouchers.filter(
    (v) => v.status === "PENDING_APPROVAL"
  );

  const rejected = vouchers.filter(
    (v) => v.status === "REJECTED"
  );

  const approvedTotal = approved.reduce(
    (total, v) => total + Number(v.amount || 0),
    0
  );

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const pageRows = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Download a CSV containing the currently filtered records.
  const exportCSV = () => {
    const columns = [
      ["Voucher Number", "voucherNumber"],
      ["Voucher Date", "voucherDate"],
      ["Department", "departmentName"],
      ["Expense Title", "expenseTitle"],
      ["Category", "expenseCategory"],
      ["Amount", "amount"],
      ["Status", "status"],
    ];

    const quote = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      columns.map(([label]) => quote(label)).join(","),
      ...filtered.map((v) =>
        columns.map(([, key]) => quote(v[key])).join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "accounts-vouchers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  // Use Axios so the JWT Authorization header is included.
  const openBill = async (voucher) => {
    if (voucher.status !== "APPROVED") {
      alert("Accounts can view bills only for approved vouchers.");
      return;
    }

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

      const contentType =
        response.headers["content-type"] || response.data.type;

      if (
        !contentType ||
        !(
          contentType.startsWith("image/") ||
          contentType === "application/pdf"
        )
      ) {
        throw new Error("The server did not return an image or PDF.");
      }

      const blob = new Blob([response.data], {
        type: contentType,
      });

      fileUrl = URL.createObjectURL(blob);

      const tab = window.open(fileUrl, "_blank");

      if (!tab) {
        URL.revokeObjectURL(fileUrl);
        alert("Allow pop-ups in your browser to view the bill.");
        return;
      }

      tab.opener = null;

      // Give the new tab time to load the document.
      window.setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (err) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);

      console.error("Unable to open bill:", err);

      if (err.response?.status === 403) {
        alert("You are not permitted to view this voucher's bill.");
      } else if (err.response?.status === 404) {
        alert("The bill file was not found on the server.");
      } else {
        alert("Could not open the bill. Check the backend and file path.");
      }
    }
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="accounts-app">
      <aside className="accounts-sidebar">
        <div className="accounts-brand">
          <span className="brand-mark">EV</span>
          <span>
            EXPENSE VOUCHER
            <small>MANAGEMENT</small>
          </span>
        </div>

        <nav className="accounts-nav">
          <a href="#dashboard" className="nav-link active">
            ▦ <span>Dashboard</span>
          </a>
          <a href="#voucher-records" className="nav-link">
            ▤ <span>Vouchers</span>
          </a>
          <a href="#voucher-records" className="nav-link">
            ▥ <span>Reports</span>
          </a>
        </nav>

        <button className="sidebar-logout" onClick={logout}>
          ↪ <span>Logout</span>
        </button>
      </aside>

      <main className="accounts-main" id="dashboard">
        <header className="accounts-topbar">
          <span className="topbar-caption">
            Finance &amp; Administration
          </span>

          <div className="accounts-user">
            <span className="user-avatar">A</span>
            <span>
              <strong>Accounts User</strong>
              <small>ACCOUNTS</small>
            </span>
          </div>
        </header>

        <div className="accounts-content">
          <section className="accounts-heading">
            <div>
              <span className="section-eyebrow">OVERVIEW</span>
              <h1>Accounts Dashboard</h1>
              <p>
                Monitor voucher records, approvals, and expenses.
              </p>
            </div>

            <button
              className="button-secondary"
              onClick={loadVouchers}
              disabled={loading}
            >
              ↻ {loading ? "Refreshing..." : "Refresh"}
            </button>
          </section>

          {error && (
            <div className="accounts-alert" role="alert">
              <span>{error}</span>
              <button onClick={loadVouchers}>Try again</button>
            </div>
          )}

          <section className="accounts-metrics">
            <article className="metric-card metric-blue">
              <div className="metric-icon">▤</div>
              <div>
                <span>Total Vouchers</span>
                <strong>{vouchers.length}</strong>
                <small>All retrieved records</small>
              </div>
            </article>

            <article className="metric-card metric-green">
              <div className="metric-icon">✓</div>
              <div>
                <span>Approved Vouchers</span>
                <strong>{approved.length}</strong>
                <small>Successfully approved</small>
              </div>
            </article>

            <article className="metric-card metric-orange">
              <div className="metric-icon">◷</div>
              <div>
                <span>Pending Vouchers</span>
                <strong>{pending.length}</strong>
                <small>Awaiting approval</small>
              </div>
            </article>

            <article className="metric-card metric-red">
              <div className="metric-icon">×</div>
              <div>
                <span>Rejected Vouchers</span>
                <strong>{rejected.length}</strong>
                <small>Rejected by Director</small>
              </div>
            </article>

            <article className="metric-card metric-purple">
              <div className="metric-icon">₹</div>
              <div>
                <span>Approved Amount</span>
                <strong>{money(approvedTotal)}</strong>
                <small>Approved voucher total</small>
              </div>
            </article>
          </section>

          <section className="accounts-panel" id="voucher-records">
            <div className="panel-heading">
              <div>
                <h2>Voucher Records</h2>
                <p>Search, filter, and export voucher information.</p>
              </div>

              <button
                className="button-primary"
                onClick={exportCSV}
                disabled={!filtered.length}
              >
                ↓ Export CSV
              </button>
            </div>

            <div className="accounts-filters">
              <input
                aria-label="Search vouchers"
                placeholder="⌕ Search voucher, title, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                aria-label="Filter by department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="ALL">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="ALL">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="date-filter">
                <input
                  aria-label="From date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <input
                  aria-label="To date"
                  type="date"
                  min={fromDate || undefined}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="accounts-empty">
                Loading voucher records...
              </div>
            ) : pageRows.length === 0 ? (
              <div className="accounts-empty">
                No vouchers match your filters.
              </div>
            ) : (
              <div className="accounts-table-wrap">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Voucher No.</th>
                      <th>Date</th>
                      <th>Department</th>
                      <th>Expense Title</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Bill</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.map((v, index) => (
                      <tr key={v.id}>
                        <td>{(page - 1) * pageSize + index + 1}</td>
                        <td className="voucher-number">
                          {v.voucherNumber || `#${v.id}`}
                        </td>
                        <td>{dateText(v.voucherDate)}</td>
                        <td>{v.departmentName || "—"}</td>
                        <td>{v.expenseTitle || "—"}</td>
                        <td>{v.expenseCategory || "—"}</td>
                        <td className="amount-cell">
                          {money(v.amount)}
                        </td>
                        <td>
                          <span
                            className={`status-pill status-${String(
                              v.status || "UNKNOWN"
                            ).toLowerCase()}`}
                          >
                            {String(v.status || "UNKNOWN").replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                        </td>
                        <td>
                          {!v.billPhoto ? (
                            <span className="bill-missing">No bill</span>
                          ) : v.status === "APPROVED" ? (
                            <button
                              className="bill-view-button"
                              onClick={() => openBill(v)}
                            >
                              ↗ View bill
                            </button>
                          ) : (
                            <span
                              className="bill-missing"
                              title="Bill viewing is available to Accounts after approval."
                            >
                              Available after approval
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <footer className="table-footer">
              <span>
                Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}
                –{Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length} vouchers
              </span>

              <div className="pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <span>{page} / {pageCount}</span>
                <button
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </footer>
          </section>

          <footer className="accounts-footer">
            <span>© 2026 Expense Voucher Management System</span>
            <span>Accounts Dashboard · Version 1.0</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
