import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import './AdminProfile.css'; // Reuse profile styles
import './AdminHome.css';    // For popup-specific styles

export default function AdminHome() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (!user || role !== 'admin') navigate('/');
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const fetchedUsers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    setUsers(fetchedUsers);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newAdminEmail,
        newAdminPassword
      );

      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newAdminEmail,
        role: 'admin',
        username: newAdminEmail.split('@')[0]
      });

      alert('Admin created successfully!');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setShowCreateForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Error: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Error: ' + err.message);
      }
    }
  };

  const filteredUsers =
    roleFilter === 'all'
      ? users
      : users.filter((u) => u.role === roleFilter);

  return (
    <div className="admin-profile-container">
      <h2 className="admin-profile-heading">Admin Dashboard</h2>

      <div className="controls">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="mentor">Mentor</option>
          <option value="student">Student</option>
        </select>
        <button onClick={() => setShowCreateForm(true)}>Create Admin</button>
      </div>

      {showCreateForm && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3>Create New Admin</h3>
            <form onSubmit={handleCreateAdmin} className="admin-profile-grid">
              <input
                type="email"
                placeholder="Admin Email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
                className="input"
              />
              <input
                type="password"
                placeholder="Password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
                className="input"
              />
              <div className="form-buttons">
                <button type="submit" className="save-button" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-profile-grid">
        {filteredUsers.map((u) => (
          <div key={u.id} className="input user-card">
            <p><strong>Username:</strong> {u.username}</p>
            <p><strong>Email:</strong> {u.email}</p>
            <p><strong>Role:</strong> {u.role}</p>
            <div className="card-buttons">
              <button onClick={() => alert(JSON.stringify(u, null, 2))}>
                View
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDelete(u.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
