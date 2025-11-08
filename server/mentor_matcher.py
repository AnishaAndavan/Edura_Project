# server/mentor_matcher.py

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from sentence_transformers import SentenceTransformer, util
import numpy as np
import logging

# ------------------- Firebase Setup -------------------
if not firebase_admin._apps:
    if os.environ.get("FIREBASE_CREDENTIALS"):
        # Load credentials from Render environment variable
        firebase_creds = json.loads(os.environ["FIREBASE_CREDENTIALS"])
        cred = credentials.Certificate(firebase_creds)
    else:
        # Fallback to local serviceAccountKey.json file
        cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ------------------- Model Setup -------------------
model = SentenceTransformer('all-MiniLM-L6-v2')

# ------------------- Logging -------------------
logging.basicConfig(level=logging.DEBUG)

# ------------------- Helper Functions -------------------
def get_all_mentors():
    """
    Fetch all mentors from Firestore who have 'expertise' field.
    """
    mentors_ref = db.collection("users").where("role", "==", "mentor").stream()
    mentors = []
    for doc in mentors_ref:
        data = doc.to_dict()
        if "expertise" in data and data["expertise"].strip():
            mentors.append({
                "mentorId": data.get("uid", doc.id),
                "mentorName": data.get("username", "Unnamed Mentor"),
                "expertise": data["expertise"]
            })
    return mentors


def match_student_to_mentors(student_interest, top_k=5):
    """
    Matches a student to top K mentors based on expertise similarity.
    Returns list of dicts: [{mentorId, mentorName, cosine_score, euclidean_distance}]
    """
    try:
        logging.debug(f"[DEBUG] Matching student interest: {student_interest}")

        student_embedding = model.encode(student_interest, convert_to_tensor=True)
        mentors = get_all_mentors()

        if not mentors:
            logging.warning("No mentors found in database.")
            return []

        matches = []
        for mentor in mentors:
            mentor_embedding = model.encode(mentor["expertise"], convert_to_tensor=True)
            cosine_score = float(util.cos_sim(student_embedding, mentor_embedding).item())
            euclidean_distance = float(np.linalg.norm(student_embedding.cpu().numpy() - mentor_embedding.cpu().numpy()))

            matches.append({
                "mentorId": mentor["mentorId"],
                "mentorName": mentor["mentorName"],
                "cosine_score": round(cosine_score, 2),
                "euclidean_distance": round(euclidean_distance, 2)
            })

        # Sort by cosine similarity descending
        matches.sort(key=lambda x: x["cosine_score"], reverse=True)
        logging.debug(f"[DEBUG] Matches computed: {matches[:top_k]}")

        return matches[:top_k]

    except Exception as e:
        logging.error(f"[ERROR] Matching failed: {e}")
        return []


def save_final_match(student_id, student_name, mentor_id, mentor_name, score):
    """
    Saves the finalized match to Firestore under 'matches' collection.
    """
    try:
        match_ref = db.collection("matches").document(student_id)  # use studentId as doc id
        match_data = {
            "studentId": student_id,
            "studentName": student_name,
            "mentorId": mentor_id,
            "mentorName": mentor_name,
            "score": float(score),
            "status": "pending"
        }
        match_ref.set(match_data)
        logging.info(f"[INFO] Saved match {student_name} -> {mentor_name}")
        return match_ref.id
    except Exception as e:
        logging.error(f"[ERROR] Saving match failed: {e}")
        return None
