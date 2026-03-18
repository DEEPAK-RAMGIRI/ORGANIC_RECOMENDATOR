import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { History, CheckCircle2, FlaskConical, TrendingUp, Loader2, Target, Calendar } from 'lucide-react';
import { API_BASE_URL } from '../config';
import '../styles/flow.css';
import '../styles/shared.css';

export default function SavingsAnalytics() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/formulations?user_id=ashwanth_demo`);
                if (response.data.status === 'success') {
                    setPlans(response.data.plans || []);
                }
            } catch (err) {
                console.error("Failed to load plans", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={40} color="#22c55e" className="spin" />
                <p className="text-muted font-600 uppercase tracking-widest text-xs">Syncing Ledger...</p>
            </div>
        );
    }

    // STRICT CATEGORIZATION
    // 1. Realized (Completed)
    const realizedPlans = plans.filter(p => p.diff_category === 'Historical');
    // 2. Projected (Active)
    const activePlans = plans.filter(p => p.diff_category === 'Active');

    // Process monthly data for the chart (Realized vs Projected)
    const monthlyMap = {};
    
    // Add Realized Savings
    realizedPlans.forEach(p => {
        const amt = p.savings || 0;
        const dateObj = new Date(p.created_at?.$date || p.created_at || Date.now());
        const monthKey = dateObj.toLocaleString('en-US', { month: 'short' });
        const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        if(!monthlyMap[sortKey]) monthlyMap[sortKey] = { name: monthKey, realized: 0, projected: 0, sortKey };
        monthlyMap[sortKey].realized += amt;
    });

    // Add Projected Savings (Active)
    activePlans.forEach(p => {
        const amt = p.savings || 0;
        const dateObj = new Date(p.created_at?.$date || p.created_at || Date.now());
        const monthKey = dateObj.toLocaleString('en-US', { month: 'short' });
        const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        if(!monthlyMap[sortKey]) monthlyMap[sortKey] = { name: monthKey, realized: 0, projected: 0, sortKey };
        monthlyMap[sortKey].projected += amt;
    });

    const chartData = Object.values(monthlyMap)
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ name, realized, projected }) => ({ name, realized, projected }));

    const totalRealized = realizedPlans.reduce((acc, curr) => acc + (curr.savings || 0), 0);
    const totalProjected = activePlans.reduce((acc, curr) => acc + (curr.savings || 0), 0);

    return (
        <div className="flow-page animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div className="icon-box" style={{ background: '#f0fdf4' }}>
                        <TrendingUp size={22} color="#10b981" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
                        Financial <span style={{ color: '#10b981' }}>Impact</span>
                    </h1>
                </div>
                <p className="text-muted" style={{ margin: '0', fontSize: '1.1rem', maxWidth: '650px' }}>
                    Tracking realized savings from completed transitions and projected efficiency from active roadmaps.
                </p>
            </header>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                
                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="stat-num" style={{ color: '#10b981' }}>₹{(totalRealized/1000).toFixed(1)}k</div>
                    <div className="stat-label">Realized Savings</div>
                </div>

                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="stat-num" style={{ color: '#3b82f6' }}>₹{(totalProjected/1000).toFixed(1)}k</div>
                    <div className="stat-label">Projected Savings</div>
                </div>

                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="stat-num" style={{ color: '#0f172a' }}>{realizedPlans.length}</div>
                    <div className="stat-label">Completed Cycles</div>
                </div>

                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="stat-num" style={{ color: '#f59e0b' }}>{activePlans.length}</div>
                    <div className="stat-label">Active Goals</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                {/* Visual Trajectory */}
                <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 24px 0', color: '#1e293b', fontSize: '1.25rem', fontWeight: '800' }}>Savings Growth Trajectory</h3>
                    <div style={{ flex: 1, minHeight: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} tickFormatter={(val) => `₹${val/1000}k`} dx={-10}/>
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36}/>
                                <Bar dataKey="realized" name="Achieved Savings" fill="#10b981" radius={[8, 8, 0, 0]} barSize={24} />
                                <Bar dataKey="projected" name="Projected (Active)" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={24} opacity={0.4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Audit Log / Ledger */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <History size={20} color="#64748b" />
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '800' }}>Audit Ledger</h3>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '430px' }}>
                        {plans.length === 0 ? (
                            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                <Calendar size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <p>No transactions recorded.</p>
                            </div>
                        ) : (
                            plans.map((plan, i) => {
                                const dateObj = new Date(plan.created_at?.$date || plan.created_at || Date.now());
                                const isDone = plan.diff_category === 'Historical';
                                
                                return (
                                    <div key={i} style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div style={{ color: '#0f172a', fontWeight: '700', fontSize: '1.05rem' }}>{plan.context?.alternative}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{plan.context?.acres} Acres · {plan.context?.plot}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: isDone ? '#059669' : '#2563eb', fontWeight: '800', fontSize: '1.1rem' }}>
                                                ₹{(plan.savings || 0).toLocaleString()}
                                            </div>
                                            <div className={`pill ${isDone ? 'pill-green' : 'pill-blue'}`} style={{ marginTop: '6px' }}>
                                                {isDone ? 'Realized' : 'In Progress'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
