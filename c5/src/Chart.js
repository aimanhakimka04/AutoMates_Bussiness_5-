import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  BookOpen,
  Book,
  ChevronRight,
  AlertCircle,
  Clock,
  MapPin,
  X,
  ChevronLeftCircle,
  ChevronRightCircle,
  CheckCircle2,
  User
} from 'lucide-react';
import './Chart.css';

// ─── CONFIG (aligned with StaffClaim.js) ─────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

// ─── n8n API helper (same pattern as StaffClaim.js) ──────────────────────────
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: {
      action,
      sub_target: 'training',  // this module’s sub_target
      ...payload,
    },
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

// ─── Normalizer (robust to backend field names) ──────────────────────────────
// Backend often returns date as '2026-04-15 09:00:00' or ISO string; normalize to YYYY-MM-DD for calendar
const toDateOnly = (v) => {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  const part = s.split('T')[0].split(' ')[0];
  return part && /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : s;
};
// Extract time HH:mm from datetime string (e.g. '2026-04-15 09:00:00' -> '09:00')
const toTimeOnly = (v) => {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  const afterT = s.split('T')[1];
  const afterSpace = s.split(' ')[1];
  const timePart = (afterT || afterSpace || '').replace(/\.\d+Z?$/i, '');
  const match = timePart.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
};

const normalizeProgram = (p = {}) => {
  const rawDate = p.date ?? p.program_date ?? p.programDate ?? p.training_date ?? '';
  const extractedTime = toTimeOnly(rawDate);
  return {
    id: p.id ?? p.program_id ?? p.programId ?? '',
    title: p.title ?? p.program_title ?? p.programTitle ?? '',
    date: toDateOnly(rawDate),
    startTime: p.startTime ?? p.start_time ?? p.start ?? extractedTime,
    endTime: p.endTime ?? p.end_time ?? p.end ?? (extractedTime ? `${String(parseInt(extractedTime.split(':')[0], 10) + 1).padStart(2, '0')}:${extractedTime.split(':')[1]}` : ''),
    location: p.location ?? p.venue ?? p.address ?? '',
    trainer: p.trainer ?? p.facilitator ?? p.instructor ?? '',
    status: p.status ?? p.enrollment_status ?? p.enrollmentStatus ?? '',
    desc: p.desc ?? p.description ?? '',
    duration: p.duration ?? '',
    category: p.category ?? '',
  };
};

// Optional helper like StaffClaim’s normalizeStatus (for future use)
const normalizeStatus = (s = '') => {
  const l = String(s || '').trim().toLowerCase();
  if (l.includes('reject')) return 'rejected';
  if (l.includes('approve')) return 'approved';
  if (l.includes('confirm')) return 'confirmed';
  if (l.includes('pending')) return 'pending';
  return 'pending';
};

