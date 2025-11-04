import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, getDoc, updateDoc, doc } from "firebase/firestore";
import { createOrGetChatRoom } from "../../services/ServiceChat";
import "./MentorRequests.css"; // reuse same CSS

export default function MentorRequests() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedMatches, setAcceptedMatches] = useState([]);
  const [stopRequests, setStopRequests] = useState([]);
  const [quizStatus, setQuizStatus] = useState({}); // studentId -> assigned quizzes
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
  const fetchMatches = async () => {
    if (!user?.uid) return;
    try {
      const matchesRef = collection(db, "matches");
      const q = query(matchesRef, where("mentorId", "==", user.uid));
      const snapshot = await getDocs(q);

      const pending = [];
      const accepted = [];
      const stopReqs = [];
      const quizzes = {};

      // For each match, fetch student info
      for (const docSnap of snapshot.docs) {
        const match = { id: docSnap.id, ...docSnap.data() };

        // Fetch student details
        const studentRef = doc(db, "users", match.studentId);
        const studentSnap = await getDoc(studentRef);
        const studentData = studentSnap.exists() ? studentSnap.data() : {};

        const enrichedMatch = {
          ...match,
          studentName: studentData.username || "Unknown",
          studentEmail: studentData.email || "-",
          studentInterest: studentData.interest || "-",
          studentRole: studentData.role || "-",
        };

        // Categorize by status
        if (match.status === "pending") pending.push(enrichedMatch);
        else if (match.status === "accepted") accepted.push(enrichedMatch);
        else if (match.status === "stop_requested") stopReqs.push(enrichedMatch);

        if (match.assignedQuizzes) quizzes[match.studentId] = match.assignedQuizzes;
      }

      setPendingRequests(pending);
      setAcceptedMatches(accepted);
      setStopRequests(stopReqs);
      setQuizStatus(quizzes);
    } catch (err) {
      console.error("Error fetching mentor matches:", err);
    }
  };

  fetchMatches();
}, [user]);


  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleAcceptRequest = async (match) => {
    try {
      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, { status: "accepted" });
      setPendingRequests((prev) => prev.filter((m) => m.id !== match.id));
      setAcceptedMatches((prev) => [...prev, { ...match, status: "accepted" }]);
      alert(`Accepted ${match.studentName}'s request!`);
    } catch (err) {
      console.error(err);
      alert("Failed to accept request.");
    }
  };

  const handleStartChat = async (studentId) => {
    try {
      const chatId = await createOrGetChatRoom(studentId, user.uid);
      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to start chat.");
    }
  };

  const handleStopCourse = async (matchId, studentName) => {
    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, { status: "stopped", stopRequest: false });
      setAcceptedMatches((prev) => prev.filter((m) => m.id !== matchId));
      setStopRequests((prev) => prev.filter((m) => m.id !== matchId));
      alert(`Stopped course with ${studentName}.`);
    } catch (err) {
      console.error(err);
      alert("Failed to stop course.");
    }
  };

  const toggleQuizPanel = (studentId) => {
    setQuizStatus((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], open: !prev[studentId]?.open },
    }));
  };

  const toggleStudentDetails = (studentId) => {
    setExpandedStudent((prev) => (prev === studentId ? null : studentId));
  };

  return (
    <div className="mentor-home-container">
      <h1>👨‍🏫 Mentor Dashboard</h1>

      {/* Pending Requests */}
      <div className="card requests-card">
        <h2>Pending Requests</h2>
        {pendingRequests.length ? pendingRequests.map((m) => (
          <div
            key={m.id}
            className={`request-item ${expandedStudent === m.studentId ? "expanded" : ""}`}
            onClick={() => toggleStudentDetails(m.studentId)}
          >
            <p><strong>Student:</strong> {m.studentName}</p>
            <p><strong>Interest:</strong> {m.studentInterest || "N/A"}</p>
            {expandedStudent === m.studentId && (
              <div className="student-details">
                <p><strong>Email:</strong> {m.studentEmail || "-"}</p>
                <p><strong>Role:</strong> {m.studentRole || "-"}</p>
                <p><strong>Joined:</strong> {m.createdAt ? new Date(m.createdAt).toLocaleString() : "-"}</p>
                <button className="btn accept-btn" onClick={() => handleAcceptRequest(m)}>Accept Request</button>
              </div>
            )}
          </div>
        )) : <p className="empty-msg">No pending requests.</p>}
      </div>

      {/* Stop Requests */}
      <div className="card stop-requests-card">
        <h2>Stop Requests</h2>
        {stopRequests.length ? stopRequests.map((m) => (
          <div key={m.id} className="stop-item">
            <p><strong>Student:</strong> {m.studentName}</p>
            <button className="btn stop-btn" onClick={() => handleStopCourse(m.id, m.studentName)}>Approve Stop</button>
          </div>
        )) : <p className="empty-msg">No stop requests.</p>}
      </div>

      {/* Accepted Students */}
      <div className="card accepted-card">
        <h2>Your Students</h2>
        {acceptedMatches.length ? acceptedMatches.map((m) => (
          // In the mapping for pending / accepted students
<div
  key={m.id}
  className={`accepted-item ${expandedStudent === m.id ? "expanded" : ""}`}
>
  <div className="student-header" onClick={() => toggleStudentDetails(m.id)}>
    <p><strong>Student:</strong> {m.studentName}</p>
    <div className="student-buttons">
      <button
        className="btn chat-btn"
        onClick={(e) => { e.stopPropagation(); handleStartChat(m.studentId); }}
      >
        Chat
      </button>
      <button
        className="btn stop-btn"
        onClick={(e) => { e.stopPropagation(); handleStopCourse(m.id, m.studentName); }}
      >
        Stop Course
      </button>
      {quizStatus[m.studentId]?.assignedQuizzes?.length > 0 && (
        <button
          className="btn blue"
          onClick={(e) => { e.stopPropagation(); toggleQuizPanel(m.studentId); }}
        >
          {quizStatus[m.studentId].open ? "Hide Quizzes" : "View Quizzes"}
        </button>
      )}
    </div>
  </div>

  {/* Student Details */}
  {expandedStudent === m.id && (
    <div className="student-details">
      <p><strong>Email:</strong> {m.studentEmail || "-"}</p>
      <p><strong>Interest:</strong> {m.studentInterest || "-"}</p>
      <p><strong>Joined:</strong> {m.createdAt ? new Date(m.createdAt).toLocaleString() : "-"}</p>
    </div>
  )}

  {/* Quiz Panel */}
  {quizStatus[m.studentId]?.open && (
    <div className="quiz-panel">
      {quizStatus[m.studentId].assignedQuizzes.map((quiz, idx) => (
        <div key={idx} className="quiz-item">
          <p><strong>Quiz:</strong> {quiz.topic}</p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={quiz.status === "completed" ? "status-completed" : "status-pending"}>
              {quiz.status}
            </span>
          </p>
        </div>
      ))}
    </div>
  )}
</div>

        )) : <p className="empty-msg">No matched students yet.</p>}
      </div>
    </div>
  );
}
