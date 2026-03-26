<h1 align="center"> ORGANIC BUDDY</h1>

### FINAL YEAR PROJECT (B.TECH)

Organic Buddy is an AI-powered full-stack web application designed to help farmers transition from synthetic chemical inputs to safe and sustainable organic alternatives. The platform provides personalized, farm-specific recommendations by analyzing crop type and current chemical usage, then suggesting effective organic solutions along with preparation guidance.
The system integrates Natural Language Processing (TF-IDF) and a Large Language Model to generate actionable organic formulations, daily task guidance,Organic Buddy aims to promote environmentally friendly farming, reduce chemical dependency, and improve long-term soil and farmer health.
This project demonstrates the practical application of Artificial Intelligence in agriculture through a production-ready platform built using Python (Flask) for the backend, React for the frontend, and MongoDB Atlas for data storage.

**Live Demo:** [ORGANIC BUDDY](https://organicbuddy.me/)

--- 

![Screen Shot](https://github.com/DEEPAK-RAMGIRI/ORGANIC_RECOMENDATOR/blob/main/images/Screenshot%202026-03-25%20172216.png)

--- 

### Tech Stack
- **Frontend** : React.js, React Router, axios, Lucide React(icons).
- **Backend**: Python, Flask, Flask - limiter, Flask-CORS
- **AI & Machine Learning**: Google Gemini (Large Language Model), NLTK & Pandas/NumPy
- **Database**: MongoDB (Atlas)
- **Deployment**: Render, Vercel, Git/GitHub
- **npm** – Dependency management

### Features:

- Intelligent Triage & Recommendation: Input any synthetic chemical or agricultural problem to receive a mathematically matched organic alternative using a custom TF-IDF NLP engine.
- AI-Powered Formulation Lab: Automatically deconstructs organic solutions into core ingredients, identifying which are "Critical" and which are "Swappable" for local customization.
- Acre-Scaled Formulation Recipes: Generates precise, scaled ingredient quantities based on your registered farm size, calculated instantly using the Google Gemini LLM.
- Dynamic Preparation Roadmaps: Provides a structured 5-day preparation schedule with day-by-day actionable tasks to ensure successful organic input fermentation.
- Interactive Daily Dashboard: Extracts "Today's Tasks" from all active plans into a real-time checklist with "Optimistic UI" for instant progress tracking.
- Chemical Impact Visualizer: Explore the toxicity of 20+ hazardous chemicals through interactive multi-axis Radar Charts, detailing health risks and environmental persistence.
- Deterministic ROI Calculator:  Model 3, 5, or 10-year financial projections to see your potential savings compared to synthetic chemical inflation.
- Stateful Farm Portfolio: Register and manage multiple farm plots with specific crop types, land areas, and soil profiles for personalized treatment tracking.
- MongoDB Atlas Integration: Securely persists all your farm details, active roadmaps, and historical savings data in a high-availability cloud database.
- Flask & React Architecture: Combines a high-performance Python backend with a smooth, responsive React 18 frontend for a seamless user experience.


## Deployment Architecture
- **Backend**: Hosted on **Render** (Flask + MongoDB Atlas).
- **Frontend**: Hosted on **Vercel** (React + Lucide-React).

## Deployment Configuration

### 1. Backend (Render)
Ensure the following environment variables are set in your Render Dashboard:
- `MONGO_URI`: Your MongoDB Atlas connection string.
- `GEMINI_API_KEY`: Your Google Gemini API Key.

**Installation:**
```bash
pip install -r requirements.txt
```

**Run Command:**
```bash
python app.py
```

---

### 2. Frontend (Vercel)
Ensure the following environment variables are set in your Vercel Dashboard:
- `REACT_APP_BACKEND_URL`: The URL of your Render backend (e.g., `https://your-backend.onrender.com`).

**Installation:**
```bash
npm install
```

**Build Command:**
```bash
npm run build
```

### Environment Variables
add ```.env ``` file in both frontend and backend
Backend ```.env```
```
MONGODB_URI=your_mongo_db_url
GEMINI_API_KEY = your_GEMINI_API_KEY
```


Frontend ```.env``` (optional)
```
REACT_APP_BACKEND_URL= backend_url
```
---

### Folder Structure
```
RE-VIEW/
├── backend/
│   ├── .gitignore                     # Backend 
│   ├── app.py                      # API routes          
│   ├── data.pkl
│   ├── impact_data.json
│   ├── mappings.json
│   ├── model.pkl
│   ├── reference_costs.json
│   ├── requirements.txt
│   └── ectors.pkl                 
├── Frontend/                      # Frontend (React.js)
│   ├── public/
│   │   ├── index.html
│   │   └── main.jpg
│   ├── src/            
│   │   ├── components/            # Reusable React components
│   │   │   ├── DailyDashboard.js
│   │   │   ├── ErrorBoundary.js
│   │   │   ├── FarmDetails.js
│   │   │   ├── ImpactVisualize.js
│   │   │   ├── Lab.js
│   │   │   ├── LandingPage.js
│   │   │   ├── ManageFarms.js
│   │   │   ├── MyPlans.js
│   │   │   ├── options.js
│   │   │   ├── planSmmary.js
│   │   │   ├── SavingsAnalytics.js
│   │   │   ├── Sidebar.js
│   │   │   ├──TransitionCalculator.js
│   │   │   └── Triage.js
│   │   ├── styles/
│   │   │   ├── flow.css
│   │   │   ├──index.css
│   │   │   ├──shared.css
│   │   │   └── sidebar.css
│   │   ├── App.js
│   │   ├── activeUser.js
│   │   ├── config.js
│   │   └── index.js
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   └── RE-VIEW.png                # Preview image
│
└── README.md                      # Project documentation
```



