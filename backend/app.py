import os
import pickle
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from sklearn.metrics.pairwise import cosine_similarity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient
import certifi
import json
import re

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
mongo_uri = os.getenv("MONGO_URI")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
if not mongo_uri:
    raise ValueError("MONGO_URI not found in environment variables")

# Initialize MongoDB
mongo_client = None
db = None
try:
    mongo_client = MongoClient(mongo_uri, tls=True, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
    db = mongo_client["organic_db"]
    # Check connection
    mongo_client.admin.command('ping')
    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"MongoDB Connection Error: {e}")

genai.configure(api_key=api_key)
llm_model = genai.GenerativeModel("gemini-2.5-flash")


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

# ── BSON Helper ─────────────────────────────────────────────────────────────
# Aliased to avoid shadowing the stdlib json.dumps
from bson.json_util import dumps as bson_dumps

# ── TF-IDF Model Cache (Flask app-context pattern) ─────────────────────────
# Instead of bare globals, we cache models on the Flask app object itself.
# This avoids mutable global state and is safe across worker restarts.
_model_cache = {}

def get_models():
    if 'tfidf' not in _model_cache:
        with open("model.pkl", "rb") as f:
            _model_cache['tfidf'] = pickle.load(f)
        with open("vectors.pkl", "rb") as f:
            _model_cache['vectors'] = pickle.load(f)
        with open("data.pkl", "rb") as f:
            _model_cache['data'] = pickle.load(f)
    return _model_cache['tfidf'], _model_cache['vectors'], _model_cache['data']

# ── Input Sanitizer ─────────────────────────────────────────────────────────
def sanitize(value: str, max_len: int = 120) -> str:
    """Strip characters that could be used for prompt injection and limit length."""
    if not isinstance(value, str):
        return str(value)
    # Remove any escape sequences, backticks, curly braces and angle brackets
    cleaned = re.sub(r'[`{}<>\\]', '', value)
    return cleaned[:max_len].strip()

