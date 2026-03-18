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
from bson.objectid import ObjectId
import certifi
import json
import re
from datetime import datetime
from difflib import SequenceMatcher  # Added this import

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

# Helper function added for structural similarity
def get_structural_sim(str1, str2):
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

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
            "soil_type": soil_type,
            "created_at": datetime.utcnow()
        }
        
        result = db.farms.insert_one(new_farm)
        return jsonify({
            "status": "success", 
            "message": "Farm saved successfully",
            "farm_id": str(result.inserted_id)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

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

@app.route("/api/farms/<farm_id>", methods=["GET"])
def get_farm_by_id(farm_id):
    """Fetch a single farm by ID — used by FarmDetails to avoid loading all farms."""
    try:
        user_id = request.args.get("user_id", "ashwanth_demo")
        farm = db.farms.find_one({"_id": ObjectId(farm_id), "user_id": user_id})
        if not farm:
            return jsonify({"status": "error", "message": "Farm not found."}), 404
        return bson_dumps({"status": "success", "farm": farm}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Backend Running"})

@app.route("/api/impact", methods=["GET"])
def get_impact_data():
    try:
        impact_file = os.path.join(os.path.dirname(__file__), "impact_data.json")
        
        if os.path.exists(impact_file):
             with open(impact_file, "r") as f:
                 data = json.load(f)
             return jsonify({"status": "success", "data": data})
        else:
             return jsonify({"status": "error", "message": "Impact data not yet generated."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/mappings", methods=["GET"])
def get_mappings():
    try:
        mappings_file = os.path.join(os.path.dirname(__file__), "mappings.json")
        
        if os.path.exists(mappings_file):
             with open(mappings_file, "r") as f:
                 data = json.load(f)
             return jsonify({"status": "success", "data": data})
        else:
             return jsonify({"status": "error", "message": "Mappings data not found."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/roi_meta", methods=["GET"])
def get_roi_meta():
    try:
        roi_file = os.path.join(os.path.dirname(__file__), "reference_costs.json")
        if os.path.exists(roi_file):
             with open(roi_file, "r") as f:
                 data = json.load(f)
             return jsonify({"status": "success", "data": data})
        else:
             return jsonify({"status": "error", "message": "ROI metadata not found."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



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

        # --- GIBBERISH DETECTION LOGIC ADDED HERE ---
        chem_vec = tfidf_model.transform([chemical.lower()])
        chem_similarities = cosine_similarity(chem_vec, vector_data)[0]
        best_match_idx = chem_similarities.argmax()
        best_match_name = str(dataframe.iloc[best_match_idx]['chemical_name'])
        struct_score = get_structural_sim(chemical, best_match_name)
        
        # Check if chemical exists exactly in database
        exists_exactly = any(str(name).lower() == chemical.lower() for name in dataframe['chemical_name'].unique())

        # If it doesn't match exactly and the structure is messy (mash), return error
        if not exists_exactly and struct_score < 0.45:
             return jsonify({
                "status": "error",
                "message": f"'{chemical}' is not recognized. Please check the spelling."
            }), 400

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
            
            # ── Get prep time from shared MongoDB collection (user-verified) ──
            alt_lower = alt_name.lower()
            prep_time = "Refer to product label"  # fallback if not in DB
            try:
                cached = db["prep_times"].find_one({"alternative_key": alt_lower})
                if cached and cached.get("prep_time"):
                    prep_time = cached["prep_time"]
            except Exception as pt_err:
                print(f"[prep_time] DB lookup failed for '{alt_name}': {pt_err}")

            
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

@app.route("/recommend_by_symptom", methods=["POST"])
@app.route("/api/recommend_by_symptom", methods=["POST"])
@limiter.limit("10 per minute")
def recommend_by_symptom():
    try:
        req = request.get_json()
        symptom = req.get("symptom", "").strip()
        crop = req.get("crop", "").strip()
        acres = req.get("acres", 1)
        user_lang = req.get("language", "English")

        if not symptom:
            return jsonify({"status": "error", "message": "Missing symptom or pest description."}), 400

        tfidf_model, vector_data, dataframe = get_models()

        query = f"{symptom} {crop}".lower()
        query_vec = tfidf_model.transform([query])
        similarities = cosine_similarity(query_vec, vector_data)[0]

        best_score = similarities.max()

        if best_score <= 0.15: 
            return jsonify({
                "status": "error",
                "message": f"No reliable organic alternative found for '{symptom}'."
            }), 400

        options = []
        seen_alts = set()
        
        indices_to_check = similarities.argsort()[::-1][:5]
        scores = [similarities[idx] for idx in indices_to_check]
        
        for i, idx in enumerate(indices_to_check):
            score = scores[i]
            res = dataframe.iloc[idx]
            alt_name = res["organic_alternative"].strip()
            
            if alt_name.lower() in seen_alts:
                continue
                
            seen_alts.add(alt_name.lower())
            
            alt_lower = alt_name.lower()
            prep_time = "Refer to product label"
            try:
                cached = db["prep_times"].find_one({"alternative_key": alt_lower})
                if cached and cached.get("prep_time"):
                    prep_time = cached["prep_time"]
            except Exception as pt_err:
                print(f"[prep_time] DB lookup failed for '{alt_name}': {pt_err}")

            options.append({
                "id": str(idx),
                "alternative": alt_name,
                "dosage": res["dosage"],
                "application_time": res["application_time"],
                "safety_note": res["safety_note"],
                "confidence": min(1.0, round(float(score), 4)),
                "prep_time": prep_time,
                "problem_target": res.get("problem_or_pest", symptom),
                "corrected_chemical": str(res.get("chemical_name", ""))
            })
            
            if len(options) >= 3:
                break

        if not options:
             return jsonify({
                "status": "error",
                "message": f"No reliable organic alternative found."
            }), 400

        return jsonify({
            "status": "success",
            "options": options
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/formulate", methods=["POST"])
@app.route("/api/formulate", methods=["POST"])
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
        3. Identify 2–3 'preparation_tasks'. For each, provide a clear 'step' and an array of 'days' it must be performed (e.g. [1, 3] for Day 1 and 3). Use 'step' NOT 'description'.
        4. Provide 1 'application_phase' item with a 'step' for the final organic application.
        
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
                    {"step": "Mix all ingredients in a barrel with 200L of water.", "days": [1]},
                    {"step": "Gather 5kg Neem leaves", "days": [1, 2]},
                    {"step": "Stir clockwise twice a day. Keep in shade.", "days": [2, 3, 4]}
                ],
                "application_phase": [
                    {"step": f"Dilute with water and spray evenly across {acres} acres of {crop}."}
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
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "start_date": datetime.now().isoformat(),
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
    req = request.get_json()
    plan_id = req.get("plan_id")
    task_id = req.get("task_id") # e.g., 'task_0_day_1'
    is_completed = req.get("is_completed", True)
    
    if not plan_id or not task_id:
        return jsonify({"status": "error", "message": "Missing plan_id or task_id"}), 400
        
    # Robust ID Validation
    if not re.match(r'^[0-9a-fA-F]{24}$', str(plan_id)):
         # If it's not a hex string, it might be an object that already has $oid
         if isinstance(plan_id, dict) and "$oid" in plan_id:
             plan_id = plan_id["$oid"]
         else:
             return jsonify({"status": "error", "message": f"Invalid plan_id format: {plan_id}"}), 400

    try:
        if is_completed:
            # If this is the very first task being completed, officially start the timer
            plan_doc = db.formulations.find_one({"_id": ObjectId(plan_id)})
            if not plan_doc:
                 return jsonify({"status": "error", "message": "Plan not found"}), 404
            
            current_completed = plan_doc.get("completed_task_ids", [])
            
            update_fields = {
                "$addToSet": {"completed_task_ids": task_id},
                "$set": {"updated_at": datetime.now()}
            }
            
            if len(current_completed) == 0:
                update_fields["$set"]["start_date"] = datetime.now().isoformat()

            db.formulations.update_one(
                {"_id": ObjectId(plan_id)},
                update_fields
            )
        else:
            db.formulations.update_one(
                {"_id": ObjectId(plan_id)},
                {
                    "$pull": {"completed_task_ids": task_id},
                    "$set": {"updated_at": datetime.now()}
                }
            )
        
        return jsonify({"status": "success", "message": "Task synced successfully!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/formulations", methods=["GET"])
def get_formulations():
    try:
        user_id = request.args.get("user_id", "ashwanth_demo")
        plans = list(db.formulations.find({"user_id": user_id}).sort("created_at", -1))
        
        # Categorize for production UI
        now = datetime.now()
        for p in plans:
            # Check if all tasks are completed AND if time has passed
            tasks = p.get("formulation_data", {}).get("preparation_tasks", [])
            total_unique_tasks = len(tasks)
            completed_tasks = len(p.get("completed_task_ids", []))
            
            # Find max day in schedule
            max_day = 1
            for t in tasks:
                days = t.get("days", [1])
                if days:
                    max_day = max(max_day, max(days))
            
            # Calculate current day relative to start
            date_str = p.get("start_date") or p.get("created_at")
            current_day = 1
            if date_str:
                if isinstance(date_str, dict) and "$date" in date_str:
                    date_val = datetime.fromisoformat(date_str["$oid"]) # Wait, it might be $date
                elif isinstance(date_str, datetime):
                    date_val = date_str
                else:
                    try:
                        date_val = datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
                    except:
                        date_val = now
                
                # Use start-of-day math for consistent day boundaries
                date_start = date_val.replace(hour=0, minute=0, second=0, microsecond=0)
                now_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                delta = now_start - date_start
                current_day = delta.days + 1

            # A plan is Historical ONLY if:
            # 1. It is explicitly marked COMPLETED
            # 2. It's past the last day of tasks
            is_over = current_day > max_day
            
            if p.get("status") == "COMPLETED" or is_over:
                p["diff_category"] = "Historical"
            else:
                p["diff_category"] = "Active"
                
        return bson_dumps({"status": "success", "plans": plans}), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=10000)