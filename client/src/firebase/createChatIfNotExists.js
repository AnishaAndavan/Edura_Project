import { getDatabase, ref, get, set } from "firebase/database";

export const createChatIfNotExists = async (mentorId, studentId) => {
  const db = getDatabase();
  const chatId = `${mentorId}_${studentId}`;
  const chatRef = ref(db, `chats/${chatId}`);

  try {
    const snapshot = await get(chatRef);

    if (!snapshot.exists()) {
      await set(chatRef, {
        participants: {
          [mentorId]: true,
          [studentId]: true,
        },
        messages: {} // empty message list to start with
      });
      console.log("✅ Chat created");
    } else {
      console.log("ℹ️ Chat already exists");
    }

    return chatId;
  } catch (error) {
    console.error("❌ Error creating chat:", error);
    return null;
  }
};
