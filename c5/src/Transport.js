import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Calendar, ChevronDown, 
  X, Edit3, User, MapPin, Clock, Circle, MoreVertical, Navigation 
} from 'lucide-react';
import './Transport.css';

const Transport = () => {
  const navigate = useNavigate();
  
  // ==========================================
  // 测试开关：1 = 有记录, 2 = 无记录
  // ==========================================
  const bookingStatus = 1; 

  // 获取实时时间用于校验
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // --- 状态管理 ---
  const [view, setView] = useState('main'); 
  const [activeTab, setActiveTab] = useState('Booking');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmedOpen, setIsConfirmedOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // 初始化预约列表 (根据 bookingStatus 开关)
  const [bookingsList, setBookingsList] = useState(
    bookingStatus === 1 
      ? [{ id: "VDQ6644", date: "2026-02-12", pickup: "8th & Stellar", dropoff: "Naga Emas", time: "11:00 AM" }]
      : []
  );

  // --- 业务数据状态 ---
  const [pickup, setPickup] = useState('8th & Stellar');
  const [dropoff, setDropoff] = useState('Naga Emas');
  const [bookingDate, setBookingDate] = useState(todayStr); 
  const [bookingTime, setBookingTime] = useState('');

  // --- 逻辑函数 ---
  const handleCancelRide = (id) => {
    setBookingsList(prev => prev.filter(item => item.id !== id));
    setOpenMenuId(null);
  };

  const handleTrackRide = (ride) => {
    setSelectedRide(ride);
    setIsTrackModalOpen(true);
    setOpenMenuId(null);
  };

  const handleBack = () => {
    if (isConfirmedOpen) { setIsConfirmedOpen(false); setView('main'); }
    else if (isTrackModalOpen) { setIsTrackModalOpen(false); }
    else if (isPreviewOpen) { setIsPreviewOpen(false); }
    else if (view === 'results') { setView('form'); }
    else if (view === 'form') { setView('main'); }
    else { navigate('/'); }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 8; h <= 20; h++) {
      const p = h < 12 ? 'AM' : 'PM';
      let dh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      ['00', '30'].forEach(min => {
        if (h === 20 && min === '30') return;
        const timeStr = `${String(dh).padStart(2, '0')}:${min} ${p}`;
        if (bookingDate === todayStr) {
          const slotDate = new Date(); slotDate.setHours(h, parseInt(min), 0);
          if (slotDate > now) slots.push(timeStr);
        } else { slots.push(timeStr); }
      });
    }
    return slots;
  };

  // --- 日历功能 ---
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const changeMonth = (offset) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  const renderCalendarDays = () => {
    const year = viewDate.getFullYear(); const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(<span key={`e-${i}`} className="day-empty"></span>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = new Date(year, month, d, 23, 59, 59) < now;
      days.push(<div key={d} className={`calendar-day ${bookingDate === dateStr ? 'selected' : ''} ${isPast ? 'past-day' : ''}`} onClick={() => { if (!isPast) { setBookingDate(dateStr); setBookingTime(''); } }}>{d}</div>);
    }
    return days;
  };

  return (
    <div className="transport-container">
      <nav className="transport-top-nav">
        <div className="back-arrow" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} /></div>
        <span className="nav-title">{view === 'results' ? 'Booking' : (view === 'form' ? 'New Booking' : 'Transport')}</span>
      </nav>

      <div className="transport-main-content">
        {view === 'main' ? (
          <>
            <div className="transport-tabs-container">
              <div className="transport-tabs-left">
                <button className={`trans-tab ${activeTab === 'Booking' ? 'active' : ''}`} onClick={() => setActiveTab('Booking')}>Booking</button>
                <button className={`trans-tab ${activeTab === 'Timetable' ? 'active' : ''}`} onClick={() => setActiveTab('Timetable')}>Timetable</button>
              </div>
            </div>

            <div className="transport-scroll-area">
              {activeTab === 'Booking' ? (
                (bookingStatus === 2 || bookingsList.length === 0) ? (
                  /* 修正后的空状态结构 */
                  <div className="transport-empty-state">
                    <div className="empty-img-wrapper">
                      <img src="/icon_img/transportpage.png" alt="No Record" />
                    </div>
                  </div>
                ) : (
                  <div className="bookings-list-view" onClick={() => setOpenMenuId(null)}>
                    <div className="my-bookings-header"><Calendar size={20} color="#007bff" /><span>My Bookings</span></div>
                    {bookingsList.map((item) => (
                      <div key={item.id} className="booking-card">
                        <div className="card-header">
                          <span className="van-id">{item.id}</span>
                          <div className="more-options-wrapper">
                            <button className="more-btn" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}><MoreVertical size={18} color="#999" /></button>
                            {openMenuId === item.id && (
                              <div className="card-dropdown">
                                <div className="dropdown-item" onClick={() => handleTrackRide(item)}><Navigation size={14} /><span>Track Ride</span></div>
                                <div className="dropdown-item delete" onClick={() => handleCancelRide(item.id)}><X size={14} /><span>Cancel Ride</span></div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="card-info">
                          <div className="info-row"><Calendar size={14} color="#00a8ff" /><span>{item.date}</span></div>
                          <div className="info-row"><Circle size={14} color="#00a8ff" strokeWidth={3} /><span>{item.pickup}</span></div>
                          <div className="info-row"><MapPin size={14} color="#00a8ff" /><span>{item.dropoff}</span></div>
                          <div className="info-row"><Clock size={14} color="#00a8ff" /><span>{item.time}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="timetable-view">
                  <p className="timetable-header">Mon - Fri (Except Public Holidays)</p>
                  <table className="timetable-table">
                    <thead><tr><th>Route From/To</th><th>Informations</th></tr></thead>
                    <tbody>
                      <tr><td>8th & Stellar &lt;-&gt; Naga Emas</td><td>Morning Session<br/>07:00 AM - 09:00 AM (Every 15 mins)</td></tr>
                      <tr><td>8th & Stellar &lt;-&gt; Naga Emas</td><td>Evening Session<br/>04:30 PM - 07:00 PM (Every 15 mins)</td></tr>
                      <tr><td>8th & Stellar &lt;-&gt; Sri Petaling</td><td>Morning Session<br/>07:00 AM - 09:00 AM (Every 15 mins)</td></tr>
                      <tr><td>8th & Stellar &lt;-&gt; Sri Petaling</td><td>Evening Session<br/>04:30 PM - 06:45 PM (Every 15 mins)</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="transport-action-footer">
              <button className="new-booking-btn" onClick={() => setView('form')}><Plus size={20} /><span>New Booking</span></button>
            </div>
          </>
        ) : view === 'form' ? (
          <div className="booking-form-view">
            <p className="form-intro-text">Need a ride? Book your shuttle in just one step!</p>
            <div className="transport-form-group"><label>Pick-up location *:</label><div className="form-field-box select-type"><select value={pickup} onChange={(e) => setPickup(e.target.value)}><option value="8th & Stellar">8th & Stellar</option><option value="Main Office">Main Office</option></select><ChevronDown size={18} className="select-arrow" /></div></div>
            <div className="transport-form-group"><label>Drop-off location *:</label><div className="form-field-box select-type"><select value={dropoff} onChange={(e) => setDropoff(e.target.value)}><option value="Naga Emas">Naga Emas</option><option value="Train Station">Train Station</option></select><ChevronDown size={18} className="select-arrow" /></div></div>
            <div className="transport-form-group"><label>Date:</label><div className="form-field-box" onClick={() => setIsCalendarOpen(true)}><span>{bookingDate}</span><Calendar size={18} color="#666" /></div></div>
            <div className="transport-form-group"><label>Time *:</label><div className="form-field-box select-type"><select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}><option value="">{generateTimeSlots().length > 0 ? "Select Time" : "No slots available"}</option>{generateTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown size={18} className="select-arrow" /></div></div>
            <div className="transport-form-footer"><button className="search-van-btn" onClick={() => setView('results')} disabled={!bookingTime} style={{ opacity: !bookingTime ? 0.5 : 1 }}>Search Van</button></div>
          </div>
        ) : (
          <div className="results-view-container">
            <div className="results-summary-bar"><div className="summary-left"><div className="route-text">{pickup} → {dropoff}</div><div className="time-text">{bookingDate} {bookingTime}</div></div><div className="summary-right" onClick={() => setView('form')}><Edit3 size={18} color="#2b1d62" /></div></div>
            <div className="results-list"><div className="van-result-card"><div className="van-img-box"><User size={48} color="#ccc" /></div><div className="van-info-box"><h4 className="van-id">VDQ6644</h4><p className="seats-left">9 seats left</p><button className="mini-book-btn" onClick={() => setIsPreviewOpen(true)}>Book</button></div></div></div>
          </div>
        )}
      </div>

      {/* --- Track Ride 小视窗 --- */}
      {isTrackModalOpen && selectedRide && (
        <div className="preview-overlay">
          <div className="preview-modal track-modal">
            <div className="calendar-modal-header"><span style={{color: '#2b1d62', fontWeight: 'bold'}}>Ride Details</span><button className="close-btn" onClick={() => setIsTrackModalOpen(false)}><X size={20}/></button></div>
            <div className="van-badge"><User size={30} color="#2b1d62" /><div className="van-info"><span className="plate-no">{selectedRide.id}</span><span className="status-tag">En-route</span></div></div>
            <div className="preview-content-box" style={{marginTop:'15px'}}><div className="preview-item"><label>Pick-up:</label><div className="preview-value">{selectedRide.pickup}</div></div><div className="preview-item"><label>Drop-off:</label><div className="preview-value">{selectedRide.dropoff}</div></div><div className="preview-row"><div className="preview-item half"><label>Date:</label><div className="preview-value">{selectedRide.date}</div></div><div className="preview-item half"><label>Time:</label><div className="preview-value">{selectedRide.time}</div></div></div></div>
            <button className="calendar-confirm-btn" style={{marginTop:'20px'}} onClick={() => setIsTrackModalOpen(false)}>CLOSE</button>
          </div>
        </div>
      )}

       
      {/* 其余弹窗 (Calendar, Preview, Confirmed) 逻辑保持一致... */}
      {isCalendarOpen && (
        <div className="calendar-overlay">
          <div className="calendar-modal">
            <div className="calendar-modal-header"><span>Calendar</span><button className="close-btn" onClick={() => setIsCalendarOpen(false)}><X size={20}/></button></div>
            <div className="calendar-nav"><button className="nav-arrow" onClick={() => changeMonth(-1)}>&lt;</button><span className="month-year">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button className="nav-arrow" onClick={() => changeMonth(1)}>&gt;</button></div>
            <div className="weekday-row">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="days-grid">{renderCalendarDays()}</div>
            <button className="calendar-confirm-btn" onClick={() => setIsCalendarOpen(false)}>CONFIRM</button>
          </div>
        </div>
      )}

      {(isPreviewOpen || isConfirmedOpen) && (
        <div className="preview-overlay">
          <div className="preview-modal">
            <h3 className="preview-title">{isConfirmedOpen ? 'Booking Confirmed' : 'Preview Your Booking'}</h3>
            <div className="preview-content-box">
              <p className="preview-instruction">Review your details:</p>
              <div className="preview-item"><label>Pick-up:</label><div className="preview-value">{pickup}</div></div>
              <div className="preview-item"><label>Drop-off:</label><div className="preview-value">{dropoff}</div></div>
              <div className="preview-row"><div className="preview-item half"><label>Date:</label><div className="preview-value">{bookingDate}</div></div><div className="preview-item half"><label>Time:</label><div className="preview-value">{bookingTime}</div></div></div>
              {isConfirmedOpen && <div className="status-section" style={{marginTop:'15px', borderTop:'1px dashed #eee', paddingTop:'15px'}}><div style={{color:'#27ae60', fontWeight:'bold'}}>Approved</div><div style={{color:'#1a73e8', fontSize:'12px', marginTop:'5px'}}>Kindly scan QR code from the driver.</div></div>}
            </div>
            <div className="preview-actions">{isConfirmedOpen ? <button className="confirm-close-btn" onClick={() => { setIsConfirmedOpen(false); setView('main'); }}>Close</button> : <><button className="preview-cancel-btn" onClick={() => setIsPreviewOpen(false)}>Cancel</button><button className="preview-confirm-btn" onClick={() => { setIsPreviewOpen(false); setIsConfirmedOpen(true); }}>Confirm</button></>}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transport;