import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Calendar,
  X, Edit3, MapPin, Clock, MoreVertical, Navigation,
  Bus, ArrowRight, ArrowLeftRight, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, XCircle, Ban, Users, Route,
  Search, Filter, Check, Ticket, History, ChevronUp,
  Star, Zap, TrendingUp, Info, QrCode, Copy, RotateCcw
} from 'lucide-react';
import './Transport.css';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'transport', ...payload },
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
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateISO = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// Parses any time value (ISO string or "HH:MM") → "HH:MM"
const fmtTime = (t) => {
  if (!t) return '—';
  const s = String(t);
  if (s.includes('T')) {
    const dt = new Date(s);
    if (!isNaN(dt)) return `${String(dt.getUTCHours()).padStart(2,'0')}:${String(dt.getUTCMinutes()).padStart(2,'0')}`;
  }
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
};

const getHour = (t) => {
  if (!t) return 12;
  const s = String(t);
  if (s.includes('T')) { const dt = new Date(s); return isNaN(dt) ? 12 : dt.getUTCHours(); }
  return parseInt(s.slice(0, 2), 10) || 12;
};

const statusMeta = (s = '') => {
  const l = s.toLowerCase();
  if (l === 'confirmed' || l === 'approved') return { color: '#10b981', bg: '#dcfce7', dot: '#10b981', label: 'Confirmed' };
  if (l === 'pending')  return { color: '#f59e0b', bg: '#fef3c7', dot: '#f59e0b', label: 'Pending' };
  if (l === 'cancelled') return { color: '#ef4444', bg: '#fee2e2', dot: '#ef4444', label: 'Cancelled' };
  return { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af', label: s || 'Unknown' };
};

const timeUntil = (dateStr, timeStr) => {
  if (!timeStr) return null;
  try {
    // If timeStr is already a full ISO string, use it directly
    const dt = String(timeStr).includes('T')
      ? new Date(timeStr)
      : new Date(`${dateStr}T${String(timeStr).length === 5 ? timeStr + ':00' : timeStr}`);
    const diff = dt - new Date();
    if (diff < 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return null;
    if (h > 0) return `in ${h}h ${m}m`;
    if (m > 0) return `in ${m}m`;
    return 'Now';
  } catch { return null; }
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  return fmtDateISO(new Date()) === dateStr.slice(0, 10);
};

const now = new Date();
const todayISO = fmtDateISO(now);

const LOCATIONS = ['8th & Stellar', 'Naga Emas', 'Sri Petaling'];

// ─── Toast Component ──────────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="tr-toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`tr-toast tr-toast-${t.type}`}>
        {t.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        <span>{t.msg}</span>
      </div>
    ))}
  </div>
);

