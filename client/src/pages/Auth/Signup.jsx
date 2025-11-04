import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import './Signup.css';
import BG from './bg.jpg';


export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    // At least 8 chars and at least 1 number
    const regex = /^(?=.*\d).{8,}$/;
    return regex.test(pwd);
  };

  const handleSignup = async () => {
    if (!email || !username || !password) {
      alert('Please fill in all fields.');
      return;
    }

    if (!validatePassword(password)) {
      alert('Password must be at least 8 characters long and contain at least 1 number.');
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email,
        username,
        role,
        createdAt: new Date()
      });

      // After signup, redirect to login page
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Signup failed. Try again.');
    }
  };

  return (
    <div className="signup-container"
    style={{ backgroundImage: `url(${BG})` }}>
      <div className="signup-box">
        <h2 className="signup-title">Create Account</h2>
        
        <input
          type="text"
          placeholder="Name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="signup-input"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="signup-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="signup-input"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="signup-select"
        >
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
        </select>
        <button onClick={handleSignup} className="signup-btn">
          Register
        </button>
        <p className="signup-footer">
          Already have an account? <span onClick={() => navigate('/')} className="login-link">Login</span>
        </p>
      </div>
    </div>
  );
}
