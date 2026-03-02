import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Calendar as CalendarIcon, BookOpen, Book, ChevronRight, AlertCircle, 
  Clock, MapPin, X, Info, ChevronLeftCircle, ChevronRightCircle, CheckCircle2, User
} from 'lucide-react';
import './Chart.css';

// Default programs used when there is nothing in localStorage
const DEFAULT_PROGRAMS = [
  { 
    id: "P001", 
    title: "Leadership Excellence 101", 
    date: "2026-02-15", 
    startTime: "10:00", 
    endTime: "12:00",
    location: "Level 17, Meeting Room A", 
    trainer: "Dr. Alan Smith",
    status: "Confirmed",
    desc: "Advanced leadership strategies for management teams focusing on transformation."
  },
  { 
    id: "P002", 
    title: "Digital Transformation", 
    date: "2026-02-15", 
    startTime: "14:00", 
    endTime: "16:30",
    location: "Level 8, Idea Lab 5", 
    trainer: "Ms. Jane Doe",
    status: "Confirmed",
    desc: "Exploring digital workflows, automation tools and business reskilling."
  }
];

// Helper to load initial state from localStorage (or use defaults)
const loadInitialPrograms = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('chart_myPrograms');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore JSON errors and fall back to defaults
    }
  }
  return DEFAULT_PROGRAMS;
};

const Chart = () => {
  const navigate = useNavigate();
  // 视图状态：'main', 'calendar', 'upcoming', 'programs', 'mylearning'
  const [view, setView] = useState('main');
  const [selectedDate, setSelectedDate] = useState(null); 
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 外部学习申请表单的状态管理
  const [requestForm, setRequestForm] = useState({ title: '', dateTime: '', venue: '' });

  //----------------------------for mock data----------------//
  const [myPrograms, setMyPrograms] = useState(loadInitialPrograms);

  const availablePrograms = [
    { 
      id: "A001", title: "Effective Communication", duration: "1 Day", trainer: "Jane Doe", 
      category: "Soft Skills", date: "2026-03-10", startTime: "09:00", endTime: "17:00", 
      location: "Grand Hall, Level 1", desc: "Learn to communicate effectively in the modern workplace." 
    },
    { 
      id: "A002", title: "Python for Data Science", duration: "3 Days", trainer: "John Wick", 
      category: "Technical", date: "2026-03-15", startTime: "10:00", endTime: "16:00", 
      location: "Training Room B", desc: "Comprehensive introduction to data manipulation and visualization." 
    }
  ];
  //-------------------end of mock data -------------------------//

  // Persist myPrograms whenever it changes so sign-ups survive refresh/navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('chart_myPrograms', JSON.stringify(myPrograms));
    }
  }, [myPrograms]);

  //----------------------------for back navigation logic----------------//
  const handleBack = () => {
    if (view === 'main') navigate('/');
    else { setView('main'); setSelectedDate(null); }
  };
  //-------------------end of back navigation logic -------------------------//

  //----------------------------for subpage learning calendar logic----------------//
  const [navDate, setNavDate] = useState(new Date(2026, 1, 1)); 

  const renderCalendarDays = () => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];

    for (let i = 0; i < offset; i++) days.push(<div key={`e-${i}`} className="cal-day empty"></div>);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasEvent = myPrograms.some(p => p.date === dateStr);
      const isSelected = selectedDate === dateStr;

      days.push(
        <div key={d} 
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
      const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`;
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
            const startH = parseInt(event.startTime.split(':')[0]);
            const startM = parseInt(event.startTime.split(':')[1]);
            const endH = parseInt(event.endTime.split(':')[0]);
            const endM = parseInt(event.endTime.split(':')[1]);
            const top = ((startH < 8 ? startH + 24 : startH) - 8) * 60 + startM;
            const height = ((endH < startH ? endH + 24 : endH) * 60 + endM) - (startH * 60 + startM);

            return (
              <div key={event.id} className="timeline-event-block" 
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
  //-------------------end of subpage learning calendar logic -------------------------//

  // 处理报名确认逻辑
  const handleConfirmSignUp = () => {
    if (selectedEvent) {
      // If user already signed up for this program (same title + date), show message
      const alreadyExist = myPrograms.some(
        p => p.title === selectedEvent.title && p.date === selectedEvent.date
      );

      if (alreadyExist) {
        alert('You have already signed up for this program.');
        setShowConfirm(false);
        setSelectedEvent(null);
        return;
      }

      // 1. 将新课程添加到“我的课程”数组中，状态设为 Pending
      const newProgram = {
        id: `P${Date.now()}`, // 生成唯一ID
        title: selectedEvent.title,
        date: selectedEvent.date,
        startTime: selectedEvent.startTime,
        endTime: selectedEvent.endTime,
        location: selectedEvent.location,
        trainer: selectedEvent.trainer,
        status: "Pending HR Approval",
        desc: selectedEvent.desc
      };
      setMyPrograms(prev => [...prev, newProgram]);
      
      // 2. 提示成功并关闭所有弹窗
      alert('Sign up request submitted successfully!');
      setShowConfirm(false); 
      setSelectedEvent(null);
      
      // 3. 跳转到“我的课程”页面查看结果
      setView('upcoming'); 
    }
  };

  // 处理外部学习表单提交
  const handleRequestSubmit = () => {
    if (!requestForm.title || !requestForm.dateTime || !requestForm.venue) {
      alert("Please fill in all required fields!");
      return;
    }
    alert('External Learning Request Submitted!'); 
    setRequestForm({ title: '', dateTime: '', venue: '' }); // 提交后清空表单
    setView('main'); 
  };

  return (
    <div className="chart-page-container">
      {/* 顶部导航 */}
      <nav className="chart-top-nav">
        <div className="back-arrow" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} /></div>
        <span className="nav-title">
          {view === 'main' ? 'CHART' : 
           view === 'calendar' ? 'Learning Calendar' : 
           view === 'upcoming' ? 'My Upcoming Trainings' : 
           view === 'programs' ? 'Learning Programs' : 'My Learning Request'}
        </span>
      </nav>

      <div className="chart-scroll-content">
        {view === 'main' && (
          <>
            {/*----------------------------for header hero section----------------//*/}
            <div className="chart-hero-header">
              <div className="chart-logo-box"><img src="/icon_img/CHARTlogo.png" alt="Logo" className="chart-main-logo" /></div>
              <h2 className="about-title">About CHART</h2>
              <p className="about-desc">The Chin Hin Academy for Reskilling & Transformation (CHART)</p>
              <button className="read-more-btn" onClick={() => setShowAboutModal(true)}>Read More</button>
            </div>
            {/*-------------------end of header hero section -------------------------//*/}

            {/*----------------------------for main menu list----------------//*/}
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
            {/*-------------------end of main menu list -------------------------//*/}

            <div className="important-note-box">
              <div className="note-header">Important Note</div>
              <div className="note-body"><AlertCircle size={20} color="#444" /><p>Please reach out to HR for training nomination.</p></div>
            </div>
          </>
        )}

        {/*----------------------------for subpage learning calendar----------------//*/}
        {view === 'calendar' && (
          <div className="chart-subpage-view">
            <div className="cal-section">
              <div className="calendar-month-nav">
                <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth()-1, 1))}><ChevronLeftCircle size={24} color="#2b1d62" /></button>
                <span className="current-month-label">{navDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setNavDate(new Date(navDate.getFullYear(), navDate.getMonth()+1, 1))}><ChevronRightCircle size={24} color="#2b1d62" /></button>
              </div>
              <div className="calendar-grid-mock">{renderCalendarDays()}</div>
            </div>

            <div className="cal-bottom-detail">
              {!selectedDate ? (
                <div className="registered-hints">
                  <h4 className="section-title">Registered Hints</h4>
                  {myPrograms.map(p => (
                    <div key={p.id} className="hint-item"><CheckCircle2 size={14} color="#2b1d62" /> <span>{p.title} ({p.date})</span></div>
                  ))}
                </div>
              ) : (
                <>
                  <h4 className="section-title">Schedule for {selectedDate}</h4>
                  {renderTimeline()}
                </>
              )}
            </div>
          </div>
        )}
        {/*-------------------end of subpage learning calendar -------------------------//*/}

        {/*----------------------------for subpage upcoming trainings----------------//*/}
        {view === 'upcoming' && (
          <div className="chart-subpage-view">
            <h4 className="section-title">Confirmed & Pending Trainings</h4>
            {myPrograms.map(p => (
              <div key={p.id} className="training-detail-card" onClick={() => setSelectedEvent(p)}>
                <div className="card-top">
                  <h4>{p.title}</h4> 
                  <span
                    className="s-badge"
                    style={{
                      backgroundColor: p.status === 'Confirmed' ? '#e8f5e9' : '#fff3e0',
                      color: p.status === 'Confirmed' ? '#2e7d32' : '#e65100'
                    }}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="card-info-row"><CalendarIcon size={14} /> <span>{p.date}</span></div>
                <div className="card-info-row"><Clock size={14} /> <span>{p.startTime} - {p.endTime}</span></div>
                <div className="card-info-row"><MapPin size={14} /> <span>{p.location}</span></div>
              </div>
            ))}
          </div>
        )}
        {/*-------------------end of subpage upcoming trainings -------------------------//*/}

        {/*----------------------------for subpage learning programs----------------//*/}
        {view === 'programs' && (
          <div className="chart-subpage-view">
            <h4 className="section-title">Open for Registration</h4>
            {availablePrograms.map(p => {
              const isSignedUp = myPrograms.some(
                prog => prog.title === p.title && prog.date === p.date
              );

              return (
                <div
                  key={p.id}
                  className="available-program-card"
                  onClick={() => setSelectedEvent(p)}
                >
                  <div className="p-card-content">
                    <h4>{p.title}</h4>
                    <p>Duration: {p.duration}</p>
                    {isSignedUp && (
                      <span className="signed-badge">Already signed up</span>
                    )}
                  </div>
                  <button
                    className={`signup-btn ${isSignedUp ? 'disabled' : ''}`}
                    disabled={isSignedUp}
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
            })}
          </div>
        )}
        {/*-------------------end of subpage learning programs -------------------------//*/}

        {/*----------------------------for subpage my learning request----------------//*/}
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
                  onChange={e => setRequestForm({...requestForm, title: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Date & Time *</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-05-10 09:00"
                  className="c-input"
                  value={requestForm.dateTime}
                  onChange={e => setRequestForm({...requestForm, dateTime: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Address / Venue *</label>
                <input
                  type="text"
                  className="c-input"
                  value={requestForm.venue}
                  onChange={e => setRequestForm({...requestForm, venue: e.target.value})}
                />
              </div>
              
              <button className="submit-req-btn" onClick={handleRequestSubmit}>Submit Request</button>
            </div>
          </div>
        )}
        {/*-------------------end of subpage my learning request -------------------------//*/}
      </div>

      {/*----------------------------for all modals implementation----------------//*/}
      
      {/* 1. Activity Detail Modal */}
      {selectedEvent && !showConfirm && (
        <div className="chart-modal-overlay">
          <div className="event-detail-modal">
            <div className="modal-top">
              <h3>Activity Details</h3>
              <X size={24} onClick={() => setSelectedEvent(null)} style={{cursor: 'pointer'}} />
            </div>
            <div className="modal-main">
              <h2 className="m-title">{selectedEvent.title}</h2>
              <div className="m-row"><CalendarIcon size={16} color="#00a8ff" /> <span>{selectedEvent.date || "N/A"}</span></div>
              <div className="m-row">
                <Clock size={16} color="#00a8ff" />{" "}
                <span>
                  {selectedEvent.startTime
                    ? `${selectedEvent.startTime} - ${selectedEvent.endTime}`
                    : (selectedEvent.time || "N/A")}
                </span>
              </div>
              <div className="m-row"><User size={16} color="#00a8ff" /> <span>Trainer: {selectedEvent.trainer}</span></div>
              <div className="m-row"><MapPin size={16} color="#00a8ff" /> <span>{selectedEvent.location || "N/A"}</span></div>
              <div className="m-desc-box">
                <h4>Description</h4>
                <p>{selectedEvent.desc || "No description available for this program."}</p>
              </div>
            </div>
            <button className="m-close-btn" onClick={() => setSelectedEvent(null)}>Done</button>
          </div>
        </div>
      )}

      {/* 2. Read More Modal */}
      {showAboutModal && (
        <div className="chart-modal-overlay">
          <div className="event-detail-modal about-modal">
            <div className="modal-top">
              <h3>About CHART</h3>
              <X size={24} onClick={() => setShowAboutModal(false)} style={{cursor: 'pointer'}} />
            </div>
            <div className="modal-main">
              <p>CHART (Chin Hin Academy for Reskilling & Transformation) is dedicated to fostering a culture of continuous learning.</p>
              <p>Our mission is to equip our employees with future-ready skills through structured training, workshops, and transformation programs.</p>
            </div>
            <button className="m-close-btn" onClick={() => setShowAboutModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* 3. Double Confirm Modal */}
      {showConfirm && selectedEvent && (
        <div className="chart-modal-overlay">
          <div className="confirm-dialog">
            <AlertCircle size={40} color="#f39c12" />
            <h3>Enroll in Program?</h3>
            <p>Are you sure you want to sign up for <strong>{selectedEvent.title}</strong>?</p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => { setShowConfirm(false); setSelectedEvent(null); }}>Cancel</button>
              <button className="confirm-btn" onClick={handleConfirmSignUp}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/*-------------------end of all modals implementation -------------------------//*/}
    </div>
  );
};

export default Chart;