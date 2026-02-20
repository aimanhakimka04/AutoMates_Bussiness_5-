import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Calendar, Scan, Bell, ChevronLeft, 
  Zap, Bot, Send, X,
  Home as HomeIcon, LayoutDashboard, Info as InfoIcon, UserCircle,
  LogOut, ShieldCheck, Mail, Lock, User, ChevronRight,
  Clock, MapPin
} from 'lucide-react';

// 导入业务组件
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

// --- 2. 认证页面 ---
const Login = ({ setAuth }) => {
  const navigate = useNavigate();
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <div className="auth-field"><Mail size={18}/><input type="email" placeholder="Email Address" /></div>
        <div className="auth-field"><Lock size={18}/><input type="password" placeholder="Password" /></div>
        <button className="auth-btn" onClick={() => { setAuth(true); navigate('/'); }}>Login</button>
        <p className="auth-footer">New here? <span onClick={() => navigate('/signup')}>Create Account</span></p>
      </div>
    </div>
  );
};

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyCode: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    alert('Verification code sent to your email!');
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Join FlexHR</h2>
        <p className="auth-note">
          Verification Code will be sent to your <b>company email</b> upon submission.
        </p>
        <div className="auth-field">
          <User size={18} />
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
          />
        </div>
        <div className="auth-field">
          <Mail size={18} />
          <input
            type="email"
            name="email"
            placeholder="Company Email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="auth-field">
          <ShieldCheck size={18} />
          <input
            type="text"
            name="companyCode"
            placeholder="Company Code"
            value={formData.companyCode}
            onChange={handleChange}
          />
        </div>
        <div className="auth-field">
          <Lock size={18} />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <div className="auth-field">
          <Lock size={18} />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>
        {error && <div style={{ color: 'red', fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <button className="auth-btn" onClick={handleSubmit}>
          Verify & Sign Up
        </button>
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
    {
      id: '1',
      label: 'Data Protection Policy',
      issuedDate: '2025-01-15',
      department: 'IT Security',
      scope: 'All Employees',
      desc: 'This policy outlines the requirements for handling personal and sensitive data within the organization. All employees must ensure that data is processed in accordance with GDPR and local regulations. Any breach must be reported immediately to the DPO. Regular training sessions are mandatory for staff handling customer data.'
    },
    {
      id: '2',
      label: 'Remote Work Policy',
      issuedDate: '2025-03-01',
      department: 'HR',
      scope: 'Remote-Eligible Roles',
      desc: 'Employees approved for remote work must maintain a secure home office environment. Use of VPN is mandatory when accessing company resources. Work hours should align with core hours 10am-3pm local time. All remote work arrangements must be reviewed annually.'
    },
    {
      id: '3',
      label: 'Code of Conduct',
      issuedDate: '2024-12-10',
      department: 'Legal',
      scope: 'All Employees',
      desc: 'The Code of Conduct sets expectations for professional behavior, including respect in the workplace, conflict of interest disclosures, and compliance with anti-bribery laws. All employees must complete the annual ethics training and acknowledge the code.'
    },
    {
      id: '4',
      label: 'Expense Reimbursement Policy',
      issuedDate: '2025-02-20',
      department: 'Finance',
      scope: 'All Employees',
      desc: 'Employees may claim reasonable business expenses incurred during company activities. Claims must be submitted within 30 days with original receipts. Expenses exceeding $500 require pre-approval. Personal expenses are not reimbursable.'
    }
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
              
              <div className="detail-item-row">
                <Calendar size={18} color="#1890ff" />
                <span>Issued: {selectedInfo.issuedDate}</span>
              </div>
              <div className="detail-item-row">
                <User size={18} color="#1890ff" />
                <span>Department: {selectedInfo.department}</span>
              </div>
              <div className="detail-item-row">
                <MapPin size={18} color="#1890ff" />
                <span>Scope: {selectedInfo.scope}</span>
              </div>

              <div className="modal-hr-line" />

              <div className="description-area">
                <h4>Description</h4>
                <p>{selectedInfo.desc}</p>
              </div>
            </div>

            <button className="modal-footer-done-btn" onClick={() => setSelectedInfo(null)}>
              Done
            </button>
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

const ChatBot = ({ containerRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, type: 'bot', text: 'How can I assist you today?' }]);
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState({ x: 340, y: 480 }); 
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

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

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages([...messages, { id: Date.now(), type: 'user', text: inputValue }]);
    setInputValue('');
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: "I've received your request! ✅" }]);
    }, 800);
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
              <div key={m.id} className={`message ${m.type}`}>{m.text}</div>
            ))}
          </div>
          <div className="chat-input-area">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}><Send size={18}/></button>
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

  // 底部栏显示条件：已登录且不在扫描、登录、注册页
  const showFooter = isAuthenticated && !['/scan', '/login', '/signup'].includes(location.pathname);
  // 顶部栏显示条件：在底部栏显示的基础上，并且路径是首页、仪表盘、信息、个人主页
  const showTopBar = showFooter && ['/', '/dashboard', '/info', '/profile'].includes(location.pathname);

  const openNotifications = () => setShowNotifications(true);
  const closeNotifications = () => setShowNotifications(false);

  return (
    <div className="mobile-app" ref={appRef}>
      {showTopBar && <GlobalWelcomeBar openNotifications={openNotifications} />}

      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
          <Route path="/signup" element={<SignUp />} />
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

      <ChatBot containerRef={appRef} />

      {showNotifications && <NotificationPanel onClose={closeNotifications} />}
    </div>
  );
}

const FooterWithConditionalRendering = () => {
  const location = useLocation();
  // 底部栏内部不再判断，由父组件控制
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

// 用 Router 包裹 App 以便使用 useLocation
export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}