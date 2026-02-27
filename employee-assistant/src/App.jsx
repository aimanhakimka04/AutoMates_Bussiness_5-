import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  // --- KONFIGURASI ---
  const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook-test/employee-assistant';
  const TEMP_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwidXBuIjoicGVrZXJqYUBjaGluaGluLmNvbSIsInJvbGVzIjpbImVtcGxveWVlIl0sInRlbmFudF9pZCI6ImNoaW5oaW5faHEifQ.UqTWTIrSmD9WwDQQd93W17xFMkAqHeZJf2mSg08ldKU'; 

  // --- STATE PENGURUSAN ---
  const [messages, setMessages] = useState([
    { id: 0, sender: 'ai', type: 'text', text: 'Hai! Saya Employee Assistant anda. Sebut atau taip arahan untuk menempah bilik mesyuarat atau memohon cuti.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk menyimpan konteks n8n (supaya AI ingat perbualan)
  const [conversationState, setConversationState] = useState({});
  const messagesEndRef = useRef(null);

  // Auto-scroll ke bawah bila mesej baru masuk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- FUNGSI SUARA ---
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Hentikan audio sebelumnya
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Boleh tukar ke 'ms-MY' jika perlu
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser anda tidak menyokong rakaman suara. Sila guna Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSendMessage(transcript, 'voice');
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
  };

  // --- FUNGSI HANTAR KE N8N ---
  const handleSendMessage = async (text, inputType = 'text', confirmData = null) => {
    if (!text && !confirmData) return;

    // Tambah mesej user ke UI jika ia bukan butang confirm
    if (!confirmData) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', type: 'text', text }]);
      setInputText('');
    }

    setIsLoading(true);

    // Sediakan payload mengikut keperluan n8n
    const payload = confirmData ? {
      text: "User confirmed the plan",
      input_type: inputType,
      state: conversationState,
      confirm: true,
      edited_plan: confirmData.plan,
      client_request_id: `req-${Date.now()}`
    } : {
      text: text,
      input_type: inputType,
      state: conversationState,
      client_request_id: `req-${Date.now()}`
    };

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEMP_JWT_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      processN8nResponse(data, inputType);

    } catch (error) {
      console.error("Error:", error);
      addAiMessage("System offline. Cannot connect to the assistant.", 'text');
    } finally {
      setIsLoading(false);
    }
  };

  // --- PEMPROSESAN RESPONS N8N ---
  const processN8nResponse = (data, inputType) => {
    let textToSpeak = "";
    
    // Simpan state terkini jika ada dari n8n/Foundry
    if (data.state) setConversationState(data.state);

    switch (data.type) {
      case 'clarify':
        textToSpeak = data.question;
        addAiMessage(data.question, 'text');
        break;

      case 'confirm':
        textToSpeak = data.summary + ". Do you want to proceed?";
        // Tambah UI khas untuk Confirmation Card
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          sender: 'ai', 
          type: 'confirm_card', 
          text: data.summary,
          plan: data.plan,
          confirm_token: data.confirm_token
        }]);
        break;

      case 'receipt':
        textToSpeak = "Success! " + data.summary;
        addAiMessage(textToSpeak, 'text');
        setConversationState({}); // Reset state selepas berjaya
        break;

      case 'error':
      case 'auth_error':
        textToSpeak = "Sorry, " + (data.message || data.error);
        addAiMessage(textToSpeak, 'text');
        break;

      default: 
        textToSpeak = "I received a response, but I'm not sure how to display it.";
        addAiMessage(textToSpeak, 'text');
    }

    // Hanya AI bercakap jika interaksi bermula dari suara
    if (inputType === 'voice' && textToSpeak) {
      speakText(textToSpeak);
    }
  };

  const addAiMessage = (text, type) => {
    setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', type, text }]);
  };

  // --- UI RENDERER ---
  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        <div style={styles.header}>
          <h2>🤖 Employee Assistant</h2>
        </div>

        {/* Kawasan Mesej */}
        <div style={styles.messagesArea}>
          {messages.map((msg) => (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '10px'
            }}>
              <div style={{
                ...styles.messageBubble,
                backgroundColor: msg.sender === 'user' ? '#007bff' : '#f1f0f0',
                color: msg.sender === 'user' ? '#fff' : '#000',
              }}>
                <p style={{ margin: 0 }}>{msg.text}</p>
                
                {/* Render Butang Confirm Jika N8n Perlukan Pengesahan */}
                {msg.type === 'confirm_card' && (
                  <div style={styles.confirmActions}>
                    <button 
                      style={styles.btnYes}
                      onClick={() => handleSendMessage(null, 'text', msg)}
                    >
                      Confirm & Proceed
                    </button>
                    <button 
                      style={styles.btnNo}
                      onClick={() => addAiMessage("Action cancelled.", 'text')}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div style={{ alignSelf: 'flex-start', padding: '10px', color: '#666' }}>Assistant menaip...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Kawasan Input */}
        <div style={styles.inputArea}>
          <button 
            onClick={startRecording}
            style={{ ...styles.micBtn, backgroundColor: isRecording ? '#ff4d4f' : '#f0f0f0' }}
            title="Tekan untuk bercakap"
          >
            🎤
          </button>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText, 'text')}
            placeholder="Type your request here..."
            style={styles.input}
            disabled={isRecording || isLoading}
          />
          <button 
            onClick={() => handleSendMessage(inputText, 'text')}
            style={styles.sendBtn}
            disabled={!inputText.trim() || isLoading}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

// --- STYLES RINGKAS ---
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#e9ecef', fontFamily: 'Arial, sans-serif' },
  chatBox: { width: '100%', maxWidth: '450px', height: '80vh', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '15px 20px', backgroundColor: '#007bff', color: '#fff', textAlign: 'center', margin: 0 },
  messagesArea: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  messageBubble: { padding: '12px 16px', borderRadius: '15px', maxWidth: '80%', fontSize: '15px', lineHeight: '1.4' },
  confirmActions: { marginTop: '15px', display: 'flex', gap: '10px' },
  btnYes: { padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' },
  btnNo: { padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' },
  inputArea: { display: 'flex', padding: '15px', borderTop: '1px solid #ddd', backgroundColor: '#fafafa', gap: '10px', alignItems: 'center' },
  micBtn: { border: 'none', borderRadius: '50%', width: '45px', height: '45px', fontSize: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background-color 0.3s' },
  input: { flex: 1, padding: '12px 15px', border: '1px solid #ccc', borderRadius: '25px', outline: 'none', fontSize: '15px' },
  sendBtn: { border: 'none', backgroundColor: '#007bff', color: 'white', borderRadius: '50%', width: '45px', height: '45px', fontSize: '18px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default App;