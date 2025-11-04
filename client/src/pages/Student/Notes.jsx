// src/pages/Notes/Notes.jsx
import React, { useEffect, useState, useRef } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import jsPDF from "jspdf";
import "./Notes.css";

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#fff8b3");
  const [editingId, setEditingId] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [search, setSearch] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const contentRef = useRef(null);

  // Fetch notes on mount or user change
  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    const notesCol = collection(db, "notes");
    const snapshot = await getDocs(notesCol);
    const list = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((n) => n.uid === user.uid)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.timestamp?.seconds - a.timestamp?.seconds;
      });
    setNotes(list);
  };

  const handleAddOrUpdate = async () => {
    const content = contentRef.current.innerHTML;
    if (!title.trim() && !content.trim()) return;

    if (editingId) {
      await updateDoc(doc(db, "notes", editingId), {
        title,
        content,
        color,
        pinned,
        timestamp: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "notes"), {
        uid: user.uid,
        title,
        content,
        color,
        pinned,
        timestamp: serverTimestamp(),
      });
    }

    setTitle("");
    setColor("#fff8b3");
    setPinned(false);
    contentRef.current.innerHTML = "";
    setEditingId(null);
    fetchNotes();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "notes", id));
    fetchNotes();
  };

  const handleEdit = (note) => {
    setTitle(note.title);
    setColor(note.color);
    setPinned(note.pinned || false);
    contentRef.current.innerHTML = note.content;
    setEditingId(note.id);
  };

  const togglePin = async (note) => {
    await updateDoc(doc(db, "notes", note.id), {
      pinned: !note.pinned,
      timestamp: serverTimestamp(),
    });
    fetchNotes();
  };

  // ---------------- Chatbot ----------------
  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    setLoading(true);

    const userMessage = { sender: "user", text: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("http://127.0.0.1:5000/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput }),
      });

      const data = await res.json();
      const botMessage = { sender: "bot", text: data.reply || "⚠️ No response" };

      setChatMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Chatbot error:", err);
    } finally {
      setLoading(false);
      setChatInput("");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard ✅");
  };

  const execCommand = (cmd) => {
    document.execCommand(cmd, false, null);
  };

  // ---------------- PDF Download ----------------
  const downloadNoteAsPDF = (note) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(note.title || "Untitled Note", 10, 20);

    // Convert HTML content to plain text
    const content = note.content.replace(/<\/?[^>]+(>|$)/g, "");
    const lines = doc.splitTextToSize(content, 180);
    doc.setFontSize(12);
    doc.text(lines, 10, 40);

    // Save
    doc.save(`${note.title || "note"}.pdf`);
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase());
    const matchesColor = filterColor ? note.color === filterColor : true;
    return matchesSearch && matchesColor;
  });

  return (
    <div className="notes-page">
      <h1>📝 My Notes</h1>

      <div className="notes-controls">
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="main-container">
        {/* ---------------- CHATBOT ---------------- */}
        <div className="chatbot-container">
          <h2>🤖 Study Assistant</h2>
          <div className="chat-window">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.sender}`}>
                <p>{msg.text}</p>
                {msg.sender === "bot" && (
                  <button onClick={() => copyToClipboard(msg.text)}>📋 Copy</button>
                )}
              </div>
            ))}
            {loading && <p>⏳ Thinking...</p>}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask me anything about your notes..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>

        {/* ---------------- NOTES ---------------- */}
        <div className="notes-section">
          {/* Note Input */}
          <div className="note-input" style={{ backgroundColor: color }}>
            <div className="toolbar">
              <button onClick={() => execCommand("undo")} title="Undo">↩</button>
              <button onClick={() => execCommand("redo")} title="Redo">↪</button>
              <button onClick={() => execCommand("bold")} title="Bold"><b>B</b></button>
              <button onClick={() => execCommand("italic")} title="Italic"><i>I</i></button>
              <button onClick={() => execCommand("underline")} title="Underline"><u>U</u></button>
              <button onClick={() => execCommand("strikeThrough")} title="Strikethrough">S̶</button>

              <label className="color-picker-btn" title="Pick Note Color">
                🎨
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>

              <label className="pin-toggle">
                📌
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                />
              </label>
            </div>

            <br />

            <input
              type="text"
              placeholder="Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div
              ref={contentRef}
              className="content-editable"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write something... ✏️"
            ></div>

            <button className="save-btn" onClick={handleAddOrUpdate}>
              {editingId ? "Update Note" : "Add Note"}
            </button>
          </div>

          {/* Notes Grid */}
          <div className="notes-grid">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="note-card"
                style={{ backgroundColor: note.color }}
              >
                <div className="note-header">
                  <h3>{note.title}</h3>
                  <button onClick={() => togglePin(note)}>
                    {note.pinned ? "📌" : "📍"}
                  </button>
                </div>
                <div
                  className="note-content"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                ></div>
                <div className="note-actions">
                  <button onClick={() => handleEdit(note)}>✏ Edit</button>
                  <button onClick={() => handleDelete(note.id)}>🗑 Delete</button>
                  <button onClick={() => downloadNoteAsPDF(note)}>📄 PDF</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
