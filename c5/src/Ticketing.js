import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, Upload, X,
  CheckCircle2, Clock, Ticket, Calendar, FileText,
  AlertCircle, Zap, Droplets, Wifi, Shield, MoreHorizontal,
  RefreshCw, Search, Plus, Tag, MapPin, Loader2,
  Check, ArrowRight, Send, Eye, XCircle, ImageOff,
  Hash, MessageSquare, Image as ImageIcon, Ban
} from 'lucide-react';
import './Ticketing.css';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
// Replace with your actual n8n webhook URL
const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || ''; // Assume token is stored in localStorage after MSAL login

// ─── n8n API helper ─────────────────────────────────────────────────────────────
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'ticketing', ...payload },
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

// ─── DATA ──────────────────────────────────────────────────────────────────────
const LEVELS = ['Basement', 'Ground Floor', 'Level 7', 'Level 8', 'Level 17'];
const FACILITIES = ['Common Area / Lobby', 'Office Space', 'Meeting Room', 'Pantry', 'Washroom'];
const ZONES = ['Main Lobby', 'Lift Lobby', 'East Wing', 'West Wing', 'Open Plan'];

const CATEGORIES = [
  { key: 'Electrical', label: 'Electrical', icon: Zap, color: '#f59e0b' },
  { key: 'Access & Security', label: 'Access & Security', icon: Shield, color: '#6366f1' },
  { key: 'Plumbing / Water', label: 'Plumbing / Water', icon: Droplets, color: '#0ea5e9' },
  { key: 'Electronics / IT Systems', label: 'IT Systems', icon: Wifi, color: '#10b981' },
  { key: 'Other', label: 'Other', icon: MoreHorizontal, color: '#94a3b8' },
];

const DESCRIPTIONS = {
  'Electrical': ['Light not working', 'Power plug / socket issue', 'Air conditioning not working', 'Elevator malfunction'],
  'Access & Security': ['Access card not working', 'Door lock issue', 'CCTV malfunction'],
  'Plumbing / Water': ['Pipe leaking', 'Tap broken', 'Toilet blockage'],
  'Electronics / IT Systems': ['Network connectivity issue', 'Display panel off', 'Speaker issue'],
  'Other': ['General feedback', 'Other: Specify'],
};