// ─── Seat Bar Component ───────────────────────────────────────────────────────
const SeatBar = ({ available, total = 40 }) => {
  if (available == null) return null;
  const pct = Math.max(0, Math.min(100, (available / total) * 100));
  const color = pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444';
  return (
    <div className="tr-seat-bar-wrap">
      <div className="tr-seat-bar-track">
        <div className="tr-seat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ color }} className="tr-seat-bar-label">{available} seats left</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
const Transport = ({ userInfo }) => {
  const navigate = useNavigate();
  const userEmail = userInfo?.email || '';
  const userName  = userInfo?.name  || '';

  // ── view & tab ────────────────────────────────────────────────────────────
  const [view, setView]           = useState('main');
  const [activeTab, setActiveTab] = useState('Booking');

  // ── data ──────────────────────────────────────────────────────────────────
  const [bookings, setBookings]   = useState([]);
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [apiError, setApiError]   = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // ── timetable ─────────────────────────────────────────────────────────────
  const [timetableRoutes, setTimetableRoutes] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [transportRoutes, setTransportRoutes] = useState([]);

  // ── form ──────────────────────────────────────────────────────────────────
  const [pickup,      setPickup]      = useState('');
  const [dropoff,     setDropoff]     = useState('');
  const [bookingDate, setBookingDate] = useState(todayISO);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const [swapping,    setSwapping]    = useState(false);

  // ── calendar ──────────────────────────────────────────────────────────────
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [viewDate,  setViewDate]  = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  // ── booking history (show cancelled) ─────────────────────────────────────
  const [showHistory, setShowHistory]     = useState(false);
  const [statusFilter, setStatusFilter]   = useState('all'); // all | confirmed | pending
  const [searchQuery, setSearchQuery]     = useState('');
  const [showSearch, setShowSearch]       = useState(false);

  // ── toast ─────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = (msg, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // ── fetch bookings ─────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true); setApiError('');
    try {
      const res = await callN8N('get_bookings', { employee_email: userEmail });
      const rows = res?.data ?? res?.result?.data ?? [];
      setBookings(Array.isArray(rows) ? rows : []);
    } catch {
      setApiError('Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { if (userEmail) fetchBookings(); }, [userEmail]); // eslint-disable-line
  useEffect(() => { if (view === 'main') fetchBookings(); }, [view]); // eslint-disable-line

  // ── fetch routes ──────────────────────────────────────────────────────────
  const fetchTransportRoutes = useCallback(async () => {
    try {
      const res = await callN8N('get_routes', {});
      const raw = res?.data ?? res?.result?.data ?? res?.routes ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const routes = list.map(r => ({
        from_location: r.from_location ?? r.from ?? r.pickup,
        to_location:   r.to_location   ?? r.to   ?? r.dropoff,
      })).filter(r => r.from_location && r.to_location);
      setTransportRoutes(routes);
      return routes;
    } catch {
      setTransportRoutes([]);
      return [];
    }
  }, []);

  // ── fetch timetable ───────────────────────────────────────────────────────
  const fetchTimetable = useCallback(async (routesOverride) => {
    setTimetableLoading(true);
    setTimetableRoutes([]);
    try {
      let routes = Array.isArray(routesOverride) ? routesOverride : transportRoutes;
      if (routes.length === 0) routes = await fetchTransportRoutes();
      const routeList = routes.length > 0 ? routes : [
        { from_location: '8th & Stellar', to_location: 'Naga Emas' },
        { from_location: 'Naga Emas', to_location: '8th & Stellar' },
        { from_location: '8th & Stellar', to_location: 'Sri Petaling' },
        { from_location: 'Sri Petaling', to_location: '8th & Stellar' },
      ];
      const results = await Promise.all(
        routeList.map(async ({ from_location, to_location }) => {
          const res = await callN8N('get_sessions', {
            from_location, to_location,
            booking_date: todayISO,
            employee_email: userEmail,
          });
          const rows = res?.data ?? res?.result?.data ?? [];
          const sessions = Array.isArray(rows) ? rows : [];
          return { from_location, to_location, route: `${from_location} → ${to_location}`, sessions };
        })
      );
      setTimetableRoutes(results);
    } catch {
      setTimetableRoutes([]);
    } finally {
      setTimetableLoading(false);
    }
  }, [userEmail, transportRoutes, fetchTransportRoutes]);

  useEffect(() => {
    if (activeTab === 'Timetable' && userEmail) {
      fetchTransportRoutes().then(routes => {
        setTransportRoutes(routes);
        fetchTimetable(routes);
      });
    }
  }, [activeTab, userEmail]); // eslint-disable-line

  // ── fetch sessions ────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!pickup || !dropoff || !bookingDate) return;
    setSessionsLoading(true); setFormError('');
    try {
      const res = await callN8N('get_sessions', {
        from_location: pickup, to_location: dropoff,
        booking_date: bookingDate, employee_email: userEmail,
      });
      const rows = res?.data ?? res?.result?.data ?? [];
      const sorted = (Array.isArray(rows) ? rows : []).sort((a, b) => {
        const at = a.session_time || ''; const bt = b.session_time || '';
        return at.localeCompare(bt);
      });
      setSessions(sorted);
    } catch {
      setFormError('Unable to load available sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, [pickup, dropoff, bookingDate, userEmail]);

  // ── swap route ────────────────────────────────────────────────────────────
  const handleSwap = () => {
    if (!pickup && !dropoff) return;
    setSwapping(true);
    setTimeout(() => {
      const tmp = pickup;
      setPickup(dropoff);
      setDropoff(tmp);
      setSessions([]);
      setSwapping(false);
    }, 250);
  };

  // ── book ──────────────────────────────────────────────────────────────────
  const handleBook = async (session) => {
    setSubmitting(true); setFormError('');
    try {
      const res = await callN8N('create_booking', {
        // field names match exactly what the n8n DB query uses
        email:          userEmail,
        employee_email: userEmail,
        employee_name:  userName,
        session_id:     session.session_id,
        sessionId:      session.session_id,   // alias for n8n extractor
        seatNumber:     session.seat_number ?? 0,
        booking_date:   bookingDate,
        from_location:  pickup,
        to_location:    dropoff,
      });

      // Explicit failure check — backend returns success:false without throwing
      if (res?.success === false) {
        setFormError(res?.message || 'Booking failed. Please try again.');
        return;
      }

      const data = res?.data ?? res?.result?.data ?? res ?? {};
      setLastBooking({
        booking_id:      data.booking_id    || '—',
        from_location:   pickup,
        to_location:     dropoff,
        session_time:    session.session_time,
        booking_date:    bookingDate,
        status:          data.status        || 'Confirmed',
        seats_available: session.seats_available,
      });
      setView('success');
    } catch (err) {
      setFormError('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
      // Refresh in background — don't let this failure affect the booking result
      fetchBookings().catch(() => {});
    }
  };

  // ── cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!selectedBooking) return;
    setCancelLoading(true);
    try {
      await callN8N('cancel_booking', {
        booking_id: selectedBooking.booking_id,
        employee_email: userEmail,
      });
    } catch { /* optimistic */ } finally {
      const updated = { ...selectedBooking, status: 'Cancelled' };
      setBookings(prev => prev.map(b => b.booking_id === selectedBooking.booking_id ? updated : b));
      setSelectedBooking(updated);
      setCancelLoading(false);
      setCancelModal(false);
      addToast('Booking cancelled successfully.');
    }
  };

  // ── rebook (pre-fill form from existing booking) ──────────────────────────
  const handleRebook = (b) => {
    setPickup(b.from_location || '');
    setDropoff(b.to_location || '');
    setBookingDate(todayISO);
    setSessions([]);
    setFormError('');
    setView('form');
  };

  // ── copy booking ID ───────────────────────────────────────────────────────
  const handleCopyId = (id) => {
    navigator.clipboard?.writeText(String(id)).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    addToast(`Booking ID #${id} copied!`);
  };

  // ── calendar ──────────────────────────────────────────────────────────────
  const changeMonth = (offset) =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));

  const renderCalDays = () => {
    const y = viewDate.getFullYear(); const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(<span key={`e${i}`} className="tr-day-empty" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = new Date(y, m, d, 23, 59) < now;
      const isSel  = bookingDate === ds;
      const isTod  = ds === todayISO;
      days.push(
        <div key={d}
          className={`tr-cal-day${isSel ? ' selected' : ''}${isPast ? ' past' : ''}${isTod && !isSel ? ' today' : ''}`}
          onClick={() => { if (!isPast) { setBookingDate(ds); setSessions([]); } }}>
          {d}
        </div>
      );
    }
    return days;
  };

  const handleBack = () => {
    if (view === 'results') { setView('form'); return; }
    if (view === 'form')    { setView('main'); return; }
    if (view === 'success') { setView('main'); return; }
    if (view === 'detail')  { setView('main'); return; }
    navigate('/');
  };

  const navTitle = {
    main: 'Transport', form: 'New Booking',
    results: 'Select Session', success: 'Transport', detail: 'Booking Detail',
  }[view] || 'Transport';

  const openDetail = (b) => { setSelectedBooking(b); setView('detail'); };

  // ── derived stats ─────────────────────────────────────────────────────────
  const activeBookings    = bookings.filter(b => b.status?.toLowerCase() !== 'cancelled');
  const cancelledBookings = bookings.filter(b => b.status?.toLowerCase() === 'cancelled');
  const todayBookings     = activeBookings.filter(b => isToday(b.booking_date || b.booking_time));
  const upcomingToday     = todayBookings.length;

  // ── filtered bookings ─────────────────────────────────────────────────────
  const filteredBookings = activeBookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status?.toLowerCase().includes(statusFilter);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (b.from_location || '').toLowerCase().includes(q) ||
      (b.to_location   || '').toLowerCase().includes(q) ||
      String(b.booking_id || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="tr-root" onClick={() => setOpenMenuId(null)}>

      {/* ── TOAST ── */}
      <Toast toasts={toasts} />

      {/* ── NAV ── */}
      <nav className="tr-nav">
        <button className="tr-nav-back" onClick={handleBack}>
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </button>
        <span className="tr-nav-title">{navTitle}</span>
        {view === 'main' && (
          <div className="tr-nav-actions">
            {upcomingToday > 0 && (
              <div className="tr-nav-badge">
                <Zap size={11} /> {upcomingToday} today
              </div>
            )}
            <button className="tr-nav-refresh" onClick={fetchBookings} disabled={loading}>
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>
          </div>
        )}
      </nav>

      {/* ── CONTENT ── */}
      <div className="tr-content">

        {/* ══ MAIN VIEW ══ */}
        {view === 'main' && (
          <div className="tr-main">

            {/* Hero */}
            <div className="tr-hero">
              <div className="tr-hero-orb tr-orb1" />
              <div className="tr-hero-orb tr-orb2" />
              <div className="tr-hero-inner">
                <div className="tr-hero-label">Shuttle Service</div>
                <div className="tr-hero-title">Book Your Ride</div>
                <div className="tr-hero-sub">Fast · Reliable · On-time</div>
              </div>
              <img src="/icon_img/transportpage.png" alt="" className="tr-hero-img" />
            </div>

            {/* Stats Strip */}
            <div className="tr-stats-strip">
              <div className="tr-stat-card tr-stat-total">
                <span className="tr-stat-val">{activeBookings.length}</span>
                <span className="tr-stat-lbl">Total</span>
              </div>
              <div className="tr-stat-card tr-stat-today">
                <span className="tr-stat-val">{upcomingToday}</span>
                <span className="tr-stat-lbl">Today</span>
              </div>
              <div className="tr-stat-card tr-stat-cancelled">
                <span className="tr-stat-val">{cancelledBookings.length}</span>
                <span className="tr-stat-lbl">Cancelled</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="tr-tabs">
              {['Booking', 'Timetable'].map(t => (
                <button key={t} className={`tr-tab${activeTab === t ? ' active' : ''}`}
                  onClick={() => setActiveTab(t)}>{t}</button>
              ))}
            </div>

            {activeTab === 'Booking' ? (
              <div className="tr-booking-panel">
                {apiError && (
                  <div className="tr-error-banner">
                    <AlertTriangle size={14} /><span>{apiError}</span>
                  </div>
                )}

                {/* Filter & Search bar */}
                <div className="tr-filter-row">
                  <div className="tr-filter-chips">
                    {['all', 'confirmed', 'pending'].map(f => (
                      <button key={f}
                        className={`tr-filter-chip${statusFilter === f ? ' active' : ''}`}
                        onClick={() => setStatusFilter(f)}>
                        {f === 'all' ? 'All' : f === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                      </button>
                    ))}
                  </div>
                  <button className="tr-search-toggle" onClick={() => setShowSearch(s => !s)}>
                    <Search size={15} color={showSearch ? '#2b1d62' : '#999'} />
                  </button>
                </div>

                {showSearch && (
                  <div className="tr-search-box">
                    <Search size={14} color="#aaa" />
                    <input
                      className="tr-search-input"
                      placeholder="Search by location or booking ID…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    {searchQuery && (
                      <button className="tr-search-clear" onClick={() => setSearchQuery('')}>
                        <X size={14} color="#aaa" />
                      </button>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="tr-loading">
                    <div className="tr-loading-ring" />
                    <span>Loading bookings…</span>
                  </div>
                ) : filteredBookings.length === 0 && !showHistory ? (
                  <div className="tr-empty">
                    <div className="tr-empty-icon">
                      <Bus size={30} color="#ccc" strokeWidth={1.5} />
                    </div>
                    <p>{searchQuery ? 'No matching bookings' : 'No active bookings'}</p>
                    <span>{searchQuery ? 'Try a different search' : 'Tap New Booking to get started'}</span>
                  </div>
                ) : (
                  <div className="tr-cards">
                    {filteredBookings.length > 0 && (
                      <div className="tr-section-header">
                        <Bus size={17} color="#2b1d62" /><span>My Bookings</span>
                        <span className="tr-section-count">{filteredBookings.length}</span>
                      </div>
                    )}
                    {filteredBookings.map(b => {
                      const sm = statusMeta(b.status);
                      const countdown = timeUntil(
                        (b.booking_date || b.booking_time || '').slice(0, 10),
                        b.session_time || ''
                      );
                      return (
                        <div key={b.booking_id} className="tr-card" onClick={() => openDetail(b)}>
                          <div className="tr-card-stripe" style={{ background: sm.dot }} />
                          <div className="tr-card-main">
                            <div className="tr-card-head">
                              <div className="tr-card-id">
                                <Bus size={14} color="#6c47d9" />
                                <span>#{b.booking_id}</span>
                                {countdown && (
                                  <span className="tr-countdown">{countdown}</span>
                                )}
                              </div>
                              <div className="tr-card-actions-row" onClick={e => e.stopPropagation()}>
                                <span className="tr-status-pill" style={{ color: sm.color, background: sm.bg }}>
                                  <span className="tr-dot" style={{ background: sm.dot }} />
                                  {sm.label}
                                </span>
                                {b.status?.toLowerCase() !== 'cancelled' && (
                                  <div className="tr-more-wrap">
                                    <button className="tr-more-btn"
                                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === b.booking_id ? null : b.booking_id); }}>
                                      <MoreVertical size={17} color="#bbb" />
                                    </button>
                                    {openMenuId === b.booking_id && (
                                      <div className="tr-dropdown">
                                        <div className="tr-drop-item" onClick={() => { openDetail(b); setOpenMenuId(null); }}>
                                          <Navigation size={13} /><span>View Detail</span>
                                        </div>
                                        <div className="tr-drop-item" onClick={() => { handleRebook(b); setOpenMenuId(null); }}>
                                          <RotateCcw size={13} /><span>Rebook Route</span>
                                        </div>
                                        <div className="tr-drop-item tr-drop-cancel"
                                          onClick={() => { setSelectedBooking(b); setOpenMenuId(null); setCancelModal(true); }}>
                                          <Ban size={13} /><span>Cancel Ride</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Route visualization */}
                            <div className="tr-card-route">
                              <div className="tr-route-point">
                                <div className="tr-route-dot origin" />
                                <span>{b.from_location || '—'}</span>
                              </div>
                              <div className="tr-route-line-wrap">
                                <div className="tr-route-line" />
                                <ArrowRight size={10} color="#c4b5fd" />
                              </div>
                              <div className="tr-route-point">
                                <div className="tr-route-dot dest" />
                                <span>{b.to_location || '—'}</span>
                              </div>
                            </div>

                            <div className="tr-card-meta">
                              <span><Calendar size={11} />{fmtDate(b.booking_date || b.booking_time)}</span>
                              <span><Clock size={11} />{fmtTime(b.session_time)}</span>
                              {b.driver_name && <span><Users size={11} />{b.driver_name}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Cancelled history */}
                {cancelledBookings.length > 0 && (
                  <div className="tr-history-section">
                    <button className="tr-history-toggle" onClick={() => setShowHistory(h => !h)}>
                      <History size={14} />
                      <span>Cancelled Bookings ({cancelledBookings.length})</span>
                      {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showHistory && (
                      <div className="tr-history-list">
                        {cancelledBookings.map(b => (
                          <div key={b.booking_id} className="tr-history-card" onClick={() => openDetail(b)}>
                            <div className="tr-hc-route">
                              <span>{b.from_location}</span>
                              <ArrowRight size={11} color="#ccc" />
                              <span>{b.to_location}</span>
                            </div>
                            <div className="tr-hc-meta">
                              <span>#{b.booking_id}</span>
                              <span>{fmtDate(b.booking_date || b.booking_time)}</span>
                              <button className="tr-hc-rebook" onClick={e => { e.stopPropagation(); handleRebook(b); }}>
                                <RotateCcw size={11} /> Rebook
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* TIMETABLE */
              <div className="tr-timetable">
                <div className="tr-tt-notice">
                  <AlertTriangle size={13} color="#f59e0b" />
                  <span>Mon – Fri, except Public Holidays. Live data from transport service.</span>
                </div>
                {timetableLoading ? (
                  <div className="tr-loading">
                    <div className="tr-loading-ring" />
                    <span>Loading timetable…</span>
                  </div>
                ) : timetableRoutes.length === 0 ? (
                  <div className="tr-empty">
                    <div className="tr-empty-icon"><Route size={26} color="#ccc" /></div>
                    <p>No routes available</p>
                    <span>Use Booking tab to search a route</span>
                  </div>
                ) : (
                  timetableRoutes.map((tr, i) => (
                    <div key={i} className="tr-tt-card">
                      <div className="tr-tt-route">
                        <div className="tr-tt-route-dots">
                          <div className="tr-route-dot origin" />
                          <div className="tr-route-line" style={{ margin: '2px 0 2px 4px' }} />
                          <div className="tr-route-dot dest" />
                        </div>
                        <div className="tr-tt-route-text">
                          <span className="tr-tt-from">{tr.from_location}</span>
                          <span className="tr-tt-to">{tr.to_location}</span>
                        </div>
                        <span className="tr-tt-count">
                          {tr.sessions.length} {tr.sessions.length === 1 ? 'trip' : 'trips'}
                        </span>
                      </div>
                      <div className="tr-tt-chips">
                        {tr.sessions.length === 0 ? (
                          <span className="tr-tt-empty-msg">No sessions today</span>
                        ) : tr.sessions.map((s, j) => {
                          const t = fmtTime(s.session_time);
                          const isAM = getHour(s.session_time) < 12;
                          return (
                            <div key={j} className={`tr-tt-chip ${isAM ? 'morning' : 'evening'}`}>
                              <span className="tr-tt-chip-time">{t}</span>
                              <span className="tr-tt-chip-type">{s.session_type || 'Shuttle'}</span>
                              {s.seats_available != null && (
                                <span className="tr-tt-chip-seats" style={{ color: s.seats_available > 10 ? '#10b981' : '#f59e0b' }}>
                                  {s.seats_available} left
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer CTA */}
            <div className="tr-footer">
              <button className="tr-new-btn" onClick={() => {
                setPickup(''); setDropoff(''); setSessions([]);
                setFormError(''); setBookingDate(todayISO); setView('form');
              }}>
                <Plus size={20} /><span>New Booking</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ FORM VIEW ══ */}
        {view === 'form' && (
          <div className="tr-form-view">
            <div className="tr-form-hero">
              <div className="tr-form-hero-icon"><Bus size={24} color="#6c47d9" /></div>
              <div>
                <div className="tr-form-hero-title">Plan Your Trip</div>
                <div className="tr-form-hero-sub">Select route, date and find available sessions</div>
              </div>
            </div>

            <div className="tr-form-card">
              <p className="tr-form-section">Route</p>

              {/* Pickup */}
              <div className="tr-field">
                <label>
                  <span className="tr-field-dot origin" />
                  Pick-up Location <span className="tr-req">*</span>
                </label>
                <div className="tr-select-wrap">
                  <select value={pickup} onChange={e => { setPickup(e.target.value); setSessions([]); }}>
                    <option value="">Select pick-up…</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={16} className="tr-sel-arrow" />
                </div>
              </div>

              {/* Swap button */}
              <div className="tr-route-swap">
                <div className="tr-route-swap-line" />
                <button
                  className={`tr-route-swap-btn${swapping ? ' swapping' : ''}`}
                  onClick={handleSwap}
                  disabled={!pickup && !dropoff}
                  title="Swap pickup and dropoff">
                  <ArrowLeftRight size={14} color="#6c47d9" />
                </button>
                <div className="tr-route-swap-line" />
              </div>

              {/* Dropoff */}
              <div className="tr-field">
                <label>
                  <span className="tr-field-dot dest" />
                  Drop-off Location <span className="tr-req">*</span>
                </label>
                <div className="tr-select-wrap">
                  <select value={dropoff} onChange={e => { setDropoff(e.target.value); setSessions([]); }}>
                    <option value="">Select drop-off…</option>
                    {LOCATIONS.filter(l => l !== pickup).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown size={16} className="tr-sel-arrow" />
                </div>
              </div>
            </div>

            <div className="tr-form-card">
              <p className="tr-form-section">Date</p>
              <div className="tr-date-box" onClick={() => setIsCalOpen(true)}>
                <div className="tr-date-icon-wrap">
                  <Calendar size={16} color="#6c47d9" />
                </div>
                <div className="tr-date-text">
                  <span className="tr-date-lbl">Travel Date</span>
                  <span className="tr-date-val">
                    {fmtDate(bookingDate)}
                    {bookingDate === todayISO && <span className="tr-date-today-badge">Today</span>}
                  </span>
                </div>
                <ChevronRight size={16} color="#bbb" />
              </div>
            </div>

            {/* Quick date pills */}
            <div className="tr-quick-dates">
              {[0, 1, 2, 3].map(offset => {
                const d = new Date(now); d.setDate(d.getDate() + offset);
                const iso = fmtDateISO(d);
                const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow'
                  : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
                return (
                  <button key={iso}
                    className={`tr-quick-date${bookingDate === iso ? ' active' : ''}`}
                    onClick={() => { setBookingDate(iso); setSessions([]); }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {formError && (
              <div className="tr-form-error"><AlertTriangle size={14} /><span>{formError}</span></div>
            )}

            <button className="tr-search-btn"
              disabled={!pickup || !dropoff || !bookingDate || sessionsLoading || pickup === dropoff}
              onClick={() => { fetchSessions(); setView('results'); }}>
              {sessionsLoading
                ? <><Loader2 size={18} className="spin" /> Searching…</>
                : <><Search size={18} /> Find Available Sessions</>}
            </button>

            {pickup === dropoff && pickup !== '' && (
              <p className="tr-same-route-warn">Pick-up and drop-off cannot be the same location.</p>
            )}
          </div>
        )}

        {/* ══ RESULTS VIEW ══ */}
        {view === 'results' && (
          <div className="tr-results-view">
            <div className="tr-results-bar">
              <div className="tr-results-route">
                <div className="tr-route-dot origin" style={{ flexShrink: 0 }} />
                <span>{pickup}</span>
                <ArrowRight size={14} color="#6c47d9" />
                <div className="tr-route-dot dest" style={{ flexShrink: 0 }} />
                <span>{dropoff}</span>
              </div>
              <div className="tr-results-meta">
                <Calendar size={12} color="#999" />{fmtDate(bookingDate)}
              </div>
              <button className="tr-results-edit" onClick={() => setView('form')}>
                <Edit3 size={16} color="#6c47d9" />
              </button>
            </div>

            {sessionsLoading ? (
              <div className="tr-loading">
                <div className="tr-loading-ring" />
                <span>Finding sessions…</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="tr-empty" style={{ padding: '40px 20px' }}>
                <div className="tr-empty-icon"><Bus size={28} color="#ccc" strokeWidth={1.5} /></div>
                <p>No sessions available</p>
                <span>Try a different date or route</span>
                <button className="tr-back-link" onClick={() => setView('form')}>← Change Route</button>
              </div>
            ) : (
              <div className="tr-session-list">
                <div className="tr-session-count">
                  <TrendingUp size={13} color="#6c47d9" />
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
                </div>
                {sessions.map(s => {
                  const t = s.session_time || '';
                  const isAM = getHour(t) < 12;
                  const hasLowSeats = s.seats_available != null && s.seats_available < 5;
                  return (
                    <div key={s.session_id} className={`tr-session-card${hasLowSeats ? ' low-seats' : ''}`}>
                      <div className="tr-session-left">
                        <div className={`tr-session-period ${isAM ? 'am' : 'pm'}`}>
                          {isAM ? 'AM' : 'PM'}
                        </div>
                        <div className="tr-session-time">{fmtTime(t)}</div>
                      </div>
                      <div className="tr-session-info">
                        <div className="tr-session-type">{s.session_type || 'Regular Shuttle'}</div>
                        <SeatBar available={s.seats_available} />
                        {hasLowSeats && (
                          <div className="tr-low-seats-warn">
                            <Zap size={10} /> Filling fast!
                          </div>
                        )}
                      </div>
                      <button className="tr-book-btn"
                        disabled={submitting}
                        onClick={() => handleBook(s)}>
                        {submitting ? <Loader2 size={14} className="spin" /> : 'Book'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {formError && (
              <div className="tr-form-error" style={{ margin: '0 16px' }}>
                <AlertTriangle size={14} /><span>{formError}</span>
              </div>
            )}
          </div>
        )}

        {/* ══ SUCCESS VIEW ══ */}
        {view === 'success' && lastBooking && (
          <div className="tr-success">
            <div className="tr-success-ring">
              <CheckCircle2 size={52} strokeWidth={1.5} color="#10b981" />
            </div>
            <h2>Booking Confirmed!</h2>
            <p>Your shuttle has been booked. Show your booking ID to the driver.</p>

            {/* Booking ID card with copy */}
            <div className="tr-success-id-card">
              <div className="tr-success-id-label">Booking ID</div>
              <div className="tr-success-id-val">#{lastBooking.booking_id}</div>
              <button className="tr-copy-btn" onClick={() => handleCopyId(lastBooking.booking_id)}>
                {copiedId ? <Check size={14} /> : <Copy size={14} />}
                {copiedId ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="tr-success-details">
              <div className="tr-success-row">
                <MapPin size={13} color="#6c47d9" />
                <span>{lastBooking.from_location}</span>
                <ArrowRight size={11} color="#c4b5fd" />
                <span>{lastBooking.to_location}</span>
              </div>
              <div className="tr-success-divider" />
              <div className="tr-success-row">
                <Calendar size={13} color="#6c47d9" />
                <span>{fmtDate(lastBooking.booking_date)}</span>
              </div>
              <div className="tr-success-row">
                <Clock size={13} color="#6c47d9" />
                <span>{fmtTime(lastBooking.session_time)}</span>
              </div>
              {lastBooking.seats_available != null && (
                <div className="tr-success-row">
                  <Users size={13} color="#6c47d9" />
                  <span>{lastBooking.seats_available} seats remaining after your booking</span>
                </div>
              )}
            </div>

            <div className="tr-success-actions">
              <button className="tr-btn-ghost" onClick={() => setView('main')}>
                <Bus size={15} /> Back to Home
              </button>
              <button className="tr-btn-primary" onClick={() => {
                setPickup(''); setDropoff(''); setSessions([]);
                setBookingDate(todayISO); setView('form');
              }}>
                <Plus size={15} /> New Booking
              </button>
            </div>
          </div>
        )}

        {/* ══ DETAIL VIEW ══ */}
        {view === 'detail' && selectedBooking && (() => {
          const b = selectedBooking;
          const sm = statusMeta(b.status);
          const canCancel = b.status?.toLowerCase() !== 'cancelled';
          const countdown = timeUntil(
            (b.booking_date || b.booking_time || '').slice(0, 10),
            b.session_time || ''
          );
          return (
            <div className="tr-detail">
              <div className="tr-detail-banner">
                <div className="tr-detail-bus"><Bus size={30} color="#fff" /></div>
                <div className="tr-detail-banner-info">
                  <span className="tr-detail-id">#{b.booking_id}</span>
                  <span className="tr-detail-route">{b.from_location} → {b.to_location}</span>
                  {countdown && <span className="tr-detail-countdown">{countdown}</span>}
                </div>
                <span className="tr-detail-status" style={{ color: sm.color, background: 'rgba(255,255,255,0.92)' }}>
                  <span className="tr-dot" style={{ background: sm.dot }} />{sm.label}
                </span>
              </div>

              <div className="tr-detail-body">
                <div className="tr-detail-section">
                  <h4>Trip Information</h4>
                  <div className="tr-detail-grid">
                    <div className="tr-detail-item">
                      <span className="tr-dii-lbl">From</span>
                      <span className="tr-dii-val">{b.from_location || '—'}</span>
                    </div>
                    <div className="tr-detail-item">
                      <span className="tr-dii-lbl">To</span>
                      <span className="tr-dii-val">{b.to_location || '—'}</span>
                    </div>
                    <div className="tr-detail-item">
                      <span className="tr-dii-lbl">Date</span>
                      <span className="tr-dii-val">{fmtDate(b.booking_date || b.booking_time)}</span>
                    </div>
                    <div className="tr-detail-item">
                      <span className="tr-dii-lbl">Time</span>
                      <span className="tr-dii-val">{fmtTime(b.session_time)}</span>
                    </div>
                    {b.driver_name && (
                      <div className="tr-detail-item tr-detail-full">
                        <span className="tr-dii-lbl">Driver</span>
                        <span className="tr-dii-val">{b.driver_name}</span>
                      </div>
                    )}
                    <div className="tr-detail-item tr-detail-full">
                      <span className="tr-dii-lbl">Status</span>
                      <span className="tr-dii-val" style={{ color: sm.color }}>{sm.label}</span>
                    </div>
                  </div>
                </div>

                {/* Rebook shortcut */}
                {b.status?.toLowerCase() !== 'cancelled' && (
                  <button className="tr-rebook-btn" onClick={() => handleRebook(b)}>
                    <RotateCcw size={15} /> Book Same Route Again
                  </button>
                )}
              </div>

              {canCancel && (
                <div className="tr-detail-footer">
                  <button className="tr-cancel-ride-btn" onClick={() => setCancelModal(true)}>
                    <Ban size={16} /> Cancel Booking
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── CALENDAR MODAL ── */}
      {isCalOpen && (
        <div className="tr-cal-overlay" onClick={() => setIsCalOpen(false)}>
          <div className="tr-cal-modal" onClick={e => e.stopPropagation()}>
            <div className="tr-cal-header">
              <span>Select Date</span>
              <button className="tr-cal-close" onClick={() => setIsCalOpen(false)}><X size={18} /></button>
            </div>
            <div className="tr-cal-nav">
              <button className="tr-cal-arrow" onClick={() => changeMonth(-1)}>‹</button>
              <span className="tr-cal-month">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button className="tr-cal-arrow" onClick={() => changeMonth(1)}>›</button>
            </div>
            <div className="tr-cal-weekdays">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="tr-cal-grid">{renderCalDays()}</div>
            <button className="tr-cal-confirm" onClick={() => setIsCalOpen(false)}>
              <Check size={16} /> Confirm Date
            </button>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {cancelModal && selectedBooking && (
        <div className="tr-modal-overlay" onClick={() => !cancelLoading && setCancelModal(false)}>
          <div className="tr-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="tr-cancel-icon"><XCircle size={44} color="#ef4444" /></div>
            <h3>Cancel Booking?</h3>
            <p>
              Cancel booking <strong>#{selectedBooking.booking_id}</strong>{' '}
              from <strong>{selectedBooking.from_location}</strong>{' '}
              to <strong>{selectedBooking.to_location}</strong>?
            </p>
            <div className="tr-cancel-actions">
              <button className="tr-cancel-no" onClick={() => setCancelModal(false)} disabled={cancelLoading}>Keep It</button>
              <button className="tr-cancel-yes" onClick={handleCancel} disabled={cancelLoading}>
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

export default Transport;