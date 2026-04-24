import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaUserCheck, FaCalendarAlt, FaChartLine, FaUsers,
    FaGlobe, FaCheckCircle, FaClock, FaExclamationTriangle,
    FaArrowRight, FaTasks
} from 'react-icons/fa';

const API = '/api/website';

export default function WebsiteHeadDashboard() {
    const { token, user } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const [overview, setOverview] = useState({
        total_tasks_today: 0,
        approved_today: 0,
        pending_today: 0,
        team_efficiency_month: 0,
        employee_stats: []
    });
    const [loading, setLoading] = useState(true);
    const [showAttendance, setShowAttendance] = useState(false);

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/head-overview`, { headers });
            setOverview(res.data);
        } catch (err) {
            console.error('Head overview fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchOverview();
    }, [token]);

    const markPresent = async () => {
        try {
            await axios.post('/api/automation/attendance', {}, { headers });
            alert('Attendance marked!');
            fetchOverview();
        } catch (err) {
            alert(err.response?.data?.message || 'Error marking attendance');
        }
    };

    const getEffColor = eff => eff < 40 ? '#ef4444' : eff < 75 ? '#f59e0b' : '#22c55e';

    if (loading) return <div style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>Loading Analytics...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            {/* Welcome Section */}
            <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                borderRadius: '30px', padding: '35px 40px', marginBottom: '32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 15px 35px rgba(99,102,241,0.25)'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                        Hi, {user?.name?.split(' ')[0]}!
                    </h1>
                    <p style={{ margin: '10px 0 0', opacity: 0.9, color: '#fff', fontSize: '1.1rem' }}>
                        The team's performance at a glance.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button onClick={markPresent} style={{ background: '#fff', color: '#6366f1', border: 'none', padding: '12px 24px', borderRadius: '15px', fontWeight: 800, cursor: 'pointer' }}>
                        <FaUserCheck /> Mark Present
                    </button>
                    <button onClick={() => setShowAttendance(true)} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px', borderRadius: '15px', fontWeight: 800 }}>
                        <FaCalendarAlt /> Record
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {[
                    { label: 'Team Efficiency (Month)', value: overview.team_efficiency_month + '%', icon: <FaChartLine />, color: getEffColor(overview.team_efficiency_month) },
                    { label: 'Tasks Today', value: overview.total_tasks_today, icon: <FaTasks />, color: '#6366f1' },
                    { label: 'Completed Today', value: overview.approved_today, icon: <FaCheckCircle />, color: '#22c55e' },
                    { label: 'Pending / Rework', value: overview.pending_today, icon: <FaClock />, color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '25px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ background: `${s.color}15`, color: s.color, padding: '10px', borderRadius: '12px' }}>{s.icon}</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 950, color: '#1e293b' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                {/* Employee Stats */}
                <div style={{ background: '#fff', borderRadius: '30px', padding: '30px', border: '1px solid #f1f5f9' }}>
                    <h2 style={{ margin: '0 0 25px', fontSize: '1.2rem', fontWeight: 900 }}>Employee Efficiency</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {overview.employee_stats.map(emp => (
                            <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '20px', background: '#f8fafc' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>{emp.name[0]}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{emp.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{emp.approved_count} approved</div>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 950, color: getEffColor(emp.monthly_efficiency) }}>{emp.monthly_efficiency}%</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Distribution */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div style={{ background: '#fff', borderRadius: '30px', padding: '30px', border: '1px solid #f1f5f9' }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 900 }}>Daily Distribution</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15.5px' }}>
                            {[
                                { label: 'Completed', count: overview.approved_today, total: overview.total_tasks_today, color: '#22c55e' },
                                { label: 'Pending', count: overview.pending_today, total: overview.total_tasks_today, color: '#f59e0b' },
                            ].map((p, i) => {
                                const pct = p.total > 0 ? (p.count / p.total * 100) : 0;
                                return (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            <span>{p.label}</span>
                                            <span style={{ color: p.color }}>{p.count}</span>
                                        </div>
                                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '10px' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: p.color, borderRadius: '10px' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ background: '#eff6ff', borderRadius: '30px', padding: '30px', border: '1px solid #dbeafe' }}>
                        <h2 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: 900, color: '#1e40af' }}>Team Insight</h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>Monthly target is 75%. Team is currently at {overview.team_efficiency_month}%.</p>
                    </div>
                </div>
            </div>

            {/* Attendance Modal placeholder */}
            {showAttendance && (
                <div onClick={() => setShowAttendance(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: '40px', borderRadius: '30px', textAlign: 'center' }}>
                        <FaCalendarAlt size={40} color="#6366f1" />
                        <h2>Attendance System</h2>
                        <p>Logs are recorded automatically upon login.</p>
                        <button onClick={() => setShowAttendance(false)} style={{ marginTop: '20px', padding: '10px 30px', borderRadius: '15px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 800 }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
