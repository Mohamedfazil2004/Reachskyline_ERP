import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaTasks, FaCheckCircle, FaExclamationTriangle, FaEdit, FaPlay, FaArrowLeft, FaInfoCircle, FaClock } from 'react-icons/fa';

const API = '/api/automation';

export default function DailyWorkRecords() {
    const { user, token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const qs = new URLSearchParams(location.search);
    const dateParam = qs.get('date');
    const displayDate = qs.get('display') || dateParam;
    const empIdParam = qs.get('emp_id');

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!dateParam) {
            navigate('/dashboard', { replace: true });
            return;
        }

        const fetchTasks = async () => {
            try {
                let data = [];
                const role = user?.role;

                if (role === 'Website Employee' || role === 'Website Head') {
                    // Website Team specifically
                    const url = empIdParam ? `/api/website/tasks?date=${dateParam}&employee_id=${empIdParam}&strict=true` : `/api/website/tasks?date=${dateParam}&strict=true`;
                    const res = await axios.get(url, { headers });
                    data = res.data || [];
                } else {
                    // Try Automation/Editor APIs
                    try {
                        const url = empIdParam ? `${API}/employee/daily-records?date=${dateParam}&employee_id=${empIdParam}` : `${API}/employee/daily-records?date=${dateParam}`;
                        const res = await axios.get(url, { headers });
                        data = res.data.tasks || [];

                        // If no tasks in automation, could be a fallback needed
                        if (data.length === 0) {
                            throw new Error("Empty tasks from automation");
                        }
                    } catch (e) {
                        try {
                            const url = empIdParam ? `${API}/tasks/my?date=${dateParam}&employee_id=${empIdParam}` : `${API}/tasks/my?date=${dateParam}`;
                            const res = await axios.get(url, { headers });
                            data = res.data.tasks || [];

                            if (data.length === 0) {
                                throw new Error("Empty tasks from content team");
                            }
                        } catch (e2) {
                            // Last ditch attempt at website API if others failed
                            const url = empIdParam ? `/api/website/tasks?date=${dateParam}&employee_id=${empIdParam}&strict=true` : `/api/website/tasks?date=${dateParam}&strict=true`;
                            const wRes = await axios.get(url, { headers });
                            data = wRes.data || [];
                        }
                    }
                }
                setTasks(data);
            } catch (err) {
                console.error("Task fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [dateParam, empIdParam, user]);

    const getStatusInfo = (status) => {
        switch (status) {
            case 'Pending':
            case 'Assigned':
                return { status: 'pending', approval: '-', color: '#c4c4c4' };
            case 'In Progress':
                return { status: 'in progress', approval: '-', color: '#fdab3d' };
            case 'Submitted to BM':
            case 'Waiting for Approval':
                return { status: 'completed', approval: 'waiting for approval', color: '#0086e6' };
            case 'Completed':
            case 'Done':
            case 'Assigned to Editor':
            case 'Video Submitted':
                return { status: 'approved', approval: 'approved', color: '#00c875' };
            case 'Rework Required (Writer)':
            case 'Rework Required (Editor)':
            case 'Rework':
                return { status: 'rework', approval: 'rework', color: '#e2445c' };
            default:
                return { status: status ? status.toLowerCase() : 'unknown', approval: '-', color: '#c4c4c4' };
        }
    };

    const calculateStats = () => {
        let pending = 0;
        let completed = 0;
        let approved = 0;

        tasks.forEach(t => {
            const info = getStatusInfo(t.status);
            if (info.status === 'pending' || info.status === 'in progress' || info.status === 'rework') {
                pending++;
            } else if (info.status === 'completed') {
                completed++;
            } else if (info.status === 'approved') {
                approved++;
            }
        });

        return { pending, completed, approved };
    };

    const stats = calculateStats();

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
        </div>
    );

    return (
        <div className="dashboard-wrapper animate-fade-in" style={{ paddingBottom: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                <button onClick={() => navigate(-1)} style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <FaArrowLeft />
                </button>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                    <FaTasks style={{ color: '#6366f1', marginRight: '10px' }} /> Work Records - {displayDate}
                </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Pending Tasks</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fdab3d' }}>{stats.pending}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Active in queue</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Waiting for Approval</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0086e6' }}>{stats.completed}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Submitted items</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Approved Tasks</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#00c875' }}>{stats.approved}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Successfully done</span>
                    </div>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Tasks</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>{tasks.length}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Today's workload</span>
                    </div>
                </div>
            </div>

            <div className="monday-board" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e1e4e8', overflow: 'hidden' }}>
                <div className="board-header" style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e1e4e8', gap: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Workspace</h2>
                    <span style={{ fontSize: '0.8rem', color: '#666', borderLeft: '1px solid #e1e4e8', paddingLeft: '15px' }}>{tasks.length} tasks</span>
                </div>

                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                        <img src="https://cdni.iconscout.com/illustration/premium/thumb/no-data-found-8867280-7228661.png" style={{ width: '120px', opacity: 0.5, marginBottom: '20px' }} alt="No data" />
                        <p>No tasks found for this date.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '1000px' }}>
                            <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e1e4e8', fontSize: '13px', color: '#666', fontWeight: 600, padding: '12px 0' }}>
                                <div style={{ width: '46px' }}></div>
                                <div style={{ flex: 3, paddingLeft: '10px' }}>Client</div>
                                <div style={{ flex: 1.5, textAlign: 'center' }}>Activity/Task</div>
                                <div style={{ flex: 1.5, textAlign: 'center' }}>Link</div>
                                <div style={{ flex: 2, textAlign: 'center' }}>Status</div>
                                <div style={{ flex: 2, textAlign: 'center' }}>Approval Status</div>
                                <div style={{ width: '40px' }}></div>
                            </div>

                            <div>
                                {tasks.map(t => <TaskRow key={t.id} task={t} getStatusInfo={getStatusInfo} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .dashboard-wrapper::-webkit-scrollbar { display: none; }
                .monday-board { font-family: -apple-system, Roboto, sans-serif; }
                .task-row:hover { background-color: #f5f6f8 !important; }
                .status-cell { height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: white; text-transform: uppercase; }
            `}</style>
        </div>
    );
}

function TaskRow({ task, getStatusInfo }) {
    const [expanded, setExpanded] = useState(false);

    const statusInfo = getStatusInfo(task.status);
    const accentColor = task.is_urgent ? '#ef4444' : (task.priority === 1 ? '#ef4444' : '#0086e6');

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
                <div style={{ width: '6px', background: accentColor }}></div>
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {task.is_urgent ? <FaExclamationTriangle style={{ color: '#ef4444' }} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0' }}></div>}
                </div>
                <div style={{ flex: 3, display: 'flex', alignItems: 'center', padding: '5px 10px', gap: '10px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.client_name || 'General Task'}
                    </span>
                </div>
                <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid #f1f1f1' }}>
                    <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 800, background: '#eef2ff', padding: '2px 8px', borderRadius: '4px', textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.activity_code || task.activity || task.activity_type || 'Task Detail'}
                    </span>
                </div>
                <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid #f1f1f1' }}>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {expanded ? 'Close' : 'View'}
                    </button>
                </div>
                <div style={{ flex: 2, borderLeft: '1px solid #f1f1f1' }}>
                    <div className="status-cell" style={{ background: statusInfo.color }}>
                        {statusInfo.status}
                    </div>
                </div>
                <div style={{ flex: 2, borderLeft: '1px solid #f1f1f1' }}>
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                        {statusInfo.approval}
                    </div>
                </div>
                <div style={{ width: '40px', borderLeft: '1px solid #f1f1f1' }}></div>
            </div>

            {expanded && (
                <div style={{ padding: '30px', background: '#fff', borderTop: '1px solid #e1e4e8', borderBottom: '1px solid #e1e4e8' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#333', fontWeight: 800 }}>
                            <FaTasks style={{ color: '#6366f1' }} /> Task View Mode (Read-Only)
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>TASK TITLE</label>
                                    <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: '#f8fafc', color: '#333', fontSize: '13px', fontWeight: 700 }}>
                                        {task.submission_title || task.task_description || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>DESCRIPTION</label>
                                    <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: '#f8fafc', color: '#333', fontSize: '13px', minHeight: '80px', whiteSpace: 'pre-wrap' }}>
                                        {task.submission_description || task.task_description || 'No description provided.'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>REFERENCE LINK</label>
                                    <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {task.submission_reference ? <a href={task.submission_reference} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: '12px', fontWeight: 700 }}>{task.submission_reference}</a> : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>CONTENT LINK (DOCS)</label>
                                    <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {task.submission_file_path ? <a href={task.submission_file_path} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: '12px', fontWeight: 700 }}>View Document</a> : (task.work_link ? <a href={task.work_link} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: '12px', fontWeight: 700 }}>Open Link</a> : 'N/A')}
                                    </div>
                                </div>
                                <div style={{ marginTop: '5px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>THUMBNAIL CONTENT</label>
                                    <div style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: '#f8fafc', color: '#333', fontSize: '13px', minHeight: '40px' }}>
                                        {task.submission_thumbnail || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {task.final_video_path && (
                            <div style={{ marginTop: '20px', background: '#f5f3ff', padding: '15px', borderRadius: '12px', border: '1px solid #c4b5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#5b21b6' }}>
                                    <FaPlay /> <b>Final Output Video</b>
                                </div>
                                <a href={`/${task.final_video_path}`} target="_blank" rel="noreferrer" style={{ background: '#7c3aed', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem' }}>View Video</a>
                            </div>
                        )}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px', fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Task ID: {task.id}</span>
                            <span>Work Date: {task.date || task.work_date || 'N/A'}</span>
                            <span>Assigned: {task.date || task.assigned_date || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
