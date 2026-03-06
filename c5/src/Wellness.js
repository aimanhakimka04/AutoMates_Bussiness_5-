import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Dumbbell, User2, BookOpen, Stethoscope, 
  ChevronRight, MapPin, Calendar, Clock, Info, UserCheck, X, 
  ChevronDown, ChevronUp, Ticket, UserCircle,
  FilePenLine, Monitor, CalendarCheck, CalendarDays, AlertCircle, Trash2
} from 'lucide-react';
import './Wellness.css';

// ─── n8n CONFIG (same pattern as StaffClaim.js) ─────────────────────
const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

// All Wellness calls go through here
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
  edited_plan: {
      action,
      sub_target: 'wellness',
      ...payload,
    },
  };

  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`n8n error: ${res.status}`);
  return res.json();
}

const Wellness = ({ userInfo }) => {
  const navigate = useNavigate();

  const employeeEmail = userInfo?.email || '';
  const employeeName  = userInfo?.name  || '';

  // View Controller
  const [view, setView] = useState('menu');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null); 
  const [selectedTcmAppointment, setSelectedTcmAppointment] = useState(null);
  const [selectedPhysioAppointment, setSelectedPhysioAppointment] = useState(null); 
  const [showConfirm, setShowConfirm] = useState(false);
  const [nursingModal, setNursingModal] = useState(null);

  // Which timetable class is being booked
  const [pendingClass, setPendingClass] = useState(null);

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

  const [errors, setErrors] = useState({
    email: '',
    phone: '',
    emergencyPhone: ''
  });

  const handleInputChange = (field, value) => {
    if (field === 'age') {
      const val = parseInt(value);
      if (val < 0) value = 0;
      if (val > 100) value = 100;
    }

    // Only allow digits for phone numbers
    if (field === 'phone' || field === 'emergencyPhone') {
      value = value.replace(/\D/g, '');
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

  const [expanded, setExpanded] = useState({
    basic: true, goals: true, lifestyle: true, prefs: true, motivation: true
  });
  const toggleSection = (sec) => setExpanded(prev => ({ ...prev, [sec]: !prev[sec] }));
  //-------------------end of Form State -------------------------//

  const timetableStatus = 0; 

  // NOTE: these are initial defaults; n8n can override them
  const [classes, setClasses] = useState([
    { id: "C1", name: "Zumba | Group Training", time: "18:00 - 20:00", date: "13 Feb 2026", location: "Fitness Studio, Level 19" },
    { id: "C2", name: "Yoga | Morning Flow", time: "08:30 - 10:00", date: "15 Feb 2026", location: "Idea Lab 2" }
  ]);

  const [trainers, setTrainers] = useState([
    { name: "Reiko Chye", exp: "3 Years", specs: ["Fat Loss", "Cardio Training"] },
    { name: "Edward Chuah", exp: "15 Years", specs: ["Strength Training", "Bodybuilding"] },
    { name: "Derek Koay", exp: "2 Years", specs: ["Yoga", "Flexibility"] }
  ]);

  const [memberships, setMemberships] = useState([
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
  ]);

  // --- TCM Data ---
  const [tcmAppointments, setTcmAppointments] = useState([
    { id: "T1", title: "Acupuncture Session", provider: "Wellness TCM", date: "22 Feb 2026", time: "14:00 - 15:00", location: "TCM Room, Level 19", status: "Confirmed" }
  ]);

  const [tcmPackages, setTcmPackages] = useState([
    { id: 101, name: "Basic Acupuncture Set", detail: "5 Sessions + Consultation", fee: "RM 450", desc: "Focuses on balancing energy flow and relieving chronic pain." },
    { id: 102, name: "Premium Tui Na Therapy", detail: "10 Sessions (60 mins each)", fee: "RM 880", desc: "Deep tissue Chinese massage to improve circulation and muscle recovery." }
  ]);

  // --- Physiotherapy Data ---
  const [physioAppointments, setPhysioAppointments] = useState([
    { id: "P1", title: "Sports Massage", provider: "Wellness Physio", date: "23 Feb 2026", time: "09:00 - 10:00", location: "Physio Room, Level 19", status: "Confirmed" }
  ]);

  const [physioPackages, setPhysioPackages] = useState([
    { id: 201, name: "Recovery Package", detail: "5 Sessions (60 mins each)", fee: "RM 600", desc: "Post-workout recovery and muscle relaxation through therapeutic massage." },
    { id: 202, name: "Rehabilitation Program", detail: "10 Sessions with assessment", fee: "RM 1200", desc: "Personalized rehab plan for injury recovery and prevention." }
  ]);

  // My Bookings as state
  const [myBookings, setMyBookings] = useState([
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
  ]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // ─── Fetch data from n8n (StaffClaim-style) ─────────────────────────
  const fetchWellnessData = useCallback(async () => {
    if (!employeeEmail) return;
    setLoading(true);
    setApiError('');

    try {
      // Adjust action if your n8n workflow uses a different name
      const res = await callN8N('get_wellness_overview', {
        employee_email: employeeEmail,
        employee_name: employeeName,
      });

      const root =
        (res?.data && typeof res.data === 'object' && res.data) ||
        (res?.result?.data && typeof res.result.data === 'object' && res.result.data) ||
        {};

      if (Array.isArray(root.classes))              setClasses(root.classes);
      if (Array.isArray(root.trainers))             setTrainers(root.trainers);
      if (Array.isArray(root.memberships))          setMemberships(root.memberships);
      if (Array.isArray(root.tcm_packages))         setTcmPackages(root.tcm_packages);
      if (Array.isArray(root.physio_packages))      setPhysioPackages(root.physio_packages);
      if (Array.isArray(root.tcm_appointments))     setTcmAppointments(root.tcm_appointments);
      if (Array.isArray(root.physio_appointments))  setPhysioAppointments(root.physio_appointments);
      if (Array.isArray(root.my_bookings))          setMyBookings(root.my_bookings);
    } catch {
      setApiError('Unable to load wellness data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [employeeEmail, employeeName]);

  useEffect(() => {
    if (employeeEmail) fetchWellnessData();
  }, [employeeEmail, fetchWellnessData]);

  const tcmViewMap = {
    "About TCM": "tcm-about",
    "Purchase TCM Session": "tcm-purchase",
    "Schedule My Appointment": "tcm-schedule",
    "View My Appointment": "tcm-view"
  };

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
      if (selectedPackage?.coachPricing) setView('membership-list');      
      else if (selectedPackage?.id >= 200) setView('physio-purchase'); 
      else setView('tcm-purchase');          
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

  // ─── TCM booking with n8n call ──────────────────────────────────────
  const handleBookTcmAppointment = async () => {
    if (!employeeEmail) {
      alert('Missing user identity. Please re-login.');
      return;
    }

    const newAppointment = {
      id: `T${Date.now()}`,
      title: "Pulse Diagnosis & Consultation",
      provider: "Wellness TCM",
      date: "Tomorrow",
      time: "10:00 - 10:30",
      location: "TCM Room, Level 19",
      status: "Confirmed"
    };

    const alreadyBooked = tcmAppointments.some(
      app =>
        app.title === newAppointment.title &&
        app.date === newAppointment.date &&
        app.time === newAppointment.time
    );
    if (alreadyBooked) {
      alert('You have already booked this TCM session.');
      return;
    }

    try {
      await callN8N('book_tcm_appointment', {
        employee_email: employeeEmail,
        employee_name : employeeName,
        appointment_title: newAppointment.title,
        date          : newAppointment.date,
        time          : newAppointment.time,
        location      : newAppointment.location,
      });
    } catch {
      // even if API fails, you may still want to show local booking or show error
      alert('Failed to book TCM appointment in system. Please check later.');
    }

    setTcmAppointments(prev => [...prev, newAppointment]);
    setView('tcm-view');
  };

  const handleDeleteTcmAppointment = async (id) => {
    if (employeeEmail) {
      try {
        await callN8N('delete_tcm_appointment', {
          employee_email: employeeEmail,
          appointment_id: id,
        });
      } catch {
        // ignore; still remove locally
      }
    }
    setTcmAppointments(prev => prev.filter(app => app.id !== id));
    setView('tcm-view');
  };

  // ─── Physio booking with n8n call ───────────────────────────────────
  const handleBookPhysioAppointment = async (slot) => {
    if (!employeeEmail) {
      alert('Missing user identity. Please re-login.');
      return;
    }

    const newAppointment = {
      id: `P${Date.now()}`,
      title: slot.title,
      provider: "Wellness Physio",
      date: slot.date,
      time: slot.time,
      location: slot.location,
      status: "Confirmed"
    };

    const alreadyBooked = physioAppointments.some(
      app =>
        app.title === newAppointment.title &&
        app.date === newAppointment.date &&
        app.time === newAppointment.time
    );
    if (alreadyBooked) {
      alert('You have already booked this physiotherapy session.');
      return;
    }

    try {
      await callN8N('book_physio_appointment', {
        employee_email: employeeEmail,
        employee_name : employeeName,
        appointment_title: newAppointment.title,
        date          : newAppointment.date,
        time          : newAppointment.time,
        location      : newAppointment.location,
      });
    } catch {
      alert('Failed to book physiotherapy session in system. Please check later.');
    }

    setPhysioAppointments(prev => [...prev, newAppointment]);
    setView('physio-view');
  };

  const handleDeletePhysioAppointment = async (id) => {
    if (employeeEmail) {
      try {
        await callN8N('delete_physio_appointment', {
          employee_email: employeeEmail,
          appointment_id: id,
        });
      } catch {
        // ignore; still remove locally
      }
    }
    setPhysioAppointments(prev => prev.filter(app => app.id !== id));
    setView('physio-view');
  };

  // ─── Profile submit with n8n call ───────────────────────────────────
  const handleProfileSubmit = async () => {
    const newErrors = { email: '', phone: '', emergencyPhone: '' };

    if (!profileData.email) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!profileData.phone) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^[0-9]+$/.test(profileData.phone)) {
      newErrors.phone = 'Phone number should contain digits only.';
    }

    if (!profileData.emergencyPhone) {
      newErrors.emergencyPhone = 'Emergency contact phone is required.';
    } else if (!/^[0-9]+$/.test(profileData.emergencyPhone)) {
      newErrors.emergencyPhone = 'Emergency contact phone should contain digits only.';
    }

    setErrors(newErrors);

    if (newErrors.email || newErrors.phone || newErrors.emergencyPhone) {
      return;
    }

    if (!employeeEmail) {
      alert('Missing user identity. Please re-login.');
      return;
    }

    try {
      await callN8N('submit_wellness_profile', {
        employee_email: employeeEmail,
        employee_name : employeeName,
        profile       : profileData,
      });
      alert("Profile form submitted successfully! A coach will be in touch with you.");
      setView('fitness');
    } catch {
      alert('Failed to submit profile to system. Please try again later.');
    }
  };

  return (
    <div className="wellness-container">
      <nav className="wellness-top-nav">
        <div className="back-arrow" onClick={handleBack}>
          <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span className="nav-title">{getNavTitle()}</span>
      </nav>

      <div className="wellness-scroll-content">
        {apiError && (
          <div className="important-note-box" style={{ marginTop: 12 }}>
            <div className="note-header">Notice</div>
            <div className="note-body">
              <AlertCircle size={20} color="#444" />
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* --- 1. Main Menu --- */}
        {view === 'menu' && (
          <div className="wellness-main-menu">
            <div className="wellness-card-grid">
              <div className="wellness-card" onClick={() => setView('fitness')}>
                <Dumbbell size={30} color="#333" /><span>Fitness Studio</span>
              </div>
              <div className="wellness-card" onClick={() => setView('physio')}>
                <Stethoscope size={30} color="#333" /><span>Physiotherapy</span>
              </div>
              <div className="wellness-card" onClick={() => setView('nursing')}>
                <User2 size={30} color="#333" /><span>Nursing</span>
              </div>
              <div className="wellness-card" onClick={() => setView('tcm')}>
                <BookOpen size={30} color="#333" /><span>TCM</span>
              </div>
            </div>
            <div className="wellness-hero-illustration">
              <img src="/icon_img/wellnesspage.png" alt="Wellness" />
            </div>
          </div>
        )}

        {/* --- 2. Fitness Studio Menu --- */}
        {view === 'fitness' && (
          <div className="fitness-view">
            <div className="fitness-banner">
              <div className="banner-left-text">
                <h2>Start Your Free Trial Today</h2>
                <p>Kickstart your fitness journey with a complimentary trial session!</p>
                <button className="free-trial-btn">Free Trial</button>
              </div>
              <div className="banner-right-img">
                <img src="/icon_img/studio.png" alt="Studio" />
              </div>
            </div>
            <div className="list-menu">
              <div className="list-item" onClick={() => setView('timetable')}>
                <div className="item-content">
                  <Calendar size={20}/>
                  <div><h4>Timetable Class</h4><p>Schedule your class</p></div>
                </div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="list-item" onClick={() => setView('trainers')}>
                <div className="item-content">
                  <UserCheck size={20}/>
                  <div><h4>Personal Trainer Profile</h4><p>Discover detailed profiles</p></div>
                </div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="list-item" onClick={() => setView('membership-list')}>
                <div className="item-content">
                  <Dumbbell size={20}/>
                  <div><h4>Buy Membership</h4><p>Your fitness partner starts here</p></div>
                </div>
                <ChevronRight size={20} color="#ccc" />
              </div>
              <div className="list-item" onClick={() => setView('my-bookings')}>
                <div className="item-content">
                  <Calendar size={20}/>
                  <div><h4>My Bookings</h4><p>Manage your bookings</p></div>
                </div>
                <ChevronRight size={20} color="#ccc" />
              </div>
            </div>
          </div>
        )}

        {/* --- 3. Timetable View --- */}
        {view === 'timetable' && (
          <div className="timetable-page-container">
            {timetableStatus === 1 ? (
              <div className="timetable-view-empty">
                <div className="timetable-section">
                  <h3 className="timetable-header">Book Your Class</h3>
                  <p className="timetable-subtext">No classes available at the moment.</p>
                </div>
                <div className="timetable-section">
                  <h3 className="timetable-header">Book Your Personal Trainer</h3>
                  <div className="no-data-wrapper">
                    <img src="/icon_img/empty.png" alt="No data" className="no-data-img" />
                    <h4 className="no-data-title">No sessions yet.</h4>
                  </div>
                </div>
              </div>
            ) : (
              <div className="timetable-view-list">
                <div className="timetable-section">
                  <h3 className="section-title">Book Your Class</h3>
                  <div className="class-list">
                    {classes.map(c => (
                      <div key={c.id} className="class-card-item">
                        <div className="class-info-left">
                          <h4>{c.name}</h4>
                          <p><Clock size={12}/> {c.time} | {c.date}</p>
                          <p><MapPin size={12}/> {c.location}</p>
                        </div>
                        <button
                          className="book-now-btn"
                          onClick={() => {
                            setPendingClass(c);
                            setShowConfirm(true);
                          }}
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="timetable-section">
                  <h3 className="section-title">Book Your Personal Trainer</h3>
                  <div className="trainer-list-mini">
                    {trainers.map((t, i) => (
                      <div
                        key={i}
                        className="mini-trainer-card"
                        onClick={() => { setSelectedTrainer(t); setView('trainer-profile'); }}
                      >
                        <div className="trainer-card-img-placeholder"></div>
                        <div className="trainer-card-info">
                          <h4>{t.name}</h4>
                          <p>Experience: {t.exp}</p>
                        </div>
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
              <div className="loc-row">
                <MapPin size={18} color="#666" />
                <div>
                  <strong>Location</strong>
                  <p>Nursing Room, Level 19, Menara Chin Hin</p>
                </div>
              </div>
              
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

        {/* --- 5. TCM Main Menu --- */}
        {view === 'tcm' && (
          <div className="tcm-view">
            <div className="tcm-banner">
              <div className="tcm-text">
                <h3>TCM</h3>
                <p>Traditional Chinese Medicine (TCM) services at Chin Hin.</p>
              </div>
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
                    <div>
                      <h4>{label}</h4>
                      <p>
                        {label === "About TCM" ? "Overview and How it Works" : 
                         label === "Purchase TCM Session" ? "Unlock treatment plans" :
                         label === "Schedule My Appointment" ? "Manage your sessions" : "Manage your bookings"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#ccc" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 6. TCM Sub: About --- */}
        {view === 'tcm-about' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer"></div>
            <div className="nursing-info-box">
              <h3>Traditional Chinese Medicine</h3>
              <div className="loc-row">
                <MapPin size={18} color="#666" />
                <div>
                  <strong>Location</strong>
                  <p>TCM Consultation Room, Level 19</p>
                </div>
              </div>
              
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">
                  Our TCM services provide holistic health care through traditional diagnostic methods and natural treatments, focusing on restoring internal balance and long-term wellness.
                </p>
                
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

        {/* --- 7. TCM Sub: Purchase --- */}
        {view === 'tcm-purchase' && (
          <div className="membership-view">
            <h3 className="section-title">TCM Treatment Packages</h3>
            {tcmPackages.map(pkg => (
              <div
                key={pkg.id}
                className="mini-trainer-card"
                onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}
              >
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

        {/* --- 8. TCM Sub: View Appointments --- */}
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

        {/* --- 9. TCM Sub: Schedule --- */}
        {view === 'tcm-schedule' && (
          <div className="timetable-view-list">
             <div className="timetable-section">
                <h3 className="section-title">Select Available Slot</h3>
                <div className="class-list">
                  <div className="class-card-item">
                    <div className="class-info-left">
                      <h4>Pulse Diagnosis & Consultation</h4>
                      <p><Clock size={12}/> 10:00 - 10:30 | Tomorrow</p>
                    </div>
                    <button className="book-now-btn" onClick={handleBookTcmAppointment}>Book</button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- 10. TCM Appointment Detail --- */}
        {view === 'tcm-appointment-detail' && selectedTcmAppointment && (
          <div className="booking-detail-view">
            <div className="booking-hero-img"></div>
            <div className="booking-info-content">
              <h2 className="detail-title">{selectedTcmAppointment.title}</h2>
              <p className="detail-provider">Organized by {selectedTcmAppointment.provider}</p>
              
              <div className="detail-meta-list">
                <div className="meta-item-row">
                  <Calendar size={18} color="#2b1d62"/>
                  <div><strong>Date</strong><p>{selectedTcmAppointment.date}</p></div>
                </div>
                <div className="meta-item-row">
                  <Clock size={18} color="#2b1d62"/>
                  <div><strong>Time</strong><p>{selectedTcmAppointment.time}</p></div>
                </div>
                <div className="meta-item-row">
                  <MapPin size={18} color="#2b1d62"/>
                  <div><strong>Location</strong><p>{selectedTcmAppointment.location}</p></div>
                </div>
                <div className="meta-item-row">
                  <Info size={18} color="#2b1d62"/>
                  <div><strong>Status</strong><p style={{color: '#27ae60'}}>{selectedTcmAppointment.status}</p></div>
                </div>
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

        {/* --- 11. Physiotherapy Main Menu --- */}
        {view === 'physio' && (
          <div className="tcm-view">
            <div className="tcm-banner">
              <div className="tcm-text">
                <h3>Physiotherapy</h3>
                <p>Professional physiotherapy services for recovery and wellness.</p>
              </div>
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
                    <div>
                      <h4>{label}</h4>
                      <p>
                        {label === "About Physiotherapy" ? "Overview and How it Works" : 
                         label === "Purchase Physio Session" ? "Unlock treatment plans" :
                         label === "Schedule My Appointment" ? "Manage your sessions" : "Manage your bookings"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#ccc" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 12. Physiotherapy Sub: About --- */}
        {view === 'physio-about' && (
          <div className="nursing-view">
            <div className="nursing-top-spacer"></div>
            <div className="nursing-info-box">
              <h3>Physiotherapy</h3>
              <div className="loc-row">
                <MapPin size={18} color="#666" />
                <div>
                  <strong>Location</strong>
                  <p>Physio Room, Level 19</p>
                </div>
              </div>
              
              <div className="nursing-extra-content">
                <h4 className="extra-section-title">About</h4>
                <p className="extra-description">
                  Our physiotherapy services focus on restoring movement and function through evidence-based techniques, manual therapy, and personalized exercise programs.
                </p>
                
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

        {/* --- 13. Physiotherapy Sub: Purchase --- */}
        {view === 'physio-purchase' && (
          <div className="membership-view">
            <h3 className="section-title">Physiotherapy Packages</h3>
            {physioPackages.map(pkg => (
              <div
                key={pkg.id}
                className="mini-trainer-card"
                onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}
              >
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

        {/* --- 14. Physiotherapy Sub: View Appointments --- */}
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

        {/* --- 15. Physiotherapy Sub: Schedule --- */}
        {view === 'physio-schedule' && (
          <div className="timetable-view-list">
             <div className="timetable-section">
                <h3 className="section-title">Select Available Slot</h3>
                <div className="class-list">
                  <div className="class-card-item">
                    <div className="class-info-left">
                      <h4>Sports Massage</h4>
                      <p><Clock size={12}/> 09:00 - 10:00 | Tomorrow</p>
                    </div>
                    <button
                      className="book-now-btn"
                      onClick={() =>
                        handleBookPhysioAppointment({
                          title: "Sports Massage",
                          date: "Tomorrow",
                          time: "09:00 - 10:00",
                          location: "Physio Room, Level 19"
                        })
                      }
                    >
                      Book
                    </button>
                  </div>
                  <div className="class-card-item">
                    <div className="class-info-left">
                      <h4>Rehabilitation Exercise</h4>
                      <p><Clock size={12}/> 11:00 - 12:00 | Tomorrow</p>
                    </div>
                    <button
                      className="book-now-btn"
                      onClick={() =>
                        handleBookPhysioAppointment({
                          title: "Rehabilitation Exercise",
                          date: "Tomorrow",
                          time: "11:00 - 12:00",
                          location: "Physio Room, Level 19"
                        })
                      }
                    >
                      Book
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* --- 16. Physiotherapy Appointment Detail --- */}
        {view === 'physio-appointment-detail' && selectedPhysioAppointment && (
          <div className="booking-detail-view">
            <div className="booking-hero-img"></div>
            <div className="booking-info-content">
              <h2 className="detail-title">{selectedPhysioAppointment.title}</h2>
              <p className="detail-provider">Organized by {selectedPhysioAppointment.provider}</p>
              
              <div className="detail-meta-list">
                <div className="meta-item-row">
                  <Calendar size={18} color="#2b1d62"/>
                  <div><strong>Date</strong><p>{selectedPhysioAppointment.date}</p></div>
                </div>
                <div className="meta-item-row">
                  <Clock size={18} color="#2b1d62"/>
                  <div><strong>Time</strong><p>{selectedPhysioAppointment.time}</p></div>
                </div>
                <div className="meta-item-row">
                  <MapPin size={18} color="#2b1d62"/>
                  <div><strong>Location</strong><p>{selectedPhysioAppointment.location}</p></div>
                </div>
                <div className="meta-item-row">
                  <Info size={18} color="#2b1d62"/>
                  <div><strong>Status</strong><p style={{color: '#27ae60'}}>{selectedPhysioAppointment.status}</p></div>
                </div>
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
              <div
                key={i}
                className="mini-trainer-card trainer-page-card"
                onClick={() => { setSelectedTrainer(t); setView('trainer-profile'); }}
              >
                <div className="trainer-card-img-placeholder"></div>
                <div className="trainer-card-info">
                  <h4>{t.name}</h4>
                  <p>Coaching Experience: {t.exp}</p>
                </div>
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
              <ul className="specialties-list">
                {selectedTrainer.specs.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* --- 19. Membership List --- */}
        {view === 'membership-list' && (
          <div className="membership-view">
            <h3 className="section-title">Memberships (Personal Trainer)</h3>
            {memberships.map(pkg => (
              <div
                key={pkg.id}
                className="mini-trainer-card"
                onClick={() => { setSelectedPackage(pkg); setView('membership-detail'); }}
              >
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

        {/* --- 20. Membership Detail --- */}
        {view === 'membership-detail' && selectedPackage && (
          <div className="pkg-detail-view">
            <h2 className="pkg-title">{selectedPackage.name}</h2>
            <p className="pkg-sub-detail">{selectedPackage.detail}</p>
            <p className="pkg-main-desc">{selectedPackage.desc}</p>
            {selectedPackage.coachPricing ? (
              <>
                <div className="coach-pricing-box">
                  {selectedPackage.coachPricing.map((p, idx) => (
                    <div key={idx} className="price-row">
                      {p.level} : <strong>{p.total}</strong> ({p.rate})
                    </div>
                  ))}
                </div>
                <div className="pkg-meta-info">
                  <div className="meta-block">
                    <label>Validity Period </label>
                    <strong>{selectedPackage.validity}</strong>
                  </div>
                  <div className="meta-block" style={{marginTop: '20px'}}>
                    <label>Membership Fee </label>
                    <strong>{selectedPackage.fee}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="pkg-meta-info">
                <div className="meta-block">
                  <label>Package Fee </label>
                  <strong>{selectedPackage.fee}</strong>
                </div>
              </div>
            )}
            <button 
              className="interest-btn" 
              onClick={() => {
                if (selectedPackage.coachPricing) {
                  setView('wellness-profile'); 
                } else if (selectedPackage.id >= 200) { 
                  setView('physio-schedule');
                } else { 
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
          <div className="profile-form-view" style={{ padding: '20px' }}>
            <h3 className="section-title">Wellness Profile Questionnaire</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Help us understand your goals to serve you better.
            </p>

            {/* Basic Info */}
            <div
              className="form-section-card"
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => toggleSection('basic')}
              >
                <h4 style={{ margin: 0, color: '#2b1d62' }}>Basic Information</h4>
                {expanded.basic ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
              </div>
              {expanded.basic && (
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: errors.email ? '1px solid #e74c3c' : '1px solid #ddd'
                      }}
                    />
                    {errors.email && (
                      <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: errors.phone ? '1px solid #e74c3c' : '1px solid #ddd'
                      }}
                    />
                    {errors.phone && (
                      <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Age
                      </label>
                      <input
                        type="number"
                        value={profileData.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        Gender
                      </label>
                      <select
                        value={profileData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          backgroundColor: '#fff'
                        }}
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={profileData.emergencyName}
                      onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={profileData.emergencyPhone}
                      onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: errors.emergencyPhone ? '1px solid #e74c3c' : '1px solid #ddd'
                      }}
                    />
                    {errors.emergencyPhone && (
                      <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                        {errors.emergencyPhone}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Goals */}
            <div
              className="form-section-card"
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => toggleSection('goals')}
              >
                <h4 style={{ margin: 0, color: '#2b1d62' }}>Fitness Goals</h4>
                {expanded.goals ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
              </div>
              {expanded.goals && (
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Primary Goal
                    </label>
                    <select
                      value={profileData.primaryGoal}
                      onChange={(e) => handleInputChange('primaryGoal', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="">Select...</option>
                      <option value="Weight Loss">Weight Loss</option>
                      <option value="Muscle Gain">Muscle Gain</option>
                      <option value="Endurance">Improve Endurance</option>
                      <option value="General Health">General Health / Wellness</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Timeline to achieve goal
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 3 months"
                      value={profileData.timeline}
                      onChange={(e) => handleInputChange('timeline', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button 
              className="interest-btn" 
              style={{ width: '100%', marginTop: '10px' }} 
              onClick={handleProfileSubmit}
            >
              Submit Profile
            </button>
          </div>
        )}

        {/* --- 22. My Bookings --- */}
        {view === 'my-bookings' && (
          <div className="bookings-view">
            <h3 className="section-title">My Bookings</h3>
            {myBookings.map((b) => (
              <div
                key={b.id}
                className="booking-card"
                onClick={() => { setSelectedBooking(b); setView('booking-detail'); }}
              >
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
                <div className="meta-item-row">
                  <Calendar size={18} color="#2b1d62"/>
                  <div><strong>Date</strong><p>{selectedBooking.date}</p></div>
                </div>
                <div className="meta-item-row">
                  <Clock size={18} color="#2b1d62"/>
                  <div><strong>Time</strong><p>{selectedBooking.time}</p></div>
                </div>
                <div className="meta-item-row">
                  <MapPin size={18} color="#2b1d62"/>
                  <div><strong>Location</strong><p>{selectedBooking.location}</p></div>
                </div>
                <div className="meta-item-row">
                  <UserCircle size={18} color="#2b1d62"/>
                  <div><strong>Availability</strong><p>{selectedBooking.spots}</p></div>
                </div>
              </div>

              <div className="detail-desc-section">
                <h3>About this session</h3>
                <p>{selectedBooking.desc}</p>
              </div>

              <button
                className="cancel-booking-btn"
                onClick={() => alert('Request to cancel has been sent.')}
              >
                Cancel Booking
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Global Confirm Modal for class booking --- */}
      {showConfirm && (
        <div className="chart-modal-overlay">
          <div className="confirm-dialog">
            <AlertCircle size={40} color="#f39c12" />
            <h3>Confirm Enrollment?</h3>
            <div className="confirm-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowConfirm(false);
                  setPendingClass(null);
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={() => {
                  if (pendingClass) {
                    const alreadyBooked = myBookings.some(
                      b =>
                        b.title === pendingClass.name &&
                        b.date === pendingClass.date
                    );

                    if (alreadyBooked) {
                      alert('You have already booked this class.');
                      setPendingClass(null);
                      setShowConfirm(false);
                      return;
                    }

                    const newBooking = {
                      id: `B${Date.now()}`,
                      title: pendingClass.name,
                      provider: "EXFORM",
                      date: pendingClass.date,
                      time: pendingClass.time,
                      spots: "1/12 spots",
                      location: pendingClass.location,
                      desc: "Class booked via timetable."
                    };

                    // Optional: send to n8n as well
                    if (employeeEmail) {
                      callN8N('book_fitness_class', {
                        employee_email: employeeEmail,
                        employee_name : employeeName,
                        class_id      : pendingClass.id,
                        class_title   : pendingClass.name,
                        date          : pendingClass.date,
                        time          : pendingClass.time,
                        location      : pendingClass.location,
                      }).catch(() => {
                        // ignore error for UX
                      });
                    }

                    setMyBookings(prev => [...prev, newBooking]);
                    setPendingClass(null);
                  }

                  setShowConfirm(false);
                  alert('Booked Successful!');
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Nursing Modal --- */}
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