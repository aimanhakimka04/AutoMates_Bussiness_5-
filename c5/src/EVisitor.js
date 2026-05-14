import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, X, MoreVertical, Edit3,
  User, Calendar, Building2, CheckCircle, AlertCircle,
  Clock, MapPin, Phone, Mail, IdCard, FileText,
  Search, Plus, UserPlus, CalendarCheck, RefreshCw,
  Loader2, ArrowRight, Ban, XCircle, Check, Hash,
  AlertTriangle
} from 'lucide-react';
import './EVisitor.css';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

// ─── n8n API helper ─────────────────────────────────────────────────────────────
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'evisitor', ...payload },
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
const purposeOptions = [
  'Business Meeting', 'Interview', 'Delivery', 'Maintenance', 'Personal Visit',
];
const locationOptions = [
  'Lobby', 'Idea Lab 2', 'Idea Lab 5', 'Idea Lab 6', 'Training Room',
];

const formatDateDisplay = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateISO = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const getInitial = (name = '') => (name || '?').charAt(0).toUpperCase();

const statusClass = (s = '') => {
  const l = s.toLowerCase();
  if (l === 'approved') return 'approved';
  if (l === 'pending') return 'pending';
  if (l === 'cancelled') return 'cancelled';
  if (l === 'rejected') return 'rejected';
  return 'pending';
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const EVisitor = ({ userInfo }) => {
  const navigate = useNavigate();

  const hostName = userInfo?.name || '';
  const hostEmail = userInfo?.email || '';

  // ── view state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState('menu');  // menu | list | form | detail
  const [activeListTab, setActiveListTab] = useState('All');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ── form state ─────────────────────────────────────────────────────────────
  const blankForm = {
    appointment_id: null,
    visitor_name: '', ic_number: '', contact_number: '',
    official_email: '', company: '',
    purpose: '', location: '', remarks: '',
  };
  const [formData, setFormData] = useState(blankForm);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── calendar state ─────────────────────────────────────────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState('from');
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  // ── fetch appointments ─────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    if (!hostEmail) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await callN8N('list', {
        user_email: hostEmail,
        user_name: hostName,
      });
      if (res?.data && Array.isArray(res.data)) {
        setAppointments(res.data);
      } else if (res?.result?.data && Array.isArray(res.result.data)) {
        setAppointments(res.result.data);
      } else {
        setAppointments([]);
      }
    } catch {
      setApiError('Unable to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hostEmail, hostName]);

  useEffect(() => {
    if (hostEmail) fetchAppointments();
  }, [hostEmail]); // eslint-disable-line

  useEffect(() => {
    if (view === 'list') fetchAppointments();
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
        appointment_id: item.appointment_id,
        visitor_name: item.visitor_name || '',
        ic_number: item.ic_number || '',
        contact_number: item.contact_number || '',
        official_email: item.official_email || '',
        company: item.company || '',
        purpose: item.purpose_of_visit || '',
        location: item.meeting_location || '',
        remarks: item.remarks || '',
      });
      setFromDate(item.visit_date ? new Date(item.visit_date) : null);
      setToDate(null);
    } else {
      setFormData(blankForm);
      setFromDate(null);
      setToDate(null);
    }
    setOpenMenuId(null);
    goTo('form');
  };

  // ── submit (create / update) ───────────────────────────────────────────────
  const handleSubmit = async () => {
    const { visitor_name, ic_number, contact_number, official_email, company, location } = formData;
    if (!visitor_name || !ic_number || !contact_number || !official_email || !company || !location || !fromDate) {
      setFormError('Please fill in all required fields and select a From Date.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const isEdit = !!formData.appointment_id;
      const action = isEdit ? 'update' : 'pre_register';
      const payload = {
        user_email: hostEmail,
        user_name: hostName,
        visitor_name: visitor_name.toUpperCase(),
        ic_number,
        contact_number,
        email: official_email,
        company,
        purpose: formData.purpose,
        meeting_location: location,
        visit_date: formatDateISO(fromDate),
        to_date: toDate ? formatDateISO(toDate) : formatDateISO(fromDate),
        remarks: formData.remarks,
      };
      if (isEdit) payload.appointment_id = formData.appointment_id;

      const res = await callN8N(action, payload);
      const returnedData = res?.data || res?.result?.data;

      if (isEdit && returnedData) {
        setAppointments(prev => prev.map(a =>
          a.appointment_id === formData.appointment_id
            ? { ...a, ...returnedData, visitor_name: visitor_name.toUpperCase(), meeting_location: location, purpose_of_visit: formData.purpose, visit_date: formatDateISO(fromDate) }
            : a
        ));
      } else {
        // Optimistically add and refetch
        await fetchAppointments();
      }
      setFormData(blankForm);
      setFromDate(null); setToDate(null);
      goTo('list');
    } catch {
      setFormError('Submission failed. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── cancel appointment ─────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!selectedItem) return;
    setCancelLoading(true);
    try {
      await callN8N('cancel', {
        appointment_id: selectedItem.appointment_id,
        reason: 'Cancelled by host',
        user_email: hostEmail,
        user_name: hostName,
      });
      const updated = { ...selectedItem, status: 'Cancelled' };
      setAppointments(prev => prev.map(a =>
        a.appointment_id === selectedItem.appointment_id ? updated : a
      ));
      setSelectedItem(updated);
    } catch {
      // Optimistic update anyway
      const updated = { ...selectedItem, status: 'Cancelled' };
      setAppointments(prev => prev.map(a =>
        a.appointment_id === selectedItem.appointment_id ? updated : a
      ));
      setSelectedItem(updated);
    } finally {
      setCancelLoading(false);
      setCancelModal(false);
    }
  };

  // ── calendar helpers ───────────────────────────────────────────────────────
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
      const isPast = cellDate < today;
      const isBeforeFrom = activeDateField === 'to' && fromDate && cellDate < fromDate;
      const isSelected = activeDateField === 'from'
        ? (fromDate && formatDateISO(fromDate) === formatDateISO(cellDate))
        : (toDate && formatDateISO(toDate) === formatDateISO(cellDate));
      const inRange = fromDate && toDate && cellDate > fromDate && cellDate < toDate;
      days.push(
        <div key={d}
          className={`calendar-day${isSelected ? ' selected' : ''}${inRange ? ' in-range' : ''}${(isPast || isBeforeFrom) ? ' past' : ''}`}
          onClick={() => {
            if (isPast || isBeforeFrom) return;
            if (activeDateField === 'from') {
              setFromDate(cellDate);
              if (toDate && cellDate > toDate) setToDate(null);
            } else {
              setToDate(cellDate);
            }
          }}>{d}
        </div>
      );
    }
    return days;
  };

  // ── filtered list ──────────────────────────────────────────────────────────
  const filteredList = appointments.filter(app => {
    const matchTab =
      activeListTab === 'Approved' ? app.status?.toLowerCase() === 'approved' :
        activeListTab === 'Pending' ? app.status?.toLowerCase() === 'pending' :
          activeListTab === 'Cancelled' ? app.status?.toLowerCase() === 'cancelled' :
            activeListTab === 'Rejected' ? app.status?.toLowerCase() === 'rejected' : true;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (app.visitor_name || '').toLowerCase().includes(q) ||
      (app.company || '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const stats = {
    total: appointments.length,
    approved: appointments.filter(a => a.status?.toLowerCase() === 'approved').length,
    pending: appointments.filter(a => a.status?.toLowerCase() === 'pending').length,
    cancelled: appointments.filter(a => a.status?.toLowerCase() === 'cancelled').length,
    rejected: appointments.filter(a => a.status?.toLowerCase() === 'rejected').length,
  };

  const navTitle = {
    menu: 'eVisitor',
    list: 'Appointments',
    form: formData.appointment_id ? 'Edit Registration' : 'Pre-Register Visitor',
    detail: 'Appointment Detail',
  }[view] || 'eVisitor';

  return (
    <div className="ev-root" onClick={() => setOpenMenuId(null)}>

      {/* ─── TOP NAV ─── */}
      <nav className="ev-nav">
        <button className="ev-nav-back" onClick={handleBack}>
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </button>
        <span className="ev-nav-title">{navTitle}</span>
        {view === 'menu' && hostName && (
          <div className="ev-nav-badge">
            <User size={12} />
            <span>{hostName.split(' ')[0]}</span>
          </div>
        )}
        {view === 'list' && (
          <button className="ev-nav-refresh" onClick={fetchAppointments} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
        )}
      </nav>

      {/* ─── CONTENT ─── */}
      <div className="ev-content">

        {/* ══ MENU VIEW ══ */}
        {view === 'menu' && (
          <div className="ev-menu-view">

            <div className="ev-hero">
              <div className="ev-hero-orb ev-hero-orb1" />
              <div className="ev-hero-orb ev-hero-orb2" />
              <div className="ev-hero-inner">
                <div className="ev-hero-greeting">Welcome back,</div>
                <div className="ev-hero-name">{hostName || 'Employee'}</div>
                <div className="ev-hero-sub">{hostEmail || '—'}</div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="ev-stats-row">
              {loading ? (
                <div className="ev-stat-card" style={{ flex: 1, alignItems: 'center' }}>
                  <Loader2 size={20} className="spin" style={{ color: '#2b1d62' }} />
                </div>
              ) : (
                <>
                  <div className="ev-stat-card ev-stat-total">
                    <div className="ev-stat-val">{stats.total}</div>
                    <div className="ev-stat-lbl">Total</div>
                  </div>
                  <div className="ev-stat-card ev-stat-approved">
                    <CheckCircle size={16} />
                    <div className="ev-stat-val">{stats.approved}</div>
                    <div className="ev-stat-lbl">Approved</div>
                  </div>
                  <div className="ev-stat-card ev-stat-pending">
                    <Clock size={16} />
                    <div className="ev-stat-val">{stats.pending}</div>
                    <div className="ev-stat-lbl">Pending</div>
                  </div>
                </>
              )}
            </div>

            {/* Action Cards */}
            <div className="ev-action-row">
              <div className="ev-action-card ev-action-register"
                onClick={() => openForm()}>
                <div className="ev-action-icon-wrap"><UserPlus size={26} color="#fff" /></div>
                <div className="ev-action-text">
                  <div className="ev-action-title">Pre-Register Visitor</div>
                  <div className="ev-action-sub">Add new visitor appointment</div>
                </div>
                <ArrowRight size={18} color="rgba(255,255,255,0.7)" />
              </div>
              <div className="ev-action-card ev-action-list" onClick={() => goTo('list')}>
                <div className="ev-action-icon-wrap"><CalendarCheck size={26} color="#fff" /></div>
                <div className="ev-action-text">
                  <div className="ev-action-title">View Appointments</div>
                  <div className="ev-action-sub">Manage all bookings</div>
                </div>
                <ArrowRight size={18} color="rgba(255,255,255,0.7)" />
              </div>
            </div>

            {/* Recent Visits */}
            <div className="ev-recent-section">
              <div className="ev-section-header">
                <span className="ev-section-title">Recent Visits</span>
                <button className="ev-see-all" onClick={() => goTo('list')}>See All</button>
              </div>
              {loading ? (
                <div className="ev-recent-loading">
                  <Loader2 size={18} className="spin" />
                  <span>Loading…</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="ev-recent-empty">No appointments yet</div>
              ) : (
                appointments.slice(0, 3).map(item => (
                  <div key={item.appointment_id} className="ev-recent-card"
                    onClick={() => { setSelectedItem(item); goTo('detail'); }}>
                    <div className={`ev-recent-dot ${statusClass(item.status)}`} />
                    <div className="ev-recent-info">
                      <div className="ev-recent-name">{item.visitor_name}</div>
                      <div className="ev-recent-meta">{item.company} · {formatDateDisplay(item.visit_date)}</div>
                    </div>
                    <span className={`ev-chip ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══ APPOINTMENT LIST VIEW ══ */}
        {view === 'list' && (
          <div className="ev-list-view">
            {/* Search Bar */}
            <div className="ev-search-wrap">
              <Search size={16} color="#999" />
              <input className="ev-search-input" placeholder="Search visitor or company…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button className="ev-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={16} color="#999" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="ev-tabs">
              {['All', 'Approved', 'Pending', 'Rejected', 'Cancelled'].map(tab => (
                <button key={tab} className={`ev-tab ${activeListTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveListTab(tab)}>
                  {tab}
                  <span className="ev-tab-count">
                    {tab === 'All' ? appointments.length :
                      tab === 'Approved' ? stats.approved :
                        tab === 'Pending' ? stats.pending :
                          tab === 'Rejected' ? stats.rejected :
                            stats.cancelled}
                  </span>
                </button>
              ))}
            </div>

            {apiError && (
              <div className="ev-api-error">
                <AlertTriangle size={15} />
                <span>{apiError}</span>
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="ev-loading-state">
                <Loader2 size={32} className="spin" />
                <span>Loading appointments…</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="ev-empty-state">
                <CalendarCheck size={52} strokeWidth={1} color="#ccc" />
                <p>No {activeListTab.toLowerCase()} appointments</p>
              </div>
            ) : (
              <div className="ev-cards-container">
                {filteredList.map(item => (
                  <div key={item.appointment_id} className="ev-item-card"
                    onClick={() => { setSelectedItem(item); goTo('detail'); }}>
                    <div className={`ev-card-accent ${statusClass(item.status)}`} />
                    <div className="ev-card-header">
                      <div className="ev-visitor-meta">
                        <div className="ev-visitor-avatar">{getInitial(item.visitor_name)}</div>
                        <div>
                          <div className="ev-visitor-name">{item.visitor_name}</div>
                          <span className={`ev-status-badge ${statusClass(item.status)}`}>
                            {statusClass(item.status) === 'approved' ? <CheckCircle size={10} /> :
                              statusClass(item.status) === 'cancelled' ? <Ban size={10} /> :
                                statusClass(item.status) === 'rejected' ? <XCircle size={10} /> :
                                  <AlertCircle size={10} />}
                            {item.status}
                          </span>
                        </div>
                      </div>
                      {!['cancelled', 'rejected'].includes(item.status?.toLowerCase()) && (
                        <div className="ev-more-wrapper" onClick={e => e.stopPropagation()}>
                          <button className="ev-more-btn"
                            onClick={() => setOpenMenuId(openMenuId === item.appointment_id ? null : item.appointment_id)}>
                            <MoreVertical size={18} color="#bbb" />
                          </button>
                          {openMenuId === item.appointment_id && (
                            <div className="ev-dropdown">
                              <div className="ev-dropdown-item" onClick={() => openForm(item)}>
                                <Edit3 size={13} /><span>Edit</span>
                              </div>
                              <div className="ev-dropdown-item ev-dropdown-delete"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setOpenMenuId(null);
                                  setCancelModal(true);
                                }}>
                                <Ban size={13} /><span>Cancel</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ev-card-divider" />
                    <div className="ev-card-body">
                      <div className="ev-info-row"><Building2 size={13} color="#6c47d9" /><span>{item.company}</span></div>
                      <div className="ev-info-row"><Calendar size={13} color="#6c47d9" /><span>{formatDateDisplay(item.visit_date)}</span></div>
                      {item.meeting_location && <div className="ev-info-row"><MapPin size={13} color="#6c47d9" /><span>{item.meeting_location}</span></div>}
                      {item.purpose_of_visit && <div className="ev-info-row"><FileText size={13} color="#6c47d9" /><span>{item.purpose_of_visit}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAB */}
            <div className="ev-fab-wrap">
              <button className="ev-fab" onClick={() => openForm()}>
                <Plus size={24} color="#fff" />
              </button>
            </div>
          </div>
        )}

        {/* ══ PRE-REGISTER FORM ══ */}
        {view === 'form' && (
          <div className="ev-form-view">

            {/* Host Info Banner */}
            <div className="ev-host-banner">
              <div className="ev-host-avatar">{getInitial(hostName)}</div>
              <div className="ev-host-info">
                <div className="ev-host-label">Registering as Host</div>
                <div className="ev-host-name">{hostName || '—'}</div>
                <div className="ev-host-email">{hostEmail || '—'}</div>
              </div>
            </div>

            {/* Date Selection */}
            <p className="ev-form-section-label">Visit Period</p>
            <div className="ev-date-row">
              <div className={`ev-date-box${activeDateField === 'from' && isCalendarOpen ? ' ev-date-active' : ''}`}
                onClick={() => { setActiveDateField('from'); setIsCalendarOpen(true); }}>
                <Calendar size={16} color="#6c47d9" />
                <div className="ev-date-content">
                  <span className="ev-date-label">From Date <span style={{ color: '#ef4444' }}>*</span></span>
                  <span className="ev-date-value">{fromDate ? formatDateISO(fromDate) : '— Select —'}</span>
                </div>
              </div>
              <div className="ev-date-arrow">→</div>
              <div className={`ev-date-box${activeDateField === 'to' && isCalendarOpen ? ' ev-date-active' : ''}`}
                onClick={() => { setActiveDateField('to'); setIsCalendarOpen(true); }}>
                <Calendar size={16} color="#6c47d9" />
                <div className="ev-date-content">
                  <span className="ev-date-label">To Date</span>
                  <span className="ev-date-value">{toDate ? formatDateISO(toDate) : '— Select —'}</span>
                </div>
              </div>
            </div>

            {/* Visitor Information */}
            <p className="ev-form-section-label">Visitor Information</p>
            <div className="ev-form-card">
              <div className="ev-field-group">
                <label className="ev-label"><User size={13} /> Full Name <span className="ev-req">*</span></label>
                <input className="ev-input" placeholder="Full name as per IC"
                  value={formData.visitor_name}
                  onChange={e => setFormData(f => ({ ...f, visitor_name: e.target.value }))} />
              </div>
              <div className="ev-field-group">
                <label className="ev-label"><IdCard size={13} /> Identity No. <span className="ev-req">*</span></label>
                <input className="ev-input" placeholder="e.g. 900101-14-5566"
                  value={formData.ic_number}
                  onChange={e => setFormData(f => ({ ...f, ic_number: e.target.value }))} />
              </div>
              <div className="ev-field-row">
                <div className="ev-field-group ev-field-half">
                  <label className="ev-label"><Phone size={13} /> Contact <span className="ev-req">*</span></label>
                  <input className="ev-input" placeholder="01X-XXXXXXX"
                    value={formData.contact_number}
                    onChange={e => setFormData(f => ({ ...f, contact_number: e.target.value }))} />
                </div>
                <div className="ev-field-group ev-field-half">
                  <label className="ev-label"><Mail size={13} /> Email <span className="ev-req">*</span></label>
                  <input className="ev-input" type="email" placeholder="email@domain.com"
                    value={formData.official_email}
                    onChange={e => setFormData(f => ({ ...f, official_email: e.target.value }))} />
                </div>
              </div>
              <div className="ev-field-group">
                <label className="ev-label"><Building2 size={13} /> Company <span className="ev-req">*</span></label>
                <input className="ev-input" placeholder="Organisation name"
                  value={formData.company}
                  onChange={e => setFormData(f => ({ ...f, company: e.target.value }))} />
              </div>
            </div>

            {/* Visit Details */}
            <p className="ev-form-section-label">Visit Details</p>
            <div className="ev-form-card">
              <div className="ev-field-group">
                <label className="ev-label"><FileText size={13} /> Purpose of Visit</label>
                <div className="ev-select-wrap">
                  <select className="ev-select" value={formData.purpose}
                    onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))}>
                    <option value="">Select purpose…</option>
                    {purposeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={16} color="#888" className="ev-select-arrow" />
                </div>
              </div>
              <div className="ev-field-group">
                <label className="ev-label"><MapPin size={13} /> Meeting Location <span className="ev-req">*</span></label>
                <div className="ev-select-wrap">
                  <select className="ev-select" value={formData.location}
                    onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}>
                    <option value="">Select location…</option>
                    {locationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={16} color="#888" className="ev-select-arrow" />
                </div>
              </div>
              <div className="ev-field-group">
                <label className="ev-label"><FileText size={13} /> Remarks (Optional)</label>
                <textarea className="ev-textarea" rows={3} placeholder="Any special instructions…"
                  value={formData.remarks}
                  onChange={e => setFormData(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>

            {formError && (
              <div className="ev-form-error">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <button className="ev-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><Loader2 size={18} className="spin" /> Submitting…</>
                : formData.appointment_id ? '💾  Save Changes' : '✅  Register Visitor'}
            </button>
          </div>
        )}

        {/* ══ DETAIL VIEW ══ */}
        {view === 'detail' && selectedItem && (() => {
          const t = selectedItem;
          const sc = statusClass(t.status);
          const canCancel = sc !== 'cancelled' && sc !== 'rejected';
          return (
            <div className="ev-detail-view">
              {/* Banner */}
              <div className={`ev-detail-banner ev-detail-banner-${sc}`}>
                <div className="ev-detail-banner-avatar">{getInitial(t.visitor_name)}</div>
                <div className="ev-detail-banner-info">
                  <div className="ev-detail-banner-name">{t.visitor_name}</div>
                  <div className="ev-detail-banner-company">{t.company}</div>
                </div>
                <span className={`ev-status-badge ${sc} ev-status-badge-lg`}>
                  {sc === 'approved' ? <CheckCircle size={11} /> :
                    sc === 'cancelled' ? <Ban size={11} /> :
                      sc === 'rejected' ? <XCircle size={11} /> :
                        <AlertCircle size={11} />}
                  {t.status}
                </span>
              </div>

              <div className="ev-detail-body">
                {/* Appointment ID */}
                <div className="ev-detail-id">
                  <Hash size={13} color="#999" />
                  <span>Appointment #{t.appointment_id}</span>
                </div>

                {/* Visit Info */}
                <div className="ev-detail-section">
                  <h4 className="ev-detail-section-title">Visit Information</h4>
                  <div className="ev-detail-grid">
                    <div className="ev-detail-item">
                      <span className="ev-dii-label">Visit Date</span>
                      <span className="ev-dii-value">{formatDateDisplay(t.visit_date)}</span>
                    </div>
                    <div className="ev-detail-item">
                      <span className="ev-dii-label">Location</span>
                      <span className="ev-dii-value">{t.meeting_location || '—'}</span>
                    </div>
                    <div className="ev-detail-item">
                      <span className="ev-dii-label">Purpose</span>
                      <span className="ev-dii-value">{t.purpose_of_visit || '—'}</span>
                    </div>
                    {t.host_name && (
                      <div className="ev-detail-item">
                        <span className="ev-dii-label">Host</span>
                        <span className="ev-dii-value">{t.host_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visitor Info */}
                <div className="ev-detail-section">
                  <h4 className="ev-detail-section-title">Visitor Details</h4>
                  <div className="ev-detail-grid">
                    <div className="ev-detail-item">
                      <span className="ev-dii-label">IC / ID No.</span>
                      <span className="ev-dii-value">{t.ic_number || '—'}</span>
                    </div>
                    <div className="ev-detail-item">
                      <span className="ev-dii-label">Contact</span>
                      <span className="ev-dii-value">{t.contact_number || '—'}</span>
                    </div>
                    <div className="ev-detail-item ev-detail-full">
                      <span className="ev-dii-label">Email</span>
                      <span className="ev-dii-value">{t.official_email || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {t.remarks && (
                  <div className="ev-detail-section">
                    <h4 className="ev-detail-section-title">Remarks</h4>
                    <p className="ev-detail-remarks">{t.remarks}</p>
                  </div>
                )}

                {/* Cancellation Reason */}
                {t.cancellation_reason && (
                  <div className="ev-detail-section">
                    <h4 className="ev-detail-section-title" style={{ color: '#ef4444' }}>Cancellation Reason</h4>
                    <p className="ev-detail-remarks">{t.cancellation_reason}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {sc === 'rejected' && (t.rejection_reason || t.reject_reason) && (
                  <div className="ev-detail-section">
                    <h4 className="ev-detail-section-title" style={{ color: '#dc2626' }}>Rejection Reason</h4>
                    <p className="ev-detail-remarks">{t.rejection_reason || t.reject_reason}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="ev-detail-footer">
                {canCancel && (
                  <>
                    <button className="ev-detail-edit-btn" onClick={() => openForm(t)}>
                      <Edit3 size={16} /> Edit
                    </button>
                    <button className="ev-detail-cancel-btn" onClick={() => setCancelModal(true)}>
                      <Ban size={16} /> Cancel Visit
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── CALENDAR MODAL ─── */}
      {isCalendarOpen && (
        <div className="ev-cal-overlay" onClick={() => setIsCalendarOpen(false)}>
          <div className="ev-cal-modal" onClick={e => e.stopPropagation()}>
            <div className="ev-cal-header">
              <span>Select {activeDateField === 'from' ? 'From' : 'To'} Date</span>
              <button className="ev-cal-close" onClick={() => setIsCalendarOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ev-cal-tabs">
              <button className={`ev-cal-tab${activeDateField === 'from' ? ' active' : ''}`}
                onClick={() => setActiveDateField('from')}>
                From: {fromDate ? formatDateISO(fromDate) : '—'}
              </button>
              <button className={`ev-cal-tab${activeDateField === 'to' ? ' active' : ''}`}
                onClick={() => setActiveDateField('to')}>
                To: {toDate ? formatDateISO(toDate) : '—'}
              </button>
            </div>
            <div className="ev-cal-nav">
              <button onClick={() => changeMonth(-1)} className="ev-cal-arrow">‹</button>
              <span className="ev-cal-month">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="ev-cal-arrow">›</button>
            </div>
            <div className="ev-cal-weekdays">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="ev-cal-grid">{renderCalendarDays()}</div>
            <button className="ev-cal-confirm" onClick={() => setIsCalendarOpen(false)}>
              <Check size={16} /> Confirm
            </button>
          </div>
        </div>
      )}

      {/* ─── CANCEL CONFIRM MODAL ─── */}
      {cancelModal && selectedItem && (
        <div className="ev-modal-overlay" onClick={() => !cancelLoading && setCancelModal(false)}>
          <div className="ev-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="ev-cancel-modal-icon">
              <XCircle size={44} color="#ef4444" />
            </div>
            <h3>Cancel Appointment?</h3>
            <p>
              Are you sure you want to cancel the appointment for{' '}
              <strong>{selectedItem.visitor_name}</strong>? This cannot be undone.
            </p>
            <div className="ev-cancel-modal-actions">
              <button className="ev-cancel-no" onClick={() => setCancelModal(false)} disabled={cancelLoading}>
                Keep It
              </button>
              <button className="ev-cancel-yes" onClick={handleCancel} disabled={cancelLoading}>
                {cancelLoading
                  ? <><Loader2 size={15} className="spin" /> Cancelling…</>
                  : <><Ban size={15} /> Yes, Cancel</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EVisitor;