import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Mic, MessageSquare, MicOff, Volume2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './ChatBot.css';

// ── CONFIG ────────────────────────────────────────────────────────
const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook-test/employee-assistant';
const TENANT_ID       = 'chinhin_hq';
const ELEVATED_PATHS  = ['/dashboard', '/info'];

// ── SESSION ID ────────────────────────────────────────────────────
// A new session_id is generated when the user sends their first
// message. It is sent with every message so n8n can retrieve the
// Postgres conversation record.
// When the user taps "No, thanks" after a completed action, we call
// n8n with event_type='session_close' then reset sessionId to null.
// The next message automatically starts a fresh session.
const generateSessionId = (email) =>
  `${(email || 'anon').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ── JWT ───────────────────────────────────────────────────────────
const buildUserJWT = (user) => {
  const b64 = (obj) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header  = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({
    sub:       user?.email || '',
    upn:       user?.email || '',
    name:      user?.name  || '',
    roles:     ['employee'],
    tenant_id: TENANT_ID,
    iat:       Math.floor(Date.now() / 1000),
    exp:       Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.local`;
};

// ── HELPERS ───────────────────────────────────────────────────────
const isMobile = () => {
  if (process.env.REACT_APP_PLATFORM === 'mobile') return true;
  try { if (window.Capacitor?.isNative) return true; } catch (_) {}
  return false;
};

const getSessionUser = () => {
  try {
    const s = sessionStorage.getItem('flexhr_user');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

// ── NATIVE SPEECH (Android) ───────────────────────────────────────
const nativeSpeech = { 
  async requestPermission() {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const perm = await SpeechRecognition.speechRecognition.requestPermissions();
      return perm.speechRecognition === 'granted';
    } catch { return false; }
  },
  async startListening(onPartial, onError) {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      const sr = SpeechRecognition.speechRecognition;
      await sr.start({ language: 'en-US', maxResults: 1, partialResults: true, popup: false });
      sr.addListener('partialResults', (data) => {
        if (data.matches?.[0]) onPartial(data.matches[0]);
      });
    } catch (err) { onError(err.message); }
  },
  async stopListening() {
    try {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      await SpeechRecognition.speechRecognition.stop();
    } catch (_) {}
  },
  async speak(text) {
    try {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      await TextToSpeech.speak({ text, lang: 'en-US', rate: 1.0, volume: 1.0 });
    } catch (_) {}
  },
  async stopSpeaking() {
    try {
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      await TextToSpeech.stop();
    } catch (_) {}
  },
};

// ── WEB SPEECH ────────────────────────────────────────────────────
const webSpeech = {
  _rec: null,
  startListening(onPartial, onFinal, onError, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError('Voice not supported. Use Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    rec.onstart  = () => window.speechSynthesis?.cancel();
    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) onFinal(final.trim());
      else if (interim) onPartial(interim);
    };
    rec.onerror = (e) => onError(e.error);
    rec.onend   = onEnd;
    this._rec = rec;
    rec.start();
  },
  stopListening() { this._rec?.stop(); this._rec = null; },
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  },
  stopSpeaking() { window.speechSynthesis?.cancel(); },
};

