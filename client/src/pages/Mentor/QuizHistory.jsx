import React, { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./QuizHistory.css";

export default function QuizHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | completed
  const [sort, setSort] = useState("newest"); // newest | oldest | difficulty

  useEffect(() => {
    const fetchQuizHistory = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, "assignedQuizzes"), where("mentorId", "==", user.uid));
        const snapshot = await getDocs(q);
        const quizzes = [];

        for (const docSnap of snapshot.docs) {
          const quizData = { id: docSnap.id, ...docSnap.data() };

          // Fetch student name from Firestore
          if (quizData.studentId) {
            const studentRef = doc(db, "users", quizData.studentId);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
              quizData.studentName = studentSnap.data().username || studentSnap.data().name;
            } else {
              quizData.studentName = "Unknown";
            }
          } else {
            quizData.studentName = "Unknown";
          }

          quizzes.push(quizData);
        }

        setQuizHistory(quizzes);
      } catch (err) {
        console.error("Error fetching quiz history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizHistory();
  }, [user]);

  // Filtering
  const filteredQuizzes =
    filter === "all"
      ? quizHistory
      : quizHistory.filter((q) => q.status === filter);

  // Sorting
  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => {
    if (sort === "newest") return new Date(b.assignedAt) - new Date(a.assignedAt);
    if (sort === "oldest") return new Date(a.assignedAt) - new Date(b.assignedAt);
    if (sort === "difficulty") {
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
      return (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0);
    }
    return 0;
  });

  return (
    <div className="quiz-history-container">
      <h1>📘 Assigned Quiz History</h1>

      <div className="controls">
        {/* Filter buttons */}
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
        <button className={`filter-btn ${filter === "pending" ? "active" : ""}`} onClick={() => setFilter("pending")}>Pending</button>
        <button className={`filter-btn ${filter === "completed" ? "active" : ""}`} onClick={() => setFilter("completed")}>Completed</button>

        {/* Sort buttons */}
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">📅 Newest First</option>
          <option value="oldest">📅 Oldest First</option>
          <option value="difficulty">🎯 Difficulty</option>
        </select>

        <button className="btn back-btn" onClick={() => navigate("/mentor")}>← Back to Dashboard</button>
      </div>

      {loading ? (
        <p>Loading quiz history...</p>
      ) : sortedQuizzes.length === 0 ? (
        <p className="empty-msg">No quizzes found.</p>
      ) : (
        <div className="quiz-history-grid">
          {sortedQuizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <h3>{quiz.topic}</h3>
              <p><strong>Student:</strong> {quiz.studentName}</p>
              <p><strong>Difficulty:</strong> {quiz.difficulty}</p>
              <p><strong>Assigned:</strong> {new Date(quiz.assignedAt).toLocaleString()}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-badge ${quiz.status}`}>
                  {quiz.status === "completed" ? "✅ Completed" : "⏳ Pending"}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
