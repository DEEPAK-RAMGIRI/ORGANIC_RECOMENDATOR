import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, ListChecks, FlaskConical, Bookmark, Loader2 } from 'lucide-react';
import axios from 'axios';
import '../styles/flow.css';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const { formulation_data, substitutions, custom_instructions, context, is_mock, is_saved } = location.state || { formulation_data: null, substitutions: {}, custom_instructions: '', context: {}, is_mock: false, is_saved: false };
  const [checkedItems, setCheckedItems] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!formulation_data) {
    return (
      <div className="flow-page text-center mt-12">
        <h2>No active plan.</h2>
        <button className="primary-btn mt-6" onClick={() => navigate('/triage')}>Start New Triage</button>
      </div>
    );
  }

  const hasCustomInstructions = custom_instructions && custom_instructions.trim().length > 0;
  const hasSubstitutions = substitutions && Object.keys(substitutions).length > 0;

  const handleSavePlan = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await axios.post('http://localhost:10000/api/formulations', {
        user_id: 'ashwanth_demo',
        formulation_data: formulation_data,
        context: { ...context, custom_instructions, substitutions }
      });
      if (response.data.status === 'success') {
        setSaveSuccess(true);
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save to database. Is the server running?');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flow-page animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <header className="page-header" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
        <button className="back-btn" onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '6px', color: '#64748b' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', background: 'linear-gradient(45deg, #2ecc71, #27ae60)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Action Dashboard
            </h1>
            {is_mock && (
              <span style={{ background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                DEV: MOCK DATA (AI LIMIT)
              </span>
            )}
            {is_saved && !is_mock && (
              <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px', border: '1px solid #10b981' }}>
                <Bookmark size={14} style={{ display: 'inline', marginBottom: '-2px', marginRight: '4px' }} /> FROM LIBRARY
              </span>
            )}
          </div>
          <p style={{ fontSize: '1.1rem', color: '#64748b' }}>Your dynamic <strong>{context.alternative}</strong> plan for {context.plot} ({context.acres} Acres).</p>
        </div>
      </header>

      {is_mock && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#b91c1c' }}>
          <strong>Developer Notice:</strong> The Google Gemini API free-tier rate limit was exceeded (429 Error). This dashboard is currently rendering a hardcoded <strong>Mock Fallback</strong> so you can continue testing the frontend layout without crashing.
        </div>
      )}

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px' }}>

        {/* Warnings & Substitutions Banner */}
        {(hasCustomInstructions || hasSubstitutions || (formulation_data.warnings && formulation_data.warnings.length > 0)) && (
          <div className="form-card" style={{ background: 'linear-gradient(145deg, #fffbeb, #fef3c7)', borderColor: '#fcd34d', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: 0, color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Important Notices
            </h3>
            <ul style={{ color: '#92400e', fontSize: '0.95rem', marginTop: '12px', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hasSubstitutions && Object.entries(substitutions).map(([orig, sub]) => {
                if (!sub) return null; // Skip empty swaps
                return <li key={orig}>Replacing <strong>{orig}</strong> with <strong>{sub}</strong></li>;
              })}
              {hasCustomInstructions && (
                <li><strong>Custom Constraints Applied:</strong> {custom_instructions}</li>
              )}
              {formulation_data.warnings && formulation_data.warnings.map((warn, idx) => (
                <li key={`warn-${idx}`}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

          {/* Ingredients Checklist */}
          <div className="form-card" style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <FlaskConical size={22} color="#3b82f6" /> Required Ingredients
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {formulation_data.ingredients && formulation_data.ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <strong style={{ color: '#1e293b', fontSize: '1.05rem', paddingRight: '12px' }}>{ing.name}</strong>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {ing.quantity}
                      </span>
                    </div>
                    {ing.note && <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{ing.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Stepper */}
          <div className="form-card" style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <ListChecks size={22} color="#8b5cf6" /> Preparation Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
              {/* Vertical Line connecting steps */}
              <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '24px', width: '2px', background: '#e2e8f0', zIndex: 0 }}></div>

              {formulation_data.timeline_steps && formulation_data.timeline_steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#fff',
                    border: '2px solid #8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 0 4px #fff'
                  }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#8b5cf6' }}></div>
                  </div>
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{ fontWeight: '600', color: '#4f46e5', marginBottom: '6px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {step.day}
                    </div>
                    <div style={{ color: '#334155', lineHeight: '1.6', fontSize: '0.95rem' }}>
                      {step.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Database Storage Actions */}
        {!is_mock && !is_saved && (
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {saveError && <div style={{ color: '#dc2626', background: '#fee2e2', padding: '12px 24px', borderRadius: '8px', border: '1px solid #fca5a5' }}>{saveError}</div>}

            {!saveSuccess ? (
              <button
                className="primary-btn"
                onClick={handleSavePlan}
                disabled={isSaving}
                style={{
                  padding: '16px 40px',
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '30px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  opacity: isSaving ? 0.8 : 1
                }}
                onMouseEnter={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(16, 185, 129, 0.5)'; } }}
                onMouseLeave={(e) => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(16, 185, 129, 0.4)'; } }}
              >
                {isSaving ? (
                  <><Loader2 size={20} className="spin" /> Syncing to Library...</>
                ) : (
                  <><Bookmark size={20} fill="currentColor" /> Save to My Plans Library</>
                )}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem', background: '#ecfdf5', padding: '16px 40px', borderRadius: '30px', border: '1px solid #34d399' }}>
                <CheckCircle2 size={24} /> Successfully Saved to Library
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}