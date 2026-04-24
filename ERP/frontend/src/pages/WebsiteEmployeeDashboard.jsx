import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaUserCheck, FaCalendarAlt, FaChartLine, FaCheckCircle, FaTasks, FaListAlt, FaRegListAlt
} from 'react-icons/fa';

const API = '/api/website';

/* ─── Animated SVG Line Chart ─────────────────────────────────── */
function EfficiencyLineChart({ data, color, onPointClick }) {
    const [hovered, setHovered] = useState(null);
    const [animated, setAnimated] = useState(false);
    const pathRef = useRef(null);

    useEffect(() => {
        if (pathRef.current) {
            const len = pathRef.current.getTotalLength();
            pathRef.current.style.strokeDasharray = len;
            pathRef.current.style.strokeDashoffset = len;
            setTimeout(() => {
                pathRef.current.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)';
                pathRef.current.style.strokeDashoffset = '0';
                setAnimated(true);
            }, 120);
        }
    }, [data]);

    const pastData = data.filter(d => d.attendance !== 'Upcoming');
    if (pastData.length < 2) return (
        <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
            Not enough data yet
        </div>
    );

    const W = 280, H = 110, pad = { top: 10, right: 12, bottom: 20, left: 28 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const xScale = i => pad.left + (i / (pastData.length - 1)) * innerW;
    const yScale = v => pad.top + innerH - (v / 100) * innerH;

    const points = pastData.map((d, i) => ({ x: xScale(i), y: yScale(d.efficiency) }));
    const pathD = points.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt.x},${pt.y}`;
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        return acc + ` C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
    }, '');
    const areaD = pathD + ` L ${points[points.length - 1].x},${H - pad.bottom} L ${pad.left},${H - pad.bottom} Z`;

    const gradId = `eff-grad-website-${color.replace('#', '')}`;
    const gridLines = [0, 25, 50, 75, 100];

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {gridLines.map(g => (
                <g key={g}>
                    <line x1={pad.left} y1={yScale(g)} x2={W - pad.right} y2={yScale(g)} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={pad.left - 4} y={yScale(g) + 3.5} textAnchor="end" fontSize="7" fill="#cbd5e1" fontWeight="600">{g}</text>
                </g>
            ))}
            {animated && <path d={areaD} fill={`url(#${gradId})`} />}
            <path ref={pathRef} d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((pt, i) => {
                const d = pastData[i];
                const prev = pastData[i - 1];
                const isRise = i > 0 && d.efficiency > prev?.efficiency;
                const isFall = i > 0 && d.efficiency < prev?.efficiency;
                const dotColor = isRise ? '#22c55e' : isFall ? '#ef4444' : color;
                return (
                    <g key={i}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => onPointClick && onPointClick(data[i])}
                        style={{ cursor: onPointClick ? 'pointer' : 'default' }}
                    >
                        <circle cx={pt.x} cy={pt.y} r="7" fill="transparent" />
                        {animated && <circle cx={pt.x} cy={pt.y} r={hovered === i ? 5 : 3} fill={dotColor} stroke="#fff" strokeWidth="1.5" style={{ transition: 'r 0.15s ease' }} />}
                        {hovered === i && (
                            <g>
                                <rect x={pt.x - 26} y={pt.y - 28} width="52" height="20" rx="6" fill="#1e293b" />
                                <text x={pt.x} y={pt.y - 14} textAnchor="middle" fontSize="8.5" fill="#fff" fontWeight="800">
                                    {d.display_date}: {d.efficiency}%
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

export default function WebsiteEmployeeDashboard() {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const headers = { Authorization: `Bearer ${token}` };

    const [effHistory, setEffHistory] = useState({
        history: [], average_efficiency: 0, total_tasks: 0,
        completed_tasks: 0, total_reworks: 0, month_name: ''
    });
    const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const res = await axios.get(
                `${API}/efficiency?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
                { headers }
            );
            setEffHistory(res.data);
        } catch (err) {
            console.error('Website dashboard fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const markPresent = async () => {
        try {
            await axios.post(`${API}/mark-present`, {}, { headers });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Error marking attendance');
        }
    };

    useEffect(() => {
        if (showAttendanceHistory) {
            document.body.classList.add('no-scroll');
            const handleEsc = (e) => {
                if (e.key === 'Escape') setShowAttendanceHistory(false);
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.classList.remove('no-scroll');
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [showAttendanceHistory]);

    const getEfficiencyColor = (eff) => {
        if (eff < 40) return '#ef4444';
        if (eff < 75) return '#f59e0b';
        return '#22c55e';
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
        </div>
    );

    const avg = effHistory.average_efficiency || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStats = effHistory.history.find(h => h.date === todayStr) || { worked: 0, available: 480, task_count: 0, efficiency: 0 };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>

            {/* Welcome Banner - Standard Indigo Theme */}
            <div className="card" style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)', marginBottom: '30px', gap: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
                        Hi, {(user?.name || 'Website Team').split(' ')[0]}! 🌐
                    </h2>
                    <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '1.1rem' }}>
                        Ready to optimize and build amazing web experiences today?
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                </div>
            </div>


            {/* Grid - Left Chart & Right Weekly Circles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '20px' }}>

                {/* Left: Efficiency Chart */}
                <div className="card" style={{ background: '#fff', borderRadius: '25px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0, fontWeight: 800 }}>Average Efficiency</h3>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b' }}>{avg}%</span>
                            </div>
                        </div>
                    </div>

                    <EfficiencyLineChart
                        data={effHistory.history}
                        color={getEfficiencyColor(avg)}
                        onPointClick={(day) => {
                            if (day.efficiency > 0) navigate(`/daily-work-records?date=${day.date}`);
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f8fafc' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>TOTAL TASKS</p>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#334155' }}>{effHistory.total_tasks || 0}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>COMPLETED</p>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#22c55e' }}>{effHistory.completed_tasks || 0}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>REWORKS</p>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#ef4444' }}>{effHistory.total_reworks || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Right: Daily Circles */}
                <div className="card" style={{ flex: 1, padding: '20px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaChartLine /> {(effHistory.month_name || 'MONTHLY').toUpperCase()} EFFICIENCY RECORD
                        </h4>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        {effHistory.history.filter(h => h.attendance !== 'Upcoming').map((h, i) => {
                            const ec = getEfficiencyColor(h.efficiency);
                            return (
                                <div key={i}
                                    style={{ minWidth: '85px', textAlign: 'center', cursor: h.efficiency > 0 ? 'pointer' : 'default', transition: 'transform 0.2s' }}
                                    onMouseEnter={e => { if (h.efficiency > 0) e.currentTarget.style.transform = 'scale(1.05)' }}
                                    onMouseLeave={e => { if (h.efficiency > 0) e.currentTarget.style.transform = 'scale(1)' }}
                                    onClick={() => {
                                        if (h.efficiency > 0) navigate(`/daily-work-records?date=${h.date}`);
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '10px', fontWeight: 700 }}>{h.display_date}</div>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        border: `3px solid ${h.efficiency > 0 ? ec : '#ef4444'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto', fontSize: h.efficiency > 0 ? '0.85rem' : '0.65rem', fontWeight: 900,
                                        color: h.efficiency > 0 ? ec : '#ef4444'
                                    }}>
                                        {h.efficiency > 0 ? `${h.efficiency}%` : 'Abs'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {effHistory.history.filter(h => h.attendance !== 'Upcoming').length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>No production logs found for {effHistory.month_name} yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance History Modal */}
            {showAttendanceHistory && (
                <>
                    <div className="modal-overlay" onClick={() => setShowAttendanceHistory(false)} />
                    <div className="animate-scale-up" style={{
                        position: 'fixed', top: '50%', left: '50%', zIndex: 1001,
                        background: '#fff', padding: '30px', borderRadius: '30px',
                        textAlign: 'center', width: '90%', maxWidth: '600px',
                        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px' }}>
                                {effHistory.month_name} Attendance Log
                            </h2>
                            <button onClick={() => setShowAttendanceHistory(false)} style={{ background: '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        <div className="attendance-grid" style={{ marginBottom: '25px' }}>
                            {effHistory.history.map((h, i) => (
                                <div key={i} className="attendance-item" style={{
                                    background: h.attendance === 'Present' ? '#f0fdf4' : (h.attendance === 'Absent' ? '#fef2f2' : (h.attendance === 'Upcoming' ? '#f8fafc' : '#fef2f2')),
                                    borderColor: h.attendance === 'Present' ? '#bcf0da' : (h.attendance === 'Absent' ? '#fecaca' : (h.attendance === 'Upcoming' ? '#f1f5f9' : '#fecaca'))
                                }}>
                                    <div className="attendance-date">{h.display_date}</div>
                                    <div className="attendance-status" style={{
                                        color: h.attendance === 'Present' ? '#166534' : (h.attendance === 'Absent' ? '#991b1b' : '#64748b'),
                                        fontWeight: 800
                                    }}>
                                        {h.attendance.toUpperCase()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowAttendanceHistory(false)} className="btn" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 800, width: '100%', padding: '12px', borderRadius: '15px', border: 'none', cursor: 'pointer' }}>
                            Close Window
                        </button>
                    </div>
                </>
            )}

            <style>{`
                .card { transition: transform 0.2s, box-shadow 0.2s; }
                .attendance-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
                .attendance-item { padding: 12px; border-radius: 12px; border: 1px solid transparent; }
                .attendance-date { font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; font-weight: 700; }
                .attendance-status { font-size: 0.8rem; letter-spacing: 0.5px; }
            `}</style>
        </div>
    );
}
