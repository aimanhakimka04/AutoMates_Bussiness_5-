import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  MapPin,
  Mail,
  Phone,
  Hash,
  Check,
  X,
  Clock,
  RefreshCw,
  AlertTriangle,
  Ticket,
  Users,
  CreditCard,
} from 'lucide-react';
import './HRRequestCenter.css';

const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

async function callN8NGeneric(action, subTarget, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'request_center', ...payload },
  };
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`n8n error: ${res.status}`);
  return res.json();
}

/* ─── Reject Modal ─────────────────────────────────────────── */
function RejectModal({ onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  return (
    <div className="hr-modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="hr-modal">
        <div className="hr-modal-handle" />
        <div className="hr-modal-title">Reject Request</div>
        <div className="hr-modal-sub">Provide an optional reason for this decision.</div>
        <div className="hr-modal-label">Reason (optional)</div>
        <textarea
          className="hr-modal-textarea"
          placeholder="e.g. Missing documentation, budget constraints…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <div className="hr-modal-actions">
          <button className="hr-modal-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="hr-modal-confirm" onClick={() => onConfirm(reason)} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <X size={14} />}
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Modal ─────────────────────────────────────────── */
const SKIP_KEYS = new Set([
  'claim_id', 'id', 'ticket_id', 'appointment_id', 'visitor_id', 'employee_id',
  'status', 'status_code', 'status_id', 'created_at', 'updated_at', 'deleted_at',
  'receipt_photo', 'receipt_file_name', 'photo', 'image', 'file', 'blob',
]);
const IMAGE_KEYS = new Set(['photo_base64', 'photo', 'image_base64', 'image']);
const LABEL_MAP = {
  visitor_name: 'Visitor', official_email: 'Email', contact_number: 'Phone',
  ic_number: 'IC / ID', meeting_location: 'Location', purpose_of_visit: 'Purpose',
  visit_date: 'Visit Date', host_name: 'Host', claim_type: 'Claim Type',
  receipt_date: 'Receipt Date', total_amount: 'Total Amount',
  employee_name: 'Submitted by', issueCategory: 'Category',
  issueDescription: 'Description', facility_area: 'Location', level: 'Location',
  purpose: 'Purpose', rejection_reason: 'Rejection Reason',
  cancellation_reason: 'Cancellation Reason', remarks: 'Remarks',
  start_point: 'Start Point', end_point: 'End Point', total_km: 'Total KM',
  tolls_amount: 'Tolls', attendee_names: 'Attendees',
  relationship_to_company: 'Relationship', gst_included: 'GST Included',
  submitted_at: 'Submitted At', display_label: 'Status',
  photo_base64: 'Attached Photo', submittedBy: 'Submitted By',
  facilityArea: 'Facility Area',
};
const keyToLabel = (k) => LABEL_MAP[k] ?? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function DetailModal({ detail, onClose, statusClass, onApprove, onReject, openRejectModal, actionLoadingId }) {
  if (!detail) return null;
  const { kind, item } = detail;
  const st = statusClass(item?.status ?? item?.status_code);
  const id = kind === 'claims' ? item.claim_id ?? item.id : kind === 'tickets' ? item.id ?? item.ticket_id : item.appointment_id;
  const loadKey = `${kind}-${id}`;
  const la = actionLoadingId === `${loadKey}-approve`;
  const lr = actionLoadingId === `${loadKey}-reject`;

  const formatVal = (val) => {
    if (val == null || val === '') return null;
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.length ? val.join(', ') : null;
    if (typeof val === 'object') return null;
    const s = String(val).trim();
    return s || null;
  };

  const PRIORITY_ORDER = ['visitor_name', 'claim_type', 'type', 'issueCategory', 'receipt_date', 'date', 'visit_date', 'total_amount', 'amount', 'employee_name', 'host_name', 'company', 'official_email', 'contact_number'];
  const getOrder = (k) => {
    const i = PRIORITY_ORDER.indexOf(k);
    return i >= 0 ? i : 999;
  };

  const detailFields = Object.entries(item || {})
    .filter(([key, val]) => {
      if (SKIP_KEYS.has(key)) return false;
      if (IMAGE_KEYS.has(key)) return val != null && String(val).trim() !== '';
      const formatted = formatVal(val);
      return formatted != null && formatted !== '';
    })
    .map(([key, val]) => ({
      key,
      label: keyToLabel(key),
      value: IMAGE_KEYS.has(key) ? val : formatVal(val),
      full: /reason|remarks|description|purpose|attendee|name|email|company/i.test(key) || IMAGE_KEYS.has(key),
      order: IMAGE_KEYS.has(key) ? 998 : getOrder(key),
      isImage: IMAGE_KEYS.has(key),
    }))
    .sort((a, b) => a.order - b.order);

  const Field = ({ label, value, full, isImage }) => (
    <div className={`hr-detail-field${full ? ' full' : ''}${isImage ? ' hr-detail-field-image' : ''}`}>
      <span className="hr-detail-label">{label}</span>
      {isImage && value ? (
        <img
          src={`data:image/jpeg;base64,${value}`}
          alt={label}
          className="hr-detail-photo"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : !isImage ? (
        <span className="hr-detail-value">{value || '—'}</span>
      ) : null}
    </div>
  );

  return (
    <div className="hr-detail-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hr-detail-box">
        <div className="hr-detail-handle" />
        <div className={`hr-detail-accent ${st}`} />
        <div className="hr-detail-header">
          <div className="hr-detail-id"><Hash size={14} />#{id}</div>
          <StatusBadge status={item?.status ?? item?.status_code} />
        </div>
        <div className="hr-detail-body">
          {detailFields.map(({ key, label, value, full, isImage }) => (
            <Field key={key} label={label} value={value} full={full} isImage={isImage} />
          ))}
        </div>
        {st === 'pending' && (
          <div className="hr-detail-actions">
            <button className="hr-btn approve" onClick={() => onApprove(kind, item)} disabled={la || lr}>
              {la ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              Approve
            </button>
            <button className="hr-btn reject" onClick={() => { onClose(); openRejectModal(kind, item); }} disabled={la || lr}>
              {lr ? <Loader2 size={14} className="spin" /> : <X size={14} />}
              Reject
            </button>
          </div>
        )}
        <button className="hr-detail-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

/* ─── Status Badge ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const l = String(status || '').toLowerCase();
  let cls = 'pending', label = status || 'Pending', Icon = Clock;
  if (l.includes('approve')) { cls = 'approved'; label = status; Icon = CheckCircle; }
  else if (l.includes('reject'))  { cls = 'rejected'; label = status; Icon = XCircle; }
  else if (l.includes('cancel'))  { cls = 'cancelled'; label = status; Icon = AlertTriangle; }
  return (
    <span className={`hr-status ${cls}`}>
      <span className="hr-status-dot" />
      {label}
    </span>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
const HRRequestCenter = ({ userInfo }) => {
  const navigate = useNavigate();
  const employeeEmail = userInfo?.email || '';
  const employeeName  = userInfo?.name  || '';

  const [tab, setTab]   = useState('claims');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [claims,   setClaims]   = useState([]);
  const [tickets,  setTickets]  = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  /* modal state */
  const [modal, setModal] = useState(null); // { kind, item } | null
  const [detailItem, setDetailItem] = useState(null); // { kind, item } | null — detail box

  /* ── data loader ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'claims') {
        const res = await callN8NGeneric('list_claims', 'staff_claim', {
          employee_email: employeeEmail,
          employee_name: employeeName,
        });
        const arr =
          (res?.data && Array.isArray(res.data) && res.data) ||
          (res?.result?.data && Array.isArray(res.result.data) && res.result.data) ||
          [];
        setClaims(arr);
      } else if (tab === 'tickets') {
        const res = await callN8NGeneric('get_tickets', 'ticketing', { employee_email: employeeEmail });
        let raw =
          (res?.data?.tickets && Array.isArray(res.data.tickets) && res.data.tickets) ||
          (res?.tickets && Array.isArray(res.tickets) && res.tickets) ||
          (res?.data && Array.isArray(res.data) && res.data) ||
          (res?.result?.data && Array.isArray(res.result?.data) && res.result.data) ||
          null;
        if (raw == null && res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          const d = res.data;
          raw = [...(d.open || []), ...(d.approved || []), ...(d.rejected || [])];
        }
        const ticketList = Array.isArray(raw) ? raw : [];
        setTickets(
          ticketList.filter(
            (t) => t && (t.id != null || t.ticket_id != null) &&
              (t.issueCategory != null || t.issueDescription != null || t.level != null)
          )
        );
      } else if (tab === 'visitors') {
        const res = await callN8NGeneric('list_visitors', 'evisitor', {
          user_email: employeeEmail,
          user_name: employeeName,
        });
        let raw = null;
        if (res?.data && Array.isArray(res.data)) {
          raw = res.data;
        } else if (res?.result?.data && Array.isArray(res.result.data)) {
          raw = res.result.data;
        } else if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          const d = res.data;
          raw = [...(d.open || []), ...(d.approved || []), ...(d.rejected || []), ...(d.cancelled || [])];
        } else if (res?.grouped && typeof res.grouped === 'object') {
          const g = res.grouped;
          raw = [...(g.open || []), ...(g.approved || []), ...(g.rejected || []), ...(g.cancelled || [])];
        }
        if (raw == null) raw = [];
        // Drop partial rows (e.g. RETURNING-only) that lack visitor details so we don't show blank cards
        const arr = raw.filter(
          (v) => v && v.appointment_id != null && (v.visitor_name != null || v.official_email != null)
        );
        setVisitors(arr);
      }
    } catch {
      setError('Unable to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tab, employeeEmail, employeeName]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── action handler ── */
  const handleDecision = async (kind, item, decision, reason = '') => {
    const id =
      kind === 'claims'   ? item.claim_id ?? item.id
      : kind === 'tickets'  ? item.id
      : item.appointment_id;
    if (!id) return;

    const loadKey = `${kind}-${id}-${decision}`;
    setActionLoadingId(loadKey);
    let ok = false;
    try {
      if (kind === 'claims') {
        await callN8NGeneric(decision === 'approve' ? 'approve_claim' : 'reject_claim', 'staff_claim', {
          employee_email: employeeEmail, employee_name: employeeName, claim_id: id, decision, reason,
        });
        ok = true;
        setClaims((p) => p.filter((c) => (c.claim_id ?? c.id) !== id));
      } else if (kind === 'tickets') {
        await callN8NGeneric(decision === 'approve' ? 'approve_ticket' : 'reject_ticket', 'ticketing', {
          employee_email: employeeEmail, employee_name: employeeName, ticket_id: id, decision, reason,
        });
        ok = true;
        setTickets((p) => p.filter((t) => (t.id ?? t.ticket_id) !== id));
      } else {
        await callN8NGeneric(decision === 'approve' ? 'approve_appointment' : 'reject_appointment', 'evisitor', {
          appointment_id: id, decision, reason, user_email: employeeEmail, user_name: employeeName,
        });
        ok = true;
        setVisitors((p) => p.filter((v) => (v.appointment_id ?? v.id) !== id));
      }
      setError('');
      await loadData();
    } catch (e) {
      if (!ok) alert(e.message || 'Action failed. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ── open reject modal ── */
  const openRejectModal = (kind, item) => setModal({ kind, item });

  const confirmReject = async (reason) => {
    if (!modal) return;
    await handleDecision(modal.kind, modal.item, 'reject', reason);
    setModal(null);
  };

  const handleApproveFromDetail = async (kind, item) => {
    await handleDecision(kind, item, 'approve', '');
    setDetailItem(null);
  };

  const statusClass = (s) => {
    const l = String(s || '').toLowerCase();
    if (l.includes('approve')) return 'approved';
    if (l.includes('reject'))  return 'rejected';
    if (l.includes('cancel'))  return 'cancelled';
    return 'pending';
  };

  /* ── counts ── */
  const pendingClaims   = claims.filter((c) => statusClass(c.status ?? c.status_code) === 'pending').length;
  const pendingTickets  = tickets.filter((t) => statusClass(t.status) === 'pending').length;
  const pendingVisitors = visitors.filter((v) => statusClass(v.status) === 'pending').length;
  const totalPending    = tab === 'claims' ? pendingClaims : tab === 'tickets' ? pendingTickets : pendingVisitors;

  /* ── renderers ── */
  const Empty = ({ icon: Icon, label }) => (
    <div className="hr-empty">
      <div className="hr-empty-icon"><Icon size={26} color="var(--muted)" /></div>
      <p>{label}</p>
      <span>Pull down to refresh</span>
    </div>
  );

  const ActionBtns = ({ kind, item }) => {
    const id = kind === 'claims' ? item.claim_id ?? item.id : kind === 'tickets' ? item.id : item.appointment_id;
    const la = actionLoadingId === `${kind}-${id}-approve`;
    const lr = actionLoadingId === `${kind}-${id}-reject`;
    return (
      <div className="hr-card-actions">
        <button
          className="hr-btn approve"
          onClick={() => handleDecision(kind, item, 'approve', '')}
          disabled={la || lr}
        >
          {la ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
          Approve
        </button>
        <button
          className="hr-btn reject"
          onClick={() => openRejectModal(kind, item)}
          disabled={la || lr}
        >
          {lr ? <Loader2 size={13} className="spin" /> : <X size={13} />}
          Reject
        </button>
      </div>
    );
  };

  const Field = ({ label, value, full }) => (
    <div className={`hr-card-field${full ? ' full' : ''}`}>
      <span className="hr-field-label">{label}</span>
      <span className="hr-field-value">{value || '—'}</span>
    </div>
  );

  const renderClaims = () => {
    if (!claims.length) return <Empty icon={CreditCard} label="No staff claims found" />;
    return (
      <div className="hr-list">
        {claims.map((c) => {
          const id = c.claim_id ?? c.id;
          const st = statusClass(c.status ?? c.status_code);
          return (
            <div key={`claims-${id}`} className="hr-card hr-card-clickable" onClick={() => setDetailItem({ kind: 'claims', item: c })}>
              <div className={`hr-card-accent ${st}`} />
              <div className="hr-card-inner">
                <div className="hr-card-title-row">
                  <div className="hr-pill-id"><Hash size={11} />{id}</div>
                  <StatusBadge status={c.status ?? c.status_code} />
                </div>
                <div className="hr-card-fields">
                  <Field label="Claim Type" value={c.claim_type || c.type} />
                  <Field label="Date" value={c.receipt_date || c.date} />
                  <Field label="Amount" value={c.amount} />
                  <Field label="Submitted by" value={c.employee_name || c.name} />
                </div>
                {st === 'pending' && (
                  <>
                    <div className="hr-card-divider" />
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionBtns kind="claims" item={c} />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTickets = () => {
    if (!tickets.length) return <Empty icon={Ticket} label="No tickets found" />;
    return (
      <div className="hr-list">
        {tickets.map((t) => {
          const id = t.id ?? t.ticket_id;
          const st = statusClass(t.status);
          return (
            <div key={`tickets-${id}`} className="hr-card hr-card-clickable" onClick={() => setDetailItem({ kind: 'tickets', item: t })}>
              <div className={`hr-card-accent ${st}`} />
              <div className="hr-card-inner">
                <div className="hr-card-title-row">
                  <div className="hr-pill-id"><Hash size={11} />{id ?? '—'}</div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="hr-card-fields">
                  <Field label="Category" value={t.issueCategory ?? t.issueDescription} full />
                  <Field label="Date" value={t.date ?? t.created_at} />
                  <Field label="Location" value={t.level ?? t.facility_area ?? t.zone} />
                </div>
                {st === 'pending' && (
                  <>
                    <div className="hr-card-divider" />
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionBtns kind="tickets" item={t} />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderVisitors = () => {
    if (!visitors.length) return <Empty icon={Users} label="No visitor appointments found" />;
    return (
      <div className="hr-list">
        {visitors.map((v) => {
          const st = statusClass(v.status);
          return (
            <div key={`visitors-${v.appointment_id}`} className="hr-card hr-card-clickable" onClick={() => setDetailItem({ kind: 'visitors', item: v })}>
              <div className={`hr-card-accent ${st}`} />
              <div className="hr-card-inner">
                <div className="hr-card-title-row">
                  <div className="hr-pill-id"><Hash size={11} />{v.appointment_id ?? '—'}</div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="hr-card-fields">
                  <Field label="Visitor" value={v.visitor_name} full />
                  <Field label="Email" value={v.official_email} full />
                  <Field label="Phone" value={v.contact_number} />
                  <Field label="Visit Date" value={v.visit_date} />
                </div>
                {st === 'pending' && (
                  <>
                    <div className="hr-card-divider" />
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionBtns kind="visitors" item={v} />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const TABS = [
    { id: 'claims',   label: 'Claims',   Icon: CreditCard, count: pendingClaims },
    { id: 'tickets',  label: 'Tickets',  Icon: Ticket,     count: pendingTickets },
    { id: 'visitors', label: 'Visitors', Icon: Users,      count: pendingVisitors },
  ];

  return (
    <div className="hr-center-root">
      {/* ── Nav ── */}
      <nav className="hr-center-nav">
        <button className="hr-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <div className="hr-nav-info">
          <span className="hr-title">Request Center</span>
          {employeeName && <span className="hr-subtitle">{employeeName}</span>}
        </div>
        {totalPending > 0 && (
          <div className="hr-nav-badge">
            <span className="hr-nav-dot" />
            {totalPending} pending
          </div>
        )}
      </nav>

      <div className="hr-center-body">
        {/* ── Tabs ── */}
        <div className="hr-tabs-wrapper">
          {TABS.map(({ id, label, Icon, count }) => (
            <button
              key={id}
              className={`hr-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <span className="hr-tab-bg" />
              <Icon size={13} style={{ position: 'relative' }} />
              <span style={{ position: 'relative' }}>{label}</span>
              {count > 0 && (
                <span className="hr-tab-count" style={{ position: 'relative' }}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="hr-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Section header ── */}
        <div className="hr-section-head">
          <span className="hr-section-title">
            {tab === 'claims' ? 'Staff Claims' : tab === 'tickets' ? 'Support Tickets' : 'Visitor Appointments'}
          </span>
          <button className="hr-refresh-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="hr-loading">
            <div className="hr-loading-ring" />
            <span>Loading requests…</span>
          </div>
        ) : (
          <>
            {tab === 'claims'   && renderClaims()}
            {tab === 'tickets'  && renderTickets()}
            {tab === 'visitors' && renderVisitors()}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailItem && (
        <DetailModal
          detail={detailItem}
          onClose={() => setDetailItem(null)}
          statusClass={statusClass}
          onApprove={handleApproveFromDetail}
          onReject={() => {}}
          openRejectModal={openRejectModal}
          actionLoadingId={actionLoadingId}
        />
      )}

      {/* ── Reject Modal ── */}
      {modal && (
        <RejectModal
          onConfirm={confirmReject}
          onCancel={() => setModal(null)}
          loading={!!actionLoadingId}
        />
      )}
    </div>
  );
};

export default HRRequestCenter;