// ── WEBHOOK ───────────────────────────────────────────────────────
// event_type values n8n should handle:
//   'message'       — normal user turn
//   'session_close' — user said No → n8n marks session done in Postgres
//   'session_yes'   — user said Yes → n8n keeps session open in Postgres
const sendToN8n = async ({ text, inputType, convState, confirm, editedPlan,
                           sessionId, eventType = 'message', user }) => {
  const body = {
    // Message
    text:              text       || '',
    input_type:        inputType  || 'text',
    state:             convState  || {},
    confirm:           confirm    || false,
    edited_plan:       editedPlan || null,
    client_request_id: `req-${Date.now()}`,

    // Session — THIS is what n8n uses as the Postgres memory key.
    // Every message in the same conversation shares the same session_id.
    // When session closes, n8n archives the record so the AI
    // doesn't mix up past and new conversations.
    session_id: sessionId,
    event_type: eventType,

    // User identity decoded by n8n's VerifyTempToken from the JWT
    id:        user?.email || '',
    upn:       user?.email || '',
    name:      user?.name  || '',
    roles:     ['employee'],
    tenant_id: TENANT_ID,

    platform:  isMobile() ? 'android' : 'web',
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(N8N_WEBHOOK_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${buildUserJWT(user)}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ─────────────────────────────────────────────────────────────────
//  CHATBOT COMPONENT
// ─────────────────────────────────────────────────────────────────
const ChatBot = ({ userInfo: propUserInfo }) => {
  const location    = useLocation();
  const isElevated  = ELEVATED_PATHS.includes(location.pathname);
  const currentUser = propUserInfo || getSessionUser();

  // session_id is null until first message → auto-created on send.
  // Resets to null when session closes so next message is a new session.
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
  const [transcript,  setTranscript]  = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [convState,   setConvState]   = useState({});
  const [voiceError,  setVoiceError]  = useState('');

  const messagesEndRef  = useRef(null);
  const pendingFinalRef = useRef('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    return () => {
      if (isMobile()) { nativeSpeech.stopListening(); nativeSpeech.stopSpeaking(); }
      else { webSpeech.stopListening(); webSpeech.stopSpeaking(); }
    };
  }, []);

  const addMsg = (sender, msgType, text, extra = {}) =>
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), sender, msgType, text, ...extra }]);

  // Get or create session_id for this turn
  const getOrCreateSession = useCallback(() => {
    if (sessionId) return sessionId;
    const newId = generateSessionId(currentUser?.email);
    setSessionId(newId);
    return newId;
  }, [sessionId, currentUser]);

  // ── Process n8n response ───────────────────────────────────────
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
        addMsg('bot', 'confirm_card', data.summary, {
          plan: data.plan, confirm_token: data.confirm_token,
        });
        break;

      case 'receipt':
        // Action completed — show result then ask "Anything else?"
        textToSpeak = `Done! ${data.summary}`;
        addMsg('bot', 'text', textToSpeak);
        setTimeout(() => {
          addMsg('bot', 'session_prompt', 'Is there anything else I can help you with?');
        }, 600);
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

    if (inputType === 'voice' && textToSpeak) speakResponse(textToSpeak);
  }, []);

  // ── TTS ────────────────────────────────────────────────────────
  const speakResponse = async (text) => {
    setIsSpeaking(true);
    if (isMobile()) {
      await nativeSpeech.speak(text);
      setIsSpeaking(false);
    } else {
      webSpeech.speak(text);
      setTimeout(() => setIsSpeaking(false), text.length * 60);
    }
  };

  const stopSpeaking = () => {
    if (isMobile()) nativeSpeech.stopSpeaking();
    else webSpeech.stopSpeaking();
    setIsSpeaking(false);
  };

  // ── Send message ───────────────────────────────────────────────
  const sendMessage = useCallback(async (text, inputType = 'text', confirmData = null) => {
    const trimmed = text?.trim();
    if (!trimmed && !confirmData) return;

    const sid = getOrCreateSession();

    if (!confirmData) {
      addMsg('user', 'text', trimmed);
      setInputValue('');
      setTranscript('');
    }

    setIsLoading(true);
    stopSpeaking();

    try {
      const data = await sendToN8n({
        text:       confirmData ? 'User confirmed the plan' : trimmed,
        inputType,
        convState,
        confirm:    !!confirmData,
        editedPlan: confirmData?.plan || null,
        sessionId:  sid,
        eventType:  'message',
        user:       currentUser,
      });
      processResponse(data, inputType);
    } catch (err) {
      addMsg('bot', 'text', `Connection error: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [convState, currentUser, getOrCreateSession, processResponse]);

  // ── YES — continue session ─────────────────────────────────────
  const handleSessionYes = useCallback(async () => {
    addMsg('user', 'text', 'Yes');
    addMsg('bot', 'text', 'Great! What else can I help you with?');
    try {
      await sendToN8n({
        text: 'continue', eventType: 'session_yes',
        sessionId, user: currentUser, convState,
      });
    } catch (_) {}
  }, [sessionId, currentUser, convState]);

  // ── NO — close session, reset for next conversation ───────────
  const handleSessionNo = useCallback(async () => {
    const sid = sessionId;
    addMsg('user', 'text', 'No, thanks');
    addMsg('bot', 'text', 'Alright! Have a great day. 👋 Feel free to come back anytime.');
    // Tell n8n to close the Postgres session record
    try {
      await sendToN8n({
        text: 'session_close', eventType: 'session_close',
        sessionId: sid, user: currentUser, convState,
      });
    } catch (_) {}
    // Reset — next message will get a brand new session_id
    setSessionId(null);
    setConvState({});
  }, [sessionId, currentUser, convState]);

  // ── VOICE ──────────────────────────────────────────────────────
  const startRecording = async () => {
    setVoiceError('');
    setTranscript('');
    pendingFinalRef.current = '';
    stopSpeaking();

    if (isMobile()) {
      const granted = await nativeSpeech.requestPermission();
      if (!granted) { setVoiceError('Microphone permission denied. Enable in Settings.'); return; }
      setIsRecording(true);
      let latestText = '';
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const sr = SpeechRecognition.speechRecognition;
        await sr.start({ language: 'en-US', maxResults: 1, partialResults: true, popup: false });
        sr.addListener('partialResults', (data) => {
          if (data.matches?.[0]) { latestText = data.matches[0]; setTranscript(latestText); }
        });
        pendingFinalRef.current = () => latestText;
      } catch (err) { setVoiceError('Voice error: ' + err.message); setIsRecording(false); }
    } else {
      setIsRecording(true);
      webSpeech.startListening(
        (p) => setTranscript(p),
        (f) => { setTranscript(f); pendingFinalRef.current = f; setIsRecording(false); sendMessage(f, 'voice'); },
        (e) => { setVoiceError('Voice error: ' + e); setIsRecording(false); },
        ()  => setIsRecording(false),
      );
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    if (isMobile()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        await SpeechRecognition.speechRecognition.stop();
      } catch (_) {}
      setIsRecording(false);
      const getText = pendingFinalRef.current;
      const text    = typeof getText === 'function' ? getText() : transcript;
      if (text?.trim()) sendMessage(text.trim(), 'voice');
    } else {
      webSpeech.stopListening();
      setIsRecording(false);
      if (transcript?.trim() && !pendingFinalRef.current) sendMessage(transcript.trim(), 'voice');
    }
    pendingFinalRef.current = '';
  };

  const switchMode = (m) => { stopRecording(); stopSpeaking(); setTranscript(''); setVoiceError(''); setMode(m); };

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
                <Volume2 size={18} color="white" style={{ cursor: 'pointer', opacity: 0.8 }}
                  onClick={stopSpeaking} title="Stop speaking" />
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
                onConfirm={()     => sendMessage(null, 'text', m)}
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
                {transcript
                  ? <span className="voice-transcript-text">{transcript}</span>
                  : <span className="voice-transcript-hint">
                      {isRecording ? 'Listening…' : 'Tap the mic and speak'}
                    </span>
                }
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
                {isLoading ? 'Processing…' : isSpeaking ? 'Tap to stop' : isRecording ? 'Tap to stop & send' : 'Tap to speak'}
              </p>
              {!isMobile() && <p className="voice-platform-note">Use Chrome for best voice support.</p>}
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
