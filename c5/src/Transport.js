import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Calendar,
  X, Edit3, MapPin, Clock, MoreVertical, Navigation,
  Bus, ArrowRight, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, XCircle, Ban, Users, Route,
  Search, Filter, Check
} from 'lucide-react';
import './Transport.css';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
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
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};

const statusMeta = (s = '') => {
  const l = s.toLowerCase();
  if (l === 'confirmed' || l === 'approved') return { color: '#10b981', bg: '#dcfce7', dot: '#10b981' };
  if (l === 'pending')  return { color: '#f59e0b', bg: '#fef3c7', dot: '#f59e0b' };
  if (l === 'cancelled') return { color: '#ef4444', bg: '#fee2e2', dot: '#ef4444' };
  return { color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' };
};

const now = new Date();
const todayISO = fmtDateISO(now);

// ═══════════════════════════════════════════════════════════════════════════════
const Transport = ({ userInfo }) => {
  const navigate = useNavigate();

  const userEmail = userInfo?.email || '';
  const userName  = userInfo?.name  || '';

  // ── view state ─────────────────────────────────────────────────────────────
  const [view, setView]           = useState('main'); // main | form | results | success | detail
  const [activeTab, setActiveTab] = useState('Booking');

  // ── data state ─────────────────────────────────────────────────────────────
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

  // ── timetable (from backend: routes then sessions per route) ───────────────
  const [timetableRoutes, setTimetableRoutes] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [transportRoutes, setTransportRoutes] = useState([]); // { from_location, to_location }[]

  // ── form state ─────────────────────────────────────────────────────────────
  const [pickup,    setPickup]    = useState('');
  const [dropoff,   setDropoff]   = useState('');
  const [bookingDate, setBookingDate] = useState(todayISO);
  const [selectedSession, setSelectedSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ── calendar state ─────────────────────────────────────────────────────────
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [viewDate, setViewDate]   = useState(new Date(now.getFullYear(), now.getMonth(), 1));

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

  // ── fetch transport routes (from backend) ───────────────────────────────────
  const fetchTransportRoutes = useCallback(async () => {
    try {
      const res = await callN8N('get_routes', {});
      const raw = res?.data ?? res?.result?.data ?? res?.routes ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const routes = list.map((r) => ({
        from_location: r.from_location ?? r.from ?? r.pickup,
        to_location: r.to_location ?? r.to ?? r.dropoff,
      })).filter((r) => r.from_location && r.to_location);
      setTransportRoutes(routes);
      return routes;
    } catch {
      setTransportRoutes([]);
      return [];
    }
  }, []);

  // ── fetch timetable (sessions per route for today; routes from backend) ─────
  const fetchTimetable = useCallback(async (routesOverride) => {
    setTimetableLoading(true);
    setTimetableRoutes([]);
    try {
      let routes = Array.isArray(routesOverride) ? routesOverride : transportRoutes;
      if (routes.length === 0) {
        routes = await fetchTransportRoutes();
      }
      // Fallback if backend has no get_routes or returns empty
      const routeList = routes.length > 0 ? routes : [
        { from_location: '8th & Stellar', to_location: 'Naga Emas' },
        { from_location: 'Naga Emas', to_location: '8th & Stellar' },
        { from_location: '8th & Stellar', to_location: 'Sri Petaling' },
        { from_location: 'Sri Petaling', to_location: '8th & Stellar' },
        { from_location: 'Naga Emas', to_location: 'Sri Petaling' },
        { from_location: 'Sri Petaling', to_location: 'Naga Emas' },
      ];
      const results = await Promise.all(
        routeList.map(async ({ from_location, to_location }) => {
          const res = await callN8N('get_sessions', {
            from_location,
            to_location,
            booking_date: todayISO,
            employee_email: userEmail,
          });
          const rows = res?.data ?? res?.result?.data ?? [];
          const sessions = Array.isArray(rows) ? rows : [];
          return { from_location, to_location, route: `${from_location} ↔ ${to_location}`, sessions };
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
      fetchTransportRoutes().then((routes) => {
        setTransportRoutes(routes);
        fetchTimetable(routes);
      });
    }
  }, [activeTab, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── fetch available sessions ───────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!pickup || !dropoff || !bookingDate) return;
    setSessionsLoading(true); setFormError('');
    try {
      const res = await callN8N('get_sessions', {
        from_location: pickup,
        to_location:   dropoff,
        booking_date:  bookingDate,
        employee_email: userEmail,
      });
      const rows = res?.data ?? res?.result?.data ?? [];
      setSessions(Array.isArray(rows) ? rows : []);
    } catch {
      setFormError('Unable to load available sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, [pickup, dropoff, bookingDate, userEmail]);

  // ── submit booking ─────────────────────────────────────────────────────────
  const handleBook = async (session) => {
    setSubmitting(true); setFormError('');
    try {
      const res = await callN8N('create_booking', {
        email:      userEmail,
        sessionId:  session.session_id,
        seatNumber: session.seat_number ?? 0,
        employee_name:  userName,
        booking_date:   bookingDate,
        from_location:  pickup,
        to_location:    dropoff,
      });
      const data = res?.data ?? res?.result?.data ?? {};
      setLastBooking({
        booking_id:   data.booking_id   || '—',
        from_location: pickup,
        to_location:   dropoff,
        session_time:  session.session_time,
        booking_date:  bookingDate,
        status:        data.status || 'Confirmed',
      });
      await fetchBookings();
      setView('success');
    } catch {
      setFormError('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── cancel booking ─────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!selectedBooking) return;
    setCancelLoading(true);
    try {
      await callN8N('cancel_booking', {
        booking_id:     selectedBooking.booking_id,
        employee_email: userEmail,
      });
      const updated = { ...selectedBooking, status: 'Cancelled' };
      setBookings(prev => prev.map(b => b.booking_id === selectedBooking.booking_id ? updated : b));
      setSelectedBooking(updated);
    } catch {
      const updated = { ...selectedBooking, status: 'Cancelled' };
      setBookings(prev => prev.map(b => b.booking_id === selectedBooking.booking_id ? updated : b));
      setSelectedBooking(updated);
    } finally {
      setCancelLoading(false); setCancelModal(false);
    }
  };

  // ── calendar ───────────────────────────────────────────────────────────────
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
      const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isPast = new Date(y, m, d, 23, 59) < now;
      const isSel  = bookingDate === ds;
      days.push(
        <div key={d}
          className={`tr-cal-day${isSel ? ' selected' : ''}${isPast ? ' past' : ''}`}
          onClick={() => { if (!isPast) { setBookingDate(ds); setSessions([]); setSelectedSession(null); } }}>
          {d}
        </div>
      );
    }
    return days;
  };

  const handleBack = () => {
    if (view === 'results')  { setView('form'); return; }
    if (view === 'form')     { setView('main'); return; }
    if (view === 'success')  { setView('main'); return; }
    if (view === 'detail')   { setView('main'); return; }
    navigate('/');
  };

  const navTitle = {
    main:    'Transport',
    form:    'New Booking',
    results: 'Select Session',
    success: 'Transport',
    detail:  'Booking Detail',
  }[view] || 'Transport';

  const openDetail = (b) => { setSelectedBooking(b); setView('detail'); };

  return (
    <div className="tr-root" onClick={() => setOpenMenuId(null)}>

      {/* ── NAV ── */}
      <nav className="tr-nav">
        <button className="tr-nav-back" onClick={handleBack}>
          <ChevronLeft size={22} color="#fff" strokeWidth={2.5} />
        </button>
        <span className="tr-nav-title">{navTitle}</span>
        {view === 'main' && (
          <button className="tr-nav-refresh" onClick={fetchBookings} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
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

                {loading ? (
                  <div className="tr-loading">
                    <Loader2 size={32} className="spin" />
                    <span>Loading bookings…</span>
                  </div>
                ) : bookings.filter(b => b.status?.toLowerCase() !== 'cancelled').length === 0 ? (
                  <div className="tr-empty">
                    <div className="tr-empty-img">
                      <img src="/icon_img/transportpage.png" alt="" />
                    </div>
                    <p>No active bookings</p>
                    <span>Tap New Booking to get started</span>
                  </div>
                ) : (
                  <div className="tr-cards">
                    <div className="tr-section-header">
                      <Bus size={17} color="#2b1d62" /><span>My Bookings</span>
                    </div>
                    {bookings.filter(b => b.status?.toLowerCase() !== 'cancelled').map(b => {
                      const sm = statusMeta(b.status);
                      return (
                        <div key={b.booking_id} className="tr-card" onClick={() => openDetail(b)}>
                          <div className="tr-card-stripe" style={{ background: sm.dot }} />
                          <div className="tr-card-main">
                            <div className="tr-card-head">
                              <div className="tr-card-id">
                                <Bus size={14} color="#6c47d9" />
                                <span>#{b.booking_id}</span>
                              </div>
                              <div className="tr-card-actions" onClick={e => e.stopPropagation()}>
                                <span className="tr-status-pill" style={{ color: sm.color, background: sm.bg }}>
                                  <span className="tr-dot" style={{ background: sm.dot }} />
                                  {b.status}
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
                                          <Navigation size={13}/><span>View Detail</span>
                                        </div>
                                        <div className="tr-drop-item tr-drop-cancel"
                                          onClick={() => { setSelectedBooking(b); setOpenMenuId(null); setCancelModal(true); }}>
                                          <Ban size={13}/><span>Cancel Ride</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="tr-card-route">
                              <div className="tr-route-point">
                                <div className="tr-route-dot origin" />
                                <span>{b.from_location || '—'}</span>
                              </div>
                              <div className="tr-route-line" />
                              <div className="tr-route-point">
                                <div className="tr-route-dot dest" />
                                <span>{b.to_location || '—'}</span>
                              </div>
                            </div>
                            <div className="tr-card-meta">
                              <span><Calendar size={11}/>{fmtDate(b.booking_date || b.booking_time)}</span>
                              <span><Clock size={11}/>{b.session_time || '—'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* TIMETABLE – from backend get_sessions */
              <div className="tr-timetable">
                <div className="tr-tt-notice">
                  <AlertTriangle size={13} color="#f59e0b" />
                  <span>Mon – Fri, except Public Holidays. Times from transport service.</span>
                </div>
                {timetableLoading ? (
                  <div className="tr-loading">
                    <Loader2 size={32} className="spin" />
                    <span>Loading timetable…</span>
                  </div>
                ) : timetableRoutes.length === 0 ? (
                  <div className="tr-empty">
                    <Route size={40} color="#ccc" />
                    <p>No routes or sessions available</p>
                    <span>Use Booking to select a route and date</span>
                  </div>
                ) : (
                  timetableRoutes.map((tr, i) => (
                    <div key={i} className="tr-tt-card">
                      <div className="tr-tt-route">
                        <Route size={14} color="#6c47d9" /><span>{tr.route}</span>
                      </div>
                      <div className="tr-tt-sessions">
                        {tr.sessions.length === 0 ? (
                          <div className="tr-tt-session">
                            <span className="tr-tt-freq">No sessions today</span>
                          </div>
                        ) : (
                          tr.sessions.map((s, j) => (
                            <div key={j} className="tr-tt-session">
                              <span className="tr-tt-badge">{s.session_type || 'Shuttle'}</span>
                              <span>{typeof s.session_time === 'string' ? s.session_time : (s.session_time ? String(s.session_time).slice(0, 5) : '—')}</span>
                              {s.booked_count != null && <span className="tr-tt-freq">Booked: {s.booked_count}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer CTA */}
            <div className="tr-footer">
              <button className="tr-new-btn" onClick={() => { setPickup(''); setDropoff(''); setSessions([]); setSelectedSession(null); setView('form'); }}>
                <Plus size={20} /><span>New Booking</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ FORM VIEW ══ */}
        {view === 'form' && (
          <div className="tr-form-view">
            <div className="tr-form-hero">
              <Bus size={28} color="#6c47d9" />
              <div>
                <div className="tr-form-hero-title">Plan Your Trip</div>
                <div className="tr-form-hero-sub">Select route, date and find available sessions</div>
              </div>
            </div>

            <div className="tr-form-card">
              <p className="tr-form-section">Route</p>

              <div className="tr-field">
                <label>Pick-up Location <span className="tr-req">*</span></label>
                <div className="tr-select-wrap">
                  <select value={pickup} onChange={e => { setPickup(e.target.value); setSessions([]); }}>
                    <option value="">Select pick-up…</option>
                    <option value="8th & Stellar">8th &amp; Stellar</option>
                    <option value="Naga Emas">Naga Emas</option>
                    <option value="Sri Petaling">Sri Petaling</option>
                  </select>
                  <ChevronDown size={16} className="tr-sel-arrow" />
                </div>
              </div>

              <div className="tr-route-swap">
                <div className="tr-route-swap-line" />
                <div className="tr-route-swap-icon"><ArrowRight size={14} color="#6c47d9" /></div>
                <div className="tr-route-swap-line" />
              </div>

              <div className="tr-field">
                <label>Drop-off Location <span className="tr-req">*</span></label>
                <div className="tr-select-wrap">
                  <select value={dropoff} onChange={e => { setDropoff(e.target.value); setSessions([]); }}>
                    <option value="">Select drop-off…</option>
                    <option value="Naga Emas">Naga Emas</option>
                    <option value="8th & Stellar">8th &amp; Stellar</option>
                    <option value="Sri Petaling">Sri Petaling</option>
                  </select>
                  <ChevronDown size={16} className="tr-sel-arrow" />
                </div>
              </div>
            </div>

            <div className="tr-form-card">
              <p className="tr-form-section">Date</p>
              <div className="tr-date-box" onClick={() => setIsCalOpen(true)}>
                <Calendar size={16} color="#6c47d9" />
                <div className="tr-date-text">
                  <span className="tr-date-lbl">Travel Date</span>
                  <span className="tr-date-val">{fmtDate(bookingDate)}</span>
                </div>
                <ChevronRight size={16} color="#bbb" />
              </div>
            </div>

            {formError && (
              <div className="tr-form-error"><AlertTriangle size={14}/><span>{formError}</span></div>
            )}

            <button className="tr-search-btn"
              disabled={!pickup || !dropoff || !bookingDate || sessionsLoading}
              onClick={() => { fetchSessions(); setView('results'); }}>
              {sessionsLoading
                ? <><Loader2 size={18} className="spin"/> Searching…</>
                : <><Search size={18}/> Find Available Sessions</>}
            </button>
          </div>
        )}

        {/* ══ RESULTS VIEW ══ */}
        {view === 'results' && (
          <div className="tr-results-view">
            {/* Summary bar */}
            <div className="tr-results-bar">
              <div className="tr-results-route">
                <span>{pickup}</span>
                <ArrowRight size={14} color="#6c47d9" />
                <span>{dropoff}</span>
              </div>
              <div className="tr-results-meta">
                <Calendar size={12} color="#999"/>{fmtDate(bookingDate)}
              </div>
              <button className="tr-results-edit" onClick={() => setView('form')}>
                <Edit3 size={16} color="#6c47d9" />
              </button>
            </div>

            {sessionsLoading ? (
              <div className="tr-loading"><Loader2 size={28} className="spin"/><span>Finding sessions…</span></div>
            ) : sessions.length === 0 ? (
              <div className="tr-empty" style={{padding:'40px 20px'}}>
                <Bus size={52} strokeWidth={1} color="#ddd" />
                <p>No sessions available</p>
                <span>Try a different date or route</span>
              </div>
            ) : (
              <div className="tr-session-list">
                <div className="tr-session-count">{sessions.length} session{sessions.length !== 1 ? 's' : ''} available</div>
                {sessions.map(s => (
                  <div key={s.session_id} className="tr-session-card">
                    <div className="tr-session-time">
                      <Clock size={20} color="#6c47d9" />
                      <span>{s.session_time}</span>
                    </div>
                    <div className="tr-session-info">
                      <div className="tr-session-type">{s.session_type || 'Regular'}</div>
                      {s.seats_available != null && (
                        <div className="tr-session-seats">
                          <Users size={12} color="#10b981"/>
                          <span>{s.seats_available} seats left</span>
                        </div>
                      )}
                    </div>
                    <button className="tr-book-btn"
                      disabled={submitting}
                      onClick={() => handleBook(s)}>
                      {submitting ? <Loader2 size={14} className="spin"/> : 'Book'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formError && (
              <div className="tr-form-error" style={{margin:'0 16px'}}>
                <AlertTriangle size={14}/><span>{formError}</span>
              </div>
            )}
          </div>
        )}

        {/* ══ SUCCESS VIEW ══ */}
        {view === 'success' && lastBooking && (
          <div className="tr-success">
            <div className="tr-success-ring">
              <CheckCircle2 size={60} strokeWidth={1.5} color="#10b981" />
            </div>
            <h2>Booking Confirmed!</h2>
            <p>Your shuttle has been booked. Show your booking ID to the driver.</p>
            <div className="tr-success-chip">
              <Bus size={15}/><span>Booking ID: <strong>#{lastBooking.booking_id}</strong></span>
            </div>
            <div className="tr-success-details">
              <div className="tr-success-row">
                <MapPin size={13} color="#6c47d9"/>
                <span>{lastBooking.from_location} → {lastBooking.to_location}</span>
              </div>
              <div className="tr-success-row">
                <Calendar size={13} color="#6c47d9"/>
                <span>{fmtDate(lastBooking.booking_date)}</span>
              </div>
              <div className="tr-success-row">
                <Clock size={13} color="#6c47d9"/>
                <span>{lastBooking.session_time}</span>
              </div>
            </div>
            <div className="tr-success-actions">
              <button className="tr-btn-ghost" onClick={() => setView('main')}>Back to Home</button>
            </div>
          </div>
        )}

        {/* ══ DETAIL VIEW ══ */}
        {view === 'detail' && selectedBooking && (() => {
          const b = selectedBooking;
          const sm = statusMeta(b.status);
          const canCancel = b.status?.toLowerCase() !== 'cancelled';
          return (
            <div className="tr-detail">
              <div className="tr-detail-banner" style={{ background: `linear-gradient(135deg, #2b1d62, #4a2fa0)` }}>
                <div className="tr-detail-bus"><Bus size={34} color="#fff" /></div>
                <div className="tr-detail-banner-info">
                  <span className="tr-detail-id">#{b.booking_id}</span>
                  <span className="tr-detail-route">{b.from_location} → {b.to_location}</span>
                </div>
                <span className="tr-detail-status" style={{ color: sm.color, background: 'rgba(255,255,255,0.92)' }}>
                  <span className="tr-dot" style={{ background: sm.dot }} />{b.status}
                </span>
              </div>
              <div className="tr-detail-body">
                <div className="tr-detail-section">
                  <h4>Trip Information</h4>
                  <div className="tr-detail-grid">
                    <div className="tr-detail-item"><span className="tr-dii-lbl">From</span><span className="tr-dii-val">{b.from_location || '—'}</span></div>
                    <div className="tr-detail-item"><span className="tr-dii-lbl">To</span><span className="tr-dii-val">{b.to_location || '—'}</span></div>
                    <div className="tr-detail-item"><span className="tr-dii-lbl">Date</span><span className="tr-dii-val">{fmtDate(b.booking_date || b.booking_time)}</span></div>
                    <div className="tr-detail-item"><span className="tr-dii-lbl">Time</span><span className="tr-dii-val">{b.session_time || '—'}</span></div>
                    {b.driver_name && <div className="tr-detail-item tr-detail-full"><span className="tr-dii-lbl">Driver</span><span className="tr-dii-val">{b.driver_name}</span></div>}
                  </div>
                </div>
              </div>
              {canCancel && (
                <div className="tr-detail-footer">
                  <button className="tr-cancel-ride-btn" onClick={() => setCancelModal(true)}>
                    <Ban size={16}/> Cancel Booking
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
              <button className="tr-cal-close" onClick={() => setIsCalOpen(false)}><X size={18}/></button>
            </div>
            <div className="tr-cal-nav">
              <button className="tr-cal-arrow" onClick={() => changeMonth(-1)}>‹</button>
              <span className="tr-cal-month">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button className="tr-cal-arrow" onClick={() => changeMonth(1)}>›</button>
            </div>
            <div className="tr-cal-weekdays">
              {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="tr-cal-grid">{renderCalDays()}</div>
            <button className="tr-cal-confirm" onClick={() => setIsCalOpen(false)}>
              <Check size={16}/> Confirm
            </button>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ── */}
      {cancelModal && selectedBooking && (
        <div className="tr-modal-overlay" onClick={() => !cancelLoading && setCancelModal(false)}>
          <div className="tr-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="tr-cancel-icon"><XCircle size={44} color="#ef4444"/></div>
            <h3>Cancel Booking?</h3>
            <p>Cancel booking <strong>#{selectedBooking.booking_id}</strong> from <strong>{selectedBooking.from_location}</strong> to <strong>{selectedBooking.to_location}</strong>?</p>
            <div className="tr-cancel-actions">
              <button className="tr-cancel-no" onClick={() => setCancelModal(false)} disabled={cancelLoading}>Keep It</button>
              <button className="tr-cancel-yes" onClick={handleCancel} disabled={cancelLoading}>
                {cancelLoading ? <><Loader2 size={15} className="spin"/> Cancelling…</> : <><Ban size={15}/> Yes, Cancel</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transport;