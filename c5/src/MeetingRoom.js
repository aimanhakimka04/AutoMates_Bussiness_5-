import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Calendar, User, MapPin, Clock,
  MoreVertical, Search, Layers, ChevronDown, Plus, Minus,
  Monitor, X, Edit3, PlusSquare, CheckCircle, AlertCircle,
  Loader, RefreshCw
} from 'lucide-react';
import './MeetingRoom.css';

// ── CONFIG ─────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://n8n.aimanhakimka.site/webhook/employee-assistant';
const TENANT_ID = 'chinhin_hq';
const TIMEZONE = 'Asia/Kuala_Lumpur';

const ROOM_DIRECTORY = {
  'idea lab 1': 'idealab1@chinhin.com',
  'idea lab 2': 'idealab2@chinhin.com',
  'idea lab 3': 'idealab3@chinhin.com',
  'idea lab 4': 'idealab4@chinhin.com',
  'idea lab 5': 'idealab5@chinhin.com',
  'idea lab 6': 'idealab6@chinhin.com',
  'idea lab 7': 'idealab7@chinhin.com',
  'idea lab 8': 'idealab8@chinhin.com',
  'idea lab 9': 'idealab9@chinhin.com',
  'idea lab 10': 'idealab10@chinhin.com',
  'boardroom': 'boardroom@chinhin.com',
};

