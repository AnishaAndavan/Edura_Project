import os
import re
import json
import requests
import logging
import cloudinary
import cloudinary.uploader
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from dotenv import load_dotenv

# -------------------- LOAD ENV --------------------
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# -------------------- FLASK SETUP --------------------
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# -------------------- FIREBASE --------------------
cred_path = "serviceAccountKey.json"
cred = credentials.Certificate(cred_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# -------------------- LOGGING --------------------
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

print("✅ Flask server starting...")
print("🔑 OpenRouter Key Loaded:", bool(OPENROUTER_API_KEY))

# -------------------- CLOUDINARY --------------------
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

# -------------------- IMPORT MATCHING HELPERS --------------------
from mentor_matcher import match_student_to_mentors, save_final_match

# ==============================================================
# 🌐 BASIC ROUTE
# ==============================================================
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "ok", "message": "Full backend running"})

# ==============================================================
# 🧠 QUIZ GENERATION ENDPOINT
# ==============================================================
@app.route('/api/generate_quiz', methods=['POST'])
def generate_quiz():
    try:
        data = request.json
        prompt = data.get("prompt", "")
        difficulty = data.get("difficulty", "medium")
        num_questions = data.get("numQuestions", 5)

        print(f"📌 Request received: prompt={prompt}, difficulty={difficulty}, num_questions={num_questions}")

        quiz_prompt = f"""
        Generate {num_questions} multiple-choice questions on {prompt} 
        with {difficulty} difficulty. 
        Return the result STRICTLY in JSON format like this:

        {{
          "quiz": [
            {{"question": "Question text?", "options": ["A) option1", "B) option2", "C) option3", "D) option4"], "answer": "A"}}
          ]
        }}
        """

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "mistralai/mistral-7b-instruct:free",
            "messages": [
                {"role": "system", "content": "You are a quiz generator."},
                {"role": "user", "content": quiz_prompt}
            ]
        }

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        print("📦 Model response:", content)

        # Extract JSON safely
        match = re.search(r"```json(.*?)```", content, re.DOTALL | re.IGNORECASE)
        if match:
            json_str = match.group(1).strip()
        else:
            start = content.find("{")
            end = content.rfind("}")
            if start == -1 or end == -1:
                return jsonify({"error": "No valid JSON found in model response"}), 500
            json_str = content[start:end+1]

        quiz_data = json.loads(json_str)
        if "quiz" not in quiz_data or not quiz_data["quiz"]:
            return jsonify({"error": "No quiz questions generated"}), 500

        for q in quiz_data["quiz"]:
            if "answer" in q:
                q["correctAnswer"] = q["answer"]

        return jsonify(quiz_data)
    except Exception as e:
        logger.exception("❌ Exception in /api/generate_quiz")
        return jsonify({"error": str(e)}), 500

# ==============================================================
# 💬 CHATBOT ENDPOINT
# ==============================================================
@app.route("/api/chatbot", methods=["POST"])
def chatbot():
    try:
        data = request.get_json()
        user_message = data.get("message", "")

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "mistralai/mistral-7b-instruct:free",
            "messages": [
                {"role": "system", "content": "You are a helpful AI tutor for students."},
                {"role": "user", "content": user_message}
            ]
        }

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        bot_reply = response.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": bot_reply})
    except Exception as e:
        logger.exception("Error in /api/chatbot")
        return jsonify({"error": str(e)}), 500

# ==============================================================
# 👩‍🏫 MENTOR MATCHING ROUTES
# ==============================================================
@app.route("/match", methods=["POST"])
@cross_origin()
def match_route():
    try:
        data = request.get_json()
        student_interest = data.get("interest", "").strip()
        student_id = data.get("studentId")
        student_name = data.get("studentName", "Unnamed Student")

        if not student_interest or not student_id:
            return jsonify({"matches": [], "message": "Missing interest or studentId"}), 400

        logger.debug("Match request for student_id=%s interest=%s", student_id, student_interest)
        matches = match_student_to_mentors(student_interest, top_k=5) or []
        return jsonify({"matches": matches})
    except Exception as e:
        logger.exception("Error in /match")
        return jsonify({"matches": [], "error": str(e)}), 500

