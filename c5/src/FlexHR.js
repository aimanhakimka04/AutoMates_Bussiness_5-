import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, X, Dumbbell, Accessibility, MapPin, 
  LogIn, LogOut, Calendar, AlertCircle, Clock, 
  ChevronRight, Inbox, CheckCircle, XCircle, Info
} from 'lucide-react';
import './FlexHR.css';

const FlexHR = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('home'); 
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // --- Attendance 状态 ---
  const [isPunching, setIsPunching] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([
    { id: 1, type: 'Punch In', time: '19/02/2026 08:30:15', location: 'Taman Ayer Molek, Melaka' },
  ]);

  // --- Leave 状态与逻辑 ---
  const [leaveForm, setLeaveForm] = useState({
    userName: "ALAN TAN", 
    leaveType: "Annual Leave", 
    reason: "", 
    fromDate: null, 
    toDate: null, 
    appliedDate: new Date()
  });

  const leaveTypes = ["Annual Leave", "Sick Leave", "Emergency Leave", "Personal Leave", "Maternity Leave"];

  // 自动计算时长
  const duration = useMemo(() => {
    if (!leaveForm.fromDate || !leaveForm.toDate) return 0;
    const diffTime = Math.abs(leaveForm.toDate - leaveForm.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包含首尾
    return diffDays;
  }, [leaveForm.fromDate, leaveForm.toDate]);

  // --- Waiting Review 数据 ---
  const [myApplications, setMyApplications] = useState([
    { id: 101, type: 'Leave Request', title: 'Sick Leave', date: '20/02/2026', status: 'Approved', reason: 'High fever.', adminNote: 'Approved. Get well soon!' },
    { id: 102, type: 'Overtime', title: 'OT Request (3h)', date: '18/02/2026', status: 'Rejected', reason: 'Project deployment.', adminNote: 'Budget exceeded for this month.' },
    { id: 103, type: 'Leave Request', title: 'Annual Leave', date: '25/02/2026', status: 'Pending', reason: 'Family trip.', adminNote: '' }
  ]);
  const [selectedTask, setSelectedTask] = useState(null);

  // --- 日历状态 ---
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState('from'); 
  const [viewDate, setViewDate] = useState(new Date(2026, 1, 1)); // 默认为 2026年2月

  const formatDateOnly = (date) => {
    if (!date) return "Select Date";
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const handlePunch = () => {
    setIsPunching(true);
    setTimeout(() => {
      const isNextPunchIn = attendanceHistory.length % 2 === 0;
      const now = new Date();
      const newLog = {
        id: Date.now(),
        type: isNextPunchIn ? 'Punch In' : 'Punch Out',
        time: `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString('en-GB')}`,
        location: 'Taman Melaka Raya, Melaka'
      };
      setAttendanceHistory([newLog, ...attendanceHistory]);
      setIsPunching(false);
    }, 1200);
  };

  const handleBack = () => {
    if (view === 'home') navigate('/');
    else setView('home');
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'Approved': return { color: '#27ae60', icon: <CheckCircle size={14} />, label: 'Approved' };
      case 'Rejected': return { color: '#e74c3c', icon: <XCircle size={14} />, label: 'Rejected' };
      default: return { color: '#f39c12', icon: <Clock size={14} />, label: 'Waiting for Manager' };
    }
  };

  const renderCalendarDays = () => {
    const year = viewDate.getFullYear(); const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; 

    for (let i = 0; i < startOffset; i++) days.push(<div key={`e-${i}`} className="day-cell empty"></div>);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      
      // 逻辑判断
      const isPast = current < today;
      const isInvalidRange = activeDateField === 'to' && leaveForm.fromDate && current < leaveForm.fromDate;
      const isDisabled = isPast || isInvalidRange;
      
      const isSelected = activeDateField === 'from' 
        ? (leaveForm.fromDate && leaveForm.fromDate.getTime() === current.getTime())
        : (leaveForm.toDate && leaveForm.toDate.getTime() === current.getTime());

      days.push(
        <div 
          key={d} 
          className={`day-cell ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`} 
          onClick={() => {
            if (isDisabled) return;
            if (activeDateField === 'from') {
              setLeaveForm({...leaveForm, fromDate: current, toDate: (leaveForm.toDate && current > leaveForm.toDate) ? null : leaveForm.toDate});
            } else {
              setLeaveForm({...leaveForm, toDate: current});
            }
            setIsCalendarOpen(false);
          }}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flexhr-container">
      <nav className="flexhr-nav">
        <div className="nav-back" onClick={handleBack}><ChevronLeft size={24} color="#fff" /></div>
        <span className="nav-title">FlexHR</span>
      </nav>

      <div className="flexhr-main">
        {/* --- HOME VIEW --- */}
        {view === 'home' && (
          <div className="home-layout">
            <h3 className="section-label">Quick Actions</h3>
            <div className="card-grid">
              <div className="action-card" onClick={() => setView('attendance')}>
                <div className="icon-box"><Dumbbell size={42} color="#333" /></div>
                <span className="card-text">Attendance</span>
              </div>
              <div className="action-card" onClick={() => setView('applyLeave')}>
                <div className="icon-box"><Accessibility size={42} color="#333" /></div>
                <span className="card-text">Apply Leave</span>
              </div>
            </div>
            <h3 className="section-label">Your Task</h3>
            <div className="card-grid">
              <div className="action-card" onClick={() => setView('waitingReview')}>
                <div className="icon-box"><Dumbbell size={42} color="#333" /></div>
                <span className="card-text">Application Status</span>
                 
              </div>
            </div>
          </div>
        )}

        {/* --- ATTENDANCE VIEW --- */}
        {view === 'attendance' && (
          <div className="att-module">
            <div className="att-summary">
              <div className="summary-item"><span className="label">Last Action</span><span className="value">{attendanceHistory[0]?.type || '--'}</span></div>
              <div className="summary-divider"></div>
              <div className="summary-item"><span className="label">Time</span><span className="value">{attendanceHistory[0]?.time.split(' ')[1] || '--'}</span></div>
            </div>
            <div className="punch-zone">
              <div className={`punch-outer-ring ${isPunching ? 'spinning' : ''}`}>
                <button className={`new-punch-btn ${attendanceHistory.length % 2 !== 0 ? 'out-state' : 'in-state'}`} onClick={handlePunch} disabled={isPunching}>
                  <div className="btn-content">
                    <span className="main-text">{isPunching ? '...' : (attendanceHistory.length % 2 === 0 ? 'PUNCH IN' : 'PUNCH OUT')}</span>
                    <span className="sub-text">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </button>
              </div>
              <div className="location-pill"><MapPin size={14} /><span>Taman Melaka Raya, Melaka</span></div>
            </div>
            <div className="att-history-list">
              <div className="list-header-row"><h4 className="list-title">History</h4><Calendar size={16} color="#999" /></div>
              {attendanceHistory.map(log => (
                <div key={log.id} className="modern-log-card">
                  <div className={`log-icon ${log.type === 'Punch In' ? 'in' : 'out'}`}>{log.type === 'Punch In' ? <LogIn size={18} /> : <LogOut size={18} />}</div>
                  <div className="log-info">
                    <div className="log-row"><span className="log-label-type">{log.type}</span><span className="log-time-stamp">{log.time}</span></div>
                    <div className="log-address">{log.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- APPLY LEAVE VIEW (完善设计版) --- */}
        {view === 'applyLeave' && (
          <div className="leave-module">
            <div className="leave-form-card">
              <div className="form-section-title">Leave Details</div>
              
              <div className="input-group">
                <label>Applicant Name</label>
                <div className="readonly-input">{leaveForm.userName}</div>
              </div>

              <div className="input-group">
                <label>Leave Type</label>
                <select 
                  className="form-select" 
                  value={leaveForm.leaveType} 
                  onChange={(e) => setLeaveForm({...leaveForm, leaveType: e.target.value})}
                >
                  {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="date-selection-container">
                <div className="date-field" onClick={() => { setActiveDateField('from'); setIsCalendarOpen(true); }}>
                  <label>From Date</label>
                  <div className="date-display-box">
                    <Calendar size={16} />
                    <span>{formatDateOnly(leaveForm.fromDate)}</span>
                  </div>
                </div>
                <div className="date-field" onClick={() => { setActiveDateField('to'); setIsCalendarOpen(true); }}>
                  <label>To Date</label>
                  <div className="date-display-box">
                    <Calendar size={16} />
                    <span>{formatDateOnly(leaveForm.toDate)}</span>
                  </div>
                </div>
              </div>

              <div className="duration-info-bar">
                <Info size={16} color="#2b1d62" />
                <span>Total Duration: <strong>{duration} Day(s)</strong></span>
              </div>

              <div className="input-group">
                <label>Reason / Remarks *</label>
                <textarea 
                  className="form-textarea"
                  placeholder="Please state your reason..." 
                  rows="4" 
                  value={leaveForm.reason} 
                  onChange={(e)=>setLeaveForm({...leaveForm, reason: e.target.value})}
                ></textarea>
              </div>

              <div className="applied-on-badge">
                <Clock size={12} />
                <span>Applied on: {formatDateOnly(leaveForm.appliedDate)}</span>
              </div>

              <button 
                className={`submit-btn ${(!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) ? 'disabled' : ''}`}
                onClick={() => {
                  if (duration <= 0 || !leaveForm.reason) return alert("Please fill complete details");
                  alert("Application Submitted Successfully");
                  setView('home');
                }}
              >
                Submit Application
              </button>
            </div>
          </div>
        )}

        {/* --- APPLICATION STATUS VIEW --- */}
        {view === 'waitingReview' && (
          <div className="review-module">
            <div className="review-header"><h3 className="module-title">Application Status</h3><p className="module-subtitle">Track your submitted requests</p></div>
            <div className="review-list">
              {myApplications.map(task => {
                const info = getStatusInfo(task.status);
                return (
                  <div key={task.id} className="review-card" onClick={() => setSelectedTask(task)}>
                    <div className="review-card-body">
                      <div className="task-icon-box">{task.type === 'Leave Request' ? <Calendar size={20} color="#333" /> : <Clock size={20} color="#333" />}</div>
                      <div className="task-details">
                        <div className="task-top"><span className="task-type-tag">{task.type}</span><span className="task-date">{task.date}</span></div>
                        <span className="task-title-text">{task.title}</span>
                      </div>
                      <ChevronRight size={18} color="#ccc" />
                    </div>
                    <div className="review-card-footer" style={{ borderTop: `1px solid ${info.color}22`, background: `${info.color}08` }}>
                      <span className="status-label" style={{ color: info.color }}>{info.icon} {info.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- DETAIL MODAL --- */}
      {selectedTask && (
        <div className="cal-overlay">
          <div className="detail-modal">
            <div className="detail-header" style={{ background: getStatusInfo(selectedTask.status).color }}>
              <span>Application Detail</span>
              <X size={20} onClick={() => setSelectedTask(null)} />
            </div>
            <div className="detail-content">
              <div className="detail-row"><label>Status</label><span style={{ color: getStatusInfo(selectedTask.status).color }}>{selectedTask.status}</span></div>
              <div className="detail-row"><label>Type</label><span>{selectedTask.type}</span></div>
              <div className="detail-row"><label>Applied Date</label><span>{selectedTask.date}</span></div>
              <div className="detail-row reason-box"><label>Your Reason</label><p>{selectedTask.reason}</p></div>
              {selectedTask.adminNote && (
                <div className="detail-row reason-box"><label>Manager's Remark</label><p className="admin-p">{selectedTask.adminNote}</p></div>
              )}
            </div>
            <button className="close-detail-btn" onClick={() => setSelectedTask(null)}>Close</button>
          </div>
        </div>
      )}

      {/* --- CALENDAR MODAL (严格对应 image_0ffd66) --- */}
      {isCalendarOpen && (
        <div className="cal-overlay">
          <div className="cal-modal">
            <div className="cal-header">
              <span className="cal-title">{activeDateField === 'from' ? 'Select Start Date' : 'Select End Date'}</span>
              <X size={20} className="cal-close" onClick={() => setIsCalendarOpen(false)} />
            </div>
            <div className="cal-nav">
              <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>{"<"}</button>
              <span className="month-year-text">{viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
              <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>{">"}</button>
            </div>
            <div className="cal-week">{['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="cal-grid">{renderCalendarDays()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlexHR;