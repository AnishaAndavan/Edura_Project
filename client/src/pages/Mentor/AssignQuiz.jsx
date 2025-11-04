// src/pages/Mentor/AssignQuiz.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./AssignQuiz.css";

export default function AssignQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [timerDuration, setTimerDuration] = useState(0); // minutes

  // Fetch matched students
  useEffect(() => {
    if (!user?.uid) return;

    const fetchStudents = async () => {
      try {
        const q = query(
          collection(db, "matches"),
          where("mentorId", "==", user.uid),
          where("status", "==", "accepted")
        );
        const snapshot = await getDocs(q);
        const fetched = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.studentName && data.studentId) {
            fetched.push({ name: data.studentName, id: data.studentId });
          }
        });
        setStudents(fetched);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };

    fetchStudents();
  }, [user]);

  // Initialize / update number of questions
  const handleNumChange = (e) => {
    let n = parseInt(e.target.value);
    if (isNaN(n) || n <= 0) n = 1;
    setNumQuestions(n);
    setQuestions(
      Array.from({ length: n }, () => ({
        question: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0, // default to first option
      }))
    );
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Validate and assign quiz: IMPORTANT — transform options to labeled format and save correct answer as letter
  const handleAssignQuiz = async () => {
    // Basic validations
    if (!topic.trim()) {
      alert("Please enter a quiz topic.");
      return;
    }
    if (selectedStudents.length === 0) {
      alert("Please select at least one student.");
      return;
    }
    // Check questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) {
        alert(`Please fill Question ${i + 1} text.`);
        return;
      }
      // ensure all options exist
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          alert(`Please fill Option ${String.fromCharCode(65 + j)} for Question ${i + 1}.`);
          return;
        }
      }
      // ensure correctAnswerIndex is valid
      if (typeof q.correctAnswerIndex !== "number" || q.correctAnswerIndex < 0 || q.correctAnswerIndex >= q.options.length) {
        alert(`Please select a valid correct answer for Question ${i + 1}.`);
        return;
      }
    }

    try {
      // For each selected student create a doc
      for (const studentId of selectedStudents) {
        // Build formatted questions: labeled options + correctAnswer as letter (A-D)
        const formattedQuestions = questions.map((q) => {
          const cleanOptions = q.options.map((o) => (o ? o.trim() : ""));
          const labeledOptions = cleanOptions.map((text, idx) => `${String.fromCharCode(65 + idx)}) ${text}`);
          const correctIndex = Math.max(0, Math.min(q.correctAnswerIndex || 0, labeledOptions.length - 1));
          const correctLetter = String.fromCharCode(65 + correctIndex); // "A", "B", ...
          return {
            question: q.question.trim(),
            options: labeledOptions,      // e.g. ["A) Paris", "B) Berlin", ...]
            correctAnswer: correctLetter, // e.g. "A"
          };
        });

        await addDoc(collection(db, "assignedQuizzes"), {
          mentorId: user.uid,
          mentorName: user.username || user.displayName || "Mentor",
          studentId,
          topic,
          questions: formattedQuestions,
          difficulty,
          timerDuration: timerDuration * 60, // convert minutes -> seconds
          assignedAt: new Date().toISOString(),
          status: "pending",
        });
      }

      alert("Quiz assigned successfully!");
      navigate("/mentor");
    } catch (err) {
      console.error("Error assigning quiz:", err);
      alert("Failed to assign quiz.");
    }
  };

  return (
    <div className="assign-quiz-container">
      <h1>Assign Quiz to Students</h1>

      <div className="topic-section">
        <label>Quiz Topic:</label>
        <input
          type="text"
          placeholder="Enter topic (e.g. Machine Learning)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      <div className="student-list">
        <h2>Select Students</h2>
        {students.length > 0 ? (
          students.map((stu) => (
            <label key={stu.id} className="student-item">
              <input
                type="checkbox"
                checked={selectedStudents.includes(stu.id)}
                onChange={() => toggleStudentSelection(stu.id)}
              />
              {stu.name}
            </label>
          ))
        ) : (
          <p>No students found.</p>
        )}
      </div>

      <div className="quiz-builder">
        <label>
          Number of Questions:
          <input
            type="number"
            min="1"
            value={numQuestions}
            onChange={handleNumChange}
          />
        </label>

        <label>
          Difficulty:
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label>
          Timer (minutes, 0 = no timer):
          <input
            type="number"
            min="0"
            value={timerDuration}
            onChange={(e) => setTimerDuration(parseInt(e.target.value) || 0)}
          />
        </label>

        {questions.map((q, qi) => (
          <div key={qi} className="question-card">
            <h3>Question {qi + 1}</h3>
            <textarea
              placeholder="Enter question text"
              value={q.question}
              onChange={(e) => handleQuestionChange(qi, "question", e.target.value)}
            />

            <div className="options-grid">
              {q.options.map((opt, oi) => (
                <input
                  key={oi}
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(qi, oi, e.target.value)}
                />
              ))}
            </div>

            <label>
              Correct Answer:
              <select
                value={q.correctAnswerIndex}
                onChange={(e) =>
                  handleQuestionChange(qi, "correctAnswerIndex", parseInt(e.target.value, 10))
                }
              >
                {q.options.map((opt, idx) => (
                  <option key={idx} value={idx}>
                    {String.fromCharCode(65 + idx)}) {opt || "(empty)"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      <button className="assign-btn" onClick={handleAssignQuiz}>
        Assign Quiz
      </button>
    </div>
  );
}
