import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './MentorProfile.css';

export default function MentorProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    expertise: '',
    experience: '',
    linkedIn: '',
    education: '',
    certifications: '',
    availability: '',
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
    alert('Profile updated successfully!');
  };

  return (
    <div className="mentor-profile-container">
      <h2 className="mentor-profile-heading">Mentor Profile</h2>
      <div className="mentor-profile-grid">
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          name="name"
          value={profile.name}
          onChange={handleChange}
          placeholder="Full Name"
          className="input"
        />

        <label htmlFor="email">Email:</label>
        <input
          id="email"
          name="email"
          value={profile.email}
          disabled
          className="input disabled"
        />

        <label htmlFor="bio">Bio:</label>
        <textarea
          id="bio"
          name="bio"
          value={profile.bio}
          onChange={handleChange}
          placeholder="Short Bio"
          className="textarea full-width"
        />

        <label htmlFor="expertise">Expertise:</label>
        <input
          id="expertise"
          name="expertise"
          value={profile.expertise}
          onChange={handleChange}
          placeholder="Area of Expertise (e.g. ML, Web Dev)"
          className="input"
        />

        <label htmlFor="experience">Experience:</label>
        <input
          id="experience"
          name="experience"
          value={profile.experience}
          onChange={handleChange}
          placeholder="Years of Experience"
          className="input"
        />

        <label htmlFor="education">Education:</label>
        <input
          id="education"
          name="education"
          value={profile.education}
          onChange={handleChange}
          placeholder="Highest Education"
          className="input"
        />

        <label htmlFor="certifications">Certifications:</label>
        <input
          id="certifications"
          name="certifications"
          value={profile.certifications}
          onChange={handleChange}
          placeholder="Certifications (comma separated)"
          className="input full-width"
        />

        <label htmlFor="linkedIn">LinkedIn:</label>
        <input
          id="linkedIn"
          name="linkedIn"
          value={profile.linkedIn}
          onChange={handleChange}
          placeholder="LinkedIn URL"
          className="input full-width"
        />

        <label htmlFor="availability">Availability:</label>
        <textarea
          id="availability"
          name="availability"
          value={profile.availability}
          onChange={handleChange}
          placeholder="Availability (days/times)"
          className="textarea full-width"
        />
      </div>
      <button onClick={handleSave} className="save-button">
        Save Profile
      </button>
    </div>
  );
}
