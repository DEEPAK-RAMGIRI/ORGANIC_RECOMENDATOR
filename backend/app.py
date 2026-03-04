import os
import pickle
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from sklearn.metrics.pairwise import cosine_similarity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=api_key)
llm_model = genai.GenerativeModel("gemini-3-flash-preview")


app = Flask(__name__)

# Allow multiple origins for Local and Production
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "https://organicbuddy.me",
            "https://www.organicbuddy.me"
        ]
    }
})

limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["20 per minute"]
)

tfidf = None
vectors = None
data = None

def load_models():
    with open("model.pkl", "rb") as f:
        tfidf_model = pickle.load(f)
    with open("vectors.pkl", "rb") as f:
        vector_data = pickle.load(f)
    with open("data.pkl", "rb") as f:
        dataframe = pickle.load(f)
    return tfidf_model, vector_data, dataframe

def get_models():
    global tfidf, vectors, data
    if tfidf is None:
        tfidf, vectors, data = load_models()
    return tfidf, vectors, data

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Backend Running"})

@app.route("/recommend", methods=["POST"])
@limiter.limit("10 per minute")
def recommend():
    try:
        req = request.get_json()
        chemical = req.get("chemical", "").strip()
        crop = req.get("crop", "").strip()
        acres = req.get("acres", 1)
        user_lang = req.get("language", "English") # Correctly getting lang from React

        if not chemical or not crop:
            return jsonify({"status": "error", "message": "Missing fields."}), 400

        tfidf_model, vector_data, dataframe = get_models()

        # --- HYBRID SEARCH LOGIC ---
        # 1. First, try an Exact Match to prevent "DAP" being confused with "Urea"
        best_idx = -1
        best_score = 0.0
        
        # Look for the chemical name specifically in your data
        # Assuming your dataframe has a column 'chemical_name' or similar
        for i, row in dataframe.iterrows():
            if chemical.lower() == str(row.get('chemical_name', '')).lower():
                best_idx = i
                best_score = 1.0 # Force 100% confidence for exact match
                break

        # 2. If no exact match, fall back to TF-IDF Similarity (Fuzzy Search)
        if best_idx == -1:
            query = f"{chemical} {crop}".lower()
            query_vec = tfidf_model.transform([query])
            similarity = cosine_similarity(query_vec, vector_data)
            best_idx = similarity.argmax()
            best_score = similarity.max()

        # Confidence Threshold Check
        if best_score <= 0.30: # Lowered slightly to allow for minor typos
            return jsonify({
                "status": "error",
                "message": f"No reliable organic alternative found for '{chemical}'."
            }), 400

        res = dataframe.iloc[best_idx]

        # Optimized Prompt for Dashboard Checklist & Multilingual support
        prompt = f"""
        Act as a friendly agricultural expert. 
        Provide the entire response strictly in {user_lang}. If Telugu, use Telugu script.

        A farmer uses {chemical} on {crop} for {res.get('problem_or_pest', 'general growth')}.
        The organic alternative is {res['organic_alternative']}.

        - Explain why {res['organic_alternative']} is cheaper for the farmer.
        - Provide a day-by-day 5-day roadmap for applying it on {acres} acres:
        - Day 1: [Action]
        - Day 2: [Action]
        - Day 3: [Action]
        - Day 4: [Action]
        - Day 5: [Action]
        - Reminder: Apply this during {res['application_time']}.
        - Explain why this is better for soil health.

        Provide the response ONLY in bullet points using '-' followed by a space.
        Do not use bold, headers, or asterisks (**).
        """

        try:
            llm_response = llm_model.generate_content(prompt)
            llm_text = llm_response.text
        except Exception as e:
            llm_text = f"AI Error: {str(e)}"

        return jsonify({
            "status": "success",
            "alternative": res["organic_alternative"],
            "dosage": res["dosage"],
            "application_time": res["application_time"],
            "safety_note": res["safety_note"],
            "llm_advice": llm_text,
            "confidence": round(float(best_score), 4)
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=10000)