// src/components/Navbar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import './Navbar.css';

const Navbar = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const profileLink =
    role === 'mentor'
      ? '/mentor/profile'
      : role === 'student'
      ? '/student/profile'
      : role === 'admin'
      ? '/admin/profile'
      : '/profile';

  const calendarLink = '/calendar';

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <h1>Edura - AI Learning Assistant</h1>
      </div>

      <ul className="navbar-links">
        {user && (
          <>
            {/* ---------- Student Navbar ---------- */}
            {role === 'student' && (
              <>
                <li><NavLink to="/student" end>Dashboard</NavLink></li>
                <li><NavLink to="/student/mentor">Mentor</NavLink></li>
                <li><NavLink to="/student/notes">Notes</NavLink></li>
                <li><NavLink to="/student/request-quiz">Quiz</NavLink></li>
                <li><NavLink to="/chat/list">Chat</NavLink></li>
              </>
            )}

            {/* ---------- Mentor Navbar ---------- */}
            {role === 'mentor' && (
              <>
                <li><NavLink to="/mentor" end>Dashboard</NavLink></li>
                <li><NavLink to="/mentor/requests">Requests</NavLink></li>
                <li><NavLink to="/chat/list">Chat</NavLink></li>
              </>
            )}

            {/* ---------- Admin Navbar ---------- */}
            {role === 'admin' && (
              <li><NavLink to="/admin" end>Home</NavLink></li>
            )}

            {/* ---------- Common Links ---------- */}
            <li><NavLink to={calendarLink}>Calendar</NavLink></li>
            <li><NavLink to={profileLink}>Profile</NavLink></li>
            <li>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
