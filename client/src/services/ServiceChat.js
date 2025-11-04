// client/src/services/ServiceChat.js
import { rtdb } from "./firebase";
import {
  ref,
  push,
  onValue,
  query,
  orderByChild,
  set,
  //serverTimestamp,
  update,
  get,
} from "firebase/database";

/**
 * Creates or retrieves a unique chat room between a student & mentor
 * Always consistent by sorting IDs (so no duplicate rooms)
 */
export const createOrGetChatRoom = (studentId, mentorId) => {
  const roomId =
    studentId < mentorId
      ? `${studentId}_${mentorId}`
      : `${mentorId}_${studentId}`;
  return roomId; // Always the same for same student–mentor
};

/**
 * Update user online/offline status in Realtime DB
 */
export const setUserOnlineStatus = (uid, isOnline) => {
  try {
    const userStatusRef = ref(rtdb, `status/${uid}`);
    set(userStatusRef, {
      online: isOnline,
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error("Error updating user status:", error);
  }
};

/**
 * Listen for a user's online status (real-time)
 */
export const listenUserOnlineStatus = (uid, callback) => {
  try {
    const userStatusRef = ref(rtdb, `status/${uid}`);
    return onValue(userStatusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({ online: false });
      }
    });
  } catch (error) {
    console.error("Error listening to user status:", error);
  }
};

/**
 * Send a message to a chat room
 * Accepts either a string (plain text) or an object { type, text?, url? }
 */
export const sendMessage = async (roomId, senderId, message) => {
  try {
    const chatRef = ref(rtdb, `chats/${roomId}`);

    const payload =
      typeof message === "string"
        ? { type: "text", text: message }
        : { ...message };

    await push(chatRef, {
      senderId,
      timestamp: Date.now(),
      seen: false, // <-- new: track seen state
      ...payload,
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

/**
 * Mark all messages in a room as seen by a given user
 */
export const markMessagesAsSeen = async (roomId, userId) => {
  try {
    const chatRef = ref(rtdb, `chats/${roomId}`);
    const snapshot = await get(chatRef);

    if (snapshot.exists()) {
      const updates = {};
      snapshot.forEach((child) => {
        const msg = child.val();
        if (msg.senderId !== userId && !msg.seen) {
          updates[`${child.key}/seen`] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(chatRef, updates);
      }
    }
  } catch (error) {
    console.error("Error marking messages as seen:", error);
  }
};

/**
 * Listen for new messages in a chat room (real-time)
 */
export const listenForMessages = (roomId, callback) => {
  try {
    const chatRef = query(ref(rtdb, `chats/${roomId}`), orderByChild("timestamp"));
    return onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messages = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        callback(messages);
      } else {
        callback([]); // No messages yet
      }
    });
  } catch (error) {
    console.error("Error listening for messages:", error);
  }
};
