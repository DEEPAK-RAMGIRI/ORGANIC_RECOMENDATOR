import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { LayoutDashboard, Calendar, ClipboardCheck, AlertTriangle, ArrowLeft } from 'lucide-react';
import '../styles/dashboard.css';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Pulling the "suitcase" data
  const { result, inputs } = location.state || {};

  // Safety check: if user refreshes or visits directly, send them back
  if (!result) {
    return (
      <div className="error-state">
        <h2>No Active Session</h2>
        <button onClick={() => navigate('/recommend')}>Start New Search</button>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <aside className="sidebar">
        <div className="logo">
          <LayoutDashboard size={28} color="#2ecc71" />
          <span>Organic Buddy</span>
        </div>
        <nav>
          <button className="active">Overview</button>
          <button onClick={() => navigate('/recommend')}>New Recommendation</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="dash-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>Farm <span className="green-text">Dashboard</span></h1>
        </header>

        <div className="grid-container">
          {/* Summary Card */}
          <div className="card summary-card">
            <h3>Current Strategy</h3>
            <div className="strategy-info">
              <div className="badge">Crop: {inputs.crop}</div>
              <div className="badge">Area: {inputs.acres} Acres</div>
            </div>
            <h2>Organic Alternative: <span className="highlight">{result.alternative}</span></h2>
            <p>Replacing: {inputs.chemical}</p>
          </div>

          {/* Quick Stats */}
          <div className="stats-row">
            <div className="mini-card">
              <Calendar size={20} />
              <div>
                <p>Application Timing</p>
                <strong>{result.application_time}</strong>
              </div>
            </div>
            <div className="mini-card">
              <ClipboardCheck size={20} />
              <div>
                <p>Recommended Dosage</p>
                <strong>{result.dosage}</strong>
              </div>
            </div>
          </div>

          {/* Detailed AI Roadmap */}
          <div className="card roadmap-card">
            <h3>Expert Roadmap & Guidance</h3>
            <div className="markdown-body">
              <ReactMarkdown>{result.llm_advice}</ReactMarkdown>
            </div>
          </div>

          {/* Safety Alert */}
          <div className="card safety-card">
            <h3><AlertTriangle size={20} color="#e67e22" /> Safety Protocols</h3>
            <p>{result.safety_note}</p>
          </div>
        </div>
      </main>
    </div>
  );
}