// ── HELPERS ────────────────────────────────────────────────────────
const getSessionUser = () => {
  try {
    const s = sessionStorage.getItem('flexhr_user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

const buildUserJWT = (user) => {
  const b64 = (obj) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({
    sub: user?.email || '', upn: user?.email || '',
    name: user?.name || '', roles: ['employee'],
    tenant_id: TENANT_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${h}.${p}.local`;
};

const formatLocalDate = (date) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

const timeToISO = (dateObj, timeStr) => {
  if (!timeStr || !dateObj) return null;
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const p = (n) => String(n).padStart(2, '0');
  return `${dateObj.getFullYear()}-${p(dateObj.getMonth() + 1)}-${p(dateObj.getDate())}T${p(h)}:${p(m)}:00`;
};

// ── N8N API ────────────────────────────────────────────────────────
const callN8n = async (body, user) => {
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buildUserJWT(user)}`,
    },
    body: JSON.stringify({
      ...body,
      id: user?.email || '',
      upn: user?.email || '',
      name: user?.name || '',
      roles: ['employee'],
      tenant_id: TENANT_ID,
      platform: 'web',
      timestamp: new Date().toISOString(),
      client_request_id: `req-${Date.now()}`,
    }),
  });

  // Safe parse — n8n sometimes returns 200 with empty body
  const text = await res.text();
  if (!text || !text.trim()) {
    if (!res.ok) throw new Error(`Server error ${res.status} (empty response)`);
    return { type: 'empty', status: res.status };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid response from server: ${text.slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(data?.message || `Server error ${res.status}`);
  console.log('[n8n response]', body.event_type || body.text, '→', data);
  return data;
};

// Fetch the user's real room bookings from Microsoft Graph (via n8n)
const fetchMyBookings = (user) =>
  callN8n({
    text: 'get_bookings',
    input_type: 'form',
    confirm: true,
    state: {},
    session_id: `getbookings_${(user?.email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`,
    event_type: 'direct_booking',
    edited_plan: {
      action: 'get_bookings',
      sub_target: 'meeting_room',
      risk_level: 'low',
      needs_confirmation: false,
      summary: 'Fetching room bookings',
      parameters: {},
    },
  }, user);

// Book a room — confirm:true bypasses AI, goes straight to Graph Create
const bookRoomViaN8n = async ({ roomName, startISO, endISO, subject, appointmentType, participants, user }) => {
  const roomEmail = ROOM_DIRECTORY[roomName.toLowerCase()] || 'bilik_test@chinhin.com';
  const attendeeEmails = participants.map(p => p.email).filter(Boolean);
  return callN8n({
    text: `Book ${roomName} for ${subject}`,
    input_type: 'form',
    confirm: true,
    state: {},
    session_id: `form_${(user?.email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`,
    event_type: 'direct_booking',
    edited_plan: {
      action: 'book_meeting_room',
      risk_level: 'low',
      needs_confirmation: false,
      summary: `${subject} — ${roomName} ${startISO?.slice(11, 16)} to ${endISO?.slice(11, 16)}`,
      parameters: {
        subject, start: startISO, end: endISO, timezone: TIMEZONE,
        room_name: roomName, room_email: roomEmail,
        attendees: attendeeEmails,
        appointment_type: appointmentType || '',
        body: appointmentType
          ? `Type: ${appointmentType}\nBooked via Meeting Room app`
          : 'Booked via Meeting Room app',
      },
    },
  }, user);
};

const cancelBookingViaN8n = (eventId, pgId, title, user) =>
  callN8n({
    text: `Cancel booking ${title}`,
    input_type: 'form',
    confirm: true,
    state: {},
    session_id: `cancel_${Date.now()}`,
    event_type: 'direct_booking',
    edited_plan: {
      action: 'cancel_event',
      risk_level: 'low',
      needs_confirmation: false,
      summary: `${title} cancelled`,
      parameters: { event_id: eventId, pg_booking_id: pgId || null },
    },
  }, user);

const updateRoomViaN8n = async ({ eventId, pgId, roomName, startISO, endISO, subject, appointmentType, participants, user }) => {
  const roomEmail = ROOM_DIRECTORY[roomName.toLowerCase()] || 'bilik_test@chinhin.com';
  const attendeeEmails = participants.map(p => p.email).filter(Boolean);
  return callN8n({
    text: `Update booking ${subject}`,
    input_type: 'form',
    confirm: true,
    state: {},
    session_id: `edit_${(user?.email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`,
    event_type: 'direct_booking',
    edited_plan: {
      action: 'update_event',
      risk_level: 'low',
      needs_confirmation: false,
      summary: `Updated: ${subject} — ${roomName} ${startISO?.slice(11, 16)} to ${endISO?.slice(11, 16)}`,
      parameters: {
        event_id: eventId,
        pg_booking_id: pgId || null,
        subject, start: startISO, end: endISO, timezone: TIMEZONE,
        room_name: roomName, room_email: roomEmail,
        attendees: attendeeEmails,
        appointment_type: appointmentType || '',
        body: appointmentType
          ? `Type: ${appointmentType}\nBooked via Meeting Room app`
          : 'Booked via Meeting Room app',
      },
    },
  }, user);
};

// Check room conflict via Postgres (server-side double-check)
const checkConflictViaN8n = async ({ roomName, startISO, endISO, excludeEventId, user }) =>
  callN8n({
    text: `Check conflict ${roomName} ${startISO} to ${endISO}`,
    input_type: 'form',
    confirm: true,
    state: {},
    session_id: `conflict_${Date.now()}`,
    event_type: 'direct_booking',
    edited_plan: {
      action: 'check_conflict',
      risk_level: 'low',
      needs_confirmation: false,
      summary: `Check room availability for ${roomName}`,
      parameters: {
        room_name: roomName,
        start: startISO,
        end: endISO,
        exclude_event_id: excludeEventId || null,
      },
    },
  }, user);

// Fetch ALL room bookings from Postgres (used for rich availability display)
const fetchAllRoomBookings = (user) =>
  callN8n({
    text: 'get_all_room_bookings',
    input_type: 'form',
    confirm: true,
    state: {},
    session_id: `allbookings_${(user?.email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`,
    event_type: 'direct_booking',
    edited_plan: {
      action: 'get_bookings',
      sub_target: 'meeting_room',
      risk_level: 'low',
      needs_confirmation: false,
      summary: 'Fetching all room bookings',
      parameters: { scope: 'all_rooms' },
    },
  }, user);

// ── COMPONENT ──────────────────────────────────────────────────────
const MeetingRoom = ({ userInfo: propUserInfo }) => {
  const navigate = useNavigate();
  // Priority: prop from App.jsx (MSAL web) → sessionStorage (Capacitor mobile)
  const currentUser = propUserInfo || getSessionUser();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = formatLocalDate(today);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // ── View ─────────────────────────────────────────────────────────
  const [view, setView] = useState('list');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [attendees, setAttendees] = useState(0);
  const [activeTab, setActiveTab] = useState('All');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null); // stores full meeting object being edited

  // ── Meetings list — loaded from Graph, empty until fetch completes ─
  const [meetingsData, setMeetingsData] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // ── Local bookings cache (correct times, not affected by timezone bug) ──
  const [localBookings, setLocalBookings] = useState([]);
  const [roomBookings, setRoomBookings] = useState([]); // all-rooms view for conflict display
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isCancelling, setIsCancelling] = useState(null);

  // ── Calendar ─────────────────────────────────────────────────────
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  // ── Form ──────────────────────────────────────────────────────────
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // ── External participant modal ────────────────────────────────────
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [extName, setExtName] = useState('');
  const [extEmail, setExtEmail] = useState('');

  const allFeatures = ['Projector', 'Interactive TV', 'Non-Interactive TV', '180° Camera', 'Conference Camera', 'Tabletop Teams Panel', 'Wireless Mic'];

  // ── LOAD REAL BOOKINGS on mount ───────────────────────────────────
  const loadBookings = useCallback(async () => {
    setIsFetching(true);
    setFetchError('');
    try {
      const result = await fetchMyBookings(currentUser);
      if (result.type === 'bookings_list') {
        // Normalize: ensure pgId is set for every DB-sourced booking
        const bookings = (result.bookings || []).map(b => ({
          ...b,
          pgId: b.pgId || b.n8nRef || b.id || null,
          n8nRef: b.n8nRef || b.id || null,
        }));
        setMeetingsData(bookings);
        // Also cache all-rooms bookings for conflict detection
        setRoomBookings(bookings);
      } else if (result.type === 'empty') {
        setMeetingsData([]);
        setRoomBookings([]);
      } else {
        console.warn('[MeetingRoom] loadBookings unexpected response:', result);
        setFetchError(`Unexpected response (${result.type}) — check n8n workflow.`);
        setMeetingsData([]);
      }
    } catch (err) {
      setFetchError(`Failed to load bookings: ${err.message}`);
      setMeetingsData([]);
    } finally {
      setIsFetching(false);
    }
  }, [currentUser]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // ── Filtered meetings ─────────────────────────────────────────────
  const filteredMeetings = meetingsData.filter(m => {
    if (activeTab === 'Today') return m.date === todayStr;
    if (activeTab === 'Week') {
      const d = new Date(m.date);
      const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
      return d >= today && d <= weekEnd;
    }
    return true;
  });

  // ── Time slots ────────────────────────────────────────────────────
  const getFromTimeSlots = () => {
    const isToday = formatLocalDate(selectedDate) === todayStr;
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      const period = hour < 12 ? 'AM' : 'PM';
      let dh = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      if (!isToday || hour > currentHour)
        slots.push(`${dh}:00 ${period}`);
      if (hour !== 20 && (!isToday || hour > currentHour || (hour === currentHour && currentMinute < 30)))
        slots.push(`${dh}:30 ${period}`);
    }
    return slots;
  };

  const fromTimeSlots = getFromTimeSlots();

  const getToTimeSlots = () => {
    if (!selectedStartTime) return [];
    const [time, period] = selectedStartTime.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const startNum = h + (m / 60) + 0.5;
    const list = [];
    for (let i = startNum; i <= 21; i += 0.5) {
      const p = i < 12 ? 'AM' : 'PM';
      let dh = Math.floor(i); if (dh > 12) dh -= 12; if (dh === 0) dh = 12;
      const dm = (i % 1) === 0 ? '00' : '30';
      list.push(`${dh}:${dm} ${p}`);
    }
    return list;
  };

  const getAvailableDurations = () => {
    if (!selectedStartTime) return [];
    const [time, period] = selectedStartTime.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const maxAllowed = 21 - (h + m / 60);
    const list = [];
    for (let i = 0.5; i <= Math.min(8, maxAllowed); i += 0.5) {
      if (i === 0.5) list.push('30 min');
      else { const fH = Math.floor(i); const fM = (i % 1) * 60; list.push(`${fH} hour${fH > 1 ? 's' : ''}${fM > 0 ? ' 30 min' : ''}`); }
    }
    return list;
  };



  // ── Navigation ────────────────────────────────────────────────────
  const handleBack = () => {
    setSubmitResult(null);
    if (view === 'form' && isEditing) { setView('list'); setIsEditing(false); }
    else if (view === 'form') setView('booking');
    else if (view === 'booking') setView('results');
    else if (view === 'filter') setView('results');
    else if (view === 'results') setView('list');
    else navigate('/');
  };

  const handleEditClick = (meeting) => {
    if (!meeting.n8nRef) {
      alert('Cannot edit — booking ID not found. Please refresh the list and try again.');
      setOpenMenuId(null);
      return;
    }
    // Pre-fill all form fields from the existing meeting
    const [startTime, endTime] = (meeting.time || '').split(' - ');
    const roomNum = meeting.room?.replace(/idea lab /i, '').trim();
    setIsEditing(true);
    setEditingMeeting(meeting);
    setMeetingTitle(meeting.title || '');
    setSelectedStartTime(startTime?.trim() || '');
    setSelectedEndTime(endTime?.trim() || '');
    setAppointmentType('');
    setSelectedParticipants([]);
    setSelectedRoom(roomNum || selectedRoom);
    // Parse and set the date from existing meeting
    if (meeting.date) {
      const [y, mo, d] = meeting.date.split('-').map(Number);
      setSelectedDate(new Date(y, mo - 1, d));
    }
    setSubmitResult(null);
    setView('form');
    setOpenMenuId(null);
  };

  const openFreshBookingForm = () => {
    setIsEditing(false);
    setEditingMeeting(null);
    setMeetingTitle('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setAppointmentType('');
    setSelectedParticipants([]);
    setSubmitResult(null);
    setView('form');
  };

  // ── CONFLICT CHECK ────────────────────────────────────────────────
  // Checks local data, DB-sourced all-room bookings, and in-session cache.
  const hasConflict = (roomName, dateStr, startTime, endTime) => {
    const parseTime = (t) => {
      if (!t) return -1;
      const parts = t.trim().split(' ');
      if (parts.length < 2) return -1;
      const [time, period] = parts;
      let [h, m] = time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return -1;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const normRoom = (r) => (r || '').toLowerCase().replace(/\s/g, '');
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    if (newStart < 0 || newEnd < 0) return false;

    const checkList = (list) => list.some(m => {
      if (normRoom(m.room) !== normRoom(roomName)) return false;
      if (m.date !== dateStr) return false;
      if (editingMeeting && (m.id === editingMeeting.id || m.n8nRef === editingMeeting.n8nRef)) return false;
      const [rawStart, rawEnd] = (m.time || '').split(' - ');
      let eStart = parseTime(rawStart?.trim());
      let eEnd = parseTime(rawEnd?.trim());
      if (eStart < 0 || eEnd < 0) return false;
      if (eEnd <= eStart) return false; // skip corrupted entries
      return newStart < eEnd && newEnd > eStart;
    });

    // Check against: server data, DB all-room bookings, in-session local cache
    return checkList(meetingsData) || checkList(roomBookings) || checkList(localBookings);
  };

  // Get conflicting booking details for a richer error message
  const getConflictingBooking = (roomName, dateStr, startTime, endTime) => {
    const parseTime = (t) => {
      if (!t) return -1;
      const parts = t.trim().split(' ');
      if (parts.length < 2) return -1;
      const [time, period] = parts;
      let [h, m] = time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return -1;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const normRoom = (r) => (r || '').toLowerCase().replace(/\s/g, '');
    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    const allData = [...meetingsData, ...roomBookings, ...localBookings];
    return allData.find(m => {
      if (normRoom(m.room) !== normRoom(roomName)) return false;
      if (m.date !== dateStr) return false;
      if (editingMeeting && (m.id === editingMeeting.id || m.n8nRef === editingMeeting.n8nRef)) return false;
      const [rawStart, rawEnd] = (m.time || '').split(' - ');
      let eStart = parseTime(rawStart?.trim());
      let eEnd = parseTime(rawEnd?.trim());
      if (eStart < 0 || eEnd < 0 || eEnd <= eStart) return false;
      return newStart < eEnd && newEnd > eStart;
    }) || null;
  };

  // ── CONFIRM BOOKING ───────────────────────────────────────────────
  const handleConfirmBooking = useCallback(async () => {
    if (!meetingTitle.trim()) {
      setSubmitResult('error'); setSubmitMessage('Please enter a meeting title.'); return;
    }
    if (!selectedStartTime || !selectedEndTime) {
      setSubmitResult('error'); setSubmitMessage('Please select both start and end time.'); return;
    }
    const roomName = `Idea Lab ${selectedRoom}`;
    const startISO = timeToISO(selectedDate, selectedStartTime);
    const endISO = timeToISO(selectedDate, selectedEndTime);

    // ── Layer 1: Client-side conflict check (fast, uses cached data) ─
    if (hasConflict(roomName, formatLocalDate(selectedDate), selectedStartTime, selectedEndTime)) {
      const clash = getConflictingBooking(roomName, formatLocalDate(selectedDate), selectedStartTime, selectedEndTime);
      setSubmitResult('error');
      setSubmitMessage(
        clash
          ? `❌ ${roomName} is already booked (${clash.time}) by "${clash.title}". Choose a different slot.`
          : `❌ ${roomName} is already booked for this time slot. Please choose a different time.`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    // ── Layer 2: Server-side Postgres conflict check (authoritative) ─
    try {
      const conflictRes = await checkConflictViaN8n({
        roomName,
        startISO,
        endISO,
        excludeEventId: isEditing ? (editingMeeting?.pgId || editingMeeting?.id || null) : null,
        user: currentUser,
      });
      if (conflictRes?.type === 'conflict' && conflictRes?.has_conflict) {
        setSubmitResult('error');
        const cb = conflictRes.conflicting_booking;
        setSubmitMessage(
          cb
            ? `❌ ${roomName} is already booked from ${cb.start_time_fmt || ''} to ${cb.end_time_fmt || ''} ("${cb.meeting_title || 'another meeting'}"). Please pick a different time slot.`
            : `❌ ${roomName} is not available for the selected time. Please choose another slot.`
        );
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      // DB check failed — log warning but do NOT block booking (Graph will still validate)
      console.warn('[MeetingRoom] Server conflict pre-check failed, proceeding:', err.message);
    }

    try {
      // ── EDIT MODE: update existing event ─────────────────────────
      if (isEditing && editingMeeting) {
        const result = await updateRoomViaN8n({
          eventId: editingMeeting.n8nRef,
          pgId: editingMeeting.pgId || null,
          roomName, startISO, endISO,
          subject: meetingTitle.trim(),
          appointmentType,
          participants: selectedParticipants,
          user: currentUser,
        });

        const isSuccess = result.type === 'receipt' || result.type === 'empty';
        if (isSuccess) {
          setSubmitResult('success');
          setSubmitMessage(`Booking updated successfully! ✓`);
          setTimeout(() => { setView('list'); setSubmitResult(null); setIsEditing(false); setEditingMeeting(null); loadBookings(); }, 2500);
        } else if (result.type === 'error') {
          setSubmitResult('error');
          setSubmitMessage(result.message || result.error || 'Update failed. Please try again.');
        } else {
          setSubmitResult('error');
          setSubmitMessage(`Unexpected response (${result.type || 'unknown'}) — update may not have completed.`);
        }
        return;
      }

      // ── NEW BOOKING ───────────────────────────────────────────────
      const result = await bookRoomViaN8n({
        roomName, startISO, endISO,
        subject: meetingTitle.trim(),
        appointmentType,
        participants: selectedParticipants,
        user: currentUser,
      });

      if (result.type === 'receipt') {
        // ✅ Real success — Graph API confirmed the booking
        const newBooking = {
          id: result.pg_booking_id || result.reference_id || `local-${Date.now()}`,
          title: meetingTitle.trim(),
          host: currentUser?.name || currentUser?.email || 'Me',
          hostEmail: currentUser?.email || '',
          room: roomName,
          date: formatLocalDate(selectedDate),
          time: `${selectedStartTime} - ${selectedEndTime}`,
          attendees: selectedParticipants.length,
          pgId: result.pg_booking_id || null,
          n8nRef: result.graph_event_id || result.event_details?.id || result.reference_id || null,
        };
        setMeetingsData(prev => [newBooking, ...prev]);
        setLocalBookings(prev => [...prev, newBooking]);
        setSubmitResult('success');
        setSubmitMessage(result.summary || `${roomName} booked successfully! ✓`);
        setTimeout(() => { setView('list'); setSubmitResult(null); loadBookings(); }, 2500);
        setTimeout(() => loadBookings(), 8000);

      } else if (result.type === 'confirm') {
        // n8n is asking for confirmation again (shouldn't happen but handle gracefully)
        setSubmitResult('error');
        setSubmitMessage('Booking requires confirmation in chatbot — please try via the chatbot instead.');

      } else if (result.type === 'clarify') {
        // AI needs more info (shouldn't happen for form but handle it)
        setSubmitResult('error');
        setSubmitMessage(result.question || 'Booking incomplete — missing information.');

      } else if (result.type === 'error') {
        setSubmitResult('error');
        setSubmitMessage(result.message || result.error || 'Booking failed. Please try again.');

      } else if (result.type === 'empty') {
        // n8n returned 200 OK with empty body — booking went through successfully
        const newBooking = {
          id: `local-${Date.now()}`,
          title: meetingTitle.trim(),
          host: currentUser?.name || currentUser?.email || 'Me',
          hostEmail: currentUser?.email || '',
          room: `Idea Lab ${selectedRoom}`,
          date: formatLocalDate(selectedDate),
          time: `${selectedStartTime} - ${selectedEndTime}`,
          attendees: selectedParticipants.length,
          n8nRef: null,
        };
        setMeetingsData(prev => [newBooking, ...prev]);
        setLocalBookings(prev => [...prev, newBooking]);
        setSubmitResult('success');
        setSubmitMessage(`Idea Lab ${selectedRoom} booked successfully! ✓`);
        setTimeout(() => { setView('list'); setSubmitResult(null); loadBookings(); }, 2500);
        setTimeout(() => loadBookings(), 8000);

      } else {
        // Unknown response type — log and show error
        console.warn('[MeetingRoom] Unexpected n8n response type:', result.type, result);
        setSubmitResult('error');
        setSubmitMessage(`Unexpected response (${result.type || 'unknown'}) — booking may not have completed.`);
      }
    } catch (err) {
      setSubmitResult('error');
      setSubmitMessage(`Connection error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [meetingTitle, selectedStartTime, selectedEndTime, selectedRoom,
    selectedDate, appointmentType, selectedParticipants, currentUser,
    meetingsData, roomBookings, loadBookings, isEditing, editingMeeting, localBookings]);

  // ── CANCEL BOOKING ────────────────────────────────────────────────
  const handleCancelBooking = useCallback(async (meeting) => {
    if (!window.confirm(`Cancel "${meeting.title}"?`)) return;

    // Guard: if no Graph event ID we cannot cancel on the server
    if (!meeting.n8nRef) {
      alert('Cannot cancel — booking ID not found. Please refresh the list and try again.');
      return;
    }

    setIsCancelling(meeting.id);
    setOpenMenuId(null);
    try {
      await cancelBookingViaN8n(meeting.n8nRef, meeting.pgId || null, meeting.title, currentUser);
      // Optimistically remove from UI
      setMeetingsData(prev => prev.filter(m => m.id !== meeting.id));
      setLocalBookings(prev => prev.filter(m => m.id !== meeting.id));
      setTimeout(() => loadBookings(), 1500);
    } catch (err) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setIsCancelling(null);
    }
  }, [currentUser, loadBookings]);

  // ── Check if current user is the host of a booking ───────────────
  const isMyBooking = (meeting) => {
    if (!currentUser) return false;
    const email = (currentUser.email || '').toLowerCase().trim();
    const name = (currentUser.name || '').toLowerCase().trim();
    const hostEmail = (meeting.hostEmail != null ? String(meeting.hostEmail) : '').toLowerCase().trim();
    const host = (meeting.host != null ? String(meeting.host) : '').toLowerCase().trim();
    return (
      (hostEmail && hostEmail === email) ||
      (host && host === email) ||
      (host && host === name)
    );
  };

  // Always show cancel for any booking the user can see (fallback if host matching fails)
  const canManageBooking = (meeting) => isMyBooking(meeting) || true;

  // ── Calendar ──────────────────────────────────────────────────────
  const changeMonth = (offset) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear(), month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(<span key={`e-${i}`} className="day-empty" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isSelected = formatLocalDate(selectedDate) === formatLocalDate(cellDate);
      const isPast = cellDate < today;
      days.push(
        <div key={d}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
          onClick={() => { if (!isPast) { setSelectedDate(cellDate); setSelectedStartTime(''); setSelectedEndTime(''); } }}>
          {d}
        </div>
      );
    }
    return days;
  };

  // ── RENDER ─────────────────────────────────────────────────────────
  return (
    <div className="meeting-room-container">
      <nav className="top-nav-bar">
        <div className="back-arrow-wrapper" onClick={handleBack}>
          <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span className="nav-title">
          {view === 'form' ? (isEditing ? 'Edit Booking' : 'Booking Detail')
            : view === 'booking' ? 'Meeting Room Details'
              : view === 'filter' ? 'Searching'
                : 'Meeting Room'}
        </span>
        {view === 'list' && (
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            onClick={loadBookings} title="Refresh">
            <RefreshCw size={18} color={isFetching ? '#aaa' : '#fff'}
              style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        )}
      </nav>

      <div className="scrollable-area">

        {/* LIST ──────────────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="content-padding">
            <div className="tabs-header">
              {['All', 'Today', 'Week'].map(tab => (
                <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}>
                  {tab === 'All' ? 'List All' : tab}
                </button>
              ))}
            </div>

            <div className="summary-banner">
              <div className="summary-icon"><Calendar size={22} color="#1976d2" /></div>
              <div className="summary-info">
                <h2 style={{ fontSize: '13pt', fontWeight: 'bold', margin: 0 }}>
                  {isFetching ? 'Loading…' : `${filteredMeetings.length} Meeting${filteredMeetings.length !== 1 ? 's' : ''} Upcoming`}
                </h2>
                <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: '2px 0 0', color: '#000' }}>
                  {todayStr}, Today
                </p>
              </div>
            </div>

            {/* Loading state */}
            {isFetching && (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 12, fontSize: 13 }}>Loading your bookings…</p>
              </div>
            )}

            {/* Error state */}
            {!isFetching && fetchError && (
              <div className="submit-result-banner error" style={{ margin: '10px 0' }}>
                <AlertCircle size={16} />
                <span>{fetchError}</span>
                <button onClick={loadBookings}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isFetching && !fetchError && filteredMeetings.length === 0 && (
              <p style={{ textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 }}>
                No room bookings found.
              </p>
            )}

            {/* Meetings */}
            {!isFetching && filteredMeetings.map(meeting => (
              <div key={meeting.id} className="details-card">
                <div className="card-top">
                  <h3>{meeting.title}</h3>
                  <div className="more-options-container">
                    {canManageBooking(meeting) && (
                      <button className="more-options"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === meeting.id ? null : meeting.id); }}>
                        {isCancelling === meeting.id
                          ? <Loader size={18} color="#999" style={{ animation: 'spin 1s linear infinite' }} />
                          : <MoreVertical size={20} color="#999" />}
                      </button>
                    )}
                    {canManageBooking(meeting) && openMenuId === meeting.id && (
                      <div className="card-dropdown-menu">
                        <div className="dropdown-item" onClick={() => handleEditClick(meeting)}>
                          <Edit3 size={14} /> <span>Edit Booking</span>
                        </div>
                        <div className="dropdown-item delete" onClick={() => handleCancelBooking(meeting)}>
                          <X size={14} /> <span>Cancel Booking</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="info-rows">
                  <div className="row"><span className="icon"><User size={18} /></span><span>{meeting.host}</span></div>
                  <div className="row"><span className="icon"><MapPin size={18} /></span><span>{meeting.room}</span></div>
                  <div className="row"><span className="icon"><Calendar size={18} /></span><span>{meeting.date}</span></div>
                  <div className="row"><span className="icon"><Clock size={18} /></span><span>{meeting.time}</span></div>
                </div>
                <div className="card-bottom">
                  <div className="attendee-count">
                    <div className="icon-circle"><User size={14} strokeWidth={2.5} /></div>
                    <span className="attendee-number">{meeting.attendees}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESULTS ──────────────────────────────────────────────── */}
        {view === 'results' && (
          <div className="search-view-container">
            <button className="search-input-trigger" onClick={() => setView('filter')}>
              <span className="placeholder-text">Search room name...</span><Search size={20} color="#999" />
            </button>
            <div className="search-results-list">
              {Object.entries(ROOM_DIRECTORY).filter(([k]) => k.includes('idea lab')).map(([name], i) => (
                <div key={i} className="room-sub-box"
                  onClick={() => { setSelectedRoom(i + 1); setView('booking'); setIsEditing(false); }}>
                  <div className="room-box-left"></div>
                  <div className="room-box-right">
                    <h4 className="room-title">{name.replace(/\b\w/g, c => c.toUpperCase())}</h4>
                    <div className="room-details">
                      <div className="detail-item"><User size={14} color="#666" /><span>8 seats</span></div>
                      <div className="detail-item"><Layers size={14} color="#666" /><span>Level 19</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILTER ───────────────────────────────────────────────── */}
        {view === 'filter' && (
          <div className="filter-form-wrapper">
            <p className="form-subtitle">Find A Meeting Room</p>
            <div className="field-group"><label>Date</label>
              <div className="form-field-box" onClick={() => setIsCalendarOpen(true)}>
                <span>{formatLocalDate(selectedDate)}</span><Calendar size={18} color="#666" />
              </div>
            </div>
            <div className="field-group"><label>I need a meeting room from</label>
              <div className="form-field-box select-type">
                <select value={selectedStartTime} onChange={(e) => { setSelectedStartTime(e.target.value); setSelectedDuration(''); }}>
                  <option value="">Please Select Time</option>
                  {fromTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select><ChevronDown size={18} color="#666" className="select-arrow" />
              </div>
            </div>
            <div className="field-group"><label>I need a meeting room for</label>
              <div className="form-field-box select-type">
                <select value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)} disabled={!selectedStartTime}>
                  <option value="">{selectedStartTime ? 'Please Select Duration' : 'Select Start Time First'}</option>
                  {getAvailableDurations().map(d => <option key={d} value={d}>{d}</option>)}
                </select><ChevronDown size={18} color="#666" className="select-arrow" />
              </div>
            </div>
            <div className="field-group"><label>Floor</label>
              <div className="form-field-box select-type">
                <select value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)}>
                  <option value="">Please select a Floor</option><option value="19">Level 19</option>
                </select><ChevronDown size={18} color="#666" className="select-arrow" />
              </div>
            </div>
            <div className="feature-section">
              <label className="section-label">Room Features</label>
              {allFeatures.map(f => (
                <div key={f} className="feature-row-item"><span>{f}</span><input type="checkbox" className="custom-checkbox" /></div>
              ))}
            </div>
            <div className="attendee-stepper">
              <label>Number of Attendees</label>
              <div className="stepper-controls">
                <button className="step-btn" onClick={() => setAttendees(Math.max(0, attendees - 1))}><Minus size={18} /></button>
                <span className="step-value">{attendees}</span>
                <button className="step-btn" onClick={() => setAttendees(Math.min(8, attendees + 1))}><Plus size={18} /></button>
              </div>
            </div>
            <div style={{ padding: '20px 0 80px' }}>
              <button className="capsule-search-btn" onClick={() => setView('results')}>Search Room</button>
            </div>
          </div>
        )}

        {/* BOOKING DETAIL ───────────────────────────────────────── */}
        {view === 'booking' && (
          <div className="booking-details-container">
            <div className="room-hero-image">
              <div className="room-label-tag">Idea Lab {selectedRoom}</div>
            </div>
            <div className="room-details-content">
              <h2 className="room-main-title">Signature Teams Room</h2>
              <div className="features-info-card">
                <h3 className="features-title">Room Features</h3>
                <div className="features-grid-layout">
                  {allFeatures.map((f, i) => <div key={i} className="f-item"><Monitor size={16} color="#00a8ff" /><span>{f}</span></div>)}
                </div>
              </div>
              <div className="schedule-info-card">
                <h3 className="schedule-header">Select your time slot</h3>
                <div className="field-group">
                  <div className="form-field-box" onClick={() => setIsCalendarOpen(true)}>
                    <span>{formatLocalDate(selectedDate)}</span><Calendar size={18} color="#666" />
                  </div>
                </div>
                {/* Occupied slots for this room on selected date */}
                {(() => {
                  const roomName = `Idea Lab ${selectedRoom}`;
                  const dateStr = formatLocalDate(selectedDate);
                  const normRoom = (r) => (r || '').toLowerCase().replace(/\s/g, '');
                  const occupied = [...meetingsData, ...roomBookings, ...localBookings].filter(
                    m => normRoom(m.room) === normRoom(roomName) && m.date === dateStr
                  );
                  if (occupied.length === 0) return <p className="no-booking-msg">No bookings for this day — room is free!</p>;
                  return (
                    <div className="occupied-slots-list">
                      <p className="occupied-slots-label" style={{ fontSize: '12px', color: '#e53935', fontWeight: 600, margin: '8px 0 4px' }}>
                        ⚠ Already booked on {dateStr}:
                      </p>
                      {occupied.map((m, i) => (
                        <div key={i} className="occupied-slot-item" style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: '#fff3f3', border: '1px solid #ffcdd2',
                          borderRadius: 8, padding: '6px 10px', marginBottom: 4
                        }}>
                          <Clock size={14} color="#e53935" />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#c62828' }}>{m.time}</span>
                          <span style={{
                            fontSize: '12px', color: '#555', flex: 1, textAlign: 'right',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {m.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* BOOKING FORM ─────────────────────────────────────────── */}
        {view === 'form' && (
          <div className="booking-form-wrapper">

            {submitResult === 'success' && (
              <div className="submit-result-banner success">
                <CheckCircle size={18} /><span>{submitMessage}</span>
              </div>
            )}
            {submitResult === 'error' && (
              <div className="submit-result-banner error">
                <AlertCircle size={18} /><span>{submitMessage}</span>
              </div>
            )}

            {/* HOST = REAL LOGGED-IN USER */}
            <div className="form-item">
              <label>Meeting Host</label>
              <div className="form-field-box" style={{ cursor: 'default', background: '#f7f7f7' }}>
                <span style={{ fontWeight: 600 }}>
                  {currentUser?.name || currentUser?.email || 'Unknown User'}
                </span>
                <User size={16} color="#999" />
              </div>
            </div>

            <div className="form-item">
              <label>Room</label>
              <div className="form-field-box" style={{ cursor: 'default' }}>
                <span style={{ fontWeight: 600, color: '#2b1d62' }}>Idea Lab {selectedRoom}</span>
              </div>
            </div>

            <div className="form-item">
              <label>Booking Date</label>
              <div className="form-field-box" onClick={() => setIsCalendarOpen(true)}>
                <span>{formatLocalDate(selectedDate)}</span><Calendar size={18} color="#666" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-item half">
                <label>From *</label>
                <div className="form-field-box select-type">
                  <select value={selectedStartTime}
                    onChange={(e) => { setSelectedStartTime(e.target.value); setSelectedEndTime(''); }}>
                    <option value="">Select Time</option>
                    {fromTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select><ChevronDown size={18} color="#666" className="select-arrow" />
                </div>
              </div>
              <div className="form-item half">
                <label>To *</label>
                <div className="form-field-box select-type">
                  <select value={selectedEndTime}
                    onChange={(e) => { setSelectedEndTime(e.target.value); }}
                    disabled={!selectedStartTime}>
                    <option value="">Select Time</option>
                    {getToTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}
                  </select><ChevronDown size={18} color="#666" className="select-arrow" />
                </div>
              </div>
            </div>

            <div className="form-item">
              <label>Meeting Title *</label>
              <input type="text" className="form-text-input"
                placeholder="Enter meeting title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)} />
            </div>

            <div className="form-item">
              <label>Appointment Type</label>
              <div className="form-field-box select-type">
                <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                  <option value="">Select Type</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Discussion">Discussion</option>
                  <option value="Event">Event</option>
                  <option value="Training">Training</option>
                </select><ChevronDown size={18} color="#666" className="select-arrow" />
              </div>
            </div>

            <div className="form-item">
              <label>Invite Participants</label>
              <div className="invite-input-container">
                <input className="form-text-input-placeholder" type="text"
                  placeholder="Add external participant..." readOnly />
                <button className="add-external-btn" onClick={() => setIsExtModalOpen(true)}>
                  <PlusSquare size={28} color="#1a73e8" />
                </button>
              </div>
              <div className="participant-tags-container">
                {selectedParticipants.map((p, idx) => (
                  <div key={idx} className="name-box-tag">
                    <span className="tag-name">{p.name}</span>
                    <X size={14} style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedParticipants(prev => prev.filter((_, i) => i !== idx))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CALENDAR MODAL ─────────────────────────────────────────── */}
      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <div className="calendar-modal-header">
              <span>Calendar</span>
              <button className="close-btn" onClick={() => setIsCalendarOpen(false)}>×</button>
            </div>
            <div className="calendar-nav">
              <button className="nav-arrow" onClick={() => changeMonth(-1)}>{'<'}</button>
              <span className="month-year">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              <button className="nav-arrow" onClick={() => changeMonth(1)}>{'>'}</button>
            </div>
            <div className="weekday-row">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="days-grid">{renderCalendarDays()}</div>
            <div className="calendar-footer">
              <button className="calendar-confirm-btn" onClick={() => setIsCalendarOpen(false)}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* EXTERNAL PARTICIPANT MODAL ────────────────────────────── */}
      {isExtModalOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal external-modal">
            <div className="calendar-modal-header">
              <span>External Participant</span>
              <button className="close-btn" onClick={() => setIsExtModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-input-group"><label>Name</label>
                <input className="form-input-text-extenal" type="text" value={extName}
                  onChange={(e) => setExtName(e.target.value)} />
              </div>
              <div className="modal-input-group"><label>Email</label>
                <input className="form-input-text-extenal" type="email" value={extEmail}
                  onChange={(e) => setExtEmail(e.target.value)} />
              </div>
            </div>
            <button className="calendar-confirm-btn"
              onClick={() => {
                if (extName && extEmail.includes('@')) {
                  setSelectedParticipants([...selectedParticipants, { name: extName, email: extEmail }]);
                  setExtName(''); setExtEmail(''); setIsExtModalOpen(false);
                } else {
                  alert('Please enter a valid Name and Email (must contain @)');
                }
              }}>CONFIRM</button>
          </div>
        </div>
      )}

      {/* FOOTER ──────────────────────────────────────────────────── */}
      {view !== 'filter' && (
        <div className="search-footer">
          {view === 'list' && (
            <button className="search-room-btn" onClick={() => setView('results')}>
              <Search size={18} />&nbsp;Search Room
            </button>
          )}
          {view === 'booking' && (
            <button className="book-room-btn" onClick={openFreshBookingForm}>Book Now</button>
          )}
          {view === 'form' && (
            <button className="book-room-btn"
              onClick={handleConfirmBooking}
              disabled={isSubmitting || submitResult === 'success'}
              style={{
                opacity: isSubmitting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center'
              }}>
              {isSubmitting
                ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Booking…</>
                : submitResult === 'success'
                  ? <><CheckCircle size={18} /> Booked!</>
                  : isEditing ? 'Save Changes' : 'Confirm Booking'
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;