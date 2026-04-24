import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaUserCheck, FaCalendarAlt, FaTasks, FaPlus, FaTrash, FaEdit,
    FaExternalLinkAlt, FaTimes, FaPaperPlane, FaRedo
} from 'react-icons/fa';

const API = '/api/website';
const MASTER_API = '/api/master';

const STATUS_STYLE = {
    'Pending': { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
    'In Progress': { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' },
    'Waiting for Approval': { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
    'Completed': { bg: '#f0fdf4', color: '#166534', dot: '#22c55e' },
    'Rework': { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
};

const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE['Pending'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: s.bg, color: s.color, padding: '4px 12px',
            borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800
        }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
            {status.toUpperCase()}
        </span>
    );
};

export default function WebsiteTaskAssign() {
    const { token, user } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [employees, setEmployees] = useState([]);
    const [clients, setClients] = useState([]);
    const [activities, setActivities] = useState([]);
    const [dashData, setDashData] = useState({ employees: [] });
    const [showForm, setShowForm] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [reworkModal, setReworkModal] = useState(null);
    const [reworkReason, setReworkReason] = useState('');
    const [filterEmp, setFilterEmp] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        assigned_to: '',
        client_id: '',
        task_description: '',
        activity_id: '',
        minutes: 30,
    });

    const resetForm = () => setForm({
        date: selectedDate,
        assigned_to: '',
        client_id: '',
        task_description: '',
        activity_id: '',
        minutes: 30,
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes, clientRes, actRes, dashRes] = await Promise.all([
                axios.get(`${API}/employees`, { headers }),
                axios.get(`${MASTER_API}/clients`, { headers }),
                axios.get(`${API}/activities`, { headers }),
                axios.get(`${API}/head-dashboard?date=${selectedDate}`, { headers }),
            ]);
            setEmployees(empRes.data || []);
            setClients(clientRes.data || []);
            setActivities(actRes.data || []);
            setDashData(dashRes.data || { employees: [] });
        } catch (err) {
            console.error('Data fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token, selectedDate]);

    const handleActivityChange = (actId) => {
        const act = activities.find(a => a.id == actId);
        setForm(f => ({ ...f, activity_id: actId, minutes: act ? act.standard_minutes : 30 }));
    };

    const handleSubmit = async () => {
        if (!form.assigned_to || !form.task_description) {
            return alert('Employee and Task Description are required.');
        }
        setSaving(true);
        try {
            if (editTask) {
                await axios.patch(`${API}/tasks/${editTask.id}`, form, { headers });
                setMsg('✅ Task updated!');
            } else {
                await axios.post(`${API}/tasks`, form, { headers });
                setMsg('✅ Task assigned!');
            }
            setShowForm(false);
            setEditTask(null);
            resetForm();
            await fetchData();
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            alert(err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (taskId) => {
        try {
            await axios.patch(`${API}/tasks/${taskId}`, { status: 'Completed' }, { headers });
            await fetchData();
        } catch (err) { alert(err.response?.data?.error || err.message); }
    };

    const handleRework = async () => {
        if (!reworkReason.trim()) return alert('Please enter a rework reason.');
        try {
            await axios.patch(`${API}/tasks/${reworkModal.id}`, { status: 'Rework', rework_reason: reworkReason }, { headers });
            setReworkModal(null);
            setReworkReason('');
            await fetchData();
        } catch (err) { alert(err.response?.data?.error || err.message); }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await axios.delete(`${API}/tasks/${taskId}`, { headers });
            await fetchData();
        } catch (err) { alert(err.response?.data?.error || err.message); }
    };

    const openEdit = (task) => {
        setEditTask(task);
        setForm({
            date: task.date,
            assigned_to: task.assigned_to,
            client_id: task.client_id || '',
            task_description: task.task_description,
            activity_id: task.activity_id || '',
            minutes: task.minutes,
        });
        setShowForm(true);
    };

    const filteredEmployeesData = dashData.employees.filter(
        e => !filterEmp || String(e.id) === String(filterEmp)
    );

    const activityGroups = activities.reduce((acc, a) => {
        if (!acc[a.activity]) acc[a.activity] = [];
        acc[a.activity].push(a);
        return acc;
    }, {});

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FaPaperPlane style={{ color: '#6366f1' }} /> Team Task Board
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>
                        Assign daily tasks and approve team deliverables.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '15px', padding: '10px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <FaCalendarAlt style={{ color: '#6366f1' }} />
                        <input type="date" value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', fontWeight: 700, color: '#334155' }} />
                    </div>
                    <button
                        onClick={() => { setEditTask(null); resetForm(); setForm(f => ({ ...f, date: selectedDate })); setShowForm(true); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: '#fff', border: 'none', padding: '12px 24px',
                            borderRadius: '15px', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem',
                            boxShadow: '0 8px 16px rgba(99,102,241,0.25)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        <FaPlus /> Assign New Task
                    </button>
                </div>
            </div>

            {msg && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 24px', borderRadius: '14px', marginBottom: '24px', fontWeight: 700, border: '1px solid #bbf7d0' }}>{msg}</div>}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', background: '#fff', padding: '16px 24px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Filter Employee:</span>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
                    style={{ padding: '8px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', background: '#f8fafc', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                    <option value="">View All Employees</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>Loading tasks...</div>
            ) : filteredEmployeesData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: '25px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                    No tasks assigned for this date.
                </div>
            ) : filteredEmployeesData.map(emp => (
                <div key={emp.id} style={{ background: '#fff', borderRadius: '25px', border: '1px solid #f1f5f9', marginBottom: '32px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', gap: '20px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>
                            {emp.name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{emp.name}</h3>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{emp.total_tasks} tasks</span>
                                <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 800 }}>{emp.total_minutes} mins</span>
                            </div>
                        </div>
                        <button
                            onClick={() => { setForm(f => ({ ...f, date: selectedDate, assigned_to: emp.id })); setEditTask(null); setShowForm(true); }}
                            style={{ background: '#fff', color: '#6366f1', border: '1px solid #6366f1', padding: '8px 16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            + Add Task
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: '950px' }}>
                            <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', padding: '12px 24px' }}>
                                <div style={{ width: '40px' }}>#</div>
                                <div style={{ flex: 1.5 }}>Client</div>
                                <div style={{ flex: 3.5 }}>Task Detail</div>
                                <div style={{ width: '80px', textAlign: 'center' }}>Duration</div>
                                <div style={{ width: '90px', textAlign: 'center' }}>Proof</div>
                                <div style={{ flex: 1.5, textAlign: 'center' }}>Status</div>
                                <div style={{ flex: 2, textAlign: 'right' }}>Actions</div>
                            </div>

                            {emp.tasks.map((task, idx) => {
                                const isOverdue = selectedDate && task.date < selectedDate && ['Pending', 'In Progress', 'Rework'].includes(task.status);
                                return (
                                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fff1f0' : '#fff', padding: '12px 24px' }}>
                                        <div style={{ width: '40px', fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</div>
                                        <div style={{ flex: 1.5, fontWeight: 800, color: '#334155', fontSize: '13px' }}>{task.client_name || '—'}</div>
                                        <div style={{ flex: 3.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{task.task_description}</div>
                                                {(isOverdue || task.date !== selectedDate) && (
                                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>({task.date})</span>
                                                )}
                                                {isOverdue && (
                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#ff4d4f', color: '#fff', animation: 'pulse 2s infinite' }}>
                                                        OVERDUE
                                                    </span>
                                                )}
                                            </div>
                                            {task.activity && <div><span style={{ background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>{task.activity}</span></div>}
                                        </div>
                                        <div style={{ width: '80px', textAlign: 'center', fontWeight: 900, color: '#6366f1' }}>{task.minutes}m</div>
                                        <div style={{ width: '90px', textAlign: 'center' }}>
                                            {task.work_link ? (
                                                <a href={task.work_link} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}><FaExternalLinkAlt /></a>
                                            ) : '—'}
                                        </div>
                                        <div style={{ flex: 1.5, textAlign: 'center' }}>
                                            <StatusBadge status={task.status} />
                                        </div>
                                        <div style={{ flex: 2, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            {task.status === 'Waiting for Approval' && (
                                                <>
                                                    <button onClick={() => handleApprove(task.id)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>Approve</button>
                                                    <button onClick={() => { setReworkModal(task); setReworkReason(''); }} style={{ background: '#fff', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>Rework</button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => openEdit(task)}
                                                title="Edit Task"
                                                style={{
                                                    background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
                                                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                            >
                                                <FaEdit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(task.id)}
                                                title="Delete Task"
                                                style={{
                                                    background: '#fff1f2', color: '#ef4444', border: '1px solid #ffe4e6',
                                                    width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.borderColor = '#fecdd3'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#ffe4e6'; }}
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}

            {/* Modals (Task Form & Rework) logic here - omitted for brevity but should be same as WebsiteHeadDashboard */}
            {showForm && (
                <>
                    <div onClick={() => { setShowForm(false); setEditTask(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, background: '#fff', padding: '30px', borderRadius: '25px', width: '90%', maxWidth: '600px' }}>
                        <h2 style={{ margin: '0 0 20px' }}>{editTask ? 'Edit Task' : 'Assign New Task'}</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Employee</label>
                                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} style={inputStyle}>
                                    <option value="">Select Employee...</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Client</label>
                                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={inputStyle}>
                                    <option value="">Select Client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Minutes</label>
                                <input type="number" value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: parseInt(e.target.value) || 30 }))} style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Activity</label>
                                <select value={form.activity_id} onChange={e => handleActivityChange(e.target.value)} style={inputStyle}>
                                    <option value="">Select Activity...</option>
                                    {Object.entries(activityGroups).map(([group, items]) => (
                                        <optgroup key={group} label={group}>
                                            {items.map(a => <option key={a.id} value={a.id}>{a.activity_type}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Description</label>
                                <textarea value={form.task_description} onChange={e => setForm(f => ({ ...f, task_description: e.target.value }))} style={{ ...inputStyle, height: '80px' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, background: '#6366f1', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800 }}>
                                {saving ? 'Saving...' : 'Confirm'}
                            </button>
                            <button onClick={() => { setShowForm(false); setEditTask(null); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800 }}>Cancel</button>
                        </div>
                    </div>
                </>
            )}

            {reworkModal && (
                <>
                    <div onClick={() => setReworkModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, background: '#fff', padding: '30px', borderRadius: '25px', width: '90%', maxWidth: '400px' }}>
                        <h3>Send Rework</h3>
                        <textarea rows={4} placeholder="Feedback..." value={reworkReason} onChange={e => setReworkReason(e.target.value)} style={inputStyle} />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={handleRework} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800 }}>Send</button>
                            <button onClick={() => setReworkModal(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800 }}>Cancel</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box' };
