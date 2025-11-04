import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import BG from './bg.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // 👈 toggle state
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      (async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.data()?.role;

        if (role === 'admin') navigate('/admin');
        else if (role === 'mentor') navigate('/mentor');
        else navigate('/student');
      })();
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));
      const role = userDoc.data()?.role;

      if (role === 'admin') navigate('/admin');
      else if (role === 'mentor') navigate('/mentor');
      else navigate('/student');
    } catch (err) {
      console.error('Login error:', err);
      alert('Invalid email or password.');
    }
  };

  const togglePassword = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div
      className="login-container"
      style={{ backgroundImage: `url(${BG})` }}
    >
      <div className="login-box">
        <h2 className="login-title">Welcome Back</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="login-input"
            required
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"} // toggle type
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="login-input password-input"
              required
            />
            <span className="toggle-password" onClick={togglePassword}>
              {showPassword ? "🙈" : "👁️"} {/* toggle icon */}
            </span>
          </div>

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="login-footer">
          <p>New here?</p>
          <Link to="/signup" className="signup-link">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
