import React, { useState, useEffect } from 'react';
import './QuizAssessment.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const QuizAssessment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizData: rawQuizData, useTimer, difficulty, topic, timerDuration } = location.state || {};
  const { user, username } = useAuth();

  const quizData = React.useMemo(() => {
    if (!rawQuizData) return [];
    const data = Array.isArray(rawQuizData) ? rawQuizData : rawQuizData.quiz;
    return (data || []).map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer || q.answer // use 'answer' from backend
    }));
  }, [rawQuizData]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [quizEnded, setQuizEnded] = useState(false);
  const [tabSwitched, setTabSwitched] = useState(false);
  const [timeLeft, setTimeLeft] = useState(useTimer ? timerDuration || 0 : 0);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => {
    if (!quizData || quizData.length === 0) {
      alert("No quiz data found. Redirecting to request page...");
      navigate("/student/request-quiz");
    }
  }, [quizData, navigate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!quizEnded && document.hidden) {
        alert("You switched the tab! Quiz has ended.");
        setQuizEnded(true);
        setTabSwitched(true);
      }
    };

    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [quizEnded]);

  useEffect(() => {
    if (!useTimer || quizEnded) return;
    if (timeLeft <= 0) {
      setTimeUp(true);
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, useTimer, quizEnded]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionClick = (option) => {
    if (selectedOptions[currentQuestion]) return;

    // ✅ Extract letter from option string, e.g., "C) <a>" -> "C"
    const selectedLetter = option.split(')')[0].trim();
    const correctLetter = quizData[currentQuestion].correctAnswer.trim();
    const isCorrect = selectedLetter === correctLetter;

    const newSelections = [...selectedOptions];
    newSelections[currentQuestion] = option;
    setSelectedOptions(newSelections);

    if (isCorrect) setScore((prev) => prev + 1);

    setTimeout(() => {
      if (currentQuestion < quizData.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }, 1000);
  };

  const handleSubmit = () => {
    setQuizEnded(true);
  };

  useEffect(() => {
  const saveToFirebase = async () => {
    if (!quizEnded || tabSwitched) return;
    if (!user) return;

    try {
      // ✅ Save quiz attempt data
      const quizRef = doc(db, "quiz", user.uid);
      const quizSnap = await getDoc(quizRef);

      const newQuizData = {
        topic: topic || 'Unknown',
        difficulty: difficulty || 'Unknown',
        score,
        total: quizData.length,
        percentage: ((score / quizData.length) * 100).toFixed(2),
        timeTaken: useTimer && timerDuration ? timerDuration - timeLeft : null,
        date: new Date().toISOString()
      };

      if (quizSnap.exists()) {
        await updateDoc(quizRef, {
          username: username || user.displayName || user.email || 'Unknown',
          quizzes: arrayUnion(newQuizData)
        });
      } else {
        await setDoc(quizRef, {
          uid: user.uid,
          username: username || user.displayName || user.email || 'Unknown',
          quizzes: [newQuizData]
        });
      }

      // ✅ Add earned stars (points) to user profile
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const currentPoints = userSnap.data().points || 0;
        const newPoints = currentPoints + score; // ⭐ 1 star = 1 point
        await updateDoc(userRef, { points: newPoints });
        console.log(`⭐ Updated user points: ${currentPoints} → ${newPoints}`);
      }

    } catch (error) {
      console.error("❌ Error saving quiz data:", error);
    }
  };

  saveToFirebase();
}, [
  quizEnded,
  tabSwitched,
  user,
  username,
  score,
  difficulty,
  topic,
  useTimer,
  timeLeft,
  quizData,
  timerDuration
]);


  if (!quizData) return null;

  if (quizEnded) {
    const total = quizData.length;
    const percentage = ((score / total) * 100).toFixed(2);

    const chartData = {
      labels: ['Correct Answers'],
      datasets: [{
        label: 'Score %',
        data: [percentage],
        backgroundColor: '#4e73df',
      }]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100 } },
    };

    return (
      <div className="result-container">
        <h2>Quiz Completed!</h2>
        {tabSwitched ? (
          <p>You switched tabs. This attempt is disqualified.</p>
        ) : (
          <>
            {timeUp && <p>⏰ Time's up! Your final score is:</p>}
            <p>Total Score: {score} / {total}</p>
            <p>Percentage: {percentage}%</p>
            <div className="chart-wrapper">
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="stars">
              {Array(score).fill("⭐").map((star, i) => <span key={i}>{star}</span>)}
            </div>
          </>
        )}
        <div className="result-buttons">
          
          <button onClick={() => navigate('/student/request-quiz')}>🏠 Go Back</button>
        </div>
      </div>
    );
  }

  const question = quizData[currentQuestion];

  return (
    <div className="quiz-container">
      {useTimer && (
        <div className="timer-bar">
          ⏱️ Time Left: <strong>{formatTime(timeLeft)}</strong>
        </div>
      )}
      <h2>Question {currentQuestion + 1} of {quizData.length}</h2>
      <p className="question-text">{question.question}</p>
      <div className="options-grid">
        {question.options.map((opt, index) => {
          const selectedAnswer = selectedOptions[currentQuestion];
          const isSelected = selectedAnswer === opt;
          const selectedLetter = opt.split(')')[0].trim();
          const correctLetter = question.correctAnswer.trim();
          const isCorrect = isSelected && selectedLetter === correctLetter;

          return (
            <button
              key={index}
              className={`option-btn ${isSelected ? (isCorrect ? 'correct' : 'wrong') : ''}`}
              onClick={() => handleOptionClick(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizAssessment;
