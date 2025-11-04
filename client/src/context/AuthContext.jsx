// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Full user object including Firestore fields
  const [role, setRole] = useState(null);       // User role: student, mentor, admin
  const [loading, setLoading] = useState(true); // Wait until auth state is resolved

  // ----------------- LOGOUT FUNCTION -----------------
  const logout = async () => {
    if (user?.uid) {
      try {
        // Set user offline before logging out
        await updateDoc(doc(db, "users", user.uid), {
          online: false,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error updating last seen before logout:", e);
      }
    }
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // Get Firestore user document
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        let userData = {
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || "", // fallback to Firebase Auth displayName
        };

        if (docSnap.exists()) {
          const firestoreData = docSnap.data();
          userData = { ...userData, ...firestoreData }; // Merge with Firestore data
          setRole(firestoreData.role || null);
        } else {
          setRole(null);
        }

        setUser(userData);

        // Mark user online
        await updateDoc(doc(db, "users", currentUser.uid), { online: true });

        // Handle tab close or page hide
        const handleOffline = async () => {
          try {
            await updateDoc(doc(db, "users", currentUser.uid), {
              online: false,
              lastSeen: serverTimestamp(),
            });
          } catch (err) {
            console.error("Error updating last seen:", err);
          }
        };

        window.addEventListener("beforeunload", handleOffline);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") handleOffline();
        });

        return () => {
          window.removeEventListener("beforeunload", handleOffline);
        };

      } catch (err) {
        console.error("Error fetching user data:", err);
        setUser({ uid: currentUser.uid, email: currentUser.email, name: "" });
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);
