import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, X, MoreVertical, Edit3, Trash2,
  User, Building2, ShieldCheck,
  Search, Plus, RefreshCw, Loader2,
  ArrowRight, AlertTriangle,
  Hash, Calendar, FileText, Receipt, BadgePercent,
  MapPin, Route, Users, Stethoscope,
  CheckCircle, Clock, XCircle
} from 'lucide-react';
import './StaffClaim.css';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://n8n.aimanhakimka.site/webhook-test/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

// ─── n8n API helper (matches EVisitor.js pattern) ──────────────────────────────
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'staff_claim', ...payload },
  };

  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`n8n error: ${res.status}`);
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const claimTypeOptions = ['Mileage', 'Meal', 'Entertainment', 'Medical'];
const gstOptions = ['No', 'Yes'];

const approvalStages = ['Superior', 'HOD', 'HR', 'Finance'];

const getInitial = (name = '') => (name || '?').charAt(0).toUpperCase();

const formatDateISO = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatDateDisplay = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

const getStatus = (c) => c?.status ?? c?.status_code ?? '';
const normalizeStatus = (s = '') => {
  const l = String(s || '').trim().toLowerCase();
  if (l.includes('reject')) return 'rejected';
  if (l.includes('approve')) return 'approved';
  if (l.includes('draft')) return 'draft';
  if (l.includes('pending')) return 'pending';
  return 'pending';
};

const statusLabel = (s = '') => {
  const n = normalizeStatus(s);
  if (n === 'approved') return 'Approved';
  if (n === 'rejected') return 'Rejected';
  if (n === 'draft') return 'Draft';
  return 'Pending';
};

const statusClass = (s = '') => {
  const n = normalizeStatus(s);
  if (n === 'approved') return 'approved';
  if (n === 'rejected') return 'rejected';
  if (n === 'draft') return 'draft';
  return 'pending';
};

const canEditOrDelete = (s = '') => {
  const n = normalizeStatus(s);
  return n === 'draft' || n === 'pending';
};

const getTimelineIndex = (claim) => {
  // Prefer backend-provided stage string if present (e.g. "HOD").
  const stage = String(claim?.approval_stage || '').trim();
  const idx = approvalStages.findIndex(s => s.toLowerCase() === stage.toLowerCase());
  if (idx >= 0) return idx;

  // Fallback heuristic based on status.
  const n = normalizeStatus(getStatus(claim));
  if (n === 'approved') return approvalStages.length - 1;
  if (n === 'rejected') return Math.min(2, approvalStages.length - 1); // usually rejected by HOD/HR
  return 0; // pending/draft starts at Superior
};

