import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Mic, MessageSquare, MicOff, Volume2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import './ChatBot.css';
import { Capacitor } from '@capacitor/core';
// ── CONFIG ────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook/employee-assistant';
const TENANT_ID       = 'chinhin_hq';
const ELEVATED_PATHS  = ['/dashboard', '/info'];
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

const generateSessionId = (email) =>
  `${(email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const buildUserJWT = (user) => {
  const b64 = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header  = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({
    sub: user?.email || '', upn: user?.email || '', name: user?.name || '',
    roles: ['employee'], tenant_id: TENANT_ID,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.local`;
};

const isMobile = () => {
  return Capacitor.isNativePlatform();
};

const getSessionUser = () => {
  try {
    const s = sessionStorage.getItem('flexhr_user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

// ── WEB AUDIO RECORDER ────────────────────────────────────────────
let _mediaRecorder = null;
let _audioChunks = [];

const startWebRecording = async (onError) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _mediaRecorder = new MediaRecorder(stream);
    _audioChunks = [];
    _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
    _mediaRecorder.start();
  } catch (err) {
    onError('Sila benarkan akses mikrofon di browser.');
  }
};

const stopWebRecording = (onComplete) => {
  if (!_mediaRecorder) return;
  _mediaRecorder.onstop = () => {
    const audioBlob = new Blob(_audioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1]; // Buang prefix "data:audio/webm;base64,"
      onComplete(base64data);
    };
  };
  _mediaRecorder.stop();
  _mediaRecorder.stream.getTracks().forEach(track => track.stop());
  _mediaRecorder = null;
};

// ── TEXT TO SPEECH (TTS) ──────────────────────────────────────────
const webSpeak = (text, onEnd) => {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 1.0; u.pitch = 0.8;
  u.onend = () => onEnd?.();
  window.speechSynthesis.speak(u);
};
const webStopSpeak = () => window.speechSynthesis?.cancel();

const androidSpeak = async (text, onEnd) => {
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.speak({ text, lang: 'en-US', rate: 1.0, volume: 1.0 });
  } catch (_) {}
  onEnd?.();
};
const androidStopSpeak = async () => {
  try {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.stop();
  } catch (_) {}
};

