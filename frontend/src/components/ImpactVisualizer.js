import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldAlert, Loader2, Beaker, Globe, Activity, Clock, ShieldCheck, Flame, Droplet, Bug, Stethoscope, Bird, AlertTriangle, Zap, Info, TrendingUp, Skull, Microscope, HeartPulse, Brain, Thermometer, Ban, Leaf } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function ImpactVisualizer() {
    const [impactData, setImpactData] = useState(null);
    const [chemicals, setChemicals] = useState([]);
    const [selectedChemical, setSelectedChemical] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImpactData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/impact`);
                if (response.data.status === 'success') {
                    const data = response.data.data;
                    setImpactData(data);
                    const chemList = Object.keys(data).sort();
                    setChemicals(chemList);
                    if (chemList.length > 0) {
                        setSelectedChemical(chemList[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to load impact data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchImpactData();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh', flexDirection: 'column', gap: '16px', background: '#fff' }}>
                <Loader2 size={32} color="#10b981" className="spin" />
                <p style={{ color: '#0f172a', fontSize: '0.9rem', fontWeight: '950', letterSpacing: '1px', textTransform: 'uppercase' }}>Scanning Human Toxicity Index...</p>
            </div>
        );
    }

    if (!impactData || chemicals.length === 0) {
        return (
            <div className="empty-state" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
                <ShieldAlert size={48} color="#0f172a" style={{ marginBottom: '16px' }} />
                <h2 style={{ color: '#0f172a', fontWeight: '900' }}>Toxicity Audit Offline</h2>
                <p style={{ color: '#1e293b' }}>The chemical impact database is currently unreachable. Please verify your connection.</p>
            </div>
        );
    }

    const currentData = impactData[selectedChemical];
    const rawMetrics = currentData.chemical_metrics || {};
    const scientificProfile = currentData.scientific_profile || {};
    const diseases = currentData.famous_diseases || [];
    const alternatives = currentData.safe_alternatives || [];

    const labelMap = {
        'Bird Toxicity': '🐦 BIRD\nTOXICITY',
        'Cancer Risk': '🎗️ CANCER\nRISK',
        'Microbial Death': '🐛 SOIL\nPOISON',
        'Skin Allergy': '🧴 SKIN\nALLERGY',
        'Water Poison': '💧 WATER\nPOISON'
    };

    const radarData = Object.keys(rawMetrics).map(key => ({
        subject: labelMap[key] || key,
        value: rawMetrics[key]
    }));

    const maxScore = Math.max(...Object.values(rawMetrics));
    
    const getHazardMeta = (score) => {
        if (score >= 90) return { label: 'EXTREME DANGER', color: '#dc2626', bg: '#fef2f2', icon: Skull };
        if (score >= 75) return { label: 'CRITICAL RISK', color: '#f97316', bg: '#fff7ed', icon: Flame };
        if (score >= 50) return { label: 'HIGH CONCERN', color: '#ea580c', bg: '#fff7ed', icon: AlertTriangle };
        return { label: 'MODERATE IMPACT', color: '#d97706', bg: '#fffbeb', icon: Info };
    };

    const hazard = getHazardMeta(maxScore);

    const translateTech = (text) => {
        if (!text) return '';
        const lower = text.toLowerCase();
        if (lower.includes('trichogramma')) return 'Killer Wasp';
        if (lower.includes('beauveria')) return 'Soil Fungus';
        if (lower.includes('jeevamrutham')) return 'Holy Soil Serum';
        if (lower.includes('neem oil')) return 'Neem Tree Extract';
        return '';
    };

    const renderCustomAxisTick = ({ payload, x, y, textAnchor }) => {
        const lines = payload.value.split('\n');
        return (
            <g transform={`translate(${x},${y})`}>
                {lines.map((line, i) => (
                    <text 
                        key={i}
                        x={0}
                        y={i * 14}
                        dy={6}
                        textAnchor={textAnchor} 
                        fill="#0f172a" 
                        fontSize="11px" 
                        fontWeight="950"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                        {line}
                    </text>
                ))}
            </g>
        );
    };

    return (
        <div className="flow-page animate-fade-in" style={{ padding: '2rem', background: '#fff', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
                
                {/* Header - Minimal & Punchy */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <div style={{ background: hazard.bg, color: hazard.color, padding: '6px 16px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '950', letterSpacing: '1.5px', textTransform: 'uppercase', border: `2px solid ${hazard.color}`, display: 'inline-block', marginBottom: '12px' }}>
                            {hazard.label} AUDIT
                        </div>
                        <h1 style={{ margin: 0, fontSize: '3.5rem', fontWeight: '950', color: '#0f172a', letterSpacing: '-3px', lineHeight: 0.9 }}>
                            Impact <span style={{ color: '#ef4444' }}>Scanner</span>
                        </h1>
                    </div>
                    
                    <div style={{ background: '#f8fafc', padding: '16px 28px', borderRadius: '24px', border: '3px solid #0f172a', display: 'flex', alignItems: 'center', gap: '20px', minWidth: '450px' }}>
                        <div style={{ flex: 1 }}>
                            <select 
                                value={selectedChemical}
                                onChange={(e) => setSelectedChemical(e.target.value)}
                                style={{ 
                                    width: '100%', border: 'none', background: 'transparent', fontWeight: '950', 
                                    fontSize: '1.4rem', color: '#0f172a', outline: 'none', cursor: 'pointer'
                                }}
                            >
                                {chemicals.map(chem => <option key={chem} value={chem}>{chem}</option>)}
                            </select>
                        </div>
                        <Microscope size={28} color="#0f172a" strokeWidth={3} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '2.5rem', alignItems: 'start' }}>
                    
                    {/* LEFT PANEL: Huge Web (Sticky) */}
                    <div className="card" style={{ 
                        padding: '40px', background: '#0f172a', borderRadius: '40px', 
                        position: 'sticky', top: '2rem',
                        overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: '0%', left: '0%', width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 50%, #ef4444 0%, transparent 80%)' }} />
                        </div>

                        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                            <div style={{ height: '580px', margin: '0 -20px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                        <PolarAngleAxis dataKey="subject" tick={renderCustomAxisTick} />
                                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar 
                                            name="Hazard" dataKey="value" stroke="#ef4444" strokeWidth={6} fill="#ef4444" fillOpacity={0.6} 
                                            dot={{ r: 6, fill: '#ef4444', strokeWidth: 3, stroke: '#fff' }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: '#fff', color: '#0f172a' }}
                                            itemStyle={{ color: '#ef4444', fontWeight: '950', fontSize: '1.1rem' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <style>{`
                            @keyframes poisonPulse {
                                0% { filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.4)); }
                                50% { filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.8)); }
                                100% { filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.4)); }
                            }
                            .recharts-radar-polygon { animation: poisonPulse 3s infinite ease-in-out; }
                        `}</style>
                    </div>

                    {/* RIGHT PANEL: Practical Intel & Health */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        
                        {/* Major Linked Diseases Card */}
                        <div className="card" style={{ padding: '36px', borderRadius: '40px', border: '4px solid #0f172a', background: '#fff', boxShadow: '20px 20px 0 #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                                <div style={{ background: '#0f172a', padding: '12px', borderRadius: '15px' }}>
                                    <HeartPulse size={28} color="#fff" strokeWidth={2.5} />
                                </div>
                                <h3 style={{ margin: 0, fontWeight: '950', color: '#0f172a', fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Health Hazards</h3>
                            </div>
                            
                            <div style={{ display: 'grid', gap: '14px' }}>
                                {diseases.map(disease => (
                                    <div key={disease} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '20px', border: '2px solid #e2e8f0' }}>
                                        <Skull size={20} color="#ef4444" />
                                        <span style={{ fontWeight: '950', color: '#0f172a', fontSize: '1.15rem' }}>{disease}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scientific Breakdown - Ultra Simple */}
                        <div className="card" style={{ padding: '32px', borderRadius: '40px', background: '#f1f5f9', border: '2px dashed #0f172a' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Microscope size={22} color="#0f172a" strokeWidth={2.5} />
                                <h4 style={{ margin: 0, fontWeight: '950', color: '#0f172a', fontSize: '1.1rem', textTransform: 'uppercase' }}>Toxicity Audit</h4>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {[
                                    { k: 'Poison Group', v: scientificProfile["Chemical Type"], icon: Beaker },
                                    { k: 'Lingers In Soil', v: scientificProfile["Soil Poison Time"], icon: Clock },
                                    { k: 'Attack Style', v: scientificProfile["Attack Method"], icon: Zap },
                                    { k: 'Banned In', v: scientificProfile["Global Status"], icon: Globe }
                                ].map(item => (
                                    <div key={item.k} style={{ padding: '16px', background: '#fff', borderRadius: '20px', border: '2px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>{item.k}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: '950', color: '#0f172a', lineHeight: 1.2 }}>{item.v}</div>
                                        {translateTech(item.v) && <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '900', marginTop: '6px' }}>({translateTech(item.v)})</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ORGANIC ALTERNATIVES - PREMIUM GLASSMORTHISM */}
                        <div style={{ 
                            background: 'rgba(16, 185, 129, 0.03)', 
                            borderRadius: '40px', padding: '36px', color: '#064e3b', 
                            border: '4px solid #10b981', position: 'relative', overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.2)'
                        }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                <div style={{ background: '#10b981', padding: '10px', borderRadius: '12px' }}>
                                    <ShieldCheck size={26} color="#fff" />
                                </div>
                                <h3 style={{ margin: 0, fontWeight: '950', fontSize: '1.5rem', textTransform: 'uppercase', color: '#064e3b', letterSpacing: '1px' }}>Safe Replacements</h3>
                            </div>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {alternatives.map(alt => (
                                    <div key={alt} style={{ padding: '20px', background: '#fff', borderRadius: '22px', border: '2px solid rgba(16, 185, 129, 0.2)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '950', fontSize: '1.25rem', color: '#064e3b' }}>{alt}</div>
                                            {translateTech(alt) && <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>({translateTech(alt)})</div>}
                                        </div>
                                        <Leaf size={24} color="#10b981" />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
