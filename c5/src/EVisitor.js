import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, UserPlus, CalendarCheck, ChevronDown, 
  X, MoreVertical, Edit3, User, Calendar, Building2, CheckCircle, AlertCircle
} from 'lucide-react';
import './EVisitor.css';

// 1. 在组件顶部定义选项
const purposeOptions = ["Business Meeting", "Interview", "Delivery", "Maintenance", "Personal Visit"];
const locationOptions = ["Lobby", "Idea Lab 2", "Idea Lab 5", "Idea Lab 6", "Training Room"];

const EVisitor = () => {
  const navigate = useNavigate();
  
  // 视图状态
  const [view, setView] = useState('menu');
  const [activeListTab, setActiveListTab] = useState('List All');
  const [openMenuId, setOpenMenuId] = useState(null);

  // --- 表单状态管理 ---
  const initialForm = {
    id: null,
    visitor: "",
    idNo: "",
    contact: "",
    email: "",
    company: "",
    remarks: "",
    purpose: "",
    location: "",
    category: "Pre-Register Visitor"
  };
  const [formData, setFormData] = useState(initialForm);

  // --- 预约列表数据 ---
  const [appointments, setAppointments] = useState([
    { id: 1, visitor: "JOHN DOE", idNo: "900101-14-5566", contact: "0123456789", email: "john@tech.com", company: "TECH CORP", host: "ALAN TAN WAI LOON", date: "2026-02-15", status: "Approved", purpose: "Business Meeting", location: "Idea Lab 6" },
    { id: 2, visitor: "SARAH JEN", idNo: "950505-10-1234", contact: "0198887766", email: "sarah@creative.com", company: "CREATIVE INC", host: "ALAN TAN WAI LOON", date: "2026-02-20", status: "Pending", purpose: "Interview", location: "Lobby" }
  ]);

  // --- 日历状态 ---
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState('from');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const formatDate = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleBack = () => {
    if (view === 'preRegister' || view === 'appointmentList') setView('menu');
    else navigate('/');
  };

  // --- 编辑逻辑：点击三个点的 Edit ---
  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      visitor: item.visitor,
      idNo: item.idNo || "",
      contact: item.contact || "",
      email: item.email || "",
      company: item.company,
      remarks: item.remarks || "",
      purpose: item.purpose || "",
      location: item.location || "",
      category: "Pre-Register Visitor"
    });
    setFromDate(new Date(item.date)); // 同步日期
    setView('preRegister');
    setOpenMenuId(null);
  };

  // --- 提交登记 (新增或保存编辑) ---
  const handleRegister = () => {
    if (!formData.visitor || !fromDate) {
      alert("Please fill in Name and Date!");
      return;
    }

    if (formData.id) {
      // 编辑模式
      setAppointments(appointments.map(app => 
        app.id === formData.id ? { ...app, ...formData, visitor: formData.visitor.toUpperCase(), date: formatDate(fromDate) } : app
      ));
      alert("Updated successfully!");
    } else {
      // 新增模式
      const newApp = {
        ...formData,
        id: Date.now(),
        visitor: formData.visitor.toUpperCase(),
        host: "ALAN TAN WAI LOON",
        date: formatDate(fromDate),
        status: "Pending"
      };
      setAppointments([newApp, ...appointments]);
      alert("Registered successfully!");
    }
    setFormData(initialForm);
    setView('appointmentList'); // 提交后跳转到列表
  };

  // 日历渲染逻辑 (略，同之前版本)
  const changeMonth = (offset) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  const renderCalendarDays = () => {
    const year = viewDate.getFullYear(); const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(<span key={`e-${i}`} className="day-empty"></span>);
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isPast = cellDate < today;
      const isBeforeFrom = activeDateField === 'to' && fromDate && cellDate < fromDate;
      const isSelected = activeDateField === 'from' ? (fromDate && formatDate(fromDate) === formatDate(cellDate)) : (toDate && formatDate(toDate) === formatDate(cellDate));
      days.push(<div key={d} className={`calendar-day ${isSelected ? 'selected' : ''} ${(isPast || isBeforeFrom) ? 'past' : ''}`} 
        onClick={() => { if (!isPast && !isBeforeFrom) { if (activeDateField === 'from') { setFromDate(cellDate); if (toDate && cellDate > toDate) setToDate(null); } else setToDate(cellDate); } }}>{d}</div>);
    }
    return days;
  };

  const filteredList = appointments.filter(app => {
    if (activeListTab === 'Approved Visits') return app.status === 'Approved';
    if (activeListTab === 'Pending Approval') return app.status === 'Pending';
    return true;
  });

  return (
    <div className="evisitor-container" onClick={() => setOpenMenuId(null)}>
      <nav className="evisitor-top-nav">
        <div className="back-arrow" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} /></div>
        <span className="nav-title">{view === 'preRegister' ? (formData.id ? 'Edit Registration' : 'Pre-Register Visitor') : (view === 'appointmentList' ? 'Appointment Listing' : 'eVisitor')}</span>
      </nav>

      <div className="evisitor-main-content">
        {view === 'menu' && (
          <>
            <div className="evisitor-card-row">
              <div className="evisitor-card" onClick={() => { setFormData(initialForm); setView('preRegister'); }}>
                <div className="card-icon-box"><UserPlus size={32} color="#333" /></div>
                <span className="card-label">Pre-Register Visitor</span>
              </div>
              <div className="evisitor-card" onClick={() => setView('appointmentList')}>
                <div className="card-icon-box"><CalendarCheck size={32} color="#333" /></div>
                <span className="card-label">Appointment Listing</span>
              </div>
            </div>
            <div className="evisitor-illustration-section"><img src="/icon_img/evisitorpage.png" alt="Illustration" className="hero-illustration" /></div>
          </>
        )}

        {view === 'appointmentList' && (
          <div className="ev-list-view">
            <div className="ev-tabs">{['List All', 'Approved Visits', 'Pending Approval'].map(tab => (
              <button key={tab} className={`ev-tab ${activeListTab === tab ? 'active' : ''}`} onClick={() => setActiveListTab(tab)}>{tab}</button>
            ))}</div>
            <div className="ev-cards-container">
              {filteredList.map(item => (
                <div key={item.id} className="ev-item-card">
                  <div className="ev-card-header">
                    <div className="visitor-name-box">
                      <span className="visitor-name">{item.visitor}</span>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status === 'Approved' ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}{item.status}</span>
                    </div>
                    <div className="ev-more-wrapper">
                      <button className="ev-more-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}><MoreVertical size={18} color="#999" /></button>
                      {openMenuId === item.id && (
                        <div className="ev-dropdown">
                          <div className="ev-dropdown-item" onClick={() => handleEdit(item)}><Edit3 size={14} /><span>Edit</span></div>
                          <div className="ev-dropdown-item delete" onClick={() => setAppointments(appointments.filter(a => a.id !== item.id))}><X size={14} /><span>Cancel</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ev-card-body">
                    <div className="ev-info-row"><Building2 size={14} color="#00a8ff" /><span>{item.company}</span></div>
                    <div className="ev-info-row"><User size={14} color="#00a8ff" /><span>Host: {item.host}</span></div>
                    <div className="ev-info-row"><Calendar size={14} color="#00a8ff" /><span>{item.date}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'preRegister' && (
          <div className="evisitor-form-container">
            <div className="ev-date-row">
              <div className="ev-date-box" onClick={() => { setActiveDateField('from'); setIsCalendarOpen(true); }}>
                <span className="date-label">From Date</span>
                <span className="date-value">{formatDate(fromDate)}</span>
              </div>
              <div className="ev-date-box" onClick={() => { setActiveDateField('to'); setIsCalendarOpen(true); }}>
                <span className="date-label">To Date</span>
                <span className="date-value">{formatDate(toDate)}</span>
              </div>
            </div>

            <div className="ev-form-group"><label>Name *</label><input type="text" className="ev-input" value={formData.visitor} onChange={(e)=>setFormData({...formData, visitor: e.target.value})} /></div>
            <div className="ev-form-group"><label>Identity No. *</label><input type="text" className="ev-input" value={formData.idNo} onChange={(e)=>setFormData({...formData, idNo: e.target.value})} /></div>
            <div className="ev-form-group"><label>Contact *</label><input type="text" className="ev-input" value={formData.contact} onChange={(e)=>setFormData({...formData, contact: e.target.value})} /></div>
            <div className="ev-form-group"><label>Email *</label><input type="email" className="ev-input" value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} /></div>
            <div className="ev-form-group"><label>Company *</label><input type="text" className="ev-input" value={formData.company} onChange={(e)=>setFormData({...formData, company: e.target.value})} /></div>
            
            {/* 2. 下拉菜单使用定义好的选项 */}
            <div className="ev-form-group">
              <label>Purpose of Visit</label>
              <div className="ev-select-box">
                <select className="ev-select-native" value={formData.purpose} onChange={(e)=>setFormData({...formData, purpose: e.target.value})}>
                  <option value="">Select Purpose</option>
                  {purposeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown size={18} color="#666" />
              </div>
            </div>

            <div className="ev-form-group">
              <label>Meeting Location *</label>
              <div className="ev-select-box">
                <select className="ev-select-native" value={formData.location} onChange={(e)=>setFormData({...formData, location: e.target.value})}>
                  <option value="">Select Location</option>
                  {locationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown size={18} color="#666" />
              </div>
            </div>

            <button className="ev-register-btn" onClick={handleRegister}>
              {formData.id ? 'Save Changes' : 'Register Now'}
            </button>
          </div>
        )}
      </div>

      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <div className="calendar-modal-header"><span>Select Date</span><button className="close-btn" onClick={() => setIsCalendarOpen(false)}><X size={20}/></button></div>
            <div className="calendar-nav"><button className="nav-arrow" onClick={() => changeMonth(-1)}>&lt;</button><span className="month-year">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button className="nav-arrow" onClick={() => changeMonth(1)}>&gt;</button></div>
            <div className="weekday-row">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="days-grid">{renderCalendarDays()}</div>
            <button className="calendar-confirm-btn" onClick={() => setIsCalendarOpen(false)}>CONFIRM</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EVisitor;