// ── WEBHOOK ───────────────────────────────────────────────────────
const sendToN8n = async ({ text, audioBase64, inputType, convState, confirm, editedPlan, sessionId, eventType = 'message', user }) => {
  const body = {
    text:              text || '',
    audio_base64:      audioBase64 || null,  // Field baru untuk n8n
    input_type:        inputType || 'text',
    state:             convState || {},
    confirm:           confirm || false,
    edited_plan:       editedPlan || null,
    client_request_id: `req-${Date.now()}`,
    session_id:        sessionId,
    event_type:        eventType,
    id:                user?.email || '',
    upn:               user?.email || '',
    name:              user?.name || '',
    roles:             ['employee'],
    tenant_id:         TENANT_ID,
    platform:          isMobile() ? 'android' : 'web',
    timestamp:         new Date().toISOString(),
  };

  const res = await fetch(N8N_WEBHOOK_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${buildUserJWT(user)}`,
    },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(rawText)?.message || msg; } catch(_) {}
    throw new Error(msg);
  }
  if (!rawText || !rawText.trim()) return { type: 'receipt', summary: 'Action completed successfully.' };
  try { return JSON.parse(rawText); }
  catch(_) { throw new Error('Invalid response dari server. Sila cuba lagi.'); }
};

// ─────────────────────────────────────────────────────────────────
//  CHATBOT COMPONENT
// ─────────────────────────────────────────────────────────────────
const ChatBot = ({ userInfo: propUserInfo }) => {
  const location    = useLocation();
  const isElevated  = ELEVATED_PATHS.includes(location.pathname);
  const currentUser = propUserInfo || getSessionUser();

  const [sessionId, setSessionId] = useState(null);
  const [isOpen,      setIsOpen]      = useState(false);
  const [mode,        setMode]        = useState('text');
  const [messages,    setMessages]    = useState([{
    id: 1, sender: 'bot', msgType: 'text',
    text: currentUser?.name
      ? `Hi ${currentUser.name.split(' ')[0]}! I'm your Employee Assistant. How can I help you?`
      : "Hi! I'm your Employee Assistant. How can I help you today?",
  }]);
  const [inputValue,  setInputValue]  = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [convState,   setConvState]   = useState({});
  const [voiceError,  setVoiceError]  = useState('');

  const messagesEndRef   = useRef(null);
  const sessionTimerRef  = useRef(null);
  const modeRef          = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    return () => {
      if (isMobile()) androidStopSpeak(); else webStopSpeak();
      clearTimeout(sessionTimerRef.current);
    };
  }, []);

  const resetSessionTimer = useCallback((sid) => {
    clearTimeout(sessionTimerRef.current);
    if (!sid) return;
    sessionTimerRef.current = setTimeout(async () => {
      try {
        await sendToN8n({ text: 'session_timeout', eventType: 'session_close', sessionId: sid, user: currentUser, convState: {} });
      } catch (_) {}
      setSessionId(null);
      setConvState({});
      addMsg('bot', 'text', '⏱️ Sesi tamat kerana tiada aktiviti. Hantar mesej untuk mula sesi baru.');
    }, SESSION_TIMEOUT_MS);
  }, [currentUser]);

  useEffect(() => {
    resetSessionTimer(sessionId);
    return () => clearTimeout(sessionTimerRef.current);
  }, [sessionId, resetSessionTimer]);

  const addMsg = (sender, msgType, text, extra = {}) =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender, msgType, text, ...extra }]);

  const getOrCreateSession = useCallback(() => {
    if (sessionId) return sessionId;
    const newId = generateSessionId(currentUser?.email);
    setSessionId(newId);
    return newId;
  }, [sessionId, currentUser]);

  const stopSpeaking = () => {
    if (isMobile()) androidStopSpeak(); else webStopSpeak();
    setIsSpeaking(false);
  };

  // Fungsi hantar mesej dikemaskini untuk terima audioBase64
  const sendMessage = useCallback(async (text, inputType = 'text', confirmData = null, audioBase64 = null) => {
    const trimmed = text?.trim();
    if (inputType === 'text' && !trimmed && !confirmData) return;

    const sid = getOrCreateSession();
    resetSessionTimer(sid);

    if (inputType === 'audio') {
      addMsg('user', 'text', '🎤 [Voice Message]'); // Tunjuk indicator user hantar voice
    } else if (!confirmData) {
      addMsg('user', 'text', trimmed);
      setInputValue('');
    }

    setIsLoading(true);
    stopSpeaking();

    try {
      const data = await sendToN8n({
        text:         confirmData ? 'User confirmed the plan' : trimmed,
        audioBase64:  audioBase64,
        inputType,
        convState,
        confirm:      !!confirmData,
        editedPlan:   confirmData?.plan || null,
        sessionId:    sid,
        eventType:    confirmData ? 'direct_booking' : 'message',
        user:         currentUser,
      });
      processResponse(data, inputType);
    } catch (err) {
      addMsg('bot', 'text', `Connection error: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [convState, currentUser, getOrCreateSession]);

  // ── VOICE RECORDER LOGIC ──────────────────────────────────────────
  const startRecording = async () => {
    setVoiceError('');
    stopSpeaking();

    if (isMobile()) {
      try {
        const check = await VoiceRecorder.hasAudioRecordingPermission();
        if (!check.value) {
          const perm = await VoiceRecorder.requestAudioRecordingPermission();
          if (!perm.value) {
            setVoiceError('Akses mikrofon ditolak.');
            return;
          }
        }
        await VoiceRecorder.startRecording();
        setIsRecording(true);
      } catch (err) {
        setVoiceError('Gagal memulakan rakaman: ' + err.message);
      }
    } else {
      await startWebRecording((err) => setVoiceError(err));
      setIsRecording(true);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsLoading(true); // Tunjuk "Thinking..." semasa audio diproses

    if (isMobile()) {
      try {
        const result = await VoiceRecorder.stopRecording();
        if (result.value && result.value.recordDataBase64) {
          sendMessage('', 'audio', null, result.value.recordDataBase64);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        setVoiceError('Gagal memproses rakaman.');
        setIsLoading(false);
      }
    } else {
      stopWebRecording((base64) => {
        if (base64) sendMessage('', 'audio', null, base64);
        else setIsLoading(false);
      });
    }
  };

  const switchMode = (m) => {
    if (isRecording) stopRecording();
    stopSpeaking();
    setVoiceError('');
    setMode(m);
  };

  // ── TTS & RESPONSE HANDLING ──────────────────────────────────────
  const speakResponse = useCallback((text) => {
    setIsSpeaking(true);
    const onDone = () => setIsSpeaking(false);
    if (isMobile()) androidSpeak(text, onDone);
    else webSpeak(text, onDone);
  }, []);

  const processResponse = useCallback((data, inputType) => {
    if (data.state) setConvState(data.state);
    let textToSpeak = '';

    switch (data.type) {
      case 'clarify':
        textToSpeak = data.question;
        addMsg('bot', 'text', data.question);
        break;
      case 'confirm':
        textToSpeak = `${data.summary}. Do you want to proceed?`;
        addMsg('bot', 'confirm_card', data.summary, { plan: data.plan, confirm_token: data.confirm_token });
        break;
      case 'receipt':
        textToSpeak = `Done! ${data.summary}`;
        addMsg('bot', 'text', textToSpeak);
        setTimeout(() => addMsg('bot', 'session_prompt', 'Is there anything else I can help you with?'), 600);
        break;
      case 'error':
      case 'auth_error':
        textToSpeak = `Sorry, ${data.message || data.error || 'something went wrong.'}`;
        addMsg('bot', 'text', textToSpeak);
        break;
      default:
        textToSpeak = data.text || data.message || "I received a response but couldn't display it.";
        addMsg('bot', 'text', textToSpeak);
    }

    if (modeRef.current === 'voice' && textToSpeak) speakResponse(textToSpeak);
  }, [speakResponse]);

  const handleSessionYes = useCallback(async () => {
    addMsg('user', 'text', 'Yes');
    addMsg('bot', 'text', 'Great! What else can I help you with?');
    try { await sendToN8n({ text: 'continue', eventType: 'session_yes', sessionId, user: currentUser, convState }); } catch (_) {}
  }, [sessionId, currentUser, convState]);

  const handleSessionNo = useCallback(async () => {
    const sid = sessionId;
    addMsg('user', 'text', 'No, thanks');
    addMsg('bot', 'text', 'Alright! Have a great day. 👋 Feel free to come back anytime.');
    try { await sendToN8n({ text: 'session_close', eventType: 'session_close', sessionId: sid, user: currentUser, convState }); } catch (_) {}
    setSessionId(null);
    setConvState({});
  }, [sessionId, currentUser, convState]);

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <div
        className={`chatbot-static-fab ${isOpen ? 'chatbot-fab-open' : ''} ${isElevated ? 'chatbot-fab-elevated' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="Employee Assistant"
      >
        <div className="chatbot-fab-ring" />
        {isOpen ? <X size={26} color="white" /> : <Bot size={26} color="white" />}
        {!isOpen && <span className="chatbot-fab-badge">AI</span>}
      </div>

      {isOpen && <div className="chat-backdrop" onClick={() => setIsOpen(false)} />}

      {isOpen && (
        <div className="chat-window-overlay"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-header-avatar"><Bot size={18} color="white" /></div>
              <div>
                <div className="chat-header-title">Smart Assistant</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" />
                  {isLoading ? 'Thinking…' : isSpeaking ? 'Speaking…' : 'Online'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isSpeaking && (
                <Volume2 size={18} color="white" style={{ cursor: 'pointer', opacity: 0.8 }} onClick={stopSpeaking} title="Stop speaking" />
              )}
              {sessionId && <span className="chat-session-badge">● Active</span>}
              <X size={20} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer', opacity: 0.8 }} />
            </div>
          </div>

          <UserStrip user={currentUser} />

          <div className="chat-mode-toggle">
            <button className={`chat-mode-btn ${mode === 'text'  ? 'active' : ''}`} onClick={() => switchMode('text')}>
              <MessageSquare size={14} /> Text
            </button>
            <button className={`chat-mode-btn ${mode === 'voice' ? 'active' : ''}`} onClick={() => switchMode('voice')}>
              <Mic size={14} /> Voice
            </button>
          </div>

          <div className="chat-messages">
            {messages.map(m => (
              <MessageBubble key={m.id} message={m}
                onConfirm={()     => sendMessage(null, 'confirm', m)}
                onCancel={()      => addMsg('bot', 'text', 'Action cancelled.')}
                onSessionYes={handleSessionYes}
                onSessionNo={handleSessionNo}
              />
            ))}
            {isLoading && (
              <div className="message bot">
                <span className="chatbot-typing-dots"><span /><span /><span /></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {mode === 'text' && (
            <div className="chat-input-area">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Type your message…"
                onKeyPress={e => e.key === 'Enter' && sendMessage(inputValue)}
                disabled={isLoading}
              />
              <button className="send-btn"
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                style={{ opacity: (!inputValue.trim() || isLoading) ? 0.4 : 1 }}
              >
                <Send size={18} />
              </button>
            </div>
          )}

          {mode === 'voice' && (
            <div className="chat-voice-panel">
              {voiceError && <div className="voice-error-box">{voiceError}</div>}
              
              <div className={`voice-transcript-box ${isRecording ? 'listening' : ''}`}>
                <span className="voice-transcript-hint">
                  {isRecording ? 'Rakaman sedang berjalan. Teruskan bercakap...' : 'Tekan mic untuk mula merakam'}
                </span>
              </div>

              <button
                className={`voice-mic-btn ${isRecording ? 'recording' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
              >
                {isRecording && <><div className="voice-mic-ripple" /><div className="voice-mic-ripple delay" /></>}
                {isSpeaking ? <Volume2 size={28} color="white" />
                  : isRecording ? <MicOff size={32} color="white" /> : <Mic size={32} color="white" />}
              </button>
              <p className="voice-mic-hint">
                {isLoading ? 'Menghantar audio...' : isSpeaking ? 'Tekan untuk stop' : isRecording ? 'Tekan untuk hantar' : 'Tekan untuk bercakap'}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────
const UserStrip = ({ user }) => {
  if (!user) return null;
  return (
    <div className="chat-user-strip">
      <div className="chat-user-avatar">{(user.name || user.email || '?')[0].toUpperCase()}</div>
      <span className="chat-user-name">{user.name || user.email}</span>
    </div>
  );
};

const MessageBubble = ({ message: m, onConfirm, onCancel, onSessionYes, onSessionNo }) => (
  <div className={`message ${m.sender}`}>
    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.text}</p>

    {m.msgType === 'confirm_card' && (
      <div className="confirm-actions">
        <button className="confirm-btn confirm" onClick={onConfirm}>✓ Confirm</button>
        <button className="confirm-btn cancel"  onClick={onCancel}>✕ Cancel</button>
      </div>
    )}

    {m.msgType === 'session_prompt' && (
      <div className="confirm-actions">
        <button className="confirm-btn confirm" onClick={onSessionYes}>👍 Yes please</button>
        <button className="confirm-btn cancel"  onClick={onSessionNo}>👋 No, I'm done</button>
      </div>
    )}
  </div>
);

export default ChatBot;