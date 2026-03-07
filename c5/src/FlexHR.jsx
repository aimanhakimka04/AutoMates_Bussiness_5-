import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, X, MapPin, LogIn, LogOut, Calendar,
  Clock, ChevronRight, CheckCircle, XCircle, Info,
  FileText, Umbrella, ClipboardList, TrendingUp,
  Loader2, RefreshCw, AlertCircle, Send, Ban, ChevronDown, User
} from 'lucide-react';
import './FlexHR.css';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook/employee-assistant';
const AUTH_TOKEN = () => localStorage.getItem('authToken') || '';

// ─── n8n API Helper ───────────────────────────────────────────────────────────
async function callN8N(action, payload = {}) {
  const body = {
    input_type: 'direct_action',
    edited_plan: { action, sub_target: 'flexhr', ...payload },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return 'Select Date';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};
const fmtISO = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};
const getStatusInfo = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return { color:'#16a34a', bg:'#f0fdf4', icon:<CheckCircle size={13}/>, label:'Approved' };
  if (s === 'rejected') return { color:'#dc2626', bg:'#fef2f2', icon:<XCircle size={13}/>,    label:'Rejected' };
  return                       { color:'#d97706', bg:'#fffbeb', icon:<Clock size={13}/>,       label:'Pending'  };
};
const LEAVE_TYPES = ['Annual Leave','Sick Leave','Emergency Leave','Personal Leave','Maternity Leave','Paternity Leave'];

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'50px 0',gap:12}}>
    <Loader2 size={30} color="#2b1d62" style={{animation:'fhr-spin 1s linear infinite'}}/>
    <span style={{fontSize:13,color:'#aaa'}}>Loading…</span>
  </div>
);

const ErrBanner = ({ msg, onRetry }) => (
  <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'12px 14px',
    display:'flex',gap:10,alignItems:'center',margin:'10px 0'}}>
    <AlertCircle size={17} color="#dc2626" style={{flexShrink:0}}/>
    <span style={{fontSize:13,color:'#dc2626',flex:1}}>{msg}</span>
    {onRetry && <button onClick={onRetry} style={{background:'none',border:'none',cursor:'pointer',color:'#2b1d62'}}><RefreshCw size={15}/></button>}
  </div>
);

const Empty = ({ icon, title, sub }) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'50px 20px',gap:10,textAlign:'center'}}>
    <div style={{width:60,height:60,background:'#f5f3ff',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{icon}</div>
    <p style={{fontSize:16,fontWeight:700,color:'#333',margin:0}}>{title}</p>
    <span style={{fontSize:13,color:'#bbb'}}>{sub}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
const FlexHR = ({ userInfo }) => {
  const navigate   = useNavigate();
  const userName   = userInfo?.name  || 'EMPLOYEE';
  const userEmail  = userInfo?.email || '';
  const today      = useMemo(() => { const d=new Date(); d.setHours(0,0,0,0); return d; }, []);

  // ── routing ───────────────────────────────────────────────────────────────
  const [view, setView] = useState('home');
  const goTo  = (v) => setView(v);
  const back  = () => { if (view==='home') navigate('/'); else goTo('home'); };

  // ── Attendance ────────────────────────────────────────────────────────────
  const [attLoading, setAttLoading] = useState(false);
  const [attErr,     setAttErr]     = useState('');
  const [isPunching, setIsPunching] = useState(false);
  const [punchErr,   setPunchErr]   = useState('');
  const [punchOK,    setPunchOK]    = useState('');   // success message
  const [attHistory, setAttHistory] = useState([]);

  const fetchAtt = useCallback(async () => {
    setAttLoading(true); setAttErr('');
    try {
      const r = await callN8N('list_attendance', { user_email:userEmail, user_name:userName });
      const d = r?.data ?? r?.result?.data ?? [];
      setAttHistory(Array.isArray(d) ? d : []);
    } catch { setAttErr('Could not load attendance records.'); }
    finally  { setAttLoading(false); }
  }, [userEmail, userName]);

  const lastEnt      = attHistory[0];
  const isOnDuty     = !!(lastEnt?.clock_in_time && !lastEnt?.clock_out_time);
  const nextPunchAct = isOnDuty ? 'punch_out' : 'punch_in';

  const handlePunch = async () => {
    setIsPunching(true); setPunchErr(''); setPunchOK('');
    try {
      const p = { user_email:userEmail, user_name:userName };
      if (nextPunchAct==='punch_out' && lastEnt?.attendance_id) p.attendance_id = lastEnt.attendance_id;
      const r = await callN8N(nextPunchAct, p);
      if (r?.success===false) throw new Error(r?.message || 'Punch failed');

      // ── Optimistic update: inject the returned record immediately ──────
      const rec = r?.data;
      if (rec?.attendance_id) {
        if (nextPunchAct === 'punch_in') {
          // prepend new punch-in record so button flips to PUNCH OUT right away
          setAttHistory(prev => [rec, ...prev]);
        } else {
          // merge clock_out_time into the matching record
          setAttHistory(prev => prev.map(e =>
            e.attendance_id === rec.attendance_id ? { ...e, ...rec } : e
          ));
        }
      }

      // Show success banner
      const timeStr = rec?.clock_in_time
        ? new Date(rec.clock_in_time).toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', hour12:true })
        : rec?.clock_out_time
        ? new Date(rec.clock_out_time).toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', hour12:true })
        : new Date().toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', hour12:true });
      setPunchOK(nextPunchAct === 'punch_in'
        ? `Punched In at ${timeStr}`
        : `Punched Out at ${timeStr}`);
      setTimeout(() => setPunchOK(''), 4000);

      // Background refresh to sync full history from DB
      fetchAtt();
    } catch(e) { setPunchErr(e.message || 'Failed. Please try again.'); }
    finally    { setIsPunching(false); }
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const initLv = { leaveType:'Annual Leave', reason:'', fromDate:null, toDate:null };
  const [lvForm,   setLvForm]   = useState(initLv);
  const [lvLoad,   setLvLoad]   = useState(false);
  const [lvErr,    setLvErr]    = useState('');
  const [lvOK,     setLvOK]     = useState(false);
  const [balance,  setBalance]  = useState(null);
  const [balLoad,  setBalLoad]  = useState(false);

  const duration = useMemo(() => {
    if (!lvForm.fromDate || !lvForm.toDate) return 0;
    return Math.ceil(Math.abs(lvForm.toDate - lvForm.fromDate)/86400000) + 1;
  }, [lvForm.fromDate, lvForm.toDate]);

  const fetchBal = useCallback(async () => {
    setBalLoad(true);
    try {
      const r = await callN8N('check_leave_balance', { user_email:userEmail, user_name:userName });
      setBalance(r?.data ?? r?.result?.data ?? null);
    } catch {}
    finally { setBalLoad(false); }
  }, [userEmail, userName]);

  const submitLeave = async () => {
    if (!lvForm.fromDate || !lvForm.toDate || !lvForm.reason.trim()) { setLvErr('Please fill all required fields.'); return; }
    setLvLoad(true); setLvErr('');
    try {
      const r = await callN8N('apply_leave', {
        user_email:userEmail, user_name:userName,
        leave_type:lvForm.leaveType,
        start_date:fmtISO(lvForm.fromDate), end_date:fmtISO(lvForm.toDate),
        total_days:duration, reason:lvForm.reason,
        status:'PENDING',
      });
      if (r?.success===false) throw new Error(r?.message || 'Submission failed');
      setLvOK(true); setLvForm(initLv);
      setTimeout(() => { setLvOK(false); goTo('home'); }, 2000);
    } catch(e) { setLvErr(e.message || 'Submission failed.'); }
    finally    { setLvLoad(false); }
  };

  // ── Applications ──────────────────────────────────────────────────────────
  const [appsLoad, setAppsLoad] = useState(false);
  const [appsErr,  setAppsErr]  = useState('');
  const [apps,     setApps]     = useState([]);
  const [appsTab,  setAppsTab]  = useState('All');
  const [selApp,   setSelApp]   = useState(null);
  const [cancelId, setCancelId] = useState(null);

  const fetchApps = useCallback(async () => {
    setAppsLoad(true); setAppsErr('');
    try {
      const r = await callN8N('list_leaves', { user_email:userEmail, user_name:userName });
      const d = r?.data ?? r?.result?.data ?? [];
      setApps(Array.isArray(d) ? d : []);
    } catch { setAppsErr('Could not load applications.'); }
    finally  { setAppsLoad(false); }
  }, [userEmail, userName]);

  const cancelApp = async (app) => {
    setCancelId(app.leave_id);
    try {
      await callN8N('cancel_leave', { user_email:userEmail, user_name:userName, leave_id:app.leave_id });
      await fetchApps(); setSelApp(null);
    } catch { setAppsErr('Cancel failed. Please try again.'); }
    finally  { setCancelId(null); }
  };

  // ── Overtime ──────────────────────────────────────────────────────────────
  const initOT = { workDate:null, hours:'', reason:'' };
  const [otForm, setOtForm] = useState(initOT);
  const [otLoad, setOtLoad] = useState(false);
  const [otErr,  setOtErr]  = useState('');
  const [otOK,   setOtOK]   = useState(false);

  const submitOT = async () => {
    if (!otForm.workDate || !otForm.hours || !otForm.reason.trim()) { setOtErr('Please fill all required fields.'); return; }
    setOtLoad(true); setOtErr('');
    try {
      const r = await callN8N('apply_overtime', {
        user_email:userEmail, user_name:userName,
        work_date:fmtISO(otForm.workDate), hours:parseFloat(otForm.hours), reason:otForm.reason,
      });
      if (r?.success===false) throw new Error(r?.message || 'Submission failed');
      setOtOK(true); setOtForm(initOT);
      setTimeout(() => { setOtOK(false); goTo('home'); }, 2000);
    } catch(e) { setOtErr(e.message || 'Submission failed.'); }
    finally    { setOtLoad(false); }
  };

  // ── Calendar ──────────────────────────────────────────────────────────────
  const [calOpen,  setCalOpen]  = useState(false);
  const [calField, setCalField] = useState('from');
  const [calCtx,   setCalCtx]   = useState('leave');
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const openCal = (field, ctx) => { setCalField(field); setCalCtx(ctx); setCalOpen(true); };

  const pickDay = (date) => {
    if (calCtx==='leave') {
      if (calField==='from') setLvForm(f => ({ ...f, fromDate:date, toDate: f.toDate&&date>f.toDate ? null : f.toDate }));
      else                    setLvForm(f => ({ ...f, toDate:date }));
    } else {
      setOtForm(f => ({ ...f, workDate:date }));
    }
    setCalOpen(false);
  };

  const calDays = () => {
    const yr=viewDate.getFullYear(), mo=viewDate.getMonth();
    const first=new Date(yr,mo,1).getDay(), total=new Date(yr,mo+1,0).getDate();
    const offset = first===0 ? 6 : first-1;
    const cells = [];
    for (let i=0;i<offset;i++) cells.push(<div key={`e${i}`} className="day-cell empty"/>);
    const fromD = calCtx==='leave' ? lvForm.fromDate : otForm.workDate;
    const toD   = calCtx==='leave' ? lvForm.toDate   : null;
    for (let d=1;d<=total;d++) {
      const cur    = new Date(yr,mo,d);
      const past   = cur < today;
      const inval  = calCtx==='leave' && calField==='to' && lvForm.fromDate && cur < lvForm.fromDate;
      const dis    = past || inval;
      const isFr   = fromD && fromD.getTime()===cur.getTime();
      const isTo2  = toD   && toD.getTime()===cur.getTime();
      const inRng  = fromD && toD && cur>fromD && cur<toD;
      cells.push(
        <div key={d} onClick={() => !dis && pickDay(cur)}
          className={`day-cell ${dis?'disabled':''} ${isFr||isTo2?'selected':''} ${inRng?'in-range':''}`}
        >{d}</div>
      );
    }
    return cells;
  };

  // ── side effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (view==='attendance')   fetchAtt();
    if (view==='applyLeave')   fetchBal();
    if (view==='applications') fetchApps();
  }, [view]); // eslint-disable-line

  const pendingCount   = apps.filter(a => (a.status_code||a.status||'').toLowerCase()==='pending').length;
  const filteredApps   = apps.filter(a => appsTab==='All' || (a.status_code||a.status||'').toLowerCase()===appsTab.toLowerCase());
  const viewTitles     = { attendance:'Attendance', applyLeave:'Apply Leave', applyOT:'Overtime', applications:'My Applications' };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flexhr-container">

      {/* NAV */}
      <nav className="flexhr-nav">
        <div className="nav-back" onClick={back}><ChevronLeft size={24} color="#fff"/></div>
        <span className="nav-title">FlexHR</span>
        {view!=='home' && <span className="nav-view-label">{viewTitles[view]}</span>}
      </nav>

      <div className="flexhr-main">

        {/* ── HOME ──────────────────────────────────────────────────────── */}
        {view==='home' && (
          <div className="home-layout">
            <div className="greeting-bar">
              <div className="greeting-avatar">{(userName[0]||'E').toUpperCase()}</div>
              <div>
                <div className="greeting-name">Hi, {userName.split(' ')[0]} 👋</div>
                <div className="greeting-sub">What would you like to do?</div>
              </div>
            </div>
            <h3 className="section-label">Quick Actions</h3>
            <div className="card-grid">
              <div className="action-card" onClick={() => goTo('attendance')}>
                <div className="card-icon-wrap att-color"><ClipboardList size={26}/></div>
                <span className="card-text">Attendance</span>
              </div>
              <div className="action-card" onClick={() => goTo('applyLeave')}>
                <div className="card-icon-wrap leave-color"><Umbrella size={26}/></div>
                <span className="card-text">Apply Leave</span>
              </div>
            </div>
            <div className="card-grid">
              <div className="action-card" onClick={() => goTo('applyOT')}>
                <div className="card-icon-wrap ot-color"><TrendingUp size={26}/></div>
                <span className="card-text">Overtime</span>
              </div>
              <div className="action-card" style={{position:'relative'}} onClick={() => goTo('applications')}>
                <div className="card-icon-wrap status-color"><FileText size={26}/></div>
                <span className="card-text">My Applications</span>
                {pendingCount>0 && <span className="task-badge">{pendingCount}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ────────────────────────────────────────────────── */}
        {view==='attendance' && (
          <div className="att-module">
            {!attLoading && attHistory.length>0 && (
              <div className="att-summary">
                <div className="summary-item"><span className="label">Last</span><span className="value">{isOnDuty?'Punch In':'Punch Out'}</span></div>
                <div className="summary-divider"/>
                <div className="summary-item"><span className="label">Date</span><span className="value">{new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</span></div>
                <div className="summary-divider"/>
                <div className="summary-item"><span className="label">Status</span><span className="value" style={{color:isOnDuty?'#16a34a':'#2b1d62'}}>{isOnDuty?'On Duty':'Off'}</span></div>
              </div>
            )}
            <div className="punch-zone">
              <div className={`punch-outer-ring ${isPunching?'spinning':''}`}>
                <button className={`new-punch-btn ${isOnDuty?'out-state':'in-state'}`} onClick={handlePunch} disabled={isPunching}>
                  <div className="btn-content">
                    {isPunching
                      ? <Loader2 size={32} style={{animation:'fhr-spin 1s linear infinite'}}/>
                      : <><span className="main-text">{isOnDuty?'PUNCH OUT':'PUNCH IN'}</span>
                          <span className="sub-text">{new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></>
                    }
                  </div>
                </button>
              </div>
              <div className="location-pill"><MapPin size={13}/><span>GPS Location</span></div>
              {punchErr && <ErrBanner msg={punchErr}/>}
              {punchOK  && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,
                  padding:'11px 14px',display:'flex',gap:8,alignItems:'center',margin:'10px 0'}}>
                  <CheckCircle size={16} color="#16a34a" style={{flexShrink:0}}/>
                  <span style={{fontSize:13,color:'#15803d',fontWeight:600}}>{punchOK}</span>
                </div>
              )}
            </div>
            <div className="list-header-row">
              <h4 style={{margin:0,fontSize:15,fontWeight:700,color:'#333'}}>Today's Log</h4>
              <button onClick={fetchAtt} style={{background:'none',border:'none',cursor:'pointer',color:'#2b1d62',padding:4}}><RefreshCw size={15}/></button>
            </div>
            {attLoading ? <Spinner/>
              : attErr   ? <ErrBanner msg={attErr} onRetry={fetchAtt}/>
              : attHistory.length===0
                ? <Empty icon={<ClipboardList size={26} color="#2b1d62"/>} title="No Records Yet" sub="Your attendance logs will appear here"/>
                : attHistory.map((log,i) => (
                  <div key={i} className="modern-log-card">
                    <div className={`log-icon ${log.clock_in_time&&!log.clock_out_time?'in':'out'}`}>
                      {log.clock_in_time&&!log.clock_out_time ? <LogIn size={17}/> : <LogOut size={17}/>}
                    </div>
                    <div className="log-info">
                      <div className="log-row">
                        <span className="log-label-type">{log.clock_in_time&&!log.clock_out_time?'Punch In':'Session'}</span>
                        <span className="log-time-stamp">{log.clock_in_time?new Date(log.clock_in_time).toLocaleString('en-GB'):'--'}</span>
                      </div>
                      {log.clock_out_time && (
                        <div className="log-row" style={{marginTop:2}}>
                          <span style={{fontSize:11,color:'#aaa'}}>Out:</span>
                          <span className="log-time-stamp">{new Date(log.clock_out_time).toLocaleString('en-GB')}</span>
                        </div>
                      )}
                      <div className="log-address"><MapPin size={11} style={{marginRight:3}}/>
                        {log.clock_in_latitude ? `${Number(log.clock_in_latitude).toFixed(4)}, ${Number(log.clock_in_longitude).toFixed(4)}` : 'Location recorded'}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>
        )}

        {/* ── APPLY LEAVE ───────────────────────────────────────────────── */}
        {view==='applyLeave' && (
          <div className="leave-module">
            {lvOK && <div className="success-banner"><CheckCircle size={17}/><span>Leave submitted successfully!</span></div>}
            {balance && !balLoad && (
              <div className="balance-row">
                {Object.entries(balance).map(([k,v]) => (
                  <div key={k} className="balance-pill">
                    <span className="bal-num">{v}</span>
                    <span className="bal-label">{k}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="leave-form-card">
              <div className="form-section-title">Leave Details</div>
              <div className="input-group">
                <label>Applicant</label>
                <div className="readonly-input"><User size={13} style={{marginRight:6,color:'#aaa'}}/>{userName}</div>
              </div>
              <div className="input-group">
                <label>Leave Type *</label>
                <div className="select-wrap">
                  <select className="form-select" value={lvForm.leaveType} onChange={e=>setLvForm(f=>({...f,leaveType:e.target.value}))}>
                    {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={15} className="select-arrow"/>
                </div>
              </div>
              <div className="date-selection-container">
                <div className="date-field" onClick={() => openCal('from','leave')}>
                  <label>From *</label>
                  <div className={`date-display-box ${lvForm.fromDate?'has-val':''}`}><Calendar size={14}/><span>{fmt(lvForm.fromDate)}</span></div>
                </div>
                <div className="date-field" onClick={() => openCal('to','leave')}>
                  <label>To *</label>
                  <div className={`date-display-box ${lvForm.toDate?'has-val':''}`}><Calendar size={14}/><span>{fmt(lvForm.toDate)}</span></div>
                </div>
              </div>
              {duration>0 && (
                <div className="duration-info-bar"><Info size={14}/><span>Total: <strong>{duration} Day{duration>1?'s':''}</strong></span></div>
              )}
              <div className="input-group">
                <label>Reason *</label>
                <textarea className="form-textarea" rows={3} placeholder="Please state your reason…"
                  value={lvForm.reason} onChange={e=>setLvForm(f=>({...f,reason:e.target.value}))}/>
              </div>
              <div className="applied-on-badge"><Clock size={11}/><span>Applied on: {fmt(new Date())}</span></div>
              {lvErr && <ErrBanner msg={lvErr}/>}
              <button className={`submit-btn ${(!lvForm.fromDate||!lvForm.toDate||!lvForm.reason.trim()||lvLoad)?'disabled':''}`}
                onClick={submitLeave} disabled={lvLoad}>
                {lvLoad ? <><Loader2 size={15} style={{animation:'fhr-spin 1s linear infinite',marginRight:7}}/>Submitting…</>
                        : <><Send size={15} style={{marginRight:7}}/>Submit Application</>}
              </button>
            </div>
          </div>
        )}

        {/* ── OVERTIME ──────────────────────────────────────────────────── */}
        {view==='applyOT' && (
          <div className="leave-module">
            {otOK && <div className="success-banner"><CheckCircle size={17}/><span>Overtime request submitted!</span></div>}
            <div className="leave-form-card">
              <div className="form-section-title">Overtime Request</div>
              <div className="input-group">
                <label>Applicant</label>
                <div className="readonly-input"><User size={13} style={{marginRight:6,color:'#aaa'}}/>{userName}</div>
              </div>
              <div className="input-group">
                <label>Work Date *</label>
                <div className={`date-display-box ${otForm.workDate?'has-val':''}`}
                  style={{cursor:'pointer',marginTop:4}} onClick={() => openCal('date','ot')}>
                  <Calendar size={14}/><span>{fmt(otForm.workDate)}</span>
                </div>
              </div>
              <div className="input-group">
                <label>Overtime Hours *</label>
                <div className="ot-hours-row">
                  {[1,2,3,4,5,6].map(h => (
                    <button key={h} className={`hour-chip ${parseFloat(otForm.hours)===h?'selected':''}`}
                      onClick={() => setOtForm(f=>({...f,hours:String(h)}))}>
                      {h}h
                    </button>
                  ))}
                </div>
                <input type="number" className="form-select" style={{marginTop:8}} placeholder="Custom hours (e.g. 1.5)"
                  min="0.5" max="12" step="0.5" value={otForm.hours}
                  onChange={e => setOtForm(f=>({...f,hours:e.target.value}))}/>
              </div>
              <div className="input-group">
                <label>Reason *</label>
                <textarea className="form-textarea" rows={3} placeholder="Describe the overtime work…"
                  value={otForm.reason} onChange={e=>setOtForm(f=>({...f,reason:e.target.value}))}/>
              </div>
              {otErr && <ErrBanner msg={otErr}/>}
              <button className={`submit-btn ${(!otForm.workDate||!otForm.hours||!otForm.reason.trim()||otLoad)?'disabled':''}`}
                onClick={submitOT} disabled={otLoad}>
                {otLoad ? <><Loader2 size={15} style={{animation:'fhr-spin 1s linear infinite',marginRight:7}}/>Submitting…</>
                        : <><Send size={15} style={{marginRight:7}}/>Submit OT Request</>}
              </button>
            </div>
          </div>
        )}

        {/* ── MY APPLICATIONS ───────────────────────────────────────────── */}
        {view==='applications' && (
          <div className="review-module">
            <div className="review-header">
              <h3 className="module-title">My Applications</h3>
              <p className="module-subtitle">Track your submitted requests</p>
            </div>
            <div className="app-tabs">
              {['All','Pending','Approved','Rejected'].map(tab => {
                const cnt = tab==='All' ? apps.length : apps.filter(a=>(a.status_code||a.status||'').toLowerCase()===tab.toLowerCase()).length;
                return (
                  <button key={tab} className={`app-tab ${appsTab===tab?'active':''}`} onClick={() => setAppsTab(tab)}>
                    {tab}{cnt>0 && <span className="tab-count">{cnt}</span>}
                  </button>
                );
              })}
            </div>
            {appsLoad ? <Spinner/>
              : appsErr ? <ErrBanner msg={appsErr} onRetry={fetchApps}/>
              : filteredApps.length===0
                ? <Empty icon={<FileText size={26} color="#2b1d62"/>} title="No Applications" sub="Your requests will appear here"/>
                : (
                  <div className="review-list">
                    {filteredApps.map((app,i) => {
                      const si = getStatusInfo(app.status_code||app.status);
                      const isPend = (app.status_code||app.status||'').toLowerCase()==='pending';
                      return (
                        <div key={app.leave_id||i} className="review-card" onClick={() => setSelApp(app)}>
                          <div className="review-card-body">
                            <div className="task-icon-box"><Umbrella size={19} color="#2b1d62"/></div>
                            <div className="task-details">
                              <div className="task-top">
                                <span className="task-type-tag">Leave</span>
                                <span className="task-date">{app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-GB') : '--'}</span>
                              </div>
                              <span className="task-title-text">{app.leave_type_name||app.leave_type||'Leave'}</span>
                              <span style={{fontSize:11,color:'#aaa'}}>
                                {app.start_date ? fmt(new Date(app.start_date)) : '--'} → {app.end_date ? fmt(new Date(app.end_date)) : '--'}
                                {app.total_days ? ` · ${app.total_days}d` : ''}
                              </span>
                            </div>
                            <ChevronRight size={15} color="#ddd"/>
                          </div>
                          <div className="review-card-footer" style={{background:si.bg,borderTop:`1px solid ${si.color}25`}}>
                            <span className="status-label" style={{color:si.color}}>{si.icon} {si.label}</span>
                            {isPend && (
                              <button className="cancel-mini-btn"
                                onClick={e => { e.stopPropagation(); cancelApp(app); }}
                                disabled={cancelId===app.leave_id}>
                                {cancelId===app.leave_id ? <Loader2 size={11} style={{animation:'fhr-spin 1s linear infinite'}}/> : <Ban size={11}/>}
                                {' '}Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
            }
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────── */}
      {selApp && (() => {
        const si = getStatusInfo(selApp.status_code||selApp.status);
        return (
          <div className="cal-overlay" onClick={() => setSelApp(null)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <div className="detail-header" style={{background:si.color}}>
                <span>Application Detail</span>
                <X size={19} style={{cursor:'pointer'}} onClick={() => setSelApp(null)}/>
              </div>
              <div className="detail-content">
                <div className="detail-row"><label>Status</label><span style={{color:si.color,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>{si.icon}{si.label}</span></div>
                <div className="detail-row"><label>Leave Type</label><span>{selApp.leave_type_name||selApp.leave_type||'--'}</span></div>
                <div className="detail-row"><label>From</label><span>{selApp.start_date?fmt(new Date(selApp.start_date)):'--'}</span></div>
                <div className="detail-row"><label>To</label><span>{selApp.end_date?fmt(new Date(selApp.end_date)):'--'}</span></div>
                <div className="detail-row"><label>Days</label><span>{selApp.total_days||'--'}</span></div>
                <div className="detail-row"><label>Applied</label><span>{selApp.applied_at?new Date(selApp.applied_at).toLocaleDateString('en-GB'):'--'}</span></div>
                {selApp.reason && <div className="detail-row reason-box"><label>Reason</label><p>{selApp.reason}</p></div>}
                {selApp.admin_note && <div className="detail-row reason-box"><label>Manager Remark</label><p className="admin-p">{selApp.admin_note}</p></div>}
              </div>
              <button className="close-detail-btn" onClick={() => setSelApp(null)}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ── CALENDAR MODAL ────────────────────────────────────────────────── */}
      {calOpen && (
        <div className="cal-overlay" onClick={() => setCalOpen(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-header">
              <span className="cal-title">{calCtx==='ot'?'Work Date':calField==='from'?'Start Date':'End Date'}</span>
              <X size={19} style={{cursor:'pointer'}} onClick={() => setCalOpen(false)}/>
            </div>
            <div className="cal-nav">
              <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1))}>{'<'}</button>
              <span className="month-year-text">{viewDate.toLocaleString('en-US',{month:'long',year:'numeric'})}</span>
              <button className="nav-btn" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1))}>{'>'}</button>
            </div>
            <div className="cal-week">{['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <span key={d}>{d}</span>)}</div>
            <div className="cal-grid">{calDays()}</div>
          </div>
        </div>
      )}

      <style>{`@keyframes fhr-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default FlexHR;
