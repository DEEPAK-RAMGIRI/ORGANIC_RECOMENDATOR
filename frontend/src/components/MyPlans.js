import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Activity, Sprout, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import '../styles/flow.css';

export default function MyPlans() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await axios.get(`http://localhost:10000/api/formulations?user_id=ashwanth_demo`);
                if (response.data.status === 'success') {
                    setPlans(response.data.plans || []);
                }
            } catch (err) {
                setError('Failed to load your saved plans.');
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);

    const openPlan = (plan) => {
        // We route them back to the action dashboard, passing the saved plan data
        navigate('/plan-summary', {
            state: {
                formulation_data: plan.formulation_data,
                substitutions: plan.context.substitutions,
                context: plan.context,
                is_saved: true // Prevents them from saving it again
            }
        });
    };

    return (
        <div className="flow-page animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <header className="page-header" style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Library size={32} color="#8b5cf6" />
                    My <span style={{ color: '#8b5cf6' }}>Library</span>
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#64748b' }}>
                    Your customized organic formulation calculations, safely stored in the cloud.
                </p>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px auto' }} />
                    <p>Fetching your archives from MongoDB...</p>
                </div>
            ) : error ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px', color: '#b91c1c' }}>
                    {error}
                </div>
            ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
                    <Activity size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '8px' }}>No Formulations Saved Yet</h3>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>Run a Triage scan and customize an option in the Lab to save your first plan.</p>
                    <button className="primary-btn" onClick={() => navigate('/triage')}>Start New Scan</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {plans.map((plan) => {
                        const date = new Date(plan.created_at.$date || plan.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                        });

                        return (
                            <div
                                key={plan._id.$oid}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                                }}
                                onClick={() => openPlan(plan)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {plan.context.acres} Acres
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{date}</div>
                                </div>

                                <h3 style={{ fontSize: '1.3rem', color: '#0f172a', margin: '0 0 8px 0', lineHeight: '1.3' }}>
                                    {plan.context.alternative}
                                </h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', flex: 1 }}>
                                    <Sprout size={16} /> Replaces {plan.context.chemical}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#8b5cf6', fontWeight: '600' }}>View Full Routine</span>
                                    <ArrowRight size={18} color="#8b5cf6" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
