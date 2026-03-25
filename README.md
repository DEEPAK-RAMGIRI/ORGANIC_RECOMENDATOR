<h1 align="center"> ORGANIC BUDDY</h1>

### FINAL YEAR PROJECT 

Organic Buddy is an AI-powered full-stack web application designed to help farmers transition from synthetic chemical inputs to safe and sustainable organic alternatives. The platform provides personalized, farm-specific recommendations by analyzing crop type and current chemical usage, then suggesting effective organic solutions along with preparation guidance.
The system integrates Natural Language Processing (TF-IDF) and a Large Language Model to generate actionable organic formulations, daily task guidance,Organic Buddy aims to promote environmentally friendly farming, reduce chemical dependency, and improve long-term soil and farmer health.
This project demonstrates the practical application of Artificial Intelligence in agriculture through a production-ready platform built using Python (Flask) for the backend, React for the frontend, and MongoDB Atlas for data storage.

**Live Demo:** [ORGANIC BUDDY](https://organicbuddy.me/)

--- 

![Screen Shot](https://github.com/DEEPAK-RAMGIRI/ORGANIC_RECOMENDATOR/blob/main/images/Screenshot%202026-03-25%20172216.png)

--- 



This application allows users to input a chemical input and give the oranic fertilizer output. The system uses an LLM and 

Welcome to **Organic Buddy**, a comprehensive platform designed to help farmers transition from chemical-intensive agriculture to sustainable organic practices.

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

---

## Core Features
1. **Impact Scanner**: Research-backed human toxicity audit for 20+ common chemicals.
2. **Organic Recommender**: AI-powered discovery of safe bio-alternatives.
3. **Transition Roadmap**: Step-by-step 7-day preparation tasks for each organic switch.
4. **ROI Calculator**: Long-term financial forecasting for organic conversion.

## Tech Stack
- **AI**: Google Gemini (Large Language Model)
- **Database**: MongoDB (Atlas)
- **Visualization**: Recharts (Radar/Area Charts)
- **Icons**: Lucide React
