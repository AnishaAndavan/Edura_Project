import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import "./Calendar.css";

export default function MyCalendar() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [color, setColor] = useState("#ff4d4d");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    try {
      const q = query(collection(db, "calendar"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) {
      alert("Please enter a note");
      return;
    }
    try {
      await addDoc(collection(db, "calendar"), {
        userId: user.uid,
        name: user.displayName || user.email || "Anonymous",
        date: date.toISOString().split("T")[0],
        note: note.trim(),
        color: color,
      });
      setNote("");
      fetchNotes();
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, "calendar", id));
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Render full background color inside the tile as an overlay div
  const tileContent = ({ date: tileDate, view }) => {
    if (view === "month") {
      const formatted = tileDate.toISOString().split("T")[0];
      const noteForDay = notes.find((n) => n.date === formatted);
      if (noteForDay) {
        return (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: noteForDay.color,
              opacity: 0.6,
              borderRadius: "10px",
              zIndex: -1,
            }}
          ></div>
        );
      }
    }
    return null;
  };

  return (
    <div className="calendar-container">
      <h2>📅 My Calendar</h2>

      <Calendar
        value={date}
        onChange={setDate}
        tileContent={tileContent}
        className="big-calendar"
      />

      <div className="note-input">
        <h4>Selected Date: {date.toDateString()}</h4>
        <textarea
          placeholder="Write your note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="color-picker">
          <label>Pick a color: </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <button onClick={handleAddNote}>Add Note</button>
      </div>

      <div className="notes-list">
        <h3>Notes for {date.toDateString()}</h3>
        {notes.filter((n) => n.date === date.toISOString().split("T")[0]).length ===
        0 ? (
          <p>No notes for this day.</p>
        ) : (
          notes
            .filter((n) => n.date === date.toISOString().split("T")[0])
            .map((item) => (
              <div
                className="note-item"
                key={item.id}
                style={{ borderLeft: `5px solid ${item.color}` }}
              >
                <p>
                  <strong>{item.note}</strong> — <em>{item.name}</em>
                </p>
                <button onClick={() => handleDeleteNote(item.id)}>Delete</button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
