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

const HRRequestCenter = ({ userInfo }) => {
  const navigate = useNavigate();
  const employeeEmail = userInfo?.email || '';
  const employeeName = userInfo?.name || '';
  const employee_role = userInfo?.employee_role || userInfo?.role || '';

  const [tab, setTab] = useState('claims'); // claims | tickets | visitors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [claims, setClaims] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [actionLoadingId, setActionLoadingId] = useState(null);

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
        const res = await callN8NGeneric('get_tickets', 'ticketing', {
          employee_email: employeeEmail,
        });
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
            (t) => t && (t.id != null || t.ticket_id != null) && (t.issueCategory != null || t.issueDescription != null || t.level != null)
          )
        );
      } else if (tab === 'visitors') {
        const res = await callN8NGeneric('list_visitors', 'evisitor', {
          user_email: employeeEmail,
          user_name: employeeName,
        });
        const raw =
          (res?.data && Array.isArray(res.data) && res.data) ||
          (res?.result?.data && Array.isArray(res.result.data) && res.result.data) ||
          (res?.tickets && Array.isArray(res.tickets) && res.tickets) ||
          (res?.grouped?.open && Array.isArray(res.grouped.open) && res.grouped.open) ||
          [];
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecision = async (kind, item, decision) => {
    const id =
      kind === 'claims'
        ? item.claim_id ?? item.id
        : kind === 'tickets'
        ? item.id
        : item.appointment_id;
    if (!id) return;

    const reason =
      decision === 'reject'
        ? window.prompt('Reason for rejection? (optional)', '') || ''
        : '';

    setActionLoadingId(`${kind}-${id}-${decision}`);
    let actionSucceeded = false;
    try {
      if (kind === 'claims') {
        const action = decision === 'approve' ? 'approve_claim' : 'reject_claim';
        await callN8NGeneric(action, 'staff_claim', {
          employee_email: employeeEmail,
          employee_name: employeeName,
          claim_id: id,
          decision,
          reason,
        });
        actionSucceeded = true;
        setClaims((prev) => prev.filter((c) => (c.claim_id ?? c.id) !== id));
      } else if (kind === 'tickets') {
        const action = decision === 'approve' ? 'approve_ticket' : 'reject_ticket';
        await callN8NGeneric(action, 'ticketing', {
          employee_email: employeeEmail,
          employee_name: employeeName,
          ticket_id: id,
          decision,
          reason,
        });
        actionSucceeded = true;
        setTickets((prev) => prev.filter((t) => (t.id ?? t.ticket_id) !== id));
      } else if (kind === 'visitors') {
        const action = decision === 'approve' ? 'approve_appointment' : 'reject_appointment';
        await callN8NGeneric(action, 'evisitor', {
          appointment_id: id,
          decision,
          reason,
          user_email: employeeEmail,
          user_name: employeeName,
        });
        actionSucceeded = true;
        setVisitors((prev) => prev.filter((v) => (v.appointment_id ?? v.id) !== id));
      }
      setError('');
      await loadData();
    } catch (e) {
      if (!actionSucceeded) alert(e.message || 'Action failed. Please try again.');
      setError('');
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusBadge = (s) => {
    const l = String(s || '').toLowerCase();
    if (l.includes('approve')) return 'approved';
    if (l.includes('reject')) return 'rejected';
    if (l.includes('cancel')) return 'cancelled';
    return 'pending';
  };

  const renderClaims = () => {
    if (claims.length === 0) {
      return (
        <div className="hr-empty">
          <FileText size={40} />
          <p>No staff claims found</p>
        </div>
      );
    }
    return (
      <div className="hr-list">
        {claims.map((c) => {
          const id = c.claim_id ?? c.id;
          const st = statusBadge(c.status);
          const key = `claims-${id}`;
          const loadingApprove = actionLoadingId === `${key}-approve`;
          const loadingReject = actionLoadingId === `${key}-reject`;
          return (
            <div key={key} className="hr-card">
              <div className="hr-card-main">
                <div className="hr-card-title-row">
                  <div className="hr-pill-id">
                    <Hash size={12} />
                    <span>{id}</span>
                  </div>
                  <span className={`hr-status ${st}`}>
                    {st === 'approved' ? <CheckCircle size={12} /> : st === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                    {c.status || 'Pending'}
                  </span>
                </div>
                <div className="hr-card-line">
                  <FileText size={13} />
                  <span>{c.claim_type || c.type || '—'}</span>
                </div>
                <div className="hr-card-line">
                  <Calendar size={13} />
                  <span>{c.receipt_date || c.date || '—'}</span>
                </div>
                <div className="hr-card-line">
                  <User size={13} />
                  <span>{c.employee_name || c.submitted_by || '—'}</span>
                </div>
              </div>
              {st === 'pending' && (
                <div className="hr-card-actions">
                  <button
                    className="hr-btn approve"
                    onClick={() => handleDecision('claims', c, 'approve')}
                    disabled={loadingApprove}
                  >
                    {loadingApprove ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    Accept
                  </button>
                  <button
                    className="hr-btn reject"
                    onClick={() => handleDecision('claims', c, 'reject')}
                    disabled={loadingReject}
                  >
                    {loadingReject ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTickets = () => {
    if (tickets.length === 0) {
      return (
        <div className="hr-empty">
          <FileText size={40} />
          <p>No tickets found</p>
        </div>
      );
    }
    return (
      <div className="hr-list">
        {tickets.map((t) => {
          const key = `tickets-${t.id}`;
          const st = statusBadge(t.status);
          const loadingApprove = actionLoadingId === `${key}-approve`;
          const loadingReject = actionLoadingId === `${key}-reject`;
          return (
            <div key={key} className="hr-card">
              <div className="hr-card-main">
                <div className="hr-card-title-row">
                  <div className="hr-pill-id">
                    <Hash size={12} />
                    <span>{t.id ?? t.ticket_id ?? '—'}</span>
                  </div>
                  <span className={`hr-status ${st}`}>
                    {t.status || 'Pending'}
                  </span>
                </div>
                <div className="hr-card-line">
                  <FileText size={13} />
                  <span>{t.issueCategory ?? t.issueDescription ?? '—'}</span>
                </div>
                <div className="hr-card-line">
                  <Calendar size={13} />
                  <span>{t.date ?? t.created_at ?? '—'}</span>
                </div>
                <div className="hr-card-line">
                  <MapPin size={13} />
                  <span>{t.level ?? t.facility_area ?? t.zone ?? '—'}</span>
                </div>
              </div>
              {st === 'pending' && (
                <div className="hr-card-actions">
                  <button
                    className="hr-btn approve"
                    onClick={() => handleDecision('tickets', t, 'approve')}
                    disabled={loadingApprove}
                  >
                    {loadingApprove ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    Accept
                  </button>
                  <button
                    className="hr-btn reject"
                    onClick={() => handleDecision('tickets', t, 'reject')}
                    disabled={loadingReject}
                  >
                    {loadingReject ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderVisitors = () => {
    if (visitors.length === 0) {
      return (
        <div className="hr-empty">
          <FileText size={40} />
          <p>No visitor appointments found</p>
        </div>
      );
    }
    return (
      <div className="hr-list">
        {visitors.map((v) => {
          const key = `visitors-${v.appointment_id}`;
          const st = statusBadge(v.status);
          const loadingApprove = actionLoadingId === `${key}-approve`;
          const loadingReject = actionLoadingId === `${key}-reject`;
          return (
            <div key={key} className="hr-card">
              <div className="hr-card-main">
                <div className="hr-card-title-row">
                  <div className="hr-pill-id">
                    <Hash size={12} />
                    <span>{v.appointment_id ?? '—'}</span>
                  </div>
                  <span className={`hr-status ${st}`}>
                    {v.status || 'Pending'}
                  </span>
                </div>
                <div className="hr-card-line">
                  <User size={13} />
                  <span>{v.visitor_name ?? '—'}</span>
                </div>
                <div className="hr-card-line">
                  <Mail size={13} />
                  <span>{v.official_email ?? '—'}</span>
                </div>
                <div className="hr-card-line">
                  <Phone size={13} />
                  <span>{v.contact_number ?? '—'}</span>
                </div>
                <div className="hr-card-line">
                  <Calendar size={13} />
                  <span>{v.visit_date ?? '—'}</span>
                </div>
              </div>
              {st === 'pending' && (
                <div className="hr-card-actions">
                  <button
                    className="hr-btn approve"
                    onClick={() => handleDecision('visitors', v, 'approve')}
                    disabled={loadingApprove}
                  >
                    {loadingApprove ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    Accept
                  </button>
                  <button
                    className="hr-btn reject"
                    onClick={() => handleDecision('visitors', v, 'reject')}
                    disabled={loadingReject}
                  >
                    {loadingReject ? <Loader2 size={14} className="spin" /> : <X size={14} />}
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="hr-center-root">
      <nav className="hr-center-nav">
        <button className="hr-back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={22} color="#fff" />
        </button>
        <span className="hr-title">HR Request Center</span>
      </nav>

      <div className="hr-center-body">
        <div className="hr-tabs">
          <button
            className={`hr-tab ${tab === 'claims' ? 'active' : ''}`}
            onClick={() => setTab('claims')}
          >
            Staff Claims
          </button>
          <button
            className={`hr-tab ${tab === 'tickets' ? 'active' : ''}`}
            onClick={() => setTab('tickets')}
          >
            Tickets
          </button>
          <button
            className={`hr-tab ${tab === 'visitors' ? 'active' : ''}`}
            onClick={() => setTab('visitors')}
          >
            Visitors
          </button>
        </div>

        {error && (
          <div className="hr-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="hr-loading">
            <Loader2 size={28} className="spin" />
            <span>Loading…</span>
          </div>
        ) : (
          <>
            {tab === 'claims' && renderClaims()}
            {tab === 'tickets' && renderTickets()}
            {tab === 'visitors' && renderVisitors()}
          </>
        )}
      </div>
    </div>
  );
};

export default HRRequestCenter;

