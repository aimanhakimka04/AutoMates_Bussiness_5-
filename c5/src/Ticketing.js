import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, FileText, ChevronRight, ChevronDown, Upload, X, 
  CheckCircle2, Clock, Ticket, Calendar as CalendarIcon 
} from 'lucide-react';
import './Ticketing.css';

const Ticketing = () => {
  const navigate = useNavigate();
  // 视图状态：'main', 'form', 'success', 'track'
  const [view, setView] = useState('main'); 
  // 追踪页 Tab：'My Ticket' (对应 Open), 'Closed Ticket' (对应 Closed)
  const [activeTrackTab, setActiveTrackTab] = useState('My Ticket'); 
  const [lastTicketId, setLastTicketId] = useState("");

  // --- 数据常量 (对齐 image_fbd262, image_fc28c0) ---
  const levels = ["Basement", "Ground Floor", "Level 7", "Level 8", "Level 17"];
  const facilities = ["Common Area/ Lobby"];
  const zones = ["Main Lobby", "Lift Lobby"];
  const categories = ["Access & Security", "Electrical", "Plumbing / Water", "Electronics / IT Systems", "Other"];

  const descriptionMap = {
    "Electrical": ["Light not working", "Power plug/socket issue", "Air conditioning not working", "Elevator malfunction"],
    "Access & Security": ["Access card not working", "Door lock issue", "CCTV malfunction"],
    "Plumbing / Water": ["Pipe leaking", "Tap broken", "Toilet blockage"],
    "Electronics / IT Systems": ["Network connectivity issue", "Display panel off", "Speaker issue"],
    "Other": ["General feedback", "Other: Specify"]
  };

  // --- 状态管理 ---
  const [formData, setFormData] = useState({
    submittedBy: "100755", //
    email: "",
    level: "",
    facilityArea: "",
    zone: "",
    issueCategory: "",
    issueDescription: "",
    remarks: ""
  });

  // 模拟数据，严格匹配 image_fd9119.png 的内容结构
  const [tickets, setTickets] = useState([
    { id: "HT00064", issueCategory: "Electrical", issueDescription: "Light not working", date: "2026-01-22 10:20:18", status: "Open" },
    { id: "HT00062", issueCategory: "Electrical", issueDescription: "Light not working", date: "2026-01-21 14:23:42", status: "Open" },
    { id: "HT00059", issueCategory: "Other", issueDescription: "Other: Specify", date: "2026-01-15 14:23:07", status: "Open" },
    { id: "HT00045", issueCategory: "Electrical", issueDescription: "Air conditioning", date: "2026-01-10 09:15:00", status: "Closed" }
  ]); 

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImgPreview, setShowImgPreview] = useState(false);
  const fileInputRef = useRef(null);

  // --- 逻辑处理 ---
  const handleBack = () => {
    if (view === 'form' || view === 'track' || view === 'success') setView('main');
    else navigate('/');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const ticketId = "HT" + Math.floor(10000 + Math.random() * 90000).toString().slice(-5);
    setLastTicketId(ticketId);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${now.toTimeString().split(' ')[0]}`;

    const newTicket = {
      ...formData,
      id: ticketId,
      date: timestamp,
      status: "Open"
    };
    
    setTickets([newTicket, ...tickets]);
    setView('success'); //
  };

  // 根据选中的 Tab 过滤
  const filteredTickets = tickets.filter(t => {
    if (activeTrackTab === 'My Ticket') return t.status === 'Open';
    if (activeTrackTab === 'Closed Ticket') return t.status === 'Closed';
    return true;
  });

  return (
    <div className="ticketing-container">
      {/* 顶部导航：成功页面按截图不显示导航 */}
      {view !== 'success' && (
        <nav className="ticketing-top-nav">
          <div className="back-arrow" onClick={handleBack}>
            <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span className="nav-title">
            {view === 'form' ? 'Submit New Ticket' : (view === 'track' ? 'Track Your Tickets' : 'Ticketing')}
          </span>
        </nav>
      )}

      <div className="ticketing-content-area">
        {/* 1. 主菜单 */}
        {view === 'main' && (
          <>
            <div className="ticketing-hero">
              <div className="hero-text"><h2>What can we assist you with?</h2></div>
              <div className="hero-img-box"><img src="/icon_img/ticketingpage.png" alt="Hero" /></div>
            </div>
            <div className="ticketing-menu">
              <div className="ticketing-item" onClick={() => setView('form')}>
                <div className="item-icon-box"><div className="icon-circle-bg"><FileText size={20} color="#666" /></div></div>
                <div className="item-text-box"><h3>Submit New Ticket</h3><p>Create a ticket to get assistance</p></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="ticketing-item" onClick={() => setView('track')}>
                <div className="item-icon-box"><div className="icon-circle-bg"><FileText size={20} color="#666" /></div></div>
                <div className="item-text-box"><h3>Track Your Tickets</h3><p>Review current and previous tickets</p></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
            </div>
          </>
        )}

        {/* 2. 提交表单 */}
        {view === 'form' && (
          <form className="ticketing-form" onSubmit={handleSubmit}>
            <div className="t-form-group"><label>Submitted By</label><input type="text" value={formData.submittedBy} readOnly className="t-input-readonly" /></div>
            <div className="t-form-group"><label>Email</label><input type="email" className="t-input" placeholder="example@mail.com" onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
            
            <div className="t-form-group"><label>Please select a level *</label>
              <div className="t-select-wrapper">
                <select required value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})}>
                  <option value="">Select item</option>{levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select><ChevronDown size={18} className="t-select-icon" />
              </div>
            </div>

            <div className="t-form-group"><label>Please select a facility area *</label>
              <div className="t-select-wrapper">
                <select required value={formData.facilityArea} onChange={(e) => setFormData({...formData, facilityArea: e.target.value})}>
                  <option value="">Select item</option>{facilities.map(f => <option key={f} value={f}>{f}</option>)}
                </select><ChevronDown size={18} className="t-select-icon" />
              </div>
            </div>

            <div className="t-form-group"><label>Please select a zone</label>
              <div className="t-select-wrapper">
                <select value={formData.zone} onChange={(e) => setFormData({...formData, zone: e.target.value})}>
                  <option value="">Select item</option>{zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select><ChevronDown size={18} className="t-select-icon" />
              </div>
            </div>

            <div className="t-form-group"><label>Please select a issue category / issue type *</label>
              <div className="t-select-wrapper">
                <select required value={formData.issueCategory} onChange={(e) => setFormData({...formData, issueCategory: e.target.value, issueDescription: ""})}>
                  <option value="">Select item</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select><ChevronDown size={18} className="t-select-icon" />
              </div>
            </div>

            <div className="t-form-group"><label>Please select a issue description *</label>
              <div className="t-select-wrapper">
                <select required disabled={!formData.issueCategory} value={formData.issueDescription} onChange={(e) => setFormData({...formData, issueDescription: e.target.value})}>
                  <option value="">Select item</option>
                  {formData.issueCategory && descriptionMap[formData.issueCategory].map(d => <option key={d} value={d}>{d}</option>)}
                </select><ChevronDown size={18} className="t-select-icon" />
              </div>
            </div>

            <div className="t-form-group">
              <label>Attachment (Document/Photo)</label>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
              <div className="t-upload-box" onClick={() => fileInputRef.current.click()}><Upload size={20} color="#999" /><span>{selectedFile ? "Change File" : "Upload File"}</span></div>
              {selectedFile && (
                <div className="selected-file-info" onClick={() => setShowImgPreview(true)}>
                  <FileText size={14} color="#2b1d62" />
                  <span className="file-name-text">{selectedFile.name}</span>
                </div>
              )}
            </div>

            <div className="t-form-group"><label>Remarks</label><textarea className="t-textarea" rows="3" onChange={(e) => setFormData({...formData, remarks: e.target.value})}></textarea></div>
            <button type="submit" className="t-submit-btn">Submit</button>
          </form>
        )}

        {/* 3. 提交成功页面 (对齐 image_fca7e6) */}
        {view === 'success' && (
          <div className="ticketing-success-view">
            <div className="success-content">
              <div className="success-icon-circle">
                <div className="success-doc-icon">
                  <CheckCircle2 size={48} color="#4fbaff" fill="white" />
                </div>
              </div>
              <h2 className="success-title">Your Ticket ID ({lastTicketId}) has been successful submitted!</h2>
              <p className="success-desc">Our team will review your report shortly. You can track the status of your ticket in the app.</p>
            </div>
            <button className="t-done-btn" onClick={() => setView('track')}>Done</button>
          </div>
        )}

        {/* 4. 工单追踪列表 (对齐 image_fd9119) */}
        {view === 'track' && (
          <div className="ticketing-track-view">
             <div className="track-tabs">
               {['My Ticket', 'Closed Ticket'].map(tab => (
                 <button key={tab} className={`track-tab ${activeTrackTab === tab ? 'active' : ''}`} onClick={() => setActiveTrackTab(tab)}>{tab}</button>
               ))}
             </div>
             
             <div className="ticket-list">
               {filteredTickets.length === 0 ? (
                 <div className="track-empty"><img src="/icon_img/transportpage.png" alt="Empty" /><p>No records found</p></div>
               ) : (
                 filteredTickets.map(t => (
                   <div key={t.id} className="ticket-card">
                     <div className="ticket-card-header">
                       <span style={{color: '#333', fontWeight: '600', fontSize: '14px'}}>
                         {t.issueCategory} - {t.issueDescription} #{t.id}
                       </span>
                     </div>
                     <div className="ticket-card-body" style={{paddingTop: '8px'}}>
                       {/* 这一行是 image_fd9119 中带 Clock 图标的行 */}
                       <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom: '4px'}}><Clock size={14} color="#aaa" /></div>
                       
                       {/* 这一行是带 Calendar 图标和日期时间的行 */}
                       <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom: '6px'}}>
                         <CalendarIcon size={14} color="#00a8ff" />
                         <span style={{fontSize:'12px', color:'#666'}}>{t.date}</span>
                       </div>

                       {/* 这一行是带 Ticket 图标和状态的行 */}
                       <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                         <Ticket size={14} color="#00a8ff" />
                         <span style={{fontSize:'12px', fontWeight: '500', color: t.status === 'Open' ? '#2b1d62' : '#888'}}>
                           {t.status}
                         </span>
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}
      </div>

      {/* 手机比例预览 Modal */}
      {showImgPreview && previewUrl && (
        <div className="preview-overlay" style={{zIndex: 20000}}>
          <div className="image-preview-modal">
            <div className="preview-header"><span>Image Preview</span><button className="close-btn" onClick={() => setShowImgPreview(false)}><X size={24}/></button></div>
            <div className="preview-body"><img src={previewUrl} alt="Preview" className="phone-size-img" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ticketing;