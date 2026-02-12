import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar, Scan, Bell, ChevronLeft, 
  Zap, Image as ImageIcon, Bot, Send, X 
} from 'lucide-react';
import MeetingRoom from './MeetingRoom';
import Transport from './Transport';
import EVisitor from './EVisitor'; 
import Ticketing from './Ticketing';
import './App.css';

// --- 1. 全局 ChatBot 组件 ---
const ChatBot = ({ containerRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hi! I am your assistant. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState({ x: 380, y: 550 }); 
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 }); 
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'b' && e.target.tagName !== 'INPUT') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div className="chatbot-float-btn"
        style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, zIndex: 9999 }}
        onMouseDown={handleStart} onTouchStart={handleStart}
        onMouseMove={handleMove} onTouchMove={handleMove}
        onMouseUp={handleEnd} onTouchEnd={handleEnd}
        onClick={handleBotClick}>
        <Bot size={28} color="white" />
      </div>
      {isOpen && (
        <div className="chat-window-overlay" style={{ position: 'absolute', zIndex: 10000 }}>
          <div className="chat-header">
            <div className="header-info"><Bot size={18} /> <span>Smart Bot</span></div>
            <X size={20} onClick={() => setIsOpen(false)} style={{cursor:'pointer'}} />
          </div>
          <div className="chat-messages">{messages.map(m => (
            <div key={m.id} className={`message ${m.type}`}>{m.text}</div>
          ))}</div>
          <div className="chat-input-area">
            <input value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type message..." onKeyPress={(e) => e.key === 'Enter' && handleSend()} autoFocus />
            <button className="send-btn" onClick={handleSend}><Send size={20} /></button>
          </div>
        </div>
      )}
    </>
  );
};

// --- 2. 扫描页面 (适配容器大小) ---
const ScanPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  useEffect(() => {
    let streamRef = null;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { alert("Camera access denied."); navigate(-1); }
    };
    startCamera();
    return () => streamRef && streamRef.getTracks().forEach(track => track.stop());
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
            <div className="corner top-left"></div><div className="corner top-right"></div>
            <div className="corner bottom-left"></div><div className="corner bottom-right"></div>
            <div className="scan-line"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 3. 首页 ---
const Home = () => {
  const navigate = useNavigate();
  const menuItems = [
    { label: 'Meeting Room', icon: 'meeting room.png', path: '/meeting-room', badge: '1' },
    { label: 'Transport', icon: 'transportation.png', path: '/transport' },
    { label: 'e-Visitor', icon: 'evisitor.png', path: '/evisitor' },
    { label: 'Ticketing', icon: 'ticketing.png', path: '/ticketing' },
    { label: 'CHART', icon: 'chart.png' },
    { label: 'Wellness', icon: 'wellness.png' },
    { label: 'Meal', icon: 'meal.png' },
    { label: 'Energy', icon: 'energy.png' },
    { label: 'flexHR', icon: 'flexhr.png' },
    { label: 'MyNews', icon: 'mynews.png' },
    { label: 'Childcare', icon: 'childcare.png' },
    { label: 'EPP', icon: 'epp.png' },
  ];

  return (
    <>
      <nav className="welcome-bar">
        <div className="welcome-text">
          <span className="welcome-label">Welcome</span>
          <h2 className="welcome-name">ALAN TAN WAI LOON</h2>
        </div>
        <div className="welcome-icons">
          <div className="icon-wrapper" onClick={() => navigate('/scan')}><Scan size={20} color="white" /></div>
          <div className="bell-container"><Bell size={20} color="white" /><span className="bell-dot"></span></div>
        </div>
      </nav>
      <header className="hero-header"><div className="hero-content"><h1>Staging Environment</h1></div></header>
      <div className="warning-container">
        <div className="fixed-calendar-icon"><Calendar size={16} /></div>
        <div className="marquee-wrapper">
          <div className="scrolling-text">
            <span>LIVE/PRODUCTION ENVIRONMENT. USE WITH CAUTION. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>
      </div>
      <main className="grid-menu">
        {menuItems.map((item, index) => (
          <Link to={item.path || '#'} key={index} className="menu-item link-item">
            <div className="icon-container">
              <img src={`/icon_img/${item.icon}`} alt={item.label} />
              {item.badge && <span className="badge">{item.badge}</span>}
            </div>
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </main>
    </>
  );
};

// --- 4. 根组件 ---
function App() {
  const appRef = useRef(null); 
  return (
    <Router>
      <div className="mobile-app" ref={appRef} style={{ position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/meeting-room" element={<MeetingRoom />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/evisitor" element={<EVisitor />} />
          <Route path="/ticketing" element={<Ticketing />} /> {/* 新增路由 */}
          <Route path="/scan" element={<ScanPage />} />
        </Routes>
        <FooterWithConditionalRendering />
        <ChatBot containerRef={appRef} />
      </div>
    </Router>
  );
}

const FooterWithConditionalRendering = () => {
  const location = useLocation();
  // 仅在扫描页隐藏底部导航，eVisitor 现在会显示底部栏
  if (location.pathname === '/scan') return null;
  return (
    <footer className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <img src="/icon_img/home.png" alt="H" /><span>Home</span>
      </Link>
      <div className="nav-item"><img src="/icon_img/dashboard.png" alt="D" /><span>Dashboard</span></div>
      <div className="nav-item"><img src="/icon_img/info.png" alt="I" /><span>Info</span></div>
      <div className="nav-item"><img src="/icon_img/profile.png" alt="P" /><span>Profile</span></div>
    </footer>
  );
};

export default App;