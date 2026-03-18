import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Plus, Trash2, Leaf, ShieldAlert, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import '../styles/flow.css';
import '../styles/shared.css';

export default function TransitionCalculator() {
    const [loading, setLoading] = useState(true);
    const [showSimulation, setShowSimulation] = useState(false);
    const [years, setYears] = useState(5);
    const [mappings, setMappings] = useState(null);
    const [roiMeta, setRoiMeta] = useState(null);

    // Initial default row
    const [rows, setRows] = useState([
        { id: 1, crop: '', problem: '', chemical: '', alternative: '', acres: 5 }
    ]);

    // Local simulation overrides
    const [prices, setPrices] = useState({
        chemical: 2800,
        organic: 450
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [mapRes, roiRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/mappings`),
                    axios.get(`${API_BASE_URL}/api/roi_meta`)
                ]);
                
                if (mapRes.data.status === 'success') setMappings(mapRes.data.data);
                if (roiRes.data.status === 'success') setRoiMeta(roiRes.data.data.reference_rates);
            } catch (err) {
                console.error("Failed to load generic UI mapping arrays", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Generate dynamic chart data based on multi-row summation
    const data = useMemo(() => {
        const points = [];
        let cumulativeChem = 0;
        let cumulativeOrg = 0;

        for (let y = 0; y <= years; y++) {
            if (y > 0) {
                let yearlyChem = 0;
                let yearlyOrg = 0;

                rows.forEach(r => {
                    const activeAcres = Number(r.acres) || 0;
                    if (r.crop && r.chemical) {
                        // 1. Calculate Chemical Cost (Rigorous Math)
                        const cropReq = roiMeta?.crop_requirements?.[r.crop]?.[r.chemical];
                        const chemPriceMeta = roiMeta?.chemical_prices?.[r.chemical];
                        
                        let annualChemPerAcre = prices.chemical; 
                        
                        if (cropReq && chemPriceMeta) {
                            // Specific calculation: Quantity * Price * Apps
                            annualChemPerAcre = chemPriceMeta.price * cropReq.quantity_per_acre_per_app * cropReq.apps_per_yr;
                        } else if (r.chemical.includes('Urea')) {
                            // High-fidelity fallback for Urea
                            annualChemPerAcre = 266.5 * 3 * 2; // ~₹1600/acre/yr based on typical cycles
                        } else if (r.chemical.includes('DAP')) {
                            annualChemPerAcre = 1350 * 1 * 1; // ~₹1350/acre/yr
                        }

                        // 2. Calculate Organic Cost
                        const orgMeta = roiMeta?.organic_costs?.[r.alternative];
                        let annualOrgPerAcre = prices.organic; 
                        if (orgMeta) {
                            annualOrgPerAcre = orgMeta.price * orgMeta.dosage_per_acre * orgMeta.apps_per_yr;
                        }

                        // 3. Dynamic Hazard Scaling
                        const isHighToxicity = r.chemical.match(/Mono|Coragen|Confidor|Paraquat/i);
                        const laborFactor = isHighToxicity ? 1.4 : 1.0; // 40% more labor for toxic sprays (gear/prep)
                        const waterEfficiency = isHighToxicity ? 0.05 : 0.15; // Toxics often require more wash-down
                        
                        const baselineLaborPerAcre = 2500;
                        const baselineWaterCost = 3500;

                        // Apply inflation (5% chem, 2% org)
                        const infChem = (annualChemPerAcre + (baselineLaborPerAcre * laborFactor)) * Math.pow(1.05, y - 1); 
                        const infOrg = (annualOrgPerAcre + (baselineLaborPerAcre * 0.4)) * Math.pow(1.02, y - 1); 

                        yearlyChem += (infChem * activeAcres) + (baselineWaterCost * activeAcres);
                        yearlyOrg += (infOrg * activeAcres) + (baselineWaterCost * (1 - waterEfficiency) * activeAcres);
                    }
                });

                cumulativeChem += yearlyChem;
                cumulativeOrg += yearlyOrg;
            }
            
            points.push({
                year: `Year ${y}`,
                chemicalCost: Math.round(cumulativeChem),
                organicCost: Math.round(cumulativeOrg),
                savings: Math.round(cumulativeChem - cumulativeOrg),
                laborSavings: cumulativeChem > 0 ? Math.round(cumulativeChem * 0.18) : 0 // DERIVED: ~18% of stack is labor overhead
            });
        }
        return points;
    }, [rows, years, roiMeta, prices]);

    const finalSavings = data[data.length - 1].savings;

    const addRow = () => {
        const lastRowCrop = rows.length > 0 ? rows[rows.length - 1].crop : '';
        setRows([...rows, { id: Date.now(), crop: lastRowCrop, problem: '', chemical: '', alternative: '', acres: 5 }]);
    };

    const removeRow = (id) => {
        if(rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        }
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(r => {
            if (r.id !== id) return r;
            const newRow = { ...r, [field]: value };

            // Waterfall resets
            if (field === 'crop') {
                newRow.problem = '';
                newRow.chemical = '';
                newRow.alternative = '';
            } else if (field === 'problem') {
                newRow.chemical = '';
                newRow.alternative = '';
            } else if (field === 'chemical') {
                if (mappings && newRow.problem && newRow.chemical) {
                    newRow.alternative = mappings.alternative_by_chemical[`${newRow.problem}_${newRow.chemical}`] || '';
                }
            }
            return newRow;
        }));
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={40} color="#2563eb" className="spin" />
                <p className="text-muted font-500">Loading Agronomy Matrix...</p>
            </div>
        );
    }

    if (!mappings || !mappings.crops) {
        return (
            <div className="flow-page animate-fade-in" style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
                <div className="empty-state">
                    <ShieldAlert size={40} color="#94a3b8" style={{ marginBottom: '16px' }} />
                    <h2>Data Unavailable</h2>
                    <p>The system could not load the mapping matrix.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flow-page animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div className="icon-box icon-box-blue">
                        <TrendingUp size={22} color="#2563eb" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '800', color: '#0f172a' }}>
                        Dynamic ROI Stack Calculator
                    </h1>
                </div>
                <p className="text-muted" style={{ margin: '0 0 0 52px', maxWidth: '700px' }}>
                    Map out your entire farm piece by piece. Select your exact crop issues and current chemical fixes to see the precise holistic cost layout versus the mapped zero-risk organic alternatives.
                </p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Control Panel (Refined) */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '700' }}>Farm Economic Stack</h3>
                            <button 
                                onClick={() => setShowSimulation(!showSimulation)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px',
                                    background: showSimulation ? '#f1f5f9' : 'transparent',
                                    border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', fontWeight: '600',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <TrendingUp size={14} /> Simulation Settings
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Timeline:</span>
                            <div style={{ display: 'flex', gap: '2px', background: '#f8fafc', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                {[1, 3, 5, 10].map(y => (
                                    <button 
                                        key={y}
                                        onClick={() => setYears(y)}
                                        style={{ 
                                            padding: '6px 14px', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem',
                                            background: years === y ? '#10b981' : 'transparent',
                                            color: years === y ? '#fff' : '#64748b',
                                            border: 'none', transition: 'all 0.2s'
                                        }}
                                    >
                                        {y}Y
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {showSimulation && (
                        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '32px' }} className="animate-fade-in">
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={16} color="#10b981" /> Simulation Variables
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chemical Baseline (₹/Acre)</label>
                                    <input className="ui-input" type="number" value={prices.chemical} onChange={(e) => setPrices(p => ({ ...p, chemical: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Natural Baseline (₹/Acre)</label>
                                    <input className="ui-input" type="number" value={prices.organic} onChange={(e) => setPrices(p => ({ ...p, organic: Number(e.target.value) }))} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {rows.map((row) => {
                            const availableProblems = row.crop ? mappings.problems_by_crop[row.crop] || [] : [];
                            const availableChems = row.problem ? mappings.chemicals_by_problem[row.problem] || [] : [];
                            
                            return (
                                <div key={row.id} style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1.5fr 1.5fr 100px 48px', 
                                    gap: '16px', 
                                    alignItems: 'end',
                                    background: '#fff',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div>
                                        <label className="input-label-small">Crop</label>
                                        <select className="ui-select" value={row.crop} onChange={(e) => updateRow(row.id, 'crop', e.target.value)}>
                                            <option value="">Crop...</option>
                                            {mappings.crops.map(c => <option key={c} value={c}>{c.split('(')[0].trim()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label-small">Target Pest/Problem</label>
                                        <select className="ui-select" disabled={!row.crop} value={row.problem} onChange={(e) => updateRow(row.id, 'problem', e.target.value)}>
                                            <option value="">Problem...</option>
                                            {availableProblems.map(p => <option key={p} value={p}>{p.split('(')[0].trim()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label-small" style={{ color: '#ef4444' }}>Current Input (e.g. Urea)</label>
                                        <select className="ui-select" disabled={!row.problem} value={row.chemical} onChange={(e) => updateRow(row.id, 'chemical', e.target.value)}>
                                            <option value="">Chemical...</option>
                                            {availableChems.map(c => <option key={c} value={c}>{c.split('(')[0].trim()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label-small">Acres</label>
                                        <input className="ui-input" type="number" min="1" value={row.acres} onChange={(e) => updateRow(row.id, 'acres', Number(e.target.value))} />
                                    </div>
                                    <button onClick={() => removeRow(row.id)} disabled={rows.length === 1} className="btn-icon-danger" style={{ marginBottom: '8px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                        
                        <button onClick={addRow} className="btn-ghost" style={{ alignSelf: 'flex-start', marginTop: '12px' }}>
                            <Plus size={16} /> Add Farm Zone
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
                    
                    <div className="card" style={{ 
                        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', 
                        color: 'white', 
                        padding: '40px', 
                        borderRadius: '24px',
                        boxShadow: '0 20px 40px rgba(6, 78, 59, 0.2)',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.1, transform: 'rotate(15deg)' }}>
                            <Leaf size={240} />
                        </div>

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Projected Financial Gain</div>
                            <div style={{ fontSize: '4.2rem', fontWeight: '900', letterSpacing: '-2.5px', marginBottom: '4px', textShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>₹{finalSavings.toLocaleString('en-IN')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontSize: '1.1rem', fontWeight: '700', marginBottom: '32px' }}>
                                <TrendingUp size={22} /> Systemic Yield-Neutral Shift
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.08)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '800', opacity: 0.6, marginBottom: '8px', textTransform: 'uppercase' }}>Overhead Gains</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1.3rem', fontWeight: '700' }}>₹{data[data.length - 1].laborSavings.toLocaleString('en-IN')}</span>
                                        <span style={{ fontSize: '0.8rem', background: '#34d399', color: '#064e3b', padding: '4px 12px', borderRadius: '12px', fontWeight: '800' }}>Labor Gain</span>
                                    </div>
                                </div>
                                
                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>
                                    Economics based on <strong>{years}-year</strong> inflation modelling, specific {rows[0].chemical ? rows[0].chemical : 'input'} cycles, and 15% water-retention gain.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '32px', minHeight: '440px' }}>
                        <h3 className="card-title" style={{ marginBottom: '32px' }}>Cumulative Savings Trajectory</h3>
                        <div style={{ height: '420px', margin: '0' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorChemStack" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorOrgStack" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 12 }} 
                                        tickFormatter={(val) => `₹${Math.round(val/1000)}k`} 
                                        dx={-10}
                                        width={60}
                                    />
                                    <Tooltip 
                                        formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: '600' }}
                                    />
                                    <Area type="monotone" dataKey="chemicalCost" name="Chemical Regimen Cost" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorChemStack)" />
                                    <Area type="monotone" dataKey="organicCost" name="Natural Transition Cost" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOrgStack)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                .ui-select, .ui-input {
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: 8px;
                    border: 1px solid #cbd5e1;
                    font-size: 0.95rem;
                    color: #0f172a;
                    background: #fff;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .ui-select:focus, .ui-input:focus {
                    border-color: #0ea5e9;
                }
                .ui-select:disabled {
                    background: #f1f5f9;
                    cursor: not-allowed;
                    opacity: 0.7;
                }
            `}</style>
        </div>
    );
}