@app.route("/finalize_match", methods=["POST"])
@cross_origin()
def finalize_match():
    try:
        data = request.get_json()
        student_id = data.get("studentId")
        student_name = data.get("studentName")
        mentor_id = data.get("mentorId")
        mentor_name = data.get("mentorName")
        score = data.get("score", 0)

        if not all([student_id, mentor_id]):
            return jsonify({"message": "Missing studentId or mentorId"}), 400

        logger.debug("Finalizing match: %s -> %s (score=%s)", student_id, mentor_id, score)
        match_id = save_final_match(student_id, student_name, mentor_id, mentor_name, score)
        if match_id:
            return jsonify({"matchId": match_id})
        return jsonify({"message": "Failed to save match"}), 500
    except Exception as e:
        logger.exception("Error in /finalize_match")
        return jsonify({"message": str(e)}), 500

@app.route("/get_active_match/<student_id>", methods=["GET"])
@cross_origin()
def get_active_match(student_id):
    try:
        match_doc = db.collection("matches").document(student_id).get()
        if match_doc.exists:
            return jsonify({"active": True, "match": match_doc.to_dict()})
        return jsonify({"active": False})
    except Exception as e:
        logger.exception("Error in /get_active_match")
        return jsonify({"active": False, "error": str(e)}), 500

# ==============================================================
# ❌ CANCEL / STOP REQUESTS
# ==============================================================
@app.route("/cancel_request", methods=["POST"])
@cross_origin()
def cancel_request():
    try:
        data = request.get_json()
        student_id = data.get("studentId")
        if not student_id:
            return jsonify({"success": False, "message": "Missing studentId"}), 400

        ref = db.collection("matches").document(student_id)
        if ref.get().exists:
            ref.delete()
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "No active match"})
    except Exception as e:
        logger.exception("Error in /cancel_request")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/request_stop", methods=["POST"])
@cross_origin()
def request_stop():
    try:
        data = request.get_json()
        student_id = data.get("studentId")
        if not student_id:
            return jsonify({"success": False, "message": "Missing studentId"}), 400

        ref = db.collection("matches").document(student_id)
        doc = ref.get()
        if doc.exists and doc.to_dict().get("status") == "accepted":
            ref.update({"stopRequest": True, "status": "stop_requested"})
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "No active course"})
    except Exception as e:
        logger.exception("Error in /request_stop")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/stop_course", methods=["POST"])
@cross_origin()
def stop_course():
    try:
        data = request.get_json()
        student_id = data.get("studentId")
        mentor_id = data.get("mentorId")
        if not student_id or not mentor_id:
            return jsonify({"success": False, "message": "Missing IDs"}), 400

        ref = db.collection("matches").document(student_id)
        if ref.get().exists:
            ref.update({"status": "stopped", "stopRequest": False})
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "No active match"})
    except Exception as e:
        logger.exception("Error in /stop_course")
        return jsonify({"success": False, "message": str(e)}), 500

# ==============================================================
# ☁️ CLOUDINARY FILE UPLOAD
# ==============================================================
@app.route('/api/upload_cloudinary', methods=['POST'])
@cross_origin()
def upload_to_cloudinary():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    chat_room_id = request.form.get('chatRoomId', 'default')

    try:
        resource_type = "image" if file.content_type.startswith("image/") else "raw"
        upload_result = cloudinary.uploader.upload(
            file,
            resource_type=resource_type,
            folder=f"chat_media/{chat_room_id}",
            use_filename=True,
            unique_filename=True,
            overwrite=False
        )
        return jsonify({
            "secure_url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id"),
            "resource_type": upload_result.get("resource_type"),
        })
    except Exception as e:
        logger.exception("Error in /api/upload_cloudinary")
        return jsonify({"error": str(e)}), 500

# ==============================================================
# 🚀 RUN SERVER
# ==============================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
