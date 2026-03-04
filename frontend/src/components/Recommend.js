import React, { useState } from 'react';
import axios from 'axios';
import { 
  FlaskConical, Map, CheckCircle, LayoutDashboard, 
  Calendar, ClipboardCheck, AlertTriangle, ArrowLeft, Languages 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import '../styles/recommend.css'; 
import '../styles/dashboard.css'; 

const CROP_OPTIONS = [
  { name: "Maize", img: "https://img.icons8.com/color/96/corn.png" },
  { name: "Chilli", img: "https://img.icons8.com/color/96/chili-pepper.png" },
  { name: "Rice", img: "https://img.icons8.com/?size=100&id=fBRb__tw4Lft&format=png&color=000000" },
  { name: "Wheat", img: "https://img.icons8.com/color/96/wheat.png" },
  { name: "Cotton", img: "https://img.icons8.com/?size=100&id=YKUKiMCIwdhQ&format=png&color=000000" },
  { name: "Groundnut", img: "https://img.icons8.com/color/96/peanuts.png" },
  { name: "Tomato", img: "https://img.icons8.com/color/96/tomato.png" }
];

export default function Recommend() {
  const [inputs, setInputs] = useState({ chemical: '', crop: '', acres: 1 });
  const [language, setLanguage] = useState('English');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const handleSearch = async () => {
    if (!inputs.chemical || !inputs.crop) {
      alert(language === 'English' ? "Please select a crop and chemical." : "దయచేసి పంట మరియు రసాయనాన్ని ఎంచుకోండి.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:10000/recommend`, {
        ...inputs,
        language: language
      });
      setData(response.data);
      setShowDashboard(true);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        alert(language === 'English' 
            ? `Could not find an alternative for "${inputs.chemical}". Did you mean "Urea"?` 
            : `"${inputs.chemical}" కోసం ప్రత్యామ్నాయం దొరకలేదు. బహుశా మీరు "Urea" అని అంటున్నారా?`);
      } else {
        alert("Server Error. Ensure Python backend is running.");
      }
    } finally {
      setLoading(false); // This ensures loading stops even if an error occurs
    }
  };

  // --- DASHBOARD VIEW ---
  if (showDashboard && data) {
    return (
      <div className="dashboard-wrapper animate-fade-in">
        <aside className="sidebar">
          <div className="logo">
            <LayoutDashboard size={28} color="#2ecc71" />
            <span>Agri-Safe AI</span>
          </div>
          <nav>
            <button className="active">Overview</button>
            <button onClick={() => setShowDashboard(false)}>New Search</button>
          </nav>
        </aside>

        <main className="main-content">
          <header className="dash-header">
            <button className="back-btn" onClick={() => setShowDashboard(false)}>
              <ArrowLeft size={18} /> {language === 'English' ? 'Back' : 'వెనుకకు'}
            </button>
            <h1>Farm <span className="green-text">Dashboard</span></h1>
          </header>

          <div className="grid-container">
            <div className="card summary-card">
              <h3>{language === 'English' ? 'Strategy' : 'వ్యూహం'}</h3>
              <div className="badge">{inputs.crop}</div>
              <div className="badge">{inputs.acres} Acres</div>
              <h2>{data.alternative}</h2>
              <p>Replaces: {inputs.chemical}</p>
            </div>

            <div className="stats-row">
              <div className="mini-card">
                <Calendar size={20} color="#2ecc71" />
                <div><p>Timing</p><strong>{data.application_time}</strong></div>
              </div>
              <div className="mini-card">
                <ClipboardCheck size={20} color="#2ecc71" />
                <div><p>Dosage</p><strong>{data.dosage}</strong></div>
              </div>
            </div>

            <div className="card roadmap-card">
              <h3>📅 {language === 'English' ? '5-Day Roadmap' : '5-రోజుల ప్రణాళిక'}</h3>
              <div className="day-list">
  {data.llm_advice.split('\n')
    .filter(line => line.toLowerCase().includes('day') || line.includes('రోజు'))
    .map((step, index) => (
      <div key={index} className="day-item">
        <div className="day-content">
          <ReactMarkdown>{step.replace(/^- /g, '')}</ReactMarkdown>
        </div>
      </div>
    ))}
</div>
              {!data.llm_advice.toLowerCase().includes('day') && !data.llm_advice.includes('రోజు') && (
                <div className="markdown-body"><ReactMarkdown>{data.llm_advice}</ReactMarkdown></div>
              )}
            </div>

            <div className="card safety-card">
              <h3><AlertTriangle size={20} color="#e67e22" /> {language === 'English' ? 'Safety' : 'జాగ్రత్తలు'}</h3>
              <p>{data.safety_note}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- FORM VIEW ---
  return (
    <div className="recommend-viewport">
      <div className="recommend-container animate-fade-in">
        <header className="form-header">
          <h1><span className="organic-text">Organic</span> Recommendation</h1>
          <p>Switch to sustainable farming today</p>
        </header>

        <div className="glass-form-card">
          <div className="language-selector">
            <label className="section-label"><Languages size={16} /> Choose Language</label>
            <div className="lang-buttons">
              <button className={language === 'English' ? 'lang-btn active' : 'lang-btn'} onClick={() => setLanguage('English')}>English</button>
              <button className={language === 'Telugu' ? 'lang-btn active' : 'lang-btn'} onClick={() => setLanguage('Telugu')}>తెలుగు</button>
            </div>
          </div>

          <div className="input-group">
            <FlaskConical size={20} className="form-icon" />
            <input 
              placeholder={language === 'English' ? "Chemical Name (Urea, DAP...)" : "రసాయన పేరు"}
              value={inputs.chemical}
              onChange={(e) => setInputs({...inputs, chemical: e.target.value})} 
            />
          </div>

          <label className="section-label">Select Your Crop</label>
          <div className="crop-cards-grid">
            {CROP_OPTIONS.map((crop) => (
              <div 
                key={crop.name}
                className={`crop-card ${inputs.crop === crop.name ? 'active' : ''}`}
                onClick={() => setInputs({ ...inputs, crop: crop.name })}
              >
                <img src={crop.img} alt={crop.name} className="crop-icon-img" />
                <span className="crop-name-label">{crop.name}</span>
                {inputs.crop === crop.name && <CheckCircle size={18} className="selection-check" />}
              </div>
            ))}
          </div>

          <div className="input-group">
            <Map size={20} className="form-icon" />
            <input type="number" placeholder="Acres" min="1" value={inputs.acres} onChange={(e) => setInputs({...inputs, acres: e.target.value})} />
          </div>

          <button className="recommend-btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Loading.." : (language === 'English' ? "Get Recommendation" : "సలహా పొందండి")}
          </button>
        </div>
      </div>
    </div>
  );
}