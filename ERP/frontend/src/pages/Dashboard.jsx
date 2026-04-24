import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaCheckCircle, FaClock, FaExclamationTriangle, FaChartBar,
    FaUserCheck, FaCalendarAlt, FaChartLine, FaRocket, FaListAlt, FaUserEdit,
    FaBriefcase, FaHistory, FaBuilding, FaPlus, FaRegListAlt
} from 'react-icons/fa';
const API = '/api/automation';

/* ─── Animated SVG Line Chart ─────────────────────────────────── */
function EfficiencyLineChart({ data, color, onPointClick }) {
    const [hovered, setHovered] = useState(null);
    const [animated, setAnimated] = useState(false);
    const pathRef = useRef(null);

    // measure path length for animation
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
    const maxEff = Math.max(...pastData.map(d => d.efficiency), 10);
    const xScale = i => pad.left + (i / (pastData.length - 1)) * innerW;
    const yScale = v => pad.top + innerH - (v / 100) * innerH;

    // smooth bezier curve
    const points = pastData.map((d, i) => ({ x: xScale(i), y: yScale(d.efficiency) }));
    const pathD = points.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt.x},${pt.y}`;
        const prev = points[i - 1];
        const cx = (prev.x + pt.x) / 2;
        return acc + ` C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
    }, '');
    const areaD = pathD + ` L ${points[points.length - 1].x},${H - pad.bottom} L ${pad.left},${H - pad.bottom} Z`;

    const gradId = `eff-grad-${color.replace('#', '')}`;

    // Y grid lines
    const gridLines = [0, 25, 50, 75, 100];

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {gridLines.map(g => (
                <g key={g}>
                    <line
                        x1={pad.left} y1={yScale(g)} x2={W - pad.right} y2={yScale(g)}
                        stroke="#f1f5f9" strokeWidth="1"
                    />
                    <text x={pad.left - 4} y={yScale(g) + 3.5} textAnchor="end" fontSize="7" fill="#cbd5e1" fontWeight="600">
                        {g}
                    </text>
                </g>
            ))}

            {/* Area fill */}
            {animated && <path d={areaD} fill={`url(#${gradId})`} />}

            {/* Main line */}
            <path ref={pathRef} d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots & hover areas */}
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
                        {animated && <circle cx={pt.x} cy={pt.y} r={hovered === i ? 5 : 3} fill={dotColor} stroke="#fff" strokeWidth="1.5"
                            style={{ transition: 'r 0.15s ease' }} />}
                        {hovered === i && (
                            <g>
                                <rect x={pt.x - 26} y={pt.y - 28} width="52" height="20" rx="6" fill="#1e293b" />
                                <text x={pt.x} y={pt.y - 14} textAnchor="middle" fontSize="8.5" fill="#fff" fontWeight="800">
                                    {d.display_date}: {d.efficiency}% ({d.task_count || 0} tasks)
                                </text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
/* ──────────────────────────────────────────────────────────────── */

const Dashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [bmStats, setBmStats] = useState(null);
    const [selectedEmpEff, setSelectedEmpEff] = useState(null);
    const [selectedEmpTasks, setSelectedEmpTasks] = useState(null);
    const [expandedClient, setExpandedClient] = useState(null);
    const [effHistory, setEffHistory] = useState({ history: [], average_efficiency: 0, total_tasks: 0, completed_tasks: 0 });
    const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [staffEfficiency, setStaffEfficiency] = useState([]);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        try {
            setLoading(true);
            const isBM = ['Admin', 'Manager', 'Brand Manager'].includes(user?.role);

            const requests = [
                axios.get(`${API}/stats`, { headers }),
                axios.get(`${API}/efficiency-history?month=3&year=2026`, { headers })
            ];

            if (isBM) {
                requests.push(axios.get(`${API}/brand-manager-dashboard?month=3&year=2026`, { headers }));
                // Use absolute path for consistency
                requests.push(axios.get(`/api/work-records/efficiency`, { headers }));
            }

            const results = await Promise.all(requests);
            setStats(results[0].data);
            setEffHistory(results[1].data);
            if (isBM) {
                if (results[2]) setBmStats(results[2].data);
                if (results[3]) setStaffEfficiency(results[3].data);
            }
        } catch (err) {
            console.error("Dashboard fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Redirect Video Editors to their own combined dashboard
        if (user?.role === 'Video Editor' || user?.role === 'Editor') {
            navigate('/editor-dashboard', { replace: true });
            return;
        }

        // Redirect Website Head to Analytics dashboard first
        if (user?.role === 'Website Head') {
            navigate('/website-dashboard', { replace: true });
            return;
        }

        // Ensure new roles stay on dashboard but fetch relevant data
        fetchData();
    }, [token, user?.role]);

    const isManagement = ['Admin', 'Brand Manager'].includes(user?.role);
    const isSpecialStaff = ['Business Development Head', 'HR', 'Website & SEO Head'].includes(user?.role);

    useEffect(() => {
        if (selectedEmpEff || showAttendanceHistory) {
            document.body.classList.add('no-scroll');
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    setSelectedEmpEff(null);
                    setShowAttendanceHistory(false);
                }
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.classList.remove('no-scroll');
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [selectedEmpEff, showAttendanceHistory]);

    const markPresent = async () => {
        try {
            await axios.post(`${API}/attendance`, {}, { headers });
            fetchData(); // Refresh data to show "Present" status
        } catch (err) {
            alert(err.response?.data?.message || 'Error marking attendance');
        }
    };

    const getEfficiencyColor = (eff) => {
        if (eff < 40) return '#ef4444'; // Red
        if (eff < 75) return '#f59e0b'; // Yellow
        return '#22c55e'; // Green
    };

    const handleReassign = async (tid, empId) => {
        if (!tid || !empId) return;
        try {
            await axios.post(`${API}/tasks/${tid}/reassign`, { employee_id: empId }, { headers });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Reassignment failed");
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>

            {/* Welcome Banner - Full Width */}
            <div className="card" style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)', marginBottom: '30px', gap: '20px' }}>
                <div>
                    {['Admin', 'Manager', 'Brand Manager'].includes(user?.role) ? (
                        <>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Hi, {user?.role}!</h2>
                            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '1.1rem' }}>Great to have you back to oversee the operations.</p>
                        </>
                    ) : (
                        <>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Hi, {(user?.name || 'Explorer').split(' ')[0]}!</h2>
                            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '1.1rem' }}>Ready to conquer your tasks today?</p>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                </div>
            </div>



            {!isManagement && !isSpecialStaff && (
                <>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                        <div className="card" style={{ background: '#fff', borderRadius: '25px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0, fontWeight: 800 }}>Average Efficiency</h3>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b' }}>{effHistory.average_efficiency}%</span>
                                    </div>
                                </div>
                            </div>
                            <EfficiencyLineChart
                                data={effHistory.history}
                                color={getEfficiencyColor(effHistory.average_efficiency)}
                                onPointClick={(day) => {
                                    if (day.efficiency > 0) {
                                        navigate(`/daily-work-records?date=${day.date}`);
                                    }
                                }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>TOTAL TASKS</p>
                                    <p style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#334155' }}>{effHistory.total_tasks || 0}</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>COMPLETED</p>
                                    <p style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#22c55e' }}>{effHistory.completed_tasks || 0}</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>REWORKS</p>
                                    <p style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#ef4444' }}>{effHistory.total_reworks || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ flex: 1, padding: '20px', borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaChartLine /> {(effHistory.month_name || 'MONTHLY').toUpperCase()} EFFICIENCY RECORD
                                </h4>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                {effHistory.history.filter(h => h.attendance !== 'Upcoming').map((h, i) => (
                                    <div key={i}
                                        style={{ minWidth: '80px', textAlign: 'center', cursor: h.efficiency > 0 ? 'pointer' : 'default', transition: 'transform 0.2s' }}
                                        onMouseEnter={e => { if (h.efficiency > 0) e.currentTarget.style.transform = 'scale(1.05)' }}
                                        onMouseLeave={e => { if (h.efficiency > 0) e.currentTarget.style.transform = 'scale(1)' }}
                                        onClick={() => {
                                            if (h.efficiency > 0) {
                                                navigate(`/daily-work-records?date=${h.date}`);
                                            }
                                        }}
                                    >
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>{h.display_date}</div>
                                        <div style={{
                                            width: '45px', height: '45px', borderRadius: '50%',
                                            border: `3px solid ${h.efficiency > 0 ? getEfficiencyColor(h.efficiency) : '#ef4444'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto', fontSize: h.efficiency > 0 ? '0.8rem' : '0.65rem', fontWeight: 900,
                                            color: h.efficiency > 0 ? getEfficiencyColor(h.efficiency) : '#ef4444'
                                        }}>{h.efficiency > 0 ? `${h.efficiency}%` : 'Absent'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}


            {/* BRAND MANAGER DETAILED PERFORMANCE TABLE */}
            {
                ['Admin', 'Manager', 'Brand Manager'].includes(user?.role) && bmStats && (
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', color: '#1e293b', margin: 0, fontWeight: 900 }}>EMPLOYEE PERFORMANCE MONITOR</h3>
                                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Detailed breakdown of tasks, efficiency and attendance for {bmStats.month_name} 2026</p>
                            </div>
                            <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'right' }}>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800 }}>SYSTEM OVERALL EFFICIENCY</p>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: getEfficiencyColor(bmStats.overall_efficiency) }}>{bmStats.overall_efficiency}%</h2>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0, borderRadius: '25px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', background: '#fff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Employee</th>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Today</th>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assigned</th>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Completed</th>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Reworks</th>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Attendance</th>
                                        <th style={{ padding: '18px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Performance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bmStats.employees.map((emp) => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '18px 24px' }}>
                                                <div style={{ fontWeight: 800, color: '#1e293b' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{emp.role === 'Brand Manager' ? 'Dharshan' : emp.role}</div>
                                            </td>
                                            <td style={{ padding: '18px 24px' }}>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 900,
                                                    background: emp.today_tasks > 0 ? '#eef2ff' : '#f8fafc',
                                                    color: emp.today_tasks > 0 ? '#6366f1' : '#94a3b8'
                                                }}>
                                                    {emp.today_tasks || 0}
                                                </span>
                                            </td>
                                            <td style={{ padding: '18px 24px', fontWeight: 800, color: '#334155' }}>{emp.assigned}</td>
                                            <td style={{ padding: '18px 24px', fontWeight: 800, color: '#22c55e' }}>{emp.completed}</td>
                                            <td style={{ padding: '18px 24px', fontWeight: 800, color: '#ef4444' }}>{emp.reworks}</td>
                                            <td style={{ padding: '18px 24px' }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
                                                    background: emp.attendance === 'Present' ? '#f0fdf4' : '#fef2f2',
                                                    color: emp.attendance === 'Present' ? '#166534' : '#991b1b'
                                                }}>{emp.attendance}</span>
                                            </td>
                                            <td style={{ padding: '18px 24px' }}>
                                                <button
                                                    onClick={() => setSelectedEmpEff(emp)}
                                                    className="btn"
                                                    style={{
                                                        background: '#f1f5f9', color: '#6366f1', padding: '10px 18px',
                                                        borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
                                                        display: 'flex', alignItems: 'center', gap: '8px'
                                                    }}
                                                >
                                                    <FaChartLine /> View Efficiency
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* OVERALL CLIENT ANALYTICS SECTION */}
            {
                ['Admin', 'Manager', 'Brand Manager'].includes(user?.role) && bmStats && (
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', color: '#1e293b', margin: 0, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FaRocket style={{ color: '#6366f1' }} /> BRAND-WISE ACTIVITY ANALYTICS
                                </h3>
                                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Real-time production tracking by brand and deliverable type</p>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 0, borderRadius: '25px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', background: '#fff' }}>
                            {(() => {
                                const globalClientSummary = {};
                                const finishedList = ['Completed', 'Video Submitted', 'Submitted to BM'];

                                bmStats.employees.forEach(emp => {
                                    emp.detailed_tasks.forEach(task => {
                                        const client = task.client_name?.trim() || 'General';
                                        const type = task.activity_type?.trim() || 'Other';

                                        if (!globalClientSummary[client]) globalClientSummary[client] = {};
                                        if (!globalClientSummary[client][type]) {
                                            globalClientSummary[client][type] = { assigned: 0, completed: 0, pending: 0, pendingTasks: [] };
                                        }

                                        globalClientSummary[client][type].assigned += 1;
                                        if (finishedList.includes(task.status)) {
                                            globalClientSummary[client][type].completed += 1;
                                        } else {
                                            globalClientSummary[client][type].pending += 1;
                                            globalClientSummary[client][type].pendingTasks.push({ ...task, owner: emp.name });
                                        }
                                    });
                                });

                                const sendPriorityAlert = async (task, employee) => {
                                    try {
                                        await axios.post(`${API}/tasks/${task.id}/priority`, {}, { headers });
                                        alert(`🚀 1st PRIORITY SET!\n\nTo: ${employee}\nTask ID: ${task.activity_code}\n\nThis task is now HIGHLIGHTED at the top of the employee's dashboard.`);
                                        fetchData();
                                    } catch (err) {
                                        alert(err.response?.data?.error || "Failed to set priority");
                                    }
                                };

                                return (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                                                    <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', width: '25%' }}>Client Name</th>
                                                    <th style={{ padding: '20px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Activity Breakdown (Completed / Pending)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(globalClientSummary).map(([client, activities]) => (
                                                    <tr key={client} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '24px', verticalAlign: 'top', borderRight: '1px solid #f1f5f9', width: '25%' }}>
                                                            <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.2rem', marginBottom: '8px' }}>{client}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px' }}>
                                                                <FaListAlt style={{ color: '#6366f1' }} /> {Object.values(activities).reduce((a, b) => a + b.assigned, 0)} Total Deliverables
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '24px' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                                                {Object.entries(activities).map(([type, data]) => {
                                                                    const expandId = `${client}-${type}`;
                                                                    const isExpanded = expandedClient === expandId;

                                                                    return (
                                                                        <div key={type} style={{ background: '#fff', borderRadius: '25px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: isExpanded ? '0 15px 35px rgba(99,102,241,0.1)' : '0 2px 10px rgba(0,0,0,0.02)', transition: 'all 0.3s ease' }}>
                                                                            <div style={{ padding: '15px 20px', background: isExpanded ? '#f8faff' : '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>{type}</span>
                                                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: '10px' }}>{data.assigned} Items</span>
                                                                            </div>

                                                                            <div style={{ padding: '15px', display: 'flex', gap: '12px' }}>
                                                                                <div style={{ flex: 1, background: '#f0fdf4', padding: '12px', borderRadius: '18px', textAlign: 'center', border: '1px solid #dcfce7' }}>
                                                                                    <div style={{ fontSize: '0.6rem', color: '#166534', fontWeight: 800, marginBottom: '2px' }}>DONE</div>
                                                                                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#166534' }}>{data.completed}</div>
                                                                                </div>
                                                                                <div
                                                                                    onClick={() => setExpandedClient(isExpanded ? null : expandId)}
                                                                                    style={{ flex: 1, background: data.pending > 0 ? '#fff5f5' : '#f8fafc', padding: '12px', borderRadius: '18px', textAlign: 'center', cursor: data.pending > 0 ? 'pointer' : 'default', border: isExpanded ? '2px solid #ef4444' : '1px solid #fee2e2', transition: 'all 0.2s' }}
                                                                                >
                                                                                    <div style={{ fontSize: '0.6rem', color: data.pending > 0 ? '#991b1b' : '#94a3b8', fontWeight: 800, marginBottom: '2px' }}>PENDING</div>
                                                                                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: data.pending > 0 ? '#ef4444' : '#94a3b8' }}>{data.pending}</div>
                                                                                </div>
                                                                            </div>

                                                                            {isExpanded && data.pendingTasks.length > 0 && (
                                                                                <div className="animate-fade-in" style={{ padding: '0 15px 15px' }}>
                                                                                    <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '15px', display: 'flex', gap: '15px', overflowX: 'auto', border: '1px solid #f1f5f9', scrollbarWidth: 'thin' }}>
                                                                                        {data.pendingTasks.map((t, tid) => {
                                                                                            const isWithEditor = t.status.toLowerCase().includes('editor');
                                                                                            return (
                                                                                                <div key={tid} style={{ minWidth: '220px', background: '#fff', border: '1px solid #eef2ff', borderRadius: '18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                                                                                    <div style={{ background: '#312e81', color: '#fff', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.5px' }}>
                                                                                                        <span>ID: {t.activity_code?.toUpperCase()}</span>
                                                                                                        <FaRocket style={{ fontSize: '0.8rem', opacity: 0.9 }} />
                                                                                                    </div>
                                                                                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: '6px' }}>{t.status}</span>
                                                                                                        </div>
                                                                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                                                                                                            Assigned: <span style={{ color: '#1e293b', fontWeight: 800 }}>{t.owner}</span>
                                                                                                        </div>
                                                                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                                                            {!isWithEditor && (
                                                                                                                <button
                                                                                                                    onClick={() => sendPriorityAlert(t, t.owner)}
                                                                                                                    style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(99,102,241,0.2)' }}
                                                                                                                >
                                                                                                                    <FaExclamationTriangle style={{ fontSize: '0.7rem' }} /> Priority
                                                                                                                </button>
                                                                                                            )}
                                                                                                            <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #eef2ff', borderRadius: '10px', padding: '2px 8px', gap: '5px' }}>
                                                                                                                <FaUserEdit style={{ fontSize: '0.7rem', color: '#6366f1' }} title="Reassign Task" />
                                                                                                                <select
                                                                                                                    onChange={(e) => handleReassign(t.id, e.target.value)}
                                                                                                                    defaultValue=""
                                                                                                                    style={{ background: 'transparent', border: 'none', fontSize: '0.65rem', fontWeight: 800, color: '#1e293b', width: '100%', cursor: 'pointer', outline: 'none' }}
                                                                                                                >
                                                                                                                    <option value="" disabled>Reassign To...</option>
                                                                                                                    {bmStats.employees
                                                                                                                        .filter(e => e.role === 'Content Writer')
                                                                                                                        .map(e => (
                                                                                                                            <option key={e.id} value={e.id}>{e.name}</option>
                                                                                                                        ))
                                                                                                                    }
                                                                                                                </select>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )
            }

            {/* Employee Efficiency Modal */}
            {selectedEmpEff && (
                <>
                    <div className="modal-overlay" onClick={() => setSelectedEmpEff(null)} />
                    <div className="animate-scale-up" style={{
                        position: 'fixed', top: '50%', left: '50%', zIndex: 1001,
                        background: '#fff', padding: '25px', borderRadius: '30px',
                        width: '90%', maxWidth: '600px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div style={{ paddingRight: '40px' }}>
                                <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 900, color: '#1e293b' }}>
                                    {selectedEmpEff.name}'s Efficiency
                                </h2>
                                <p style={{ margin: '2px 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>Daily breakdown for {bmStats.month_name}</p>
                            </div>
                            <button onClick={() => setSelectedEmpEff(null)} style={{ background: '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '25px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>MONTHLY PERFORMANCE TREND</span>
                                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: getEfficiencyColor(selectedEmpEff.efficiency) }}>{selectedEmpEff.efficiency}% Avg</span>
                            </div>
                            <div style={{ height: '220px', width: '100%' }}>
                                <EfficiencyLineChart
                                    data={selectedEmpEff.history}
                                    color={getEfficiencyColor(selectedEmpEff.efficiency)}
                                    onPointClick={(day) => {
                                        if (day.efficiency > 0) {
                                            navigate(`/daily-work-records?date=${day.date}&emp_id=${selectedEmpEff.id}`);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '15px' }}>Daily efficiency record</h4>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
                                {selectedEmpEff.history?.filter(h => h.attendance !== 'Upcoming').map((h, i) => (
                                    <div key={i}
                                        style={{ textAlign: 'center', cursor: h.efficiency > 0 ? 'pointer' : 'default', transition: 'transform 0.2s' }}
                                        onClick={() => {
                                            if (h.efficiency > 0) {
                                                navigate(`/daily-work-records?date=${h.date}&emp_id=${selectedEmpEff.id}`);
                                            }
                                        }}
                                    >
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>{h.display_date}</div>
                                        <div style={{
                                            width: '38px', height: '38px', borderRadius: '50%',
                                            border: `2px solid ${h.efficiency > 0 ? getEfficiencyColor(h.efficiency) : '#ef4444'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto', fontSize: '0.7rem', fontWeight: 900,
                                            color: h.efficiency > 0 ? getEfficiencyColor(h.efficiency) : '#ef4444',
                                            background: '#fff'
                                        }}>{h.efficiency > 0 ? `${h.efficiency}%` : 'Abs'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setSelectedEmpEff(null)} className="btn" style={{ background: '#6366f1', color: '#fff', fontWeight: 800, width: '100%', padding: '14px', borderRadius: '15px' }}>
                            Close Analysis
                        </button>
                    </div>
                </>
            )}

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
                                    background: h.attendance === 'Present' ? '#f0fdf4' : (h.attendance === 'Absent' ? '#fef2f2' : '#f8fafc'),
                                    borderColor: h.attendance === 'Present' ? '#bcf0da' : (h.attendance === 'Absent' ? '#fecaca' : '#f1f5f9')
                                }}>
                                    <div className="attendance-date">{h.display_date}</div>
                                    <div className="attendance-status" style={{
                                        color: h.attendance === 'Present' ? '#166534' : (h.attendance === 'Absent' ? '#991b1b' : '#64748b')
                                    }}>
                                        {h.attendance.toUpperCase()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowAttendanceHistory(false)} className="btn" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 800, width: '100%', padding: '12px', borderRadius: '15px' }}>
                            Close Window
                        </button>
                    </div>
                </>
            )}
        </div >
    );
};

export default Dashboard;