const Chart = ({ userInfo }) => {
  const navigate = useNavigate();

  const userEmail = userInfo?.email || '';
  const userName = userInfo?.name || '';

  // view: 'main', 'calendar', 'upcoming', 'programs', 'mylearning'
  const [view, setView] = useState('main');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [requestForm, setRequestForm] = useState({ title: '', dateTime: '', venue: '' });

  // Data from n8n
  const [myPrograms, setMyPrograms] = useState([]);
  const [availablePrograms, setAvailablePrograms] = useState([]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [navDate, setNavDate] = useState(new Date());

  // ─── Fetch all training data (like StaffClaim.fetchClaims) ──────────────────
  // dataType: 'training' = calendar/upcoming, 'course' = Learning Programs, undefined = both
  const fetchChartData = useCallback(async (dataType) => {
    if (!userEmail) return;
    setLoading(true);
    setApiError('');

    try {
      const res = await callN8N('get_chart_overview', {
        employee_email: userEmail,
        employee_name: userName,
        data_type: dataType ?? 'all',
      });

      // Align with StaffClaim’s “res?.data OR res?.result?.data” pattern
      const resData = res?.data ?? res?.result?.data;
      const root =
        (resData && typeof resData === 'object' && !Array.isArray(resData) && resData) || {};
      const top = res && typeof res === 'object' ? res : {};

      // Backend may return a plain array as res.data – use only for the list that matches data_type
      // so course list doesn't also appear in "my programs" (which would show everything as "signed up")
      const dataAsArray = Array.isArray(resData) ? resData : [];
      const useArrayForTraining = dataType === 'training';
      const useArrayForCourse = dataType === 'course';

      // Learning Calendar & Upcoming Training = only enrollments (signed-up trainings)
      const rawTraining =
        (Array.isArray(root.training_info) && root.training_info) ||
        (Array.isArray(top.training_info) && top.training_info) ||
        (Array.isArray(root.my_programs) && root.my_programs) ||
        (Array.isArray(root.myPrograms) && root.myPrograms) ||
        (Array.isArray(root.data) && root.data) ||
        (useArrayForTraining ? dataAsArray : []) ||
        [];
      // Learning Programs = course catalog (available to sign up)
      const rawCourses =
        (Array.isArray(root.course_info) && root.course_info) ||
        (Array.isArray(top.course_info) && top.course_info) ||
        (Array.isArray(root.available_programs) && root.available_programs) ||
        (Array.isArray(root.availablePrograms) && root.availablePrograms) ||
        (Array.isArray(root.data) && root.data) ||
        (useArrayForCourse ? dataAsArray : []) ||
        [];

      setMyPrograms(rawTraining.map(normalizeProgram));
      setAvailablePrograms(rawCourses.map(normalizeProgram));
    } catch {
      setApiError('Unable to load training data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userEmail, userName]);

  // Initial load
  useEffect(() => {
    if (userEmail) fetchChartData();
  }, [userEmail, fetchChartData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when entering data-heavy views (send data_type so backend knows training vs course)
  useEffect(() => {
    if (!userEmail) return;
    if (view === 'calendar' || view === 'upcoming') {
      fetchChartData('training');
    } else if (view === 'programs') {
      fetchChartData('course');
    }
  }, [view, userEmail, fetchChartData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Navigation (keep style) ────────────────────────────────────────────────
  const handleBack = () => {
    if (view === 'main') navigate('/');
    else {
      setView('main');
      setSelectedDate(null);
      setSelectedEvent(null);
      setShowConfirm(false);
      setApiError('');
    }
  };

  // ─── Calendar helpers (unchanged UI) ───────────────────────────────────────
  const renderCalendarDays = () => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(<div key={`e-${i}`} className="cal-day empty"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasEvent = myPrograms.some(p => p.date === dateStr);
      const isSelected = selectedDate === dateStr;

      days.push(
        <div
          key={d}
          className={`cal-day ${hasEvent ? 'has-event' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedDate(hasEvent ? dateStr : null)}
        >
          {d}
          {hasEvent && <span className="event-dot"></span>}
        </div>
      );
    }
    return days;
  };

  const renderTimeline = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const h = (8 + i) % 24;
      const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      hours.push(
        <div key={i} className="timeline-hour-row">
          <span className="hour-label">{label}</span>
          <div className="hour-line"></div>
        </div>
      );
    }

    const dayEvents = myPrograms.filter(p => p.date === selectedDate);

    return (
      <div className="timeline-container">
        <div className="timeline-grid">
          {hours}
          {dayEvents.map(event => {
            if (!event?.startTime || !event?.endTime) return null;

            const startH = parseInt(event.startTime.split(':')[0], 10);
            const startM = parseInt(event.startTime.split(':')[1], 10);
            const endH = parseInt(event.endTime.split(':')[0], 10);
            const endM = parseInt(event.endTime.split(':')[1], 10);

            const top = ((startH < 8 ? startH + 24 : startH) - 8) * 60 + startM;
            const height =
              ((endH < startH ? endH + 24 : endH) * 60 + endM) - (startH * 60 + startM);

            return (
              <div
                key={event.id || `${event.title}-${event.date}-${event.startTime}`}
                className="timeline-event-block"
                style={{ top: `${top}px`, height: `${height}px` }}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="block-inner">
                  <span className="block-title">{event.title}</span>
                  <span className="block-time">{event.startTime} - {event.endTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Enroll program (Sign Up) – StaffClaim-style submit ─────────────────────
  const handleConfirmSignUp = async () => {
    if (!selectedEvent) return;

    const alreadyExist = myPrograms.some(
      p =>
        (p.id && selectedEvent.id && p.id === selectedEvent.id) ||
        (p.title === selectedEvent.title && p.date === selectedEvent.date)
    );
    if (alreadyExist) {
      alert('You have already signed up for this program.');
      setShowConfirm(false);
      setSelectedEvent(null);
      return;
    }

    if (!userEmail) {
      alert('Missing user identity. Please re-login.');
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      await callN8N('enroll_program', {
        employee_email: userEmail,
        employee_name: userName,
        program_id: selectedEvent.id,
      });

      alert('Sign up request submitted successfully!');
      setShowConfirm(false);
      setSelectedEvent(null);
      await fetchChartData();
      setView('upcoming');
    } catch {
      setApiError('Submission failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── External learning request – StaffClaim-style submit ────────────────────
  const handleRequestSubmit = async () => {
    if (!requestForm.title || !requestForm.dateTime || !requestForm.venue) {
      alert('Please fill in all required fields!');
      return;
    }
    if (!userEmail) {
      alert('Missing user identity. Please re-login.');
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      await callN8N('create_external_learning_request', {
        employee_email: userEmail,
        employee_name: userName,
        title: requestForm.title,
        date_time: requestForm.dateTime,
        venue: requestForm.venue,
      });

      alert('External Learning Request Submitted!');
      setRequestForm({ title: '', dateTime: '', venue: '' });
      setView('main');
    } catch {
      setApiError('Submission failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── RENDER (style kept as you had it) ──────────────────────────────────────
  return (
    <div className="chart-page-container">
      {/* Top nav */}
      <nav className="chart-top-nav">
        <div className="back-arrow" onClick={handleBack}>
          <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span className="nav-title">
          {view === 'main' ? 'CHART' :
            view === 'calendar' ? 'Learning Calendar' :
              view === 'upcoming' ? 'My Upcoming Trainings' :
                view === 'programs' ? 'Learning Programs' : 'My Learning Request'}
        </span>
      </nav>

      <div className="chart-scroll-content">
        {/* Global error like StaffClaim */}
        {apiError && (
          <div className="important-note-box" style={{ marginTop: 12 }}>
            <div className="note-header">Notice</div>
            <div className="note-body">
              <AlertCircle size={20} color="#444" />
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* MAIN */}
        {view === 'main' && (
          <>
            <div className="chart-hero-header">
              <div className="chart-logo-box">
                <img src="/icon_img/CHARTlogo.png" alt="Logo" className="chart-main-logo" />
              </div>
              <h2 className="about-title">About CHART</h2>
              <p className="about-desc">The Chin Hin Academy for Reskilling & Transformation (CHART)</p>
              <button className="read-more-btn" onClick={() => setShowAboutModal(true)}>Read More</button>
            </div>

            <div className="chart-menu-list">
              <div className="chart-menu-item" onClick={() => setView('calendar')}>
                <div className="menu-item-left"><CalendarIcon size={20} color="#333" /><span>Learning Calendar</span></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="chart-menu-item" onClick={() => setView('upcoming')}>
                <div className="menu-item-left"><Book size={20} color="#333" /><span>My Upcoming Trainings</span></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="chart-menu-item" onClick={() => setView('programs')}>
                <div className="menu-item-left"><Book size={20} color="#333" /><span>Learning Programs</span></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="chart-menu-item" onClick={() => setView('mylearning')}>
                <div className="menu-item-left"><BookOpen size={20} color="#333" /><span>My Learning</span></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
            </div>

            <div className="important-note-box">
              <div className="note-header">Important Note</div>
              <div className="note-body">
                <AlertCircle size={20} color="#444" />
                <p>Please reach out to HR for training nomination.</p>
              </div>
            </div>
          </>
        )}

        {/* LEARNING CALENDAR */}
        {view === 'calendar' && (
          <div className="chart-subpage-view">
            <div className="cal-section">
              <div className="calendar-month-nav">
                <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() - 1, 1))}>
                  <ChevronLeftCircle size={24} color="#2b1d62" />
                </button>
                <span className="current-month-label">
                  {navDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth() + 1, 1))}>
                  <ChevronRightCircle size={24} color="#2b1d62" />
                </button>
              </div>

              <div className="calendar-grid-mock">{renderCalendarDays()}</div>
            </div>

            <div className="cal-bottom-detail">
              {loading ? (
                <div className="registered-hints">
                  <h4 className="section-title">Loading</h4>
                  <div className="hint-item"><CheckCircle2 size={14} color="#2b1d62" /> <span>Fetching data from n8n…</span></div>
                </div>
              ) : !selectedDate ? (
                <div className="registered-hints">
                  <h4 className="section-title">Registered Hints</h4>
                  {myPrograms.length === 0 ? (
                    <div className="hint-item"><CheckCircle2 size={14} color="#2b1d62" /> <span>No registered trainings yet.</span></div>
                  ) : (
                    myPrograms.map(p => (
                      <div key={p.id || `${p.title}-${p.date}`} className="hint-item">
                        <CheckCircle2 size={14} color="#2b1d62" /> <span>{p.title} ({p.date})</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <h4 className="section-title">Schedule for {selectedDate}</h4>
                  {renderTimeline()}
                  {(() => {
                    const dayEvents = myPrograms.filter(p => p.date === selectedDate);
                    const withTime = dayEvents.filter(e => e.startTime && e.endTime);
                    if (dayEvents.length > 0 && withTime.length === 0) {
                      return (
                        <div className="registered-hints" style={{ marginTop: 12 }}>
                          {dayEvents.map(p => (
                            <div key={p.id || `${p.title}-${p.date}`} className="hint-item">
                              <CheckCircle2 size={14} color="#2b1d62" /> <span>{p.title}</span>
                              {p.startTime && <span style={{ marginLeft: 6, color: '#555' }}>{p.startTime}</span>}
                              {p.location && <span className="hint-venue"> — {p.location}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* MY UPCOMING TRAININGS */}
        {view === 'upcoming' && (
          <div className="chart-subpage-view">
            <h4 className="section-title">Confirmed & Pending Trainings</h4>

            {loading ? (
              <div className="training-detail-card">
                <div className="card-top"><h4>Loading…</h4></div>
              </div>
            ) : myPrograms.length === 0 ? (
              <div className="training-detail-card">
                <div className="card-top"><h4>No trainings found</h4></div>
              </div>
            ) : (
              myPrograms.map(p => (
                <div
                  key={p.id || `${p.title}-${p.date}`}
                  className="training-detail-card"
                  onClick={() => setSelectedEvent(p)}
                >
                  <div className="card-top">
                    <h4>{p.title}</h4>
                    <span
                      className="s-badge"
                      style={{
                        backgroundColor: normalizeStatus(p.status) === 'approved' || normalizeStatus(p.status) === 'confirmed'
                          ? '#e8f5e9'
                          : '#fff3e0',
                        color: normalizeStatus(p.status) === 'approved' || normalizeStatus(p.status) === 'confirmed'
                          ? '#2e7d32'
                          : '#e65100'
                      }}
                    >
                      {p.status || 'Pending'}
                    </span>
                  </div>
                  <div className="card-info-row"><CalendarIcon size={14} /> <span>{p.date || 'N/A'}</span></div>
                  <div className="card-info-row"><Clock size={14} /> <span>{p.startTime && p.endTime ? `${p.startTime} - ${p.endTime}` : 'N/A'}</span></div>
                  <div className="card-info-row"><MapPin size={14} /> <span>{p.location || 'N/A'}</span></div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LEARNING PROGRAMS */}
        {view === 'programs' && (
          <div className="chart-subpage-view">
            <h4 className="section-title">Open for Registration</h4>

            {loading ? (
              <div className="available-program-card">
                <div className="p-card-content"><h4>Loading…</h4></div>
              </div>
            ) : availablePrograms.length === 0 ? (
              <div className="available-program-card">
                <div className="p-card-content"><h4>No programs available</h4></div>
              </div>
            ) : (
              availablePrograms.map(p => {
                const isSignedUp = myPrograms.some(
                  prog =>
                    (prog.id && p.id && prog.id === p.id) ||
                    (prog.title === p.title && prog.date === p.date)
                );

                return (
                  <div
                    key={p.id || `${p.title}-${p.date}`}
                    className="available-program-card"
                    onClick={() => setSelectedEvent(p)}
                  >
                    <div className="p-card-content">
                      <h4>{p.title}</h4>
                      <p>Duration: {p.duration || 'N/A'}</p>
                      {isSignedUp && <span className="signed-badge">Already signed up</span>}
                    </div>

                    <button
                      className={`signup-btn ${isSignedUp ? 'disabled' : ''}`}
                      disabled={isSignedUp || loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSignedUp) {
                          alert('You have already signed up for this program.');
                          return;
                        }
                        setSelectedEvent(p);
                        setShowConfirm(true);
                      }}
                    >
                      {isSignedUp ? 'Signed Up' : 'Sign Up'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* MY LEARNING REQUEST */}
        {view === 'mylearning' && (
          <div className="chart-subpage-view">
            <div className="request-form-card">
              <h4 className="section-title">External Learning Request</h4>
              <p className="hint-text">For non-HR provided programs.</p>

              <div className="form-group">
                <label>Program Title *</label>
                <input
                  type="text"
                  className="c-input"
                  value={requestForm.title}
                  onChange={e => setRequestForm({ ...requestForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Date & Time *</label>
                <input
                  type="datetime-local"
                  className="c-input"
                  value={requestForm.dateTime}
                  onChange={e => setRequestForm({ ...requestForm, dateTime: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Address / Venue *</label>
                <input
                  type="text"
                  className="c-input"
                  value={requestForm.venue}
                  onChange={e => setRequestForm({ ...requestForm, venue: e.target.value })}
                />
              </div>

              <button className="submit-req-btn" onClick={handleRequestSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Activity Detail Modal */}
      {selectedEvent && !showConfirm && (
        <div className="chart-modal-overlay">
          <div className="event-detail-modal">
            <div className="modal-top">
              <h3>Activity Details</h3>
              <X size={24} onClick={() => setSelectedEvent(null)} style={{ cursor: 'pointer' }} />
            </div>

            <div className="modal-main">
              <h2 className="m-title">{selectedEvent.title}</h2>
              <div className="m-row"><CalendarIcon size={16} color="#00a8ff" /> <span>{selectedEvent.date || 'N/A'}</span></div>
              <div className="m-row">
                <Clock size={16} color="#00a8ff" />{' '}
                <span>
                  {selectedEvent.startTime
                    ? `${selectedEvent.startTime} - ${selectedEvent.endTime}`
                    : (selectedEvent.time || 'N/A')}
                </span>
              </div>
              <div className="m-row"><User size={16} color="#00a8ff" /> <span>Trainer: {selectedEvent.trainer || 'N/A'}</span></div>
              <div className="m-row"><MapPin size={16} color="#00a8ff" /> <span>{selectedEvent.location || 'N/A'}</span></div>
              <div className="m-desc-box">
                <h4>Description</h4>
                <p>{selectedEvent.desc || 'No description available for this program.'}</p>
              </div>
            </div>

            <button className="m-close-btn" onClick={() => setSelectedEvent(null)}>Done</button>
          </div>
        </div>
      )}

      {/* About CHART Modal */}
      {showAboutModal && (
        <div className="chart-modal-overlay">
          <div className="event-detail-modal about-modal">
            <div className="modal-top">
              <h3>About CHART</h3>
              <X size={24} onClick={() => setShowAboutModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <div className="modal-main">
              <p>CHART (Chin Hin Academy for Reskilling & Transformation) is dedicated to fostering a culture of continuous learning.</p>
              <p>Our mission is to equip our employees with future-ready skills through structured training, workshops, and transformation programs.</p>
            </div>
            <button className="m-close-btn" onClick={() => setShowAboutModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Confirm Enroll Modal */}
      {showConfirm && selectedEvent && (
        <div className="chart-modal-overlay">
          <div className="confirm-dialog">
            <AlertCircle size={40} color="#f39c12" />
            <h3>Enroll in Program?</h3>
            <p>Are you sure you want to sign up for <strong>{selectedEvent.title}</strong>?</p>
            <div className="confirm-actions">
              <button
                className="cancel-btn"
                onClick={() => { setShowConfirm(false); setSelectedEvent(null); }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={handleConfirmSignUp}
                disabled={loading}
              >
                {loading ? 'Submitting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chart;