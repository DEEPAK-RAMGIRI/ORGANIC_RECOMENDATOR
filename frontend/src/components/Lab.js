import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings2, CheckCircle2, Loader2, ArrowLeft, FlaskConical, Beaker, Zap, Clock } from 'lucide-react';
import axios from 'axios';
import '../styles/flow.css';

export default function Lab() {
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedOption, context } = location.state || { selectedOption: null, context: {} };

    const [customConstraints, setCustomConstraints] = useState('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(true);
    const [recipeAnalysis, setRecipeAnalysis] = useState(null);
    const [substitutions, setSubstitutions] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch recipe analysis on load
    React.useEffect(() => {
        if (!selectedOption) return;

        const analyzeRecipe = async () => {
            try {
                const res = await axios.post('http://localhost:10000/api/analyze-recipe', {
                    alternative: selectedOption.alternative,
                    language: 'English'
                });
                if (res.data.status === 'success') {
                    setRecipeAnalysis(res.data.analysis);
                }
            } catch (err) {
                console.error("Failed to analyze recipe", err);
                // Graceful degradation: If analysis fails, we just don't show the dynamic swaps,
                // and rely solely on the custom text box.
            } finally {
                setLoadingAnalysis(false);
            }
        };

        analyzeRecipe();
    }, [selectedOption]);

    if (!selectedOption) {
        return (
            <div className="flow-page text-center mt-12">
                <h2>No recipe selected.</h2>
                <button className="primary-btn mt-6" onClick={() => navigate('/triage')}>Go Back</button>
            </div>
        );
    }



    const handleSubstituteChange = (ingredientName, newSubValue) => {
        setSubstitutions(prev => {
            const next = { ...prev };
            if (!newSubValue) {
                delete next[ingredientName];
            } else {
                next[ingredientName] = newSubValue;
            }
            return next;
        });
    };

    const handleGeneratePlan = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:10000/formulate', {
                alternative: selectedOption.alternative,
                chemical_replaced: selectedOption.corrected_chemical || context.chemical,
                crop: context.crop,
                acres: context.acres,
                substitutions: substitutions,
                custom_instructions: customConstraints,
                language: 'English'
            });

            if (response.data.status === 'success') {
                navigate('/plan-summary', {
                    state: {
                        formulation_data: response.data.formulation_data,
                        substitutions: substitutions,
                        custom_instructions: customConstraints,
                        context: { ...context, ...response.data.context },
                        is_mock: response.data.is_mock
                    }
                });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate formulation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flow-page animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
            <header className="page-header" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '32px' }}>
                <button className="back-btn" onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '6px', color: '#64748b' }}>
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#1e293b' }}>
                        Formulation <span style={{ color: '#8b5cf6' }}>Laboratory</span>
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: '#64748b' }}>
                        Tuning <strong>{selectedOption.alternative}</strong> for {context.plot} ({context.acres} Acres).
                    </p>
                </div>
            </header>

            {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>Generation Failed:</strong> {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

                {/* Recipe Overview Card */}
                <div className="form-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FlaskConical size={20} color="#3b82f6" /> Base Requirements
                    </h3>

                    <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Selected Alternative</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>{selectedOption.alternative}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', marginBottom: '4px' }}>
                                <Clock size={14} /> Base Prep
                            </div>
                            <div style={{ fontWeight: '600', color: '#334155' }}>{selectedOption.prep_time}</div>
                        </div>
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', marginBottom: '4px' }}>
                                <Beaker size={14} /> Replaces
                            </div>
                            <div style={{ fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedOption.corrected_chemical || context.chemical}</div>
                        </div>
                    </div>
                </div>

                {/* Customizations Card */}
                <div className="form-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings2 size={20} color="#8b5cf6" /> Custom Constraints
                    </h3>

                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.5' }}>
                        AI has pre-analyzed this recipe. Review the required core ingredients. Swap what you don't have, or add custom notes below.
                    </p>

                    {loadingAnalysis ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                            <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#8b5cf6' }} />
                            Analyzing formulation biology...
                        </div>
                    ) : recipeAnalysis && recipeAnalysis.ingredients && recipeAnalysis.ingredients.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {recipeAnalysis.ingredients.map((ing, idx) => (
                                <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div>
                                            <strong style={{ color: '#1e293b', display: 'block' }}>{ing.name}</strong>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{ing.role}</span>
                                        </div>
                                        {ing.is_critical ? (
                                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                CRITICAL (Fixed)
                                            </span>
                                        ) : (
                                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                SWAPPABLE
                                            </span>
                                        )}
                                    </div>

                                    {!ing.is_critical && ing.substitutions && ing.substitutions.length > 0 && (
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '6px', fontWeight: '600' }}>Substitution Options:</label>
                                            <select
                                                className="modern-input"
                                                style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                                                value={substitutions[ing.name] || ''}
                                                onChange={(e) => handleSubstituteChange(ing.name, e.target.value)}
                                            >
                                                <option value="">(Default) {ing.name}</option>
                                                {ing.substitutions.map(sub => (
                                                    <option key={sub} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', fontWeight: '600' }}>Additional Custom Notes (Optional):</label>
                    <textarea
                        value={customConstraints}
                        onChange={(e) => setCustomConstraints(e.target.value)}
                        placeholder="e.g. 'I don't have cow dung, can I use buffalo dung?' or 'My soil is very dry.'"
                        style={{
                            width: '95%',
                            minHeight: '120px',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#334155',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            outline: 'none',
                            fontFamily: 'inherit',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleGeneratePlan}
                    disabled={loading}
                    style={{
                        padding: '16px 32px',
                        background: 'linear-gradient(45deg, #8b5cf6, #6d28d9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.4)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        opacity: loading ? 0.8 : 1
                    }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(139, 92, 246, 0.5)'; } }}
                    onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(139, 92, 246, 0.4)'; } }}
                >
                    {loading ? (
                        <><Loader2 size={20} className="spin" /> Generating AI Recipe...</>
                    ) : (
                        <><Zap size={20} fill="currentColor" /> Generate Final Calculation</>
                    )}
                </button>
            </div>
        </div>
    );
}
