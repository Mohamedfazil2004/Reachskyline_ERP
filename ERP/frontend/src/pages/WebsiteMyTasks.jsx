import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaCheckCircle, FaClock, FaExclamationTriangle,
    FaRedo, FaTasks, FaLightbulb, FaSync,
    FaCalendarAlt, FaFire, FaRocket, FaInfoCircle,
    FaPlay, FaDownload, FaPenNib, FaEdit, FaLink, FaExternalLinkAlt
} from 'react-icons/fa';

const API = '/api/website';

export default function WebsiteMyTasks() {
    const { token, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [msg, setMsg] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [totalMinutes, setTotalMinutes] = useState(0);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchTasks = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const res = await axios.get(`${API}/tasks?date=${selectedDate}`, { headers });
            const data = res.data || [];
            setTasks(data);
            setTotalMinutes(data.reduce((s, t) => s + (t.minutes || 0), 0));
        } catch (err) {
            console.error("Task fetch error", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks(true);
        const interval = setInterval(() => fetchTasks(false), 60000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    const handleUpdate = async (taskId, payload) => {
        setUpdating(taskId);
        try {
            await axios.patch(`${API}/tasks/${taskId}`, payload, { headers });
            setMsg('✅ Task submitted successfully!');
            setTimeout(() => setMsg(''), 4000);
            await fetchTasks(false);
        } catch (err) {
            alert(err.response?.data?.error || err.message);
        } finally {
            setUpdating(null);
        }
    };

    if (loading && tasks.length === 0) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
        </div>
    );

    return (
        <div className="dashboard-wrapper animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                    <FaTasks style={{ color: '#6366f1', marginRight: '10px' }} /> My Task Board
                </h2>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{
                        background: '#f8fafc', padding: '8px 20px', borderRadius: '15px',
                        border: '1px solid #e2e8f0', textAlign: 'right', display: 'flex', flexDirection: 'column'
                    }}>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Daily Workload</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: totalMinutes > 480 ? '#ef4444' : '#6366f1' }}>
                            {totalMinutes} / 480 mins
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <FaCalendarAlt style={{ color: '#64748b' }} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>
            </div>

            {msg && <div className="animate-fade-in" style={{ background: '#dcfce7', color: '#166534', padding: '12px 20px', borderRadius: '12px', marginBottom: '20px', fontWeight: 700 }}>{msg}</div>}

            <div className="monday-board" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e1e4e8', overflow: 'hidden' }}>
                <div className="board-header" style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e1e4e8', gap: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Workspace</h2>
                    <span style={{ fontSize: '0.8rem', color: '#666', borderLeft: '1px solid #e1e4e8', paddingLeft: '15px' }}>{tasks.length} tasks</span>
                </div>

                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                        <img src="https://cdni.iconscout.com/illustration/premium/thumb/no-data-found-8867280-7228661.png" alt="No data" style={{ width: '120px', opacity: 0.5, marginBottom: '20px' }} />
                        <p>No tasks found for this date.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '1000px' }}>
                            {/* Table Header */}
                            <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e1e4e8', fontSize: '13px', color: '#666', fontWeight: 600, padding: '12px 0' }}>
                                <div style={{ width: '46px' }}></div>
                                <div style={{ flex: 3, paddingLeft: '10px' }}>Client</div>
                                <div style={{ flex: 1.5, textAlign: 'center' }}>Activity Code</div>
                                <div style={{ flex: 1.5, textAlign: 'center' }}>Link</div>
                                <div style={{ flex: 2, textAlign: 'center' }}>Status</div>
                                <div style={{ flex: 2, textAlign: 'center' }}>Approval Status</div>
                                <div style={{ width: '40px' }}></div>
                            </div>

                            {/* Table Body */}
                            <div>
                                {tasks.map(t => (
                                    <TaskRow
                                        key={t.id}
                                        task={t}
                                        onUpdate={handleUpdate}
                                        updating={updating}
                                        selectedDate={selectedDate}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .dashboard-wrapper::-webkit-scrollbar { display: none; }
                .monday-board { font-family: -apple-system, Roboto, sans-serif; }
                .task-row:hover { background-color: #f5f6f8 !important; }
                .status-cell { height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: white; cursor: pointer; text-transform: uppercase; }
            `}</style>
        </div>
    );
}

function TaskRow({ task, onUpdate, updating, selectedDate }) {
    const [expanded, setExpanded] = useState(false);
    const [linkVal, setLinkVal] = useState(task.work_link || '');

    const getStatusInfo = (status) => {
        if (status === 'Rework') return { status: 'rework', approval: 'rework', color: '#e2445c' };
        if (status === 'Completed') return { status: 'approved', approval: 'approved', color: '#00c875' };
        if (status === 'Waiting for Approval') return { status: 'completed', approval: 'waiting for approval', color: '#0086e6' };
        if (status === 'In Progress') return { status: 'in progress', approval: '-', color: '#fdab3d' };
        return { status: 'pending', approval: '-', color: '#c4c4c4' };
    };

    const statusInfo = getStatusInfo(task.status);
    const accentColor = task.status === 'Rework' ? '#e2445c' : (task.status === 'Completed' ? '#00c875' : '#6366f1');

    const handleSubmit = () => {
        if (!linkVal || !linkVal.trim()) {
            alert('Please paste your work link before submitting.');
            return;
        }
        onUpdate(task.id, { work_link: linkVal.trim(), status: 'Waiting for Approval' });
    };

    const isCompleted = task.status === 'Completed';

    return (
        <div className="task-row-container" style={{ borderBottom: '1px solid #e1e4e8' }}>
            <div
                className="task-row"
                style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    minHeight: '48px',
                    background: expanded ? '#f8f9fa' : '#fff',
                    position: 'relative',
                    transition: 'background 0.2s'
                }}
            >
                {/* Accent Border */}
                <div style={{ width: '6px', background: accentColor }}></div>

                {/* Icon */}
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0' }}></div>
                </div>

                {/* Client & Date */}
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '5px 10px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.client_name || 'General Task'}
                        </span>
                        {task.date !== selectedDate && (
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, background: '#f8fafc', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                {task.date}
                            </span>
                        )}
                    </div>
                </div>

                {/* Activity Code (Using Activity name here) */}
                <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid #f1f1f1' }}>
                    <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 800, background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                        {task.activity || task.activity_type || 'N/A'}
                    </span>
                </div>

                {/* Link (Edit Button) */}
                <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid #f1f1f1' }}>
                    <button
                        onClick={() => {
                            if (!expanded && task.status === 'Pending') {
                                onUpdate(task.id, { status: 'In Progress' });
                            }
                            setExpanded(!expanded);
                        }}
                        style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <FaEdit size={10} /> {expanded ? 'Close' : 'Link'}
                    </button>
                </div>

                {/* Status */}
                <div style={{ flex: 2, borderLeft: '1px solid #f1f1f1' }}>
                    <div className="status-cell" style={{ background: statusInfo.color }}>
                        {statusInfo.status}
                    </div>
                </div>

                {/* Approval Status */}
                <div style={{ flex: 2, borderLeft: '1px solid #f1f1f1' }}>
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                        {statusInfo.approval}
                    </div>
                </div>

                <div style={{ width: '40px', borderLeft: '1px solid #f1f1f1' }}></div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div style={{ padding: '30px', background: '#fff', borderTop: '1px solid #e1e4e8', borderBottom: '1px solid #e1e4e8' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#333' }}>
                            <FaTasks style={{ color: '#6366f1' }} /> Update Task Details
                        </h4>

                        {task.rework_reason && (
                            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
                                <FaInfoCircle /> <b>Feedback:</b> {task.rework_reason}
                            </div>
                        )}

                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Task Description</div>
                            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>{task.task_description}</div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '10px', letterSpacing: '0.5px' }}>
                                Work / Submission Link
                            </label>
                            {isCompleted ? (
                                task.work_link ? (
                                    <a href={task.work_link} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 20px', borderRadius: '12px' }}>
                                        <FaExternalLinkAlt size={12} /> View Completed Work
                                    </a>
                                ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No link submitted</span>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <FaLink style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
                                        <input
                                            type="text"
                                            placeholder="Paste your completed work link here…"
                                            value={linkVal}
                                            onChange={e => setLinkVal(e.target.value)}
                                            style={{
                                                width: '100%', padding: '12px 15px 12px 40px',
                                                borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                                fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                                                color: '#334155', transition: 'all 0.2s',
                                                background: '#fff'
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                    {task.work_link && (
                                        <a href={task.work_link} target="_blank" rel="noopener noreferrer"
                                            title="View current link"
                                            style={{ background: '#f1f5f9', color: '#6366f1', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                            <FaExternalLinkAlt />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                        {!isCompleted && (
                            <button
                                onClick={handleSubmit}
                                disabled={updating === task.id}
                                style={{
                                    width: '100%',
                                    background: '#6366f1',
                                    color: '#fff',
                                    border: 'none', padding: '14px', borderRadius: '12px',
                                    fontWeight: 800, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    fontSize: '0.95rem', transition: 'all 0.2s',
                                    boxShadow: '0 8px 20px rgba(99,102,241,0.2)'
                                }}>
                                {updating === task.id ? 'Submitting…' : <><FaRocket /> Submit Final Work</>}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
