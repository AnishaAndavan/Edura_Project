import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './AdminProfile.css';

export default function AdminProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    role: 'admin',
    contact: '',
    officeLocation: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ ...profile, ...docSnap.data() });
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, profile);
    alert('Admin profile updated successfully!');
  };

  return (
    <div className="admin-profile-container">
      <h2 className="admin-profile-heading">Admin Profile</h2>
      <div className="admin-profile-grid">
        <input
          name="username"
          value={profile.username}
          onChange={handleChange}
          placeholder="Username"
          className="input"
        />
        <input
          name="email"
          value={profile.email}
          disabled
          className="input disabled"
        />
        <input
          name="contact"
          value={profile.contact}
          onChange={handleChange}
          placeholder="Contact Number"
          className="input"
        />
        <input
          name="officeLocation"
          value={profile.officeLocation}
          onChange={handleChange}
          placeholder="Office Location"
          className="input"
        />
        <input
          name="role"
          value={profile.role}
          disabled
          className="input disabled"
        />
      </div>
      <button onClick={handleSave} className="save-button">
        Save Changes
      </button>
    </div>
  );
}
