import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link,
  useNavigate, useLocation, Navigate
} from 'react-router-dom';
import {
  Calendar, Scan, Bell, ChevronLeft,
  Zap, X,
  Home as HomeIcon, LayoutDashboard, Info as InfoIcon, UserCircle,
  LogOut, Lock, User, ChevronRight, MapPin,
  Clock, Gift, Megaphone, Ticket, CalendarPlus,
  DoorOpen, FileText, TrendingUp, Briefcase, Loader2, Eye, EyeOff
} from 'lucide-react';

import MeetingRoom from './MeetingRoom';
import Transport from './Transport';
import EVisitor from './EVisitor';
import Ticketing from './Ticketing';
import Chart from './Chart';
import Wellness from './Wellness';
import Meal from './Meal';
//import Energy      from './Energy';
import FlexHR from './FlexHR';
import HRRequestCenter from './HRRequestCenter';
import Mynews from './Mynews';
import Childcare from './Childcare';
import EPP from './EPP';
import ChatBot from './ChatBot';
import StaffClaim from './StaffClaim';
import './App.css';

// ══════════════════════════════════════════════════════════════════
//  0. SPLASH SCREEN
// ══════════════════════════════════════════════════════════════════
const SplashScreen = () => (
  <div style={S.splash.root}>
    <div style={S.splash.ring}>
      <img src="/icon_img/flexhr.png" alt="FlexHR" style={S.splash.logo} />
    </div>
    <h1 style={S.splash.title}>ChinHin Connect</h1>
    <p style={S.splash.sub}>Loading your workspace…</p>
    <div style={S.splash.dots}>
      {[0, 1, 2].map(i => <span key={i} style={{ ...S.splash.dot, animationDelay: `${i * 0.2}s` }} />)}
    </div>
    <style>{`
      @keyframes splashPulse{0%,100%{box-shadow:0 0 40px rgba(130,90,255,.45)}50%{box-shadow:0 0 70px rgba(130,90,255,.8)}}
      @keyframes splashBounce{0%,80%,100%{transform:scale(.55);opacity:.4}40%{transform:scale(1);opacity:1}}
      @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes spinBtn{to{transform:rotate(360deg)}}
    `}</style>
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  SESSION PERSISTENCE  (localStorage — survives Android app close)
// ══════════════════════════════════════════════════════════════════
const SESSION_KEY = 'flexhr_user_session';

// session shape: { name, email, role, savedAt }
const saveSession = (info) => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...info, savedAt: Date.now() })); } catch { }
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 30 days (ms)
    if (Date.now() - (parsed.savedAt || 0) > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
};

const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('userRole');
  } catch { }
};

// ── Sync user to DB via n8n (called once after login) ─────────────
const N8N_WEBHOOK = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';

