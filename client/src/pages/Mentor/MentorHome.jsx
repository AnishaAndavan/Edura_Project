// client/src/pages/Mentor/MentorHome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { createOrGetChatRoom } from "../../services/ServiceChat";
import "./MentorHome.css";

export default function MentorHome() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedMatches, setAcceptedMatches] = useState([]);
  const [assignedQuizzesByStudent, setAssignedQuizzesByStudent] = useState({});
  const [visibleQuizzes, setVisibleQuizzes] = useState({});

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // Fetch mentor-student matches
  useEffect(() => {
    const fetchMatches = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, "matches"), where("mentorId", "==", user.uid));
        const snapshot = await getDocs(q);

        const pending = [];
        const accepted = [];
        snapshot.forEach((docSnap) => {
          const match = { id: docSnap.id, ...docSnap.data() };
          if (match.status === "pending") pending.push(match);
          else if (match.status === "accepted") accepted.push(match);
        });

        setPendingRequests(pending);
        setAcceptedMatches(accepted);
      } catch (err) {
        console.error("Error fetching mentor matches:", err);
      }
    };
    fetchMatches();
  }, [user]);

  // Fetch assigned quizzes for each student
  useEffect(() => {
    const fetchAssignedQuizzes = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, "assignedQuizzes"), where("mentorId", "==", user.uid));
        const snapshot = await getDocs(q);

        const quizzesByStudent = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!quizzesByStudent[data.studentId]) quizzesByStudent[data.studentId] = [];
          quizzesByStudent[data.studentId].push(data);
        });

        setAssignedQuizzesByStudent(quizzesByStudent);
      } catch (err) {
        console.error("Error fetching assigned quizzes:", err);
      }
    };
    fetchAssignedQuizzes();
  }, [user]);

  // Handlers
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const goToProfile = () => navigate("/mentor/profile");

  const handleAcceptRequest = async (match) => {
    try {
      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, { status: "accepted" });
      setPendingRequests((prev) => prev.filter((m) => m.id !== match.id));
      setAcceptedMatches((prev) => [...prev, { ...match, status: "accepted" }]);
    } catch (err) {
      console.error("Failed to accept request:", err);
      alert("Failed to accept request.");
    }
  };

  const handleStartChat = async (studentId) => {
    try {
      const chatId = await createOrGetChatRoom(studentId, user.uid);
      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error("Failed to start chat:", err);
      alert("Failed to start chat.");
    }
  };

  const handleAssignQuiz = () => {
    navigate("/mentor/assign-quiz", { state: { students: acceptedMatches } });
  };

  const toggleQuizVisibility = (studentId) => {
    setVisibleQuizzes((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const scrollToStudents = () => {
    document.querySelector(".accepted-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mentor-home">
      {/* Welcome Card */}
      <div className="card welcome-card">
        <h1>Welcome, {user?.name || "Mentor"}!</h1>
        
        <div className="button-group">
          <button className="btn blue" onClick={() => navigate("/mentor/requests")}>
            View Requests
          </button>
          <button className="btn green" onClick={scrollToStudents}>
            My Students
          </button>
          
        </div>
      </div>

      {/* Pending Requests */}
      <div className="card requests-card">
        <h2>Pending Requests</h2>
        {pendingRequests.length > 0 ? (
          pendingRequests.map((match) => (
            <div key={match.id} className="request-item">
              <p>Student: {match.studentName}</p>
              <button
                className="btn accept-btn"
                onClick={() => handleAcceptRequest(match)}
              >
                Accept
              </button>
            </div>
          ))
        ) : (
          <p className="empty-msg">No pending requests.</p>
        )}
      </div>

      {/* Accepted Students */}
      <div className="card accepted-card">
        <h2>Your Students</h2>
        {acceptedMatches.length > 0 ? (
          <>
            {acceptedMatches.map((match) => (
              <div key={match.id} className="accepted-item">
                <div className="student-header">
                  <p className="student-name">{match.studentName}</p>
                  <div className="student-buttons">
                    <button
                      className="btn chat-btn"
                      onClick={() => handleStartChat(match.studentId)}
                    >
                      Chat
                    </button>
                    <button
                      className="btn view-quiz-btn"
                      onClick={() => toggleQuizVisibility(match.studentId)}
                    >
                      {visibleQuizzes[match.studentId]
                        ? "Hide Quiz Status"
                        : "View Quiz Status"}
                    </button>
                  </div>
                </div>

                {visibleQuizzes[match.studentId] && (
                  <div className="student-quizzes-panel">
                    {assignedQuizzesByStudent[match.studentId]?.length > 0 ? (
                      assignedQuizzesByStudent[match.studentId].map((quiz, idx) => (
                        <div key={idx} className="quiz-status-card">
                          <p><strong>Quiz:</strong> {quiz.topic}</p>
                          <p><strong>Difficulty:</strong> {quiz.difficulty}</p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <span className={`status-badge ${quiz.status}`}>
                              {quiz.status === "pending"
                                ? "⏳ Pending"
                                : "✅ Completed"}
                            </span>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p>No quizzes assigned yet.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Assign Quiz Button */}
            {/* Assign Quiz & History Buttons */}
<div className="assign-quiz-section">
  <button className="btn assign-quiz-btn" onClick={handleAssignQuiz}>
    📝 Assign Quiz to Students
  </button>
  <button
    className="btn view-history-btn"
    onClick={() => navigate("/mentor/quiz-history")}
  >
    📘 View Quiz History
  </button>
</div>

            
          </>
        ) : (
          <p className="empty-msg">No matched students yet.</p>
        )}
      </div>
    </div>
  );
}
