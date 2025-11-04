import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentQuizRequest.css';

const fetchAndParseQuiz = async ({ prompt, numQuestions, difficulty }) => {
  const res = await fetch('http://localhost:5000/api/generate_quiz', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      difficulty,
      numQuestions: parseInt(numQuestions),
    }),
  });

  if (!res.ok) throw new Error("Failed to fetch quiz from server");

  const data = await res.json();
  console.log("📦 Quiz Data:", data);

  // ✅ Backend returns { quiz: [...] }
  const questions = Array.isArray(data.quiz) ? data.quiz : [];

  if (questions.length === 0) {
    throw new Error("No quiz questions received.");
  }

  // ✅ Normalize so QuizAssessment works with correctAnswer
  return questions.map(q => ({
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer || q.answer, // support both keys
  }));
};

const StudentQuizRequest = () => {
  const [promptInput, setPromptInput] = useState('');
  const [number, setNumber] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [useTimer, setUseTimer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);

      const quizData = await fetchAndParseQuiz({
        prompt: promptInput,
        numQuestions: number,
        difficulty,
      });

      const timerDuration = useTimer ? number * 60 : null; // ⏲️ total time in seconds

      navigate('/student/quiz-assessment', {
        state: {
          quizData,
          topic: promptInput,
          difficulty,
          useTimer,
          timerDuration,
        }
      });

    } catch (err) {
      console.error("❌ Quiz generation failed:", err);
      setError("Quiz generation failed. Please try a different prompt or check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-request-container">
      <div className="quiz-request-card">
        <h2 className="quiz-request-title">
          <span role="img" aria-label="quiz">🧠</span> Request a Custom Quiz
        </h2>

        <form onSubmit={handleSubmit} className="quiz-form">
          <div className="form-group">
            <label>Give the topic</label>
            <textarea
              placeholder="Ask any quiz you want. E.g., 'Give me 5 MCQs on photosynthesis for 9th grade.'"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              required
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Number of Questions</label>
            <input
              type="number"
              min="1"
              max="50"
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              required
            />
          </div>

          <div className="form-group">
            <label>Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <label className="checkbox-group">
            <input
              type="checkbox"
              checked={useTimer}
              onChange={() => setUseTimer(!useTimer)}
            />
            Enable Timer
          </label>

          <button type="submit" className="generate-btn" disabled={loading}>
            🚀 {loading ? 'Generating...' : 'Generate Quiz'}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default StudentQuizRequest;
