import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Mic } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// ══════════════════════════════════════════════════════════════════
//  CHATBOT  — Static center-nav FAB with N8N integration
//  Elevated position on /dashboard and /info pages
// ══════════════════════════════════════════════════════════════════

const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook-test/employee-assistant';
const TEMP_JWT_TOKEN  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwidXBuIjoicGVrZXJqYUBjaGluaGluLmNvbSIsInJvbGVzIjpbImVtcGxveWVlIl0sInRlbmFudF9pZCI6ImNoaW5oaW5faHEifQ.UqTWTIrSmD9WwDQQd93W17xFMkAqHeZJf2mSg08ldKU';

// Pages where the FAB is elevated higher above the nav bar
const ELEVATED_PATHS = ['/dashboard', '/info'];

const ChatBot = () => {
  const location = useLocation();
  const [isOpen,   setIsOpen]   = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', msgType: 'text', text: 'Hai! Saya Employee Assistant anda. Sebut atau taip arahan untuk menempah bilik mesyuarat atau memohon cuti.' }
  ]);
  const [inputValue,        setInputValue]        = useState('');
  const [isRecording,       setIsRecording]       = useState(false);
  const [isLoading,         setIsLoading]         = useState(false);
  const [conversationState, setConversationState] = useState({});
  const messagesEndRef = useRef(null);

  const isElevated = ELEVATED_PATHS.includes(location.pathname);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Text-to-speech ──────────────────────────────────────────────
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  // ── Voice recording ─────────────────────────────────────────────
  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Browser anda tidak menyokong rakaman suara. Sila guna Google Chrome.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onstart  = () => { setIsRecording(true); window.speechSynthesis.cancel(); };
    rec.onresult = (e) => handleSendMessage(e.results[0][0].transcript, 'voice');
    rec.onerror  = () => setIsRecording(false);
    rec.onend    = () => setIsRecording(false);
    rec.start();
  };

  // ── Message helpers ─────────────────────────────────────────────
  const addAiMessage = (text, msgType) =>
    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', msgType, text }]);

  // ── Send to N8N ─────────────────────────────────────────────────
  const handleSendMessage = async (text, inputType = 'text', confirmData = null) => {
    if (!text && !confirmData) return;

    if (!confirmData) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', msgType: 'text', text }]);
      setInputValue('');
    }

    setIsLoading(true);
    const payload = confirmData
      ? {
          text: 'User confirmed the plan',
          input_type: inputType,
          state: conversationState,
          confirm: true,
          edited_plan: confirmData.plan,
          client_request_id: `req-${Date.now()}`,
        }
      : {
          text,
          input_type: inputType,
          state: conversationState,
          client_request_id: `req-${Date.now()}`,
        };

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TEMP_JWT_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      processN8nResponse(await res.json(), inputType);
    } catch {
      addAiMessage('System offline. Cannot connect to the assistant.', 'text');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Process N8N response ────────────────────────────────────────
  const processN8nResponse = (data, inputType) => {
    let textToSpeak = '';
    if (data.state) setConversationState(data.state);

    switch (data.type) {
      case 'clarify':
        textToSpeak = data.question;
        addAiMessage(data.question, 'text');
        break;
      case 'confirm':
        textToSpeak = data.summary + '. Do you want to proceed?';
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(), sender: 'bot', msgType: 'confirm_card',
            text: data.summary, plan: data.plan, confirm_token: data.confirm_token,
          },
        ]);
        break;
      case 'receipt':
        textToSpeak = 'Success! ' + data.summary;
        addAiMessage(textToSpeak, 'text');
        setConversationState({});
        break;
      case 'error':
      case 'auth_error':
        textToSpeak = 'Sorry, ' + (data.message || data.error);
        addAiMessage(textToSpeak, 'text');
        break;
      default:
        textToSpeak = "I received a response, but I'm not sure how to display it.";
        addAiMessage(textToSpeak, 'text');
    }

    if (inputType === 'voice' && textToSpeak) speakText(textToSpeak);
  };

  return (
    <>
      {/* ── Static FAB Button (embedded in FooterNav via portal-like absolute) ── */}
      <div
        className={`chatbot-static-fab ${isOpen ? 'chatbot-fab-open' : ''} ${isElevated ? 'chatbot-fab-elevated' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="Employee Assistant"
      >
        <div className="chatbot-fab-ring" />
        {isOpen ? <X size={26} color="white" /> : <Bot size={26} color="white" />}
        {!isOpen && <span className="chatbot-fab-badge">AI</span>}
      </div>

      {/* ── Chat Window ─────────────────────────────────────────── */}
      {isOpen && (
        <div className="chat-window-overlay">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Smart Assistant</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>● Online</div>
              </div>
            </div>
            <X size={20} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer', opacity: 0.8 }} />
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`message ${m.sender}`}>
                <p style={{ margin: 0 }}>{m.text}</p>
                {m.msgType === 'confirm_card' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      style={{ padding: '6px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, flex: 1 }}
                      onClick={() => handleSendMessage(null, 'text', m)}
                    >
                      Confirm
                    </button>
                    <button
                      style={{ padding: '6px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, flex: 1 }}
                      onClick={() => addAiMessage('Action cancelled.', 'text')}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message bot" style={{ opacity: 0.7 }}>
                <span className="chatbot-typing-dots">
                  <span /><span /><span />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <button
              onClick={startRecording}
              style={{
                background: isRecording ? '#ffebe9' : 'transparent',
                border: 'none', cursor: 'pointer', padding: 8,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Mic size={20} color={isRecording ? '#ff4d4f' : '#888'} />
            </button>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Type your request..."
              onKeyPress={e => e.key === 'Enter' && handleSendMessage(inputValue, 'text')}
              disabled={isRecording || isLoading}
            />
            <button
              className="send-btn"
              onClick={() => handleSendMessage(inputValue, 'text')}
              disabled={!inputValue.trim() || isLoading}
              style={{ opacity: (!inputValue.trim() || isLoading) ? 0.4 : 1 }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
