// client/src/pages/Student/StudentMentor.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { createOrGetChatRoom } from "../../services/ServiceChat";
import { db, collection, getDocs, doc, getDoc } from "../../services/firebase";
import "./StudentMentor.css";

export default function StudentMentor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("request");
  const [interest, setInterest] = useState("");
  const [mentorMatches, setMentorMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);
  const [fetchingMatch, setFetchingMatch] = useState(true);

  const [showNotification, setShowNotification] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mentorProfile, setMentorProfile] = useState(null);

  const [allMentors, setAllMentors] = useState([]); // new
  const [fetchingMentors, setFetchingMentors] = useState(false); // new

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // Fetch active mentor
  useEffect(() => {
    const fetchActiveMatch = async () => {
      if (!user?.uid) return;
      setFetchingMatch(true);
      try {
        const res = await fetch(`http://localhost:5000/get_active_match/${user.uid}`);
        const data = await res.json();
        if (data.active && data.match) {
          const match = data.match;
          const mentorRef = doc(db, "users", match.mentorId);
          const mentorSnap = await getDoc(mentorRef);
          if (mentorSnap.exists()) {
            setActiveMatch({ ...match, ...mentorSnap.data() });
          } else {
            setActiveMatch(match);
          }
          setActiveTab("active");
          if (data.match.status === "stopped") setShowNotification(true);
        } else {
          setActiveMatch(null);
          setActiveTab("request");
        }
      } catch (err) {
        console.error("Error fetching active match:", err);
        setActiveMatch(null);
      } finally {
        setFetchingMatch(false);
      }
    };
    fetchActiveMatch();
  }, [user]);

  // Fetch all mentors from Firestore
  useEffect(() => {
    const fetchAllMentors = async () => {
      if (activeTab !== "all") return;
      setFetchingMentors(true);
      try {
        const mentorsRef = collection(db, "users");
        const snapshot = await getDocs(mentorsRef);
        const mentors = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.role === "mentor");
        setAllMentors(mentors);
      } catch (err) {
        console.error("Error fetching mentors:", err);
      } finally {
        setFetchingMentors(false);
      }
    };
    fetchAllMentors();
  }, [activeTab]);

  const getMatchPercentage = (cosine_score) => Math.round((cosine_score ?? 0) * 100);
  const getStars = (percentage) => "⭐".repeat(Math.round((percentage / 100) * 5));

  const handleRequest = async () => {
    if (!user?.uid || !interest.trim()) {
      alert("Enter your interest and make sure you are logged in.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interest,
          studentId: user.uid,
          studentName: user.username || user.email,
        }),
      });

      const data = await res.json();
      const matches = Array.isArray(data.matches) ? data.matches : [];
      matches.sort((a, b) => b.cosine_score - a.cosine_score);
      setMentorMatches(matches);
      setSubmitted(true);
    } catch (err) {
      console.error("Match request error:", err);
      alert("Failed to fetch mentor matches.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (mentor) => {
    if (activeMatch && activeMatch.status === "accepted") {
      alert("You already have an active mentor.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/finalize_match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: user.uid,
          studentName: user.username || user.email,
          mentorId: mentor.id || mentor.mentorId,
          mentorName: mentor.name || mentor.mentorName,
          score: mentor.cosine_score || 0,
        }),
      });

      const data = await res.json();
      if (data.matchId) {
        alert(`Request sent to ${mentor.name || mentor.mentorName}!`);
        setMentorMatches([]);
        setInterest("");
        setSubmitted(false);
        setActiveMatch({ ...mentor, status: "pending" });
        setActiveTab("active");
      } else {
        alert(data.message || "Failed to send request.");
      }
    } catch (err) {
      console.error("Error sending request:", err);
      alert("Failed to send request.");
    }
  };

  const handleViewProfile = async (mentorId) => {
    try {
      const mentorRef = doc(db, "users", mentorId);
      const mentorSnap = await getDoc(mentorRef);
      if (mentorSnap.exists()) {
        setMentorProfile({ id: mentorId, ...mentorSnap.data() });
        setShowModal(true);
      } else alert("Mentor profile not found.");
    } catch (err) {
      console.error("Error fetching mentor profile:", err);
      alert("Failed to load mentor profile.");
    }
  };

  const handleStartChat = async (mentorId) => {
    try {
      const chatId = await createOrGetChatRoom(user.uid, mentorId);
      navigate(`/chat/${chatId}`);
    } catch (err) {
      console.error("Error starting chat:", err);
      alert("Failed to start chat.");
    }
  };

  return (
    <div className="student-mentor container">
      {showNotification && (
        <div className="notification-bar">
          <span>Your mentor has stopped the course.</span>
          <button className="btn close-btn" onClick={() => setShowNotification(false)}>✖</button>
        </div>
      )}

      {fetchingMatch && <p className="loading-text">Checking your active mentor...</p>}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "request" ? "active" : ""}`}
          disabled={activeMatch && activeMatch.status !== "stopped"}
          onClick={() => setActiveTab("request")}
        >
          Request Mentor
        </button>
        <button
          className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
          disabled={!activeMatch}
          onClick={() => setActiveTab("active")}
        >
          Active Mentor
        </button>
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Mentors
        </button>
      </div>

      {/* Request Tab */}
      {activeTab === "request" && (
        <div className="tab-content">
          <div className="card request-card">
            <textarea
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              placeholder="Enter your interest..."
            />
            <button
              className="btn blue full"
              onClick={handleRequest}
              disabled={loading || !interest.trim()}
            >
              {loading ? "Matching..." : "Request"}
            </button>

            {submitted && mentorMatches.length > 0 && (
              <div className="card matches-card">
                <h3>Top Mentor Matches</h3>
                {mentorMatches.map((mentor) => {
                  const percentage = getMatchPercentage(mentor.cosine_score);
                  const stars = getStars(percentage);
                  return (
                    <div className="mentor-card" key={mentor.mentorId}>
                      <p className="mentor-name">{mentor.mentorName}</p>
                      <p>{stars} {percentage}% Match</p>
                      <div className="button-group">
                        <button className="btn gray" onClick={() => handleViewProfile(mentor.mentorId)}>View</button>
                        <button className="btn green" onClick={() => handleSendRequest(mentor)}>Request</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Mentor Tab */}
      {activeTab === "active" && activeMatch && (
        <div className="tab-content">
          <div className="card active-match-card">
            <h2>Your Mentor</h2>
            <p className="mentor-name">{activeMatch.name || activeMatch.mentorName}</p>
            <p>Status: {activeMatch.status}</p>
            <div className="mentor-details">
              <p><strong>Expertise:</strong> {activeMatch.expertise || "-"}</p>
              <p><strong>Experience:</strong> {activeMatch.experience || "-"}</p>
              <p><strong>Education:</strong> {activeMatch.education || "-"}</p>
            </div>
            <div className="button-group">
              <button className="btn blue" onClick={() => handleStartChat(activeMatch.uid)}>Chat</button>
            </div>
          </div>
        </div>
      )}

      {/* All Mentors Tab */}
      {activeTab === "all" && (
        <div className="tab-content">
          <div className="card all-mentors-card">
            <h2>All Mentors</h2>
            {fetchingMentors ? (
              <p>Loading mentors...</p>
            ) : allMentors.length === 0 ? (
              <p>No mentors found.</p>
            ) : (
              <div className="mentor-grid">
                {allMentors.map((m) => (
                  <div key={m.id} className="mentor-card" onClick={() => handleViewProfile(m.id)}>
                    <h3>{m.name || m.username}</h3>
                    <p><strong>Expertise:</strong> {m.expertise || "-"}</p>
                    <p><strong>Experience:</strong> {m.experience || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && mentorProfile && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{mentorProfile.name || mentorProfile.username}</h2>
            <p><strong>Email:</strong> {mentorProfile.email}</p>
            <p><strong>Expertise:</strong> {mentorProfile.expertise}</p>
            <p><strong>Experience:</strong> {mentorProfile.experience}</p>
            <p><strong>Education:</strong> {mentorProfile.education}</p>
            <p><strong>LinkedIn:</strong> {mentorProfile.linkedIn ? <a href={mentorProfile.linkedIn} target="_blank" rel="noopener noreferrer">{mentorProfile.linkedIn}</a> : "-"}</p>

            <div className="modal-buttons">
              <button className="btn red" onClick={() => setShowModal(false)}>Close</button>
              <button
                className="btn green"
                disabled={!!activeMatch && activeMatch.status !== "stopped"}
                onClick={() => {
                  handleSendRequest(mentorProfile);
                  setShowModal(false);
                }}
              >
                {activeMatch && activeMatch.status !== "stopped" ? "Already Have Mentor" : "Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
