// client/src/pages/Student/StudentHome.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  updateDoc,
 orderBy,
} from "firebase/firestore";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./StudentHome.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function StudentHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [quizzes, setQuizzes] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [quote, setQuote] = useState("");
  const [points, setPoints] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
const [selectedQuiz, setSelectedQuiz] = useState(null); // holds clicked quiz

  // ------------------- Fetch Motivational Quote -------------------
  useEffect(() => {
    fetch("https://api.quotable.io/random")
      .then((res) => res.json())
      .then((data) => setQuote(data.content))
      .catch(() => setQuote("Keep pushing forward!"));
  }, []);

  // ------------------- Fetch Points -------------------
  useEffect(() => {
    if (!user) return;
    const fetchPoints = async () => {
      const userRef = firestoreDoc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setPoints(userData.points ?? 0);
      }
    };
    fetchPoints();
  }, [user]);

  // ------------------- Fetch Quizzes & Assigned Tasks -------------------
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchQuizzes();
    fetchAssignedQuizTasks();
  }, [user]);

  // ------------------- Quizzes Logic -------------------
  const parseDate = (d) => {
    const dt = d ? new Date(d) : null;
    return dt && !isNaN(dt) ? dt : null;
  };

  const extractQuizzesFromData = (data, docId) => {
    const out = [];
    if (!data) return out;
    if (Array.isArray(data.quizzes)) {
      data.quizzes.forEach((q) => out.push({ ...q, __ownerDocId: docId }));
    }
    if (data.topic || data.score !== undefined) {
      out.push({ ...data, __ownerDocId: docId });
    }
    Object.keys(data).forEach((k) => {
      if (!isNaN(Number(k)) && typeof data[k] === "object" && data[k] !== null) {
        out.push({ ...data[k], __ownerDocId: docId });
      }
    });
    return out;
  };

  const fetchQuizzes = async () => {
    try {
      const results = [];
      const q = query(collection(db, "quiz"), where("uid", "==", user.uid));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        qSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const arr = extractQuizzesFromData(data, docSnap.id);
          arr.forEach((qz) => results.push(qz));
        });
      }

      const cleaned = results.map((r) => ({
        topic: r.topic ?? "Untitled Quiz",
        score: r.score ?? null,
        total: r.total ?? null,
        percentage: r.percentage ?? null,
        difficulty: (r.difficulty ?? "unknown").toString(),
        timeTaken: r.timeTaken ?? null,
        date: r.date ?? null,
        uid: r.uid ?? null,
      }));

      cleaned.sort((a, b) => {
        const tA = parseDate(a.date)?.getTime() ?? 0;
        const tB = parseDate(b.date)?.getTime() ?? 0;
        return tB - tA;
      });

      setQuizzes(cleaned);
      calculateStreak(cleaned);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  const calculateStreak = (quizList) => {
    if (!quizList.length) {
      setStreak(0);
      return;
    }
    const dates = quizList
      .map((q) => parseDate(q.date))
      .filter(Boolean)
      .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
      .sort((a, b) => b - a);
    let currentStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diffDays = (dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) currentStreak++;
      else if (diffDays > 1) break;
    }
    setStreak(currentStreak);
  };

  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const q = query(
        collection(db, "calendar"),
        where("userId", "==", user.uid),
        where("date", ">=", today),
        orderBy("date", "asc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(data.slice(0, 3)); // next 3 events
    };

    fetchEvents();
  }, [user]);

