import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Dumbbell, User2, BookOpen, Stethoscope, 
  ChevronRight, MapPin, Calendar, Clock, Info, UserCheck, X, 
  ChevronDown, ChevronUp, Ticket, UserCircle,
  FilePenLine, Monitor, CalendarCheck, CalendarDays, AlertCircle
} from 'lucide-react';
import './Wellness.css';

const Wellness = () => {
  const navigate = useNavigate();
  // 视图控制：menu, fitness, nursing, tcm, timetable, trainers, trainer-profile, membership-list, membership-detail, wellness-profile, my-bookings, booking-detail
  const [view, setView] = useState('menu');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null); // 新增：选中的预约详情
  const [showConfirm, setShowConfirm] = useState(false);

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

  const tcmMenuItems = [
    { label: "About TCM", desc: "Overview and How it Works", icon: FilePenLine },
    { label: "Purchase TCM Session", desc: "Unlock exclusive TCM treatment plan", icon: Monitor },
    { label: "Schedule My Appointment", desc: "Manage your sessions", icon: CalendarCheck },
    { label: "View My Appointment", desc: "Manage your bookings", icon: CalendarDays }
  ];

  // 新增：预订数据
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

  const handleBack = () => {
    if (view === 'menu') navigate('/');
    else if (view === 'trainer-profile') setView('trainers');
    else if (view === 'wellness-profile') setView('membership-detail');
    else if (view === 'membership-detail') setView('membership-list');
    else if (view === 'booking-detail') setView('my-bookings'); // 详情页返回列表页
    else if (['timetable', 'trainers', 'membership-list', 'my-bookings'].includes(view)) setView('fitness');
    else setView('menu');
  };

  return (
    <div className="wellness-container">
      <nav className="wellness-top-nav">
        <div className="back-arrow" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} /></div>
        <span className="nav-title">
          {view === 'wellness-profile' ? 'Wellness Profile' : 
           view === 'booking-detail' ? 'Booking Detail' :
           ['timetable', 'trainers', 'membership-list', 'my-bookings'].includes(view) ? 'Wellness Journey' : 
           view === 'fitness' ? 'Wellness: Fitness Studio' : 
           view === 'nursing' ? 'Nursing' : 'Wellness'}
        </span>
      </nav>

      <div className="wellness-scroll-content">
        {/* --- 1. 主菜单 --- */}
        {view === 'menu' && (
          <div className="wellness-main-menu">
            <div className="wellness-card-grid">
              <div className="wellness-card" onClick={() => setView('fitness')}><Dumbbell size={30} color="#333" /><span>Fitness Studio</span></div>
              <div className="wellness-card"><Stethoscope size={30} color="#333" /><span>Physiotherapy</span></div>
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
              <button className="blue-cap-btn">How Do We Support You?</button>
              <button className="blue-cap-btn">Nursing Room House Rules</button>
            </div>
          </div>
        )}

        {/* --- 5. TCM --- */}
        {view === 'tcm' && (
          <div className="tcm-view">
            <div className="tcm-banner">
              <div className="tcm-text"><h3>TCM</h3><p>Traditional Chinese Medicine (TCM) services at Chin Hin.</p></div>
              <img src="/icon_img/tcm.png" alt="TCM" className="tcm-banner-img" />
            </div>
            <div className="list-menu">
              {tcmMenuItems.map((item, index) => (
                <div key={index} className="list-item">
                  <div className="item-content"><item.icon size={22} color="#666" strokeWidth={1.5} /><div><h4>{item.label}</h4><p>{item.desc}</p></div></div>
                  <ChevronRight size={20} color="#ccc" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 6. Trainer List --- */}
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

        {/* --- 7. Membership List --- */}
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

        {/* --- 8. Membership Detail --- */}
        {view === 'membership-detail' && selectedPackage && (
          <div className="pkg-detail-view">
            <h2 className="pkg-title">{selectedPackage.name}</h2>
            <p className="pkg-sub-detail">{selectedPackage.detail}</p>
            <p className="pkg-main-desc">{selectedPackage.desc}</p>
            <div className="coach-pricing-box">
              {selectedPackage.coachPricing.map((p, idx) => (
                <div key={idx} className="price-row">{p.level} : <strong>{p.total}</strong> ({p.rate})</div>
              ))}
            </div>
            <div className="pkg-meta-info">
              <div className="meta-block"><label>Validity Period </label><strong>{selectedPackage.validity}</strong></div>
              <div className="meta-block" style={{marginTop: '20px'}}><label>Membership Fee </label><strong>{selectedPackage.fee}</strong></div>
            </div>
            <button className="interest-btn" onClick={() => setView('wellness-profile')}>I'm interested in this package!</button>
          </div>
        )}

        {/* --- 9. Interactive Wellness Profile Form --- */}
        {view === 'wellness-profile' && (
          <div className="profile-form-view">
            
            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('basic')}><span>Basic Information</span>{expanded.basic ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
              {expanded.basic && (
                <div className="section-body">
                  <div className="f-group"><label>Full Name *</label><input type="text" value={profileData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} /></div>
                  <div className="f-group"><label>Email Address</label><input type="email" value={profileData.email} onChange={(e) => handleInputChange('email', e.target.value)} /></div>
                  <div className="f-group"><label>Phone Number *</label><input type="tel" value={profileData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} /></div>
                  <div className="f-group"><label>Emergency Contact Name</label><input type="text" value={profileData.emergencyName} onChange={(e) => handleInputChange('emergencyName', e.target.value)} /></div>
                  <div className="f-group"><label>Emergency Contact Number</label><input type="tel" value={profileData.emergencyPhone} onChange={(e) => handleInputChange('emergencyPhone', e.target.value)} /></div>
                  <div className="f-group"><label>Age</label>
                    <input type="number" min="0" max="100" value={profileData.age} onChange={(e) => handleInputChange('age', e.target.value)} placeholder="0-100" />
                  </div>
                  <div className="f-group"><label>Gender</label>
                    <select className="f-select-el" value={profileData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                      <option value="">Select item</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('goals')}><span>Fitness Goals</span>{expanded.goals ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
              {expanded.goals && (
                <div className="section-body">
                  <div className="f-group"><label>What are your primary fitness goals?</label>
                    <select className="f-select-el" value={profileData.primaryGoal} onChange={(e) => handleInputChange('primaryGoal', e.target.value)}>
                      <option value="">Select item</option><option value="Weight Loss">Weight Loss</option><option value="Muscle Gain">Muscle Gain</option><option value="Flexibility">Flexibility</option><option value="General Health">General Health</option>
                    </select>
                  </div>
                  <div className="f-group"><label>Do you have a target timeline for your goal?</label>
                    <select className="f-select-el" value={profileData.timeline} onChange={(e) => handleInputChange('timeline', e.target.value)}>
                      <option value="">Select item</option><option value="< 3 Months">&lt; 3 Months</option><option value="3-6 Months">3-6 Months</option><option value="6-12 Months">6-12 Months</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('lifestyle')}><span>Lifestyle & Habits</span>{expanded.lifestyle ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
              {expanded.lifestyle && (
                <div className="section-body">
                  <div className="f-group"><label>How would you describe your current activity level?</label>
                    <select className="f-select-el" value={profileData.activityLevel} onChange={(e) => handleInputChange('activityLevel', e.target.value)}>
                      <option value="">Select item</option><option value="Sedentary">Sedentary</option><option value="Active">Active</option><option value="Very Active">Very Active</option>
                    </select>
                  </div>
                  <div className="f-group"><label>How many days a week would you like to train?</label>
                    <select className="f-select-el" value={profileData.trainingDays} onChange={(e) => handleInputChange('trainingDays', e.target.value)}>
                      <option value="">Select item</option><option value="1-2 Days">1-2 Days</option><option value="3-4 Days">3-4 Days</option><option value="5+ Days">5+ Days</option>
                    </select>
                  </div>
                  <div className="f-group"><label>Are you currently following any specific diet...?</label>
                    <div className="toggle-btns">
                      <button className={profileData.onDiet === 'Yes' ? 'active' : ''} onClick={() => handleInputChange('onDiet', 'Yes')}>Yes</button>
                      <button className={profileData.onDiet === 'No' ? 'active' : ''} onClick={() => handleInputChange('onDiet', 'No')}>No</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('prefs')}><span>Training Preferences</span>{expanded.prefs ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
              {expanded.prefs && (
                <div className="section-body">
                  <p className="f-label">What type of training are you most interested in?</p>
                  {["Strength Training", "Yoga / Pilates", "Cardio / HIIT", "Functional Training", "Rehabilitation"].map(t => (
                    <button key={t} className={`pill-btn ${profileData.trainingInterests.includes(t) ? 'active' : ''}`} onClick={() => toggleMultiSelect('trainingInterests', t)}>{t}</button>
                  ))}
                  <div className="f-group" style={{marginTop:'15px'}}><label>Preferred mode of training?</label>
                    <select className="f-select-el" value={profileData.preferredMode} onChange={(e) => handleInputChange('preferredMode', e.target.value)}>
                      <option value="">Select item</option><option value="1-on-1">1-on-1</option><option value="Group">Group</option>
                    </select>
                  </div>
                  <div className="f-group"><label>What time of the day do you prefer to train?</label>
                    <select className="f-select-el" value={profileData.preferredTime} onChange={(e) => handleInputChange('preferredTime', e.target.value)}>
                      <option value="">Select item</option><option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Evening">Evening</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('motivation')}><span>Experience & Motivation</span>{expanded.motivation ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
              {expanded.motivation && (
                <div className="section-body">
                  <div className="f-group"><label>Worked with a personal trainer before?</label>
                    <div className="toggle-btns">
                      <button className={profileData.workedWithTrainer === 'Yes' ? 'active' : ''} onClick={() => handleInputChange('workedWithTrainer', 'Yes')}>Yes</button>
                      <button className={profileData.workedWithTrainer === 'No' ? 'active' : ''} onClick={() => handleInputChange('workedWithTrainer', 'No')}>No</button>
                    </div>
                  </div>
                  <p className="f-label">What motivates you the most?</p>
                  {["Seeing visible results", "Accountability", "Enjoyment"].map(m => (
                    <button key={m} className={`pill-btn ${profileData.motivations.includes(m) ? 'active' : ''}`} onClick={() => toggleMultiSelect('motivations', m)}>{m}</button>
                  ))}
                </div>
              )}
            </div>

            <button className="submit-form-btn" onClick={() => { console.log(profileData); alert('Profile Saved!'); setView('my-bookings'); }}>Submit Profile</button>
          </div>
        )}

        {/* --- 10. My Bookings (可交互列表) --- */}
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

        {/* --- 11. Booking Detail View (新增的详情页面) --- */}
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
    </div>
  );
};

export default Wellness;