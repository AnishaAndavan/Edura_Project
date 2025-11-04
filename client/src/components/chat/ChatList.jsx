// src/components/chat/ChatList.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import "./ChatList.css";

export default function ChatList({ onSelectChat }) {
  const { user } = useAuth();
  const [chatUsers, setChatUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null); // track selected chat

  useEffect(() => {
  if (!user) return;

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const matchesRef = collection(db, "matches");
      let users = [];

      if (user.role === "mentor") {
        const q = query(matchesRef, where("mentorId", "==", user.uid));
        const snap = await getDocs(q);
        users = snap.docs.map((doc) => ({
          id: doc.data().studentId,
          name: doc.data().studentName,
        }));
      } else if (user.role === "student") {
        const q = query(matchesRef, where("studentId", "==", user.uid));
        const snap = await getDocs(q);
        users = snap.docs.map((doc) => ({
          id: doc.data().mentorId,
          name: doc.data().mentorName,
        }));
      }

      // Remove duplicates based on id
      const uniqueUsers = Array.from(
        new Map(users.map((u) => [u.id, u])).values()
      );

      setChatUsers(uniqueUsers);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setLoading(false);
    }
  };

  fetchMatches();
}, [user]);


  const handleSelectChat = (u) => {
    setSelectedChat(u);
    onSelectChat(u);
  };

  return (
    <div className="chat-list">
      <h2 className="chat-list-title">Chats</h2>

      {loading ? (
        <p className="loading-message">Loading...</p>
      ) : chatUsers.length === 0 ? (
        <p className="empty-message">No chats available</p>
      ) : (
        <ul className="chat-users">
          {chatUsers.map((u) => (
            <li
              key={u.id}
              className={`chat-user ${u.id === selectedChat?.id ? "selected" : ""}`}
              onClick={() => handleSelectChat(u)}
            >
              {u.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
