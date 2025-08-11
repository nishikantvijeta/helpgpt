 import React, { useContext, useEffect, useRef, useState } from "react";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import Login from "./Login.jsx";
import { ScaleLoader } from "react-spinners";

function ChatWindow() {
  const {
    prompt, setPrompt,
    reply, setReply,
    currThreadId,
    setPrevChats, setNewChat,
    user, setUser,
    token, setToken,
    showLogin, setShowLogin,
    allThreads, setAllThreads
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [guestHistory, setGuestHistory] = useState([]); // optional, won't be used for guest chat now
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);

  const recognitionRef = useRef(null);

  // Text-to-speech
  const speak = (text, idx) => {
    if (!audioEnabled || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.onend = () => setSpeakingIndex(null);
    setSpeakingIndex(idx);
    window.speechSynthesis.speak(utter);
  };

  // Voice input setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        setPrompt(voiceText);
      };

      recognitionRef.current.onerror = () => setRecording(false);
      recognitionRef.current.onend = () => setRecording(false);
    }
  }, []);

  const startVoiceInput = () => {
    if (recognitionRef.current && !recording) {
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  // Fetch reply
  const getReply = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setNewChat(false);

    if (token) {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: prompt, threadId: currThreadId })
      };

      try {
        const response = await fetch("https://helpgpt-backened.onrender.com/api/chat", options);
        const res = await response.json();
        setReply(res.reply);

        const newMessages = [
          { role: "user", content: prompt },
          { role: "assistant", content: res.reply }
        ];
        setPrevChats(prev => [...prev, ...newMessages]);
      } catch (err) {
        console.error("Error fetching reply:", err);
      }
    } else {
      // Guest: no backend call, show login prompt
      setReply("Please log in to chat and save your history.");
    }

    setLoading(false);
  };

  // Lifecycle setup
  useEffect(() => {
    setPrompt("");
  }, [reply]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken && !token) setToken(savedToken);
  }, [token]);

  useEffect(() => {
    setPrevChats([]);
    setGuestHistory([]);
    setReply("");
  }, [token]);

  useEffect(() => {
    if (token) {
      fetch("https://helpgpt-backened.onrender.com/api/thread", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setAllThreads(data))
        .catch(() => setAllThreads([]));
    } else {
      setAllThreads([]);
    }
  }, [token]);

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    setIsOpen(false);
  };

  return (
    <div className="bg-neutral-900 h-screen w-full flex flex-col justify-between items-center text-center">
      
      {/* Navbar */}
      <div className="w-full flex justify-between items-center px-4 py-3 border-b border-gray-700">
        <span className="text-white font-bold text-xl">
          HelpGPT <i className="fa-solid fa-chevron-down ml-2 text-sm"></i>
        </span>
        <div className="text-red-400 font-semibold">
          {user ? `Hi, ${user}` : " Welcome, Guest! Login for personalised history"}
        </div>
        <div className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <span className="bg-blue-500 h-8 w-8 rounded-full flex items-center justify-center text-white">
            <i className="fa-solid fa-user"></i>
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-16 right-6 w-48 bg-neutral-800 p-2 rounded-md shadow-lg z-50">
          <div className="text-white px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-2">
            <i className="fa-solid fa-gear"></i> Settings
          </div>
          <div
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="text-white px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-2"
          >
            <i className="fa-solid fa-volume-high"></i> {audioEnabled ? "Disable Audio" : "Enable Audio"}
          </div>
          <div className="text-white px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade Plan
          </div>
          {user ? (
            <div
              onClick={handleLogout}
              className="text-white px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i> Log Out
            </div>
          ) : (
            <div
              onClick={() => { setShowLogin(true); setIsOpen(false); }}
              className="text-white px-3 py-2 hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-to-bracket"></i> Log In
            </div>
          )}
        </div>
      )}

      {/* Login Modal */}
      {showLogin && <Login />}

      {/* Chat Area */}
      <Chat history={token ? undefined : guestHistory} speak={speak} speakingIndex={speakingIndex} />
      <ScaleLoader color="#fff" loading={loading} />

      {/* Input Box */}
      <div className="w-full p-4">
        <div className="relative max-w-3xl mx-auto flex items-center bg-neutral-800 rounded-md px-4 py-2">
          <input
            className="flex-1 border-none outline-none bg-transparent text-white text-base"
            placeholder={token ? "Ask anything" : "Log in to chat"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && token) getReply();
            }}
            disabled={!token}
          />

          <div className="flex items-center gap-3 text-gray-400 text-lg">
            <div
              onClick={() => { if(token) getReply(); }}
              className={`cursor-pointer hover:text-white hover:scale-110 transition w-10 h-10 flex items-center justify-center ${!token ? "opacity-50 cursor-not-allowed" : ""}`}
              title={token ? "Send message" : "Log in to send message"}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </div>
            <div
              onClick={startVoiceInput}
              className="cursor-pointer hover:text-white hover:scale-110 transition w-10 h-10 flex items-center justify-center"
              title="Voice input"
            >
              <i className={`fa-solid fa-microphone${recording ? '-slash' : ''}`}></i>
            </div>
          </div>
        </div>
        {!token && (
          <p className="text-yellow-400 text-sm mt-1 text-center">
            Please log in to chat and save your history.
          </p>
        )}
        <p className="text-sm text-gray-400 mt-2 text-center">
          HelpGPT can make mistakes. Check important info. See Cookie Preferences.
        </p>
      </div>
    </div>
  );
}

export default ChatWindow;
