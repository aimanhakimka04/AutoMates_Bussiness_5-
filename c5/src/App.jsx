import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Calendar, Scan, Bell, ChevronLeft, 
  Zap, Bot, Send, X, Mic,
  Home as HomeIcon, LayoutDashboard, Info as InfoIcon, UserCircle,
  LogOut, ShieldCheck, Mail, Lock, User, ChevronRight,
  Clock, MapPin
} from 'lucide-react';

// 导入业务组件 (Pastikan fail komponen ini wujud di direktori anda)
import MeetingRoom from './MeetingRoom';
import Transport from './Transport';
import EVisitor from './EVisitor'; 
import Ticketing from './Ticketing';
import Chart from './Chart';
import Wellness from './Wellness';
import Meal from './Meal';
import Energy from './Energy';
import FlexHR from './FlexHR';
import Mynews from './Mynews';
import Childcare from './Childcare';
import EPP from './EPP';

import './App.css';

// --- 1. 全局 Welcome Bar 组件 (固定顶部) ---
const GlobalWelcomeBar = ({ openNotifications }) => {
  const navigate = useNavigate();
  
  return (
    <nav className="welcome-bar-fixed">
      <div className="welcome-text">
        <span className="welcome-label">Welcome</span>
        <h2 className="welcome-name">ALAN TAN WAI LOON</h2>
      </div>
      <div className="welcome-icons">
        <div className="icon-wrapper" onClick={() => navigate('/scan')}>
          <Scan size={20} color="white" />
        </div>
        <div className="bell-container" onClick={openNotifications}>
          <Bell size={20} color="white" />
          <span className="bell-dot"></span>
        </div>
      </div>
    </nav>
  );
};

