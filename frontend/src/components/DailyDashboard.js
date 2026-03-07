import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, CheckCircle2, Circle, Loader2, Sparkles, AlertCircle, ArrowRight, Leaf, Clock } from 'lucide-react';
import '../styles/flow.css';

export default function DailyDashboard() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [syncingTasks, setSyncingTasks] = useState({});

    const fetchActivePlans = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:10000/api/formulations?user_id=ashwanth_demo');
            if (response.data.status === 'success') {
                const allPlans = response.data.plans || [];
                const active = allPlans.filter(p => p.status === 'PREPARING' || !p.status);
                setPlans(active);
            }
        } catch (err) {
            setError('Could not connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActivePlans();
    }, [fetchActivePlans]);

    const calculateCurrentDay = (plan) => {
        if (!plan.completed_task_ids || plan.completed_task_ids.length === 0) return 1;
        let dateStr = plan.start_date || plan.created_at;
        if (dateStr && dateStr.$date) dateStr = dateStr.$date;
        if (!dateStr) return 1;
        const start = new Date(dateStr);
        const now = new Date();
        start.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = now.getTime() - start.getTime();
        if (diffTime < 0) return 1;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const toggleTask = async (planId, taskId, currentCompletedArray) => {
        const willBeCompleted = !currentCompletedArray.includes(taskId);
        setSyncingTasks(prev => ({ ...prev, [taskId]: true }));
        setPlans(prev => prev.map(p => {
            const id = typeof p._id === 'string' ? p._id : p._id.$oid;
            if (id !== planId) return p;
            const newCompleted = willBeCompleted
                ? [...(p.completed_task_ids || []), taskId]
                : (p.completed_task_ids || []).filter(id => id !== taskId);
            return { ...p, completed_task_ids: newCompleted };
        }));
        try {
            await axios.put('http://localhost:10000/api/tasks/sync', { plan_id: planId, task_id: taskId, is_completed: willBeCompleted });
        } catch (err) {
            console.error('Sync failed:', err);
            fetchActivePlans();
        } finally {
            setSyncingTasks(prev => ({ ...prev, [taskId]: false }));
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={40} color="#10b981" className="spin" />
                <p style={{ color: '#64748b', fontWeight: '500' }}>Loading your farm schedule...</p>
            </div>
        );
    }

    const todayTasksByPlan = plans.map(plan => {
        const currentDay = calculateCurrentDay(plan);
        const allPrepTasks = plan.formulation_data?.preparation_tasks || [];
        const tasksDueToday = allPrepTasks
            .map((t, idx) => ({ ...t, original_index: idx }))
            .filter(t => t.days && t.days.includes(currentDay));
        return { ...plan, currentDay, tasksDueToday };
    }).filter(p => p.tasksDueToday.length > 0);

    const totalActive = plans.length;
    const totalTasksToday = todayTasksByPlan.reduce((sum, p) => sum + p.tasksDueToday.length, 0);
    const completedTasksToday = todayTasksByPlan.reduce((sum, plan) => {
        return sum + plan.tasksDueToday.filter(t => {
            const taskId = `task_${t.original_index}_day_${plan.currentDay}`;
            return (plan.completed_task_ids || []).includes(taskId);
        }).length;
    }, 0);

    // Get current time for greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={22} color="white" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '800', color: '#0f172a' }}>
                        Daily Action Board
                    </h1>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', paddingLeft: '52px' }}>
                    {greeting}. {totalActive > 0 ? `You have ${totalActive} active preparation${totalActive !== 1 ? 's' : ''}.` : 'Start a new formulation to get going.'}
                </p>
            </div>

            {/* ── Stats Bar ── */}
            {totalActive > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                    {[
                        { label: 'Active Plans', value: totalActive, color: '#3b82f6', bg: '#eff6ff' },
                        { label: "Today's Tasks", value: totalTasksToday, color: '#f59e0b', bg: '#fffbeb' },
                        { label: 'Done Today', value: completedTasksToday, color: '#10b981', bg: '#ecfdf5' },
                    ].map(stat => (
                        <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}22`, borderRadius: '12px', padding: '16px 20px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px', color: '#b91c1c', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {/* ── Empty State ── */}
            {todayTasksByPlan.length === 0 && !error && (
                <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '64px 24px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Sparkles size={32} color="#94a3b8" />
                    </div>
                    <h2 style={{ color: '#334155', marginBottom: '8px', fontSize: '1.4rem' }}>All done for today!</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '360px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                        {totalActive > 0
                            ? 'None of your active formulations require action today. Check back tomorrow!'
                            : 'No active preparations yet. Start a triage to create your first organic plan.'}
                    </p>
                    <button
                        onClick={() => navigate('/triage')}
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Leaf size={18} /> Start New Triage <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {/* ── Task Cards ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {todayTasksByPlan.map((plan) => {
                    const planId = typeof plan._id === 'string' ? plan._id : plan._id.$oid;
                    const completedCount = plan.tasksDueToday.filter(t =>
                        (plan.completed_task_ids || []).includes(`task_${t.original_index}_day_${plan.currentDay}`)
                    ).length;
                    const totalCount = plan.tasksDueToday.length;
                    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                    const isAllDone = completedCount === totalCount;

                    return (
                        <div key={planId} style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
                            overflow: 'hidden',
                        }}>
                            {/* Progress Strip */}
                            <div style={{ height: '3px', background: '#f1f5f9' }}>
                                <div style={{ height: '100%', width: `${progress}%`, background: isAllDone ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)', borderRadius: '0 3px 3px 0' }} />
                            </div>

                            {/* Card Header */}
                            <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f8fafc' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            PREPARING
                                        </span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '500' }}>
                                            <Clock size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                                            Day {plan.currentDay}
                                        </span>
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#0f172a' }}>{plan.context?.alternative}</h2>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                        {plan.context?.plot} · {plan.context?.acres} Acres · {plan.context?.crop}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: '600', color: isAllDone ? '#10b981' : '#64748b' }}>
                                        {completedCount}/{totalCount} done
                                    </div>
                                    <button
                                        onClick={() => navigate('/plan-summary', { state: { formulation_data: plan.formulation_data, context: plan.context, is_saved: true, plan_id: planId, completed_task_ids: plan.completed_task_ids } })}
                                        style={{ background: 'transparent', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s ease' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                    >
                                        Full Roadmap <ArrowRight size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Tasks List */}
                            <div style={{ padding: '12px 16px 16px' }}>
                                {plan.tasksDueToday.map((task) => {
                                    const taskId = `task_${task.original_index}_day_${plan.currentDay}`;
                                    const isCompleted = (plan.completed_task_ids || []).includes(taskId);
                                    const isSyncing = syncingTasks[taskId];

                                    return (
                                        <div
                                            key={taskId}
                                            onClick={() => !isSyncing && toggleTask(planId, taskId, plan.completed_task_ids || [])}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 12px',
                                                borderRadius: '10px', cursor: 'pointer',
                                                transition: 'background 0.15s ease',
                                                userSelect: 'none',
                                                opacity: isSyncing ? 0.6 : 1,
                                            }}
                                            onMouseEnter={e => { if (!isSyncing) e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {/* Checkbox Icon */}
                                            <div style={{ marginTop: '2px', flexShrink: 0 }}>
                                                {isSyncing
                                                    ? <Loader2 size={22} color="#10b981" className="spin" />
                                                    : isCompleted
                                                        ? <CheckCircle2 size={22} color="#10b981" fill="#10b981" strokeWidth={0} />
                                                        : <Circle size={22} color="#cbd5e1" />
                                                }
                                            </div>

                                            {/* Task Text */}
                                            <p style={{
                                                margin: 0, flex: 1, fontSize: '0.95rem', lineHeight: '1.6',
                                                color: isCompleted ? '#94a3b8' : '#334155',
                                                textDecoration: isCompleted ? 'line-through' : 'none',
                                                fontWeight: '500',
                                            }}>
                                                {task.description}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* All Done Banner */}
                            {isAllDone && (
                                <div style={{ margin: '0 16px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontSize: '0.9rem', fontWeight: '600' }}>
                                    <CheckCircle2 size={18} /> All Day {plan.currentDay} tasks completed! Great work.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
