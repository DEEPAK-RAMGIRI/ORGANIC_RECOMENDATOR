import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 50);
    }, []);

    return (
        <div className="flow-page animate-fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'linear-gradient(180deg, #f8fafc 0%, #eff8f4 100%)' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '1100px', padding: '1rem', borderRadius: '24px', background: 'rgba(255,255,255,0.85)', border: '1px solid #e5e7eb', boxShadow: '0 18px 35px rgba(15, 23, 42, 0.08)' }}>
                <div style={{ position: 'absolute', top: '-90px', right: '-100px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-90px', left: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '18px' }}>
                            🌱 AI-Powered Organic Farming
                        </div>
                        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', lineHeight: 1.1, margin: '0 0 14px', color: '#111827' }}>
                            Organic <span style={{ color: '#10b981' }}>Reccomendator</span>
                        </h1>
                        <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: 1.65, maxWidth: '520px' }}>
                            Turn chemical dependency into nutrient-rich organic alternatives with AI-powered planning, progress tracking, and real farm insights.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
                            <button className="primary-btn" onClick={() => navigate('/triage')} style={{ padding: '11px 18px' }}>
                                Start Recommendation
                            </button>
                            <button className="secondary-btn" onClick={() => navigate('/dashboard')} style={{ padding: '11px 18px' }}>
                                Go to Dashboard
                            </button>
                        </div>

                        <div style={{ marginTop: '1.8rem', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>40+</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Chemicals covered</div>
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>7</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Crops supported</div>
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px' }}>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>AI</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Personalized plans</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '360px', borderRadius: '18px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}>
                            <img src="/main.jpg" alt="Organic farming soil and plant" style={{ width: '100%', height: '100%', minHeight: '280px', objectFit: 'cover' }} onError={e => { e.target.style.background = 'linear-gradient(135deg, #d1fae5, #a7f3d0)'; e.target.removeAttribute('src'); }} />
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>
                    B.Tech Final Year Project — Organic Buddy · 2025–26
                </div>
            </div>
        </div>
    );
}