useEffect(() => {
    if (!user) return;

    const fetchNotes = async () => {
      const q = query(
        collection(db, "notes"),
        where("uid", "==", user.uid),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotes(data.slice(0, 3)); // last 3 notes
    };

    fetchNotes();
  }, [user]);
  
  const fetchAssignedQuizTasks = async () => {
    try {
      const q = query(
        collection(db, "assignedQuizzes"),
        where("studentId", "==", user.uid),
        where("status", "==", "pending")
      );
      const snapshot = await getDocs(q);
      const assigned = [];
      snapshot.forEach((docSnap) => {
        assigned.push({ id: docSnap.id, ...docSnap.data() });
      });

      setAssignedTasks(
        assigned.map((aq) => ({
          id: aq.id,
          text: `Take Quiz: ${aq.topic}`,
          done: false,
          isQuiz: true,
          quizData: aq,
        }))
      );
    } catch (err) {
      console.error("Error fetching assigned quizzes:", err);
    }
  };

  const handleTaskClick = (task) => {
    if (task.isQuiz && task.quizData) {
      navigate("/student/quiz-assessment", {
        state: {
          quizData: task.quizData.questions,
          useTimer: task.quizData.timerDuration > 0,
          difficulty: task.quizData.difficulty || "unknown",
          topic: task.quizData.topic || "Unknown",
          timerDuration: task.quizData.timerDuration || 0,
        },
      });

      setAssignedTasks((prev) => prev.filter((t) => t.id !== task.id));
      const assignedQuizRef = firestoreDoc(db, "assignedQuizzes", task.id);
      updateDoc(assignedQuizRef, { status: "completed" }).catch((err) =>
        console.error("Error updating assigned quiz:", err)
      );
    }
  };

  // ------------------- Chart -------------------
  const chartData = {
    labels: quizzes.map((q) => (q.date ? new Date(q.date).toLocaleDateString() : "Unknown")),
    datasets: [
      {
        label: "Score (%)",
        data: quizzes.map((q) => (q.percentage ? parseFloat(q.percentage) : 0)),
        borderColor: "#007bff",
        backgroundColor: "rgba(0,123,255,0.3)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Performance Over Time" },
    },
    scales: { y: { min: 0, max: 100 } },
  };

  // ------------------- Navigation -------------------
  const goToMentorPage = () => navigate("/student/mentor");


  // ------------------- Filtered Quizzes -------------------
  const filteredQuizzes = quizzes
    .filter((quiz) => quiz.topic?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "easy") return a.difficulty.localeCompare(b.difficulty);
      if (sortOrder === "hard") return b.difficulty.localeCompare(a.difficulty);
      return 0;
    });

  // ------------------- Render -------------------
  return (
    <div className="student-dashboard tabbed-layout">
      <div className="dashboard-header">
        <h1>Welcome, {user?.name || "Student"}!</h1>
        <span className="points-display">⭐ {points} pts</span>
        <div className="button-group">
          
          <button className="btn green" onClick={goToMentorPage}>Mentor Requests</button>
          
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={activeTab === "quizzes" ? "active" : ""} onClick={() => setActiveTab("quizzes")}>Quizzes</button>
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>Assigned Tasks</button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        

        {activeTab === "overview" && (
  <div className="overview-tab">
    {/* Streak & Motivation */}
    <div className="streak-counter">🔥 {streak}-Day Learning Streak!</div>
    {quote && <p className="motivation-quote">“{quote}”</p>}

    <div className="overview-panels">
      {/* Recent Notes */}
      <div className="overview-section">
        <h3>📝 Recent Notes</h3>
        {notes.length === 0 ? (
          <p>No notes found.</p>
        ) : (
          <div className="overview-list">
            {notes.map((note) => (
              <div key={note.id} className="overview-card note-card">
                <h4>{note.title || "Untitled"}</h4>
                <div
                  className="note-preview"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="overview-section">
        <h3>📅 Upcoming Events</h3>
        {events.length === 0 ? (
          <p>No upcoming events.</p>
        ) : (
          <div className="overview-list">
            {events.map((event) => (
              <div key={event.id} className="overview-card event-card">
                <strong>{new Date(event.date).toDateString()}</strong>
                <p>{event.note || "No details"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
<br />
    {/* Recent Quizzes */}
    <div className="overview-section">
      <h3>📊 Recent Quizzes</h3>
      {quizzes.length === 0 ? (
        <p>No quizzes completed yet.</p>
      ) : (
        <div className="overview-list">
          {quizzes.slice(0, 5).map((quiz, index) => (
            <div
              key={index}
              className="overview-card quiz-card"
              onClick={() =>
                setQuizzes((prev) =>
                  prev.map((q, i) =>
                    i === index ? { ...q, expanded: !q.expanded } : q
                  )
                )
              }
            >
              <h4>{quiz.topic}</h4>
              <p>
                <strong>Score:</strong> {quiz.score ?? "-"} / {quiz.total ?? "-"} |{" "}
                <strong>Date:</strong>{" "}
                {quiz.date
                  ? new Date(quiz.date).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}



{activeTab === "quizzes" && (
  <div className="quizzes-tab">
    <div className="chart-scroll-container">
      <div className="chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>

    {/* Search & Sort */}
    <div className="quizzes-controls">
      <input
        type="text"
        placeholder="Search by topic..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      <select
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        className="sort-select"
      >
        <option value="default">Sort by Difficulty</option>
        <option value="easy">Easy → Hard</option>
        <option value="hard">Hard → Easy</option>
      </select>
    </div>

    {filteredQuizzes.length === 0 ? (
      <p>No quizzes completed yet.</p>
    ) : (
      <div className="quiz-grid">
        {filteredQuizzes.map((quiz, index) => (
          <div className="quiz-card" key={index}>
            <div
              className="quiz-header"
              onClick={() => setSelectedQuiz(index)}
            >
              <h3>{quiz.topic}</h3>
              <span className={`difficulty ${quiz.difficulty?.toLowerCase() || "unknown"}`}>
                {quiz.difficulty}
              </span>
            </div>
            <p className="quiz-date">{quiz.date ? new Date(quiz.date).toLocaleString() : "Unknown date"}</p>
            <div className="quiz-details">
              <p><strong>Score:</strong> {quiz.score ?? "-"} / {quiz.total ?? "-"}</p>
              <p><strong>Percentage:</strong> {quiz.percentage ?? "-"}%</p>
              <p><strong>Time Taken:</strong> {quiz.timeTaken ?? "-"} sec</p>
            </div>
          </div>
        ))}

        {/* Popup for Selected Quiz */}
        {selectedQuiz !== null && filteredQuizzes[selectedQuiz] && (
          <div className="quiz-popup">
            <div className="quiz-popup-content">
              <button
                className="close-popup"
                onClick={() => setSelectedQuiz(null)}
              >
                ✖
              </button>
              <h4>{filteredQuizzes[selectedQuiz].topic} - Details</h4>
              <p><strong>Score:</strong> {filteredQuizzes[selectedQuiz].score ?? "-"}</p>
              <p><strong>Total Questions:</strong> {filteredQuizzes[selectedQuiz].total ?? "-"}</p>
              <p><strong>Percentage:</strong> {filteredQuizzes[selectedQuiz].percentage ?? "-"}</p>
              <p><strong>Time Taken:</strong> {filteredQuizzes[selectedQuiz].timeTaken ?? "-" } sec</p>
              <p><strong>Date:</strong> {filteredQuizzes[selectedQuiz].date ? new Date(filteredQuizzes[selectedQuiz].date).toLocaleString() : "Unknown"}</p>
              <p><strong>Difficulty:</strong> {filteredQuizzes[selectedQuiz].difficulty}</p>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}


        {activeTab === "tasks" && (
          <div className="tasks-tab">
            <h3>Assigned Quizzes</h3>
            {assignedTasks.length > 0 ? (
              <ul className="task-list">
                {assignedTasks.map((task) => (
                  <li
                    key={task.id}
                    className={task.done ? "done" : ""}
                    onClick={() => handleTaskClick(task)}
                  >
                    {task.text} {task.done && "✅"} {task.isQuiz && !task.done && " 📝 Take Quiz"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-tasks">No assigned quizzes 🎉</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