const syncUserToDB = async (info, token) => {
  if (!info?.email) return;
  try {
    await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || localStorage.getItem('authToken') || ''}`,
      },
      body: JSON.stringify({
        input_type: 'direct_action',
        edited_plan: {
          action: 'sync_user',
          sub_target: 'flexhr',
          user_email: info.email,
          user_name: info.name,
        },
        // Also send at body level so VerifyTempToken + Upsert can read it
        upn: info.email,
        name: info.name,
      }),
    });
  } catch (e) {
    console.warn('[syncUserToDB] failed (non-blocking):', e.message);
  }
};

// ══════════════════════════════════════════════════════════════════
//  1. LOGIN
// ══════════════════════════════════════════════════════════════════

// Dev-mode fallback — used when the n8n login endpoint is unavailable.
// role values: 'admin' | 'hr' | 'staff'
const DEMO_USERS_FALLBACK = [
  { email: 'aimanhakimka@gmail.com', password: 'aiman123',   name: 'Aiman Hakim',          role: 'admin' },
  { email: 'admin@chinhin.com',      password: 'Admin@123',  name: 'Alan Tan Wai Loon',    role: 'admin' },
  { email: 'hr@chinhin.com',         password: 'HR@2026',    name: 'Nurul Ain Binti Ahmad', role: 'hr'    },
  { email: 'staff@chinhin.com',      password: 'Staff@2026', name: 'Jason Khoo Weng Fatt', role: 'staff' },
];

/**
 * Authenticate against the database via the n8n webhook.
 * n8n should run:
 *   SELECT u.user_id, u.email, u.role, e.employee_name AS name
 *   FROM public.users u
 *   LEFT JOIN public.employees e ON e.email = u.email
 *   WHERE u.email = $email
 *     AND u.password_hash = crypt($password, u.password_hash)
 *     AND u.is_active = TRUE
 * and return { success: true, user: { email, name, role } }
 */
async function loginViaDB(email, password) {
  const res = await fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_type: 'direct_action',
      edited_plan: {
        action: 'login_user',
        sub_target: 'auth',
        email: email.trim().toLowerCase(),
        password,
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  console.log('[loginViaDB] raw n8n response:', JSON.stringify(raw));

  // n8n can wrap the result in various shapes — unwrap gracefully
  // Shape 1: { success, user }          ← ideal
  // Shape 2: { output: { success, user } }
  // Shape 3: [{ success, user }]         ← array
  // Shape 4: { data: { success, user } }
  const unwrap = (r) => {
    if (!r) return r;
    if (Array.isArray(r)) return unwrap(r[0]);
    if (r.output)  return unwrap(r.output);
    if (r.data && r.data.success !== undefined) return unwrap(r.data);
    return r;
  };
  return unwrap(raw);
}

const Login = ({ setAuth, setUserInfo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);

    let info = null;

    try {
      // ── Try real DB login via n8n ──────────────────────────────
      const result = await loginViaDB(email, password);
      if (result?.success && result?.user) {
        const u = result.user;
        info = { name: u.name || u.email, email: u.email, role: u.role || 'staff', employment_start_date: u.employment_start_date || null };
      } else {
        // n8n returned but credentials were wrong
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }
    } catch {
      // ── Fallback: dev-mode hardcoded credentials ───────────────
      console.warn('[Login] n8n unavailable — using dev fallback');
      const match = DEMO_USERS_FALLBACK.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (match) {
        info = { name: match.name, email: match.email, role: match.role };
      } else {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }
    }

    // ── Persist session & token ──────────────────────────────────
    const fakeToken = btoa(JSON.stringify(info) + ':' + Date.now());
    localStorage.setItem('authToken', fakeToken);
    localStorage.setItem('userRole', info.role);   // quick-access role key
    saveSession(info);
    syncUserToDB(info, fakeToken);
    setUserInfo(info);
    setAuth(true);
    setLoading(false);
  };

  return (
    <div style={S.login.page}>
      {/* Animated background blobs */}
      <div style={S.login.blobTR} />
      <div style={S.login.blobBL} />
      <div style={S.login.blobMid} />

      <div style={S.login.card}>
        {/* App Icon */}
        <div style={S.login.iconWrap}>
          <div style={S.login.iconRing}>
            <img src="/icon_img/flexhr.png" alt="FlexHR" style={S.login.iconImg} />
          </div>
        </div>

        <h1 style={S.login.appName}>ChinHin Connect</h1>
        <p style={S.login.tagline}>Your Intelligent Workplace Portal</p>
        <div style={S.login.divider} />

        {error && (
          <div style={S.login.errorBox}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ width: '100%' }} noValidate>
          {/* Email field */}
          <div style={{ ...S.login.field, boxShadow: focused === 'email' ? '0 0 0 2.5px #6c47d9' : 'none' }}>
            <User size={17} color={focused === 'email' ? '#6c47d9' : '#aaa'} style={{ flexShrink: 0 }} />
            <input
              id="login-email"
              type="email"
              placeholder="Work Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              style={S.login.fieldInput}
              autoComplete="username"
            />
          </div>

          {/* Password field */}
          <div style={{ ...S.login.field, boxShadow: focused === 'pw' ? '0 0 0 2.5px #6c47d9' : 'none' }}>
            <Lock size={17} color={focused === 'pw' ? '#6c47d9' : '#aaa'} style={{ flexShrink: 0 }} />
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('pw')}
              onBlur={() => setFocused('')}
              style={{ ...S.login.fieldInput, flex: 1 }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
              tabIndex={-1}
            >
              {showPw
                ? <EyeOff size={16} color="#aaa" />
                : <Eye size={16} color="#aaa" />}
            </button>
          </div>

          {/* Sign-in button */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{ ...S.login.signInBtn, opacity: loading ? 0.78 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading
              ? <><span style={S.login.spinner} /> Signing in…</>
              : 'Sign In'}
          </button>
        </form>

        <p style={S.login.footerNote}>🔒 Protected by Corporate Security Policy</p>
      </div>

      <style>{`
        @keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes spinBtn{to{transform:rotate(360deg)}}
        @keyframes blobFloat{0%,100%{transform:scale(1) translate(0,0)}50%{transform:scale(1.12) translate(10px,-10px)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes splashPulse{0%,100%{box-shadow:0 0 40px rgba(130,90,255,.45)}50%{box-shadow:0 0 70px rgba(130,90,255,.8)}}
        @keyframes splashBounce{0%,80%,100%{transform:scale(.55);opacity:.4}40%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  2. GLOBAL WELCOME BAR
// ══════════════════════════════════════════════════════════════════
const GlobalWelcomeBar = ({ userInfo, openNotifications }) => {
  const navigate = useNavigate();
  return (
    <nav className="welcome-bar-fixed">
      <div className="welcome-text">
        <span className="welcome-label">Welcome</span>
        <h2 className="welcome-name">{userInfo?.name || 'ALAN TAN WAI LOON'}</h2>
      </div>
      <div className="welcome-icons">
        <div className="icon-wrapper" onClick={() => navigate('/scan')}>
          <Scan size={20} color="white" />
        </div>
        <div className="bell-container" onClick={openNotifications}>
          <Bell size={20} color="white" />
          <span className="bell-dot" />
        </div>
      </div>
    </nav>
  );
};

// ══════════════════════════════════════════════════════════════════
//  3. NOTIFICATION PANEL  (Live-data)
// ══════════════════════════════════════════════════════════════════
const NOTIF_N8N = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';
const notifAuth = () => localStorage.getItem('authToken') || '';

async function callNotifN8N(action, subTarget, payload = {}) {
  const res = await fetch(NOTIF_N8N, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${notifAuth()}` },
    body: JSON.stringify({ input_type: 'direct_action', edited_plan: { action, sub_target: subTarget, ...payload } }),
  });
  if (!res.ok) throw new Error(`n8n ${res.status}`);
  return res.json();
}

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

const NotificationPanel = ({ onClose, userInfo }) => {
  const userEmail = userInfo?.email || '';
  const userName = userInfo?.name || '';
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        callNotifN8N('get_bookings', 'meeting_room', { employee_email: userEmail }),
        callNotifN8N('get_tickets', 'ticketing', { employee_email: userEmail }),
        callNotifN8N('get_bookings', 'transport', { employee_email: userEmail }),
        callNotifN8N('list_leaves', 'flexhr', { user_email: userEmail, user_name: userName }),
      ]);
      if (cancelled) return;

      const items = [];

      // Meetings
      if (results[0].status === 'fulfilled') {
        const r = results[0].value;
        let bookings = [];
        if (r?.type === 'bookings_list') bookings = r.bookings || [];
        else { const d = r?.data ?? r?.result?.data ?? []; bookings = Array.isArray(d) ? d : []; }
        bookings.slice(0, 3).forEach(b => {
          items.push({
            id: `mtg-${b.id || b.booking_id || Math.random()}`,
            title: 'Meeting Reminder',
            desc: `${b.title || b.subject || 'Meeting'} — ${b.room || b.location || 'TBD'}`,
            time: timeAgo(b.start || b.created_at || b.date),
            sort: new Date(b.start || b.created_at || b.date || 0).getTime(),
          });
        });
      }

      // Tickets
      if (results[1].status === 'fulfilled') {
        const r = results[1].value;
        const tickets = r?.data?.tickets ?? r?.data ?? [];
        const arr = Array.isArray(tickets) ? tickets : [];
        arr.filter(t => (t.status || '').toLowerCase() === 'open').slice(0, 3).forEach(t => {
          items.push({
            id: `tkt-${t.ticket_id || t.id || Math.random()}`,
            title: 'Open Ticket',
            desc: t.title || t.subject || t.description || 'Ticket pending',
            time: timeAgo(t.created_at || t.submitted_at),
            sort: new Date(t.created_at || t.submitted_at || 0).getTime(),
          });
        });
      }

      // Transport
      if (results[2].status === 'fulfilled') {
        const r = results[2].value;
        const rows = r?.data ?? r?.result?.data ?? [];
        const arr = Array.isArray(rows) ? rows : [];
        arr.filter(b => (b.status || '').toLowerCase() !== 'cancelled').slice(0, 2).forEach(b => {
          const timeStr = b.session_time ? String(b.session_time).slice(0, 5) : '';
          items.push({
            id: `trn-${b.booking_id || b.id || Math.random()}`,
            title: 'Shuttle Booking',
            desc: `${b.route_name || 'Shuttle'} ${timeStr ? 'at ' + timeStr : ''} — ${(b.status || 'confirmed').charAt(0).toUpperCase() + (b.status || 'confirmed').slice(1)}`,
            time: timeAgo(b.created_at || b.booking_date),
            sort: new Date(b.created_at || b.booking_date || 0).getTime(),
          });
        });
      }

      // Leaves
      if (results[3].status === 'fulfilled') {
        const r = results[3].value;
        const d = r?.data ?? r?.result?.data ?? [];
        const arr = Array.isArray(d) ? d : [];
        arr.filter(a => (a.status_code || a.status || '').toLowerCase() === 'pending').slice(0, 2).forEach(a => {
          items.push({
            id: `lv-${a.leave_id || a.id || Math.random()}`,
            title: 'Leave Application',
            desc: `${a.leave_type_name || a.leave_type || 'Leave'} — ${(a.status_code || a.status || 'Pending')}`,
            time: timeAgo(a.applied_at || a.created_at),
            sort: new Date(a.applied_at || a.created_at || 0).getTime(),
          });
        });
      }

      // Sort newest first
      items.sort((a, b) => (b.sort || 0) - (a.sort || 0));
      setNotifs(items);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userEmail, userName]);

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="notification-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-purple">
          <span className="modal-title">Notifications</span>
          <X size={20} color="white" onClick={onClose} style={{ cursor: 'pointer' }} />
        </div>
        <div className="notification-list">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 10 }}>
              <Loader2 size={24} color="#6c47d9" style={{ animation: 'dashSpin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#aaa' }}>Loading notifications…</span>
              <style>{`@keyframes dashSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
              No new notifications
            </div>
          ) : notifs.map(n => (
            <div key={n.id} className="notification-item">
              <div className="notif-title">{n.title}</div>
              <div className="notif-desc">{n.desc}</div>
              <div className="notif-time">{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  4. DASHBOARD  (Live-data fancy dashboard)
// ══════════════════════════════════════════════════════════════════
const DASH_N8N = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';
const dashAuthToken = () => localStorage.getItem('authToken') || '';

// EA 1955 entitlement helper
const getDashLeaveEntitlement = (employmentStartDate) => {
  if (!employmentStartDate) return { annual: 8, sick: 14, years: 0 };
  const years = (Date.now() - new Date(employmentStartDate)) / (365.25 * 24 * 60 * 60 * 1000);
  if (years >= 5) return { annual: 16, sick: 22, years: Math.floor(years) };
  if (years >= 2) return { annual: 12, sick: 18, years: Math.floor(years) };
  return { annual: 8, sick: 14, years: Math.floor(years) };
};

async function callDashN8N(action, subTarget, payload = {}) {
  const res = await fetch(DASH_N8N, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dashAuthToken()}` },
    body: JSON.stringify({ input_type: 'direct_action', edited_plan: { action, sub_target: subTarget, ...payload } }),
  });
  if (!res.ok) throw new Error(`n8n ${res.status}`);
  return res.json();
}

const DashboardPage = ({ userInfo }) => {
  const navigate = useNavigate();
  const [now] = useState(new Date());
  const userEmail = userInfo?.email || '';
  const userName = userInfo?.name || '';

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Live state ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState(null);   // object { annual: 14, ... } or null
  const [openTickets, setOpenTickets] = useState(0);
  const [upcomingRides, setUpcomingRides] = useState(0);
  const [rideSub, setRideSub] = useState('No rides');
  const [trainingCount, setTrainingCount] = useState(0);
  const [meetings, setMeetings] = useState([]);     // upcoming room bookings
  const [attendance, setAttendance] = useState(null);   // latest attendance record

  // ── Fetch all dashboard data on mount ───────────────────────────
  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        // 0 – leave balance (flexhr)
        callDashN8N('check_leave_balance', 'flexhr', { user_email: userEmail, user_name: userName }),
        // 1 – tickets (ticketing)
        callDashN8N('get_tickets', 'ticketing', { employee_email: userEmail }),
        // 2 – transport bookings
        callDashN8N('get_bookings', 'transport', { employee_email: userEmail }),
        // 3 – training (chart)
        callDashN8N('get_chart_overview', 'training', { employee_email: userEmail, employee_name: userName, data_type: 'training' }),
        // 4 – meeting room bookings
        callDashN8N('get_bookings', 'meeting_room', { employee_email: userEmail }),
        // 5 – attendance
        callDashN8N('list_attendance', 'flexhr', { user_email: userEmail, user_name: userName }),
      ]);
      if (cancelled) return;

      // 0 – Leave balance
      if (results[0].status === 'fulfilled') {
        const r = results[0].value;
        const d = r?.data ?? r?.result?.data ?? null;
        setLeaveBalance(d);
      }

      // 1 – Tickets
      if (results[1].status === 'fulfilled') {
        const r = results[1].value;
        const tickets = r?.data?.tickets ?? r?.data ?? [];
        const arr = Array.isArray(tickets) ? tickets : [];
        setOpenTickets(arr.filter(t => (t.status || '').toLowerCase() === 'open').length);
      }

      // 2 – Transport
      if (results[2].status === 'fulfilled') {
        const r = results[2].value;
        const rows = r?.data ?? r?.result?.data ?? [];
        const arr = Array.isArray(rows) ? rows : [];
        const active = arr.filter(b => (b.status || '').toLowerCase() !== 'cancelled');
        setUpcomingRides(active.length);
        if (active.length > 0) {
          const next = active[0];
          const timeStr = next.session_time ? String(next.session_time).slice(0, 5) : '';
          setRideSub(timeStr ? `Next at ${timeStr}` : `${active.length} active`);
        } else {
          setRideSub('No upcoming rides');
        }
      }

      // 3 – Training
      if (results[3].status === 'fulfilled') {
        const r = results[3].value;
        const rd = r?.data ?? r?.result?.data;
        const raw =
          (rd && typeof rd === 'object' && !Array.isArray(rd))
            ? (rd.training_info || rd.my_programs || rd.myPrograms || rd.data || [])
            : (Array.isArray(rd) ? rd : []);
        const arr = Array.isArray(raw) ? raw : [];
        setTrainingCount(arr.length);
      }

      // 4 – Meeting room bookings → events list
      if (results[4].status === 'fulfilled') {
        const r = results[4].value;
        let bookings = [];
        if (r?.type === 'bookings_list') bookings = r.bookings || [];
        else { const d = r?.data ?? r?.result?.data ?? []; bookings = Array.isArray(d) ? d : []; }
        // Take top 3
        setMeetings(bookings.slice(0, 3));
      }

      // 5 – Attendance
      if (results[5].status === 'fulfilled') {
        const r = results[5].value;
        const d = r?.data ?? r?.result?.data ?? [];
        const arr = Array.isArray(d) ? d : [];
        if (arr.length > 0) setAttendance(arr[0]);
      }

      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userEmail, userName]);

  // ── Computed values ─────────────────────────────────────────────
  const fmtTime12 = (iso) => {
    if (!iso) return '— : —';
    try { return new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return '— : —'; }
  };

  const clockIn = attendance?.clock_in_time ? fmtTime12(attendance.clock_in_time) : '— : —';
  const clockOut = attendance?.clock_out_time ? fmtTime12(attendance.clock_out_time) : '— : —';
  const isOnDuty = !!(attendance?.clock_in_time && !attendance?.clock_out_time);

  // Work progress bar
  const workPct = (() => {
    if (!attendance?.clock_in_time) return 0;
    const inTime = new Date(attendance.clock_in_time).getTime();
    const endTarget = inTime + 9 * 3600000; // 9 hours
    const current = attendance?.clock_out_time ? new Date(attendance.clock_out_time).getTime() : Date.now();
    return Math.min(100, Math.max(0, Math.round(((current - inTime) / (endTarget - inTime)) * 100)));
  })();

  const workedStr = (() => {
    if (!attendance?.clock_in_time) return 'Not clocked in';
    const inTime = new Date(attendance.clock_in_time).getTime();
    const current = attendance?.clock_out_time ? new Date(attendance.clock_out_time).getTime() : Date.now();
    const diff = current - inTime;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m worked`;
  })();

  // Leave balance display
  const leaveStr = (() => {
    if (!leaveBalance) return '—';
    if (typeof leaveBalance === 'object') {
      const keys = Object.keys(leaveBalance);
      if (keys.length === 0) return '—';
      // Show first key's value (e.g. annual leave)
      const first = keys[0];
      return String(leaveBalance[first]);
    }
    return String(leaveBalance);
  })();

  const leaveSub = (() => {
    if (!leaveBalance || typeof leaveBalance !== 'object') return 'Days Remaining';
    const keys = Object.keys(leaveBalance);
    return keys.length > 0 ? keys[0] : 'Days Remaining';
  })();

  // Build stats array with live data
  const stats = [
    { label: 'My Training', value: String(trainingCount), sub: 'Upcoming in CHART', color: '#1890ff', gradient: 'linear-gradient(135deg,#1890ff,#38bdf8)', icon: <TrendingUp size={20} color="#fff" /> },
    { label: 'Open Tickets', value: String(openTickets), sub: 'Tickets Pending', color: '#f39c12', gradient: 'linear-gradient(135deg,#f39c12,#fbbf24)', icon: <Ticket size={20} color="#fff" /> },
    { label: 'Upcoming Ride', value: String(upcomingRides), sub: rideSub, color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#34d399)', icon: <Briefcase size={20} color="#fff" /> },
  ];

  // Meeting events with colour dots
  const dotColors = ['#6c47d9', '#1890ff', '#10b981', '#f39c12'];
  const eventsList = meetings.map((m, i) => ({
    time: m.time ? m.time.split(' - ')[0] : (m.start ? new Date(m.start).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'),
    title: m.title || m.subject || 'Meeting',
    loc: m.room || m.location || '—',
    dot: dotColors[i % dotColors.length],
  }));

  const quickActions = [
    { label: 'Apply Leave', icon: <CalendarPlus size={22} />, path: '/flexhr', accent: '#6c47d9' },
    { label: 'Book Room', icon: <DoorOpen size={22} />, path: '/meeting-room', accent: '#1890ff' },
    { label: 'Submit Ticket', icon: <Ticket size={22} />, path: '/ticketing', accent: '#f39c12' },
    { label: 'Staff Claim', icon: <FileText size={22} />, path: '/staff-claim', accent: '#e11d48' },
  ];

  const announcements = [
    { id: 1, title: 'Remote Work Policy Updated', date: 'Mar 5, 2026', badge: 'New', badgeColor: '#10b981' },
    { id: 2, title: 'Annual Performance Review Open', date: 'Mar 1, 2026', badge: 'Important', badgeColor: '#f39c12' },
    { id: 3, title: 'Office Renovation — Level 12', date: 'Feb 28, 2026', badge: null, badgeColor: null },
  ];

  const birthdays = [
    { name: 'Sarah L.', date: 'Mar 10', initials: 'SL', bg: '#e0e7ff' },
    { name: 'Jason K.', date: 'Mar 12', initials: 'JK', bg: '#fce7f3' },
    { name: 'Priya M.', date: 'Mar 15', initials: 'PM', bg: '#d1fae5' },
    { name: 'Ahmad R.', date: 'Mar 18', initials: 'AR', bg: '#fef3c7' },
  ];

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} color="#6c47d9" style={{ animation: 'dashSpin 1s linear infinite' }} />
        <div style={{ marginTop: 14, fontSize: 13, color: '#aaa', fontWeight: 600 }}>Loading your workspace…</div>
        <style>{`@keyframes dashSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="dash-page">

      {/* ── 1. Greeting Header ── */}
      <div className="dash-header">
        <div className="dash-greeting">{greeting} 👋</div>
        <div className="dash-date">{dateStr}</div>
      </div>

      {/* ── 2. Leave Entitlement Banner (EA 1955) ── */}
      {(() => {
        const empDate = userInfo?.employment_start_date || leaveBalance?.employment_start_date;
        const ent = getDashLeaveEntitlement(empDate);
        const annualUsed = leaveBalance?.annual_leave_used ?? 0;
        const sickUsed   = leaveBalance?.sick_leave_used   ?? 0;
        const annualLeft = Math.max(0, ent.annual - annualUsed);
        const sickLeft   = Math.max(0, ent.sick   - sickUsed);
        return (
          <div style={{ background: 'linear-gradient(135deg,#1a0f3c,#2b1d62)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, border: '1px solid #6c47d9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: 0.5 }}>LEAVE ENTITLEMENT (EA 1955)</span>
              <span style={{ fontSize: 11, background: 'rgba(108,71,217,0.4)', color: '#c4b5fd', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{ent.years}yr{ent.years !== 1 ? 's' : ''} service</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#a78bfa', marginBottom: 4, fontWeight: 700 }}>ANNUAL LEAVE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: annualLeft > 0 ? '#4ade80' : '#f87171' }}>{annualLeft}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>/ {ent.annual} days left</span>
                </div>
                {annualUsed > 0 && <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2 }}>{annualUsed} days used</div>}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#38bdf8', marginBottom: 4, fontWeight: 700 }}>SICK LEAVE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: sickLeft > 0 ? '#38bdf8' : '#f87171' }}>{sickLeft}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>/ {ent.sick} days left</span>
                </div>
                {sickUsed > 0 && <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 2 }}>{sickUsed} days used</div>}
              </div>
            </div>
            {!empDate && <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 8 }}>⚠ Set employment start date in HR to see accurate entitlement.</div>}
          </div>
        );
      })()}

      {/* ── 3. Quick Stats ── */}
      <div className="dash-section-title">Overview</div>
      <div className="dash-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="dash-stat-card" style={{ '--dash-accent': s.color, animationDelay: `${i * 0.08}s` }}>
            <div className="dash-stat-icon" style={{ background: s.gradient }}>{s.icon}</div>
            <div className="dash-stat-body">
              <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Attendance (LIVE) ── */}
      <div className="dash-section-title">Today's Attendance</div>
      <div className="dash-attendance">
        <div className="dash-att-row">
          <div className="dash-att-block">
            <Clock size={16} color="#10b981" />
            <div>
              <div className="dash-att-label">Clock In</div>
              <div className="dash-att-time">{clockIn}</div>
            </div>
          </div>
          <div className="dash-att-divider" />
          <div className="dash-att-block">
            <Clock size={16} color={isOnDuty ? '#f39c12' : '#ef4444'} />
            <div>
              <div className="dash-att-label">Clock Out</div>
              <div className={`dash-att-time ${!attendance?.clock_out_time ? 'dash-att-pending' : ''}`}>{clockOut}</div>
            </div>
          </div>
        </div>
        <div className="dash-timeline">
          <div className="dash-timeline-track">
            <div className="dash-timeline-fill" style={{ width: `${workPct}%` }} />
          </div>
          <div className="dash-timeline-labels">
            <span>{clockIn !== '— : —' ? clockIn : '—'}</span>
            <span className="dash-timeline-hours">{workedStr}</span>
            <span>06:00 PM</span>
          </div>
        </div>
      </div>

      {/* ── 4. Upcoming Events (LIVE from meeting room bookings) ── */}
      <div className="dash-section-title">Upcoming Events</div>
      <div className="dash-events">
        {eventsList.length === 0 ? (
          <div style={{ padding: '18px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>No upcoming events</div>
        ) : eventsList.map((ev, i) => (
          <div key={i} className="dash-event-row">
            <div className="dash-event-dot" style={{ background: ev.dot }} />
            <div className="dash-event-time">{ev.time}</div>
            <div className="dash-event-body">
              <div className="dash-event-title">{ev.title}</div>
              <div className="dash-event-loc"><MapPin size={12} /> {ev.loc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. Quick Actions ── */}
      <div className="dash-section-title">Quick Actions</div>
      <div className="dash-quick-actions">
        {quickActions.map((a, i) => (
          <button key={i} className="dash-action-btn" onClick={() => navigate(a.path)} style={{ '--qa-accent': a.accent }}>
            <div className="dash-action-icon">{a.icon}</div>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── 6. Announcements ── */}
      <div className="dash-section-title"><Megaphone size={16} /> Announcements</div>
      <div className="dash-announce">
        {announcements.map(a => (
          <div key={a.id} className="dash-announce-item">
            <div className="dash-announce-text">
              <div className="dash-announce-title">{a.title}</div>
              <div className="dash-announce-date">{a.date}</div>
            </div>
            {a.badge && <span className="dash-announce-badge" style={{ background: a.badgeColor }}>{a.badge}</span>}
          </div>
        ))}
      </div>

      {/* ── 7. Birthdays ── */}
      <div className="dash-section-title"><Gift size={16} /> Upcoming Birthdays</div>
      <div className="dash-birthdays">
        {birthdays.map((b, i) => (
          <div key={i} className="dash-bday-card">
            <div className="dash-bday-avatar" style={{ background: b.bg }}>{b.initials}</div>
            <div className="dash-bday-name">{b.name}</div>
            <div className="dash-bday-date">{b.date}</div>
          </div>
        ))}
      </div>

    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  5. INFO PAGE
// ══════════════════════════════════════════════════════════════════
const InfoPage = () => {
  const [selectedInfo, setSelectedInfo] = useState(null);
  const infoItems = [
    { id: '1', label: 'Data Protection Policy', issuedDate: '2025-01-15', department: 'IT Security', scope: 'All Employees', desc: 'This policy outlines the requirements for handling personal and sensitive data...' },
    { id: '2', label: 'Remote Work Policy', issuedDate: '2025-03-01', department: 'HR', scope: 'Remote-Eligible Roles', desc: 'Employees approved for remote work must maintain a secure home office environment...' },
    { id: '3', label: 'Code of Conduct', issuedDate: '2024-12-10', department: 'Legal', scope: 'All Employees', desc: 'The Code of Conduct sets expectations for professional behavior...' },
    { id: '4', label: 'Expense Reimbursement Policy', issuedDate: '2025-02-20', department: 'Finance', scope: 'All Employees', desc: 'Employees may claim reasonable business expenses incurred during company activities...' },
  ];
  return (
    <>
      <div className="tab-header">Company Info</div>
      <div className="info-list">
        {infoItems.map(item => (
          <div key={item.id} className="info-item-row" onClick={() => setSelectedInfo(item)}>
            <span>{item.label}</span>
            <ChevronRight size={18} color="#ccc" />
          </div>
        ))}
      </div>
      {selectedInfo && (
        <div className="modal-overlay-custom">
          <div className="activity-details-modal">
            <div className="modal-header-purple">
              <span className="modal-title">Policy Details</span>
              <X size={20} color="white" onClick={() => setSelectedInfo(null)} style={{ cursor: 'pointer' }} />
            </div>
            <div className="modal-body-content">
              <h2 className="activity-main-name">{selectedInfo.label}</h2>
              <div className="detail-item-row"><Calendar size={18} color="#1890ff" /><span>Issued: {selectedInfo.issuedDate}</span></div>
              <div className="detail-item-row"><User size={18} color="#1890ff" /><span>Department: {selectedInfo.department}</span></div>
              <div className="detail-item-row"><MapPin size={18} color="#1890ff" /><span>Scope: {selectedInfo.scope}</span></div>
              <div className="modal-hr-line" />
              <div className="description-area"><h4>Description</h4><p>{selectedInfo.desc}</p></div>
            </div>
            <button className="modal-footer-done-btn" onClick={() => setSelectedInfo(null)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════
//  6. PROFILE PAGE
// ══════════════════════════════════════════════════════════════════
const ProfilePage = ({ setAuth, userInfo }) => {
  const navigate = useNavigate();
  const role = userInfo?.role || 'staff';
  const roleLabel = { admin: '🛡 Admin', hr: '👔 HR Manager', staff: '👤 Staff' }[role] || role;
  const roleBadgeColor = { admin: '#6c47d9', hr: '#1890ff', staff: '#10b981' }[role] || '#aaa';

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem('authToken');
    setAuth(false);
    navigate('/login');
  };

  return (
    <>
      <div className="profile-section">
        <div className="profile-avatar-box"><UserCircle size={80} color="#2b1d62" /></div>
        <h3>{userInfo?.name || 'ALAN TAN WAI LOON'}</h3>
        <p>{userInfo?.email || 'user@chinhin.com'}</p>
        <span style={{
          display: 'inline-block', marginTop: 8, padding: '4px 14px',
          borderRadius: 20, background: roleBadgeColor, color: '#fff',
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
        }}>{roleLabel}</span>
      </div>
      <div className="profile-menu">
        <div className="p-menu-item" onClick={() => alert('Check your email for reset code!')}><Lock size={18} /> <span>Reset Password</span></div>
        <div className="p-menu-item logout" onClick={handleLogout}><LogOut size={18} /> <span>Logout</span></div>
      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════
//  7. HOME
// ══════════════════════════════════════════════════════════════════
const Home = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = currentTime.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' });

  const menuGroups = [
    {
      title: 'Workplace',
      color: '#2b1d62',
      items: [
        { label: 'Meeting Room', icon: 'meeting room.png', path: '/meeting-room', accent: '#6c47d9' },
        { label: 'Transport', icon: 'transportation.png', path: '/transport', accent: '#4c3aa3' },
        { label: 'e-Visitor', icon: 'evisitor.png', path: '/evisitor', accent: '#5e35b1' },
        { label: 'Ticketing', icon: 'ticketing.png', path: '/ticketing', accent: '#7c4dff' },
      ]
    },
    {
      title: 'Wellbeing',
      color: '#0d7c66',
      items: [
        { label: 'CHART', icon: 'chart.png', path: '/chart', accent: '#00897b' },
        { label: 'Wellness', icon: 'wellness.png', path: '/wellness', accent: '#00acc1' },
        { label: 'Meal', icon: 'meal.png', path: '/meal', accent: '#26a69a' },
        { label: 'Childcare', icon: 'childcare.png', path: '/childcare', accent: '#0097a7' },
      ]
    },
    {
      title: 'Resources',
      color: '#b5560a',
      items: [
        // { label:'Energy',      icon:'energy.png',       path:'/energy',       accent:'#e67e22' },
        { label: 'flexHR', icon: 'flexhrlogo.png', path: '/flexhr', accent: '#d35400' },
        { label: 'Staff Claim', icon: 'claim.png', path: '/staff-claim', accent: '#e11d48' },
        { label: 'EPP', icon: 'epp.png', path: '/epp', accent: '#e74c3c' },
      ]
    }
  ];

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-bg" />
        <div className="home-hero-orb home-hero-orb1" />
        <div className="home-hero-orb home-hero-orb2" />
        <div className="home-hero-content">
          <div className="home-hero-env-badge">
            <span className="home-hero-env-dot" />
            STAGING ENVIRONMENT
          </div>
          <div className="home-hero-time">{timeStr}</div>
          <div className="home-hero-date">{dateStr}</div>
          <div className="home-hero-tagline">Your Intelligent Workplace</div>
        </div>
        <div className="home-hero-wave">
          <svg viewBox="0 0 480 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,20 C80,40 160,0 240,20 C320,40 400,0 480,20 L480,40 L0,40 Z" fill="#f4f6fb" />
          </svg>
        </div>
      </div>

      <div className="home-alert-strip">
        <div className="home-alert-icon"><Calendar size={13} color="#2b1d62" /></div>
        <div className="home-alert-marquee">
          <span className="home-alert-text">⚠ CAUTION — LIVE / PRODUCTION ENVIRONMENT &nbsp;&nbsp;•&nbsp;&nbsp; USE WITH CARE &nbsp;&nbsp;•&nbsp;&nbsp; ALL ACTIONS ARE REAL &nbsp;&nbsp;•&nbsp;&nbsp;</span>
        </div>
      </div>

      <div className="home-menu-body">
        {menuGroups.map((group, gi) => (
          <div key={gi} className="home-section">
            <div className="home-section-label" style={{ color: group.color }}>
              <span className="home-section-dot" style={{ background: group.color }} />
              {group.title}
            </div>
            <div className="home-grid">
              {group.items.map((item, idx) => (
                <Link to={item.path} key={idx} className="home-card" style={{ '--card-accent': item.accent }}>
                  <div className="home-card-icon-wrap">
                    <img src={`/icon_img/${item.icon}`} alt={item.label} className="home-card-icon" />
                    <div className="home-card-glow" />
                  </div>
                  <span className="home-card-label">{item.label}</span>
                  <div className="home-card-arrow">›</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  8. SCAN PAGE
// ══════════════════════════════════════════════════════════════════
const ScanPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        alert('Camera access denied.');
        navigate(-1);
      }
    };
    startCamera();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [navigate]);
  return (
    <div className="scan-page-container">
      <video ref={videoRef} autoPlay playsInline muted className="camera-video-layer" />
      <div className="scan-overlay-ui">
        <div className="scan-header">
          <button className="scan-back-btn" onClick={() => navigate(-1)}><ChevronLeft size={28} color="white" /></button>
          <span className="scan-title">Scan QR Code</span>
          <button className="scan-action-btn"><Zap size={20} color="white" /></button>
        </div>
        <div className="scan-viewfinder">
          <div className="viewfinder-box">
            <div className="corner top-left" /><div className="corner top-right" />
            <div className="corner bottom-left" /><div className="corner bottom-right" />
            <div className="scan-line" />
          </div>
        </div>
        <div className="scan-tip">Place QR code inside the frame</div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  9. PAGE WRAPPER
// ══════════════════════════════════════════════════════════════════
const PageWrapper = ({ children, showTopBar }) => (
  <div className="page-content" style={{ paddingTop: showTopBar ? '80px' : '0' }}>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  10. BOTTOM NAV
// ══════════════════════════════════════════════════════════════════
const FooterNav = ({ userInfo }) => {
  const location = useLocation();
  const left = [
    { label: 'Home', path: '/', icon: <HomeIcon size={22} /> },
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={22} /> },
  ];
  const right = [
    { label: 'Info', path: '/info', icon: <InfoIcon size={22} /> },
    { label: 'Profile', path: '/profile', icon: <UserCircle size={22} /> },
  ];
  return (
    <footer className="bottom-nav-fixed bottom-nav-with-fab">
      {left.map(n => (
        <Link to={n.path} key={n.label} className={`nav-item ${location.pathname === n.path ? 'active' : ''}`}>
          {n.icon}<span>{n.label}</span>
        </Link>
      ))}
      <div className="nav-chatbot-slot">
        <ChatBot userInfo={userInfo} />
      </div>
      {right.map(n => (
        <Link to={n.path} key={n.label} className={`nav-item ${location.pathname === n.path ? 'active' : ''}`}>
          {n.icon}<span>{n.label}</span>
        </Link>
      ))}
    </footer>
  );
};

// ══════════════════════════════════════════════════════════════════
//  11. ROOT APP
// ══════════════════════════════════════════════════════════════════
function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let splashDone = false;
    let authDone = false;
    const tryHide = () => { if (splashDone && authDone) setIsAppLoading(false); };

    // Splash timer
    const t = setTimeout(() => { splashDone = true; tryHide(); }, 2000);

    const checkAuth = () => {
      try {
        const persisted = loadSession();
        if (persisted) {
          setUserInfo(persisted);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn('Auth check error:', err.message);
      } finally {
        authDone = true;
        tryHide();
      }
    };

    checkAuth();
    return () => clearTimeout(t);
  }, []);

  const hiddenPaths = ['/scan', '/login'];
  const topBarPaths = ['/', '/dashboard', '/info', '/profile'];
  const showFooter = isAuthenticated && !hiddenPaths.includes(location.pathname);
  const showTopBar = showFooter && topBarPaths.includes(location.pathname);

  if (isAppLoading) return <SplashScreen />;

  return (
    <div className="mobile-app">
      {showTopBar && <GlobalWelcomeBar userInfo={userInfo} openNotifications={() => setShowNotifications(true)} />}

      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login setAuth={setIsAuthenticated} setUserInfo={setUserInfo} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <>
          {location.pathname === '/scan' ? <ScanPage /> : (
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={<PageWrapper showTopBar={showTopBar}><Home /></PageWrapper>} />
              <Route path="/dashboard" element={<PageWrapper showTopBar={showTopBar}><DashboardPage userInfo={userInfo} /></PageWrapper>} />
              <Route path="/info" element={<PageWrapper showTopBar={showTopBar}><InfoPage /></PageWrapper>} />
              <Route path="/profile" element={<PageWrapper showTopBar={showTopBar}><ProfilePage setAuth={setIsAuthenticated} userInfo={userInfo} /></PageWrapper>} />
              <Route path="/meeting-room" element={<PageWrapper showTopBar={false}><MeetingRoom userInfo={userInfo} /></PageWrapper>} />
              <Route path="/transport" element={<PageWrapper showTopBar={false}><Transport userInfo={userInfo} /></PageWrapper>} />
              <Route path="/evisitor" element={<PageWrapper showTopBar={false}><EVisitor userInfo={userInfo} /></PageWrapper>} />
              <Route path="/ticketing" element={<PageWrapper showTopBar={false}><Ticketing userInfo={userInfo} /></PageWrapper>} />
              <Route path="/chart" element={<PageWrapper showTopBar={false}><Chart userInfo={userInfo} /></PageWrapper>} />
              <Route path="/wellness" element={<PageWrapper showTopBar={false}><Wellness userInfo={userInfo} /></PageWrapper>} />
              <Route path="/meal" element={<PageWrapper showTopBar={false}><Meal userInfo={userInfo} /></PageWrapper>} />
              {/* <Route path="/energy"       element={<PageWrapper showTopBar={false}><Energy userInfo={userInfo}/></PageWrapper>} /> */}
              <Route path="/flexhr" element={<PageWrapper showTopBar={false}><FlexHR userInfo={userInfo} /></PageWrapper>} />
              <Route path="/mynews" element={<PageWrapper showTopBar={false}><Mynews userInfo={userInfo} /></PageWrapper>} />
              <Route path="/childcare" element={<PageWrapper showTopBar={false}><Childcare userInfo={userInfo} /></PageWrapper>} />
              <Route path="/epp" element={<PageWrapper showTopBar={false}><EPP userInfo={userInfo} /></PageWrapper>} />
              <Route path="/staff-claim" element={<PageWrapper showTopBar={false}><StaffClaim userInfo={userInfo} /></PageWrapper>} />
              <Route path="/requests" element={<PageWrapper showTopBar={false}><HRRequestCenter userInfo={userInfo} /></PageWrapper>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
          {showFooter && <FooterNav userInfo={userInfo} />}        </>
      )}

      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} userInfo={userInfo} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ══════════════════════════════════════════════════════════════════
export default function WrappedApp() {
  return <Router><App /></Router>;
}

// ══════════════════════════════════════════════════════════════════
//  STYLE TOKENS
// ══════════════════════════════════════════════════════════════════
const S = {
  splash: {
    root: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(160deg,#1a0f3c 0%,#2b1d62 55%,#3d2a8a 100%)', position: 'fixed', top: 0, left: 0, zIndex: 9999 },
    ring: { width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, animation: 'splashPulse 2.4s ease-in-out infinite', boxShadow: '0 0 40px rgba(130,90,255,.45)' },
    logo: { width: 120, height: 120, objectFit: 'contain' },
    title: { color: '#fff', fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: 1.5, animation: 'fadeSlideUp .6s ease both' },
    sub: { color: '#a89bc9', fontSize: 13, marginTop: 8, animation: 'fadeSlideUp .6s .18s ease both' },
    dots: { display: 'flex', gap: 7, marginTop: 36 },
    dot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#a89bc9', animation: 'splashBounce 1.4s ease-in-out infinite' },
  },
  login: {
    page: { minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(160deg,#1a0f3c 0%,#2b1d62 50%,#3d2a8a 100%)', padding: 20, position: 'relative', overflow: 'hidden' },
    blobTR: { position: 'absolute', top: -140, right: -140, width: 340, height: 340, borderRadius: '50%', background: 'rgba(120,80,255,.18)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'blobFloat 9s ease-in-out infinite' },
    blobBL: { position: 'absolute', bottom: -120, left: -120, width: 300, height: 300, borderRadius: '50%', background: 'rgba(40,120,255,.14)', filter: 'blur(70px)', pointerEvents: 'none', animation: 'blobFloat 11s ease-in-out infinite reverse' },
    blobMid: { position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, borderRadius: '50%', background: 'rgba(168,100,255,.08)', filter: 'blur(60px)', pointerEvents: 'none' },
    card: { position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderRadius: 28, padding: '44px 32px 38px', width: '100%', maxWidth: 380, boxShadow: '0 32px 90px rgba(0,0,0,.42)', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'cardIn .6s cubic-bezier(.22,1,.36,1) both' },
    iconWrap: { display: 'flex', justifyContent: 'center', marginBottom: 18 },
    iconRing: { width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg,#2b1d62,#6c3fc7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 36px rgba(43,29,98,.45)' },
    iconImg: { width: 110, height: 110, objectFit: 'contain' },
    appName: { fontSize: 26, fontWeight: 800, color: '#2b1d62', margin: '0 0 4px', letterSpacing: .5 },
    tagline: { fontSize: 13, color: '#7c6fa0', margin: '0 0 18px' },
    divider: { width: '100%', height: 1, background: 'linear-gradient(90deg,transparent,#d8cef0,transparent)', margin: '2px 0 22px' },
    errorBox: { width: '100%', padding: '11px 14px', borderRadius: 10, background: '#fff1f0', border: '1px solid #ffc9c9', color: '#c0392b', fontSize: 13, marginBottom: 14, textAlign: 'center', fontWeight: 500 },
    field: { display: 'flex', alignItems: 'center', gap: 10, background: '#f4f1fb', borderRadius: 12, padding: '13px 16px', marginBottom: 14, transition: 'box-shadow .2s ease', border: '1.5px solid transparent', width: '100%' },
    fieldInput: { border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 14, color: '#333', fontFamily: 'inherit' },
    signInBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '15px 20px', background: 'linear-gradient(135deg,#2b1d62,#6c3fc7)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, marginTop: 6, boxShadow: '0 8px 24px rgba(43,29,98,.38)', transition: 'transform .15s ease, box-shadow .15s ease', letterSpacing: .3 },
    spinner: { display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.35)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spinBtn .7s linear infinite' },
    footerNote: { marginTop: 24, fontSize: 11, color: '#b0a8c9' },
  },
};
