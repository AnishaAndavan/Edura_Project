import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import './StudentProfile.css';

export default function StudentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    interests: '',
    school: '',
    college: '',
    degree: '',
    graduationYear: '',
    skills: '',
    certifications: '',
    projects: '',
    goals: '',
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
    <div className="student-profile-container">
      <h2 className="student-profile-heading">Student Profile</h2>
      <div className="student-profile-grid">

        <label>
          Name
          <input
            name="name"
            value={profile.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="input"
          />
        </label>

        <label>
          Email
          <input
            name="email"
            value={profile.email}
            disabled
            className="input disabled"
          />
        </label>

        <label className="full-width">
          Short Bio
          <textarea
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            placeholder="Short Bio"
            className="textarea full-width"
          />
        </label>

        <label>
          Interests
          <input
            name="interests"
            value={profile.interests}
            onChange={handleChange}
            placeholder="Interests (comma separated)"
            className="input"
          />
        </label>

        <label>
          School Name
          <input
            name="school"
            value={profile.school}
            onChange={handleChange}
            placeholder="School Name"
            className="input"
          />
        </label>

        <label>
          College/University
          <input
            name="college"
            value={profile.college}
            onChange={handleChange}
            placeholder="College/University"
            className="input"
          />
        </label>

        <label>
          Degree
          <input
            name="degree"
            value={profile.degree}
            onChange={handleChange}
            placeholder="Degree (e.g., B.Tech, B.Sc)"
            className="input"
          />
        </label>

        <label>
          Graduation Year
          <input
            name="graduationYear"
            value={profile.graduationYear}
            onChange={handleChange}
            placeholder="Graduation Year"
            className="input"
          />
        </label>

        <label className="full-width">
          Skills
          <input
            name="skills"
            value={profile.skills}
            onChange={handleChange}
            placeholder="Skills (comma separated)"
            className="input full-width"
          />
        </label>

        <label className="full-width">
          Certifications
          <input
            name="certifications"
            value={profile.certifications}
            onChange={handleChange}
            placeholder="Certifications (comma separated)"
            className="input full-width"
          />
        </label>

        <label className="full-width">
          Notable Projects
          <textarea
            name="projects"
            value={profile.projects}
            onChange={handleChange}
            placeholder="Notable Projects"
            className="textarea full-width"
          />
        </label>

        <label className="full-width">
          Learning/Career Goals
          <textarea
            name="goals"
            value={profile.goals}
            onChange={handleChange}
            placeholder="Learning/Career Goals"
            className="textarea full-width"
          />
        </label>

      </div>
      <button onClick={handleSave} className="save-button">
        Save Profile
      </button>
    </div>
  );
}
