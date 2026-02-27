import React, { useState, useEffect, useRef } from 'react';
import { PublicClientApplication } from "@azure/msal-browser";

// --- MSAL CONFIGURATION ---
// You must register an app in Azure Portal (App Registrations) to get these
const msalConfig = {
  auth: {
    clientId: "c21063b3-e6df-4a0e-980a-eb69cb6bdd01", // Replace with your Client ID
    authority: "https://login.microsoftonline.com/common", 
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

const App = () => {
  // --- CONFIGURATION ---
  const N8N_WEBHOOK_URL = 'https://20.17.177.221.nip.io/webhook-test/employee-assistant';

  // --- STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  
  const [messages, setMessages] = useState([
    { id: 0, sender: 'ai', type: 'text', text: 'Hai! Saya Employee Assistant anda. Sebut atau taip arahan untuk menempah bilik mesyuarat atau memohon cuti.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState({});
  const messagesEndRef = useRef(null);

  // Initialize MSAL
  useEffect(() => {
    const initMsal = async () => {
      try {
        await msalInstance.initialize();
        // Check if user is already signed in
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          handleResponse(accounts[0]);
        }
      } catch (err) {
        console.error("MSAL Init Error", err);
      }
    };
    initMsal();
  }, []);

  const handleResponse = async (account) => {
    const request = {
      scopes: ["User.Read"],
      account: account
    };
    try {
      const authResult = await msalInstance.acquireTokenSilent(request);
      setToken(authResult.accessToken);
      setUser(account);
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Token acquisition failed", e);
    }
  };

  const login = async () => {
    try {
      const loginResponse = await msalInstance.loginPopup({
        scopes: ["User.Read"],
        prompt: "select_account"
      });
      handleResponse(loginResponse.account);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const logout = () => {
    msalInstance.logoutPopup();
    setIsAuthenticated(false);
  };

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- CHAT LOGIC ---
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser anda tidak menyokong rakaman suara.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => { setIsRecording(true); window.speechSynthesis.cancel(); };
    recognition.onresult = (event) => handleSendMessage(event.results[0][0].transcript, 'voice');
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleSendMessage = async (text, inputType = 'text', confirmData = null) => {
    if (!text && !confirmData) return;
    if (!confirmData) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', type: 'text', text }]);
      setInputText('');
    }
    setIsLoading(true);

    const payload = {
      text: confirmData ? "User confirmed" : text,
      input_type: inputType,
      state: conversationState,
      confirm: !!confirmData,
      user_email: user?.username, // Send user info to n8n
      client_request_id: `req-${Date.now()}`
    };

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Use the real MS Token
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      processN8nResponse(data, inputType);
    } catch (error) {
      addAiMessage("System offline. Connection error.", 'text');
    } finally {
      setIsLoading(false);
    }
  };

  const processN8nResponse = (data, inputType) => {
    let textToSpeak = "";
    if (data.state) setConversationState(data.state);

    if (data.type === 'confirm') {
      textToSpeak = data.summary;
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', type: 'confirm_card', text: data.summary, plan: data.plan }]);
    } else {
      textToSpeak = data.question || data.summary || data.message || "Done";
      addAiMessage(textToSpeak, 'text');
    }
    if (inputType === 'voice') speakText(textToSpeak);
  };

  const addAiMessage = (text, type) => {
    setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', type, text }]);
  };

  // --- RENDERING ---

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.logoCircle}>
             🤖
          </div>
          <h1 style={{ marginBottom: '10px' }}>Employee Assistant</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>Please sign in to continue</p>
          <button onClick={login} style={styles.microsoftBtn}>
            <img src="https://authjs.dev/img/providers/microsoft.svg" alt="MS" width="20" style={{ marginRight: '10px' }} />
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  // 2. CHAT SCREEN
  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        <div style={styles.header}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Logged in as {user?.username}</div>
          <h3 style={{ margin: '5px 0' }}>🤖 Assistant</h3>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>

        <div style={styles.messagesArea}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
              <div style={{ ...styles.messageBubble, backgroundColor: msg.sender === 'user' ? '#007bff' : '#f1f0f0', color: msg.sender === 'user' ? '#fff' : '#000' }}>
                <p style={{ margin: 0 }}>{msg.text}</p>
                {msg.type === 'confirm_card' && (
                  <div style={styles.confirmActions}>
                    <button style={styles.btnYes} onClick={() => handleSendMessage(null, 'text', msg)}>Confirm</button>
                    <button style={styles.btnNo} onClick={() => addAiMessage("Cancelled.", 'text')}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div style={{ padding: '10px', fontSize: '12px' }}>Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <button onClick={startRecording} style={{ ...styles.micBtn, backgroundColor: isRecording ? '#ff4d4f' : '#f0f0f0' }}>🎤</button>
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText, 'text')}
            placeholder="Type here..."
            style={styles.input}
          />
          <button onClick={() => handleSendMessage(inputText, 'text')} style={styles.sendBtn} disabled={!inputText.trim()}>➤</button>
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6', fontFamily: 'Segoe UI, Tahoma, sans-serif' },
  loginCard: { textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '90%', maxWidth: '400px' },
  logoCircle: { width: '80px', height: '80px', backgroundColor: '#007bff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', margin: '0 auto 20px' },
  microsoftBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '12px', border: '1px solid #8c8c8c', borderRadius: '5px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600' },
  chatBox: { width: '100%', maxWidth: '450px', height: '90vh', backgroundColor: '#fff', borderRadius: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 5px 20px rgba(0,0,0,0.1)' },
  header: { padding: '15px', backgroundColor: '#007bff', color: '#fff', position: 'relative' },
  logoutBtn: { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' },
  messagesArea: { flex: 1, padding: '20px', overflowY: 'auto' },
  messageBubble: { padding: '12px', borderRadius: '15px', maxWidth: '85%' },
  confirmActions: { marginTop: '10px', display: 'flex', gap: '5px' },
  btnYes: { padding: '5px 10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px' },
  btnNo: { padding: '5px 10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px' },
  inputArea: { display: 'flex', padding: '15px', gap: '10px', borderTop: '1px solid #eee' },
  input: { flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' },
  micBtn: { border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' },
  sendBtn: { border: 'none', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#007bff', color: '#fff', cursor: 'pointer' }
};

export default App;