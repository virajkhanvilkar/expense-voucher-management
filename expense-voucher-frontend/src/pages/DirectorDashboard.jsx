
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./DirectorDashboard.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

export default function DirectorDashboard() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [signaturePath, setSignaturePath] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Store the actual Director user ID during login.
  const directorId =
    localStorage.getItem("directorId") ||
    localStorage.getItem("userId");

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/director/pending");
      setVouchers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load pending vouchers:", err);
      setError(
        err.response?.status === 401
          ? "Session expired. Please log in again."
          : err.response?.status === 403
          ? "Access denied. Please log in as Director."
          : "Could not load pending vouchers. Check the backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const visibleVouchers = vouchers.filter((v) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [
      v.voucherNumber,
      v.expenseTitle,
      v.departmentName,
      v.expenseCategory,
      v.expenseDescription,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const totalPendingAmount = vouchers.reduce(
    (sum, v) => sum + Number(v.amount || 0),
    0
  );

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
        response.headers["content-type"] || response.data.type;

      if (
        !type ||
        !(type.startsWith("image/") || type === "application/pdf")
      ) {
        throw new Error("The server did not return an image or PDF.");
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
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      console.error("Bill viewing failed:", err);
      alert(
        err.response?.status === 403
          ? "You are not authorized to view this bill."
          : "Unable to open the bill. Verify that the file exists."
      );
    }
  };

  const approveVoucher = async (voucher) => {
    if (!directorId) {
      alert(
        "Director ID is missing. Store the logged-in Director's database ID in localStorage as directorId."
      );
      return;
    }

    if (!signaturePath.trim()) {
      alert("Enter the uploaded Director signature path first.");
      return;
    }

    const confirmed = window.confirm(
      `Approve voucher ${voucher.voucherNumber || `#${voucher.id}`}?`
    );

    if (!confirmed) return;

    try {
      setBusyId(voucher.id);
      await api.post(
        `/director/approve/${directorId}/${voucher.id}`,
        { directorSignaturePath: signaturePath.trim() }
      );

      alert("Voucher approved successfully.");
      setSignaturePath("");
      await loadVouchers();
    } catch (err) {
      console.error("Approval failed:", err);
      alert(
        err.response?.data?.message ||
        "Approval failed. Verify the Director ID, signature path, and backend logs."
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
        `Reject voucher ${voucher.voucherNumber || `#${voucher.id}`}?`
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

      alert("Voucher rejected successfully.");
      setRejectingId(null);
      setRejectionReason("");
      await loadVouchers();
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

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
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

        <nav className="director-nav">
          <a className="director-nav-active" href="#director-dashboard">
            ▦ <span>Dashboard</span>
          </a>
          <a href="#pending-vouchers">
            ▤ <span>Pending Vouchers</span>
          </a>
        </nav>

        <button className="director-logout" onClick={logout}>
          ↪ <span>Logout</span>
        </button>
      </aside>

      <main className="director-main" id="director-dashboard">
        <header className="director-topbar">
          <span>Administration / Voucher Approval</span>
          <div className="director-user">
            <span className="director-avatar">D</span>
            <span>
              <strong>Director</strong>
              <small>APPROVAL AUTHORITY</small>
            </span>
          </div>
        </header>

        <div className="director-content">
          <section className="director-heading">
            <div>
              <span className="director-eyebrow">OVERVIEW</span>
              <h1>Director Dashboard</h1>
              <p>Review expense claims and manage voucher approvals.</p>
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
              <strong>{vouchers.length}</strong>
              <small>Awaiting your decision</small>
            </article>
            <article>
              <span>Pending Amount</span>
              <strong>{money(totalPendingAmount)}</strong>
              <small>Total amount for review</small>
            </article>
            <article>
              <span>Bill Attachments</span>
              <strong>
                {vouchers.filter((v) => Boolean(v.billPhoto)).length}
              </strong>
              <small>Vouchers with uploaded bills</small>
            </article>
          </section>

          <section className="director-panel" id="pending-vouchers">
            <div className="director-panel-heading">
              <div>
                <h2>Pending Vouchers</h2>
                <p>Review the supporting bill before making a decision.</p>
              </div>

              <input
                type="search"
                placeholder="Search voucher or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search pending vouchers"
              />
            </div>

            <div className="director-signature">
              <label htmlFor="director-signature-path">
                Director signature path
              </label>
              <input
                id="director-signature-path"
                value={signaturePath}
                onChange={(e) => setSignaturePath(e.target.value)}
                placeholder="Enter the uploaded signature path"
              />
              <small>
                Upload the signature through a secure upload endpoint first.
                This field stores the path, not the signature image itself.
              </small>
            </div>

            {loading ? (
              <div className="director-empty">Loading pending vouchers...</div>
            ) : visibleVouchers.length === 0 ? (
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
                    {visibleVouchers.map((v) => (
                      <tr key={v.id}>
                        <td className="director-voucher-number">
                          {v.voucherNumber || `#${v.id}`}
                        </td>
                        <td>{v.voucherDate ? String(v.voucherDate).slice(0, 10) : "—"}</td>
                        <td>{v.departmentName || "—"}</td>
                        <td>{v.expenseTitle || "—"}</td>
                        <td>{v.expenseCategory || "—"}</td>
                        <td className="director-amount">{money(v.amount)}</td>
                        <td>
                          {v.billPhoto ? (
                            <button
                              className="director-view-bill"
                              onClick={() => openBill(v)}
                            >
                              ↗ View bill
                            </button>
                          ) : (
                            <span className="director-no-bill">No bill</span>
                          )}
                        </td>
                        <td>
                          <div className="director-actions">
                            <button
                              className="director-approve"
                              disabled={busyId !== null}
                              onClick={() => approveVoucher(v)}
                            >
                              {busyId === v.id ? "Processing..." : "Approve"}
                            </button>
                            <button
                              className="director-reject"
                              disabled={busyId !== null}
                              onClick={() => {
                                setRejectingId(v.id);
                                setRejectionReason("");
                              }}
                            >
                              Reject
                            </button>
                          </div>

                          {rejectingId === v.id && (
                            <div className="director-rejection-form">
                              <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                rows={3}
                              />
                              <div>
                                <button
                                  className="director-reject"
                                  disabled={busyId !== null}
                                  onClick={() => rejectVoucher(v)}
                                >
                                  Confirm rejection
                                </button>
                                <button
                                  className="director-cancel"
                                  onClick={() => setRejectingId(null)}
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

          <footer className="director-footer">
            © 2026 Expense Voucher Management System
            <span>Director Dashboard · Version 1.0</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
