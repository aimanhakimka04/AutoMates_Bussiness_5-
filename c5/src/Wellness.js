import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Dumbbell, User2, BookOpen, Stethoscope,
  ChevronRight, MapPin, Calendar, Clock, Info, UserCheck, X,
  ChevronDown, ChevronUp, Ticket, UserCircle,
  FilePenLine, Monitor, CalendarCheck, CalendarDays, AlertCircle,
  Trash2, CheckCircle2, XCircle, Loader2, Users, Activity,
  Heart, Star, TrendingUp, RefreshCw, BadgeCheck
} from 'lucide-react';
import './Wellness.css';

// ─── n8n CONFIG ──────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://n8n.aimanhakimka.site/webhook-test/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'wellness', ...payload },
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

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
let toastId = 0;
const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="wl-toast-wrapper">
    {toasts.map(t => (
      <div key={t.id} className={`wl-toast wl-toast-${t.type}`}>
        {t.type === 'success' && <CheckCircle2 size={18} />}
        {t.type === 'error'   && <XCircle      size={18} />}
        {t.type === 'info'    && <Info         size={18} />}
        {t.type === 'loading' && <Loader2      size={18} className="wl-spin" />}
        <span>{t.message}</span>
        <button className="wl-toast-close" onClick={() => onDismiss(t.id)}><X size={14} /></button>
      </div>
    ))}
  </div>
);

// ─── SKELETON LOADERS ─────────────────────────────────────────────────────────
const SkeletonCard = ({ lines = 2 }) => (
  <div className="wl-skeleton-card">
    <div className="wl-sk-avatar" />
    <div className="wl-sk-lines">
      <div className="wl-sk-line wl-sk-line-lg" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`wl-sk-line ${i % 2 === 0 ? 'wl-sk-line-md' : 'wl-sk-line-sm'}`} />
      ))}
    </div>
  </div>
);