// --- 通知弹窗组件 ---
const NotificationPanel = ({ onClose }) => {
  const notifications = [
    { id: 1, title: 'Meeting Reminder', desc: 'UAT Briefing starts in 15 mins', time: 'Just now' },
    { id: 2, title: 'Booking Confirmed', desc: 'Your shuttle booking is confirmed', time: '2 hours ago' },
    { id: 3, title: 'Policy Updated', desc: 'Remote Work Policy has been updated', time: 'Yesterday' }
  ];

  return (
    <div className="modal-overlay-custom" onClick={onClose}>
      <div className="notification-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-purple">
          <span className="modal-title">Notifications</span>
          <X size={20} color="white" onClick={onClose} style={{ cursor: 'pointer' }} />
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

// --- 2. 认证页面 (Authentication Page) ---
const Login = ({ setAuth }) => {
  const navigate = useNavigate();

  const handleMicrosoftLogin = () => {
    // NOTA: Di sini anda akan masukkan fungsi integrasi sebenar Microsoft (MSAL).
    setAuth(true);
    navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Welcome to FlexHR</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>
          Please sign in using your corporate Microsoft account to access the workspace.
        </p>
        
        <button 
          onClick={handleMicrosoftLogin}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', width: '100%', padding: '12px', backgroundColor: '#ffffff',
            color: '#5e5e5e', border: '1px solid #8c8c8c', borderRadius: '4px',
            fontSize: '16px', fontWeight: '600', cursor: 'pointer',
            transition: 'background-color 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
          Sign in with Microsoft
        </button>
        <p style={{ marginTop: '30px', fontSize: '12px', color: '#999' }}>Protected by Corporate Security</p>
      </div>
    </div>
  );
};

// --- 3. 底部栏功能页面 (Dashboard, Info, Profile) ---
const DashboardPage = () => {
  const employeeStats = [
    { label: 'Leave Balance', value: '14 / 20', sub: 'Days Remaining', color: '#2b1d62' },
    { label: 'My Training', value: '2', sub: 'Upcoming in CHART', color: '#1890ff' },
    { label: 'Open Tickets', value: '3', sub: 'Ticketing Status', color: '#f39c12' },
    { label: 'Upcoming Ride', value: '1', sub: 'Shuttle at 11:00 AM', color: '#4caf50' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#2b1d62', marginBottom: 20 }}>
        My Workspace
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
        {employeeStats.map((stat, idx) => (
          <div key={idx} className="employee-stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-sub">{stat.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 25 }}>
        <h3 style={{ fontSize: 16, color: '#2b1d62', marginBottom: 12 }}>Next Event</h3>
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

const InfoPage = () => {
  const [selectedInfo, setSelectedInfo] = useState(null);
  const infoItems = [
    { id: '1', label: 'Data Protection Policy', issuedDate: '2025-01-15', department: 'IT Security', scope: 'All Employees', desc: 'This policy outlines the requirements for handling personal and sensitive data...' },
    { id: '2', label: 'Remote Work Policy', issuedDate: '2025-03-01', department: 'HR', scope: 'Remote-Eligible Roles', desc: 'Employees approved for remote work must maintain a secure home office environment...' },
    { id: '3', label: 'Code of Conduct', issuedDate: '2024-12-10', department: 'Legal', scope: 'All Employees', desc: 'The Code of Conduct sets expectations for professional behavior...' },
    { id: '4', label: 'Expense Reimbursement Policy', issuedDate: '2025-02-20', department: 'Finance', scope: 'All Employees', desc: 'Employees may claim reasonable business expenses incurred during company activities...' }
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
              <div className="description-area">
                <h4>Description</h4>
                <p>{selectedInfo.desc}</p>
              </div>
            </div>
            <button className="modal-footer-done-btn" onClick={() => setSelectedInfo(null)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
};

const ProfilePage = ({ setAuth }) => {
  const navigate = useNavigate();
  return (
    <>
      <div className="profile-section">
        <div className="profile-avatar-box"><UserCircle size={80} color="#2b1d62" /></div>
        <h3>ALAN TAN WAI LOON</h3>
        <p>Software Engineer | CH-9920</p>
      </div>
      <div className="profile-menu">
        <div className="p-menu-item" onClick={() => alert("Check your email for reset code!")}><Lock size={18} /> <span>Reset Password</span></div>
        <div className="p-menu-item logout" onClick={() => { setAuth(false); navigate('/login'); }}><LogOut size={18} /> <span>Logout</span></div>
      </div>
    </>
  );
};

// --- 4. 首页内容 ---
const Home = () => {
  const menuItems = [
    { label: 'Meeting Room', icon: 'meeting room.png', path: '/meeting-room'},
    { label: 'Transport', icon: 'transportation.png', path: '/transport' },
    { label: 'e-Visitor', icon: 'evisitor.png', path: '/evisitor' },
    { label: 'Ticketing', icon: 'ticketing.png', path: '/ticketing' },
    { label: 'CHART', icon: 'chart.png', path: '/chart'  },
    { label: 'Wellness', icon: 'wellness.png', path: '/wellness' },
    { label: 'Meal', icon: 'meal.png', path: '/meal' },
    { label: 'Energy', icon: 'energy.png', path: '/energy' },
    { label: 'flexHR', icon: 'flexhr.png', path: '/flexhr' },
    { label: 'MyNews', icon: 'mynews.png', path: '/mynews' },
    { label: 'Childcare', icon: 'childcare.png', path: '/childcare' },
    { label: 'EPP', icon: 'epp.png', path: '/epp' },
  ];

  return (
    <>
      <header className="hero-header">
        <h1>Staging Environment</h1>
      </header>
      <div className="warning-container">
        <Calendar size={16} />
        <div className="marquee-wrapper">
          <div className="scrolling-text">LIVE/PRODUCTION ENVIRONMENT. USE WITH CAUTION.</div>
        </div>
      </div>
      <main className="grid-menu">
        {menuItems.map((item, index) => (
          <Link to={item.path} key={index} className="menu-item link-item">
            <div className="icon-container">
              <img src={`/icon_img/${item.icon}`} alt={item.label} />
            </div>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </main>
    </>
  );
};

// --- 5. 扫码页（限制在手机容器内）---
const ScanPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("Camera access denied.");
        navigate(-1);
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
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
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>
            <div className="scan-line"></div>
          </div>
        </div>
        <div className="scan-tip">Place QR code inside the frame</div>
      </div>
    </div>
  );
};

// --- CHATBOT DENGAN INTEGRASI N8N ---
const ChatBot = ({ containerRef }) => {
  // Dragging & Window State (Dari App.js)
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 340, y: 480 }); 
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

  // Logic State n8n (Dari App.jsx)
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', msgType: 'text', text: 'Hai! Saya Employee Assistant anda. Sebut atau taip arahan untuk menempah bilik mesyuarat atau memohon cuti.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState({});
  const messagesEndRef = useRef(null);

  // Constants n8n
  const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook-test/employee-assistant';
  const TEMP_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwidXBuIjoicGVrZXJqYUBjaGluaGluLmNvbSIsInJvbGVzIjpbImVtcGxveWVlIl0sInRlbmFudF9pZCI6ImNoaW5oaW5faHEifQ.UqTWTIrSmD9WwDQQd93W17xFMkAqHeZJf2mSg08ldKU'; 

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // --- Dragging Handlers ---
  const handleStart = (e) => {
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    setIsDragging(true);
    startPosRef.current = { x: clientX, y: clientY };
    offsetRef.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const newX = Math.min(Math.max(10, clientX - offsetRef.current.x), rect.width - 70);
    const newY = Math.min(Math.max(10, clientY - offsetRef.current.y), rect.height - 70);
    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => setIsDragging(false);

  const handleBotClick = (e) => {
    const distance = Math.sqrt(Math.pow(e.clientX - startPosRef.current.x, 2) + Math.pow(e.clientY - startPosRef.current.y, 2));
    if (distance < 5) setIsOpen(!isOpen);
  };

  // --- Voice & N8N Logic ---
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; 
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser anda tidak menyokong rakaman suara. Sila guna Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSendMessage(transcript, 'voice');
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  const handleSendMessage = async (text, inputType = 'text', confirmData = null) => {
    if (!text && !confirmData) return;

    if (!confirmData) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', msgType: 'text', text }]);
      setInputValue('');
    }

    setIsLoading(true);

    const payload = confirmData ? {
      text: "User confirmed the plan",
      input_type: inputType,
      state: conversationState,
      confirm: true,
      edited_plan: confirmData.plan,
      client_request_id: `req-${Date.now()}`
    } : {
      text: text,
      input_type: inputType,
      state: conversationState,
      client_request_id: `req-${Date.now()}`
    };

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEMP_JWT_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      processN8nResponse(data, inputType);
    } catch (error) {
      console.error("Error:", error);
      addAiMessage("System offline. Cannot connect to the assistant.", 'text');
    } finally {
      setIsLoading(false);
    }
  };

  const processN8nResponse = (data, inputType) => {
    let textToSpeak = "";
    
    if (data.state) setConversationState(data.state);

    switch (data.type) {
      case 'clarify':
        textToSpeak = data.question;
        addAiMessage(data.question, 'text');
        break;

      case 'confirm':
        textToSpeak = data.summary + ". Do you want to proceed?";
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: 'bot', 
          msgType: 'confirm_card', 
          text: data.summary,
          plan: data.plan,
          confirm_token: data.confirm_token
        }]);
        break;

      case 'receipt':
        textToSpeak = "Success! " + data.summary;
        addAiMessage(textToSpeak, 'text');
        setConversationState({}); 
        break;

      case 'error':
      case 'auth_error':
        textToSpeak = "Sorry, " + (data.message || data.error);
        addAiMessage(textToSpeak, 'text');
        break;

      default: 
        textToSpeak = "I received a response, but I'm not sure how to display it.";
        addAiMessage(textToSpeak, 'text');
    }

    if (inputType === 'voice' && textToSpeak) {
      speakText(textToSpeak);
    }
  };

  const addAiMessage = (text, msgType) => {
    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', msgType, text }]);
  };

  return (
    <>
      <div
        className="chatbot-float-btn"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
        onMouseUp={handleEnd}
        onTouchEnd={handleEnd}
        onClick={handleBotClick}
      >
        <Bot size={28} color="white" />
      </div>
      
      {isOpen && (
        <div className="chat-window-overlay">
          <div className="chat-header">
            <span>Smart Bot</span>
            <X size={20} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
          </div>
          
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`message ${m.sender}`}>
                <p style={{ margin: 0 }}>{m.text}</p>
                
                {m.msgType === 'confirm_card' && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ padding: '6px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flex: 1 }}
                      onClick={() => handleSendMessage(null, 'text', m)}
                    >
                      Confirm
                    </button>
                    <button 
                      style={{ padding: '6px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flex: 1 }}
                      onClick={() => addAiMessage("Action cancelled.", 'text')}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
               <div className="message bot" style={{ opacity: 0.7 }}>Assistant menaip...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={startRecording}
              style={{ 
                background: isRecording ? '#ffebe9' : 'transparent', 
                border: 'none', cursor: 'pointer', padding: '8px', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Tekan untuk bercakap"
            >
              <Mic size={20} color={isRecording ? '#ff4d4f' : '#666'} />
            </button>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your request..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue, 'text')}
              disabled={isRecording || isLoading}
              style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
            />
            <button 
              className="send-btn" 
              onClick={() => handleSendMessage(inputValue, 'text')}
              disabled={!inputValue.trim() || isLoading}
              style={{ opacity: (!inputValue.trim() || isLoading) ? 0.5 : 1 }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// --- 页面包装器，动态设置 paddingTop ---
const PageWrapper = ({ children, showTopBar }) => {
  return (
    <div className="page-content" style={{ paddingTop: showTopBar ? '80px' : '0' }}>
      {children}
    </div>
  );
};

// --- 6. 根组件与底部导航 ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const appRef = useRef(null);
  const location = useLocation();

  const showFooter = isAuthenticated && !['/scan', '/login', '/signup'].includes(location.pathname);
  const showTopBar = showFooter && ['/', '/dashboard', '/info', '/profile'].includes(location.pathname);

  const openNotifications = () => setShowNotifications(true);
  const closeNotifications = () => setShowNotifications(false);

  return (
    <div className="mobile-app" ref={appRef}>
      {showTopBar && <GlobalWelcomeBar openNotifications={openNotifications} />}

      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <>
          {location.pathname === '/scan' ? (
            <ScanPage />
          ) : (
            <Routes>
              <Route path="/" element={<PageWrapper showTopBar={showTopBar}><Home /></PageWrapper>} />
              <Route path="/dashboard" element={<PageWrapper showTopBar={showTopBar}><DashboardPage /></PageWrapper>} />
              <Route path="/info" element={<PageWrapper showTopBar={showTopBar}><InfoPage /></PageWrapper>} />
              <Route path="/profile" element={<PageWrapper showTopBar={showTopBar}><ProfilePage setAuth={setIsAuthenticated} /></PageWrapper>} />
              <Route path="/meeting-room" element={<PageWrapper showTopBar={false}><MeetingRoom /></PageWrapper>} />
              <Route path="/transport" element={<PageWrapper showTopBar={false}><Transport /></PageWrapper>} />
              <Route path="/evisitor" element={<PageWrapper showTopBar={false}><EVisitor /></PageWrapper>} />
              <Route path="/ticketing" element={<PageWrapper showTopBar={false}><Ticketing /></PageWrapper>} />
              <Route path="/chart" element={<PageWrapper showTopBar={false}><Chart /></PageWrapper>} />
              <Route path="/wellness" element={<PageWrapper showTopBar={false}><Wellness /></PageWrapper>} />
              <Route path="/meal" element={<PageWrapper showTopBar={false}><Meal /></PageWrapper>} />
              <Route path="/energy" element={<PageWrapper showTopBar={false}><Energy /></PageWrapper>} />
              <Route path="/flexhr" element={<PageWrapper showTopBar={false}><FlexHR /></PageWrapper>} />
              <Route path="/mynews" element={<PageWrapper showTopBar={false}><Mynews /></PageWrapper>} />
              <Route path="/childcare" element={<PageWrapper showTopBar={false}><Childcare /></PageWrapper>} />
              <Route path="/epp" element={<PageWrapper showTopBar={false}><EPP /></PageWrapper>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
          {showFooter && <FooterWithConditionalRendering />}
        </>
      )}

      {/* Paparkan ChatBot merentasi aplikasi */}
      <ChatBot containerRef={appRef} />

      {showNotifications && <NotificationPanel onClose={closeNotifications} />}
    </div>
  );
}

const FooterWithConditionalRendering = () => {
  const location = useLocation();
  const navs = [
    { label: 'Home', path: '/', icon: <HomeIcon size={22} /> },
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={22} /> },
    { label: 'Info', path: '/info', icon: <InfoIcon size={22} /> },
    { label: 'Profile', path: '/profile', icon: <UserCircle size={22} /> }
  ];

  return (
    <footer className="bottom-nav-fixed">
      {navs.map(n => (
        <Link to={n.path} key={n.label} className={`nav-item ${location.pathname === n.path ? 'active' : ''}`}>
          {n.icon} <span>{n.label}</span>
        </Link>
      ))}
    </footer>
  );
};

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}