// client/src/routes/AppRoutes.jsx

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Auth
import Login from "../pages/Auth/Login";
import Signup from "../pages/Auth/Signup";

// Admin
import AdminHome from "../pages/Admin/AdminHome";
import AdminProfile from "../pages/Admin/AdminProfile";

// Mentor
import MentorHome from "../pages/Mentor/MentorHome";
import MentorProfile from "../pages/Mentor/MentorProfile";
import MentorRequests from "../pages/Mentor/MentorRequests";
import AssignQuiz from '../pages/Mentor/AssignQuiz';

// Student
import StudentHome from "../pages/Student/StudentHome";
import StudentProfile from "../pages/Student/StudentProfile";
import StudentMentor from "../pages/Student/StudentMentor";
import Notes from '../pages/Student/Notes';
import StudentQuizRequest from '../pages/Student/StudentQuizRequest';
import QuizAssessment from '../pages/Student/QuizAssessment';
import QuizHistory from "../pages/Mentor/QuizHistory";
// Common
import Calendar from '../pages/Common/Calendar';
import ChatPage from "../pages/chat/ChatPage";

// Misc
import NotFound from "../pages/NotFound";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminHome />} />
      <Route path="/admin/profile" element={<AdminProfile />} />

      {/* Mentor */}
      <Route path="/mentor" element={<MentorHome />} />
      <Route path="/mentor/profile" element={<MentorProfile />} />
      <Route path="/mentor/requests" element={<MentorRequests />} />
<Route path="/mentor/assign-quiz" element={<AssignQuiz />} /> 
<Route path="/mentor/quiz-history" element={<QuizHistory />} />
      {/* Student */}
      <Route path="/student" element={<StudentHome />} />
      <Route path="/student/profile" element={<StudentProfile />} />
      <Route path="/student/notes" element={<Notes />} />
      <Route path="/student/request-quiz" element={<StudentQuizRequest />} />
      <Route path="/student/quiz-assessment" element={<QuizAssessment />} />
      <Route path="/student/mentor" element={<StudentMentor />} />

      <Route path="/mentor/calendar" element={<Navigate to="/calendar" />} />
<Route path="/student/calendar" element={<Navigate to="/calendar" />} />
<Route path="/admin/calendar" element={<Navigate to="/calendar" />} />


      {/* Chat */}
      <Route path="/chat/*" element={<ChatPage />} />

      {/* Common for all roles */}
      <Route path="/calendar" element={<Calendar />} />


      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
