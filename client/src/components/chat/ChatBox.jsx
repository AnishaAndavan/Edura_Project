// src/components/ChatBox.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  createOrGetChatRoom,
  sendMessage,
  listenForMessages,
  setUserOnlineStatus,
  listenUserOnlineStatus,
  markMessagesAsSeen,
} from "../../services/ServiceChat";
import "./ChatBox.css";

export default function ChatBox({ studentId, mentorId }) {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [peerStatus, setPeerStatus] = useState({ online: false, lastSeen: null });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const roomId = createOrGetChatRoom(studentId, mentorId);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1) Listen for messages
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = listenForMessages(roomId, (msgs) => {
      msgs.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe && unsubscribe();
  }, [roomId]);

  // 2) Set current user online/offline
  useEffect(() => {
    if (!user || !user.uid) return;

    const uid = user.uid;
    setUserOnlineStatus(uid, true);

    const handleBeforeUnload = () => {
      setUserOnlineStatus(uid, false);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setUserOnlineStatus(uid, false);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]); // ✅ added user as dependency

  // 3) Listen to peer's online status
  useEffect(() => {
    if (!user || !user.uid) return;

    const peerId = user.uid === studentId ? mentorId : studentId;
    if (!peerId) return;

    const unsubscribe = listenUserOnlineStatus(peerId, (status) => {
      setPeerStatus(status || { online: false, lastSeen: null });
    });

    return () => unsubscribe && unsubscribe();
  }, [studentId, mentorId, user]); // ✅ added user

  // 4) Mark messages as seen
  useEffect(() => {
    if (!roomId || !user || !user.uid) return;

    const hasUnseen = messages.some(
      (m) => m.senderId && String(m.senderId) !== String(user.uid) && !m.seen
    );
    if (hasUnseen) {
      markMessagesAsSeen(roomId, user.uid).catch((err) =>
        console.error("markMessagesAsSeen error:", err)
      );
    }
  }, [messages, roomId, user]); // ✅ added user

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await sendMessage(roomId, user.uid, { type: "text", text: newMessage.trim() });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatRoomId", roomId);

    try {
      const res = await fetch("http://localhost:5000/api/upload_cloudinary", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Upload failed");

      await sendMessage(roomId, user.uid, {
        type: "image",
        url: data.secure_url,
        text: file.name,
      });
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Upload failed. See console for details.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatTime = (timestamp) =>
    new Date(Number(timestamp) || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatDate = (timestamp) =>
    new Date(Number(timestamp) || Date.now()).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.timestamp);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const renderMessageContent = (msg) => {
    if (typeof msg.text === "string" && !msg.type) return <span className="chatbox-text">{msg.text}</span>;
    if (msg.type === "text") return <span className="chatbox-text">{msg.text}</span>;
    if (msg.type === "image")
      return (
        <img
          src={msg.url}
          alt={msg.text || "sent image"}
          className="chatbox-img"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      );
    return null;
  };

  if (loading || !user) return <div>Loading chat...</div>;

  return (
    <div className="chatbox-container">
      <div style={{ padding: "6px 8px", fontSize: 13, color: "#666" }}>
        {peerStatus?.online ? (
          <span style={{ color: "#0a9b3d", fontWeight: 600 }}>● Online</span>
        ) : peerStatus?.lastSeen ? (
          <span>Last seen {new Date(peerStatus.lastSeen).toLocaleString()}</span>
        ) : (
          <span>Offline</span>
        )}
      </div>

      <div className="chatbox-messages">
        {Object.keys(groupedMessages).map((date) => (
          <div key={date}>
            <div className="chatbox-date">{date}</div>
            {groupedMessages[date].map((msg) => (
              <div
                key={msg.id}
                className={`chatbox-message ${String(msg.senderId) === String(user.uid) ? "own" : "other"}`}
              >
                {renderMessageContent(msg)}
                <span className="chatbox-time" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{formatTime(msg.timestamp)}</span>
                  {String(msg.senderId) === String(user.uid) ? (
                    msg.seen ? (
                      <span title="Seen" style={{ fontSize: 12, opacity: 0.9 }}>✓✓</span>
                    ) : (
                      <span title="Delivered" style={{ fontSize: 12, opacity: 0.6 }}>✓</span>
                    )
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbox-input">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button className="chatbox-attach" onClick={() => fileInputRef.current.click()} disabled={uploading}>
          {uploading ? "Uploading..." : "📎"}
        </button>

        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
