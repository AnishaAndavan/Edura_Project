// src/pages/chat/ChatPage.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ChatList from "../../components/chat/ChatList";
import ChatBox from "../../components/chat/ChatBox";
import "./ChatPage.css";

export default function ChatPage() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="chat-page">
      <div className="chat-list-container">
        <ChatList onSelectChat={setSelectedUser} />
      </div>

      <div className="chat-box-container">
        {selectedUser ? (
          <ChatBox
            studentId={user.role === "student" ? user.uid : selectedUser.id}
            mentorId={user.role === "mentor" ? user.uid : selectedUser.id}
          />
        ) : (
          <div className="no-chat">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