const PRIORITIES = [
  { key: 'Low', color: '#22c55e', bg: '#f0fdf4' },
  { key: 'Medium', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'High', color: '#ef4444', bg: '#fef2f2' },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  const dt = new Date(d);
  return `${dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

const genId = () => 'HT' + (10000 + Math.floor(Math.random() * 89999));

const statusStyle = (s) => {
  if (s === 'Open') return { color: '#2b1d62', bg: '#eeeaf8', dot: '#6d28d9' };
  if (s === 'Cancelled') return { color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' };
  return { color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' }; // Closed / default
};

const catMeta = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[4];


// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Ticketing = ({ userInfo }) => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // Derive identity from Microsoft SSO — email is the stable unique key
  const userEmail = userInfo?.email || '';
  const userName = userInfo?.name || '';

  // ── view state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState('main');   // main | form | success | track | detail
  const [trackTab, setTrackTab] = useState('Open');
  const [lastTicket, setLastTicket] = useState(null);
  const [tickets, setTickets] = useState([]);       // ← start empty, fetched from API on mount
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [animClass, setAnimClass] = useState('page-enter');
  const [selectedTicket, setSelectedTicket] = useState(null);  // for detail view
  const [cancelModal, setCancelModal] = useState(false);  // cancel confirm
  const [cancelLoading, setCancelLoading] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);  // full-screen photo

  // ── form state ─────────────────────────────────────────────────────────────
  const [formStep, setFormStep] = useState(0);   // 0 = location, 1 = issue, 2 = details
  const [form, setForm] = useState({
    submittedBy: '',   // resolved from DB after upsert — shown as name in UI
    email: '',
    level: '',
    facilityArea: '',
    zone: '',
    issueCategory: '',
    issueDescription: '',
    priority: 'Medium',
    remarks: '',
  });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imgModal, setImgModal] = useState(false);

  // Sync identity fields whenever userInfo changes (after MSAL login)
  useEffect(() => {
    setForm(f => ({
      ...f,
      submittedBy: userName,
      email: userEmail,
    }));
  }, [userEmail, userName]);

  // ── view transition ────────────────────────────────────────────────────────
  const goTo = useCallback((v) => {
    setAnimClass('page-exit');
    setTimeout(() => {
      setView(v);
      setAnimClass('page-enter');
      setApiError('');
    }, 220);
  }, []);

  const handleBack = () => {
    if (view === 'form' && formStep > 0) { setFormStep(s => s - 1); return; }
    if (view === 'detail') { goTo('track'); return; }
    if (view !== 'main') { goTo('main'); setFormStep(0); }
    else navigate('/');
  };

  // ── fetch tickets from n8n ─────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await callN8N('get_tickets', { employee_email: userEmail });
      if (res?.data?.tickets) setTickets(res.data.tickets);
    } catch {
      // silently fail — tickets remain as whatever they currently are
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // ── Fetch tickets on mount (and whenever userEmail becomes available) ───────
  useEffect(() => {
    if (userEmail) fetchTickets();
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when navigating to the track view ────────────────────────────
  useEffect(() => {
    if (view === 'track') fetchTickets();
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── open ticket detail ─────────────────────────────────────────────────────
  const openDetail = (ticket) => {
    setSelectedTicket(ticket);
    goTo('detail');
  };

  // ── cancel ticket ──────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!selectedTicket) return;
    setCancelLoading(true);
    try {
      await callN8N('cancel_ticket', {
        ticket_id: selectedTicket.id,
        employee_email: userEmail,
        status: 'cancelled',
      });
      const updated = { ...selectedTicket, status: 'Cancelled' };
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
      setSelectedTicket(updated);
    } catch {
      const updated = { ...selectedTicket, status: 'Cancelled' };
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
      setSelectedTicket(updated);
    } finally {
      setCancelLoading(false);
      setCancelModal(false);
    }
  };

  // ── file handling ──────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); }
  };

  // Convert file to base64 for API submission
  /*const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    // We split at the comma to remove the "data:image/jpeg;base64," prefix 
    // so Postgres receives only the raw base64 string.
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });*/
  // Fungsi ni akan resize gambar ke maksimum lebar 1024px dan compress jadi JPEG 70% kualiti
const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize jika gambar terlalu besar
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert ke base64 dengan format JPEG dan kualiti yang ditetapkan
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Buang prefix "data:image/jpeg;base64," untuk n8n
        resolve(dataUrl.split(',')[1]);
      };
    };
    reader.onerror = error => reject(error);
  });
};

  useEffect(() => {
  console.log("Ticketing Component Mounted!");
}, []);

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setApiError('');
    const now = new Date();
    const ts  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${now.toTimeString().split(' ')[0]}`;

    const catIdx = CATEGORIES.findIndex(c => c.key === form.issueCategory);
    const issueTypeId = catIdx >= 0 ? catIdx + 1 : null;

    // 1. Convert the file if it exists
    let photoBase64 = null;
    if (file) {
      try {
        photoBase64 = await compressImage(file);
      } catch (err) {
        setApiError('Failed to process image attachment.');
        setLoading(false);
        return;
      }
    }

    const newTicket = {
      ...form,
      id         : genId(),
      date       : ts,
      status     : 'Open',
      issue_type_id: issueTypeId,
      // You can append the prefix back for immediate frontend rendering in the Success view
      photo      : photoBase64 ? `data:${file.type};base64,${photoBase64}` : null 
    };

    try {
      const res = await callN8N('create_ticket', {
        employee_email: userEmail,
        employee_name : userName,
        level            : form.level,
        facility_area    : form.facilityArea,
        zone             : form.zone,
        issue_type_id    : issueTypeId,
        description      : form.issueDescription,
        remarks          : form.remarks,
        priority         : form.priority,
        photo            : photoBase64 // 2. Add the base64 string to the n8n payload
      });
      if (res?.data?.ticket_id) newTicket.id = res.data.ticket_id;
    } catch {
      // proceed offline
    }

    setTickets(prev => [newTicket, ...prev]);
    setLastTicket(newTicket);
    setFormStep(0);
    setForm(f => ({ ...f, level: '', facilityArea: '', zone: '', issueCategory: '', issueDescription: '', priority: 'Medium', remarks: '' }));
    setFile(null); setPreviewUrl(null);
    setLoading(false);
    goTo('success');
  };

  // ── validation per step ────────────────────────────────────────────────────
  const stepValid = [
    form.level && form.facilityArea,
    form.issueCategory && form.issueDescription,
    true,
  ];

  // ── filtered tickets ───────────────────────────────────────────────────────
  const filtered = tickets.filter(t => {
    const matchTab = trackTab === 'Open' ? t.status === 'Open' : t.status === 'Closed';
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || t.id.toLowerCase().includes(q) || t.issueCategory.toLowerCase().includes(q) || t.issueDescription.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // ─────────────────────────────────────────────────────────────────────────
  const navTitle = { main: 'Ticketing', form: 'New Ticket', track: 'My Tickets', success: '', detail: 'Ticket Detail' }[view];

  return (
    <div className="tkt-root">
      {/* ── TOP NAV ── */}
      {view !== 'success' && (
        <nav className="tkt-nav">
          <button className="tkt-nav-back" onClick={handleBack}>
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <span className="tkt-nav-title">{navTitle}</span>
          {view === 'form' && (
            <span className="tkt-nav-step">{formStep + 1} / 3</span>
          )}
          {view === 'track' && (
            <button className="tkt-nav-action" onClick={fetchTickets} disabled={loading}>
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>
          )}
        </nav>
      )}

      {/* ── FORM PROGRESS ── */}
      {view === 'form' && (
        <div className="tkt-progress">
          {['Location', 'Issue', 'Details'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`tkt-step ${i < formStep ? 'done' : i === formStep ? 'active' : ''}`}>
                <div className="tkt-step-dot">
                  {i < formStep ? <Check size={12} strokeWidth={3} /> : <span>{i + 1}</span>}
                </div>
                <span className="tkt-step-label">{label}</span>
              </div>
              {i < 2 && <div className={`tkt-step-line ${i < formStep ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className={`tkt-content ${animClass}`}>

        {/* ══ MAIN MENU ══════════════════════════════════════════════════════ */}
        {view === 'main' && (
          <div className="tkt-main">
            <div className="tkt-hero">
              <div className="tkt-hero-bg" />
              <div className="tkt-hero-text">
                <span className="tkt-hero-badge">Support Centre</span>
                <h2>How can we help you today?</h2>
                <p>Report issues or track existing requests</p>
              </div>
              <img src="/icon_img/ticketingpage.png" alt="" className="tkt-hero-img" />
            </div>

            <div className="tkt-menu-cards">
              <button className="tkt-menu-card" onClick={() => goTo('form')}>
                <div className="tkt-card-icon" style={{ background: 'linear-gradient(135deg, #4f3da8, #2b1d62)' }}>
                  <Plus size={22} color="#fff" />
                </div>
                <div className="tkt-card-body">
                  <h3>Submit New Ticket</h3>
                  <p>Report a facility or IT issue</p>
                </div>
                <ArrowRight size={18} className="tkt-card-arrow" />
              </button>

              <button className="tkt-menu-card" onClick={() => goTo('track')}>
                <div className="tkt-card-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                  <Ticket size={22} color="#fff" />
                </div>
                <div className="tkt-card-body">
                  <h3>Track Your Tickets</h3>
                  <p>View open &amp; closed requests</p>
                </div>
                <ArrowRight size={18} className="tkt-card-arrow" />
              </button>
            </div>

            {/* Quick stats */}
            <div className="tkt-stats">
              {loading ? (
                <div className="tkt-stat" style={{ flex: 1, justifyContent: 'center' }}>
                  <Loader2 size={20} className="spin" />
                </div>
              ) : (
                <>
                  <div className="tkt-stat">
                    <span className="tkt-stat-n">{tickets.filter(t => t.status === 'Open').length}</span>
                    <span className="tkt-stat-l">Open</span>
                  </div>
                  <div className="tkt-stat-div" />
                  <div className="tkt-stat">
                    <span className="tkt-stat-n">{tickets.filter(t => t.status === 'Closed').length}</span>
                    <span className="tkt-stat-l">Resolved</span>
                  </div>
                  <div className="tkt-stat-div" />
                  <div className="tkt-stat">
                    <span className="tkt-stat-n">{tickets.length}</span>
                    <span className="tkt-stat-l">Total</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ FORM ═══════════════════════════════════════════════════════════ */}
        {view === 'form' && (
          <div className="tkt-form-wrap">

            {/* STEP 0 – Location */}
            {formStep === 0 && (
              <div className="tkt-form-step">
                <p className="tkt-form-hint">Where is the issue located?</p>

                <div className="tkt-field">
                  <label>Submitted By</label>
                  <div className="tkt-submitted-by-row">
                    <div className="tkt-avatar-circle">
                      {(userName || userEmail || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="tkt-submitted-by-info">
                      <span className="tkt-submitted-name">{userName || userEmail || 'Unknown User'}</span>
                      <span className="tkt-submitted-email">{userEmail || 'No email'}</span>
                    </div>
                  </div>
                </div>

                <div className="tkt-field">
                  <label>Level <span className="tkt-req">*</span></label>
                  <SelectBox value={form.level} options={LEVELS} placeholder="Select level"
                    onChange={v => setForm(f => ({ ...f, level: v }))} />
                </div>

                <div className="tkt-field">
                  <label>Facility Area <span className="tkt-req">*</span></label>
                  <SelectBox value={form.facilityArea} options={FACILITIES} placeholder="Select area"
                    onChange={v => setForm(f => ({ ...f, facilityArea: v }))} />
                </div>

                <div className="tkt-field">
                  <label>Zone</label>
                  <SelectBox value={form.zone} options={ZONES} placeholder="Select zone (optional)"
                    onChange={v => setForm(f => ({ ...f, zone: v }))} />
                </div>
              </div>
            )}

            {/* STEP 1 – Issue */}
            {formStep === 1 && (
              <div className="tkt-form-step">
                <p className="tkt-form-hint">What type of issue is it?</p>

                <div className="tkt-field">
                  <label>Issue Category <span className="tkt-req">*</span></label>
                  <div className="tkt-cat-grid">
                    {CATEGORIES.map(c => {
                      const Icon = c.icon;
                      const sel = form.issueCategory === c.key;
                      return (
                        <button key={c.key}
                          className={`tkt-cat-btn ${sel ? 'selected' : ''}`}
                          style={{ '--cat-color': c.color }}
                          onClick={() => setForm(f => ({ ...f, issueCategory: c.key, issueDescription: '' }))}>
                          <Icon size={20} />
                          <span>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.issueCategory && (
                  <div className="tkt-field">
                    <label>Issue Description <span className="tkt-req">*</span></label>
                    <div className="tkt-desc-list">
                      {DESCRIPTIONS[form.issueCategory].map(d => (
                        <button key={d}
                          className={`tkt-desc-btn ${form.issueDescription === d ? 'selected' : ''}`}
                          onClick={() => setForm(f => ({ ...f, issueDescription: d }))}>
                          {form.issueDescription === d && <Check size={14} strokeWidth={3} />}
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 – Details */}
            {formStep === 2 && (
              <div className="tkt-form-step">
                <p className="tkt-form-hint">Add extra details &amp; attachments</p>

                <div className="tkt-field">
                  <label>Priority</label>
                  <div className="tkt-priority-row">
                    {PRIORITIES.map(p => (
                      <button key={p.key}
                        className={`tkt-pri-btn ${form.priority === p.key ? 'selected' : ''}`}
                        style={{ '--pri-color': p.color, '--pri-bg': p.bg }}
                        onClick={() => setForm(f => ({ ...f, priority: p.key }))}>
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tkt-field">
                  <label>Remarks</label>
                  <textarea className="tkt-textarea" rows={4}
                    placeholder="Describe the issue in more detail…"
                    value={form.remarks}
                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>

                <div className="tkt-field">
                  <label>Attachment</label>
                  <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*" onChange={handleFile} />
                  {!file ? (
                    <div className="tkt-upload-zone" onClick={() => fileRef.current.click()}>
                      <Upload size={24} />
                      <span>Tap to upload photo</span>
                      <small>JPG, PNG up to 10 MB</small>
                    </div>
                  ) : (
                    <div className="tkt-file-preview" onClick={() => setImgModal(true)}>
                      <img src={previewUrl} alt="preview" className="tkt-file-thumb" />
                      <span className="tkt-file-name">{file.name}</span>
                      <button className="tkt-file-remove" onClick={e => { e.stopPropagation(); setFile(null); setPreviewUrl(null); }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Summary card */}
                <div className="tkt-summary-card">
                  <h4>Summary</h4>
                  <div className="tkt-summary-row"><MapPin size={13} /><span>{form.level} · {form.facilityArea}{form.zone ? ` · ${form.zone}` : ''}</span></div>
                  <div className="tkt-summary-row"><Tag size={13} /><span>{form.issueCategory} — {form.issueDescription}</span></div>
                </div>

                {apiError && <div className="tkt-error"><AlertCircle size={15} />{apiError}</div>}
              </div>
            )}

            {/* NAVIGATION BUTTONS */}
            <div className="tkt-form-footer">
              {formStep < 2 ? (
                <button
                  className="tkt-btn-primary"
                  disabled={!stepValid[formStep]}
                  onClick={() => setFormStep(s => s + 1)}>
                  Continue <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="tkt-btn-primary"
                  disabled={loading}
                  onClick={handleSubmit}>
                  {loading ? <><Loader2 size={17} className="spin" /> Submitting…</> : <><Send size={17} /> Submit Ticket</>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══ SUCCESS ════════════════════════════════════════════════════════ */}
        {view === 'success' && lastTicket && (
          <div className="tkt-success">
            <div className="tkt-success-ring">
              <div className="tkt-success-inner">
                <CheckCircle2 size={56} strokeWidth={1.5} />
              </div>
            </div>
            <h2>Ticket Submitted!</h2>
            <p>Your request has been logged and our team will respond shortly.</p>

            <div className="tkt-success-chip">
              <Ticket size={15} />
              <span>Ticket ID: <strong>{lastTicket.id}</strong></span>
            </div>

            <div className="tkt-success-meta">
              <div className="tkt-sm-row"><MapPin size={13} /><span>{lastTicket.level} · {lastTicket.facilityArea}</span></div>
              <div className="tkt-sm-row"><Tag size={13} /><span>{lastTicket.issueCategory} — {lastTicket.issueDescription}</span></div>
            </div>

            <div className="tkt-success-actions">
              <button className="tkt-btn-ghost" onClick={() => goTo('main')}>Back to Home</button>
              <button className="tkt-btn-primary-sm" onClick={() => goTo('track')}>
                Track Ticket <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ══ TRACK ══════════════════════════════════════════════════════════ */}
        {view === 'track' && (
          <div className="tkt-track">
            {/* Tabs */}
            <div className="tkt-tabs">
              {['Open', 'Closed'].map(tab => (
                <button key={tab}
                  className={`tkt-tab ${trackTab === tab ? 'active' : ''}`}
                  onClick={() => setTrackTab(tab)}>
                  {tab}
                  <span className="tkt-tab-badge">
                    {tickets.filter(t => t.status === tab).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="tkt-search-wrap">
              <Search size={16} className="tkt-search-icon" />
              <input className="tkt-search" placeholder="Search tickets…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && <button className="tkt-search-clear" onClick={() => setSearchQuery('')}><X size={14} /></button>}
            </div>

            {/* List */}
            {loading ? (
              <div className="tkt-loading"><Loader2 size={28} className="spin" /><span>Loading…</span></div>
            ) : filtered.length === 0 ? (
              <div className="tkt-empty">
                <Ticket size={48} strokeWidth={1} />
                <p>No {trackTab.toLowerCase()} tickets found</p>
              </div>
            ) : (
              <div className="tkt-ticket-list">
                {filtered.map(t => {
                  const meta = catMeta(t.issueCategory);
                  const Icon = meta.icon;
                  const ss = statusStyle(t.status);
                  const pri = PRIORITIES.find(p => p.key === t.priority) || PRIORITIES[1];
                  return (
                    <div key={t.id} className="tkt-card tkt-card-clickable" onClick={() => openDetail(t)}>
                      <div className="tkt-card-left">
                        <div className="tkt-card-cat-icon" style={{ background: meta.color + '20', color: meta.color }}>
                          <Icon size={18} />
                        </div>
                      </div>
                      <div className="tkt-card-body2">
                        <div className="tkt-card-top">
                          <span className="tkt-card-title">{t.issueCategory}</span>
                          <span className="tkt-card-status" style={{ color: ss.color, background: ss.bg }}>
                            <span className="tkt-status-dot" style={{ background: ss.dot }} />
                            {t.status}
                          </span>
                        </div>
                        <p className="tkt-card-desc">{t.issueDescription}</p>
                        <div className="tkt-card-meta">
                          <span><MapPin size={11} />{t.level}</span>
                          <span><Calendar size={11} />{fmtDate(t.date)}</span>
                        </div>
                        <div className="tkt-card-footer">
                          <span className="tkt-card-id">#{t.id}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {t.priority && (
                              <span className="tkt-pri-tag" style={{ color: pri.color, background: pri.color + '18' }}>
                                {t.priority}
                              </span>
                            )}
                            <Eye size={13} color="var(--text-muted)" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* ══ DETAIL ═════════════════════════════════════════════════════════ */}
        {view === 'detail' && selectedTicket && (() => {
          const t = selectedTicket;
          const meta = catMeta(t.issueCategory);
          const Icon = meta.icon;
          const ss = statusStyle(t.status);
          const pri = PRIORITIES.find(p => p.key === t.priority) || PRIORITIES[1];
          const canCancel = t.status === 'Open';

          return (
            <div className="tkt-detail">

              {/* ── Status banner ── */}
              <div className="tkt-detail-banner" style={{ background: meta.color }}>
                <div className="tkt-detail-banner-icon"><Icon size={32} color="#fff" /></div>
                <div className="tkt-detail-banner-text">
                  <span className="tkt-detail-cat">{t.issueCategory}</span>
                  <span className="tkt-detail-desc">{t.issueDescription}</span>
                </div>
                <span className="tkt-detail-status-pill" style={{ color: ss.color, background: 'rgba(255,255,255,.92)' }}>
                  <span className="tkt-status-dot" style={{ background: ss.dot }} />
                  {t.status}
                </span>
              </div>

              <div className="tkt-detail-body">

                {/* Ticket ID + priority */}
                <div className="tkt-detail-row-header">
                  <div className="tkt-detail-id-block">
                    <Hash size={13} color="var(--text-muted)" />
                    <span>{t.id}</span>
                  </div>
                  {t.priority && (
                    <span className="tkt-pri-tag" style={{ color: pri.color, background: pri.color + '18' }}>
                      {t.priority} Priority
                    </span>
                  )}
                </div>

                {/* Info section */}
                <div className="tkt-detail-section">
                  <h4 className="tkt-detail-section-title">Location</h4>
                  <div className="tkt-detail-info-grid">
                    <div className="tkt-detail-info-item">
                      <span className="tkt-dii-label">Level</span>
                      <span className="tkt-dii-value">{t.level || '—'}</span>
                    </div>
                    <div className="tkt-detail-info-item">
                      <span className="tkt-dii-label">Facility Area</span>
                      <span className="tkt-dii-value">{t.facilityArea || t.facility_area || '—'}</span>
                    </div>
                    {(t.zone) && (
                      <div className="tkt-detail-info-item">
                        <span className="tkt-dii-label">Zone</span>
                        <span className="tkt-dii-value">{t.zone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="tkt-detail-section">
                  <h4 className="tkt-detail-section-title">Submission Info</h4>
                  <div className="tkt-detail-info-grid">
                    <div className="tkt-detail-info-item">
                      <span className="tkt-dii-label">Submitted By</span>
                      <span className="tkt-dii-value">{t.submittedBy || userName || '—'}</span>
                    </div>
                    <div className="tkt-detail-info-item">
                      <span className="tkt-dii-label">Email</span>
                      <span className="tkt-dii-value tkt-dii-small">{t.email || userEmail || '—'}</span>
                    </div>
                    <div className="tkt-detail-info-item">
                      <span className="tkt-dii-label">Date Submitted</span>
                      <span className="tkt-dii-value">{fmtDate(t.date)}</span>
                    </div>
                    {t.updated_at && t.updated_at !== t.date && (
                      <div className="tkt-detail-info-item">
                        <span className="tkt-dii-label">Last Updated</span>
                        <span className="tkt-dii-value">{fmtDate(t.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                {t.remarks && (
                  <div className="tkt-detail-section">
                    <h4 className="tkt-detail-section-title"><MessageSquare size={13} /> Remarks</h4>
                    <p className="tkt-detail-remarks">{t.remarks}</p>
                  </div>
                )}

                {/* Photo attachment */}
                <div className="tkt-detail-section">
                  <h4 className="tkt-detail-section-title"><ImageIcon size={13} /> Photo Attachment</h4>
                  {t.photo ? (
                    <div className="tkt-detail-photo-wrap" onClick={() => setPhotoModal(true)}>
                      <img src={t.photo} alt="Ticket attachment" className="tkt-detail-photo" />
                      <div className="tkt-detail-photo-overlay">
                        <Eye size={20} color="#fff" />
                        <span>Tap to view full image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="tkt-detail-no-photo">
                      <ImageOff size={28} />
                      <span>No photo attached</span>
                    </div>
                  )}
                </div>

              </div>

              {/* ── Cancel button (Open tickets only) ── */}
              {canCancel && (
                <div className="tkt-detail-footer">
                  <button className="tkt-cancel-btn" onClick={() => setCancelModal(true)}>
                    <Ban size={17} />
                    Cancel This Ticket
                  </button>
                </div>
              )}

            </div>
          );
        })()}
      </div>{/* end tkt-content */}

      {/* ── Upload image preview Modal ── */}
      {imgModal && previewUrl && (
        <div className="tkt-modal-overlay" onClick={() => setImgModal(false)}>
          <div className="tkt-modal" onClick={e => e.stopPropagation()}>
            <div className="tkt-modal-head">
              <span>Attachment Preview</span>
              <button onClick={() => setImgModal(false)}><X size={20} /></button>
            </div>
            <img src={previewUrl} alt="preview" className="tkt-modal-img" />
          </div>
        </div>
      )}

      {/* ── Full-screen photo modal (from DB) ── */}
      {photoModal && selectedTicket?.photo && (
        <div className="tkt-modal-overlay" onClick={() => setPhotoModal(false)}>
          <div className="tkt-photo-fullscreen" onClick={e => e.stopPropagation()}>
            <div className="tkt-modal-head">
              <span>Photo — #{selectedTicket.id}</span>
              <button onClick={() => setPhotoModal(false)}><X size={20} /></button>
            </div>
            <div className="tkt-photo-fullscreen-body">
              <img src={selectedTicket.photo} alt="Ticket photo" />
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel confirmation modal ── */}
      {cancelModal && (
        <div className="tkt-modal-overlay" onClick={() => !cancelLoading && setCancelModal(false)}>
          <div className="tkt-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="tkt-cancel-modal-icon">
              <XCircle size={40} color="#ef4444" />
            </div>
            <h3>Cancel Ticket?</h3>
            <p>Are you sure you want to cancel <strong>#{selectedTicket?.id}</strong>? This cannot be undone.</p>
            <div className="tkt-cancel-modal-actions">
              <button className="tkt-cancel-modal-no" onClick={() => setCancelModal(false)} disabled={cancelLoading}>
                Keep It
              </button>
              <button className="tkt-cancel-modal-yes" onClick={handleCancel} disabled={cancelLoading}>
                {cancelLoading ? <><Loader2 size={15} className="spin" /> Cancelling…</> : <><Ban size={15} /> Yes, Cancel</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Reusable SelectBox ────────────────────────────────────────────────────────
const SelectBox = ({ value, options, placeholder, onChange }) => (
  <div className="tkt-select-wrap">
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown size={16} className="tkt-select-chevron" />
  </div>
);

export default Ticketing;