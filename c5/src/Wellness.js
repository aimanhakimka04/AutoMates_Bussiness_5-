import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Dumbbell, User2, BookOpen, Stethoscope, 
  ChevronRight, MapPin, Calendar, Clock, Info, UserCheck, X, 
  ChevronDown, ChevronUp, Ticket, UserCircle,
  FilePenLine, Monitor, CalendarCheck, CalendarDays, AlertCircle, Trash2
} from 'lucide-react';
import './Wellness.css';

const Wellness = () => {
  const navigate = useNavigate();
  // 视图控制：menu, fitness, nursing, tcm, tcm-*, physio, physio-*, ...
  const [view, setView] = useState('menu');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null); 
  const [selectedTcmAppointment, setSelectedTcmAppointment] = useState(null);
  const [selectedPhysioAppointment, setSelectedPhysioAppointment] = useState(null); // 新增：选中的 Physio 预约
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [nursingModal, setNursingModal] = useState(null);

  //----------------------------Interactive Form State----------------//
  const [profileData, setProfileData] = useState({
    fullName: "ALAN TAN WAI LOON",
    email: "",
    phone: "",
    emergencyName: "",
    emergencyPhone: "",
    age: "",
    gender: "",
    primaryGoal: "",
    timeline: "",
    activityLevel: "",
    trainingDays: "",
    onDiet: "No",
    trainingInterests: [],
    preferredMode: "",
    preferredTime: "",
    workedWithTrainer: "No",
    motivations: []
  });

  const handleInputChange = (field, value) => {
    if (field === 'age') {
      const val = parseInt(value);
      if (val < 0) value = 0;
      if (val > 100) value = 100;
    }
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMultiSelect = (field, value) => {
    setProfileData(prev => {
      const current = prev[field];
      const isExist = current.includes(value);
      return {
        ...prev,
        [field]: isExist ? current.filter(i => i !== value) : [...current, value]
      };
    });
  };
  //-------------------end of Form State -------------------------//

  const [expanded, setExpanded] = useState({
    basic: true, goals: true, lifestyle: true, prefs: true, motivation: true
  });
  const toggleSection = (sec) => setExpanded(prev => ({ ...prev, [sec]: !prev[sec] }));

  const timetableStatus = 0; 

  const classes = [
    { id: "C1", name: "Zumba | Group Training", time: "18:00 - 20:00", date: "13 Feb 2026", location: "Fitness Studio, Level 19" },
    { id: "C2", name: "Yoga | Morning Flow", time: "08:30 - 10:00", date: "15 Feb 2026", location: "Idea Lab 2" }
  ];

  const trainers = [
    { name: "Reiko Chye", exp: "3 Years", specs: ["Fat Loss", "Cardio Training"] },
    { name: "Edward Chuah", exp: "15 Years", specs: ["Strength Training", "Bodybuilding"] },
    { name: "Derek Koay", exp: "2 Years", specs: ["Yoga", "Flexibility"] }
  ];

  const memberships = [
    { 
      id: 1, 
      name: "Standard Training Package", 
      detail: "Includes 12 personal training sessions", 
      validity: "60 day(s)", 
      fee: "RM 0", 
      desc: "For short-term results or getting back into training. Focused on re-establishing habits and jumpstarting progress.",
      coachPricing: [
        { level: "FORM Coach (Level 1)", total: "RM2256", rate: "RM188/session" },
        { level: "LEAD Coach (Level 2)", total: "RM2640", rate: "RM220/session" },
        { level: "MENTOR Coach (Level 3)", total: "RM3120", rate: "RM260/session" }
      ]
    },
    { 
      id: 2, 
      name: "Advanced Training Package", 
      detail: "Includes 24 personal training sessions", 
      validity: "90 day(s)", 
      fee: "RM 0", 
      desc: "Medium-term training for sustainable results and deeper lifestyle integration.",
      coachPricing: [
        { level: "FORM Coach (Level 1)", total: "RM4512", rate: "RM188/session" },
        { level: "LEAD Coach (Level 2)", total: "RM5280", rate: "RM220/session" },
        { level: "MENTOR Coach (Level 3)", total: "RM6240", rate: "RM260/session" }
      ]
    },
    { 
      id: 3, 
      name: "Extreme Training Package (FORM90)", 
      detail: "Includes 36 personal training sessions", 
      validity: "120 day(s)", 
      fee: "RM 0", 
      desc: "Long-term transformation program for complete lifestyle and habit overhaul.",
      coachPricing: [
        { level: "FORM Coach (Level 1)", total: "RM6768", rate: "RM188/session" },
        { level: "LEAD Coach (Level 2)", total: "RM7920", rate: "RM220/session" },
        { level: "MENTOR Coach (Level 3)", total: "RM9360", rate: "RM260/session" }
      ]
    }
  ];

  // --- TCM 数据定义 ---
  const [tcmAppointments, setTcmAppointments] = useState([
    { id: "T1", title: "Acupuncture Session", provider: "Wellness TCM", date: "22 Feb 2026", time: "14:00 - 15:00", location: "TCM Room, Level 19", status: "Confirmed" }
  ]);

  const tcmPackages = [
    { id: 101, name: "Basic Acupuncture Set", detail: "5 Sessions + Consultation", fee: "RM 450", desc: "Focuses on balancing energy flow and relieving chronic pain." },
    { id: 102, name: "Premium Tui Na Therapy", detail: "10 Sessions (60 mins each)", fee: "RM 880", desc: "Deep tissue Chinese massage to improve circulation and muscle recovery." }
  ];

  // --- Physiotherapy 数据定义 ---
  const [physioAppointments, setPhysioAppointments] = useState([
    { id: "P1", title: "Sports Massage", provider: "Wellness Physio", date: "23 Feb 2026", time: "09:00 - 10:00", location: "Physio Room, Level 19", status: "Confirmed" }
  ]);

  const physioPackages = [
    { id: 201, name: "Recovery Package", detail: "5 Sessions (60 mins each)", fee: "RM 600", desc: "Post-workout recovery and muscle relaxation through therapeutic massage." },
    { id: 202, name: "Rehabilitation Program", detail: "10 Sessions with assessment", fee: "RM 1200", desc: "Personalized rehab plan for injury recovery and prevention." }
  ];

  const myBookings = [
    {
      id: "B1",
      title: "13/1 Zumba | Group Training",
      provider: "EXFORM",
      date: "13 Jan 2026",
      time: "18:00 - 20:00 (4)",
      spots: "4/12 spots",
      location: "Fitness Studio, Level 19, Menara Chin Hin",
      desc: "High-energy cardio session combined with Latin-inspired dance moves."
    }
  ];

  // 映射 TCM 菜单项到视图
  const tcmViewMap = {
    "About TCM": "tcm-about",
    "Purchase TCM Session": "tcm-purchase",
    "Schedule My Appointment": "tcm-schedule",
    "View My Appointment": "tcm-view"
  };

  // 映射 Physio 菜单项到视图
  const physioViewMap = {
    "About Physiotherapy": "physio-about",
    "Purchase Physio Session": "physio-purchase",
    "Schedule My Appointment": "physio-schedule",
    "View My Appointment": "physio-view"
  };

  const handleBack = () => {
    if (view === 'menu') navigate('/');
    else if (view.startsWith('tcm-')) {
      if (view === 'tcm-appointment-detail') setView('tcm-view');
      else setView('tcm');
    }
    else if (view.startsWith('physio-')) {
      if (view === 'physio-appointment-detail') setView('physio-view');
      else setView('physio');
    }
    else if (view === 'trainer-profile') setView('trainers');
    else if (view === 'wellness-profile') setView('membership-detail');
    else if (view === 'membership-detail') {
      // 根据套餐类型返回对应的购买列表页
      if (selectedPackage?.coachPricing) {
        setView('membership-list');      // 健身套餐返回健身套餐列表
      } else if (selectedPackage?.id >= 200) { // Physio 套餐 ID 从 200 开始
        setView('physio-purchase');
      } else {
        setView('tcm-purchase');          // TCM 套餐返回 TCM 购买页
      }
    }
    else if (view === 'booking-detail') setView('my-bookings'); 
    else if (['timetable', 'trainers', 'membership-list', 'my-bookings'].includes(view)) setView('fitness');
    else setView('menu');
  };

  const getNavTitle = () => {
    if (view.startsWith('tcm-')) {
      if (view === 'tcm-appointment-detail') return 'Appointment Details';
      return 'Wellness: TCM';
    }
    if (view.startsWith('physio-')) {
      if (view === 'physio-appointment-detail') return 'Appointment Details';
      return 'Wellness: Physiotherapy';
    }
    if (view === 'wellness-profile') return 'Wellness Profile';
    if (view === 'booking-detail') return 'Booking Detail';
    if (['timetable', 'trainers', 'membership-list', 'my-bookings'].includes(view)) return 'Wellness Journey';
    if (view === 'fitness') return 'Wellness: Fitness Studio';
    if (view === 'nursing') return 'Nursing';
    if (view === 'physio') return 'Wellness: Physiotherapy';
    return 'Wellness';
  };

  // 处理 TCM 预约：创建新预约
  const handleBookTcmAppointment = () => {
    const newAppointment = {
      id: `T${Date.now()}`,
      title: "Pulse Diagnosis & Consultation",
      provider: "Wellness TCM",
      date: "Tomorrow",
      time: "10:00 - 10:30",
      location: "TCM Room, Level 19",
      status: "Confirmed"
    };
    setTcmAppointments(prev => [...prev, newAppointment]);
    setView('tcm-view');
  };

  // 删除 TCM 预约
  const handleDeleteTcmAppointment = (id) => {
    setTcmAppointments(prev => prev.filter(app => app.id !== id));
    setView('tcm-view');
  };

  // 处理 Physio 预约：创建新预约
  const handleBookPhysioAppointment = () => {
    const newAppointment = {
      id: `P${Date.now()}`,
      title: "Sports Massage",
      provider: "Wellness Physio",
      date: "Tomorrow",
      time: "09:00 - 10:00",
      location: "Physio Room, Level 19",
      status: "Confirmed"
    };
    setPhysioAppointments(prev => [...prev, newAppointment]);
    setView('physio-view');
  };

  // 删除 Physio 预约
  const handleDeletePhysioAppointment = (id) => {
    setPhysioAppointments(prev => prev.filter(app => app.id !== id));
    setView('physio-view');
  };

  return (
    <div className="wellness-container">
      <nav className="wellness-top-nav">
        <div className="back-arrow" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} /></div>
        <span className="nav-title">{getNavTitle()}</span>
      </nav>

      <div className="wellness-scroll-content">
        {/* --- 1. 主菜单 --- */}
        {view === 'menu' && (
          <div className="wellness-main-menu">
            <div className="wellness-card-grid">
              <div className="wellness-card" onClick={() => setView('fitness')}><Dumbbell size={30} color="#333" /><span>Fitness Studio</span></div>
              <div className="wellness-card" onClick={() => setView('physio')}><Stethoscope size={30} color="#333" /><span>Physiotherapy</span></div>
              <div className="wellness-card" onClick={() => setView('nursing')}><User2 size={30} color="#333" /><span>Nursing</span></div>
              <div className="wellness-card" onClick={() => setView('tcm')}><BookOpen size={30} color="#333" /><span>TCM</span></div>
            </div>
            <div className="wellness-hero-illustration"><img src="/icon_img/wellnesspage.png" alt="Wellness" /></div>
          </div>
        )}

        {/* --- 2. Fitness Studio 菜单 --- */}
        {view === 'fitness' && (
          <div className="fitness-view">
            <div className="fitness-banner">
              <div className="banner-left-text">
                <h2>Start Your Free Trial Today</h2>
                <p>Kickstart your fitness journey with a complimentary trial session!</p>
                <button className="free-trial-btn">Free Trial</button>
              </div>
              <div className="banner-right-img"><img src="/icon_img/studio.png" alt="Studio" /></div>
            </div>
            <div className="list-menu">
              <div className="list-item" onClick={() => setView('timetable')}><div className="item-content"><Calendar size={20}/><div><h4>Timetable Class</h4><p>Schedule your class</p></div></div><ChevronRight size={20} color="#ccc" /></div>
              <div className="list-item" onClick={() => setView('trainers')}><div className="item-content"><UserCheck size={20}/><div><h4>Personal Trainer Profile</h4><p>Discover detailed profiles</p></div></div><ChevronRight size={20} color="#ccc" /></div>
              <div className="list-item" onClick={() => setView('membership-list')}><div className="item-content"><Dumbbell size={20}/><div><h4>Buy Membership</h4><p>Your fitness partner starts here</p></div></div><ChevronRight size={20} color="#ccc" /></div>
              <div className="list-item" onClick={() => setView('my-bookings')}><div className="item-content"><Calendar size={20}/><div><h4>My Bookings</h4><p>Manage your bookings</p></div></div><ChevronRight size={20} color="#ccc" /></div>
            </div>
          </div>
        )}

        {/* --- 3. Timetable 视图 --- */}
        {view === 'timetable' && (
          <div className="timetable-page-container">
            {timetableStatus === 1 ? (
              <div className="timetable-view-empty">
                <div className="timetable-section"><h3 className="timetable-header">Book Your Class</h3><p className="timetable-subtext">No classes available at the moment.</p></div>
                <div className="timetable-section"><h3 className="timetable-header">Book Your Personal Trainer</h3><div className="no-data-wrapper"><img src="/icon_img/empty.png" alt="No data" className="no-data-img" /><h4 className="no-data-title">No sessions yet.</h4></div></div>
              </div>
            ) : (
              <div className="timetable-view-list">
                <div className="timetable-section">
                  <h3 className="section-title">Book Your Class</h3>
                  <div className="class-list">
                    {classes.map(c => (
                      <div key={c.id} className="class-card-item">
                        <div className="class-info-left"><h4>{c.name}</h4><p><Clock size={12}/> {c.time} | {c.date}</p><p><MapPin size={12}/> {c.location}</p></div>
                        <button className="book-now-btn" onClick={() => setShowConfirm(true)}>Book</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="timetable-section">
                  <h3 className="section-title">Book Your Personal Trainer</h3>
                  <div className="trainer-list-mini">
                    {trainers.map((t, i) => (
                      <div key={i} className="mini-trainer-card" onClick={() => { setSelectedTrainer(t); setView('trainer-profile'); }}>
                        <div className="trainer-card-img-placeholder"></div>
                        <div className="trainer-card-info"><h4>{t.name}</h4><p>Experience: {t.exp}</p></div>
                        <ChevronRight size={18} color="#ccc" className="mini-arrow" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 4. Nursing --- */}
        {view === 'nursing' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer"></div>
            <div className="nursing-info-box">
              <h3>Nursing Room</h3>
              <div className="loc-row"><MapPin size={18} color="#666" /> <div><strong>Location</strong><p>Nursing Room, Level 19, Menara Chin Hin</p></div></div>
              
              <button className="blue-cap-btn" onClick={() => setNursingModal('support')}>
                How Do We Support You?
              </button>
              
              <button className="blue-cap-btn rules-border" onClick={() => setNursingModal('rules')}>
                Nursing Room House Rules
              </button>
              <div className="nursing-divider"></div>
              
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">
                  The Pink Initiatives aim to create a healthier and safer workplace for female employees by promoting inclusivity and care for their specific needs. This initiative supports both nursing mothers and women experiencing menstrual discomfort through designated facilities and resources that enable better comfort and wellbeing at work.
                </p>

                <h4 className="extra-section-title">How It Works</h4>
                <div className="extra-how-works-card">
                  <ul className="extra-bullet-list">
                    <li>• Entry requires employee / visitor card scan.</li>
                    <li>• You are required to read the Nursing Room House Rules before using it.</li>
                    <li>• For issues or suggestions, use the "Ticketing" feature in the Employee App.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 5. TCM 主菜单 --- */}
        {view === 'tcm' && (
          <div className="tcm-view">
            <div className="tcm-banner">
              <div className="tcm-text"><h3>TCM</h3><p>Traditional Chinese Medicine (TCM) services at Chin Hin.</p></div>
              <img src="/icon_img/tcm.png" alt="TCM" className="tcm-banner-img" />
            </div>
            <div className="list-menu">
              {Object.entries(tcmViewMap).map(([label, viewName]) => (
                <div key={label} className="list-item" onClick={() => setView(viewName)}>
                  <div className="item-content">
                    {label === "About TCM" && <FilePenLine size={22} color="#666" strokeWidth={1.5} />}
                    {label === "Purchase TCM Session" && <Monitor size={22} color="#666" strokeWidth={1.5} />}
                    {label === "Schedule My Appointment" && <CalendarCheck size={22} color="#666" strokeWidth={1.5} />}
                    {label === "View My Appointment" && <CalendarDays size={22} color="#666" strokeWidth={1.5} />}
                    <div><h4>{label}</h4><p>{label === "About TCM" ? "Overview and How it Works" : 
                         label === "Purchase TCM Session" ? "Unlock treatment plans" :
                         label === "Schedule My Appointment" ? "Manage your sessions" : "Manage your bookings"}</p></div>
                  </div>
                  <ChevronRight size={20} color="#ccc" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 6. TCM 子页面: About --- */}
        {view === 'tcm-about' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer"></div>
            <div className="nursing-info-box">
              <h3>Traditional Chinese Medicine</h3>
              <div className="loc-row"><MapPin size={18} color="#666" /> <div><strong>Location</strong><p>TCM Consultation Room, Level 19</p></div></div>
              
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">Our TCM services provide holistic health care through traditional diagnostic methods and natural treatments, focusing on restoring internal balance and long-term wellness.</p>
                
                <h4 className="extra-section-title">How It Works</h4>
                <div className="extra-how-works-card">
                  <ul className="extra-bullet-list">
                    <li>• Consultation: Professional tongue and pulse diagnosis.</li>
                    <li>• Custom Plan: Personalized acupuncture or massage treatment.</li>
                    <li>• Booking: All sessions must be scheduled 24 hours in advance.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 7. TCM 子页面: Purchase --- */}
        {view === 'tcm-purchase' && (
          <div className="membership-view">
            <h3 className="section-title">TCM Treatment Packages</h3>
            {tcmPackages.map(pkg => (
              <div key={pkg.id} className="mini-trainer-card" onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}>
                <div className="trainer-card-img-placeholder"></div>
                <div className="trainer-card-info">
                  <h4>{pkg.name}</h4>
                  <p><Ticket size={14} color="#00a8ff" /> {pkg.detail}</p>
                  <p style={{color: '#2b1d62', fontWeight: '700'}}>{pkg.fee}</p>
                </div>
                <ChevronRight size={20} color="#ccc" className="mini-arrow" />
              </div>
            ))}
          </div>
        )}

        {/* --- 8. TCM 子页面: View Appointments --- */}
        {view === 'tcm-view' && (
          <div className="bookings-view">
            <h3 className="section-title">Upcoming TCM Sessions</h3>
            {tcmAppointments.length === 0 ? (
              <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>No appointments yet.</p>
            ) : (
              tcmAppointments.map((app) => (
                <div 
                  key={app.id} 
                  className="booking-card" 
                  onClick={() => { 
                    setSelectedTcmAppointment(app); 
                    setView('tcm-appointment-detail'); 
                  }}
                >
                  <div className="booking-img-box"></div>
                  <div className="booking-details">
                    <h4>{app.title}</h4>
                    <p>Status: <span style={{color: '#27ae60'}}>{app.status}</span></p>
                    <div className="b-row"><Calendar size={12}/> <span>{app.date}</span></div>
                    <div className="b-row"><Clock size={12}/> <span>{app.time}</span></div>
                    <div className="b-row"><MapPin size={12}/> <span>{app.location}</span></div>
                  </div>
                  <ChevronRight size={18} color="#ccc" className="booking-arrow" />
                </div>
              ))
            )}
          </div>
        )}

        {/* --- 9. TCM 子页面: Schedule --- */}
        {view === 'tcm-schedule' && (
          <div className="timetable-view-list">
             <div className="timetable-section">
                <h3 className="section-title">Select Available Slot</h3>
                <div className="class-list">
                  <div className="class-card-item">
                    <div className="class-info-left"><h4>Pulse Diagnosis & Consultation</h4><p><Clock size={12}/> 10:00 - 10:30 | Tomorrow</p></div>
                    <button className="book-now-btn" onClick={handleBookTcmAppointment}>Book</button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- 10. TCM 预约详情页 --- */}
        {view === 'tcm-appointment-detail' && selectedTcmAppointment && (
          <div className="booking-detail-view">
            <div className="booking-hero-img"></div>
            <div className="booking-info-content">
              <h2 className="detail-title">{selectedTcmAppointment.title}</h2>
              <p className="detail-provider">Organized by {selectedTcmAppointment.provider}</p>
              
              <div className="detail-meta-list">
                <div className="meta-item-row"><Calendar size={18} color="#2b1d62"/> <div><strong>Date</strong><p>{selectedTcmAppointment.date}</p></div></div>
                <div className="meta-item-row"><Clock size={18} color="#2b1d62"/> <div><strong>Time</strong><p>{selectedTcmAppointment.time}</p></div></div>
                <div className="meta-item-row"><MapPin size={18} color="#2b1d62"/> <div><strong>Location</strong><p>{selectedTcmAppointment.location}</p></div></div>
                <div className="meta-item-row"><Info size={18} color="#2b1d62"/> <div><strong>Status</strong><p style={{color: '#27ae60'}}>{selectedTcmAppointment.status}</p></div></div>
              </div>

              <div className="detail-desc-section">
                <h3>About this session</h3>
                <p>Please arrive 10 minutes before your appointment. Bring any relevant medical records if available.</p>
              </div>

              <button 
                className="cancel-booking-btn" 
                style={{backgroundColor: '#0000', borderColor: '#e74c3c'}}
                onClick={() => handleDeleteTcmAppointment(selectedTcmAppointment.id)}
              >  
                <Trash2 size={16} style={{marginRight: '8px'}} /> Delete Appointment
              </button>
            </div>
          </div>
        )}

        {/* ========== 新增：Physiotherapy 部分 ========== */}

        {/* --- 11. Physiotherapy 主菜单 --- */}
        {view === 'physio' && (
          <div className="tcm-view">
            <div className="tcm-banner">
              <div className="tcm-text"><h3>Physiotherapy</h3><p>Professional physiotherapy services for recovery and wellness.</p></div>
              <img src="/icon_img/physiotherapy.png" alt="Physiotherapy" className="tcm-banner-img" />
            </div>
            <div className="list-menu">
              {Object.entries(physioViewMap).map(([label, viewName]) => (
                <div key={label} className="list-item" onClick={() => setView(viewName)}>
                  <div className="item-content">
                    {label === "About Physiotherapy" && <FilePenLine size={22} color="#666" strokeWidth={1.5} />}
                    {label === "Purchase Physio Session" && <Monitor size={22} color="#666" strokeWidth={1.5} />}
                    {label === "Schedule My Appointment" && <CalendarCheck size={22} color="#666" strokeWidth={1.5} />}
                    {label === "View My Appointment" && <CalendarDays size={22} color="#666" strokeWidth={1.5} />}
                    <div><h4>{label}</h4><p>{label === "About Physiotherapy" ? "Overview and How it Works" : 
                         label === "Purchase Physio Session" ? "Unlock treatment plans" :
                         label === "Schedule My Appointment" ? "Manage your sessions" : "Manage your bookings"}</p></div>
                  </div>
                  <ChevronRight size={20} color="#ccc" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 12. Physiotherapy 子页面: About --- */}
        {view === 'physio-about' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer"></div>
            <div className="nursing-info-box">
              <h3>Physiotherapy</h3>
              <div className="loc-row"><MapPin size={18} color="#666" /> <div><strong>Location</strong><p>Physio Room, Level 19</p></div></div>
              
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">Our physiotherapy services focus on restoring movement and function through evidence-based techniques, manual therapy, and personalized exercise programs.</p>
                
                <h4 className="extra-section-title">How It Works</h4>
                <div className="extra-how-works-card">
                  <ul className="extra-bullet-list">
                    <li>• Initial assessment: Identify issues and set goals.</li>
                    <li>• Custom Plan: Tailored treatment and exercises.</li>
                    <li>• Booking: All sessions must be scheduled 24 hours in advance.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 13. Physiotherapy 子页面: Purchase --- */}
        {view === 'physio-purchase' && (
          <div className="membership-view">
            <h3 className="section-title">Physiotherapy Packages</h3>
            {physioPackages.map(pkg => (
              <div key={pkg.id} className="mini-trainer-card" onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}>
                <div className="trainer-card-img-placeholder"></div>
                <div className="trainer-card-info">
                  <h4>{pkg.name}</h4>
                  <p><Ticket size={14} color="#00a8ff" /> {pkg.detail}</p>
                  <p style={{color: '#2b1d62', fontWeight: '700'}}>{pkg.fee}</p>
                </div>
                <ChevronRight size={20} color="#ccc" className="mini-arrow" />
              </div>
            ))}
          </div>
        )}

        {/* --- 14. Physiotherapy 子页面: View Appointments --- */}
        {view === 'physio-view' && (
          <div className="bookings-view">
            <h3 className="section-title">Upcoming Physiotherapy Sessions</h3>
            {physioAppointments.length === 0 ? (
              <p style={{textAlign: 'center', color: '#999', marginTop: '30px'}}>No appointments yet.</p>
            ) : (
              physioAppointments.map((app) => (
                <div 
                  key={app.id} 
                  className="booking-card" 
                  onClick={() => { 
                    setSelectedPhysioAppointment(app); 
                    setView('physio-appointment-detail'); 
                  }}
                >
                  <div className="booking-img-box"></div>
                  <div className="booking-details">
                    <h4>{app.title}</h4>
                    <p>Status: <span style={{color: '#27ae60'}}>{app.status}</span></p>
                    <div className="b-row"><Calendar size={12}/> <span>{app.date}</span></div>
                    <div className="b-row"><Clock size={12}/> <span>{app.time}</span></div>
                    <div className="b-row"><MapPin size={12}/> <span>{app.location}</span></div>
                  </div>
                  <ChevronRight size={18} color="#ccc" className="booking-arrow" />
                </div>
              ))
            )}
          </div>
        )}

        {/* --- 15. Physiotherapy 子页面: Schedule --- */}
        {view === 'physio-schedule' && (
          <div className="timetable-view-list">
             <div className="timetable-section">
                <h3 className="section-title">Select Available Slot</h3>
                <div className="class-list">
                  <div className="class-card-item">
                    <div className="class-info-left"><h4>Sports Massage</h4><p><Clock size={12}/> 09:00 - 10:00 | Tomorrow</p></div>
                    <button className="book-now-btn" onClick={handleBookPhysioAppointment}>Book</button>
                  </div>
                  <div className="class-card-item">
                    <div className="class-info-left"><h4>Rehabilitation Exercise</h4><p><Clock size={12}/> 11:00 - 12:00 | Tomorrow</p></div>
                    <button className="book-now-btn" onClick={handleBookPhysioAppointment}>Book</button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- 16. Physiotherapy 预约详情页 --- */}
        {view === 'physio-appointment-detail' && selectedPhysioAppointment && (
          <div className="booking-detail-view">
            <div className="booking-hero-img"></div>
            <div className="booking-info-content">
              <h2 className="detail-title">{selectedPhysioAppointment.title}</h2>
              <p className="detail-provider">Organized by {selectedPhysioAppointment.provider}</p>
              
              <div className="detail-meta-list">
                <div className="meta-item-row"><Calendar size={18} color="#2b1d62"/> <div><strong>Date</strong><p>{selectedPhysioAppointment.date}</p></div></div>
                <div className="meta-item-row"><Clock size={18} color="#2b1d62"/> <div><strong>Time</strong><p>{selectedPhysioAppointment.time}</p></div></div>
                <div className="meta-item-row"><MapPin size={18} color="#2b1d62"/> <div><strong>Location</strong><p>{selectedPhysioAppointment.location}</p></div></div>
                <div className="meta-item-row"><Info size={18} color="#2b1d62"/> <div><strong>Status</strong><p style={{color: '#27ae60'}}>{selectedPhysioAppointment.status}</p></div></div>
              </div>

              <div className="detail-desc-section">
                <h3>About this session</h3>
                <p>Please wear comfortable clothing and arrive 10 minutes early. Bring any relevant medical reports if available.</p>
              </div>

              <button 
                className="cancel-booking-btn" 
                style={{backgroundColor: '#0000', borderColor: '#e74c3c'}}
                onClick={() => handleDeletePhysioAppointment(selectedPhysioAppointment.id)}
              >  
                <Trash2 size={16} style={{marginRight: '8px'}} /> Delete Appointment
              </button>
            </div>
          </div>
        )}

        {/* --- 17. Trainer List --- */}
        {view === 'trainers' && (
          <div className="trainer-list-view">
            <h3 className="section-title">Personal Trainers</h3>
            {trainers.map((t, i) => (
              <div key={i} className="mini-trainer-card trainer-page-card" onClick={() => { setSelectedTrainer(t); setView('trainer-profile'); }}>
                <div className="trainer-card-img-placeholder"></div>
                <div className="trainer-card-info"><h4>{t.name}</h4><p>Coaching Experience: {t.exp}</p></div>
                <ChevronRight size={20} color="#ccc" />
              </div>
            ))}
          </div>
        )}

        {/* --- 18. Trainer Profile --- */}
        {view === 'trainer-profile' && selectedTrainer && (
          <div className="trainer-profile-view">
            <div className="profile-img-area"></div>
            <div className="profile-content-box">
              <h3>{selectedTrainer.name}</h3>
              <p className="exp-label">Coaching Experience: {selectedTrainer.exp}</p>
              <h4>Specialties</h4>
              <ul className="specialties-list">{selectedTrainer.specs.map((s, i) => <li key={i}>• {s}</li>)}</ul>
            </div>
          </div>
        )}

        {/* --- 19. Membership List --- */}
        {view === 'membership-list' && (
          <div className="membership-view">
            <h3 className="section-title">Memberships (Personal Trainer)</h3>
            {memberships.map(pkg => (
              <div key={pkg.id} className="mini-trainer-card" onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}>
                <div className="trainer-card-img-placeholder"></div>
                <div className="trainer-card-info">
                  <h4>{pkg.name}</h4>
                  <p><Ticket size={14} color="#00a8ff" /> {pkg.detail}</p>
                </div>
                <ChevronRight size={20} color="#ccc" className="mini-arrow" />
              </div>
            ))}
          </div>
        )}

        {/* --- 20. Membership Detail (兼容 Fitness / TCM / Physio 套餐) --- */}
        {view === 'membership-detail' && selectedPackage && (
          <div className="pkg-detail-view">
            <h2 className="pkg-title">{selectedPackage.name}</h2>
            <p className="pkg-sub-detail">{selectedPackage.detail}</p>
            <p className="pkg-main-desc">{selectedPackage.desc}</p>
            {selectedPackage.coachPricing ? (
              // Fitness package
              <>
                <div className="coach-pricing-box">
                  {selectedPackage.coachPricing.map((p, idx) => (
                    <div key={idx} className="price-row">{p.level} : <strong>{p.total}</strong> ({p.rate})</div>
                  ))}
                </div>
                <div className="pkg-meta-info">
                  <div className="meta-block"><label>Validity Period </label><strong>{selectedPackage.validity}</strong></div>
                  <div className="meta-block" style={{marginTop: '20px'}}><label>Membership Fee </label><strong>{selectedPackage.fee}</strong></div>
                </div>
              </>
            ) : (
              // TCM or Physio package
              <div className="pkg-meta-info">
                <div className="meta-block"><label>Package Fee </label><strong>{selectedPackage.fee}</strong></div>
              </div>
            )}
            {/* 根据套餐类型跳转到不同预约页面 */}
            <button 
              className="interest-btn" 
              onClick={() => {
                if (selectedPackage.coachPricing) {
                  setView('wellness-profile'); // 健身套餐去个人信息表
                } else if (selectedPackage.id >= 200) { // Physio 套餐
                  setView('physio-schedule');
                } else { // TCM 套餐
                  setView('tcm-schedule');
                }
              }}
            >
              {selectedPackage.coachPricing ? "I'm interested in this package!" : "Proceed to Book"}
            </button>
          </div>
        )}

        {/* --- 21. Interactive Wellness Profile Form --- */}
        {view === 'wellness-profile' && (
          <div className="profile-form-view">
            {/* 表单内容保持不变，此处省略以节省篇幅，实际使用时保留原样 */}
            <div>Wellness Profile Form (内容同前)</div>
          </div>
        )}

        {/* --- 22. My Bookings --- */}
        {view === 'my-bookings' && (
          <div className="bookings-view">
            <h3 className="section-title">My Bookings</h3>
            {myBookings.map((b) => (
              <div key={b.id} className="booking-card" onClick={() => { setSelectedBooking(b); setView('booking-detail'); }}>
                <div className="booking-img-box"></div>
                <div className="booking-details">
                  <h4>{b.title}</h4>
                  <p>with {b.provider}</p>
                  <div className="b-row"><Calendar size={12}/> <span>{b.date}</span></div>
                  <div className="b-row"><Clock size={12}/> <span>{b.time}</span></div>
                  <div className="b-row"><UserCircle size={12}/> <span>{b.spots}</span></div>
                </div>
                <ChevronRight size={18} color="#ccc" className="booking-arrow" />
              </div>
            ))}
          </div>
        )}

        {/* --- 23. Booking Detail View --- */}
        {view === 'booking-detail' && selectedBooking && (
          <div className="booking-detail-view">
            <div className="booking-hero-img"></div>
            <div className="booking-info-content">
              <h2 className="detail-title">{selectedBooking.title}</h2>
              <p className="detail-provider">Organized by {selectedBooking.provider}</p>
              
              <div className="detail-meta-list">
                <div className="meta-item-row"><Calendar size={18} color="#2b1d62"/> <div><strong>Date</strong><p>{selectedBooking.date}</p></div></div>
                <div className="meta-item-row"><Clock size={18} color="#2b1d62"/> <div><strong>Time</strong><p>{selectedBooking.time}</p></div></div>
                <div className="meta-item-row"><MapPin size={18} color="#2b1d62"/> <div><strong>Location</strong><p>{selectedBooking.location}</p></div></div>
                <div className="meta-item-row"><UserCircle size={18} color="#2b1d62"/> <div><strong>Availability</strong><p>{selectedBooking.spots}</p></div></div>
              </div>

              <div className="detail-desc-section">
                <h3>About this session</h3>
                <p>{selectedBooking.desc}</p>
              </div>

              <button className="cancel-booking-btn" onClick={() => alert('Request to cancel has been sent.')}>Cancel Booking</button>
            </div>
          </div>
        )}
      </div>

      {/* --- 全局确认弹窗 (用于 Timetable 预约) --- */}
      {showConfirm && (
        <div className="chart-modal-overlay">
          <div className="confirm-dialog">
            <AlertCircle size={40} color="#f39c12" />
            <h3>Confirm Enrollment?</h3>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="confirm-btn" onClick={() => { setShowConfirm(false); alert('Booked Successful!'); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Nursing 专用小视窗 --- */}
      {nursingModal && (
        <div className="chart-modal-overlay">
          <div className="nursing-detail-modal">
            <div className="n-modal-header">
              <h4>{nursingModal === 'support' ? 'Our Support' : 'House Rules'}</h4>
              <X size={20} onClick={() => setNursingModal(null)} style={{cursor:'pointer'}} />
            </div>
            <div className="n-modal-body">
              {nursingModal === 'support' ? (
                <div className="support-content">
                  <p>We provide a private and comfortable environment for nursing mothers:</p>
                  <ul style={{listStyle: 'none', padding: 0, marginTop: '10px'}}>
                    <li>• Private cubicles with comfortable seating.</li>
                    <li>• Electrical outlets for breast pumps.</li>
                    <li>• Sink and sanitization area.</li>
                    <li>• Refrigeration for temporary breast milk storage.</li>
                  </ul>
                </div>
              ) : (
                <div className="rules-content">
                  <p>To ensure a pleasant experience for everyone, please follow these guidelines:</p>
                  <ul style={{listStyle: 'none', padding: 0, marginTop: '10px'}}>
                    <li>• Please keep the area clean after use.</li>
                    <li>• No food or drinks allowed inside the room.</li>
                    <li>• Maximum usage time: 30 minutes per session.</li>
                    <li>• Ensure the door is locked when the room is occupied.</li>
                  </ul>
                </div>
              )}
            </div>
            <button className="n-modal-close-btn" onClick={() => setNursingModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wellness;