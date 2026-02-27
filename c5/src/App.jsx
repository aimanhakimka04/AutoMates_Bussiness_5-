import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link,
  useNavigate, useLocation, Navigate
} from 'react-router-dom';
import { PublicClientApplication } from '@azure/msal-browser';
import {
  Calendar, Scan, Bell, ChevronLeft,
  Zap, Bot, Send, X, Mic,
  Home as HomeIcon, LayoutDashboard, Info as InfoIcon, UserCircle,
  LogOut, Lock, User, ChevronRight, MapPin
} from 'lucide-react';

import MeetingRoom from './MeetingRoom';
import Transport   from './Transport';
import EVisitor    from './EVisitor';
import Ticketing   from './Ticketing';
import Chart       from './Chart';
import Wellness    from './Wellness';
import Meal        from './Meal';
import Energy      from './Energy';
import FlexHR      from './FlexHR';
import Mynews      from './Mynews';
import Childcare   from './Childcare';
import EPP         from './EPP';
import './App.css';

// ══════════════════════════════════════════════════════════════════
//  MICROSOFT OAUTH2 CONFIG  (matches your n8n credential exactly)
//  Client ID    : c21063b3-e6df-4a0e-980a-eb69cb6bdd01
//  Auth URL     : https://login.microsoftonline.com/common/oauth2/v2.0/authorize
//  Token URL    : https://login.microsoftonline.com/common/oauth2/v2.0/token
// ══════════════════════════════════════════════════════════════════
const msalConfig = {
  auth: {
    clientId:              'c21063b3-e6df-4a0e-980a-eb69cb6bdd01',
    authority:             'https://login.microsoftonline.com/common',
    redirectUri:           'http://localhost:3000/login',
    postLogoutRedirectUri: window.location.origin + '/login',
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation:          'sessionStorage',
    storeAuthStateInCookie: true,
  },
  system: {
    allowNativeBroker: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);
let _msalReady = false;
const ensureMsal = async () => {
  if (!_msalReady) {
    await msalInstance.initialize();
    _msalReady = true;
  }
};

// ══════════════════════════════════════════════════════════════════
//  0. SPLASH SCREEN
// ══════════════════════════════════════════════════════════════════
const SplashScreen = () => (
  <div style={S.splash.root}>
    <div style={S.splash.ring}>
      <img src="/icon_img/flexhr.png" alt="FlexHR" style={S.splash.logo} />
    </div>
    <h1 style={S.splash.title}>FlexHR</h1>
    <p  style={S.splash.sub}>Loading your workspace…</p>
    <div style={S.splash.dots}>
      {[0,1,2].map(i => <span key={i} style={{...S.splash.dot, animationDelay:`${i*0.2}s`}} />)}
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
//  1. LOGIN  — centered icon + Microsoft popup
// ══════════════════════════════════════════════════════════════════
const Login = ({ setAuth, setUserInfo }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await ensureMsal();

      // Use loginRedirect — Microsoft is clearly using redirect flow
      await msalInstance.loginRedirect({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
        redirectUri: 'http://localhost:3000/login',
      });
      // ⚠️ Code below this line won't run — page will redirect to Microsoft
      // When it comes back, handleRedirectPromise() in App useEffect catches it

    } catch (err) {
      console.error('MSAL error:', err);
      if (err.errorCode === 'user_cancelled' || err.errorCode === 'access_denied') {
        setError('Sign-in was cancelled.');
      } else {
        setError('Sign-in failed: ' + (err.errorCode || err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.login.page}>
      <div style={S.login.blobTR} />
      <div style={S.login.blobBL} />
      <div style={S.login.card}>

        {/* ── Centered App Icon ─────────────────────── */}
        <div style={S.login.iconWrap}>
          <div style={S.login.iconRing}>
            <img src="/icon_img/flexhr.png" alt="FlexHR" style={S.login.iconImg} />
          </div>
        </div>

        <h1 style={S.login.appName}>FlexHR</h1>
        <p  style={S.login.tagline}>Your Intelligent Workplace Portal</p>
        <div style={S.login.divider} />
        <p  style={S.login.instruction}>
          Sign in with your Microsoft account to continue.
        </p>

        {error && <div style={S.login.errorBox}>{error}</div>}

        {/* ── Microsoft Sign-in Button ──────────────── */}
        <button
          onClick={handleMicrosoftLogin}
          disabled={loading}
          style={{...S.login.msBtn, opacity: loading ? 0.72 : 1, cursor: loading ? 'not-allowed' : 'pointer'}}
          onMouseEnter={e => { if(!loading) e.currentTarget.style.background='#f3f4f6'; }}
          onMouseLeave={e => { if(!loading) e.currentTarget.style.background='#ffffff'; }}
        >
          {loading ? (
            <><span style={S.login.spinner} /> Signing in…</>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Sign in with Microsoft
            </>
          )}
        </button>

        <p style={S.login.footerNote}>🔒 Protected by Corporate Security Policy</p>
      </div>
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
//  3. NOTIFICATION PANEL
// ══════════════════════════════════════════════════════════════════
const NotificationPanel = ({ onClose }) => {
  const notifications = [
    { id: 1, title: 'Meeting Reminder',  desc: 'UAT Briefing starts in 15 mins',      time: 'Just now'    },
    { id: 2, title: 'Booking Confirmed', desc: 'Your shuttle booking is confirmed',    time: '2 hours ago' },
    { id: 3, title: 'Policy Updated',    desc: 'Remote Work Policy has been updated', time: 'Yesterday'   },
  ];
  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="notification-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-purple">
          <span className="modal-title">Notifications</span>
          <X size={20} color="white" onClick={onClose} style={{cursor:'pointer'}} />
        </div>
        <div className="notification-list">
          {notifications.map(n => (
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
//  4. DASHBOARD
// ══════════════════════════════════════════════════════════════════
const DashboardPage = () => {
  const stats = [
    { label: 'Leave Balance',  value: '14 / 20', sub: 'Days Remaining',       color: '#2b1d62' },
    { label: 'My Training',    value: '2',       sub: 'Upcoming in CHART',    color: '#1890ff' },
    { label: 'Open Tickets',   value: '3',       sub: 'Ticketing Status',     color: '#f39c12' },
    { label: 'Upcoming Ride',  value: '1',       sub: 'Shuttle at 11:00 AM',  color: '#4caf50' },
  ];
  return (
    <div style={{padding:'20px'}}>
      <div style={{fontSize:22,fontWeight:800,color:'#2b1d62',marginBottom:20}}>My Workspace</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15}}>
        {stats.map((s,i) => (
          <div key={i} className="employee-stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{color:s.color}}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:25}}>
        <h3 style={{fontSize:16,color:'#2b1d62',marginBottom:12}}>Next Event</h3>
        <div className="dashboard-event-item">
          <div className="event-time-tag">10:00 AM</div>
          <div className="event-info">
            <div className="event-title">UAT Briefing</div>
            <div className="event-loc">Idea Lab 6, Level 19</div>
          </div>
        </div>
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
    { id:'1', label:'Data Protection Policy',       issuedDate:'2025-01-15', department:'IT Security', scope:'All Employees',        desc:'This policy outlines the requirements for handling personal and sensitive data...' },
    { id:'2', label:'Remote Work Policy',           issuedDate:'2025-03-01', department:'HR',          scope:'Remote-Eligible Roles', desc:'Employees approved for remote work must maintain a secure home office environment...' },
    { id:'3', label:'Code of Conduct',              issuedDate:'2024-12-10', department:'Legal',       scope:'All Employees',         desc:'The Code of Conduct sets expectations for professional behavior...' },
    { id:'4', label:'Expense Reimbursement Policy', issuedDate:'2025-02-20', department:'Finance',     scope:'All Employees',         desc:'Employees may claim reasonable business expenses incurred during company activities...' },
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
              <X size={20} color="white" onClick={() => setSelectedInfo(null)} style={{cursor:'pointer'}} />
            </div>
            <div className="modal-body-content">
              <h2 className="activity-main-name">{selectedInfo.label}</h2>
              <div className="detail-item-row"><Calendar size={18} color="#1890ff" /><span>Issued: {selectedInfo.issuedDate}</span></div>
              <div className="detail-item-row"><User     size={18} color="#1890ff" /><span>Department: {selectedInfo.department}</span></div>
              <div className="detail-item-row"><MapPin   size={18} color="#1890ff" /><span>Scope: {selectedInfo.scope}</span></div>
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
  const handleLogout = async () => {
    try {
      await ensureMsal();
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await msalInstance.logoutPopup({ account: accounts[0] });
      }
    } catch { /* skip if MSAL not ready */ }
    setAuth(false);
    navigate('/login');
  };
  return (
    <>
      <div className="profile-section">
        <div className="profile-avatar-box"><UserCircle size={80} color="#2b1d62" /></div>
        <h3>{userInfo?.name  || 'ALAN TAN WAI LOON'}</h3>
        <p>{userInfo?.email || 'Software Engineer | CH-9920'}</p>
      </div>
      <div className="profile-menu">
        <div className="p-menu-item" onClick={() => alert('Check your email for reset code!')}><Lock size={18} /> <span>Reset Password</span></div>
        <div className="p-menu-item logout" onClick={handleLogout}><LogOut size={18} /> <span>Logout</span></div>
      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════
//  7. HOME  – fancy redesigned grid menu
// ══════════════════════════════════════════════════════════════════
const Home = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', hour12:true });
  const dateStr = currentTime.toLocaleDateString('en-MY', { weekday:'long', day:'numeric', month:'long' });

  const menuGroups = [
    {
      title: 'Workplace',
      color: '#2b1d62',
      items: [
        { label:'Meeting Room', icon:'meeting room.png', path:'/meeting-room', accent:'#6c47d9' },
        { label:'Transport',    icon:'transportation.png', path:'/transport',  accent:'#4c3aa3' },
        { label:'e-Visitor',   icon:'evisitor.png',     path:'/evisitor',     accent:'#5e35b1' },
        { label:'Ticketing',   icon:'ticketing.png',    path:'/ticketing',    accent:'#7c4dff' },
      ]
    },
    {
      title: 'Wellbeing',
      color: '#0d7c66',
      items: [
        { label:'CHART',       icon:'chart.png',        path:'/chart',        accent:'#00897b' },
        { label:'Wellness',    icon:'wellness.png',     path:'/wellness',     accent:'#00acc1' },
        { label:'Meal',        icon:'meal.png',         path:'/meal',         accent:'#26a69a' },
        { label:'Childcare',   icon:'childcare.png',    path:'/childcare',    accent:'#0097a7' },
      ]
    },
    {
      title: 'Resources',
      color: '#b5560a',
      items: [
        { label:'Energy',      icon:'energy.png',       path:'/energy',       accent:'#e67e22' },
        { label:'flexHR',      icon:'flexhr.png',       path:'/flexhr',       accent:'#d35400' },
        { label:'MyNews',      icon:'mynews.png',       path:'/mynews',       accent:'#c0392b' },
        { label:'EPP',         icon:'epp.png',          path:'/epp',          accent:'#e74c3c' },
      ]
    },
  ];

  return (
    <div className="home-page">
      {/* ── Hero Banner ─────────────────────── */}
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
            <path d="M0,20 C80,40 160,0 240,20 C320,40 400,0 480,20 L480,40 L0,40 Z" fill="#f4f6fb"/>
          </svg>
        </div>
      </div>

      {/* ── Live Alert Strip ─────────────────── */}
      <div className="home-alert-strip">
        <div className="home-alert-icon">
          <Calendar size={13} color="#2b1d62" />
        </div>
        <div className="home-alert-marquee">
          <span className="home-alert-text">⚠ CAUTION — LIVE / PRODUCTION ENVIRONMENT &nbsp;&nbsp;•&nbsp;&nbsp; USE WITH CARE &nbsp;&nbsp;•&nbsp;&nbsp; ALL ACTIONS ARE REAL &nbsp;&nbsp;•&nbsp;&nbsp;</span>
        </div>
      </div>

      {/* ── Menu Groups ──────────────────────── */}
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
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' } });
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
            <div className="corner top-left"/><div className="corner top-right"/>
            <div className="corner bottom-left"/><div className="corner bottom-right"/>
            <div className="scan-line"/>
          </div>
        </div>
        <div className="scan-tip">Place QR code inside the frame</div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
//  9. CHATBOT  (N8N integration — fully preserved)
// ══════════════════════════════════════════════════════════════════
const ChatBot = ({ containerRef }) => {
  const [isOpen,   setIsOpen]   = useState(false);
  const [position, setPosition] = useState({ x: 340, y: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x:0, y:0 });
  const offsetRef   = useRef({ x:0, y:0 });
  const [messages,          setMessages]          = useState([
    { id:1, sender:'bot', msgType:'text', text:'Hai! Saya Employee Assistant anda. Sebut atau taip arahan untuk menempah bilik mesyuarat atau memohon cuti.' }
  ]);
  const [inputValue,        setInputValue]        = useState('');
  const [isRecording,       setIsRecording]       = useState(false);
  const [isLoading,         setIsLoading]         = useState(false);
  const [conversationState, setConversationState] = useState({});
  const messagesEndRef = useRef(null);

  const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook-test/employee-assistant';
  const TEMP_JWT_TOKEN  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwidXBuIjoicGVrZXJqYUBjaGluaGluLmNvbSIsInJvbGVzIjpbImVtcGxveWVlIl0sInRlbmFudF9pZCI6ImNoaW5oaW5faHEifQ.UqTWTIrSmD9WwDQQd93W17xFMkAqHeZJf2mSg08ldKU';

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isOpen]);

  const handleStart = (e) => {
    const cx = e.clientX ?? e.touches?.[0].clientX;
    const cy = e.clientY ?? e.touches?.[0].clientY;
    setIsDragging(true);
    startPosRef.current = { x:cx, y:cy };
    offsetRef.current   = { x:cx - position.x, y:cy - position.y };
  };
  const handleMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const cx = e.clientX ?? e.touches?.[0].clientX;
    const cy = e.clientY ?? e.touches?.[0].clientY;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: Math.min(Math.max(10, cx - offsetRef.current.x), rect.width  - 70),
      y: Math.min(Math.max(10, cy - offsetRef.current.y), rect.height - 70),
    });
  };
  const handleEnd      = () => setIsDragging(false);
  const handleBotClick = (e) => {
    const d = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (d < 5) setIsOpen(o => !o);
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang  = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Browser anda tidak menyokong rakaman suara. Sila guna Google Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    rec.onstart  = () => { setIsRecording(true); window.speechSynthesis.cancel(); };
    rec.onresult = (e) => handleSendMessage(e.results[0][0].transcript, 'voice');
    rec.onerror  = () => setIsRecording(false);
    rec.onend    = () => setIsRecording(false);
    rec.start();
  };

  const addAiMessage = (text, msgType) => setMessages(prev => [...prev, { id:Date.now(), sender:'bot', msgType, text }]);

  const handleSendMessage = async (text, inputType='text', confirmData=null) => {
    if (!text && !confirmData) return;
    if (!confirmData) { setMessages(prev => [...prev, { id:Date.now(), sender:'user', msgType:'text', text }]); setInputValue(''); }
    setIsLoading(true);
    const payload = confirmData
      ? { text:'User confirmed the plan', input_type:inputType, state:conversationState, confirm:true, edited_plan:confirmData.plan, client_request_id:`req-${Date.now()}` }
      : { text, input_type:inputType, state:conversationState, client_request_id:`req-${Date.now()}` };
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${TEMP_JWT_TOKEN}` },
        body: JSON.stringify(payload),
      });
      processN8nResponse(await res.json(), inputType);
    } catch {
      addAiMessage('System offline. Cannot connect to the assistant.', 'text');
    } finally { setIsLoading(false); }
  };

  const processN8nResponse = (data, inputType) => {
    let textToSpeak = '';
    if (data.state) setConversationState(data.state);
    switch (data.type) {
      case 'clarify':  textToSpeak = data.question; addAiMessage(data.question,'text'); break;
      case 'confirm':
        textToSpeak = data.summary + '. Do you want to proceed?';
        setMessages(prev => [...prev, { id:Date.now(), sender:'bot', msgType:'confirm_card', text:data.summary, plan:data.plan, confirm_token:data.confirm_token }]);
        break;
      case 'receipt':  textToSpeak = 'Success! '+data.summary; addAiMessage(textToSpeak,'text'); setConversationState({}); break;
      case 'error':
      case 'auth_error': textToSpeak = 'Sorry, '+(data.message||data.error); addAiMessage(textToSpeak,'text'); break;
      default: textToSpeak = "I received a response, but I'm not sure how to display it."; addAiMessage(textToSpeak,'text');
    }
    if (inputType==='voice' && textToSpeak) speakText(textToSpeak);
  };

  return (
    <>
      <div
        className="chatbot-float-btn"
        style={{ left:`${position.x}px`, top:`${position.y}px` }}
        onMouseDown={handleStart} onTouchStart={handleStart}
        onMouseMove={handleMove}  onTouchMove={handleMove}
        onMouseUp={handleEnd}     onTouchEnd={handleEnd}
        onClick={handleBotClick}
      >
        <Bot size={28} color="white" />
      </div>
      {isOpen && (
        <div className="chat-window-overlay">
          <div className="chat-header">
            <span>Smart Bot</span>
            <X size={20} onClick={() => setIsOpen(false)} style={{cursor:'pointer'}} />
          </div>
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`message ${m.sender}`}>
                <p style={{margin:0}}>{m.text}</p>
                {m.msgType==='confirm_card' && (
                  <div style={{marginTop:10,display:'flex',gap:8}}>
                    <button style={{padding:'6px 10px',background:'#28a745',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,flex:1}}
                      onClick={() => handleSendMessage(null,'text',m)}>Confirm</button>
                    <button style={{padding:'6px 10px',background:'#dc3545',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,flex:1}}
                      onClick={() => addAiMessage('Action cancelled.','text')}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && <div className="message bot" style={{opacity:0.7}}>Assistant menaip…</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area" style={{display:'flex',gap:8,alignItems:'center'}}>
            <button onClick={startRecording}
              style={{background:isRecording?'#ffebe9':'transparent',border:'none',cursor:'pointer',padding:8,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Mic size={20} color={isRecording?'#ff4d4f':'#666'} />
            </button>
            <input value={inputValue} onChange={e=>setInputValue(e.target.value)}
              placeholder="Type your request..."
              onKeyPress={e=>e.key==='Enter' && handleSendMessage(inputValue,'text')}
              disabled={isRecording||isLoading}
              style={{flex:1,padding:10,borderRadius:20,border:'1px solid #ddd',outline:'none'}} />
            <button className="send-btn" onClick={()=>handleSendMessage(inputValue,'text')}
              disabled={!inputValue.trim()||isLoading}
              style={{opacity:(!inputValue.trim()||isLoading)?0.5:1}}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════
//  10. PAGE WRAPPER
// ══════════════════════════════════════════════════════════════════
const PageWrapper = ({ children, showTopBar }) => (
  <div className="page-content" style={{ paddingTop: showTopBar ? '80px' : '0' }}>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════
//  11. BOTTOM NAV
// ══════════════════════════════════════════════════════════════════
const FooterNav = () => {
  const location = useLocation();
  const navs = [
    { label:'Home',      path:'/',          icon:<HomeIcon        size={22}/> },
    { label:'Dashboard', path:'/dashboard', icon:<LayoutDashboard size={22}/> },
    { label:'Info',      path:'/info',      icon:<InfoIcon        size={22}/> },
    { label:'Profile',   path:'/profile',   icon:<UserCircle      size={22}/> },
  ];
  return (
    <footer className="bottom-nav-fixed">
      {navs.map(n => (
        <Link to={n.path} key={n.label} className={`nav-item ${location.pathname===n.path?'active':''}`}>
          {n.icon} <span>{n.label}</span>
        </Link>
      ))}
    </footer>
  );
};

// ══════════════════════════════════════════════════════════════════
//  12. ROOT APP
// ══════════════════════════════════════════════════════════════════
function App() {
  // isAppLoading = true until BOTH splash timer AND auth check are done
  const [isAppLoading,      setIsAppLoading]      = useState(true);
  const [authChecked,       setAuthChecked]       = useState(false);
  const [isAuthenticated,   setIsAuthenticated]   = useState(false);
  const [userInfo,          setUserInfo]          = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const appRef   = useRef(null);
  const location = useLocation();

  // Run splash timer AND auth check in parallel — hide splash when BOTH done
  useEffect(() => {
    let splashDone  = false;
    let authDone    = false;
    const tryHide   = () => { if (splashDone && authDone) setIsAppLoading(false); };

    // Splash timer
    const t = setTimeout(() => { splashDone = true; tryHide(); }, 2000);

    // Auth check — handles redirect result (#code= in URL) AND session restore
    const checkAuth = async () => {
      try {
        await ensureMsal();

        // ✅ CRITICAL: process the #code= token Microsoft put in the URL
        const redirectResult = await msalInstance.handleRedirectPromise();
        if (redirectResult && redirectResult.account) {
          const acct = redirectResult.account;
          console.log('✅ Redirect login success:', acct.username);
          setUserInfo({ name: acct.name || acct.username, email: acct.username });
          setIsAuthenticated(true);
          // Clean up the ugly #code= from the URL
          window.history.replaceState({}, document.title, '/');
          return;
        }

        // Check existing session (page refresh)
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const acct = accounts[0];
          console.log('✅ Session found:', acct.username);
          setUserInfo({ name: acct.name || acct.username, email: acct.username });
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn('Auth check error:', err.message);
      } finally {
        authDone = true;
        setAuthChecked(true);
        tryHide();
      }
    };
    checkAuth();

    return () => clearTimeout(t);
  }, []);

  const hiddenPaths = ['/scan', '/login', '/signup'];
  const topBarPaths = ['/', '/dashboard', '/info', '/profile'];
  const showFooter  = isAuthenticated && !hiddenPaths.includes(location.pathname);
  const showTopBar  = showFooter && topBarPaths.includes(location.pathname);

  // Show splash until both auth check and splash timer are done
  if (isAppLoading) return <SplashScreen />;

  return (
    <div className="mobile-app" ref={appRef}>
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
              {/* If somehow landed on /login while authenticated → go home */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/"             element={<PageWrapper showTopBar={showTopBar}><Home /></PageWrapper>} />
              <Route path="/dashboard"    element={<PageWrapper showTopBar={showTopBar}><DashboardPage /></PageWrapper>} />
              <Route path="/info"         element={<PageWrapper showTopBar={showTopBar}><InfoPage /></PageWrapper>} />
              <Route path="/profile"      element={<PageWrapper showTopBar={showTopBar}><ProfilePage setAuth={setIsAuthenticated} userInfo={userInfo} /></PageWrapper>} />
              <Route path="/meeting-room" element={<PageWrapper showTopBar={false}><MeetingRoom /></PageWrapper>} />
              <Route path="/transport"    element={<PageWrapper showTopBar={false}><Transport /></PageWrapper>} />
              <Route path="/evisitor"     element={<PageWrapper showTopBar={false}><EVisitor /></PageWrapper>} />
              <Route path="/ticketing"    element={<PageWrapper showTopBar={false}><Ticketing /></PageWrapper>} />
              <Route path="/chart"        element={<PageWrapper showTopBar={false}><Chart /></PageWrapper>} />
              <Route path="/wellness"     element={<PageWrapper showTopBar={false}><Wellness /></PageWrapper>} />
              <Route path="/meal"         element={<PageWrapper showTopBar={false}><Meal /></PageWrapper>} />
              <Route path="/energy"       element={<PageWrapper showTopBar={false}><Energy /></PageWrapper>} />
              <Route path="/flexhr"       element={<PageWrapper showTopBar={false}><FlexHR /></PageWrapper>} />
              <Route path="/mynews"       element={<PageWrapper showTopBar={false}><Mynews /></PageWrapper>} />
              <Route path="/childcare"    element={<PageWrapper showTopBar={false}><Childcare /></PageWrapper>} />
              <Route path="/epp"          element={<PageWrapper showTopBar={false}><EPP /></PageWrapper>} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          )}
          {showFooter && <FooterNav />}
        </>
      )}

      <ChatBot containerRef={appRef} />
      {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
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
    root:  { height:'100vh', width:'100vw', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:'linear-gradient(160deg,#1a0f3c 0%,#2b1d62 55%,#3d2a8a 100%)', position:'fixed', top:0, left:0, zIndex:9999 },
    ring:  { width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'2px solid rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:22, animation:'splashPulse 2.4s ease-in-out infinite', boxShadow:'0 0 40px rgba(130,90,255,.45)' },
    logo:  { width:72, height:72, objectFit:'contain' },
    title: { color:'#fff', fontSize:30, fontWeight:800, margin:0, letterSpacing:1.5, animation:'fadeSlideUp .6s ease both' },
    sub:   { color:'#a89bc9', fontSize:13, marginTop:8, animation:'fadeSlideUp .6s .18s ease both' },
    dots:  { display:'flex', gap:7, marginTop:36 },
    dot:   { display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#a89bc9', animation:'splashBounce 1.4s ease-in-out infinite' },
  },
  login: {
    page:        { minHeight:'100vh', width:'100%', display:'flex', justifyContent:'center', alignItems:'center', background:'linear-gradient(160deg,#1a0f3c 0%,#2b1d62 50%,#3d2a8a 100%)', padding:20, position:'relative', overflow:'hidden' },
    blobTR:      { position:'absolute', top:-140, right:-140, width:320, height:320, borderRadius:'50%', background:'rgba(120,80,255,.14)', filter:'blur(70px)', pointerEvents:'none' },
    blobBL:      { position:'absolute', bottom:-120, left:-120, width:280, height:280, borderRadius:'50%', background:'rgba(40,120,255,.12)', filter:'blur(65px)', pointerEvents:'none' },
    card:        { position:'relative', zIndex:2, background:'#fff', borderRadius:24, padding:'44px 32px 36px', width:'100%', maxWidth:380, boxShadow:'0 24px 80px rgba(0,0,0,.36)', display:'flex', flexDirection:'column', alignItems:'center', animation:'cardIn .55s cubic-bezier(.22,1,.36,1) both' },
    iconWrap:    { display:'flex', justifyContent:'center', marginBottom:20 },
    iconRing:    { width:100, height:100, borderRadius:'50%', background:'linear-gradient(135deg,#2b1d62,#5a3faa)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 32px rgba(43,29,98,.38)' },
    iconImg:     { width:58, height:58, objectFit:'contain' },
    appName:     { fontSize:27, fontWeight:800, color:'#2b1d62', margin:'0 0 4px', letterSpacing:.5 },
    tagline:     { fontSize:13, color:'#7c6fa0', margin:'0 0 20px' },
    divider:     { width:'100%', height:1, background:'#ede9f6', margin:'2px 0 20px' },
    instruction: { fontSize:14, color:'#555', textAlign:'center', marginBottom:22, lineHeight:1.65 },
    errorBox:    { width:'100%', padding:'10px 14px', borderRadius:8, background:'#fff1f0', border:'1px solid #ffd6d6', color:'#c0392b', fontSize:13, marginBottom:14, textAlign:'center' },
    msBtn:       { display:'flex', alignItems:'center', justifyContent:'center', gap:12, width:'100%', padding:'14px 20px', background:'#fff', color:'#3c3c3c', border:'1.5px solid #d1d5db', borderRadius:10, fontSize:15, fontWeight:600, transition:'background .18s ease, box-shadow .18s ease', boxShadow:'0 2px 6px rgba(0,0,0,.06)' },
    spinner:     { display:'inline-block', width:18, height:18, border:'2.5px solid #ddd', borderTop:'2.5px solid #2b1d62', borderRadius:'50%', animation:'spinBtn .7s linear infinite' },
    footerNote:  { marginTop:26, fontSize:11, color:'#aaa' },
  },
};