// 压缩图片并转为 base64（复用自 Ticketing）
const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // 去掉 data:image/jpeg;base64, 前缀，只保留纯 base64 字符串，方便 SQL 存储
        resolve(dataUrl.split(',')[1]);
      };
    };
    reader.onerror = error => reject(error);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const StaffClaim = ({ userInfo }) => {
  const navigate = useNavigate();
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const handleReceiptFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      return;
    }
    setReceiptFile(f);
    setReceiptPreviewUrl(URL.createObjectURL(f));
  };
  const employeeName = userInfo?.name || '';
  const employeeEmail = userInfo?.email || '';
  const employeeDept = userInfo?.department || userInfo?.dept || '—';
  const employeeRole = userInfo?.role || userInfo?.position || '—';

  // ── view state (required) ───────────────────────────────────────────────────
  const [view, setView] = useState('menu'); // menu | list | form | detail

  const [activeListTab, setActiveListTab] = useState('All');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── form state ─────────────────────────────────────────────────────────────
  const blankForm = {
    claim_id: null,
    claim_type: '',
    receipt_date: '', // ISO
    total_amount: '',
    gst_included: 'No',
    remarks: '',

    // Mileage
    start_point: '',
    end_point: '',
    total_km: '',
    tolls_amount: '',

    // Meal / Entertainment
    attendee_names: '',
    relationship_to_company: '',
    purpose: '',

    // Medical
    // (no extra fields; warning note shown)

    // Attachment placeholder
    receipt_file_name: '',
  };

  const [formData, setFormData] = useState(blankForm);
  const [receiptDate, setReceiptDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── calendar modal (pattern mirrored from EVisitor.js) ──────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const changeMonth = (offset) =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(<span key={`e-${i}`} className="day-empty" />);

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isSelected = receiptDate && formatDateISO(receiptDate) === formatDateISO(cellDate);

      days.push(
        <div
          key={d}
          className={`calendar-day${isSelected ? ' selected' : ''}`}
          onClick={() => setReceiptDate(cellDate)}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  // ── fetch claims ───────────────────────────────────────────────────────────
  const fetchClaims = useCallback(async () => {
    if (!employeeEmail) return;
    setLoading(true);
    setApiError('');
    try {
      // Adjust action string if your n8n expects a different name.
      const res = await callN8N('list_claims', {
        employee_email: employeeEmail,
        employee_name: employeeName,
      });

      const arr =
        (res?.data && Array.isArray(res.data) && res.data) ||
        (res?.result?.data && Array.isArray(res.result.data) && res.result.data) ||
        [];

      setClaims(arr);
    } catch {
      setApiError('Unable to load claims. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [employeeEmail, employeeName]);

  useEffect(() => {
    if (employeeEmail) fetchClaims();
  }, [employeeEmail]); // eslint-disable-line

  useEffect(() => {
    if (view === 'list') fetchClaims();
  }, [view]); // eslint-disable-line

  // ── navigation ─────────────────────────────────────────────────────────────
  const goTo = (v) => { setView(v); setApiError(''); setFormError(''); };

  const handleBack = () => {
    if (view === 'form' || view === 'list') { goTo('menu'); return; }
    if (view === 'detail') { goTo('list'); return; }
    navigate('/');
  };

  const openForm = (item = null) => {
    if (item) {
      setFormData({
        ...blankForm,
        claim_id: item.claim_id ?? item.id ?? null,
        claim_type: item.claim_type || item.type || '',
        receipt_date: item.receipt_date || item.date || '',
        total_amount: String(item.total_amount ?? item.amount ?? ''),
        gst_included: item.gst_included === true ? 'Yes' : (item.gst_included === false ? 'No' : (item.gst_included || 'No')),
        remarks: item.remarks || '',

        start_point: item.start_point || '',
        end_point: item.end_point || '',
        total_km: String(item.total_km ?? ''),
        tolls_amount: String(item.tolls_amount ?? item.tolls ?? ''),

        attendee_names: item.attendee_names || item.attendees || '',
        relationship_to_company: item.relationship_to_company || item.relationship || '',
        purpose: item.purpose || '',

        receipt_file_name: item.receipt_file_name || '',
      });

      setReceiptDate(item.receipt_date ? new Date(item.receipt_date) : null);
    } else {
      setFormData(blankForm);
      setReceiptDate(null);
    }

    setOpenMenuId(null);
    goTo('form');
  };

  // ── derived: list filtering / stats / recent ────────────────────────────────
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return claims.filter((c) => {
      const n = normalizeStatus(getStatus(c));
      const matchTab =
        activeListTab === 'Approved' ? n === 'approved' :
        activeListTab === 'Rejected' ? n === 'rejected' :
        activeListTab === 'Pending'  ? (n === 'pending' || n === 'draft') :
        true;

      const idStr = String(c.claim_id ?? c.id ?? '').toLowerCase();
      const typeStr = String(c.claim_type ?? c.type ?? '').toLowerCase();

      const matchSearch = !q || idStr.includes(q) || typeStr.includes(q);

      return matchTab && matchSearch;
    });
  }, [claims, activeListTab, searchQuery]);

  const stats = useMemo(() => {
    const total = claims.length;
    const approved = claims.filter(c => normalizeStatus(getStatus(c)) === 'approved').length;
    const rejected = claims.filter(c => normalizeStatus(getStatus(c)) === 'rejected').length;
    const pending = claims.filter(c => {
      const n = normalizeStatus(getStatus(c));
      return n === 'pending' || n === 'draft';
    }).length;

    return { total, pending, approved, rejected };
  }, [claims]);

  const recentClaims = useMemo(() => {
    const getSortKey = (c) => {
      const d = c.submitted_at || c.created_at || c.receipt_date || c.date;
      const t = d ? new Date(d).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    return [...claims]
      .sort((a, b) => getSortKey(b) - getSortKey(a))
      .slice(0, 3);
  }, [claims]);

  // ── validation rules (policy) ───────────────────────────────────────────────
  const validateReceiptDatePolicy = (d) => {
    if (!d) return 'Please select a Receipt Date.';
    const rd = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Compare by date (not time).
    const cutoff = new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), twoMonthsAgo.getDate());
    if (rd < cutoff) return 'Receipt date cannot be more than 2 months old (Staff Claims policy).';

    return '';
  };

  // ── submit (create / update) ───────────────────────────────────────────────
  const handleSubmit = async () => {
    const type = (formData.claim_type || '').trim();
    const amt = Number(formData.total_amount);

    if (!type || !receiptDate || !formData.total_amount) {
      setFormError('Please fill in all required fields and select a Receipt Date.');
      return;
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Total Amount must be a valid number greater than 0.');
      return;
    }

    if (type === 'Mileage') {
      if (!formData.start_point || !formData.end_point || !formData.total_km) {
        setFormError('Mileage claims require Start Point, End Point, and Total KM.');
        return;
      }
    }

    // Meal/Entertainment 两种 type 共用相同字段
    if (type === 'Meal' || type === 'Entertainment') {
      if (!formData.attendee_names || !formData.purpose) {
        setFormError(`${type} claims require Attendee Names and Purpose.`);
        return;
      }
    }

    setSubmitting(true);
    setFormError('');

    try {
      const isEdit = !!formData.claim_id;
      const action = isEdit ? 'update_claim' : 'submit_claim';

      // 先处理图片：压缩 + 转 base64（可选）
      let receiptBase64 = null;
      if (receiptFile) {
        try {
          receiptBase64 = await compressImage(receiptFile);
        } catch (err) {
          setFormError('Failed to process receipt image. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        employee_email: employeeEmail,
        employee_name: employeeName,

        claim_id: formData.claim_id || undefined,
        claim_type: type,
        receipt_date: formatDateISO(receiptDate),
        total_amount: Number(formData.total_amount),
        gst_included: formData.gst_included === 'Yes',
        remarks: formData.remarks,
        // 原来占位的文件名（如果你要保持，可以继续用）
        receipt_file_name: formData.receipt_file_name || undefined,
      };

      // 新增：把 base64 文本传给 n8n / SQL
      if (receiptBase64) {
        payload.receipt_photo = receiptBase64;
      }

      if (type === 'Mileage') {
        payload.start_point = formData.start_point;
        payload.end_point = formData.end_point;
        payload.total_km = Number(formData.total_km);
        payload.tolls_amount = formData.tolls_amount ? Number(formData.tolls_amount) : 0;
      }

      if (type === 'Meal' || type === 'Entertainment') {
        payload.attendee_names = formData.attendee_names;
        payload.relationship_to_company = formData.relationship_to_company;
        payload.purpose = formData.purpose;
      }

      const res = await callN8N(action, payload);
      const returned = res?.data || res?.result?.data;

      if (isEdit && returned) {
        const id = formData.claim_id;
        setClaims(prev =>
          prev.map(c =>
            String(c.claim_id ?? c.id) === String(id)
              ? { ...c, ...returned }
              : c
          )
        );
      } else {
        await fetchClaims();
      }

      setFormData(blankForm);
      setReceiptDate(null);
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      goTo('list');
    } catch {
      setFormError('Submission failed. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete claim ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedItem) return;

    const id = selectedItem.claim_id ?? selectedItem.id;
    if (!id) return;

    setDeleteLoading(true);
    try {
      // Adjust action string if needed.
      await callN8N('delete_claim', {
        employee_email: employeeEmail,
        employee_name: employeeName,
        claim_id: id,
      });

      setClaims(prev => prev.filter(c => String(c.claim_id ?? c.id) !== String(id)));
      if (view === 'detail') { setSelectedItem(null); goTo('list'); }
    } catch {
      // Optimistic removal to match the pattern used elsewhere in the app.
      setClaims(prev => prev.filter(c => String(c.claim_id ?? c.id) !== String(id)));
      if (view === 'detail') { setSelectedItem(null); goTo('list'); }
    } finally {
      setDeleteLoading(false);
      setDeleteModal(false);
    }
  };

  const navTitle = {
    menu: 'Staff Claims',
    list: 'My Claims',
    form: formData.claim_id ? 'Edit Claim' : 'Submit Claim',
    detail: 'Claim Detail',
  }[view] || 'Staff Claims';

  const gstHint = (() => {
    const gstYes = formData.gst_included === 'Yes';
    const amt = Number(formData.total_amount);
    if (!gstYes || !Number.isFinite(amt) || amt <= 0) return null;
    if (amt > 500) return { kind: 'warn', text: 'Full Tax Invoice with Company Name/Address is required.' };
    return { kind: 'info', text: 'Simplified Tax Invoice is acceptable.' };
  })();

  return (
    <div className="sc-root" onClick={() => setOpenMenuId(null)}>
      {/* ─── TOP NAV (same pattern) ─── */}
      <nav className="sc-nav">
        <button className="sc-nav-back" onClick={handleBack}>
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </button>

        <span className="sc-nav-title">{navTitle}</span>

        {view === 'menu' && employeeName && (
          <div className="sc-nav-badge">
            <User size={12} />
            <span>{employeeName.split(' ')[0]}</span>
          </div>
        )}

        {view === 'list' && (
          <button className="sc-nav-refresh" onClick={fetchClaims} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
        )}
      </nav>

      {/* ─── CONTENT ─── */}
      <div className="sc-content">
        {/* ══ MENU VIEW ══ */}
        {view === 'menu' && (
          <div className="sc-menu-view">
            <div className="sc-hero">
              <div className="sc-hero-orb sc-hero-orb1" />
              <div className="sc-hero-orb sc-hero-orb2" />
              <div className="sc-hero-inner">
                <div className="sc-hero-greeting">Welcome,</div>
                <div className="sc-hero-name">{employeeName || 'Employee'}</div>
                <div className="sc-hero-sub">
                  <span className="sc-hero-pill"><Building2 size={13} /> {employeeDept}</span>
                  <span className="sc-hero-pill"><ShieldCheck size={13} /> {employeeRole}</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="sc-stats-row">
              {loading ? (
                <div className="sc-stat-card" style={{ flex: 1, alignItems: 'center' }}>
                  <Loader2 size={20} className="spin" style={{ color: '#2b1d62' }} />
                </div>
              ) : (
                <>
                  <div className="sc-stat-card sc-stat-total">
                    <div className="sc-stat-val">{stats.total}</div>
                    <div className="sc-stat-lbl">Total Claims</div>
                  </div>
                  <div className="sc-stat-card sc-stat-pending">
                    <Clock size={16} />
                    <div className="sc-stat-val">{stats.pending}</div>
                    <div className="sc-stat-lbl">Pending</div>
                  </div>
                  <div className="sc-stat-card sc-stat-approved">
                    <CheckCircle size={16} />
                    <div className="sc-stat-val">{stats.approved}</div>
                    <div className="sc-stat-lbl">Approved</div>
                  </div>
                  <div className="sc-stat-card sc-stat-rejected">
                    <XCircle size={16} />
                    <div className="sc-stat-val">{stats.rejected}</div>
                    <div className="sc-stat-lbl">Rejected</div>
                  </div>
                </>
              )}
            </div>

            {/* Action Cards */}
            <div className="sc-action-row">
              <div className="sc-action-card sc-action-submit" onClick={() => openForm()}>
                <div className="sc-action-icon-wrap"><Receipt size={26} color="#fff" /></div>
                <div className="sc-action-text">
                  <div className="sc-action-title">Submit New Claim</div>
                  <div className="sc-action-sub">Medical, meal, mileage and more</div>
                </div>
                <ArrowRight size={18} color="rgba(255,255,255,0.7)" />
              </div>

              <div className="sc-action-card sc-action-list" onClick={() => goTo('list')}>
                <div className="sc-action-icon-wrap"><FileText size={26} color="#fff" /></div>
                <div className="sc-action-text">
                  <div className="sc-action-title">View My Claims</div>
                  <div className="sc-action-sub">Track approvals and outcomes</div>
                </div>
                <ArrowRight size={18} color="rgba(255,255,255,0.7)" />
              </div>
            </div>

            {/* Recent Claims */}
            <div className="sc-recent-section">
              <div className="sc-section-header">
                <span className="sc-section-title">Recent Claims</span>
                <button className="sc-see-all" onClick={() => goTo('list')}>See All</button>
              </div>

              {loading ? (
                <div className="sc-recent-loading">
                  <Loader2 size={18} className="spin" />
                  <span>Loading…</span>
                </div>
              ) : claims.length === 0 ? (
                <div className="sc-recent-empty">No claims submitted yet</div>
              ) : (
                recentClaims.map((item) => {
                  const id = item.claim_id ?? item.id ?? '—';
                  const t = item.claim_type ?? item.type ?? '—';
                  const st = statusClass(getStatus(item));
                  return (
                    <div
                      key={String(id)}
                      className="sc-recent-card"
                      onClick={() => { setSelectedItem(item); goTo('detail'); }}
                    >
                      <div className={`sc-recent-dot ${st}`} />
                      <div className="sc-recent-info">
                        <div className="sc-recent-name">Claim #{id}</div>
                        <div className="sc-recent-meta">{t} · {formatDateDisplay(item.receipt_date || item.date)}</div>
                      </div>
                      <span className={`sc-chip ${st}`}>{statusLabel(getStatus(item))}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══ LIST VIEW ══ */}
        {view === 'list' && (
          <div className="sc-list-view">
            {/* Search */}
            <div className="sc-search-wrap">
              <Search size={16} color="#999" />
              <input
                className="sc-search-input"
                placeholder="Search Claim ID or Expense Type…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="sc-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={16} color="#999" />
                </button>
              )}
            </div>

            {/* Tabs (same pattern) */}
            <div className="sc-tabs">
              {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
                <button
                  key={tab}
                  className={`sc-tab ${activeListTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveListTab(tab)}
                >
                  {tab}
                  <span className="sc-tab-count">
                    {tab === 'All' ? stats.total :
                     tab === 'Pending' ? stats.pending :
                     tab === 'Approved' ? stats.approved :
                     stats.rejected}
                  </span>
                </button>
              ))}
            </div>

            {apiError && (
              <div className="sc-api-error">
                <AlertTriangle size={15} />
                <span>{apiError}</span>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="sc-loading-state">
                <Loader2 size={32} className="spin" />
                <span>Loading claims…</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="sc-empty-state">
                <Receipt size={52} strokeWidth={1} color="#ccc" />
                <p>No {activeListTab.toLowerCase()} claims</p>
              </div>
            ) : (
              <div className="sc-cards-container">
                {filteredList.map((item) => {
                  const id = item.claim_id ?? item.id ?? '—';
                  const type = item.claim_type ?? item.type ?? '—';
                  const date = item.receipt_date || item.date;
                  const amount = item.total_amount ?? item.amount ?? 0;
                  const sc = statusClass(getStatus(item));

                  return (
                    <div
                      key={String(id)}
                      className="sc-item-card"
                      onClick={() => { setSelectedItem(item); goTo('detail'); }}
                    >
                      <div className={`sc-card-accent ${sc}`} />

                      <div className="sc-card-header">
                        <div className="sc-claim-meta">
                          <div className="sc-claim-avatar">{getInitial(type)}</div>
                          <div>
                            <div className="sc-claim-title">Claim #{id}</div>
                            <span className={`sc-status-badge ${sc}`}>
                              {sc === 'approved' ? <CheckCircle size={10} /> :
                               sc === 'rejected' ? <XCircle size={10} /> :
                               <Clock size={10} />}
                              {statusLabel(getStatus(item))}
                            </span>
                          </div>
                        </div>

                        {canEditOrDelete(getStatus(item)) && (
                          <div className="sc-more-wrapper" onClick={e => e.stopPropagation()}>
                            <button
                              className="sc-more-btn"
                              onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                            >
                              <MoreVertical size={18} color="#bbb" />
                            </button>

                            {openMenuId === id && (
                              <div className="sc-dropdown">
                                <div className="sc-dropdown-item" onClick={() => openForm(item)}>
                                  <Edit3 size={13} /><span>Edit</span>
                                </div>
                                <div
                                  className="sc-dropdown-item sc-dropdown-delete"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setOpenMenuId(null);
                                    setDeleteModal(true);
                                  }}
                                >
                                  <Trash2 size={13} /><span>Delete</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="sc-card-divider" />

                      <div className="sc-card-body">
                        <div className="sc-info-row"><FileText size={13} color="#6c47d9" /><span>{type}</span></div>
                        <div className="sc-info-row"><Calendar size={13} color="#6c47d9" /><span>{formatDateDisplay(date)}</span></div>
                        <div className="sc-info-row"><Receipt size={13} color="#6c47d9" /><span>RM {toMoney(amount)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FAB */}
            <div className="sc-fab-wrap">
              <button className="sc-fab" onClick={() => openForm()}>
                <Plus size={24} color="#fff" />
              </button>
            </div>
          </div>
        )}

        {/* ══ FORM VIEW ══ */}
        {view === 'form' && (
          <div className="sc-form-view">
            {/* Employee Info Banner */}
            <div className="sc-host-banner">
              <div className="sc-host-avatar">{getInitial(employeeName)}</div>
              <div className="sc-host-info">
                <div className="sc-host-label">Submitting as</div>
                <div className="sc-host-name">{employeeName || '—'}</div>
                <div className="sc-host-email">{employeeEmail || '—'}</div>
              </div>
            </div>

            {/* Base Fields */}
            <p className="sc-form-section-label">Claim Details</p>
            <div className="sc-form-card">
              <div className="sc-field-group">
                <label className="sc-label"><FileText size={13} /> Claim Type <span className="sc-req">*</span></label>
                <div className="sc-select-wrap">
                  <select
                    className="sc-select"
                    value={formData.claim_type}
                    onChange={e => setFormData(f => ({ ...f, claim_type: e.target.value }))}
                  >
                    <option value="">Select type…</option>
                    {claimTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={16} color="#888" className="sc-select-arrow" />
                </div>
              </div>

              <div className="sc-field-group">
                <label className="sc-label"><Calendar size={13} /> Receipt Date <span className="sc-req">*</span></label>
                <div
                  className={`sc-date-box${isCalOpen ? ' sc-date-active' : ''}`}
                  onClick={() => setIsCalOpen(true)}
                >
                  <Calendar size={16} color="#6c47d9" />
                  <div className="sc-date-content">
                    <span className="sc-date-label">Receipt Date</span>
                    <span className="sc-date-value">{receiptDate ? formatDateISO(receiptDate) : '— Select —'}</span>
                  </div>
                </div>
                <div className="sc-help-text">Policy: receipt date must be within the last 2 months.</div>
              </div>

              <div className="sc-field-row">
                <div className="sc-field-group sc-field-half">
                  <label className="sc-label"><Receipt size={13} /> Total Amount (RM) <span className="sc-req">*</span></label>
                  <input
                    className="sc-input"
                    inputMode="decimal"
                    placeholder="e.g. 120.50"
                    value={formData.total_amount}
                    onChange={e => setFormData(f => ({ ...f, total_amount: e.target.value }))}
                  />
                </div>

                <div className="sc-field-group sc-field-half">
                  <label className="sc-label"><BadgePercent size={13} /> GST Included</label>
                  <div className="sc-select-wrap">
                    <select
                      className="sc-select"
                      value={formData.gst_included}
                      onChange={e => setFormData(f => ({ ...f, gst_included: e.target.value }))}
                    >
                      {gstOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={16} color="#888" className="sc-select-arrow" />
                  </div>
                </div>
              </div>

              {gstHint && (
                <div className={`sc-inline-note ${gstHint.kind}`}>
                  <AlertTriangle size={15} />
                  <span>{gstHint.text}</span>
                </div>
              )}

              <div className="sc-field-group">
                <label className="sc-label"><FileText size={13} /> Remarks</label>
                <textarea
                  className="sc-textarea"
                  rows={3}
                  placeholder="Add supporting remarks (optional)…"
                  value={formData.remarks}
                  onChange={e => setFormData(f => ({ ...f, remarks: e.target.value }))}
                />
              </div>

              <div className="sc-field-group">
                <label className="sc-label"><Receipt size={13} /> Receipt Attachment</label>
                <input
                  className="sc-file"
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptFile}
                />
                {receiptPreviewUrl && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>Preview:</span>
                    <img
                      src={receiptPreviewUrl}
                      alt="Receipt preview"
                      style={{
                        display: 'block',
                        marginTop: 6,
                        maxWidth: '100%',
                        borderRadius: 8,
                        border: '1px solid #eee'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Conditional Rendering */}
            {formData.claim_type === 'Mileage' && (
              <>
                <p className="sc-form-section-label">Mileage Details</p>
                <div className="sc-form-card">
                  <div className="sc-field-group">
                    <label className="sc-label"><MapPin size={13} /> Start Point <span className="sc-req">*</span></label>
                    <input
                      className="sc-input"
                      placeholder="e.g. HQ Office"
                      value={formData.start_point}
                      onChange={e => setFormData(f => ({ ...f, start_point: e.target.value }))}
                    />
                  </div>

                  <div className="sc-field-group">
                    <label className="sc-label"><MapPin size={13} /> End Point <span className="sc-req">*</span></label>
                    <input
                      className="sc-input"
                      placeholder="e.g. Client Site"
                      value={formData.end_point}
                      onChange={e => setFormData(f => ({ ...f, end_point: e.target.value }))}
                    />
                  </div>

                  <div className="sc-field-row">
                    <div className="sc-field-group sc-field-half">
                      <label className="sc-label"><Route size={13} /> Total KM <span className="sc-req">*</span></label>
                      <input
                        className="sc-input"
                        inputMode="numeric"
                        placeholder="e.g. 42"
                        value={formData.total_km}
                        onChange={e => setFormData(f => ({ ...f, total_km: e.target.value }))}
                      />
                    </div>
                    <div className="sc-field-group sc-field-half">
                      <label className="sc-label"><Receipt size={13} /> Tolls (RM)</label>
                      <input
                        className="sc-input"
                        inputMode="decimal"
                        placeholder="e.g. 8.50"
                        value={formData.tolls_amount}
                        onChange={e => setFormData(f => ({ ...f, tolls_amount: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

             {(formData.claim_type === 'Meal' || formData.claim_type === 'Entertainment') && (
              <>
                <p className="sc-form-section-label">Meal / Entertainment Details</p>
                <div className="sc-form-card">
                  <div className="sc-field-group">
                    <label className="sc-label"><Users size={13} /> Attendee Names <span className="sc-req">*</span></label>
                    <input
                      className="sc-input"
                      placeholder="e.g. Ali, Siti, Vendor Rep"
                      value={formData.attendee_names}
                      onChange={e => setFormData(f => ({ ...f, attendee_names: e.target.value }))}
                    />
                  </div>

                  <div className="sc-field-group">
                    <label className="sc-label"><FileText size={13} /> Relationship to Company</label>
                    <input
                      className="sc-input"
                      placeholder="e.g. Client / Supplier / Internal"
                      value={formData.relationship_to_company}
                      onChange={e => setFormData(f => ({ ...f, relationship_to_company: e.target.value }))}
                    />
                  </div>

                  <div className="sc-field-group">
                    <label className="sc-label"><FileText size={13} /> Purpose <span className="sc-req">*</span></label>
                    <input
                      className="sc-input"
                      placeholder="e.g. Project discussion with client"
                      value={formData.purpose}
                      onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {formData.claim_type === 'Medical' && (
              <div className="sc-med-warning">
                <Stethoscope size={16} />
                <span><strong>Medical claims</strong> will be routed to HR for entitlement verification.</span>
              </div>
            )}

            {formError && (
              <div className="sc-form-error">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <button className="sc-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 size={18} className="spin" /> Submitting…</>
                : formData.claim_id ? '💾  Save Changes' : '✅  Submit Claim'}
            </button>
          </div>
        )}

        {/* ══ DETAIL VIEW ══ */}
        {view === 'detail' && selectedItem && (() => {
          const t = selectedItem;
          const sc = statusClass(getStatus(t));
          const id = t.claim_id ?? t.id ?? '—';
          const type = t.claim_type ?? t.type ?? '—';
          const receipt = t.receipt_date || t.date;
          const amount = t.total_amount ?? t.amount ?? 0;
          const gstInc = t.gst_included === true ? 'Yes' : (t.gst_included === false ? 'No' : (t.gst_included ? 'Yes' : 'No'));

          const timelineIdx = getTimelineIndex(t);
          const isRejected = normalizeStatus(getStatus(t)) === 'rejected';

          return (
            <div className="sc-detail-view">
              <div className={`sc-detail-banner sc-detail-banner-${sc}`}>
                <div className="sc-detail-banner-avatar">{getInitial(type)}</div>
                <div className="sc-detail-banner-info">
                  <div className="sc-detail-banner-name">Claim #{id}</div>
                  <div className="sc-detail-banner-company">{type} · RM {toMoney(amount)}</div>
                </div>
                <span className={`sc-status-badge ${sc} sc-status-badge-lg`}>
                  {sc === 'approved' ? <CheckCircle size={11} /> :
                   sc === 'rejected' ? <XCircle size={11} /> :
                   <Clock size={11} />}
                  {statusLabel(getStatus(t))}
                </span>
              </div>

              <div className="sc-detail-body">
                <div className="sc-detail-id">
                  <Hash size={13} color="#999" />
                  <span>Claim #{id}</span>
                </div>

                {/* Approval Timeline */}
                <div className="sc-detail-section">
                  <h4 className="sc-detail-section-title">Approval Timeline</h4>
                  <div className="sc-timeline">
                    {approvalStages.map((stage, idx) => {
                      const active = idx === timelineIdx && !isRejected;
                      const done = idx < timelineIdx || (normalizeStatus(getStatus(t)) === 'approved');
                      const rejectedHere = isRejected && idx === timelineIdx;

                      return (
                        <div key={stage} className="sc-tl-step">
                          <div className={`sc-tl-dot ${done ? 'done' : ''} ${active ? 'active' : ''} ${rejectedHere ? 'rejected' : ''}`}>
                            {done ? <CheckCircle size={14} /> : (rejectedHere ? <XCircle size={14} /> : <Clock size={14} />)}
                          </div>
                          <div className="sc-tl-label">{stage}</div>
                          {idx !== approvalStages.length - 1 && <div className={`sc-tl-line ${done ? 'done' : ''}`} />}
                        </div>
                      );
                    })}
                  </div>

                  {isRejected && (t.rejection_reason || t.reject_reason) && (
                    <div className="sc-reject-box">
                      <AlertTriangle size={16} />
                      <div>
                        <div className="sc-reject-title">Rejected Reason</div>
                        <div className="sc-reject-text">{t.rejection_reason || t.reject_reason}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Claim Data Grid */}
                <div className="sc-detail-section">
                  <h4 className="sc-detail-section-title">Submitted Information</h4>
                  <div className="sc-detail-grid">
                    <div className="sc-detail-item">
                      <span className="sc-dii-label">Type</span>
                      <span className="sc-dii-value">{type}</span>
                    </div>
                    <div className="sc-detail-item">
                      <span className="sc-dii-label">Receipt Date</span>
                      <span className="sc-dii-value">{formatDateDisplay(receipt)}</span>
                    </div>
                    <div className="sc-detail-item">
                      <span className="sc-dii-label">Total Amount (RM)</span>
                      <span className="sc-dii-value">RM {toMoney(amount)}</span>
                    </div>
                    <div className="sc-detail-item">
                      <span className="sc-dii-label">GST Included</span>
                      <span className="sc-dii-value">{gstInc}</span>
                    </div>

                    {(t.remarks) && (
                      <div className="sc-detail-item sc-detail-full">
                        <span className="sc-dii-label">Remarks</span>
                        <span className="sc-dii-value">{t.remarks}</span>
                      </div>
                    )}

                    {(t.receipt_file_name) && (
                      <div className="sc-detail-item sc-detail-full">
                        <span className="sc-dii-label">Receipt Attachment</span>
                        <span className="sc-dii-value">{t.receipt_file_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Type-specific details */}
                {(type === 'Mileage') && (
                  <div className="sc-detail-section">
                    <h4 className="sc-detail-section-title">Mileage Details</h4>
                    <div className="sc-detail-grid">
                      <div className="sc-detail-item">
                        <span className="sc-dii-label">Start Point</span>
                        <span className="sc-dii-value">{t.start_point || '—'}</span>
                      </div>
                      <div className="sc-detail-item">
                        <span className="sc-dii-label">End Point</span>
                        <span className="sc-dii-value">{t.end_point || '—'}</span>
                      </div>
                      <div className="sc-detail-item">
                        <span className="sc-dii-label">Total KM</span>
                        <span className="sc-dii-value">{t.total_km ?? '—'}</span>
                      </div>
                      <div className="sc-detail-item">
                        <span className="sc-dii-label">Tolls (RM)</span>
                        <span className="sc-dii-value">RM {toMoney(t.tolls_amount ?? t.tolls ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {(type === 'Meal' || type === 'Entertainment') && (
                  <div className="sc-detail-section">
                    <h4 className="sc-detail-section-title">Meal / Entertainment Details</h4>
                    <div className="sc-detail-grid">
                      <div className="sc-detail-item sc-detail-full">
                        <span className="sc-dii-label">Attendee Names</span>
                        <span className="sc-dii-value">{t.attendee_names || t.attendees || '—'}</span>
                      </div>
                      <div className="sc-detail-item">
                        <span className="sc-dii-label">Relationship</span>
                        <span className="sc-dii-value">{t.relationship_to_company || t.relationship || '—'}</span>
                      </div>
                      <div className="sc-detail-item">
                        <span className="sc-dii-label">Purpose</span>
                        <span className="sc-dii-value">{t.purpose || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {(type === 'Medical') && (
                  <div className="sc-detail-section">
                    <h4 className="sc-detail-section-title">Medical Routing</h4>
                    <div className="sc-detail-remarks">
                      Medical claims are routed to HR for entitlement verification before Finance processing.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="sc-detail-footer">
                {canEditOrDelete(getStatus(t)) ? (
                  <>
                    <button className="sc-detail-edit-btn" onClick={() => openForm(t)}>
                      <Edit3 size={16} /> Edit
                    </button>
                    <button className="sc-detail-del-btn" onClick={() => setDeleteModal(true)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                ) : (
                  <button className="sc-detail-edit-btn" onClick={() => goTo('list')}>
                    <FileText size={16} /> Back to List
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── RECEIPT DATE CALENDAR MODAL (overlay pattern) ─── */}
      {isCalOpen && (
        <div className="sc-cal-overlay" onClick={() => setIsCalOpen(false)}>
          <div className="sc-cal-modal" onClick={e => e.stopPropagation()}>
            <div className="sc-cal-header">
              <span>Select Receipt Date</span>
              <button className="sc-cal-close" onClick={() => setIsCalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="sc-cal-nav">
              <button onClick={() => changeMonth(-1)} className="sc-cal-arrow">‹</button>
              <span className="sc-cal-month">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="sc-cal-arrow">›</button>
            </div>

            <div className="sc-cal-weekdays">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}
            </div>

            <div className="sc-cal-grid">{renderCalendarDays()}</div>

            <button
              className="sc-cal-confirm"
              onClick={() => {
                // Apply to formData ISO too (kept for consistency and future backend mapping)
                setFormData(f => ({ ...f, receipt_date: receiptDate ? formatDateISO(receiptDate) : '' }));
                setIsCalOpen(false);
              }}
            >
              <CheckCircle size={16} /> Confirm
            </button>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL (overlay pattern) ─── */}
      {deleteModal && selectedItem && (
        <div className="sc-modal-overlay" onClick={() => !deleteLoading && setDeleteModal(false)}>
          <div className="sc-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="sc-cancel-modal-icon">
              <Trash2 size={44} color="#ef4444" />
            </div>
            <h3>Delete Claim?</h3>
            <p>
              Are you sure you want to delete{' '}
              <strong>Claim #{selectedItem.claim_id ?? selectedItem.id}</strong>? This cannot be undone.
            </p>
            <div className="sc-cancel-modal-actions">
              <button className="sc-cancel-no" onClick={() => setDeleteModal(false)} disabled={deleteLoading}>
                Keep It
              </button>
              <button className="sc-cancel-yes" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading
                  ? <><Loader2 size={15} className="spin" /> Deleting…</>
                  : <><Trash2 size={15} /> Yes, Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffClaim;