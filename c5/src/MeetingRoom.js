import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Calendar, User, MapPin, Clock, 
  MoreVertical, Search, Layers, ChevronDown, Plus, Minus,
  Monitor, X, Edit3, PlusSquare
} from 'lucide-react';
import './MeetingRoom.css';

const MeetingRoom = () => {
  const navigate = useNavigate();
  
  // --- 1. 获取实时基准时间 ---
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // 工具函数：格式化本地时间为 YYYY-MM-DD，避免 toISOString 的时区 Bug
  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatLocalDate(today);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // --- 视图与流程控制 ---
  const [view, setView] = useState('list'); 
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [attendees, setAttendees] = useState(0);
  const [activeTab, setActiveTab] = useState('All'); 
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isEditing, setIsEditing] = useState(false); 

  // --- 业务状态 ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today); 
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1)); 

  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // --- 外部参与者弹窗状态 ---
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [extName, setExtName] = useState('');
  const [extEmail, setExtEmail] = useState('');

  // --- 模拟数据 ---
  const meetingsData = [
    { id: 1, title: "UAT Briefing", host: "ALAN TAN WAI LOON", room: "Idea Lab 6", date: "2026-02-10", time: "12:00 PM - 12:30 PM", attendees: 1 },
    { id: 2, title: "Design Sync", host: "ALAN TAN WAI LOON", room: "Idea Lab 2", date: "2026-02-10", time: "02:00 PM - 03:00 PM", attendees: 3 },
    { id: 3, title: "Weekly Review", host: "ALAN TAN WAI LOON", room: "Idea Lab 5", date: "2026-02-12", time: "10:00 AM - 11:30 AM", attendees: 5 }
  ];

  const filteredMeetings = meetingsData.filter(meeting => {
    if (activeTab === 'Today') return meeting.date === todayStr;
    return true;
  });

  const allFeatures = ["Projector", "Interactive TV", "Non-Interactive TV", "180° Camera", "Conference Camera", "Tabletop Teams Panel", "Wireless Mic"];

  // --- 2. 动态时间过滤逻辑 ---
  const getFilteredFromTimeSlots = () => {
    const isTodaySelected = formatLocalDate(selectedDate) === todayStr;
    const slots = [];
    for (let hour = 10; hour <= 17; hour++) {
      const period = hour < 12 ? 'AM' : 'PM';
      let displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      
      if (!isTodaySelected || hour > currentHour) {
        slots.push(`${displayHour}:00 ${period}`);
      }
      if (hour !== 17) {
        if (!isTodaySelected || hour > currentHour || (hour === currentHour && currentMinute < 30)) {
          slots.push(`${displayHour}:30 ${period}`);
        }
      }
    }
    return slots;
  };

  const fromTimeSlots = getFilteredFromTimeSlots();

  const getToTimeSlots = () => {
    if (!selectedStartTime) return [];
    const list = [];
    const [time, period] = selectedStartTime.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const startNum = h + (m / 60) + 0.5;
    for (let i = startNum; i <= 20; i += 0.5) {
      const p = i < 12 ? 'AM' : 'PM';
      let dh = Math.floor(i);
      if (dh > 12) dh -= 12;
      if (dh === 0) dh = 12;
      const dm = (i % 1) === 0 ? "00" : "30";
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
    const startNum = h + (m / 60);
    const maxAllowed = 20 - startNum; 
    const list = [];
    for (let i = 0.5; i <= Math.min(5, maxAllowed); i += 0.5) {
      if (i === 0.5) list.push("30 min");
      else {
        const fH = Math.floor(i);
        const fM = (i % 1) * 60;
        list.push(`${fH} hour${fH > 1 ? 's' : ''}${fM > 0 ? ' 30 min' : ''}`);
      }
    }
    return list;
  };

  // --- 交互逻辑 ---
  const handleBack = () => {
    if (view === 'form') {
      if (isEditing) { setView('list'); setIsEditing(false); }
      else setView('booking');
    }
    else if (view === 'booking') setView('results');
    else if (view === 'filter') setView('results');
    else if (view === 'results') setView('list');
    else navigate('/');
  };

  const handleEditClick = (meeting) => {
    setIsEditing(true);
    setMeetingTitle(meeting.title);
    setView('form');
    setOpenMenuId(null);
  };

  // 日历逻辑
  const changeMonth = (offset) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(<span key={`e-${i}`} className="day-empty"></span>);
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isSelected = formatLocalDate(selectedDate) === formatLocalDate(cellDate);
      const isPast = cellDate < today;
      days.push(
        <div 
          key={d} 
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`} 
          onClick={() => {
            if (!isPast) {
              setSelectedDate(cellDate);
              setSelectedStartTime(''); 
            }
          }}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="meeting-room-container">
      <nav className="top-nav-bar">
        <div className="back-arrow-wrapper" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} /></div>
        <span className="nav-title">
          {view === 'form' ? (isEditing ? "Edit Booking" : "Booking Detail") : (view === 'booking' ? "Meeting Room Details" : (view === 'filter' ? "Searching" : "Meeting Room"))}
        </span>
      </nav>

      <div className="scrollable-area">
        {view === 'list' && (
          <div className="content-padding">
            <div className="tabs-header">
              {['All', 'Today', 'Week'].map(tab => (
                <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'All' ? 'List All' : tab}
                </button>
              ))}
            </div>
            <div className="summary-banner">
              <div className="summary-icon"><Calendar size={22} color="#1976d2" /></div>
              <div className="summary-info">
                <h2 style={{fontSize: "13pt", fontWeight: "bold", margin: 0}}>{filteredMeetings.length} Meeting Upcoming</h2>
                <p style={{fontSize: "10pt", fontWeight: "bold", margin: "2px 0 0", color: "#000"}}>{todayStr}, Today</p>
              </div>
            </div>
            <div className="meeting-list">
              {filteredMeetings.map(meeting => (
                <div key={meeting.id} className="details-card">
                  <div className="card-top">
                    <h3>{meeting.title}</h3>
                    <div className="more-options-container">
                      <button className="more-options" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === meeting.id ? null : meeting.id); }}><MoreVertical size={20} color="#999" /></button>
                      {openMenuId === meeting.id && (
                        <div className="card-dropdown-menu">
                          <div className="dropdown-item" onClick={() => handleEditClick(meeting)}><Edit3 size={14} /> <span>Edit Booking</span></div>
                          <div className="dropdown-item delete" onClick={() => { alert('Cancelled'); setOpenMenuId(null); }}><X size={14} /> <span>Cancel Booking</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="info-rows">
                    <div className="row"><span className="icon"><User size={18} /></span><span className="text">{meeting.host}</span></div>
                    <div className="row"><span className="icon"><MapPin size={18} /></span><span className="text">{meeting.room}</span></div>
                    <div className="row"><span className="icon"><Calendar size={18} /></span><span className="text">{meeting.date}</span></div>
                    <div className="row"><span className="icon"><Clock size={18} /></span><span className="text">{meeting.time}</span></div>
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
          </div>
        )}

        {view === 'results' && (
          <div className="search-view-container">
            <button className="search-input-trigger" onClick={() => setView('filter')}><span className="placeholder-text">Search room name...</span><Search size={20} color="#999" /></button>
            <div className="search-results-list">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="room-sub-box" onClick={() => { setSelectedRoom(i+1); setView('booking'); setIsEditing(false); }}>
                  <div className="room-box-left"></div>
                  <div className="room-box-right">
                    <h4 className="room-title">Idea Lab {i+1}</h4>
                    <div className="room-details"><div className="detail-item"><User size={14} color="#666" /> <span>8 seats</span></div><div className="detail-item"><Layers size={14} color="#666" /> <span>Level 19</span></div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'filter' && (
          <div className="filter-form-wrapper">
            <p className="form-subtitle">Find A Meeting Room</p>
            <div className="field-group"><label>Date</label><div className="form-field-box" onClick={() => setIsCalendarOpen(true)}><span>{formatLocalDate(selectedDate)}</span><Calendar size={18} color="#666" /></div></div>
            <div className="field-group"><label>I need a meeting room from</label><div className="form-field-box select-type"><select value={selectedStartTime} onChange={(e) => { setSelectedStartTime(e.target.value); setSelectedDuration(''); }}><option value="">Please Select Time</option>{fromTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={18} color="#666" className="select-arrow" /></div></div>
            <div className="field-group"><label>I need a meeting room for</label><div className="form-field-box select-type"><select value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)} disabled={!selectedStartTime}><option value="">{selectedStartTime ? "Please Select Duration" : "Select Start Time First"}</option>{getAvailableDurations().map(d => <option key={d} value={d}>{d}</option>)}</select><ChevronDown size={18} color="#666" className="select-arrow" /></div></div>
            <div className="field-group"><label>Floor</label><div className="form-field-box select-type"><select value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)}><option value="">Please select a Floor</option><option value="19">Level 19</option></select><ChevronDown size={18} color="#666" className="select-arrow" /></div></div>
            <div className="feature-section"><label className="section-label">Room Features</label>{allFeatures.map(f => (<div key={f} className="feature-row-item"><span>{f}</span><input type="checkbox" className="custom-checkbox" /></div>))}</div>
            <div className="attendee-stepper"><label>Number of Attendees</label><div className="stepper-controls"><button className="step-btn" onClick={() => setAttendees(Math.max(0, attendees - 1))}><Minus size={18} /></button><span className="step-value">{attendees}</span><button className="step-btn" onClick={() => setAttendees(Math.min(8, attendees + 1))}><Plus size={18} /></button></div></div>
            {/* 将搜索按钮直接放入页面底部，解决遮挡问题 */}
            <div style={{padding: '20px 0 80px'}}><button className="capsule-search-btn" onClick={() => setView('results')}>Search Room</button></div>
          </div>
        )}

        {view === 'booking' && (
          <div className="booking-details-container">
            <div className="room-hero-image"><div className="room-label-tag">Idea Lab {selectedRoom}</div></div>
            <div className="room-details-content">
              <h2 className="room-main-title">Signature Teams Room</h2>
              <div className="features-info-card">
                <h3 className="features-title">Room Features</h3>
                <div className="features-grid-layout">
                  {allFeatures.map((f, i) => (<div key={i} className="f-item"><Monitor size={16} color="#00a8ff" /><span>{f}</span></div>))}
                </div>
              </div>
              <div className="schedule-info-card">
                <h3 className="schedule-header">Please select a time slot</h3>
                <div className="field-group"><div className="form-field-box" onClick={() => setIsCalendarOpen(true)}><span>{formatLocalDate(selectedDate)}</span><Calendar size={18} color="#666" /></div></div>
                <p className="no-booking-msg">No Booking for the day yet!</p>
              </div>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="booking-form-wrapper">
            <div className="form-item"><label>Meeting Host</label><div className="form-field-box select-type static-text"><span>ALAN TAN WAI LOON</span><ChevronDown size={18} color="#666" /></div></div>
            <div className="form-item"><label>Booking Date</label><div className="form-field-box" onClick={() => setIsCalendarOpen(true)}><span>{formatLocalDate(selectedDate)}</span><Calendar size={18} color="#666" /></div></div>
            <div className="form-row"><div className="form-item half"><label>Booking From *</label><div className="form-field-box select-type"><select value={selectedStartTime} onChange={(e) => { setSelectedStartTime(e.target.value); setSelectedEndTime(''); }}><option value="">Select Time</option>{fromTimeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={18} color="#666" className="select-arrow" /></div></div><div className="form-item half"><label>Booking To *</label><div className="form-field-box select-type"><select value={selectedEndTime} onChange={(e) => setSelectedEndTime(e.target.value)} disabled={!selectedStartTime}><option value="">Select Time</option>{getToTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={18} color="#666" className="select-arrow" /></div></div></div>
            <div className="form-item"><label>Meeting Title *</label><input type="text" className="form-text-input" placeholder="Enter meeting title" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} /></div>
            <div className="form-item"><label>Appointment Type</label><div className="form-field-box select-type"><select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}><option value="">Select Type</option><option value="Meeting">Meeting</option><option value="Discussion">Discussion</option><option value="Event">Event</option><option value="Training">Training</option></select><ChevronDown size={18} color="#666" className="select-arrow" /></div></div>
            <div className="form-item"><label>Invite Participants</label>
              <div className="invite-input-container">
                <input className="form-text-input-placeholder" type="text" placeholder="Type to search..." readOnly />
                <button className="add-external-btn" onClick={() => setIsExtModalOpen(true)}><PlusSquare size={28} color="#1a73e8" /></button>
              </div>
              <div className="participant-tags-container">{selectedParticipants.map((p, idx) => (<div key={idx} className="name-box-tag"><span className="tag-name">{p.name}</span><X size={14} className="tag-close-icon" onClick={() => setSelectedParticipants(prev => prev.filter((_, i) => i !== idx))} /></div>))}</div>
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <div className="calendar-modal-header"><span>Calendar</span><button className="close-btn" onClick={() => setIsCalendarOpen(false)}>×</button></div>
            <div className="calendar-nav"><button className="nav-arrow" onClick={() => changeMonth(-1)}>{'<'}</button><span className="month-year">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button className="nav-arrow" onClick={() => changeMonth(1)}>{'>'}</button></div>
            <div className="weekday-row">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="days-grid">{renderCalendarDays()}</div>
            <div className="calendar-footer"><button className="calendar-confirm-btn" onClick={() => setIsCalendarOpen(false)}>CONFIRM</button></div>
          </div>
        </div>
      )}

      {isExtModalOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal external-modal">
            <div className="calendar-modal-header"><span>External Participant</span><button className="close-btn" onClick={() => setIsExtModalOpen(false)}><X size={20}/></button></div>
            <div className="modal-body">
              <div className="modal-input-group"><label>Name</label><input className="form-input-text-extenal" type="text" value={extName} onChange={(e) => setExtName(e.target.value)} /></div>
              <div className="modal-input-group"><label>Email</label><input className="form-input-text-extenal" type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} /></div>
            </div>
            <button className="calendar-confirm-btn" onClick={() => { 
              // 邮箱检测逻辑：必须包含 @
              if(extName && extEmail.includes('@')) { 
                setSelectedParticipants([...selectedParticipants, {name: extName, email: extEmail}]); 
                setExtName(''); setExtEmail(''); setIsExtModalOpen(false); 
              } else {
                alert("Please enter a valid Name and Email (must contain @)");
              }
            }}>CONFIRM</button>
          </div>
        </div>
      )}

      {/* 底部固定区：排除 filter 视图，因为 filter 的按钮已经放在表单内了 */}
      {view !== 'filter' && (
        <div className="search-footer">
          {view === 'list' && <button className="search-room-btn" onClick={() => setView('results')}><Search size={18} /> Search Room</button>}
          {view === 'booking' && <button className="book-room-btn" onClick={() => { setView('form'); setIsEditing(false); }}>Book Now</button>}
          {view === 'form' && <button className="book-room-btn" onClick={() => { setView('list'); alert('Confirmed'); }}>Confirm</button>}
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;