// ─── CAPACITY BAR ─────────────────────────────────────────────────────────────
const CapacityBar = ({ booked, max }) => {
  const pct = Math.min(100, Math.round((booked / max) * 100));
  const color = pct >= 90 ? '#e74c3c' : pct >= 70 ? '#f39c12' : '#27ae60';
  return (
    <div className="wl-cap-bar-wrap">
      <div className="wl-cap-bar-bg">
        <div className="wl-cap-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="wl-cap-label" style={{ color }}>{booked}/{max}</span>
    </div>
  );
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Confirmed: { bg: '#e8f9ee', color: '#27ae60', icon: <BadgeCheck size={11} /> },
    Cancelled:  { bg: '#fdecea', color: '#e74c3c', icon: <XCircle    size={11} /> },
    Pending:    { bg: '#fff8e1', color: '#f39c12', icon: <Clock       size={11} /> },
  };
  const s = map[status] || map.Pending;
  return (
    <span className="wl-status-badge" style={{ background: s.bg, color: s.color }}>
      {s.icon} {status}
    </span>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Wellness = ({ userInfo }) => {
  const navigate = useNavigate();
  const employeeEmail = userInfo?.email || '';
  const employeeName  = userInfo?.name  || '';

  // ── Views & selection state ──────────────────────────────────────────────
  const [view, setView]                               = useState('menu');
  const [selectedTrainer, setSelectedTrainer]         = useState(null);
  const [selectedPackage, setSelectedPackage]         = useState(null);
  const [selectedBooking, setSelectedBooking]         = useState(null);
  const [selectedTcmAppointment, setSelectedTcmAppointment]   = useState(null);
  const [selectedPhysioAppointment, setSelectedPhysioAppointment] = useState(null);
  const [showConfirm, setShowConfirm]                 = useState(false);
  const [nursingModal, setNursingModal]               = useState(null);
  const [pendingClass, setPendingClass]               = useState(null);

  // ── Toast system ─────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    if (type !== 'loading') {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const updateToast  = (id, message, type) =>
    setToasts(prev => prev.map(t => t.id === id ? { ...t, message, type } : t));

  // ── Profile form ─────────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({
    fullName: employeeName || 'ALAN TAN WAI LOON',
    email: employeeEmail || '',
    phone: '', emergencyName: '', emergencyPhone: '',
    age: '', gender: '', primaryGoal: '', timeline: '',
    activityLevel: '', trainingDays: '', onDiet: 'No',
    trainingInterests: [], preferredMode: '', preferredTime: '',
    workedWithTrainer: 'No', motivations: [],
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [expanded, setExpanded] = useState({ basic: true, goals: true, lifestyle: true, prefs: true, motivation: true });

  const handleInputChange = (field, value) => {
    if (field === 'age') { const v = parseInt(value); value = isNaN(v) ? '' : Math.min(100, Math.max(0, v)).toString(); }
    if (field === 'phone' || field === 'emergencyPhone') value = value.replace(/\D/g, '');
    setProfileData(prev => ({ ...prev, [field]: value }));
  };
  const toggleMultiSelect = (field, value) =>
    setProfileData(prev => {
      const cur = prev[field];
      return { ...prev, [field]: cur.includes(value) ? cur.filter(i => i !== value) : [...cur, value] };
    });
  const toggleSection = sec => setExpanded(prev => ({ ...prev, [sec]: !prev[sec] }));

  // ── Data state (DB-aware schema) ─────────────────────────────────────────
  const [classes, setClasses] = useState([
    { id: 'C1', class_id: 1, name: 'Zumba | Group Training',   trainer: 'Reiko Chye',  weekday: 'Friday',   time: '18:00 - 20:00', date: '13 Feb 2026', location: 'Fitness Studio, Level 19', max_capacity: 12, registered_count: 4, spots: '4/12 spots', is_active: true },
    { id: 'C2', class_id: 2, name: 'Yoga | Morning Flow',      trainer: 'Derek Koay',  weekday: 'Sunday',   time: '08:30 - 10:00', date: '15 Feb 2026', location: 'Idea Lab 2',               max_capacity: 10, registered_count: 2, spots: '2/10 spots', is_active: true },
    { id: 'C3', class_id: 3, name: 'HIIT Blast',               trainer: 'Edward Chuah',weekday: 'Wednesday',time: '07:00 - 08:00', date: '18 Feb 2026', location: 'Fitness Studio, Level 19', max_capacity: 15, registered_count: 12, spots: '12/15 spots', is_active: true },
  ]);
  const [trainers, setTrainers] = useState([
    { trainer_id: 1, name: 'Reiko Chye',   bio: 'Certified fat-loss and cardio specialist with 3 years experience.',  specs: ['Fat Loss', 'Cardio Training'], is_active: true },
    { trainer_id: 2, name: 'Edward Chuah', bio: 'Former competitive bodybuilder with 15 years of coaching experience.', specs: ['Strength Training', 'Bodybuilding'], is_active: true },
    { trainer_id: 3, name: 'Derek Koay',   bio: 'Certified yoga practitioner focused on flexibility and mindfulness.',  specs: ['Yoga', 'Flexibility'], is_active: true },
  ]);
  const [memberships, setMemberships] = useState([
    { id: 1, name: 'Standard Training Package',        detail: 'Includes 12 personal training sessions', validity: '60 day(s)', fee: 'RM 0',
      desc: 'For short-term results or getting back into training.',
      coachPricing: [
        { level: 'FORM Coach (Level 1)',   total: 'RM2256', rate: 'RM188/session' },
        { level: 'LEAD Coach (Level 2)',   total: 'RM2640', rate: 'RM220/session' },
        { level: 'MENTOR Coach (Level 3)', total: 'RM3120', rate: 'RM260/session' },
      ]},
    { id: 2, name: 'Advanced Training Package',        detail: 'Includes 24 personal training sessions', validity: '90 day(s)', fee: 'RM 0',
      desc: 'Medium-term training for sustainable results and deeper lifestyle integration.',
      coachPricing: [
        { level: 'FORM Coach (Level 1)',   total: 'RM4512', rate: 'RM188/session' },
        { level: 'LEAD Coach (Level 2)',   total: 'RM5280', rate: 'RM220/session' },
        { level: 'MENTOR Coach (Level 3)', total: 'RM6240', rate: 'RM260/session' },
      ]},
    { id: 3, name: 'Extreme Training Package (FORM90)', detail: 'Includes 36 personal training sessions', validity: '120 day(s)', fee: 'RM 0',
      desc: 'Long-term transformation for complete lifestyle overhaul.',
      coachPricing: [
        { level: 'FORM Coach (Level 1)',   total: 'RM6768', rate: 'RM188/session' },
        { level: 'LEAD Coach (Level 2)',   total: 'RM7920', rate: 'RM220/session' },
        { level: 'MENTOR Coach (Level 3)', total: 'RM9360', rate: 'RM260/session' },
      ]},
  ]);
  const [tcmAppointments, setTcmAppointments] = useState([
    { id: 'T1', title: 'Acupuncture Session', provider: 'Wellness TCM', date: '22 Feb 2026', time: '14:00 - 15:00', location: 'TCM Room, Level 19', status: 'Confirmed' },
  ]);
  const [tcmPackages, setTcmPackages] = useState([
    { id: 101, name: 'Basic Acupuncture Set',   detail: '5 Sessions + Consultation', fee: 'RM 450', desc: 'Balancing energy flow and relieving chronic pain.' },
    { id: 102, name: 'Premium Tui Na Therapy',  detail: '10 Sessions (60 mins each)', fee: 'RM 880', desc: 'Deep tissue Chinese massage for circulation and recovery.' },
  ]);
  const [physioAppointments, setPhysioAppointments] = useState([
    { id: 'P1', title: 'Sports Massage', provider: 'Wellness Physio', date: '23 Feb 2026', time: '09:00 - 10:00', location: 'Physio Room, Level 19', status: 'Confirmed' },
  ]);
  const [physioPackages, setPhysioPackages] = useState([
    { id: 201, name: 'Recovery Package',       detail: '5 Sessions (60 mins each)', fee: 'RM 600',  desc: 'Post-workout recovery and muscle relaxation.' },
    { id: 202, name: 'Rehabilitation Program', detail: '10 Sessions with assessment', fee: 'RM 1200', desc: 'Personalized rehab plan for injury recovery and prevention.' },
  ]);
  const [myBookings, setMyBookings] = useState([
    { id: 'B1', registration_id: 1, title: 'Zumba | Group Training', provider: 'EXFORM', date: '13 Jan 2026', time: '18:00 - 20:00', trainer: 'Reiko Chye', spots: '4/12 spots', location: 'Fitness Studio, Level 19, Menara Chin Hin', status: 'Confirmed', desc: 'High-energy cardio session combined with Latin-inspired dance moves.' },
  ]);

  // ── Async loading ─────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(false);
  const [apiError, setApiError]   = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWellnessData = useCallback(async () => {
    if (!employeeEmail) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await callN8N('get_wellness_overview', { employee_email: employeeEmail, employee_name: employeeName });
      console.log('[Wellness] n8n raw response:', JSON.stringify(res, null, 2));

      // Handle error responses from n8n
      if (res?.type === 'failed' || res?.success === false) {
        setApiError(`API error: ${res?.message || 'Unknown error from n8n'}`);
        return;
      }

      // Unwrap: try all known envelope shapes
      const root =
        res?.data ||
        res?.result?.data ||
        res?.result ||
        res || {};

      console.log('[Wellness] resolved root:', JSON.stringify(root, null, 2));

      if (Array.isArray(root.classes))     setClasses(root.classes);
      if (Array.isArray(root.trainers))    setTrainers(root.trainers);
      if (Array.isArray(root.my_bookings)) setMyBookings(root.my_bookings);
      if (Array.isArray(root.memberships)) setMemberships(root.memberships);
      if (Array.isArray(root.tcm_packages))        setTcmPackages(root.tcm_packages);
      if (Array.isArray(root.physio_packages))     setPhysioPackages(root.physio_packages);
      if (Array.isArray(root.tcm_appointments))    setTcmAppointments(root.tcm_appointments);
      if (Array.isArray(root.physio_appointments)) setPhysioAppointments(root.physio_appointments);

      if (!root.classes && !root.trainers) {
        setApiError(`Loaded but no data found. Check n8n sub workflow. Raw: ${JSON.stringify(res).substring(0, 120)}`);
      }
    } catch (err) {
      console.error('[Wellness] fetch error:', err);
      setApiError(`Load failed: ${err.message} — check browser console for details.`);
    } finally {
      setLoading(false);
    }
  }, [employeeEmail, employeeName]);

  useEffect(() => { if (employeeEmail) fetchWellnessData(); }, [employeeEmail, fetchWellnessData]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const tcmViewMap = {
    'About TCM':             'tcm-about',
    'Purchase TCM Session':  'tcm-purchase',
    'Schedule My Appointment': 'tcm-schedule',
    'View My Appointment':   'tcm-view',
  };
  const physioViewMap = {
    'About Physiotherapy':     'physio-about',
    'Purchase Physio Session': 'physio-purchase',
    'Schedule My Appointment': 'physio-schedule',
    'View My Appointment':     'physio-view',
  };

  const handleBack = () => {
    if (view === 'menu') navigate('/');
    else if (view === 'tcm-appointment-detail') setView('tcm-view');
    else if (view === 'physio-appointment-detail') setView('physio-view');
    else if (view.startsWith('tcm-'))   setView('tcm');
    else if (view.startsWith('physio-')) setView('physio');
    else if (view === 'trainer-profile')   setView('trainers');
    else if (view === 'wellness-profile')  setView('membership-detail');
    else if (view === 'membership-detail') {
      if (selectedPackage?.coachPricing)      setView('membership-list');
      else if (selectedPackage?.id >= 200)    setView('physio-purchase');
      else                                    setView('tcm-purchase');
    }
    else if (view === 'booking-detail') setView('my-bookings');
    else if (['timetable', 'trainers', 'membership-list', 'my-bookings'].includes(view)) setView('fitness');
    else setView('menu');
  };

  const getNavTitle = () => {
    const map = {
      fitness: 'Wellness: Fitness Studio', nursing: 'Nursing',
      timetable: 'Wellness Journey', trainers: 'Wellness Journey',
      'membership-list': 'Wellness Journey', 'membership-detail': 'Package Detail',
      'wellness-profile': 'Wellness Profile', 'my-bookings': 'My Bookings',
      'booking-detail': 'Booking Detail', tcm: 'Wellness: TCM',
      'tcm-about': 'Wellness: TCM', 'tcm-purchase': 'Wellness: TCM',
      'tcm-schedule': 'Wellness: TCM', 'tcm-view': 'Wellness: TCM',
      'tcm-appointment-detail': 'Appointment Details',
      physio: 'Wellness: Physiotherapy',
      'physio-about': 'Wellness: Physiotherapy', 'physio-purchase': 'Wellness: Physiotherapy',
      'physio-schedule': 'Wellness: Physiotherapy', 'physio-view': 'Wellness: Physiotherapy',
      'physio-appointment-detail': 'Appointment Details',
    };
    return map[view] || 'Wellness';
  };

  // ── TCM handlers ──────────────────────────────────────────────────────────
  const handleBookTcmAppointment = async () => {
    if (!employeeEmail) { showToast('Missing user identity. Please re-login.', 'error'); return; }
    const newApp = {
      id: `T${Date.now()}`, title: 'Pulse Diagnosis & Consultation',
      provider: 'Wellness TCM', date: 'Tomorrow',
      time: '10:00 - 10:30', location: 'TCM Room, Level 19', status: 'Confirmed',
    };
    if (tcmAppointments.some(a => a.title === newApp.title && a.date === newApp.date)) {
      showToast('You have already booked this TCM session.', 'error'); return;
    }
    setActionLoading(true);
    const tid = showToast('Booking TCM appointment…', 'loading');
    try {
      const res = await callN8N('book_tcm_appointment', {
        employee_email: employeeEmail, employee_name: employeeName,
        appointment_title: newApp.title, date: newApp.date, time: newApp.time, location: newApp.location,
      });
      const data = res?.data || res?.result?.data;
      const finalApp = data?.id ? { ...newApp, id: data.id } : newApp;
      setTcmAppointments(prev => [...prev, finalApp]);
      dismissToast(tid);
      showToast('TCM appointment booked successfully!', 'success');
      setView('tcm-view');
    } catch {
      setTcmAppointments(prev => [...prev, newApp]);
      dismissToast(tid);
      showToast('Appointment saved locally. Sync may be pending.', 'info');
      setView('tcm-view');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTcmAppointment = async (id) => {
    setActionLoading(true);
    const tid = showToast('Cancelling appointment…', 'loading');
    try {
      if (employeeEmail) await callN8N('delete_tcm_appointment', { employee_email: employeeEmail, appointment_id: id });
    } catch { /* still remove locally */ }
    setTcmAppointments(prev => prev.filter(a => a.id !== id));
    dismissToast(tid);
    showToast('Appointment cancelled.', 'success');
    setActionLoading(false);
    setView('tcm-view');
  };

  // ── Physio handlers ───────────────────────────────────────────────────────
  const handleBookPhysioAppointment = async (slot) => {
    if (!employeeEmail) { showToast('Missing user identity. Please re-login.', 'error'); return; }
    const newApp = {
      id: `P${Date.now()}`, title: slot.title, provider: 'Wellness Physio',
      date: slot.date, time: slot.time, location: slot.location, status: 'Confirmed',
    };
    if (physioAppointments.some(a => a.title === newApp.title && a.date === newApp.date && a.time === newApp.time)) {
      showToast('You have already booked this physiotherapy session.', 'error'); return;
    }
    setActionLoading(true);
    const tid = showToast('Booking physiotherapy session…', 'loading');
    try {
      const res = await callN8N('book_physio_appointment', {
        employee_email: employeeEmail, employee_name: employeeName,
        appointment_title: newApp.title, date: newApp.date, time: newApp.time, location: newApp.location,
      });
      const data = res?.data || res?.result?.data;
      const finalApp = data?.id ? { ...newApp, id: data.id } : newApp;
      setPhysioAppointments(prev => [...prev, finalApp]);
      dismissToast(tid);
      showToast('Physiotherapy session booked!', 'success');
      setView('physio-view');
    } catch {
      setPhysioAppointments(prev => [...prev, newApp]);
      dismissToast(tid);
      showToast('Appointment saved locally. Sync may be pending.', 'info');
      setView('physio-view');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePhysioAppointment = async (id) => {
    setActionLoading(true);
    const tid = showToast('Cancelling appointment…', 'loading');
    try {
      if (employeeEmail) await callN8N('delete_physio_appointment', { employee_email: employeeEmail, appointment_id: id });
    } catch { /* still remove locally */ }
    setPhysioAppointments(prev => prev.filter(a => a.id !== id));
    dismissToast(tid);
    showToast('Appointment cancelled.', 'success');
    setActionLoading(false);
    setView('physio-view');
  };

  // ── Fitness class booking handler ─────────────────────────────────────────
  const handleConfirmBookClass = async () => {
    if (!pendingClass) { setShowConfirm(false); return; }
    if (myBookings.some(b => b.title === pendingClass.name && b.date === pendingClass.date)) {
      showToast('You have already booked this class.', 'error');
      setPendingClass(null); setShowConfirm(false); return;
    }
    setShowConfirm(false);
    setActionLoading(true);
    const tid = showToast('Confirming your booking…', 'loading');
    const newBooking = {
      id: `B${Date.now()}`, title: pendingClass.name, provider: 'EXFORM',
      date: pendingClass.date, time: pendingClass.time,
      trainer: pendingClass.trainer || '', spots: `${(pendingClass.registered_count || 0) + 1}/${pendingClass.max_capacity || 12} spots`,
      location: pendingClass.location, status: 'Confirmed',
      desc: 'Booked via Employee Wellness App.',
    };
    try {
      const res = await callN8N('book_fitness_class', {
        employee_email: employeeEmail, employee_name: employeeName,
        class_id: pendingClass.class_id || pendingClass.id,
        class_title: pendingClass.name,
        date: pendingClass.date, time: pendingClass.time, location: pendingClass.location,
      });
      const data = res?.data || res?.result?.data;
      if (data?.registration_id) newBooking.id = `B${data.registration_id}`;
      if (res?.success === false || res?.result?.success === false) {
        dismissToast(tid);
        showToast(res?.message || res?.result?.message || 'Booking failed. Class may be full.', 'error');
        setActionLoading(false); setPendingClass(null); return;
      }
      // Update capacity count in classes list
      setClasses(prev => prev.map(c =>
        c.id === pendingClass.id
          ? { ...c, registered_count: c.registered_count + 1, spots: `${c.registered_count + 1}/${c.max_capacity} spots` }
          : c
      ));
    } catch {
      // show locally anyway
    }
    setMyBookings(prev => [...prev, newBooking]);
    dismissToast(tid);
    showToast('Class booked successfully! 🎉', 'success');
    setActionLoading(false);
    setPendingClass(null);
  };

  // ── Profile submit handler ────────────────────────────────────────────────
  const handleProfileSubmit = async () => {
    const errs = {};
    if (!profileData.email) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) errs.email = 'Please enter a valid email address.';
    if (!profileData.phone) errs.phone = 'Phone number is required.';
    if (!profileData.emergencyPhone) errs.emergencyPhone = 'Emergency contact phone is required.';
    setProfileErrors(errs);
    if (Object.keys(errs).length) return;
    if (!employeeEmail) { showToast('Missing user identity. Please re-login.', 'error'); return; }
    setActionLoading(true);
    const tid = showToast('Submitting your wellness profile…', 'loading');
    try {
      await callN8N('submit_wellness_profile', { employee_email: employeeEmail, employee_name: employeeName, profile: profileData });
      dismissToast(tid);
      showToast('Profile submitted! A coach will be in touch.', 'success');
      setView('fitness');
    } catch {
      dismissToast(tid);
      showToast('Submission failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="wellness-container">
      {/* TOP NAV */}
      <nav className="wellness-top-nav">
        <div className="back-arrow" onClick={handleBack}>
          <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span className="nav-title">{getNavTitle()}</span>
        {view !== 'menu' && (
          <button className="wl-refresh-btn" onClick={fetchWellnessData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'wl-spin' : ''} />
          </button>
        )}
      </nav>

      {/* TOAST */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="wellness-scroll-content">

        {/* API error banner */}
        {apiError && (
          <div className="wl-error-banner">
            <AlertCircle size={16} />
            <span>{apiError}</span>
            <button onClick={() => setApiError('')}><X size={14} /></button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            1. MAIN MENU
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'menu' && (
          <div className="wellness-main-menu">
            <div className="wl-welcome-banner">
              <div className="wl-welcome-text">
                <h2>Welcome back,</h2>
                <h3>{(employeeName || 'Employee').split(' ')[0]} 👋</h3>
                <p>Your wellness journey continues today.</p>
              </div>
              <img src="/icon_img/wellnesspage.png" alt="Wellness" className="wl-welcome-img" />
            </div>
            <div className="wellness-card-grid">
              {[
                { icon: <Dumbbell size={28}/>,    label: 'Fitness Studio',  view: 'fitness', color: '#e8f4ff', accent: '#2b6cb0' },
                { icon: <Stethoscope size={28}/>, label: 'Physiotherapy',   view: 'physio',  color: '#f0fff4', accent: '#276749' },
                { icon: <User2 size={28}/>,       label: 'Nursing Room',    view: 'nursing', color: '#fff5f7', accent: '#97266d' },
                { icon: <BookOpen size={28}/>,    label: 'TCM',             view: 'tcm',     color: '#fffaf0', accent: '#7b341e' },
              ].map(item => (
                <div key={item.view} className="wellness-card" style={{ '--card-bg': item.color, '--card-accent': item.accent }} onClick={() => setView(item.view)}>
                  <div className="wl-card-icon-ring" style={{ background: item.color }}>
                    <span style={{ color: item.accent }}>{item.icon}</span>
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            2. FITNESS STUDIO MENU
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'fitness' && (
          <div className="fitness-view">
            <div className="fitness-banner">
              <div className="banner-left-text">
                <div className="wl-banner-badge"><TrendingUp size={12}/> Free Trial Available</div>
                <h2>Start Your Free Trial Today</h2>
                <p>Kickstart your fitness journey with a complimentary trial session!</p>
                <button className="free-trial-btn" onClick={() => showToast('Free trial request sent! We will contact you soon.', 'success')}>
                  Free Trial
                </button>
              </div>
              <div className="banner-right-img">
                <img src="/icon_img/studio.png" alt="Studio" />
              </div>
            </div>
            <div className="list-menu">
              {[
                { icon: <Calendar size={20}/>,  title: 'Timetable Class',         sub: 'Book group fitness sessions',    view: 'timetable',       badge: `${classes.length}` },
                { icon: <UserCheck size={20}/>, title: 'Personal Trainer Profile', sub: 'Discover detailed profiles',     view: 'trainers',        badge: `${trainers.length}` },
                { icon: <Dumbbell size={20}/>,  title: 'Buy Membership',           sub: 'Your fitness partner starts here', view: 'membership-list', badge: '' },
                { icon: <CalendarDays size={20}/>, title: 'My Bookings',           sub: 'Manage your bookings',           view: 'my-bookings',     badge: myBookings.length > 0 ? `${myBookings.length}` : '' },
              ].map(item => (
                <div key={item.view} className="list-item" onClick={() => setView(item.view)}>
                  <div className="item-content">
                    <div className="wl-list-icon">{item.icon}</div>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.sub}</p>
                    </div>
                  </div>
                  <div className="wl-list-right">
                    {item.badge && <span className="wl-count-badge">{item.badge}</span>}
                    <ChevronRight size={18} color="#ccc" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            3. TIMETABLE VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'timetable' && (
          <div className="timetable-page-container">
            <div className="timetable-view-list">
              <div className="timetable-section">
                <div className="wl-section-header">
                  <h3 className="section-title">Book Your Class</h3>
                  <span className="wl-section-count">{classes.length} Available</span>
                </div>
                {loading ? (
                  <div className="class-list">{[1,2,3].map(i => <SkeletonCard key={i} lines={2} />)}</div>
                ) : (
                  <div className="class-list">
                    {classes.filter(c => c.is_active !== false).map(c => {
                      const isFull = c.registered_count >= c.max_capacity;
                      return (
                        <div key={c.id} className={`class-card-item ${isFull ? 'class-card-full' : ''}`}>
                          <div className="class-info-left">
                            <div className="wl-class-top-row">
                              <h4>{c.name}</h4>
                              {isFull && <span className="wl-full-tag">Full</span>}
                            </div>
                            <p><Clock size={12} /> {c.time} · {c.date}</p>
                            <p><MapPin size={12} /> {c.location}</p>
                            <p><UserCheck size={12} /> {c.trainer || 'TBA'}</p>
                            <CapacityBar booked={c.registered_count} max={c.max_capacity} />
                          </div>
                          <button
                            className={`book-now-btn ${isFull ? 'book-now-btn-disabled' : ''}`}
                            disabled={isFull || actionLoading}
                            onClick={() => { setPendingClass(c); setShowConfirm(true); }}
                          >
                            {isFull ? 'Full' : 'Book'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="timetable-section">
                <h3 className="section-title">Book Your Personal Trainer</h3>
                {loading ? (
                  <div className="trainer-list-mini">{[1,2,3].map(i => <SkeletonCard key={i} lines={1} />)}</div>
                ) : (
                  <div className="trainer-list-mini">
                    {trainers.map((t, i) => (
                      <div key={t.trainer_id || i} className="mini-trainer-card" onClick={() => { setSelectedTrainer(t); setView('trainer-profile'); }}>
                        <div className="trainer-card-img-placeholder wl-trainer-avatar">
                          <span>{t.name.charAt(0)}</span>
                        </div>
                        <div className="trainer-card-info">
                          <h4>{t.name}</h4>
                          <div className="wl-spec-tags">
                            {(t.specs || []).slice(0, 2).map(s => (
                              <span key={s} className="wl-spec-tag">{s}</span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight size={18} color="#ccc" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            4. TRAINERS LIST
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'trainers' && (
          <div className="trainers-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>Our Trainers</h3>
            {loading ? [1,2,3].map(i => <SkeletonCard key={i} lines={2} />) : trainers.map((t, i) => (
              <div key={t.trainer_id || i} className="trainer-card wl-trainer-card-fancy" onClick={() => { setSelectedTrainer(t); setView('trainer-profile'); }}>
                <div className="wl-trainer-avatar-lg">{t.name.charAt(0)}</div>
                <div className="wl-trainer-card-body">
                  <h4>{t.name}</h4>
                  <p className="wl-trainer-bio">{t.bio?.substring(0, 65)}{t.bio?.length > 65 ? '…' : ''}</p>
                  <div className="wl-spec-tags" style={{ marginTop: 6 }}>
                    {(t.specs || []).map(s => <span key={s} className="wl-spec-tag">{s}</span>)}
                  </div>
                </div>
                <ChevronRight size={18} color="#ccc" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            5. TRAINER PROFILE
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'trainer-profile' && selectedTrainer && (
          <div className="profile-view">
            <div className="wl-trainer-hero">
              <div className="wl-trainer-hero-avatar">{selectedTrainer.name.charAt(0)}</div>
            </div>
            <div className="profile-content">
              <h2 style={{ fontSize: 22, margin: 0 }}>{selectedTrainer.name}</h2>
              <div className="wl-spec-tags" style={{ marginTop: 8 }}>
                {(selectedTrainer.specs || []).map(s => <span key={s} className="wl-spec-tag wl-spec-tag-lg">{s}</span>)}
              </div>
              <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginTop: 16 }}>
                {selectedTrainer.bio || 'Experienced wellness professional dedicated to helping you achieve your fitness goals.'}
              </p>
              <div className="wl-divider" />
              <h4 style={{ color: '#2b1d62', marginBottom: 8 }}>Interested in training with {selectedTrainer.name.split(' ')[0]}?</h4>
              <button className="interest-btn" onClick={() => { setView('wellness-profile'); }}>
                <Activity size={16} style={{ marginRight: 6 }} /> Create My Wellness Profile
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            6. MEMBERSHIP LIST
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'membership-list' && (
          <div className="membership-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>Training Packages</h3>
            {memberships.map((m, idx) => {
              const colors = ['#e8f4ff', '#f0fff4', '#fff8e1'];
              const accents = ['#2b6cb0', '#276749', '#7b5e00'];
              return (
                <div key={m.id} className="wl-membership-card" style={{ '--mc-bg': colors[idx], '--mc-accent': accents[idx] }} onClick={() => { setSelectedPackage(m); setView('membership-detail'); }}>
                  <div className="wl-mc-tier-label" style={{ color: accents[idx] }}>
                    {idx === 0 ? '⚡ Starter' : idx === 1 ? '🔥 Popular' : '💎 Premium'}
                  </div>
                  <h4>{m.name}</h4>
                  <p className="wl-mc-detail">{m.detail}</p>
                  <div className="wl-mc-meta">
                    <span><Calendar size={12} /> {m.validity}</span>
                    <span className="wl-mc-price">{m.fee}</span>
                  </div>
                  <p className="wl-mc-desc">{m.desc.substring(0, 70)}…</p>
                  <div className="wl-mc-cta"><span>View Details</span><ChevronRight size={16} /></div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            7. MEMBERSHIP DETAIL / TCM PACKAGE DETAIL
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'membership-detail' && selectedPackage && (
          <div className="pkg-detail-view">
            <div className="wl-pkg-hero">
              <h2>{selectedPackage.name}</h2>
              <p className="sub-detail">{selectedPackage.detail}</p>
            </div>
            {selectedPackage.desc && <p className="main-desc">{selectedPackage.desc}</p>}
            {selectedPackage.validity && (
              <div className="wl-info-row"><Calendar size={15} color="#2b1d62" /><span>Validity: {selectedPackage.validity}</span></div>
            )}
            {selectedPackage.fee && (
              <div className="price-info">
                <label>Package Fee</label>
                <strong style={{ color: '#2b1d62' }}>{selectedPackage.fee}</strong>
              </div>
            )}
            {selectedPackage.coachPricing && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ color: '#333', marginBottom: 10 }}>Coach Pricing</h4>
                {selectedPackage.coachPricing.map((cp, i) => (
                  <div key={i} className="wl-coach-row">
                    <div className="wl-coach-level">{cp.level}</div>
                    <div className="wl-coach-rates">
                      <span className="wl-coach-total">{cp.total}</span>
                      <span className="wl-coach-rate">{cp.rate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="interest-btn" onClick={() => setView('wellness-profile')}>
              <Heart size={16} style={{ marginRight: 6 }} /> Express Interest
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            8. WELLNESS PROFILE FORM
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'wellness-profile' && (
          <div className="wellness-profile-view" style={{ paddingBottom: 30 }}>
            {/* Basic Info */}
            <div className="wl-form-section">
              <div className="section-header" onClick={() => toggleSection('basic')}>
                <span>👤 Basic Information</span>
                {expanded.basic ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {expanded.basic && (
                <div className="section-body">
                  {[
                    { label: 'Full Name', field: 'fullName', type: 'text', readOnly: true },
                    { label: 'Email Address *', field: 'email', type: 'email' },
                    { label: 'Phone Number *', field: 'phone', type: 'tel' },
                    { label: 'Emergency Contact Name', field: 'emergencyName', type: 'text' },
                    { label: 'Emergency Contact Phone *', field: 'emergencyPhone', type: 'tel' },
                    { label: 'Age', field: 'age', type: 'number' },
                  ].map(({ label, field, type, readOnly }) => (
                    <div className="f-group" key={field}>
                      <label>{label}</label>
                      <input
                        type={type}
                        value={profileData[field]}
                        readOnly={readOnly}
                        className={profileErrors[field] ? 'wl-input-error' : ''}
                        onChange={e => handleInputChange(field, e.target.value)}
                        style={{ width: '100%', height: 42, padding: '0 12px', border: profileErrors[field] ? '1.5px solid #e74c3c' : '1px solid #eee', borderRadius: 8, fontSize: 14, background: readOnly ? '#f5f5f5' : 'white' }}
                      />
                      {profileErrors[field] && <p style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{profileErrors[field]}</p>}
                    </div>
                  ))}
                  <div className="f-group">
                    <label>Gender</label>
                    <div className="toggle-btns">
                      {['Male','Female','Other'].map(g => (
                        <button key={g} className={`toggle-btns button ${profileData.gender === g ? 'active' : ''}`} onClick={() => handleInputChange('gender', g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fitness Goals */}
            <div className="wl-form-section">
              <div className="section-header" onClick={() => toggleSection('goals')}>
                <span>🎯 Fitness Goals</span>
                {expanded.goals ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {expanded.goals && (
                <div className="section-body">
                  <div className="f-group">
                    <label>Primary Goal</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {['Weight Loss','Muscle Building','Improve Endurance','Flexibility & Mobility','Overall Fitness','Stress Management'].map(g => (
                        <button key={g} className={`pill-btn ${profileData.primaryGoal === g ? 'active' : ''}`} style={{ textAlign: 'left', paddingLeft: 16, background: profileData.primaryGoal === g ? '#e3f2fd' : 'white', color: profileData.primaryGoal === g ? '#2b1d62' : '#555', border: profileData.primaryGoal === g ? '1.5px solid #2b1d62' : '1px solid #eee' }} onClick={() => handleInputChange('primaryGoal', g)}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="f-group">
                    <label>Training Interests (select all that apply)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['HIIT','Yoga','Pilates','Strength Training','Cardio','Swimming','Cycling','Boxing','Dance','Stretching'].map(i => (
                        <button key={i} onClick={() => toggleMultiSelect('trainingInterests', i)} style={{ padding: '6px 14px', borderRadius: 16, fontSize: 13, cursor: 'pointer', background: profileData.trainingInterests.includes(i) ? '#2b1d62' : 'white', color: profileData.trainingInterests.includes(i) ? 'white' : '#555', border: '1px solid #ddd' }}>{i}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Lifestyle */}
            <div className="wl-form-section">
              <div className="section-header" onClick={() => toggleSection('lifestyle')}>
                <span>🏃 Lifestyle</span>
                {expanded.lifestyle ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {expanded.lifestyle && (
                <div className="section-body">
                  <div className="f-group">
                    <label>Current Activity Level</label>
                    <div className="toggle-btns">
                      {['Sedentary','Light','Moderate','Very Active'].map(l => (
                        <button key={l} className={`toggle-btns button ${profileData.activityLevel === l ? 'active' : ''}`} onClick={() => handleInputChange('activityLevel', l)}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="f-group">
                    <label>Training Days per Week</label>
                    <div className="toggle-btns">
                      {['1–2','3–4','5–6','Daily'].map(d => (
                        <button key={d} className={`toggle-btns button ${profileData.trainingDays === d ? 'active' : ''}`} onClick={() => handleInputChange('trainingDays', d)}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div className="f-group">
                    <label>Currently on a diet?</label>
                    <div className="toggle-btns">
                      {['Yes','No'].map(v => (
                        <button key={v} className={`toggle-btns button ${profileData.onDiet === v ? 'active' : ''}`} onClick={() => handleInputChange('onDiet', v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className="wl-form-section">
              <div className="section-header" onClick={() => toggleSection('prefs')}>
                <span>⚙️ Preferences</span>
                {expanded.prefs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {expanded.prefs && (
                <div className="section-body">
                  <div className="f-group">
                    <label>Preferred Mode</label>
                    <div className="toggle-btns">
                      {['Solo','Group','Both'].map(m => (
                        <button key={m} className={`toggle-btns button ${profileData.preferredMode === m ? 'active' : ''}`} onClick={() => handleInputChange('preferredMode', m)}>{m}</button>
                      ))}
                    </div>
                  </div>
                  <div className="f-group">
                    <label>Preferred Training Time</label>
                    <div className="toggle-btns">
                      {['Morning','Afternoon','Evening'].map(t => (
                        <button key={t} className={`toggle-btns button ${profileData.preferredTime === t ? 'active' : ''}`} onClick={() => handleInputChange('preferredTime', t)}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="f-group">
                    <label>Worked with a trainer before?</label>
                    <div className="toggle-btns">
                      {['Yes','No'].map(v => (
                        <button key={v} className={`toggle-btns button ${profileData.workedWithTrainer === v ? 'active' : ''}`} onClick={() => handleInputChange('workedWithTrainer', v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="f-group">
                    <label>Goal Timeline</label>
                    <input
                      type="text"
                      placeholder="e.g. 3 months, 6 months"
                      value={profileData.timeline}
                      onChange={e => handleInputChange('timeline', e.target.value)}
                      style={{ width: '100%', height: 42, padding: '0 12px', border: '1px solid #eee', borderRadius: 8, fontSize: 14 }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '0 20px' }}>
              <button className="interest-btn" style={{ width: '100%', marginTop: 10 }} disabled={actionLoading} onClick={handleProfileSubmit}>
                {actionLoading ? <Loader2 size={16} className="wl-spin" style={{ marginRight: 8 }} /> : null}
                Submit Wellness Profile
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            9. NURSING ROOM
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'nursing' && (
          <div className="nursing-view">
            <div className="wl-nursing-hero">
              <div className="wl-nursing-icon">🤱</div>
              <h3>Nursing Room</h3>
              <p>A safe, private space for nursing mothers</p>
            </div>
            <div className="nursing-info-box">
              <div className="loc-row">
                <MapPin size={18} color="#97266d" />
                <div><strong>Location</strong><p>Nursing Room, Level 19, Menara Chin Hin</p></div>
              </div>
              <button className="blue-cap-btn" onClick={() => setNursingModal('support')}>How Do We Support You?</button>
              <button className="blue-cap-btn rules-border" onClick={() => setNursingModal('rules')}>Nursing Room House Rules</button>
              <div className="wl-divider" />
              <h4 className="extra-section-title">About the Pink Initiatives</h4>
              <p className="extra-description">
                The Pink Initiatives create a healthier and safer workplace for female employees by promoting inclusivity and care for their specific needs — supporting nursing mothers and women experiencing menstrual discomfort through designated facilities.
              </p>
              <h4 className="extra-section-title">How It Works</h4>
              <div className="extra-how-works-card">
                <ul className="extra-bullet-list">
                  <li>• Entry requires employee / visitor card scan.</li>
                  <li>• Please read the Nursing Room House Rules before use.</li>
                  <li>• For issues or suggestions, use the "Ticketing" feature in the Employee App.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            10. TCM MENU
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'tcm' && (
          <div className="tcm-view">
            <div className="tcm-banner">
              <div className="tcm-text"><h3>TCM</h3><p>Traditional Chinese Medicine at Chin Hin.</p></div>
              <img src="/icon_img/tcm.png" alt="TCM" className="tcm-banner-img" />
            </div>
            <div className="list-menu">
              {Object.entries(tcmViewMap).map(([label, viewName]) => {
                const icons = { 'About TCM': <FilePenLine size={22}/>, 'Purchase TCM Session': <Monitor size={22}/>, 'Schedule My Appointment': <CalendarCheck size={22}/>, 'View My Appointment': <CalendarDays size={22}/> };
                const subs  = { 'About TCM': 'Overview and How it Works', 'Purchase TCM Session': 'Unlock treatment plans', 'Schedule My Appointment': 'Manage your sessions', 'View My Appointment': 'Manage your bookings' };
                return (
                  <div key={label} className="list-item" onClick={() => setView(viewName)}>
                    <div className="item-content"><div className="wl-list-icon" style={{ color: '#7b341e' }}>{icons[label]}</div><div><h4>{label}</h4><p>{subs[label]}</p></div></div>
                    {label === 'View My Appointment' && tcmAppointments.length > 0 && <span className="wl-count-badge" style={{ background: '#7b341e' }}>{tcmAppointments.length}</span>}
                    <ChevronRight size={20} color="#ccc" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            11. TCM ABOUT
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'tcm-about' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer" />
            <div className="nursing-info-box">
              <h3>Traditional Chinese Medicine</h3>
              <div className="loc-row"><MapPin size={18} color="#666" /><div><strong>Location</strong><p>TCM Consultation Room, Level 19</p></div></div>
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">Our TCM services provide holistic health care through traditional diagnostic methods and natural treatments, focusing on restoring internal balance and long-term wellness.</p>
                <h4 className="extra-section-title">How It Works</h4>
                <div className="extra-how-works-card">
                  <ul className="extra-bullet-list">
                    <li>• Consultation: Professional tongue and pulse diagnosis.</li>
                    <li>• Custom Plan: Personalized acupuncture or massage treatment.</li>
                    <li>• Booking: All sessions must be scheduled 24 hours in advance.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            12. TCM PURCHASE
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'tcm-purchase' && (
          <div className="membership-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>TCM Treatment Packages</h3>
            {tcmPackages.map(pkg => (
              <div key={pkg.id} className="wl-membership-card" style={{ '--mc-bg': '#fffaf0', '--mc-accent': '#7b341e' }} onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}>
                <h4>{pkg.name}</h4>
                <p className="wl-mc-detail"><Ticket size={12} /> {pkg.detail}</p>
                <p className="wl-mc-desc">{pkg.desc}</p>
                <div className="wl-mc-meta"><span className="wl-mc-price" style={{ color: '#7b341e' }}>{pkg.fee}</span></div>
                <div className="wl-mc-cta"><span>View Details</span><ChevronRight size={16} /></div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            13. TCM SCHEDULE
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'tcm-schedule' && (
          <div className="timetable-view-list">
            <div className="timetable-section">
              <h3 className="section-title">Select Available Slot</h3>
              <div className="class-list">
                {[
                  { title: 'Pulse Diagnosis & Consultation', date: 'Tomorrow', time: '10:00 - 10:30', location: 'TCM Room, Level 19' },
                  { title: 'Acupuncture Therapy',            date: 'Tomorrow', time: '11:00 - 11:45', location: 'TCM Room, Level 19' },
                  { title: 'Tui Na Massage',                 date: 'This Week', time: '14:00 - 15:00', location: 'TCM Room, Level 19' },
                ].map((slot, i) => (
                  <div key={i} className="class-card-item">
                    <div className="class-info-left">
                      <h4>{slot.title}</h4>
                      <p><Clock size={12} /> {slot.time} · {slot.date}</p>
                      <p><MapPin size={12} /> {slot.location}</p>
                    </div>
                    <button className="book-now-btn" style={{ background: '#7b341e' }} disabled={actionLoading} onClick={handleBookTcmAppointment}>Book</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            14. TCM VIEW APPOINTMENTS
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'tcm-view' && (
          <div className="bookings-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>Upcoming TCM Sessions</h3>
            {tcmAppointments.length === 0 ? (
              <div className="wl-empty-state">
                <BookOpen size={40} color="#ddd" />
                <p>No appointments yet.</p>
                <button className="wl-empty-cta" onClick={() => setView('tcm-schedule')}>Schedule Now</button>
              </div>
            ) : tcmAppointments.map(app => (
              <div key={app.id} className="booking-card wl-appt-card" onClick={() => { setSelectedTcmAppointment(app); setView('tcm-appointment-detail'); }}>
                <div className="booking-img-box wl-appt-icon-box" style={{ background: '#fffaf0' }}>
                  <BookOpen size={24} color="#7b341e" />
                </div>
                <div className="booking-details">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4>{app.title}</h4>
                    <StatusBadge status={app.status || 'Confirmed'} />
                  </div>
                  <div className="b-row"><Calendar size={12} /> <span>{app.date}</span></div>
                  <div className="b-row"><Clock size={12} /> <span>{app.time}</span></div>
                  <div className="b-row"><MapPin size={12} /> <span>{app.location}</span></div>
                </div>
                <ChevronRight size={18} color="#ccc" />
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            15. TCM APPOINTMENT DETAIL
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'tcm-appointment-detail' && selectedTcmAppointment && (
          <div className="booking-detail-view">
            <div className="wl-detail-hero" style={{ background: 'linear-gradient(135deg,#7b341e,#c05621)' }}>
              <BookOpen size={48} color="white" />
            </div>
            <div className="booking-info-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="detail-title" style={{ fontSize: 20 }}>{selectedTcmAppointment.title}</h2>
                <StatusBadge status={selectedTcmAppointment.status || 'Confirmed'} />
              </div>
              <p className="detail-provider">with {selectedTcmAppointment.provider}</p>
              <div className="detail-meta-list">
                {[
                  { icon: <Calendar size={18} />, label: 'Date', value: selectedTcmAppointment.date },
                  { icon: <Clock size={18} />,    label: 'Time', value: selectedTcmAppointment.time },
                  { icon: <MapPin size={18} />,   label: 'Location', value: selectedTcmAppointment.location },
                ].map(m => (
                  <div key={m.label} className="meta-item-row">
                    <span style={{ color: '#7b341e' }}>{m.icon}</span>
                    <div><strong>{m.label}</strong><p>{m.value}</p></div>
                  </div>
                ))}
              </div>
              <div className="detail-desc-section">
                <h3>Preparation Tips</h3>
                <p>Please arrive 10 minutes before your appointment. Avoid heavy meals 1 hour prior. Bring any relevant medical records if available.</p>
              </div>
              <button className="cancel-booking-btn" disabled={actionLoading} onClick={() => handleDeleteTcmAppointment(selectedTcmAppointment.id)}>
                {actionLoading ? <Loader2 size={14} className="wl-spin" /> : <Trash2 size={14} />} Cancel Appointment
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            16. PHYSIOTHERAPY MENU
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'physio' && (
          <div className="tcm-view">
            <div className="tcm-banner" style={{ background: 'linear-gradient(135deg,#1a4731,#276749)' }}>
              <div className="tcm-text"><h3>Physiotherapy</h3><p>Professional physiotherapy for recovery and wellness.</p></div>
              <img src="/icon_img/physiotherapy.png" alt="Physiotherapy" className="tcm-banner-img" />
            </div>
            <div className="list-menu">
              {Object.entries(physioViewMap).map(([label, viewName]) => {
                const icons = { 'About Physiotherapy': <FilePenLine size={22}/>, 'Purchase Physio Session': <Monitor size={22}/>, 'Schedule My Appointment': <CalendarCheck size={22}/>, 'View My Appointment': <CalendarDays size={22}/> };
                const subs  = { 'About Physiotherapy': 'Overview and How it Works', 'Purchase Physio Session': 'Unlock treatment plans', 'Schedule My Appointment': 'Manage your sessions', 'View My Appointment': 'Manage your bookings' };
                return (
                  <div key={label} className="list-item" onClick={() => setView(viewName)}>
                    <div className="item-content"><div className="wl-list-icon" style={{ color: '#276749' }}>{icons[label]}</div><div><h4>{label}</h4><p>{subs[label]}</p></div></div>
                    {label === 'View My Appointment' && physioAppointments.length > 0 && <span className="wl-count-badge" style={{ background: '#276749' }}>{physioAppointments.length}</span>}
                    <ChevronRight size={20} color="#ccc" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            17. PHYSIO ABOUT
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'physio-about' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer" />
            <div className="nursing-info-box">
              <h3>Physiotherapy</h3>
              <div className="loc-row"><MapPin size={18} color="#276749" /><div><strong>Location</strong><p>Physio Room, Level 19</p></div></div>
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">Evidence-based physiotherapy restoring movement and function through manual therapy, exercise, and personalised rehabilitation programs.</p>
                <h4 className="extra-section-title">How It Works</h4>
                <div className="extra-how-works-card">
                  <ul className="extra-bullet-list">
                    <li>• Initial Assessment: Comprehensive musculoskeletal evaluation.</li>
                    <li>• Personalised Plan: Customised treatment and exercise program.</li>
                    <li>• Follow-up: Regular progress reviews and plan adjustments.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            18. PHYSIO PURCHASE
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'physio-purchase' && (
          <div className="membership-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>Physiotherapy Packages</h3>
            {physioPackages.map(pkg => (
              <div key={pkg.id} className="wl-membership-card" style={{ '--mc-bg': '#f0fff4', '--mc-accent': '#276749' }} onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}>
                <h4>{pkg.name}</h4>
                <p className="wl-mc-detail"><Ticket size={12} /> {pkg.detail}</p>
                <p className="wl-mc-desc">{pkg.desc}</p>
                <div className="wl-mc-meta"><span className="wl-mc-price" style={{ color: '#276749' }}>{pkg.fee}</span></div>
                <div className="wl-mc-cta"><span>View Details</span><ChevronRight size={16} /></div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            19. PHYSIO SCHEDULE
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'physio-schedule' && (
          <div className="timetable-view-list">
            <div className="timetable-section">
              <h3 className="section-title">Select Available Slot</h3>
              <div className="class-list">
                {[
                  { title: 'Sports Massage',          date: 'Tomorrow', time: '09:00 - 10:00', location: 'Physio Room, Level 19' },
                  { title: 'Spinal Assessment',        date: 'Tomorrow', time: '11:00 - 11:30', location: 'Physio Room, Level 19' },
                  { title: 'Rehabilitation Session',   date: 'This Week', time: '14:00 - 15:00', location: 'Physio Room, Level 19' },
                ].map((slot, i) => (
                  <div key={i} className="class-card-item">
                    <div className="class-info-left">
                      <h4>{slot.title}</h4>
                      <p><Clock size={12} /> {slot.time} · {slot.date}</p>
                      <p><MapPin size={12} /> {slot.location}</p>
                    </div>
                    <button className="book-now-btn" style={{ background: '#276749' }} disabled={actionLoading} onClick={() => handleBookPhysioAppointment(slot)}>Book</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            20. PHYSIO VIEW APPOINTMENTS
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'physio-view' && (
          <div className="bookings-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>Physiotherapy Appointments</h3>
            {physioAppointments.length === 0 ? (
              <div className="wl-empty-state">
                <Stethoscope size={40} color="#ddd" />
                <p>No appointments yet.</p>
                <button className="wl-empty-cta" onClick={() => setView('physio-schedule')}>Schedule Now</button>
              </div>
            ) : physioAppointments.map(app => (
              <div key={app.id} className="booking-card wl-appt-card" onClick={() => { setSelectedPhysioAppointment(app); setView('physio-appointment-detail'); }}>
                <div className="booking-img-box wl-appt-icon-box" style={{ background: '#f0fff4' }}>
                  <Stethoscope size={24} color="#276749" />
                </div>
                <div className="booking-details">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4>{app.title}</h4>
                    <StatusBadge status={app.status || 'Confirmed'} />
                  </div>
                  <div className="b-row"><Calendar size={12} /> <span>{app.date}</span></div>
                  <div className="b-row"><Clock size={12} /> <span>{app.time}</span></div>
                  <div className="b-row"><MapPin size={12} /> <span>{app.location}</span></div>
                </div>
                <ChevronRight size={18} color="#ccc" />
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            21. PHYSIO APPOINTMENT DETAIL
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'physio-appointment-detail' && selectedPhysioAppointment && (
          <div className="booking-detail-view">
            <div className="wl-detail-hero" style={{ background: 'linear-gradient(135deg,#1a4731,#276749)' }}>
              <Stethoscope size={48} color="white" />
            </div>
            <div className="booking-info-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="detail-title" style={{ fontSize: 20 }}>{selectedPhysioAppointment.title}</h2>
                <StatusBadge status={selectedPhysioAppointment.status || 'Confirmed'} />
              </div>
              <p className="detail-provider">with {selectedPhysioAppointment.provider}</p>
              <div className="detail-meta-list">
                {[
                  { icon: <Calendar size={18} />, label: 'Date', value: selectedPhysioAppointment.date },
                  { icon: <Clock size={18} />,    label: 'Time', value: selectedPhysioAppointment.time },
                  { icon: <MapPin size={18} />,   label: 'Location', value: selectedPhysioAppointment.location },
                ].map(m => (
                  <div key={m.label} className="meta-item-row">
                    <span style={{ color: '#276749' }}>{m.icon}</span>
                    <div><strong>{m.label}</strong><p>{m.value}</p></div>
                  </div>
                ))}
              </div>
              <div className="detail-desc-section">
                <h3>Preparation Tips</h3>
                <p>Wear comfortable, loose-fitting clothing. Bring any X-rays or medical reports. Arrive 10 minutes early for paperwork.</p>
              </div>
              <button className="cancel-booking-btn" disabled={actionLoading} onClick={() => handleDeletePhysioAppointment(selectedPhysioAppointment.id)}>
                {actionLoading ? <Loader2 size={14} className="wl-spin" /> : <Trash2 size={14} />} Cancel Appointment
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            22. MY BOOKINGS
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'my-bookings' && (
          <div className="bookings-view">
            <h3 className="section-title" style={{ paddingTop: 16 }}>My Bookings</h3>
            {loading ? [1,2].map(i => <SkeletonCard key={i} lines={3} />) : myBookings.length === 0 ? (
              <div className="wl-empty-state">
                <Calendar size={40} color="#ddd" />
                <p>No bookings yet.</p>
                <button className="wl-empty-cta" onClick={() => setView('timetable')}>Browse Classes</button>
              </div>
            ) : myBookings.map(b => (
              <div key={b.id} className="booking-card wl-booking-card-fancy" onClick={() => { setSelectedBooking(b); setView('booking-detail'); }}>
                <div className="booking-img-box wl-appt-icon-box" style={{ background: '#e8f4ff' }}>
                  <Dumbbell size={22} color="#2b6cb0" />
                </div>
                <div className="booking-details" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: 13, maxWidth: '75%' }}>{b.title}</h4>
                    <StatusBadge status={b.status || 'Confirmed'} />
                  </div>
                  <p style={{ fontSize: 11, color: '#888', margin: '2px 0' }}>with {b.provider}</p>
                  <div className="b-row"><Calendar size={11} /> <span>{b.date}</span></div>
                  <div className="b-row"><Clock size={11} /> <span>{b.time}</span></div>
                  {b.trainer && <div className="b-row"><UserCircle size={11} /> <span>{b.trainer}</span></div>}
                </div>
                <ChevronRight size={18} color="#ccc" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            23. BOOKING DETAIL
        ══════════════════════════════════════════════════════════════════ */}
        {view === 'booking-detail' && selectedBooking && (
          <div className="booking-detail-view">
            <div className="wl-detail-hero" style={{ background: 'linear-gradient(135deg,#1e2875,#2b6cb0)' }}>
              <Dumbbell size={48} color="white" />
            </div>
            <div className="booking-info-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h2 className="detail-title" style={{ fontSize: 20, flex: 1 }}>{selectedBooking.title}</h2>
                <StatusBadge status={selectedBooking.status || 'Confirmed'} />
              </div>
              <p className="detail-provider">Organized by {selectedBooking.provider}</p>
              <div className="detail-meta-list">
                {[
                  { icon: <Calendar size={18} />,    label: 'Date',         value: selectedBooking.date },
                  { icon: <Clock size={18} />,        label: 'Time',         value: selectedBooking.time },
                  { icon: <MapPin size={18} />,       label: 'Location',     value: selectedBooking.location },
                  { icon: <Users size={18} />,        label: 'Availability', value: selectedBooking.spots },
                  { icon: <UserCircle size={18} />,   label: 'Trainer',      value: selectedBooking.trainer || 'TBA' },
                ].map(m => m.value && (
                  <div key={m.label} className="meta-item-row">
                    <span style={{ color: '#2b1d62' }}>{m.icon}</span>
                    <div><strong>{m.label}</strong><p>{m.value}</p></div>
                  </div>
                ))}
              </div>
              {selectedBooking.desc && (
                <div className="detail-desc-section">
                  <h3>About this session</h3>
                  <p>{selectedBooking.desc}</p>
                </div>
              )}
              <button className="cancel-booking-btn" disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  const tid = showToast('Cancelling booking…', 'loading');
                  try {
                    if (employeeEmail && selectedBooking.registration_id) {
                      await callN8N('delete_fitness_booking', { employee_email: employeeEmail, registration_id: selectedBooking.registration_id });
                    }
                  } catch { /* remove locally anyway */ }
                  setMyBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
                  dismissToast(tid);
                  showToast('Booking cancelled.', 'success');
                  setActionLoading(false);
                  setView('my-bookings');
                }}>
                {actionLoading ? <Loader2 size={14} className="wl-spin" /> : <Trash2 size={14} />} Cancel Booking
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRM MODAL — Class Booking
      ══════════════════════════════════════════════════════════════════ */}
      {showConfirm && pendingClass && (
        <div className="chart-modal-overlay">
          <div className="wl-confirm-dialog">
            <div className="wl-confirm-icon"><Calendar size={32} color="#2b1d62" /></div>
            <h3>Confirm Booking?</h3>
            <div className="wl-confirm-details">
              <p className="wl-cd-title">{pendingClass.name}</p>
              <p><Clock size={12} /> {pendingClass.time} · {pendingClass.date}</p>
              <p><MapPin size={12} /> {pendingClass.location}</p>
              {pendingClass.trainer && <p><UserCheck size={12} /> {pendingClass.trainer}</p>}
              <CapacityBar booked={pendingClass.registered_count} max={pendingClass.max_capacity} />
            </div>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => { setShowConfirm(false); setPendingClass(null); }}>Cancel</button>
              <button className="confirm-btn" onClick={handleConfirmBookClass}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          NURSING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {nursingModal && (
        <div className="chart-modal-overlay">
          <div className="nursing-detail-modal">
            <div className="n-modal-header">
              <h4>{nursingModal === 'support' ? '💪 Our Support' : '📋 House Rules'}</h4>
              <X size={20} onClick={() => setNursingModal(null)} style={{ cursor: 'pointer' }} />
            </div>
            <div className="n-modal-body">
              {nursingModal === 'support' ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['Private cubicles with comfortable seating.','Electrical outlets for breast pumps.','Sink and sanitization area.','Refrigeration for temporary breast milk storage.'].map((item, i) => (
                    <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14, color: '#444' }}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['Keep the area clean after use.','No food or drinks allowed inside the room.','Maximum usage time: 30 minutes per session.','Ensure the door is locked when occupied.'].map((item, i) => (
                    <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', fontSize: 14, color: '#444' }}>• {item}</li>
                  ))}
                </ul>
              )}
            </div>
            <button className="n-modal-close-btn" onClick={() => setNursingModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wellness;