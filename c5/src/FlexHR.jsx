import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, X, MapPin, LogIn, LogOut, Calendar,
  Clock, ChevronRight, CheckCircle, XCircle, Info,
  FileText, Umbrella, ClipboardList, TrendingUp,
  Loader2, RefreshCw, AlertCircle, Send, Ban, ChevronDown, User,
  Shield, UserPlus, Edit3, KeyRound, ToggleLeft, ToggleRight, Trash2, CalendarDays,
  Inbox, Check, Hash, CreditCard, Ticket, Users, AlertTriangle, Download, BarChart2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import './FlexHR.css';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

// ─── Geofence Zones ──────────────────────────────────────────────────────────
const GEOFENCE_ZONES = [
  { id: 'mmu_melaka',    label: 'MMU Melaka',    lat: 2.2489,   lng: 102.2769,  radius: 300 }, 
  { id: 'mmu_cyberjaya', label: 'MMU Cyberjaya', lat: 2.927962, lng: 101.642178, radius: 300 },
];

// Haversine formula — returns distance in metres between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns { zone, distance } for the nearest zone, or null if no fix
function checkGeofence(lat, lng) {
  let nearest = null;
  let minDist = Infinity;
  for (const zone of GEOFENCE_ZONES) {
    const dist = Math.round(haversineDistance(lat, lng, zone.lat, zone.lng));
    if (dist < minDist) { minDist = dist; nearest = { zone, distance: dist }; }
  }
  if (!nearest) return null;
  return { ...nearest, inside: nearest.distance <= nearest.zone.radius };
}

// ─── n8n API Helper ─────────────────────────────────────────────────────────
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'flexhr', ...payload },
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
  // n8n sometimes returns an empty body when there is no data (e.g. no timetable
  // entries for a given month). Guard against JSON.parse('') crashing.
  const text = await res.text();
  if (!text || !text.trim()) return { data: [] };
  try { return JSON.parse(text); }
  catch { return { data: [] }; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return 'Select Date';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};
const fmtISO = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const getStatusInfo = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return { color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircle size={13} />, label: 'Approved' };
  if (s === 'rejected') return { color: '#dc2626', bg: '#fef2f2', icon: <XCircle size={13} />, label: 'Rejected' };
  return { color: '#d97706', bg: '#fffbeb', icon: <Clock size={13} />, label: 'Pending' };
};
const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Personal Leave', 'Maternity Leave', 'Paternity Leave'];

// Employment Act 1955 (Malaysia) – leave entitlement by years of service
const getLeaveEntitlement = (employmentStartDate) => {
  if (!employmentStartDate) return { annual: 8, sick: 14, years: 0 };
  const years = (Date.now() - new Date(employmentStartDate)) / (365.25 * 24 * 60 * 60 * 1000);
  if (years >= 5) return { annual: 16, sick: 22, years: Math.floor(years) };
  if (years >= 2) return { annual: 12, sick: 18, years: Math.floor(years) };
  return { annual: 8, sick: 14, years: Math.floor(years) };
};

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', gap: 12 }}>
    <Loader2 size={30} color="#2b1d62" style={{ animation: 'fhr-spin 1s linear infinite' }} />
    <span style={{ fontSize: 13, color: '#aaa' }}>Loading…</span>
  </div>
);

const ErrBanner = ({ msg, onRetry }) => (
  <div style={{
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px',
    display: 'flex', gap: 10, alignItems: 'center', margin: '10px 0'
  }}>
    <AlertCircle size={17} color="#dc2626" style={{ flexShrink: 0 }} />
    <span style={{ fontSize: 13, color: '#dc2626', flex: 1 }}>{msg}</span>
    {onRetry && <button onClick={onRetry} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62' }}><RefreshCw size={15} /></button>}
  </div>
);

const Empty = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 20px', gap: 10, textAlign: 'center' }}>
    <div style={{ width: 60, height: 60, background: '#f5f3ff', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    <p style={{ fontSize: 16, fontWeight: 700, color: '#333', margin: 0 }}>{title}</p>
    <span style={{ fontSize: 13, color: '#bbb' }}>{sub}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HR User Management API calls ────────────────────────────────────────────
async function callN8NAuth(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'auth', ...payload },
  };
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`n8n error: ${res.status}`);
  return res.json();
}

const ROLES = ['staff', 'hr', 'admin', 'Software Engineer', 'Designer', 'Intern','Mechanic','Driver'];