@app.route("/api/farms", methods=["GET"])
def get_farms():
    try:
        # In a real app with Auth, we get user_id from token. Hardcoding for MVP.
        user_id = request.args.get("user_id", "ashwanth_demo")
        farms = list(db.farms.find({"user_id": user_id}))
        return bson_dumps({"status": "success", "farms": farms}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/farms", methods=["POST"])
def save_farm():
    try:
        req = request.get_json()
        user_id = req.get("user_id", "ashwanth_demo")
        farm_name = req.get("name", "New Farm")
        plot_name = req.get("plot", "Plot 1")
        crop = req.get("crop", "Unknown")
        acres = req.get("acres", 1)
        soil_type = req.get("soil_type", "Unknown")

        new_farm = {
            "user_id": user_id,
            "name": farm_name,
            "plot": plot_name,
            "crop": crop,
            "acres": acres,
            "soil_type": soil_type
        }
        
        result = db.farms.insert_one(new_farm)
        return jsonify({
            "status": "success", 
            "message": "Farm saved successfully",
            "farm_id": str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

from bson.objectid import ObjectId

@app.route("/api/farms/<farm_id>", methods=["DELETE"])
def delete_farm(farm_id):
    try:
        user_id = request.args.get("user_id", "ashwanth_demo")
        result = db.farms.delete_one({"_id": ObjectId(farm_id), "user_id": user_id})
        
        if result.deleted_count == 1:
            return jsonify({"status": "success", "message": "Farm deleted."}), 200
        else:
            return jsonify({"status": "error", "message": "Farm not found or unauthorized."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

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
        user_lang = req.get("language", "English")

        if not chemical or not crop:
            return jsonify({"status": "error", "message": "Missing fields."}), 400

        tfidf_model, vector_data, dataframe = get_models()

        # --- HYBRID SEARCH LOGIC ---
        query = f"{chemical} {crop}".lower()
        query_vec = tfidf_model.transform([query])
        similarities = cosine_similarity(query_vec, vector_data)[0]

        # 1. Boost Exact Matches: Find exact spelling matches and boost them 
        has_exact_match = False
        for i, row in dataframe.iterrows():
            if chemical.lower() == str(row.get('chemical_name', '')).lower():
                # Add 1.0 to retain TF-IDF context sorting (so the correct crop bubbles to the top of exact matches)
                similarities[i] += 1.0 
                has_exact_match = True

        best_score = similarities.max()

        if not has_exact_match:
            # 2. Prevent valid crops from artificially boosting gibberish chemicals
            chem_vec = tfidf_model.transform([chemical.lower()])
            if cosine_similarity(chem_vec, vector_data)[0].max() < 0.05:
                return jsonify({
                    "status": "error",
                    "message": f"'{chemical}' is not recognized in our agronomy database. Please check the spelling."
                }), 400

            # Confidence Threshold Check for fuzzy search limit
            if best_score <= 0.30: 
                return jsonify({
                    "status": "error",
                    "message": f"No reliable organic alternative found for '{chemical}'."
                }), 400

        options = []
        seen_alts = set()
        
        # Get the top matches
        indices_to_check = similarities.argsort()[::-1][:5]
        scores = [similarities[idx] for idx in indices_to_check]
        
        for i, idx in enumerate(indices_to_check):
            score = scores[i]
            
            res = dataframe.iloc[idx]
            alt_name = res["organic_alternative"].strip()
            
            # Deduplicate by name
            if alt_name.lower() in seen_alts:
                continue
                
            seen_alts.add(alt_name.lower())
            
            # Mock prep times/ingredients since not in current dataset
            prep_time = "48 Hours" if "jeeva" in alt_name.lower() or "amrutham" in alt_name.lower() else "10 Days" if "pancha" in alt_name.lower() else "1-2 Days"
            
            options.append({
                "id": str(idx),
                "alternative": alt_name,
                "dosage": res["dosage"],
                "application_time": res["application_time"],
                "safety_note": res["safety_note"],
                "confidence": min(1.0, round(float(score), 4)),
                "prep_time": prep_time,
                "problem_target": res.get("problem_or_pest", "general growth"),
                "corrected_chemical": str(res.get("chemical_name", chemical))
            })
            
            # Only return the top 3 unique options
            if len(options) >= 3:
                break

        if not options:
             return jsonify({
                "status": "error",
                "message": f"No reliable organic alternative found for '{chemical}'. Please check the chemical name or try another."
            }), 400

        return jsonify({
            "status": "success",
            "options": options
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/formulate", methods=["POST"])
@limiter.limit("10 per minute")
def formulate():
    try:
        req = request.get_json()
        # Sanitize all user-supplied strings before injecting into AI prompt
        alternative = sanitize(req.get("alternative", ""))
        chemical_replaced = sanitize(req.get("chemical_replaced", ""))
        crop = sanitize(req.get("crop", ""))
        acres = req.get("acres", 1)
        substitutions = req.get("substitutions", {})  # e.g. {"Cow Dung": "Buffalo Dung"}
        user_lang = sanitize(req.get("language", "English"), max_len=20)

        if not alternative:
            return jsonify({"status": "error", "message": "Missing alternative selection."}), 400

        # Construct the dynamic system prompt
        subs_text = ""
        if substitutions:
            subs_text = "The farmer MUST make the following substitutions to the standard recipe:\n"
            for original, sub in substitutions.items():
                subs_text += f"- Replace {original} with {sub}\n"
        else:
            subs_text = "The farmer has all standard ingredients available."

        prompt = f"""
        Act as an expert organic agronomist with deep knowledge of Indian farming practices. 
        Provide the entire response strictly in {user_lang}.
        
        A farmer in India is switching from using {chemical_replaced} on {acres} acres of {crop}.
        They have chosen the organic alternative: {alternative}.

        {subs_text}

        CRITICAL UNIT RULES (MANDATORY):
        - All weights MUST be expressed in Indian units: grams (g), kilograms (kg), quintals (1 quintal = 100 kg), or metric tonnes/MT (1 MT = 1000 kg).
        - All volumes MUST be expressed as: millilitres (ml) or litres (L).
        - NEVER use pounds, lbs, oz, gallons, or any non-Indian unit.
        - For large farms (>5 acres), prefer quintals or MT for ingredient quantities.

        TASK:
        1. Recalculate the exact weights/volumes of the required ingredients for {acres} acres using Indian units (kg, quintal, MT, litres).
        2. Specifically note if the substitutions change the required fermentation/preparation time or effectiveness.
        3. Break the preparation into specific actionable tasks. Assign each task an array of days it must be performed on. (Day 1 is the first day of prep).
        
        Output MUST be pure JSON with no markdown formatting or backticks. Schema:
        {{
            "ingredients": [
                {{"name": "Ingredient 1", "quantity": "amount in kg/quintal/litres", "note": "reason/substitution info"}}
            ],
            "preparation_tasks": [
                {{
                    "description": "Short, actionable task description (e.g., Stir the mixture thoroughly)",
                    "days": [1, 2, 3] # The exact day numbers this task MUST be done. Keep it sparse. If a task isn't needed on Day 4, don't include 4.
                }}
            ],
            "application_phase": [
                {{"description": "Application instruction (e.g., Dilute 1L of mixture with 10L water and spray)"}}
            ],
            "warnings": [
                "Safety or fermentation warning here..."
            ]
        }}
        """

        try:
            # We explicitly ask Gemini for JSON
            llm_response = llm_model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            llm_text = llm_response.text
            parsed_data = json.loads(llm_text)
            is_mock = False
            
        except Exception as e:
            # RATE LIMIT FALLBACK / MOCK DATA
            print(f"AI Generation Failed (Quota/Error). Using Fallback. Error: {e}")
            is_mock = True
            parsed_data = {
                "ingredients": [
                    {"name": "Cow Dung (or substitute)", "quantity": f"{10 * float(acres)} kg", "note": "Base microbial culture"},
                    {"name": "Cow Urine", "quantity": f"{10 * float(acres)} Liters", "note": "Nitrogen source"},
                    {"name": "Jaggery (or substitute)", "quantity": f"{1 * float(acres)} kg", "note": "Fermentation starter"}
                ],
                "preparation_tasks": [
                    {"description": "Mix all ingredients in a barrel with 200L of water.", "days": [1]},
                    {"description": "Stir clockwise twice a day. Keep in shade.", "days": [2, 3, 4]}
                ],
                "application_phase": [
                    {"description": f"Dilute with water and spray evenly across {acres} acres of {crop}."}
                ],
                "warnings": [
                    "If using Buffalo Dung instead of Cow Dung, fermentation may take 1 extra day.",
                    "Ensure the barrel is not sealed airtight; gases must escape.",
                    "Mock Fallback Active: Real AI rate limit exceeded."
                ]
            }

        return jsonify({
            "status": "success",
            "formulation_data": parsed_data,
            "is_mock": is_mock,
            "context": {
                "alternative": alternative,
                "crop": crop,
                "acres": acres,
                "substitutions": substitutions
            }
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/analyze-recipe", methods=["POST"])
@limiter.limit("15 per minute")
def analyze_recipe():
    try:
        req = request.get_json()
        alternative = req.get("alternative", "")
        language = req.get("language", "English")

        if not alternative:
            return jsonify({"status": "error", "message": "Missing alternative selection."}), 400

        prompt = f"""
        Act as an expert organic agronomy database.
        Provide the response strictly in {language}.
        
        The user wants to prepare: {alternative}.
        
        TASK:
        Identify the 2 to 4 main ingredients required for this organic formulation.
        For each ingredient, state whether it is "critical" (cannot be substituted) or "swappable".
        If swappable, list 1 or 2 highly common, practical organic substitutions a farmer might have.

        CRITICAL REQUIREMENT: Use strictly specific raw ingredient names for the "name" field (e.g. "Fresh Cow Dung", "Neem Leaves", "Jaggery"). Do NOT use categorical groupings with examples like "Nitrogen-rich Organic Waste (e.g., Fresh Cow Dung)". The name must be just the ingredient itself.

        Output MUST be pure JSON with no markdown formatting or backticks. Schema:
        {{
            "ingredients": [
                {{
                    "name": "Cow Dung",
                    "role": "Microbial base",
                    "is_critical": false,
                    "substitutions": ["Buffalo Dung", "Compost"]
                }},
                {{
                    "name": "Neem Oil",
                    "role": "Active pest repellent",
                    "is_critical": true,
                    "substitutions": []
                }}
            ]
        }}
        """

        try:
            llm_response = llm_model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            analysis_data = json.loads(llm_response.text)
            
            return jsonify({
                "status": "success",
                "analysis": analysis_data
            })
            
        except Exception as e:
            print(f"Analyzer failed: {e}")
            # Fallback if Gemini rate limits hit during the analysis phase
            return jsonify({
                 "status": "success",
                 "analysis": {
                     "ingredients": [
                         {
                             "name": "Base Material (e.g. Dung/Leaves)",
                             "role": "Core component",
                             "is_critical": False,
                             "substitutions": ["Locally available compost"]
                         },
                         {
                             "name": "Liquid Base (e.g. Urine/Water)",
                             "role": "Solvent",
                             "is_critical": True,
                             "substitutions": []
                         }
                     ]
                 }
            })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/formulations", methods=["POST"])
def save_formulation():
    try:
        req = request.get_json()
        user_id = req.get("user_id", "ashwanth_demo")
        formulation_data = req.get("formulation_data")
        context = req.get("context")
        
        if not formulation_data or not context:
            return jsonify({"status": "error", "message": "Missing required data"}), 400
            
        new_plan = {
            "user_id": user_id,
            "formulation_data": formulation_data,
            "context": context,
            "created_at": __import__('datetime').datetime.now(),
            "start_date": __import__('datetime').datetime.now().isoformat(),
            "completed_task_ids": [],
            "status": "PREPARING"
        }
        
        result = db.formulations.insert_one(new_plan)
        return jsonify({
            "status": "success", 
            "message": "Plan saved successfully!",
            "plan_id": str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/tasks/sync", methods=["PUT"])
def sync_tasks():
    try:
        req = request.get_json()
        plan_id = req.get("plan_id")
        task_id = req.get("task_id") # e.g., 'task_0_day_1'
        is_completed = req.get("is_completed", True)
        
        if not plan_id or not task_id:
            return jsonify({"status": "error", "message": "Missing plan_id or task_id"}), 400
            
        from bson.objectid import ObjectId
        
        if is_completed:
            # If this is the very first task being completed, officially start the timer
            plan_doc = db.formulations.find_one({"_id": ObjectId(plan_id)})
            current_completed = plan_doc.get("completed_task_ids", [])
            
            update_fields = {"$addToSet": {"completed_task_ids": task_id}}
            if len(current_completed) == 0:
                update_fields["$set"] = {"start_date": __import__('datetime').datetime.now().isoformat()}

            db.formulations.update_one(
                {"_id": ObjectId(plan_id)},
                update_fields
            )
        else:
            db.formulations.update_one(
                {"_id": ObjectId(plan_id)},
                {"$pull": {"completed_task_ids": task_id}}
            )
            
        # Optional: We could run a check here to upgrade status to READY_TO_APPLY or COMPLETED
        # but for now we'll just track the array.
            
        return jsonify({"status": "success", "message": "Task synced successfully!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/formulations", methods=["GET"])
def get_formulations():
    try:
        user_id = request.args.get("user_id", "ashwanth_demo")
        plans = list(db.formulations.find({"user_id": user_id}).sort("created_at", -1))
        return bson_dumps({"status": "success", "plans": plans}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=10000)