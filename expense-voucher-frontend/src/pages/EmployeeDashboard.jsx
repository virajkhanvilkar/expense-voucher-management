import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./EmployeeDashboard.css";

const INITIAL_FORM = {
  expenseDate: "",
  departmentName: "",
  expenseTitle: "",
  expenseCategory: "Travel",
  expenseDescription: "",
  amount: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const prettyStatus = (status) =>
  String(status || "DRAFT").replaceAll("_", " ").toLowerCase();

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const employeeId = localStorage.getItem("employeeId") || "1";
  const username = localStorage.getItem("username") || "Employee";

  const [vouchers, setVouchers] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [billFile, setBillFile] = useState(null);
  const [billPhoto, setBillPhoto] = useState("");
  const [signaturePath, setSignaturePath] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeView, setActiveView] = useState("overview");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadVouchers = useCallback(async () => {
    try {
      const response = await api.get(`/vouchers/employee/${employeeId}`);
      setVouchers(Array.isArray(response.data) ? response.data : []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load vouchers. Check your login and backend."
      );
    } finally {
      setPageLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const counts = useMemo(() => {
    const count = (status) =>
      vouchers.filter((voucher) => voucher.status === status).length;
    const totalAmount = vouchers.reduce(
      (sum, voucher) => sum + Number(voucher.amount || 0),
      0
    );

    return {
      total: vouchers.length,
      drafts: count("DRAFT"),
      pending: count("PENDING_APPROVAL"),
      approved: count("APPROVED"),
      rejected: count("REJECTED"),
      totalAmount,
    };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vouchers.filter((voucher) => {
      const matchesStatus =
        statusFilter === "ALL" || voucher.status === statusFilter;
      const matchesSearch =
        !query ||
        [
          voucher.voucherNumber,
          voucher.expenseTitle,
          voucher.expenseCategory,
          voucher.departmentName,
          voucher.expenseDescription,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [vouchers, search, statusFilter]);

  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setBillFile(null);
    setBillPhoto("");
    setEditingId(null);
    const input = document.getElementById("billFile");
    if (input) input.value = "";
  };

  const selectBill = (event) => {
    const file = event.target.files?.[0] || null;
    setError("");
    setMessage("");

    if (file && !ALLOWED_TYPES.includes(file.type)) {
      setError("Choose a PDF, JPG, JPEG, or PNG bill.");
      event.target.value = "";
      setBillFile(null);
      return;
    }

    if (file && file.size > MAX_FILE_SIZE) {
      setError("The bill must be 5 MB or smaller.");
      event.target.value = "";
      setBillFile(null);
      return;
    }

    setBillFile(file);
  };

  const uploadBill = async () => {
    if (!billFile) return billPhoto;

    const formData = new FormData();
    formData.append("file", billFile);
    setUploadingBill(true);
    setError("");

    try {
      // Do not set Content-Type manually. Axios/browser must add the multipart boundary.
      const response = await api.post("/vouchers/upload-bill", formData, {
        headers: { "Content-Type": undefined },
      });

      const uploadedPath = response.data?.path;
      if (!uploadedPath) {
        throw new Error("The server did not return the uploaded bill path.");
      }

      setBillPhoto(uploadedPath);
      console.log("Bill uploaded successfully:", uploadedPath);
      return uploadedPath;
    } catch (err) {
      console.error(
        "Bill upload failed:",
        err.response?.status,
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        throw new Error("Your session has expired. Please log in again.");
      }
      if (err.response?.status === 403) {
        throw new Error(
          "Access denied when uploading the bill. Check the Spring Security logs."
        );
      }

      throw new Error(
        err.response?.data?.message || err.message || "Bill upload failed."
      );
    } finally {
      setUploadingBill(false);
    }
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const savedBillPhoto = await uploadBill();
      const payload = {
        ...form,
        amount: Number(form.amount),
        billPhoto: savedBillPhoto || null,
      };

      if (editingId) {
        await api.put(`/vouchers/draft/${employeeId}/${editingId}`, payload);
        setMessage("Your draft has been updated.");
      } else {
        await api.post(`/vouchers/draft/${employeeId}`, payload);
        setMessage("Your expense voucher has been saved as a draft.");
      }

      resetForm();
      await loadVouchers();
      setActiveView("vouchers");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save the draft. Check the backend logs."
      );
    } finally {
      setLoading(false);
    }
  };

  const editDraft = (voucher) => {
    setEditingId(voucher.id);
    setForm({
      expenseDate: voucher.expenseDate || "",
      departmentName: voucher.departmentName || "",
      expenseTitle: voucher.expenseTitle || "",
      expenseCategory: voucher.expenseCategory || "Travel",
      expenseDescription: voucher.expenseDescription || "",
      amount: voucher.amount ?? "",
    });
    setBillPhoto(voucher.billPhoto || "");
    setBillFile(null);

    const input = document.getElementById("billFile");
    if (input) input.value = "";
    setActiveView("create");
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteDraft = async (voucherId) => {
    if (!window.confirm("Delete this draft permanently?")) return;
    setError("");
    setMessage("");

    try {
      await api.delete(`/vouchers/draft/${employeeId}/${voucherId}`);
      setMessage("Draft deleted.");
      await loadVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete this draft.");
    }
  };

  const submitVoucher = async (voucherId) => {
    if (!signaturePath.trim()) {
      setError("Enter your employee signature path before submitting.");
      return;
    }

    setError("");
    setMessage("");

    try {
      // Existing endpoint retained. VoucherController must accept this body
      // and set employeeSignaturePath before calling voucherService.submitVoucher.
      await api.post(`/vouchers/submit/${employeeId}/${voucherId}`, {
        employeeSignaturePath: signaturePath.trim(),
      });
      setMessage("Voucher submitted for approval.");
      setSignaturePath("");
      await loadVouchers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit this voucher.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("employeeId");
    navigate("/");
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setMessage("");
    setActiveView("create");
  };

  return (
    <div className="evm-shell">
      <aside className="evm-sidebar">
        <div className="evm-brand">
          <div className="evm-brand-mark">P</div>
          <div>
            <strong>Prachay</strong>
            <span>Securities Pvt. Ltd.</span>
          </div>
        </div>

        <div className="evm-sidebar-label">WORKSPACE</div>
        <nav className="evm-nav" aria-label="Employee navigation">
          <button
            className={activeView === "overview" ? "active" : ""}
            onClick={() => setActiveView("overview")}
            type="button"
          >
            <span className="evm-nav-icon">▦</span> Overview
          </button>
          <button
            className={activeView === "vouchers" ? "active" : ""}
            onClick={() => setActiveView("vouchers")}
            type="button"
          >
            <span className="evm-nav-icon">▤</span> My vouchers
            <span className="evm-nav-count">{vouchers.length}</span>
          </button>
          <button
            className={activeView === "create" ? "active" : ""}
            onClick={openCreate}
            type="button"
          >
            <span className="evm-nav-icon">＋</span> Create voucher
          </button>
        </nav>

        <div className="evm-sidebar-bottom">
          <div className="evm-help-card">
            <div className="evm-help-icon">i</div>
            <strong>Need assistance?</strong>
            <p>Contact your accounts team for help with expense claims.</p>
          </div>
          <button className="evm-logout" type="button" onClick={logout}>
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>

      <div className="evm-main">
        <header className="evm-topbar">
          <div className="evm-breadcrumb">
            Workspace <span>/</span> Employee portal
          </div>
          <div className="evm-profile">
            <div className="evm-avatar">
              {username.trim().charAt(0).toUpperCase() || "E"}
            </div>
            <div className="evm-profile-copy">
              <strong>{username}</strong>
              <span>Employee account</span>
            </div>
            <span className="evm-profile-chevron">⌄</span>
          </div>
        </header>

        <main className="evm-content">
          <div className="evm-welcome-row">
            <div>
              <div className="evm-eyebrow">EMPLOYEE WORKSPACE</div>
              <h1>
                {activeView === "create"
                  ? editingId
                    ? "Edit expense voucher"
                    : "Create an expense voucher"
                  : activeView === "vouchers"
                    ? "My vouchers"
                    : "Good day, " + username}
              </h1>
              <p>
                {activeView === "create"
                  ? "Enter your expense details and attach the supporting bill."
                  : activeView === "vouchers"
                    ? "Review your expense claims and keep track of their progress."
                    : "Manage your expense claims and track approvals in one place."}
              </p>
            </div>
            {activeView !== "create" && (
              <button className="evm-primary-button" onClick={openCreate} type="button">
                <span>＋</span> New expense voucher
              </button>
            )}
          </div>

          {message && (
            <div className="evm-alert evm-alert-success" role="status">
              <span>✓</span> {message}
              <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button>
            </div>
          )}
          {error && (
            <div className="evm-alert evm-alert-error" role="alert">
              <span>!</span> {error}
              <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
            </div>
          )}

          {activeView === "create" && (
            <section className="evm-panel evm-form-panel">
              <div className="evm-panel-heading">
                <div>
                  <h2>{editingId ? "Update draft details" : "Expense details"}</h2>
                  <p>Fields marked with <b>*</b> are required.</p>
                </div>
                <span className="evm-draft-label"><span /> Saved as draft</span>
              </div>

              <form onSubmit={saveDraft}>
                <div className="evm-form-grid">
                  <div className="evm-field">
                    <label htmlFor="expenseTitle">Expense title <b>*</b></label>
                    <input id="expenseTitle" name="expenseTitle" value={form.expenseTitle} onChange={setField} placeholder="e.g. Client meeting travel" required maxLength={180} />
                  </div>
                  <div className="evm-field">
                    <label htmlFor="expenseCategory">Expense category <b>*</b></label>
                    <select id="expenseCategory" name="expenseCategory" value={form.expenseCategory} onChange={setField} required>
                      <option>Travel</option>
                      <option>Food</option>
                      <option>Accommodation</option>
                      <option>Office Supplies</option>
                      <option>Communication</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="evm-field">
                    <label htmlFor="expenseDate">Expense date <b>*</b></label>
                    <input id="expenseDate" name="expenseDate" type="date" value={form.expenseDate} onChange={setField} required />
                  </div>
                  <div className="evm-field">
                    <label htmlFor="departmentName">Department <b>*</b></label>
                    <input id="departmentName" name="departmentName" value={form.departmentName} onChange={setField} placeholder="e.g. Finance" required maxLength={120} />
                  </div>
                  <div className="evm-field">
                    <label htmlFor="amount">Claim amount (₹) <b>*</b></label>
                    <div className="evm-amount-input">
                      <span>₹</span>
                      <input id="amount" name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={setField} placeholder="0.00" required />
                    </div>
                  </div>
                  <div className="evm-field evm-field-wide">
                    <label htmlFor="expenseDescription">Expense description</label>
                    <textarea id="expenseDescription" name="expenseDescription" value={form.expenseDescription} onChange={setField} placeholder="Add a short explanation of the business expense..." rows={4} maxLength={2000} />
                    <span className="evm-field-hint">{form.expenseDescription.length}/2000 characters</span>
                  </div>
                  <div className="evm-field evm-field-wide">
                    <label>Supporting bill / receipt</label>
                    <label className="evm-upload-box" htmlFor="billFile">
                      <span className="evm-upload-icon">↑</span>
                      <span className="evm-upload-title">
                        {billFile ? billFile.name : "Click to upload or choose a file"}
                      </span>
                      <span className="evm-upload-subtitle">
                        PDF, JPG, JPEG or PNG · Maximum 5 MB
                      </span>
                      <input id="billFile" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={selectBill} />
                    </label>
                    {!billFile && billPhoto && (
                      <div className="evm-existing-file">
                        <span>✓</span> A bill is already attached to this draft.
                      </div>
                    )}
                  </div>
                </div>

                <div className="evm-form-footer">
                  <p>Your voucher remains a draft until you submit it for approval.</p>
                  <div className="evm-button-row">
                    <button type="button" className="evm-secondary-button" onClick={() => { resetForm(); setActiveView("vouchers"); }}>
                      Cancel
                    </button>
                    <button type="submit" className="evm-primary-button" disabled={loading || uploadingBill}>
                      {uploadingBill ? "Uploading bill…" : loading ? "Saving…" : editingId ? "Update draft" : "Save as draft"}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          )}

          {(activeView === "overview" || activeView === "vouchers") && (
            <>
              <section className="evm-stats-grid">
                <article className="evm-stat-card">
                  <div className="evm-stat-top"><span>Total vouchers</span><span className="evm-stat-icon icon-blue">▤</span></div>
                  <strong>{counts.total}</strong>
                  <small>All your expense claims</small>
                </article>
                <article className="evm-stat-card">
                  <div className="evm-stat-top"><span>Pending approval</span><span className="evm-stat-icon icon-amber">◷</span></div>
                  <strong>{counts.pending}</strong>
                  <small>Awaiting director review</small>
                </article>
                <article className="evm-stat-card">
                  <div className="evm-stat-top"><span>Approved</span><span className="evm-stat-icon icon-green">✓</span></div>
                  <strong>{counts.approved}</strong>
                  <small>Approved expense claims</small>
                </article>
                <article className="evm-stat-card">
                  <div className="evm-stat-top"><span>Drafts</span><span className="evm-stat-icon icon-purple">✎</span></div>
                  <strong>{counts.drafts}</strong>
                  <small>Not submitted yet</small>
                </article>
              </section>

              {activeView === "overview" && (
                <section className="evm-summary-banner">
                  <div className="evm-summary-symbol">₹</div>
                  <div className="evm-summary-copy">
                    <span>Total value of your vouchers</span>
                    <strong>{money(counts.totalAmount)}</strong>
                    <small>Combined amount across all voucher statuses</small>
                  </div>
                  <button type="button" className="evm-summary-link" onClick={() => setActiveView("vouchers")}>
                    View all vouchers <span>→</span>
                  </button>
                </section>
              )}

              <section className="evm-panel evm-vouchers-panel">
                <div className="evm-panel-heading evm-vouchers-heading">
                  <div>
                    <h2>{activeView === "overview" ? "Recent vouchers" : "All my vouchers"}</h2>
                    <p>{activeView === "overview" ? "A quick look at your latest expense claims." : "Search and filter your submitted and draft claims."}</p>
                  </div>
                  {activeView === "overview" && (
                    <button type="button" className="evm-text-button" onClick={() => setActiveView("vouchers")}>View all <span>→</span></button>
                  )}
                </div>

                <div className="evm-table-tools">
                  <div className="evm-search">
                    <span>⌕</span>
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vouchers..." aria-label="Search vouchers" />
                  </div>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                    <option value="ALL">All statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_APPROVAL">Pending approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {pageLoading ? (
                  <div className="evm-empty-state"><div className="evm-spinner" /><p>Loading your vouchers…</p></div>
                ) : filteredVouchers.length === 0 ? (
                  <div className="evm-empty-state">
                    <div className="evm-empty-icon">▤</div>
                    <h3>{vouchers.length ? "No matching vouchers" : "No vouchers yet"}</h3>
                    <p>{vouchers.length ? "Try changing your search or status filter." : "Create your first expense voucher to get started."}</p>
                    {!vouchers.length && <button type="button" className="evm-primary-button" onClick={openCreate}>＋ Create voucher</button>}
                  </div>
                ) : (
                  <div className="evm-table-scroll">
                    <table className="evm-table">
                      <thead>
                        <tr>
                          <th>Voucher details</th>
                          <th>Expense date</th>
                          <th>Amount</th>
                          <th>Bill</th>
                          <th>Status</th>
                          <th className="evm-action-column">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeView === "overview" ? filteredVouchers.slice(0, 5) : filteredVouchers).map((voucher) => (
                          <tr key={voucher.id}>
                            <td>
                              <div className="evm-voucher-name">{voucher.expenseTitle || "Untitled expense"}</div>
                              <div className="evm-voucher-meta">{voucher.voucherNumber || `Voucher #${voucher.id}`} · {voucher.expenseCategory || "Other"}</div>
                            </td>
                            <td>{voucher.expenseDate || "—"}</td>
                            <td className="evm-money-cell">{money(voucher.amount)}</td>
                            <td>
                              {voucher.billPhoto ? (
                                <span className="evm-bill-attached"><span>✓</span> Attached</span>
                              ) : (
                                <span className="evm-no-bill">Not attached</span>
                              )}
                            </td>
                            <td><span className={`evm-status status-${String(voucher.status || "DRAFT").toLowerCase()}`}>{prettyStatus(voucher.status)}</span></td>
                            <td>
                              {voucher.status === "DRAFT" ? (
                                <div className="evm-row-actions">
                                  <button type="button" onClick={() => editDraft(voucher)} title="Edit draft">Edit</button>
                                  <button type="button" className="evm-danger-text" onClick={() => deleteDraft(voucher.id)} title="Delete draft">Delete</button>
                                  <button type="button" className="evm-submit-row" onClick={() => { setSignaturePath(""); setError("Enter your signature path below to submit voucher " + (voucher.voucherNumber || `#${voucher.id}`) + "."); document.getElementById("signaturePath")?.focus(); }}>Submit</button>
                                </div>
                              ) : <span className="evm-dash">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {vouchers.some((voucher) => voucher.status === "DRAFT") && (
                  <div className="evm-signature-strip">
                    <div>
                      <strong>Ready to submit a draft?</strong>
                      <p>Enter your signature path, then submit a draft for director approval.</p>
                    </div>
                    <div className="evm-signature-controls">
                      <input id="signaturePath" value={signaturePath} onChange={(event) => setSignaturePath(event.target.value)} placeholder="Employee signature path (temporary)" />
                      <select id="submitVoucherId" defaultValue="" aria-label="Select draft to submit">
                        <option value="" disabled>Select draft…</option>
                        {vouchers.filter((voucher) => voucher.status === "DRAFT").map((voucher) => (
                          <option key={voucher.id} value={voucher.id}>{voucher.voucherNumber || `#${voucher.id}`} — {voucher.expenseTitle}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="evm-primary-button"
                        onClick={() => {
                          const selectedId = document.getElementById("submitVoucherId")?.value;
                          if (!selectedId) {
                            setError("Select a draft voucher to submit.");
                            return;
                          }
                          submitVoucher(selectedId);
                        }}
                      >
                        Submit for approval
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {counts.rejected > 0 && (
                <div className="evm-rejected-note">
                  <span>!</span>
                  You have {counts.rejected} rejected voucher{counts.rejected === 1 ? "" : "s"}. Review the director's feedback in your voucher details if your backend exposes it.
                </div>
              )}
            </>
          )}
          <footer className="evm-footer">
            <span>© {new Date().getFullYear()} Prachay Securities Private Limited</span>
            <span>Expense Voucher Management System</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