const FlexHR = ({ userInfo }) => {
  const isHR = userInfo?.role === 'hr' || userInfo?.role === 'admin';
  const navigate = useNavigate();
  const userName = userInfo?.name || 'EMPLOYEE';
  const userEmail = userInfo?.email || '';
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // ── routing ───────────────────────────────────────────────────────────────
  const [view, setView] = useState('home');

  // goTo triggers data fetches directly on click — runs exactly once, unlike
  // useEffect which React Strict Mode invokes twice in development causing
  // a double n8n request that wipes the first result via the catch block.
  const goTo = (v) => {
    setView(v);
    if (!userEmail) return;
    if (v === 'attendance') { fetchAtt(); fetchTodayShift(); fetchGPS(); }
    if (v === 'applyLeave') { fetchBal(); fetchApps(); }
    if (v === 'applications') fetchApps();
    if (v === 'userAdmin') { setUmSubView('list'); fetchUsers(); }
    if (v === 'timetable') fetchMyTT();
    if (v === 'manageTT') { setMttLoad(true); fetchAllTT(); }
    if (v === 'requestCenter') rcLoadData();
    if (v === 'attendanceReport') {
      setArData([]); setArErr(''); setArFetched(false);
      fetchAttReport();
    }
  };

  const back = () => { if (view === 'home') navigate('/'); else goTo('home'); };

  // ── Attendance ────────────────────────────────────────────────────────────
  const [attLoading, setAttLoading] = useState(false);
  const [attErr, setAttErr] = useState('');
  const [isPunching, setIsPunching] = useState(false);
  const [punchErr, setPunchErr] = useState('');
  const [punchOK, setPunchOK] = useState('');   // success message
  const [attHistory, setAttHistory] = useState([]);
  const [todayShift, setTodayShift] = useState(null);
  const [todayShiftLoaded, setTodayShiftLoaded] = useState(false);
  // GPS state: null = not fetched, 'acquiring' = in progress, {lat,lng} = ready, 'error' = denied/failed
  const [gpsStatus, setGpsStatus] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null); // { lat, lng, accuracy }

  const fetchGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('acquiring');
    setGpsCoords(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsStatus('ready');
      },
      () => { setGpsStatus('error'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const fetchAtt = useCallback(async () => {
    setAttLoading(true); setAttErr('');
    try {
      const r = await callN8N('list_attendance', { user_email: userEmail, user_name: userName });
      const d = r?.data ?? r?.result?.data ?? [];
      setAttHistory(Array.isArray(d) ? d : []);
    } catch { setAttErr('Could not load attendance records.'); }
    finally { setAttLoading(false); }
  }, [userEmail, userName]);

  const fetchTodayShift = useCallback(async () => {
    setTodayShiftLoaded(false);
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const r = await callN8N('get_my_timetable', { user_email: userEmail, month_start: todayStr, month_end: todayStr });
      const d = r?.data || (Array.isArray(r) ? r : []);
      const arr = Array.isArray(d) ? d : [];
      const entry = arr.find(e => e.work_date?.slice(0, 10) === todayStr) || null;
      setTodayShift(entry);
    } catch { setTodayShift(null); }
    setTodayShiftLoaded(true);
  }, [userEmail]);

  const lastEnt = attHistory[0];
  const isOnDuty = !!(lastEnt?.clock_in_time && !lastEnt?.clock_out_time);
  const nextPunchAct = isOnDuty ? 'punch_out' : 'punch_in';

  const isPunchInAllowed = useMemo(() => {
    if (isOnDuty) return true; // punch-out always allowed
    if (!todayShiftLoaded) return false;
    if (!todayShift) return false; // no shift → locked
    const now = new Date();
    const [h, m] = (todayShift.start_time || '08:00').split(':').map(Number);
    const shiftStart = new Date(); shiftStart.setHours(h, m, 0, 0);
    const windowStart = new Date(shiftStart.getTime() - 30 * 60 * 1000);  // 30 min before
    const windowEnd   = new Date(shiftStart.getTime() + 3 * 60 * 60 * 1000); // 3 hrs after
    return now >= windowStart && now <= windowEnd;
  }, [isOnDuty, todayShift, todayShiftLoaded]);

  const punchWindowMsg = useMemo(() => {
    if (isOnDuty) return '';
    if (!todayShiftLoaded) return 'Loading your schedule…';
    if (!todayShift) return 'No shift scheduled for today. Punch In is unavailable.';
    const [h, m] = (todayShift.start_time || '08:00').split(':').map(Number);
    const shiftStart = new Date(); shiftStart.setHours(h, m, 0, 0);
    const windowStart = new Date(shiftStart.getTime() - 30 * 60 * 1000);
    const windowEnd   = new Date(shiftStart.getTime() + 3 * 60 * 60 * 1000);
    const now = new Date();
    if (now < windowStart) {
      return `Punch In opens at ${windowStart.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    if (now > windowEnd) {
      return `Punch In window closed at ${windowEnd.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    return '';
  }, [isOnDuty, todayShift, todayShiftLoaded, isPunchInAllowed]); // eslint-disable-line

  const handlePunch = async () => {
    setIsPunching(true); setPunchErr(''); setPunchOK('');
    try {
      // ── Resolve GPS before punching ─────────────────────────────────────
      let coords = gpsCoords;
      if (!coords) {
        coords = await new Promise((resolve) => {
          if (!navigator.geolocation) { resolve(null); return; }
          setGpsStatus('acquiring');
          navigator.geolocation.getCurrentPosition(
            (pos) => { const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }; setGpsCoords(c); setGpsStatus('ready'); resolve(c); },
            () => { setGpsStatus('error'); resolve(null); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });
      }

      // ── Geofence check ───────────────────────────────────────────────────
      if (!coords) throw new Error('Could not get your GPS location. Please enable location access and try again.');
      const geo = checkGeofence(coords.lat, coords.lng);
      if (!geo?.inside) {
        const nearestName = geo?.zone?.label || 'any company campus';
        const dist = geo?.distance ? ` (${geo.distance}m away)` : '';
        throw new Error(`You are outside the allowed zone. Nearest campus: ${nearestName}${dist}. Attendance can only be recorded on campus.`);
      }

      const p = {
        user_email: userEmail,
        user_name: userName,
        latitude: coords.lat,
        longitude: coords.lng,
        gps_accuracy: coords.accuracy,
        location_name: geo.zone.label,
      };
      if (nextPunchAct === 'punch_out' && lastEnt?.attendance_id) p.attendance_id = lastEnt.attendance_id;
      const r = await callN8N(nextPunchAct, p);
      if (r?.success === false) throw new Error(r?.message || 'Punch failed');

      // ── Optimistic update: inject the returned record immediately ──────
      const rec = r?.data;
      if (rec?.attendance_id) {
        if (nextPunchAct === 'punch_in') {
          // prepend new punch-in record so button flips to PUNCH OUT right away
          setAttHistory(prev => [rec, ...prev]);
        } else {
          // merge clock_out_time into the matching record
          setAttHistory(prev => prev.map(e =>
            e.attendance_id === rec.attendance_id ? { ...e, ...rec } : e
          ));
        }
      }

      // Show success banner
      const timeStr = rec?.clock_in_time
        ? new Date(rec.clock_in_time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
        : rec?.clock_out_time
          ? new Date(rec.clock_out_time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
          : new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
      setPunchOK(nextPunchAct === 'punch_in'
        ? `Punched In at ${timeStr}`
        : `Punched Out at ${timeStr}`);
      setTimeout(() => setPunchOK(''), 4000);

      // Background refresh to sync full history from DB
      fetchAtt();
    } catch (e) { setPunchErr(e.message || 'Failed. Please try again.'); }
    finally { setIsPunching(false); }
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const initLv = { leaveType: 'Annual Leave', reason: '', fromDate: null, toDate: null };
  const [lvForm, setLvForm] = useState(initLv);
  const [lvLoad, setLvLoad] = useState(false);
  const [lvErr, setLvErr] = useState('');
  const [lvOK, setLvOK] = useState(false);
  const [balance, setBalance] = useState(null);
  const [employmentStartDate, setEmploymentStartDate] = useState(userInfo?.employment_start_date || null);
  const [balLoad, setBalLoad] = useState(false);

  const duration = useMemo(() => {
    if (!lvForm.fromDate || !lvForm.toDate) return 0;
    return Math.ceil(Math.abs(lvForm.toDate - lvForm.fromDate) / 86400000) + 1;
  }, [lvForm.fromDate, lvForm.toDate]);

  const fetchBal = useCallback(async () => {
    setBalLoad(true);
    try {
      const r = await callN8N('check_leave_balance', { user_email: userEmail, user_name: userName });
      const data = r?.data ?? r?.result?.data ?? null;
      setBalance(data);
      const empDate = data?.employment_start_date || r?.employment_start_date || userInfo?.employment_start_date || null;
      if (empDate) setEmploymentStartDate(empDate);
    } catch { }
    finally { setBalLoad(false); }
  }, [userEmail, userName, userInfo]);


  const submitLeave = async () => {
    if (!lvForm.fromDate || !lvForm.toDate || !lvForm.reason.trim()) { setLvErr('Please fill all required fields.'); return; }
    // ── One-pending-leave rule ────────────────────────────────────────────
    if (hasPendingLeave) {
      setLvErr('You already have a pending leave request. Please wait for it to be reviewed before submitting a new one.');
      return;
    }
    setLvLoad(true); setLvErr('');
    try {
      const r = await callN8N('apply_leave', {
        user_email: userEmail, user_name: userName,
        leave_type: lvForm.leaveType,
        start_date: fmtISO(lvForm.fromDate), end_date: fmtISO(lvForm.toDate),
        total_days: duration, reason: lvForm.reason,
        status: 'PENDING',
      });
      if (r?.success === false) throw new Error(r?.message || 'Submission failed');
      setLvOK(true); setLvForm(initLv);
      setTimeout(() => { setLvOK(false); goTo('home'); }, 2000);
    } catch (e) { setLvErr(e.message || 'Submission failed.'); }
    finally { setLvLoad(false); }
  };

  // ── Applications ──────────────────────────────────────────────────────────
  const [appsLoad, setAppsLoad] = useState(false);
  const [appsErr, setAppsErr] = useState('');
  const [apps, setApps] = useState([]);
  const [appsTab, setAppsTab] = useState('All');
  const [selApp, setSelApp] = useState(null);
  const [cancelId, setCancelId] = useState(null);

  const fetchApps = useCallback(async () => {
    setAppsLoad(true); setAppsErr('');
    try {
      const r = await callN8N('list_leaves', { user_email: userEmail, user_name: userName });
      console.log('[fetchApps] raw:', r);
      const d = r?.data ?? r?.result?.data ?? [];
      setApps(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn('[fetchApps] error:', e?.message || e);
      setApps([]); // show empty list instead of blocking
    }
    finally { setAppsLoad(false); }
  }, [userEmail, userName]);

  const hasPendingLeave = !appsLoad && apps.some(a => {
    const s = (a.status_code || a.status || '').toLowerCase();
    return s === 'pending';
  });

  const cancelApp = async (app) => {
    setCancelId(app.leave_id);
    try {
      await callN8N('cancel_leave', { user_email: userEmail, user_name: userName, leave_id: app.leave_id });
      // Optimistically mark as CANCELLED immediately so hasPendingLeave updates right away
      setApps(prev => prev.map(a =>
        a.leave_id === app.leave_id
          ? { ...a, status: 'CANCELLED', status_code: 'CANCELLED' }
          : a
      ));
      setSelApp(null);
      // Then sync with backend in background
      fetchApps();
    } catch { setAppsErr('Cancel failed. Please try again.'); }
    finally { setCancelId(null); }
  };

  // ── Overtime ──────────────────────────────────────────────────────────────
  const initOT = { workDate: null, hours: '', reason: '' };
  const [otForm, setOtForm] = useState(initOT);
  const [otLoad, setOtLoad] = useState(false);
  const [otErr, setOtErr] = useState('');
  const [otOK, setOtOK] = useState(false);

  const submitOT = async () => {
    if (!otForm.workDate || !otForm.hours || !otForm.reason.trim()) { setOtErr('Please fill all required fields.'); return; }
    setOtLoad(true); setOtErr('');
    try {
      const r = await callN8N('apply_overtime', {
        user_email: userEmail, user_name: userName,
        work_date: fmtISO(otForm.workDate), hours: parseFloat(otForm.hours), reason: otForm.reason,
      });
      if (r?.success === false) throw new Error(r?.message || 'Submission failed');
      setOtOK(true); setOtForm(initOT);
      setTimeout(() => { setOtOK(false); goTo('home'); }, 2000);
    } catch (e) { setOtErr(e.message || 'Submission failed.'); }
    finally { setOtLoad(false); }
  };

  // ── Attendance Report (HR only) ──────────────────────────────────────────
  const todayISO = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const [arFrom, setArFrom] = useState(firstOfMonth);
  const [arTo, setArTo] = useState(todayISO);
  const [arEmp, setArEmp] = useState('');        // '' = all employees
  const [arData, setArData] = useState([]);
  const [arLoad, setArLoad] = useState(false);
  const [arErr, setArErr] = useState('');
  const [arFetched, setArFetched] = useState(false);

  const fetchAttReport = useCallback(async () => {
    if (!arFrom || !arTo) { setArErr('Please select a date range.'); return; }
    setArLoad(true); setArErr(''); setArFetched(false);
    try {
      const payload = { user_email: userEmail, user_name: userName, start_date: arFrom, end_date: arTo };
      if (arEmp) payload.target_email = arEmp;
      const r = await callN8N('list_all_attendance', payload);
      console.log('[fetchAttReport] raw:', r);
      const d = r?.data ?? r?.result?.data ?? r?.records ?? (Array.isArray(r) ? r : []);
      setArData(Array.isArray(d) ? d : []);
      setArFetched(true);
    } catch (e) { setArErr(e?.message || 'Could not load attendance report.'); }
    finally { setArLoad(false); }
  }, [arFrom, arTo, arEmp, userEmail, userName]);




  // Works on web (blob download) and Android (Share sheet).
  // On Android: tries writing to cache via Filesystem then shares the file URI.
  // Falls back to sharing raw CSV text if the Filesystem plugin isn't registered.
  const exportAttCSV = async () => {
    if (!arData.length) return;
    const headers = ['Employee', 'Email', 'Date', 'Clock In', 'Clock Out', 'Location', 'Duration (hrs)', 'Status'];
    const rows = arData.map(r => {
      const clockIn  = r.clock_in_time  ? new Date(r.clock_in_time)  : null;
      const clockOut = r.clock_out_time ? new Date(r.clock_out_time) : null;
      const durationHrs = (clockIn && clockOut) ? ((clockOut - clockIn) / 3600000).toFixed(2) : '';
      const dateStr = clockIn ? clockIn.toLocaleDateString('en-GB') : (r.work_date ? r.work_date.slice(0,10) : '--');
      const inStr   = clockIn  ? clockIn.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '--';
      const outStr  = clockOut ? clockOut.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '--';
      return [
        `"${r.employee_name || r.user_name || '--'}"`,
        `"${r.employee_email || r.user_email || '--'}"`,
        dateStr, inStr, outStr,
        `"${r.location_name || r.clock_in_location || '--'}"`,
        durationHrs,
        `"${r.punch_status || r.status || '--'}"`,
      ];
    });
    const csv      = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `attendance_report_${arFrom}_to_${arTo}.csv`;

    if (Capacitor.isNativePlatform()) {
      // ── Android / iOS ────────────────────────────────────────────────────
      try {
        // Try Filesystem first (requires @capacitor/filesystem installed directly)
        await Filesystem.writeFile({ path: filename, data: csv, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
        await Share.share({ title: 'Attendance Report', url: uri, dialogTitle: 'Save or share CSV' });
      } catch {
        // Filesystem not available — share raw CSV text as fallback
        try {
          await Share.share({
            title: 'Attendance Report',
            text: csv,
            dialogTitle: 'Save attendance CSV',
          });
        } catch (e2) {
          alert('Export failed: ' + (e2?.message || e2));
        }
      }
    } else {
      // ── Web browser ──────────────────────────────────────────────────────
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  };


  // ── User Management (HR only) ─────────────────────────────────────────────
  const [umUsers, setUmUsers] = useState([]);
  const [umLoad, setUmLoad] = useState(false);
  const [umErr, setUmErr] = useState('');
  const [umOK, setUmOK] = useState('');
  const [umSubView, setUmSubView] = useState('list'); // 'list' | 'register' | 'edit'
  const [umEditTarget, setUmEditTarget] = useState(null); // user being edited
  const [deleteId, setDeleteId] = useState(null); // email being deleted

  // ── Timetable ──────────────────────────────────────────────────────────────
  const nowD = new Date();
  const [ttMonth, setTtMonth] = useState({ year: nowD.getFullYear(), month: nowD.getMonth() });
  const [ttData, setTtData] = useState([]);
  const [ttLoad, setTtLoad] = useState(false);
  const [ttErr, setTtErr] = useState('');
  const [ttDetail, setTtDetail] = useState(null);

  // HR Manage Timetable
  const [mttMonth, setMttMonth] = useState({ year: nowD.getFullYear(), month: nowD.getMonth() });
  const [mttShifts, setMttShifts] = useState([]);
  const [mttAllData, setMttAllData] = useState([]);
  const [mttLoad, setMttLoad] = useState(false);
  const [mttErr, setMttErr] = useState('');
  const [mttOK, setMttOK] = useState('');
  const [mttSubView, setMttSubView] = useState('calendar'); // 'calendar' | 'assign' | 'createShift'
  const [mttSelEmp, setMttSelEmp] = useState('');
  const [mttDetail, setMttDetail] = useState(null); // { dateStr, entries }
  const initAssignForm = { startDate: '', endDate: '', shiftId: '', targetEmpId: '', isOff: false, weekdaysOnly: true };
  const [mttAssign, setMttAssign] = useState(initAssignForm);
  const [mttAssignLoad, setMttAssignLoad] = useState(false);
  const [newShift, setNewShift] = useState({ shift_name: '', start_time: '08:00', end_time: '17:00' });
  const [newShiftLoad, setNewShiftLoad] = useState(false);

  const getMonthRange = (y, m) => {
    const s = new Date(y, m, 1), e = new Date(y, m + 1, 0);
    const p = (n) => String(n).padStart(2, '0');
    return { start: `${y}-${p(m + 1)}-01`, end: `${y}-${p(m + 1)}-${p(e.getDate())}`, days: e.getDate() };
  };

  const fetchMyTT = useCallback(async () => {
    setTtLoad(true); setTtErr('');
    const { start, end } = getMonthRange(ttMonth.year, ttMonth.month);
    try {
      const r = await callN8N('get_my_timetable', { user_email: userEmail, month_start: start, month_end: end });
      console.log('[fetchMyTT] raw:', r);
      const d = r?.data || (Array.isArray(r) ? r : []);
      setTtData(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn('[fetchMyTT] error:', e?.message || e);
      setTtData([]); // show empty calendar instead of blocking
    }
    setTtLoad(false);
  }, [ttMonth, userEmail]);

  const fetchShifts = useCallback(async () => {
    try {
      const r = await callN8N('list_shifts', { user_email: userEmail });
      setMttShifts(Array.isArray(r?.data) ? r.data : []);
    } catch { }
  }, [userEmail]);

  const fetchAllTT = useCallback(async () => {
    console.log('[fetchAllTT] START mttMonth:', mttMonth, 'email:', userEmail);
    setMttLoad(true); setMttErr('');
    const { start, end } = getMonthRange(mttMonth.year, mttMonth.month);
    try {
      const r = await callN8N('get_all_timetable', { user_email: userEmail, month_start: start, month_end: end });
      console.log('[fetchAllTT] raw:', r);
      const d = r?.data || (Array.isArray(r) ? r : []);
      const arr = Array.isArray(d) ? d : [];
      console.log('[fetchAllTT] parsed rows:', arr.length);
      setMttAllData(arr);
    } catch (e) {
      console.warn('[fetchAllTT] error:', e?.message || e);
      setMttAllData([]);
    }
    setMttLoad(false);
  }, [mttMonth, userEmail]);

  const submitAssignTT = async () => {
    if (!mttAssign.startDate || !mttAssign.endDate || !mttAssign.shiftId || !mttAssign.targetEmpId) {
      setMttErr('Please fill all fields'); return;
    }
    setMttAssignLoad(true); setMttErr(''); setMttOK('');
    try {
      const r = await callN8N('assign_timetable', {
        user_email: userEmail, target_employee_id: Number(mttAssign.targetEmpId),
        shift_id: Number(mttAssign.shiftId), start_date: mttAssign.startDate,
        end_date: mttAssign.endDate, is_off: mttAssign.isOff, weekdays_only: mttAssign.weekdaysOnly,
      });
      if (r?.success === false) throw new Error(r?.message || 'Failed');
      setMttOK(r?.message || 'Assigned!'); setMttAssign(initAssignForm); setMttSubView('calendar'); fetchAllTT();
      setTimeout(() => setMttOK(''), 4000);
    } catch (e) { setMttErr(e.message || 'Assign failed'); }
    setMttAssignLoad(false);
  };

  const submitNewShift = async () => {
    if (!newShift.shift_name || !newShift.start_time || !newShift.end_time) { setMttErr('Fill all shift fields'); return; }
    setNewShiftLoad(true); setMttErr('');
    try {
      const r = await callN8N('create_shift', { user_email: userEmail, ...newShift });
      if (r?.success === false) throw new Error(r?.message || 'Failed');
      setMttOK(`Shift "${newShift.shift_name}" created!`); setNewShift({ shift_name: '', start_time: '08:00', end_time: '17:00' });
      fetchShifts(); setMttSubView('calendar'); setTimeout(() => setMttOK(''), 4000);
    } catch (e) { setMttErr(e.message || 'Failed'); }
    setNewShiftLoad(false);
  };

  const initRegForm = { name: '', email: '', password: '', role: 'staff', employment_start_date: '' };
  const [regForm, setRegForm] = useState(initRegForm);
  const [regLoad, setRegLoad] = useState(false);
  const [regErr, setRegErr] = useState('');

  const initEditForm = { email: '', name: '', password: '', role: 'staff', is_active: true, employment_start_date: '' };
  const [editForm, setEditForm] = useState(initEditForm);
  const [editLoad, setEditLoad] = useState(false);
  const [editErr, setEditErr] = useState('');

  const fetchUsers = useCallback(async () => {
    setUmLoad(true); setUmErr('');
    try {
      const r = await callN8NAuth('list_users');
      const d = r?.data ?? r?.users ?? r?.result?.data ?? [];
      setUmUsers(Array.isArray(d) ? d : []);
    } catch { setUmErr('Could not load users. Check n8n connection.'); }
    finally { setUmLoad(false); }
  }, []);

  const submitRegister = async () => {
    if (!regForm.name.trim() || !regForm.email.trim() || !regForm.password) {
      setRegErr('Please fill in all fields.'); return;
    }
    setRegLoad(true); setRegErr(''); setUmOK('');
    try {
      const r = await callN8NAuth('create_user', {
        name: regForm.name.trim(),
        email: regForm.email.trim().toLowerCase(),
        password: regForm.password,
        role: regForm.role,
        employment_start_date: regForm.employment_start_date || null,
      });
      if (r?.success === false) throw new Error(r?.message || 'Registration failed');
      setUmOK(`User "${regForm.email}" created successfully!`);
      setRegForm(initRegForm);
      setUmSubView('list');
      fetchUsers();
      setTimeout(() => setUmOK(''), 4000);
    } catch (e) { setRegErr(e.message || 'Registration failed.'); }
    finally { setRegLoad(false); }
  };

  const openEdit = (u) => {
    setUmEditTarget(u);
    setEditForm({
      email: u.email, name: u.name || '', password: '', role: u.role || 'staff',
      is_active: u.is_active !== false,
      employment_start_date: u.employment_start_date ? u.employment_start_date.slice(0, 10) : '',
    });
    setEditErr('');
    setUmSubView('edit');
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete account "${u.name || u.email}"? This cannot be undone.`)) return;
    setDeleteId(u.email);
    try {
      const r = await callN8NAuth('delete_user', { target_email: u.email });
      if (r?.success === false) throw new Error(r?.message || 'Delete failed');
      setUmOK(`Account "${u.name || u.email}" deleted.`);
      fetchUsers();
      setTimeout(() => setUmOK(''), 4000);
    } catch (e) { setUmErr(e.message || 'Delete failed.'); }
    finally { setDeleteId(null); }
  };

  const submitEdit = async () => {
    setEditLoad(true); setEditErr(''); setUmOK('');
    try {
      const payload = {
        target_email: umEditTarget.email,
        new_email: editForm.email.trim().toLowerCase(),
        name: editForm.name.trim(),
        role: editForm.role,
        is_active: editForm.is_active,
        employment_start_date: editForm.employment_start_date || null,
      };
      if (editForm.password) payload.password = editForm.password;
      const r = await callN8NAuth('update_user', payload);
      if (r?.success === false) throw new Error(r?.message || 'Update failed');
      setUmOK(`User "${editForm.email}" updated!`);
      setUmSubView('list');
      fetchUsers();
      setTimeout(() => setUmOK(''), 4000);
    } catch (e) { setEditErr(e.message || 'Update failed.'); }
    finally { setEditLoad(false); }
  };

  // ── Calendar ──────────────────────────────────────────────────────────────
  const [calOpen, setCalOpen] = useState(false);
  const [calField, setCalField] = useState('from');
  const [calCtx, setCalCtx] = useState('leave');
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const openCal = (field, ctx) => { setCalField(field); setCalCtx(ctx); setCalOpen(true); };

  const pickDay = (date) => {
    if (calCtx === 'leave') {
      if (calField === 'from') setLvForm(f => ({ ...f, fromDate: date, toDate: f.toDate && date > f.toDate ? null : f.toDate }));
      else setLvForm(f => ({ ...f, toDate: date }));
    } else {
      setOtForm(f => ({ ...f, workDate: date }));
    }
    setCalOpen(false);
  };

  const calDays = () => {
    const yr = viewDate.getFullYear(), mo = viewDate.getMonth();
    const first = new Date(yr, mo, 1).getDay(), total = new Date(yr, mo + 1, 0).getDate();
    const offset = first === 0 ? 6 : first - 1;
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(<div key={`e${i}`} className="day-cell empty" />);
    const fromD = calCtx === 'leave' ? lvForm.fromDate : otForm.workDate;
    const toD = calCtx === 'leave' ? lvForm.toDate : null;
    for (let d = 1; d <= total; d++) {
      const cur = new Date(yr, mo, d);
      const past = cur < today;
      const inval = calCtx === 'leave' && calField === 'to' && lvForm.fromDate && cur < lvForm.fromDate;
      const dis = past || inval;
      const isFr = fromD && fromD.getTime() === cur.getTime();
      const isTo2 = toD && toD.getTime() === cur.getTime();
      const inRng = fromD && toD && cur > fromD && cur < toD;
      cells.push(
        <div key={d} onClick={() => !dis && pickDay(cur)}
          className={`day-cell ${dis ? 'disabled' : ''} ${isFr || isTo2 ? 'selected' : ''} ${inRng ? 'in-range' : ''}`}
        >{d}</div>
      );
    }
    return cells;
  };

  // ── Request Center (HR) state — declared FIRST so useEffects below can reference rcTab ──
  const [rcTab, setRcTab] = useState('claims');
  const [rcLoading, setRcLoading] = useState(false);
  const [rcErr, setRcErr] = useState('');
  const [rcClaims, setRcClaims] = useState([]);
  const [rcTickets, setRcTickets] = useState([]);
  const [rcVisitors, setRcVisitors] = useState([]);
  const [rcLeaves, setRcLeaves] = useState([]);
  const [rcActionId, setRcActionId] = useState(null);
  const [rcDetail, setRcDetail] = useState(null);
  const [rcRejectModal, setRcRejectModal] = useState(null);

  const rcStatusClass = (s) => {
    const l = String(s || '').toLowerCase();
    if (l.includes('approve')) return 'approved';
    if (l.includes('reject')) return 'rejected';
    if (l.includes('cancel')) return 'cancelled';
    return 'pending';
  };

  const rcLoadData = useCallback(async () => {
    setRcLoading(true); setRcErr('');
    try {
      if (rcTab === 'claims') {
        const res = await callN8N('list_claims', { sub_target: 'request_center', employee_email: userEmail, employee_name: userName });
        const arr = res?.data ?? res?.result?.data ?? [];
        setRcClaims(Array.isArray(arr) ? arr : []);
      } else if (rcTab === 'tickets') {
        const res = await callN8N('get_tickets', { sub_target: 'request_center', employee_email: userEmail });
        let raw = res?.data?.tickets ?? res?.tickets ?? res?.data ?? res?.result?.data ?? null;
        if (raw == null && res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          const d = res.data; raw = [...(d.open || []), ...(d.approved || []), ...(d.rejected || [])];
        }
        const list = Array.isArray(raw) ? raw : [];
        setRcTickets(list.filter(t => t && (t.id != null || t.ticket_id != null) && (t.issueCategory != null || t.issueDescription != null || t.level != null)));
      } else if (rcTab === 'visitors') {
        const res = await callN8N('list_visitors', { sub_target: 'request_center', user_email: userEmail, user_name: userName });
        let raw = null;
        if (res?.data && Array.isArray(res.data)) raw = res.data;
        else if (res?.result?.data && Array.isArray(res.result.data)) raw = res.result.data;
        else if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          const d = res.data; raw = [...(d.open || []), ...(d.approved || []), ...(d.rejected || []), ...(d.cancelled || [])];
        }
        if (!raw) raw = [];
        setRcVisitors(raw.filter(v => v && v.appointment_id != null && (v.visitor_name != null || v.official_email != null)));
      } else {
        // leaves — fetch ALL employees' leaves for HR review
        const res = await callN8N('list_all_leaves', { user_email: userEmail, user_name: userName });
        const arr = res?.data ?? res?.result?.data ?? [];
        setRcLeaves(Array.isArray(arr) ? arr : []);
      }
    } catch { setRcErr('Unable to load requests. Please try again.'); }
    finally { setRcLoading(false); }
  }, [rcTab, userEmail, userName]);

  const rcDecide = async (kind, item, decision, reason = '') => {
    const id = kind === 'claims' ? (item.claim_id ?? item.id)
      : kind === 'tickets' ? (item.id ?? item.ticket_id)
      : kind === 'leaves' ? item.leave_id
      : item.appointment_id;
    if (!id) return;
    const key = `${kind}-${id}-${decision}`;
    setRcActionId(key);
    try {
      if (kind === 'claims') {
        await callN8N(decision === 'approve' ? 'approve_claim' : 'reject_claim', { sub_target: 'request_center', employee_email: userEmail, employee_name: userName, claim_id: id, decision, reason });
        setRcClaims(p => p.filter(c => (c.claim_id ?? c.id) !== id));
      } else if (kind === 'tickets') {
        await callN8N(decision === 'approve' ? 'approve_ticket' : 'reject_ticket', { sub_target: 'request_center', employee_email: userEmail, employee_name: userName, ticket_id: id, decision, reason });
        setRcTickets(p => p.filter(t => (t.id ?? t.ticket_id) !== id));
      } else if (kind === 'leaves') {
        await callN8N(decision === 'approve' ? 'approve_leave' : 'reject_leave', {
          user_email: userEmail, user_name: userName,
          leave_id: id, decision, admin_note: reason,
        });
        // Optimistically update status in list
        setRcLeaves(p => p.map(l => l.leave_id === id
          ? { ...l, status: decision === 'approve' ? 'APPROVED' : 'REJECTED', status_code: decision === 'approve' ? 'APPROVED' : 'REJECTED' }
          : l
        ));
      } else {
        await callN8N(decision === 'approve' ? 'approve_appointment' : 'reject_appointment', { sub_target: 'request_center', appointment_id: id, decision, reason, user_email: userEmail, user_name: userName });
        setRcVisitors(p => p.filter(v => v.appointment_id !== id));
      }
      setRcDetail(null); setRcRejectModal(null);
      rcLoadData();
    } catch (e) { setRcErr(e?.message || 'Action failed.'); }
    finally { setRcActionId(null); }
  };

  const rcPendingClaims = rcClaims.filter(c => rcStatusClass(c.status ?? c.status_code) === 'pending').length;
  const rcPendingTickets = rcTickets.filter(t => rcStatusClass(t.status) === 'pending').length;
  const rcPendingVisitors = rcVisitors.filter(v => rcStatusClass(v.status) === 'pending').length;
  const rcPendingLeaves = rcLeaves.filter(l => rcStatusClass(l.status_code || l.status) === 'pending').length;

  // ── side effects ──────────────────────────────────────────────────────────
  // Safety net for deep-link / page-refresh: fire only ONE critical request
  // so n8n is not throttled by concurrent calls.
  useEffect(() => {
    if (!userEmail) return;
    if (view === 'manageTT') { setMttLoad(true); fetchAllTT(); }
    if (view === 'attendanceReport') { setArData([]); setArErr(''); setArFetched(false); fetchAttReport(); }
  }, [userEmail]); // eslint-disable-line

  // Auto-fetch when the HR navigates to a different month in manageTT
  useEffect(() => {
    if (view === 'manageTT' && userEmail) fetchAllTT();
  }, [mttMonth]); // eslint-disable-line

  // Lazily load shifts + users only when the relevant sub-tab is opened
  useEffect(() => {
    if (view !== 'manageTT' || !userEmail) return;
    if (mttSubView === 'assign' || mttSubView === 'createShift') { fetchShifts(); fetchUsers(); }
    if (mttSubView === 'calendar') fetchUsers();
  }, [mttSubView]); // eslint-disable-line

  // Reload RC data when tab changes
  useEffect(() => {
    if (view === 'requestCenter') rcLoadData();
  }, [rcTab]); // eslint-disable-line

  const pendingCount = apps.filter(a => (a.status_code || a.status || '').toLowerCase() === 'pending').length;
  const filteredApps = apps.filter(a => appsTab === 'All' || (a.status_code || a.status || '').toLowerCase() === appsTab.toLowerCase());
  const viewTitles = { attendance: 'Attendance', applyLeave: 'Apply Leave', applyOT: 'Overtime', applications: 'My Applications', userAdmin: 'User Management', timetable: 'My Timetable', manageTT: 'Manage Timetable', requestCenter: 'Request Center', attendanceReport: 'Attendance Report' };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flexhr-container">

      {/* NAV */}
      <nav className="flexhr-nav">
        <div className="nav-back" onClick={back}><ChevronLeft size={24} color="#fff" /></div>
        <span className="nav-title">FlexHR</span>
        {view !== 'home' && <span className="nav-view-label">{viewTitles[view]}</span>}
      </nav>

      <div className="flexhr-main">

        {/* ── HOME ──────────────────────────────────────────────────────── */}
        {view === 'home' && (
          <div className="home-layout">
            <div className="greeting-bar">
              <div className="greeting-avatar">{(userName[0] || 'E').toUpperCase()}</div>
              <div>
                <div className="greeting-name">Hi, {userName.split(' ')[0]} 👋</div>
                <div className="greeting-sub">What would you like to do?</div>
              </div>
            </div>
            <h3 className="section-label">My Leave Entitlement</h3>
            {(() => {
              const empDate = userInfo?.employment_start_date;
              const ent = getLeaveEntitlement(empDate);
              return (
                <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, border: '1px solid #ddd6fe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6c47d9', letterSpacing: 0.5 }}>EA 1955</span>
                    <span style={{ fontSize: 11, background: '#ede9fe', color: '#6c47d9', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{ent.years}yr{ent.years !== 1 ? 's' : ''} service</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Umbrella size={18} color="#6c47d9" />
                      <div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>ANNUAL</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#2b1d62', lineHeight: 1 }}>{ent.annual}<span style={{ fontSize: 11, fontWeight: 400, color: '#aaa' }}> days</span></div>
                      </div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} color="#0ea5e9" />
                      <div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>SICK</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>{ent.sick}<span style={{ fontSize: 11, fontWeight: 400, color: '#aaa' }}> days</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 6, textAlign: 'center' }}>
                    {empDate ? `${ent.years} year${ent.years !== 1 ? 's' : ''} of service · Tap Apply Leave for details` : '⚠ Set employment date in HR → accurate entitlement'}
                  </div>
                </div>
              );
            })()}
            <h3 className="section-label">Quick Actions</h3>
            <div className="card-grid">
              <div className="action-card" onClick={() => goTo('attendance')}>
                <div className="card-icon-wrap att-color"><ClipboardList size={26} /></div>
                <span className="card-text">Attendance</span>
              </div>
              <div className="action-card" onClick={() => goTo('applyLeave')}>
                <div className="card-icon-wrap leave-color"><Umbrella size={26} /></div>
                <span className="card-text">Apply Leave</span>
              </div>
            </div>
            <div className="card-grid">
              <div className="action-card" onClick={() => goTo('applyOT')}>
                <div className="card-icon-wrap ot-color"><TrendingUp size={26} /></div>
                <span className="card-text">Overtime</span>
              </div>
              <div className="action-card" style={{ position: 'relative' }} onClick={() => goTo('applications')}>
                <div className="card-icon-wrap status-color"><FileText size={26} /></div>
                <span className="card-text">My Applications</span>
                {pendingCount > 0 && <span className="task-badge">{pendingCount}</span>}
              </div>
            </div>
            {/* Timetable card — all users */}
            <div className="card-grid" style={{ marginTop: 0 }}>
              <div className="action-card" onClick={() => goTo('timetable')}>
                <div className="card-icon-wrap" style={{ background: 'rgba(16,185,129,0.15)' }}><CalendarDays size={26} color="#10b981" /></div>
                <span className="card-text">My Timetable</span>
              </div>
              {isHR ? (
                <div className="action-card" onClick={() => goTo('manageTT')} style={{ background: 'linear-gradient(135deg,#0f2027,#1a3a4a)', border: '2px solid #0ea5e9' }}>
                  <div className="card-icon-wrap" style={{ background: 'rgba(14,165,233,0.2)' }}><CalendarDays size={26} color="#38bdf8" /></div>
                  <span className="card-text" style={{ color: '#bae6fd' }}>Manage Timetable</span>
                </div>
              ) : <div style={{ flex: 1 }} />}
            </div>
            {/* HR-only cards: User Management + Request Center */}
            {isHR && (
              <>
                <div className="card-grid" style={{ marginTop: 0 }}>
                  <div className="action-card" onClick={() => goTo('userAdmin')}
                    style={{ background: 'linear-gradient(135deg,#1a0f3c,#2b1d62)', border: '2px solid #6c47d9' }}>
                    <div className="card-icon-wrap" style={{ background: 'rgba(108,71,217,0.22)' }}><Shield size={26} color="#a78bfa" /></div>
                    <span className="card-text" style={{ color: '#e9d5ff' }}>User Management</span>
                  </div>
                  <div className="action-card" onClick={() => goTo('requestCenter')}
                    style={{ background: 'linear-gradient(135deg,#0f2027,#1c3b2a)', border: '2px solid #10b981' }}>
                    <div className="card-icon-wrap" style={{ background: 'rgba(16,185,129,0.18)' }}><Inbox size={26} color="#34d399" /></div>
                    <span className="card-text" style={{ color: '#a7f3d0' }}>Request Center</span>
                    {(rcPendingClaims + rcPendingTickets + rcPendingVisitors) > 0 && (
                      <span className="task-badge">{rcPendingClaims + rcPendingTickets + rcPendingVisitors}</span>
                    )}
                  </div>
                </div>
                <div className="card-grid" style={{ marginTop: 0 }}>
                  <div className="action-card" onClick={() => goTo('attendanceReport')}
                    style={{ background: 'linear-gradient(135deg,#0a1628,#1e3a5f)', border: '2px solid #3b82f6' }}>
                    <div className="card-icon-wrap" style={{ background: 'rgba(59,130,246,0.2)' }}><BarChart2 size={26} color="#60a5fa" /></div>
                    <span className="card-text" style={{ color: '#bfdbfe' }}>Attendance Report</span>
                  </div>
                  <div style={{ flex: 1 }} />
                </div>
              </>
            )}

          </div>
        )}

        {/* ── ATTENDANCE ────────────────────────────────────────────────── */}
        {view === 'attendance' && (
          <div className="att-module">
            {!attLoading && attHistory.length > 0 && (
              <div className="att-summary">
                <div className="summary-item"><span className="label">Last</span><span className="value">{isOnDuty ? 'Punch In' : 'Punch Out'}</span></div>
                <div className="summary-divider" />
                <div className="summary-item"><span className="label">Date</span><span className="value">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div>
                <div className="summary-divider" />
                <div className="summary-item"><span className="label">Status</span><span className="value" style={{ color: isOnDuty ? '#16a34a' : '#2b1d62' }}>{isOnDuty ? 'On Duty' : 'Off'}</span></div>
              </div>
            )}
            <div className="punch-zone">
              <div className={`punch-outer-ring ${isPunching ? 'spinning' : ''} ${(!isPunchInAllowed && !isOnDuty) ? 'locked' : ''}`}>
                <button
                  className={`new-punch-btn ${isOnDuty ? 'out-state' : 'in-state'} ${(!isPunchInAllowed && !isOnDuty) ? 'locked-state' : ''}`}
                  onClick={handlePunch}
                  disabled={isPunching || (!isPunchInAllowed && !isOnDuty)}
                >
                  <div className="btn-content">
                    {isPunching
                      ? <Loader2 size={32} style={{ animation: 'fhr-spin 1s linear infinite' }} />
                      : (!isPunchInAllowed && !isOnDuty)
                        ? <><span className="main-text" style={{ fontSize: 15 }}>LOCKED</span><span className="sub-text"><Clock size={11} style={{ marginRight: 3 }} />Outside Work Hours</span></>
                        : <><span className="main-text">{isOnDuty ? 'PUNCH OUT' : 'PUNCH IN'}</span>
                          <span className="sub-text">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></>
                    }
                  </div>
                </button>
              </div>

              {/* ── GPS Status Pill ── */}
              {gpsStatus === 'acquiring' && (
                <div className="location-pill gps-acquiring">
                  <Loader2 size={13} style={{ animation: 'fhr-spin 1s linear infinite' }} />
                  <span>Getting GPS location…</span>
                </div>
              )}
              {gpsStatus === 'ready' && gpsCoords && (() => {
                const geo = checkGeofence(gpsCoords.lat, gpsCoords.lng);
                return (
                  <>
                    <div
                      className={`location-pill ${geo?.inside ? 'gps-ready' : 'gps-outside'}`}
                      onClick={fetchGPS}
                      title="Tap to refresh"
                    >
                      <MapPin size={13} />
                      <span>
                        {geo?.inside
                          ? `✓ ${geo.zone.label}`
                          : `Outside campus · ${geo?.zone?.label} ${geo?.distance}m`}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>±{Math.round(gpsCoords.accuracy)}m</span>
                      <RefreshCw size={11} style={{ marginLeft: 4, opacity: 0.6 }} />
                    </div>
                    {!geo?.inside && (
                      <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                        padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', margin: '8px 0'
                      }}>
                        <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Outside Allowed Zone</div>
                          <div style={{ fontSize: 12, color: '#991b1b', marginTop: 2 }}>
                            You must be on campus to record attendance.<br />
                            Nearest: <strong>{geo?.zone?.label}</strong> ({geo?.distance}m away)
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {gpsStatus === 'error' && (
                <div className="location-pill gps-error" onClick={fetchGPS} title="Tap to retry">
                  <AlertCircle size={13} />
                  <span>Location unavailable · Tap to retry</span>
                </div>
              )}
              {(!gpsStatus) && (
                <div className="location-pill" onClick={fetchGPS} style={{ cursor: 'pointer' }}>
                  <MapPin size={13} />
                  <span>Tap to get GPS location</span>
                </div>
              )}
              {punchWindowMsg && !isOnDuty && (
                <div style={{
                  background: isPunchInAllowed ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${isPunchInAllowed ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0'
                }}>
                  <Clock size={14} color={isPunchInAllowed ? '#16a34a' : '#d97706'} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: isPunchInAllowed ? '#15803d' : '#92400e', fontWeight: 500 }}>{punchWindowMsg}</span>
                </div>
              )}
              {todayShift && (
                <div style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4 }}>
                  Today's Shift: <strong style={{ color: '#2b1d62' }}>{todayShift.shift_name || 'Scheduled'}</strong>
                  {' '}{(todayShift.start_time || '').slice(0,5)} – {(todayShift.end_time || '').slice(0,5)}
                </div>
              )}
              {punchErr && <ErrBanner msg={punchErr} />}
              {punchOK && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                  padding: '11px 14px', display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0'
                }}>
                  <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>{punchOK}</span>
                </div>
              )}
            </div>
            <div className="list-header-row">
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#333' }}>Today's Log</h4>
              <button onClick={fetchAtt} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', padding: 4 }}><RefreshCw size={15} /></button>
            </div>
            {attLoading ? <Spinner />
              : attErr ? <ErrBanner msg={attErr} onRetry={fetchAtt} />
                : attHistory.length === 0
                  ? <Empty icon={<ClipboardList size={26} color="#2b1d62" />} title="No Records Yet" sub="Your attendance logs will appear here" />
                  : attHistory.map((log, i) => (
                    <div key={i} className="modern-log-card">
                      <div className={`log-icon ${log.clock_in_time && !log.clock_out_time ? 'in' : 'out'}`}>
                        {log.clock_in_time && !log.clock_out_time ? <LogIn size={17} /> : <LogOut size={17} />}
                      </div>
                      <div className="log-info">
                        <div className="log-row">
                          <span className="log-label-type">{log.clock_in_time && !log.clock_out_time ? 'Punch In' : 'Session'}</span>
                          <span className="log-time-stamp">{log.clock_in_time ? new Date(log.clock_in_time).toLocaleString('en-GB') : '--'}</span>
                        </div>
                        {log.clock_out_time && (
                          <div className="log-row" style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: '#aaa' }}>Out:</span>
                            <span className="log-time-stamp">{new Date(log.clock_out_time).toLocaleString('en-GB')}</span>
                          </div>
                        )}
                        <div className="log-address"><MapPin size={11} style={{ marginRight: 3 }} />
                          {log.clock_in_latitude ? `${Number(log.clock_in_latitude).toFixed(4)}, ${Number(log.clock_in_longitude).toFixed(4)}` : 'Location recorded'}
                        </div>
                      </div>
                    </div>
                  ))
            }
          </div>
        )}

        {/* ── APPLY LEAVE ───────────────────────────────────────────────── */}
        {view === 'applyLeave' && (
          <div className="leave-module">
            {lvOK && <div className="success-banner"><CheckCircle size={17} /><span>Leave submitted successfully!</span></div>}
            {/* ── Pending leave blocker banner ── */}
            {!appsLoad && hasPendingLeave && (
              <div style={{
                background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 12,
                padding: '13px 16px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'flex-start'
              }}>
                <Clock size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Pending Request Active</div>
                  <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                    You already have a pending leave request awaiting approval. You can submit a new request only after your current one has been reviewed.
                  </div>
                  <button
                    onClick={() => goTo('applications')}
                    style={{
                      marginTop: 8, background: '#d97706', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    View My Applications
                  </button>
                </div>
              </div>
            )}
            {/* ── Leave Entitlement Banner (EA 1955) ── */}
            {(() => {
              const empDate = employmentStartDate || userInfo?.employment_start_date;
              const ent = getLeaveEntitlement(empDate);
              const annualUsed  = typeof balance?.annual_leave_used  === 'number' ? balance.annual_leave_used  : (typeof balance?.['Annual Leave'] === 'number' && balance['Annual Leave'] <= ent.annual ? ent.annual - balance['Annual Leave'] : 0);
              const sickUsed    = typeof balance?.sick_leave_used    === 'number' ? balance.sick_leave_used    : (typeof balance?.['Sick Leave']   === 'number' && balance['Sick Leave']   <= ent.sick   ? ent.sick   - balance['Sick Leave']   : 0);
              const annualLeft  = ent.annual - annualUsed;
              const sickLeft    = ent.sick   - sickUsed;
              return (
                <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid #ddd6fe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6c47d9', letterSpacing: 0.5 }}>LEAVE ENTITLEMENT (EA 1955)</span>
                    <span style={{ fontSize: 11, background: '#ede9fe', color: '#6c47d9', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      {ent.years}yr{ent.years !== 1 ? 's' : ''} service
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e9d5ff' }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>ANNUAL LEAVE</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: annualLeft > 0 ? '#16a34a' : '#dc2626' }}>{Math.max(0, annualLeft)}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>/ {ent.annual} days left</span>
                      </div>
                      {annualUsed > 0 && <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>{annualUsed} days used</div>}
                    </div>
                    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e9d5ff' }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>SICK LEAVE</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: sickLeft > 0 ? '#0ea5e9' : '#dc2626' }}>{Math.max(0, sickLeft)}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>/ {ent.sick} days left</span>
                      </div>
                      {sickUsed > 0 && <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>{sickUsed} days used</div>}
                    </div>
                  </div>
                  {!empDate && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 8 }}>⚠ Employment start date not set. Showing minimum entitlement.</div>}
                </div>
              );
            })()}
            <div className="leave-form-card">
              <div className="form-section-title">Leave Details</div>
              <div className="input-group">
                <label>Applicant</label>
                <div className="readonly-input"><User size={13} style={{ marginRight: 6, color: '#aaa' }} />{userName}</div>
              </div>
              <div className="input-group">
                <label>Leave Type *</label>
                <div className="select-wrap">
                  <select className="form-select" value={lvForm.leaveType} onChange={e => setLvForm(f => ({ ...f, leaveType: e.target.value }))}>
                    {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={15} className="select-arrow" />
                </div>
              </div>
              <div className="date-selection-container">
                <div className="date-field" onClick={() => openCal('from', 'leave')}>
                  <label>From *</label>
                  <div className={`date-display-box ${lvForm.fromDate ? 'has-val' : ''}`}><Calendar size={14} /><span>{fmt(lvForm.fromDate)}</span></div>
                </div>
                <div className="date-field" onClick={() => openCal('to', 'leave')}>
                  <label>To *</label>
                  <div className={`date-display-box ${lvForm.toDate ? 'has-val' : ''}`}><Calendar size={14} /><span>{fmt(lvForm.toDate)}</span></div>
                </div>
              </div>
              {duration > 0 && (
                <div className="duration-info-bar"><Info size={14} /><span>Total: <strong>{duration} Day{duration > 1 ? 's' : ''}</strong></span></div>
              )}
              <div className="input-group">
                <label>Reason *</label>
                <textarea className="form-textarea" rows={3} placeholder="Please state your reason…"
                  value={lvForm.reason} onChange={e => setLvForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="applied-on-badge"><Clock size={11} /><span>Applied on: {fmt(new Date())}</span></div>
              {lvErr && <ErrBanner msg={lvErr} />}
              <button
                className={`submit-btn ${(!lvForm.fromDate || !lvForm.toDate || !lvForm.reason.trim() || lvLoad || (!appsLoad && hasPendingLeave)) ? 'disabled' : ''}`}
                onClick={submitLeave}
                disabled={lvLoad || (!appsLoad && hasPendingLeave)}
              >
                {lvLoad ? <><Loader2 size={15} style={{ animation: 'fhr-spin 1s linear infinite', marginRight: 7 }} />Submitting…</>
                  : (!appsLoad && hasPendingLeave)
                    ? <><Clock size={15} style={{ marginRight: 7 }} />Pending Request Exists</>
                    : <><Send size={15} style={{ marginRight: 7 }} />Submit Application</>}
              </button>
            </div>
          </div>
        )}

        {/* ── OVERTIME ──────────────────────────────────────────────────── */}
        {view === 'applyOT' && (
          <div className="leave-module">
            {otOK && <div className="success-banner"><CheckCircle size={17} /><span>Overtime request submitted!</span></div>}
            <div className="leave-form-card">
              <div className="form-section-title">Overtime Request</div>
              <div className="input-group">
                <label>Applicant</label>
                <div className="readonly-input"><User size={13} style={{ marginRight: 6, color: '#aaa' }} />{userName}</div>
              </div>
              <div className="input-group">
                <label>Work Date *</label>
                <div className={`date-display-box ${otForm.workDate ? 'has-val' : ''}`}
                  style={{ cursor: 'pointer', marginTop: 4 }} onClick={() => openCal('date', 'ot')}>
                  <Calendar size={14} /><span>{fmt(otForm.workDate)}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Overtime Hours *</label>
                <div className="ot-hours-row">
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <button key={h} className={`hour-chip ${parseFloat(otForm.hours) === h ? 'selected' : ''}`}
                      onClick={() => setOtForm(f => ({ ...f, hours: String(h) }))}>
                      {h}h
                    </button>
                  ))}
                </div>
                <input type="number" className="form-select" style={{ marginTop: 8 }} placeholder="Custom hours (e.g. 1.5)"
                  min="0.5" max="12" step="0.5" value={otForm.hours}
                  onChange={e => setOtForm(f => ({ ...f, hours: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Reason *</label>
                <textarea className="form-textarea" rows={3} placeholder="Describe the overtime work…"
                  value={otForm.reason} onChange={e => setOtForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              {otErr && <ErrBanner msg={otErr} />}
              <button className={`submit-btn ${(!otForm.workDate || !otForm.hours || !otForm.reason.trim() || otLoad) ? 'disabled' : ''}`}
                onClick={submitOT} disabled={otLoad}>
                {otLoad ? <><Loader2 size={15} style={{ animation: 'fhr-spin 1s linear infinite', marginRight: 7 }} />Submitting…</>
                  : <><Send size={15} style={{ marginRight: 7 }} />Submit OT Request</>}
              </button>
            </div>
          </div>
        )}

        {/* ── MY APPLICATIONS ───────────────────────────────────────────── */}
        {view === 'applications' && (
          <div className="review-module">
            <div className="review-header">
              <h3 className="module-title">My Applications</h3>
              <p className="module-subtitle">Track your submitted requests</p>
            </div>
            <div className="app-tabs">
              {['All', 'Pending', 'Approved', 'Rejected'].map(tab => {
                const cnt = tab === 'All' ? apps.length : apps.filter(a => (a.status_code || a.status || '').toLowerCase() === tab.toLowerCase()).length;
                return (
                  <button key={tab} className={`app-tab ${appsTab === tab ? 'active' : ''}`} onClick={() => setAppsTab(tab)}>
                    {tab}{cnt > 0 && <span className="tab-count">{cnt}</span>}
                  </button>
                );
              })}
            </div>
            {appsLoad ? <Spinner />
              : appsErr ? <ErrBanner msg={appsErr} onRetry={fetchApps} />
                : filteredApps.length === 0
                  ? <Empty icon={<FileText size={26} color="#2b1d62" />} title="No Applications" sub="Your requests will appear here" />
                  : (
                    <div className="review-list">
                      {filteredApps.map((app, i) => {
                        const si = getStatusInfo(app.status_code || app.status);
                        const isPend = (app.status_code || app.status || '').toLowerCase() === 'pending';
                        return (
                          <div key={app.leave_id || i} className="review-card" onClick={() => setSelApp(app)}>
                            <div className="review-card-body">
                              <div className="task-icon-box"><Umbrella size={19} color="#2b1d62" /></div>
                              <div className="task-details">
                                <div className="task-top">
                                  <span className="task-type-tag">Leave</span>
                                  <span className="task-date">{app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB') : '--'}</span>
                                </div>
                                <span className="task-title-text">{app.leave_type_name || app.leave_type || 'Leave'}</span>
                                <span style={{ fontSize: 11, color: '#aaa' }}>
                                  {app.start_date ? fmt(new Date(app.start_date)) : '--'} → {app.end_date ? fmt(new Date(app.end_date)) : '--'}
                                  {app.total_days ? ` · ${app.total_days}d` : ''}
                                </span>
                              </div>
                              <ChevronRight size={15} color="#ddd" />
                            </div>
                            <div className="review-card-footer" style={{ background: si.bg, borderTop: `1px solid ${si.color}25` }}>
                              <span className="status-label" style={{ color: si.color }}>{si.icon} {si.label}</span>
                              {isPend && (
                                <button className="cancel-mini-btn"
                                  onClick={e => { e.stopPropagation(); cancelApp(app); }}
                                  disabled={cancelId === app.leave_id}>
                                  {cancelId === app.leave_id ? <Loader2 size={11} style={{ animation: 'fhr-spin 1s linear infinite' }} /> : <Ban size={11} />}
                                  {' '}Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
            }
          </div>
        )}

        {/* \u2500\u2500 USER MANAGEMENT (HR only) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {view === 'userAdmin' && isHR && (
          <div className="review-module">
          {umOK && (<div className="success-banner" style={{ marginBottom: 12 }}><CheckCircle size={16} /><span>{umOK}</span></div>)}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className={`app-tab ${umSubView === 'list' ? 'active' : ''}`} onClick={() => setUmSubView('list')} style={{ flex: 1 }}>All Users</button>
            <button className={`app-tab ${umSubView === 'register' ? 'active' : ''}`} onClick={() => { setRegForm(initRegForm); setRegErr(''); setUmSubView('register'); }} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}><UserPlus size={14} /> Register</button>
          </div>
          {umSubView === 'list' && (<>
            <div className="list-header-row"><h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#333' }}>System Users</h4><button onClick={fetchUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', padding: 4 }}><RefreshCw size={15} /></button></div>
            {umErr && <ErrBanner msg={umErr} onRetry={fetchUsers} />}
            {umLoad ? <Spinner /> : umUsers.filter(u => u.email && u.email !== 'undefined').length === 0
              ? <Empty icon={<User size={26} color="#2b1d62" />} title="No users found" sub="Register the first user above" />
              : umUsers.filter(u => u.email && u.email !== 'undefined').map((u, i) => {
                  const rc = { admin: '#6c47d9', hr: '#1890ff', staff: '#10b981' }[u.role] || '#9ca3af';
                  return (
                    <div key={u.user_id || i} className="review-card" style={{ overflow: 'hidden' }}>
                      <div className="review-card-body" style={{ cursor: 'pointer' }} onClick={() => openEdit(u)}>
                        <div className="task-icon-box" style={{ background: rc + '18' }}><User size={19} color={rc} /></div>
                        <div className="task-details">
                          <div className="task-top">
                            <span className="task-type-tag" style={{ background: rc + '18', color: rc }}>{u.role || 'staff'}</span>
                            <span className="task-date" style={{ color: u.is_active !== false ? '#16a34a' : '#dc2626' }}>{u.is_active !== false ? 'Active' : 'Inactive'}</span>
                          </div>
                          <span className="task-title-text">{u.name || u.email}</span>
                          <span style={{ fontSize: 11, color: '#aaa' }}>{u.email}</span>
                        </div>
                        <Edit3 size={15} color="#ccc" style={{ marginRight: 6 }} />
                      </div>
                      <div style={{ borderTop: '1px solid #f0f0f4', padding: '5px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={e => { e.stopPropagation(); deleteUser(u); }} disabled={deleteId === u.email}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '2px 8px', borderRadius: 6, opacity: deleteId === u.email ? 0.5 : 1 }}>
                          {deleteId === u.email ? <Loader2 size={12} style={{ animation: 'fhr-spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                          Delete Account
                        </button>
                      </div>
                    </div>
                  );
                })
            }
          </>)}
          {umSubView === 'register' && (<div className="leave-form-card">
            <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={16} color="#2b1d62" /> Register New User</div>
            {regErr && <ErrBanner msg={regErr} />}
            <div className="input-group"><label>Full Name *</label><input className="form-select" placeholder="e.g. Ahmad Bin Ali" value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="input-group"><label>Email *</label><input className="form-select" type="email" placeholder="user@chinhin.com" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="input-group"><label>Password *</label><input className="form-select" type="password" placeholder="Min 6 characters" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className="input-group"><label>Role *</label><div className="select-wrap"><select className="form-select" value={regForm.role} onChange={e => setRegForm(f => ({ ...f, role: e.target.value }))}>{ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select><ChevronDown size={15} className="select-arrow" /></div></div>
            <button className={`submit-btn ${(!regForm.name || !regForm.email || !regForm.password || regLoad) ? 'disabled' : ''}`} onClick={submitRegister} disabled={regLoad}>{regLoad ? <><Loader2 size={15} style={{ animation: 'fhr-spin 1s linear infinite', marginRight: 7 }} />Creating\u2026</> : <><UserPlus size={15} style={{ marginRight: 7 }} />Create Account</>}</button>
          </div>)}
          {umSubView === 'edit' && umEditTarget && (<div className="leave-form-card">
            <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 size={16} color="#2b1d62" /> Edit User</div>
            {editErr && <ErrBanner msg={editErr} />}
            <div className="input-group"><label>Full Name</label><input className="form-select" placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="input-group"><label>Email</label><input className="form-select" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="input-group"><label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><KeyRound size={13} /> New Password <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>(blank = keep current)</span></label><input className="form-select" type="password" placeholder="Leave blank to keep unchanged" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className="input-group"><label>Role</label><div className="select-wrap"><select className="form-select" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>{ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select><ChevronDown size={15} className="select-arrow" /></div></div>
            <div className="input-group"><label>Account Status</label><button onClick={() => setEditForm(f => ({ ...f, is_active: !f.is_active }))} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', fontSize: 14, color: editForm.is_active ? '#16a34a' : '#dc2626' }}>{editForm.is_active ? <><ToggleRight size={24} color="#16a34a" /> Active</> : <><ToggleLeft size={24} color="#dc2626" /> Inactive</>}</button></div>
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13} color="#2b1d62" /> Employment Start Date</label>
              <input className="form-select" type="date" value={editForm.employment_start_date} onChange={e => setEditForm(f => ({ ...f, employment_start_date: e.target.value }))} />
              {editForm.employment_start_date && (() => {
                const ent = getLeaveEntitlement(editForm.employment_start_date);
                return <span style={{ fontSize: 11, color: '#6c47d9', marginTop: 3, fontWeight: 600 }}>→ {ent.years}yr service: Annual {ent.annual}d · Sick {ent.sick}d</span>;
              })()}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="submit-btn" style={{ flex: 1, background: '#fef2f2', color: '#dc2626', boxShadow: 'none' }}
                onClick={() => deleteUser(umEditTarget)} disabled={deleteId === umEditTarget?.email}>
                {deleteId === umEditTarget?.email ? <Loader2 size={14} style={{ animation: 'fhr-spin 1s linear infinite' }} /> : <Trash2 size={14} style={{ marginRight: 4 }} />}Delete
              </button>
              <button className="submit-btn" style={{ flex: 1, background: '#f4f1fb', color: '#2b1d62', boxShadow: 'none' }} onClick={() => setUmSubView('list')}>Cancel</button>
              <button className={`submit-btn ${editLoad ? 'disabled' : ''}`} style={{ flex: 2 }} onClick={submitEdit} disabled={editLoad}>{editLoad ? <><Loader2 size={15} style={{ animation: 'fhr-spin 1s linear infinite', marginRight: 7 }} />Saving\u2026</> : <><CheckCircle size={15} style={{ marginRight: 7 }} />Save Changes</>}</button>
            </div>
          </div>)}
        </div>
      )}

        {/* ── MY TIMETABLE ──────────────────────────────────────────────── */}
        {view === 'timetable' && (() => {
          const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const DAYS_HDR = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
          const STATUS_STYLE = {
            on_time:   { bg:'#f0fdf4', border:'#16a34a', dot:'#16a34a', label:'On Time' },
            late:      { bg:'#fef2f2', border:'#dc2626', dot:'#dc2626', label:'Late' },
            absent:    { bg:'#eff6ff', border:'#3b82f6', dot:'#3b82f6', label:'Absent' },
            scheduled: { bg:'#faf5ff', border:'#a78bfa', dot:'#a78bfa', label:'Scheduled' },
            rest_day:  { bg:'#f9fafb', border:'#d1d5db', dot:'#d1d5db', label:'Rest Day' },
          };
          const { days, start } = getMonthRange(ttMonth.year, ttMonth.month);
          const firstDow = (new Date(ttMonth.year, ttMonth.month, 1).getDay() + 6) % 7; // 0=Mon
          const dayMap = {};
          ttData.forEach(d => { if (d.work_date) dayMap[d.work_date.slice(0, 10)] = d; });
          const todayStr = new Date().toISOString().slice(0, 10);
          const padDays = Array(firstDow).fill(null);
          const allCells = [...padDays, ...Array.from({ length: days }, (_, i) => i + 1)];
          while (allCells.length % 7 !== 0) allCells.push(null);
          const prevM = () => setTtMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 });
          const nextM = () => setTtMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 });
          return (
            <div className="review-module">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={prevM} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', padding: 6 }}>‹</button>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2b1d62' }}>{MONTHS[ttMonth.month]} {ttMonth.year}</span>
                <button onClick={nextM} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', padding: 6 }}>›</button>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                {DAYS_HDR.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa' }}>{d}</div>)}
              </div>
              {ttLoad ? <Spinner /> : ttErr ? <ErrBanner msg={ttErr} onRetry={fetchMyTT} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {allCells.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} />;
                    const p = n => String(n).padStart(2, '0');
                    const dateStr = `${ttMonth.year}-${p(ttMonth.month + 1)}-${p(day)}`;
                    const entry = dayMap[dateStr];
                    const st = entry?.punch_status || null;
                    const ss = STATUS_STYLE[st] || {};
                    const isToday = dateStr === todayStr;
                    return (
                      <div key={dateStr} onClick={() => entry && setTtDetail(entry)}
                        style={{ border: `2px solid ${isToday ? '#2b1d62' : ss.border || '#e5e7eb'}`, borderRadius: 8, minHeight: 44, padding: '4px 2px', background: ss.bg || '#fff', cursor: entry ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? '#2b1d62' : '#333' }}>{day}</span>
                        {st && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ss.dot }} />}
                        {entry?.is_ot && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
                {Object.entries(STATUS_STYLE).map(([k, s]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot }} />
                    {s.label}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />OT
                </div>
              </div>
              {ttDetail && (
                <div className="cal-overlay" onClick={() => setTtDetail(null)}>
                  <div className="cal-modal" onClick={e => e.stopPropagation()}>
                    <div className="cal-header">
                      <span className="cal-title">{ttDetail.work_date}</span>
                      <button onClick={() => setTtDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div className="detail-row"><label>Shift</label><span>{ttDetail.shift_name || '--'}</span></div>
                      <div className="detail-row"><label>Work Hours</label><span>{ttDetail.start_time?.slice(0,5)} – {ttDetail.end_time?.slice(0,5)}</span></div>
                      <div className="detail-row"><label>Status</label>
                        <span style={{ fontWeight: 700, color: {on_time:'#16a34a',late:'#dc2626',absent:'#3b82f6',scheduled:'#7c3aed',rest_day:'#9ca3af'}[ttDetail.punch_status] || '#333' }}>
                          {({on_time:'✅ On Time',late:'🔴 Late',absent:'🔵 Absent',scheduled:'📅 Scheduled',rest_day:'⚪ Rest Day'})[ttDetail.punch_status] || '--'}
                        </span>
                      </div>
                      {ttDetail.clock_in_time && <div className="detail-row"><label>Clock In</label><span>{new Date(ttDetail.clock_in_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span></div>}
                      {ttDetail.clock_out_time && <div className="detail-row"><label>Clock Out</label><span>{new Date(ttDetail.clock_out_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span></div>}
                      {ttDetail.is_ot && <div className="detail-row"><label>OT</label><span style={{ color:'#f59e0b', fontWeight:700 }}>🟡 {ttDetail.ot_hours}h overtime</span></div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── MANAGE TIMETABLE (HR only) ─────────────────────────────────── */}
        {view === 'manageTT' && isHR && (() => {
          const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const DAYS_HDR = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
          const STATUS_DOT = { on_time:'#16a34a', late:'#dc2626', absent:'#3b82f6', scheduled:'#a78bfa', rest_day:'#d1d5db' };
          const { days } = getMonthRange(mttMonth.year, mttMonth.month);
          const firstDow = (new Date(mttMonth.year, mttMonth.month, 1).getDay() + 6) % 7;
          const allEmployees = umUsers.filter(u => u.email && u.email !== 'undefined');
          // Build day map for selected employee
          const selEmpData = mttSelEmp ? mttAllData.filter(d => String(d.employee_id) === String(mttSelEmp)) : mttAllData;
          const dayMap = {};
          selEmpData.forEach(d => {
            if (!d.work_date) return;
            const dk = d.work_date.slice(0, 10);
            if (!dayMap[dk]) dayMap[dk] = [];
            dayMap[dk].push(d);
          });
          const padDays = Array(firstDow).fill(null);
          const allCells = [...padDays, ...Array.from({ length: days }, (_, i) => i + 1)];
          while (allCells.length % 7 !== 0) allCells.push(null);
          const prevM = () => setMttMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 });
          const nextM = () => setMttMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 });
          return (
            <div className="review-module">
              {mttOK && <div className="success-banner" style={{ marginBottom: 10 }}><CheckCircle size={14} /><span>{mttOK}</span></div>}
              {mttErr && <ErrBanner msg={mttErr} />}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <button className={`app-tab ${mttSubView === 'calendar' ? 'active' : ''}`} onClick={() => setMttSubView('calendar')} style={{ flex: 1 }}>Calendar</button>
                <button className={`app-tab ${mttSubView === 'assign' ? 'active' : ''}`} onClick={() => setMttSubView('assign')} style={{ flex: 1 }}>Assign Shift</button>
                <button className={`app-tab ${mttSubView === 'createShift' ? 'active' : ''}`} onClick={() => setMttSubView('createShift')} style={{ flex: 1 }}>New Shift</button>
              </div>

              {mttSubView === 'calendar' && (<>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <button onClick={prevM} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', padding: 6 }}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#2b1d62' }}>{MONTHS[mttMonth.month]} {mttMonth.year}</span>
                  <button onClick={nextM} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', padding: 6 }}>›</button>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <select className="form-select" value={mttSelEmp} onChange={e => setMttSelEmp(e.target.value)}>
                    <option value="">All Employees</option>
                    {allEmployees.map(u => <option key={u.user_id} value={u.user_id}>{u.name || u.email}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', marginBottom: 4 }}>
                  {DAYS_HDR.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#aaa' }}>{d}</div>)}
                </div>
                {mttLoad ? <Spinner /> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {allCells.map((day, idx) => {
                      if (!day) return <div key={`e-${idx}`} />;
                      const p = n => String(n).padStart(2, '0');
                      const dateStr = `${mttMonth.year}-${p(mttMonth.month + 1)}-${p(day)}`;
                      const entries = dayMap[dateStr] || [];
                      const dots = [...new Set(entries.map(e => e.punch_status))].slice(0, 3);
                      const hasData = entries.length > 0;
                      return (
                        <div key={dateStr}
                          onClick={() => hasData && setMttDetail({ dateStr, entries })}
                          style={{ border: `1px solid ${hasData ? '#a78bfa' : '#e5e7eb'}`, borderRadius: 8, minHeight: 44, padding: '4px 2px', background: hasData ? '#faf5ff' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: hasData ? 'pointer' : 'default' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{day}</span>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {dots.map((s, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[s] || '#ccc' }} />)}
                            {entries.length > 3 && <span style={{ fontSize: 9, color: '#aaa' }}>+{entries.length - 3}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button onClick={fetchAllTT} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b1d62', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}><RefreshCw size={13} /> Refresh</button>
                </div>
                {/* Day detail popup */}
                {mttDetail && (
                  <div className="cal-overlay" onClick={() => setMttDetail(null)}>
                    <div className="cal-modal" onClick={e => e.stopPropagation()}>
                      <div className="cal-header">
                        <span className="cal-title">{mttDetail.dateStr}</span>
                        <button onClick={() => setMttDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}><X size={18} /></button>
                      </div>
                      <div style={{ padding: '14px 16px', maxHeight: '60vh', overflowY: 'auto' }}>
                        {mttDetail.entries.map((en, i) => {
                          const statusColor = { on_time: '#16a34a', late: '#dc2626', absent: '#3b82f6', scheduled: '#7c3aed', rest_day: '#9ca3af' }[en.punch_status] || '#333';
                          const statusLabel = { on_time: '✅ On Time', late: '🔴 Late', absent: '🔵 Absent', scheduled: '📅 Scheduled', rest_day: '⚪ Rest Day' }[en.punch_status] || '--';
                          return (
                            <div key={i} style={{ borderBottom: i < mttDetail.entries.length - 1 ? '1px solid #f0f0f4' : 'none', paddingBottom: 10, marginBottom: 10 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#2b1d62', marginBottom: 4 }}>{en.employee_name || en.email}</div>
                              <div className="detail-row"><label>Shift</label><span>{en.shift_name || '--'}</span></div>
                              <div className="detail-row"><label>Work Hours</label><span>{en.start_time?.slice(0,5)} – {en.end_time?.slice(0,5)}</span></div>
                              <div className="detail-row"><label>Status</label><span style={{ fontWeight: 700, color: statusColor }}>{statusLabel}</span></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>)}

              {mttSubView === 'assign' && (
                <div className="leave-form-card">
                  <div className="form-section-title"><CalendarDays size={15} color="#2b1d62" style={{ marginRight: 6 }} />Assign Shift</div>
                  <div className="input-group"><label>Employee *</label>
                    <div className="select-wrap">
                      <select className="form-select" value={mttAssign.targetEmpId} onChange={e => setMttAssign(f => ({ ...f, targetEmpId: e.target.value }))}>
                        <option value="">Select employee…</option>
                        {allEmployees.map(u => <option key={u.user_id} value={u.user_id}>{u.name || u.email}</option>)}
                      </select>
                      <ChevronDown size={15} className="select-arrow" />
                    </div>
                  </div>
                  <div className="input-group"><label>Shift *</label>
                    <div className="select-wrap">
                      <select className="form-select" value={mttAssign.shiftId} onChange={e => setMttAssign(f => ({ ...f, shiftId: e.target.value }))}>
                        <option value="">Select shift…</option>
                        {mttShifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)})</option>)}
                      </select>
                      <ChevronDown size={15} className="select-arrow" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="input-group" style={{ flex: 1 }}><label>From *</label><input className="form-select" type="date" value={mttAssign.startDate} onChange={e => setMttAssign(f => ({ ...f, startDate: e.target.value }))} /></div>
                    <div className="input-group" style={{ flex: 1 }}><label>To *</label><input className="form-select" type="date" value={mttAssign.endDate} onChange={e => setMttAssign(f => ({ ...f, endDate: e.target.value }))} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, margin: '8px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={mttAssign.weekdaysOnly} onChange={e => setMttAssign(f => ({ ...f, weekdaysOnly: e.target.checked }))} />
                      Weekdays only (skip Sat/Sun)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={mttAssign.isOff} onChange={e => setMttAssign(f => ({ ...f, isOff: e.target.checked }))} />
                      Mark as Rest Day
                    </label>
                  </div>
                  <button className={`submit-btn ${mttAssignLoad ? 'disabled' : ''}`} onClick={submitAssignTT} disabled={mttAssignLoad}>
                    {mttAssignLoad ? <><Loader2 size={14} style={{ animation: 'fhr-spin 1s linear infinite', marginRight: 7 }} />Assigning…</> : <><CheckCircle size={14} style={{ marginRight: 7 }} />Assign Shift</>}
                  </button>
                </div>
              )}

              {mttSubView === 'createShift' && (
                <div className="leave-form-card">
                  <div className="form-section-title"><CalendarDays size={15} color="#2b1d62" style={{ marginRight: 6 }} />Create New Shift</div>
                  <div className="input-group"><label>Shift Name *</label><input className="form-select" placeholder="e.g. Standard 8AM-5PM" value={newShift.shift_name} onChange={e => setNewShift(f => ({ ...f, shift_name: e.target.value }))} /></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="input-group" style={{ flex: 1 }}><label>Start Time *</label><input className="form-select" type="time" value={newShift.start_time} onChange={e => setNewShift(f => ({ ...f, start_time: e.target.value }))} /></div>
                    <div className="input-group" style={{ flex: 1 }}><label>End Time *</label><input className="form-select" type="time" value={newShift.end_time} onChange={e => setNewShift(f => ({ ...f, end_time: e.target.value }))} /></div>
                  </div>
                  <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6c47d9', marginBottom: 10 }}>
                    Preview: {newShift.start_time} – {newShift.end_time} ({newShift.shift_name || 'Unnamed'})
                  </div>
                  <button className={`submit-btn ${newShiftLoad ? 'disabled' : ''}`} onClick={submitNewShift} disabled={newShiftLoad}>
                    {newShiftLoad ? <><Loader2 size={14} style={{ animation: 'fhr-spin 1s linear infinite', marginRight: 7 }} />Creating…</> : <><CheckCircle size={14} style={{ marginRight: 7 }} />Create Shift</>}
                  </button>
                  {mttShifts.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6 }}>EXISTING SHIFTS</div>
                      {mttShifts.map(s => (
                        <div key={s.shift_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f4', fontSize: 13, color: '#333' }}>
                          <span>{s.shift_name}</span>
                          <span style={{ color: '#888' }}>{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── ATTENDANCE REPORT (HR only) ───────────────────────────────────── */}
        {view === 'attendanceReport' && isHR && (() => {
          // Summary stats computed from fetched data
          const totalSessions  = arData.length;
          const onTimeCnt = arData.filter(r => (r.punch_status||'').toLowerCase() === 'on_time').length;
          const lateCnt   = arData.filter(r => (r.punch_status||'').toLowerCase() === 'late').length;
          const absentCnt = arData.filter(r => (r.punch_status||'').toLowerCase() === 'absent').length;
          const STATUS_COLOR = { on_time:'#16a34a', late:'#dc2626', absent:'#3b82f6', scheduled:'#7c3aed', rest_day:'#9ca3af' };
          const STATUS_BG    = { on_time:'#f0fdf4', late:'#fef2f2', absent:'#eff6ff', scheduled:'#faf5ff', rest_day:'#f9fafb' };
          const STATUS_LABEL = { on_time:'On Time', late:'Late', absent:'Absent', scheduled:'Scheduled', rest_day:'Rest Day' };
          return (
            <div className="review-module">
              {/* ── Filters ── */}
              <div className="leave-form-card" style={{ marginBottom: 14 }}>
                <div className="form-section-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <BarChart2 size={16} color="#2b1d62" /> Attendance Log Export
                </div>
                <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                  <div className="input-group" style={{ flex:1, marginBottom:0 }}>
                    <label>From *</label>
                    <input className="form-select" type="date" value={arFrom}
                      onChange={e => setArFrom(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ flex:1, marginBottom:0 }}>
                    <label>To *</label>
                    <input className="form-select" type="date" value={arTo}
                      onChange={e => setArTo(e.target.value)} />
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom:12 }}>
                  <label>Employee (leave blank for all)</label>
                  <div className="select-wrap">
                    <select className="form-select" value={arEmp} onChange={e => setArEmp(e.target.value)}>
                      <option value="">All Employees</option>
                      {umUsers.filter(u => u.email && u.email !== 'undefined').map(u => (
                        <option key={u.user_id || u.email} value={u.email}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="select-arrow" />
                  </div>
                </div>
                {arErr && <ErrBanner msg={arErr} />}
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    className={`submit-btn ${arLoad ? 'disabled' : ''}`}
                    onClick={fetchAttReport}
                    disabled={arLoad}
                    style={{ flex:2 }}
                  >
                    {arLoad
                      ? <><Loader2 size={15} style={{ animation:'fhr-spin 1s linear infinite', marginRight:7 }} />Loading…</>
                      : <><RefreshCw size={15} style={{ marginRight:7 }} />Generate Report</>}
                  </button>
                  {arFetched && arData.length > 0 && (
                    <button
                      className="submit-btn"
                      onClick={exportAttCSV}
                      style={{ flex:1, background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 4px 14px rgba(16,185,129,0.35)' }}
                    >
                      <Download size={15} style={{ marginRight:7 }} />CSV
                    </button>
                  )}
                </div>
              </div>

              {/* ── Summary Cards ── */}
              {arFetched && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14 }}>
                  {[
                    { label:'Total Sessions', value:totalSessions, color:'#2b1d62', bg:'#f5f3ff' },
                    { label:'On Time',         value:onTimeCnt,    color:'#16a34a', bg:'#f0fdf4' },
                    { label:'Late',            value:lateCnt,      color:'#dc2626', bg:'#fef2f2' },
                    { label:'Absent',          value:absentCnt,    color:'#3b82f6', bg:'#eff6ff' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ background:bg, borderRadius:12, padding:'12px 14px', border:`1.5px solid ${color}30` }}>
                      <div style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:4 }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Records Table / List ── */}
              {arLoad ? <Spinner /> : arFetched && arData.length === 0
                ? <Empty icon={<BarChart2 size={26} color="#aaa" />} title="No records found" sub="Try adjusting the date range or employee filter" />
                : arFetched && (
                  <div>
                    <div className="list-header-row" style={{ marginBottom:8 }}>
                      <h4 style={{ margin:0, fontSize:14, fontWeight:700, color:'#333' }}>
                        {arData.length} record{arData.length !== 1 ? 's' : ''}
                        {arEmp ? ` · ${umUsers.find(u => u.email === arEmp)?.name || arEmp}` : ' · All Employees'}
                      </h4>
                      <button onClick={exportAttCSV}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#10b981', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700 }}>
                        <Download size={14} /> Export CSV
                      </button>
                    </div>
                    {arData.map((r, i) => {
                      const clockIn  = r.clock_in_time  ? new Date(r.clock_in_time)  : null;
                      const clockOut = r.clock_out_time ? new Date(r.clock_out_time) : null;
                      const durationHrs = (clockIn && clockOut)
                        ? ((clockOut - clockIn) / 3600000).toFixed(1)
                        : null;
                      const ps  = (r.punch_status || '').toLowerCase();
                      const col = STATUS_COLOR[ps] || '#888';
                      const bg  = STATUS_BG[ps]    || '#fafafa';
                      const lbl = STATUS_LABEL[ps]  || (r.punch_status || '--');
                      return (
                        <div key={r.attendance_id || i} style={{
                          background:'#fff', borderRadius:12, marginBottom:8,
                          border:'1px solid #eee', overflow:'hidden'
                        }}>
                          <div style={{ height:3, background:col }} />
                          <div style={{ padding:'11px 14px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <div>
                                <div style={{ fontWeight:700, fontSize:13, color:'#2b1d62' }}>
                                  {r.employee_name || r.user_name || '--'}
                                </div>
                                <div style={{ fontSize:11, color:'#aaa' }}>{r.employee_email || r.user_email || ''}</div>
                              </div>
                              <span style={{ fontSize:11, fontWeight:700, color:col, background:bg, borderRadius:20, padding:'3px 10px' }}>
                                {lbl}
                              </span>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                              <div>
                                <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>DATE</div>
                                <div style={{ fontSize:12, fontWeight:600, color:'#333' }}>
                                  {clockIn ? clockIn.toLocaleDateString('en-GB') : (r.work_date?.slice(0,10) || '--')}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>DURATION</div>
                                <div style={{ fontSize:12, fontWeight:600, color: durationHrs ? '#2b1d62' : '#aaa' }}>
                                  {durationHrs ? `${durationHrs} hrs` : '--'}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>CLOCK IN</div>
                                <div style={{ fontSize:12, color:'#333' }}>
                                  {clockIn ? clockIn.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '--'}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>CLOCK OUT</div>
                                <div style={{ fontSize:12, color:'#333' }}>
                                  {clockOut ? clockOut.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '--'}
                                </div>
                              </div>
                              {(r.location_name || r.clock_in_location) && (
                                <div style={{ gridColumn:'1 / -1' }}>
                                  <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>LOCATION</div>
                                  <div style={{ fontSize:12, color:'#555', display:'flex', alignItems:'center', gap:4 }}>
                                    <MapPin size={11} color="#aaa" />
                                    {r.location_name || r.clock_in_location}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          );
        })()}

        {/* ── REQUEST CENTER (HR only) ──────────────────────────────────────── */}
        {view === 'requestCenter' && isHR && (() => {
          const RC_TABS = [
            { id: 'leaves',   label: 'Leaves',   Icon: Umbrella,   count: rcPendingLeaves },
            { id: 'claims',   label: 'Claims',   Icon: CreditCard, count: rcPendingClaims },
            { id: 'tickets',  label: 'Tickets',  Icon: Ticket,     count: rcPendingTickets },
            { id: 'visitors', label: 'Visitors', Icon: Users,      count: rcPendingVisitors },
          ];
          const rcStatusBadge = (s) => {
            const l = String(s || '').toLowerCase();
            const color = l.includes('approve') ? '#16a34a' : l.includes('reject') ? '#dc2626' : '#d97706';
            const bg    = l.includes('approve') ? '#f0fdf4' : l.includes('reject') ? '#fef2f2' : '#fffbeb';
            return <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 20, padding: '2px 9px' }}>{s || 'Pending'}</span>;
          };
          const rcItems = rcTab === 'claims' ? rcClaims : rcTab === 'tickets' ? rcTickets : rcTab === 'visitors' ? rcVisitors : rcLeaves;

          const renderCard = (kind, item) => {
            const id = kind === 'claims' ? (item.claim_id ?? item.id) : kind === 'tickets' ? (item.id ?? item.ticket_id) : kind === 'leaves' ? item.leave_id : item.appointment_id;
            const rawStatus = kind === 'claims' ? (item.status ?? item.status_code) : kind === 'leaves' ? (item.status_code || item.status) : item.status;
            const st = rcStatusClass(rawStatus);
            const la = rcActionId === `${kind}-${id}-approve`;
            const lr = rcActionId === `${kind}-${id}-reject`;
            return (
              <div key={`rc-${kind}-${id}`} onClick={() => setRcDetail({ kind, item })}
                style={{ background: '#fff', borderRadius: 14, marginBottom: 10, border: '1px solid #eee', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 3, background: st === 'approved' ? '#16a34a' : st === 'rejected' ? '#dc2626' : st === 'cancelled' ? '#d97706' : '#6c47d9' }} />
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}><Hash size={11} />{id ?? '—'}</span>
                    {rcStatusBadge(rawStatus)}
                  </div>
                  {kind === 'leaves' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>EMPLOYEE</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2b1d62' }}>{item.employee_name || item.user_name || '—'}</div>
                      </div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>LEAVE TYPE</div><div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.leave_type_name || item.leave_type || '—'}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>DURATION</div><div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.total_days ?? '—'} day{item.total_days !== 1 ? 's' : ''}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>FROM</div><div style={{ fontSize: 12, color: '#555' }}>{item.start_date ? fmt(new Date(item.start_date)) : '—'}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>TO</div><div style={{ fontSize: 12, color: '#555' }}>{item.end_date ? fmt(new Date(item.end_date)) : '—'}</div></div>
                      {item.reason && <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>REASON</div><div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>{item.reason}</div></div>}
                    </div>
                  )}
                  {kind === 'claims' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>TYPE</div><div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.claim_type || item.type || '—'}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>AMOUNT</div><div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.total_amount ?? item.amount ?? '—'}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>BY</div><div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.employee_name || item.name || '—'}</div></div>
                      <div><div style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>DATE</div><div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{item.receipt_date || item.date || '—'}</div></div>
                    </div>
                  )}
                  {kind === 'tickets' && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>{item.issueCategory ?? item.issueDescription ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{item.level ?? item.facility_area ?? '—'} · {item.date ?? item.created_at ?? '—'}</div>
                    </div>
                  )}
                  {kind === 'visitors' && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>{item.visitor_name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{item.official_email ?? '—'} · Visit: {item.visit_date ?? '—'}</div>
                    </div>
                  )}
                  {st === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => rcDecide(kind, item, 'approve')} disabled={la || lr}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 9, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#16a34a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        {la ? <Loader2 size={13} style={{ animation: 'fhr-spin 1s linear infinite' }} /> : <Check size={13} />} Approve
                      </button>
                      <button onClick={() => setRcRejectModal({ kind, item })} disabled={la || lr}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 9, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        {lr ? <Loader2 size={13} style={{ animation: 'fhr-spin 1s linear infinite' }} /> : <X size={13} />} Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div style={{ padding: '0 0 24px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
                {RC_TABS.map(({ id, label, Icon, count }) => (
                  <button key={id} onClick={() => setRcTab(id)}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                      background: rcTab === id ? '#2b1d62' : '#fff',
                      borderColor: rcTab === id ? '#2b1d62' : '#ddd',
                      color: rcTab === id ? '#fff' : '#666',
                    }}>
                    <Icon size={13} />
                    {label}
                    {count > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{count}</span>}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button onClick={() => rcLoadData()} disabled={rcLoading}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c47d9', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <RefreshCw size={13} style={rcLoading ? { animation: 'fhr-spin 1s linear infinite' } : {}} /> Refresh
                </button>
              </div>
              {rcErr && <ErrBanner msg={rcErr} onRetry={rcLoadData} />}
              {rcLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', gap: 10 }}>
                  <Loader2 size={28} color="#2b1d62" style={{ animation: 'fhr-spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#aaa' }}>Loading requests…</span>
                </div>
              ) : rcItems.length === 0 ? (
                <Empty icon={<Inbox size={26} color="#ddd" />} title="No requests found" sub="Pull to refresh" />
              ) : (
                rcItems.map(item => renderCard(rcTab, item))
              )}
              {rcRejectModal && (() => {
                let reason = '';
                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'flex-end' }}
                    onClick={e => { if (e.target === e.currentTarget) setRcRejectModal(null); }}>
                    <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', width: '100%' }}>
                      <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 99, margin: '0 auto 16px' }} />
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 4 }}>Reject Request</div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>Provide an optional reason.</div>
                      <textarea defaultValue="" onChange={e => { reason = e.target.value; }}
                        placeholder="e.g. Missing documentation…"
                        rows={3} style={{ width: '100%', borderRadius: 10, border: '1.5px solid #ddd', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        <button onClick={() => setRcRejectModal(null)}
                          style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #ddd', background: '#f9f9f9', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#555' }}>Cancel</button>
                        <button onClick={() => rcDecide(rcRejectModal.kind, rcRejectModal.item, 'reject', reason)}
                          style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                          {rcActionId ? <Loader2 size={14} style={{ animation: 'fhr-spin 1s linear infinite' }} /> : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────── */}
      {selApp && (() => {
        const si = getStatusInfo(selApp.status_code || selApp.status);
        return (
          <div className="cal-overlay" onClick={() => setSelApp(null)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <div className="detail-header" style={{ background: si.color }}>
                <span>Application Detail</span>
                <X size={19} style={{ cursor: 'pointer' }} onClick={() => setSelApp(null)} />
              </div>
              <div className="detail-content">
                <div className="detail-row"><label>Status</label><span style={{ color: si.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>{si.icon}{si.label}</span></div>
                <div className="detail-row"><label>Leave Type</label><span>{selApp.leave_type_name || selApp.leave_type || '--'}</span></div>
                <div className="detail-row"><label>From</label><span>{selApp.start_date ? fmt(new Date(selApp.start_date)) : '--'}</span></div>
                <div className="detail-row"><label>To</label><span>{selApp.end_date ? fmt(new Date(selApp.end_date)) : '--'}</span></div>
                <div className="detail-row"><label>Days</label><span>{selApp.total_days || '--'}</span></div>
                <div className="detail-row"><label>Applied</label><span>{selApp.applied_at ? new Date(selApp.applied_at).toLocaleDateString('en-GB') : '--'}</span></div>
                {selApp.reason && <div className="detail-row reason-box"><label>Reason</label><p>{selApp.reason}</p></div>}
                {selApp.admin_note && <div className="detail-row reason-box"><label>Manager Remark</label><p className="admin-p">{selApp.admin_note}</p></div>}
              </div>
              <button className="close-detail-btn" onClick={() => setSelApp(null)}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ── CALENDAR MODAL ────────────────────────────────────────────────── */}
      {calOpen && (
        <div className="cal-overlay" onClick={() => setCalOpen(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-header">
              <span className="cal-title">{calCtx === 'ot' ? 'Work Date' : calField === 'from' ? 'Start Date' : 'End Date'}</span>
              <X size={19} style={{ cursor: 'pointer' }} onClick={() => setCalOpen(false)} />
            </div>
            <div className="cal-nav">
              <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>{'<'}</button>
              <span className="month-year-text">{viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
              <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>{'>'}</button>
            </div>
            <div className="cal-week">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="cal-grid">{calDays()}</div>
          </div>
        </div>
      )}

      <style>{`@keyframes fhr-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};


export default FlexHR;
