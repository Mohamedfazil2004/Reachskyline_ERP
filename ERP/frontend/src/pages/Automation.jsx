import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaRocket, FaCalendarAlt, FaUsers, FaBriefcase, FaListAlt,
    FaCheckCircle, FaClock, FaExclamationTriangle, FaPlay,
    FaTrash, FaPlus, FaSync, FaChartBar, FaEdit, FaSave, FaTimes
} from 'react-icons/fa';

const API = '/api/automation';

const STAGE_LABELS = {
    content_writing: '1. Content Writing',
    brand_manager_review: '2. BM Content Review',
    video_editing: '3. Video Production',
    brand_manager_video_review: '4. BM Video Review',
    completed: '✅ Completed',
};

const STATUS_COLORS = {
    'Pending': { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
    'Assigned': { bg: '#e0f2fe', color: '#0369a1', label: 'Assigned' },
    'In Progress': { bg: '#fef3c7', color: '#d97706', label: 'Working' },
    'Submitted to BM': { bg: '#f3e8ff', color: '#6b21a8', label: 'Review Pending' },
    'Rework Required (Writer)': { bg: '#fee2e2', color: '#b91c1c', label: 'Writer Rework' },
    'Assigned to Editor': { bg: '#dcfce7', color: '#15803d', label: 'With Editor' },
    'Video Submitted': { bg: '#fdf4ff', color: '#a21caf', label: 'Video Review' },
    'Rework Required (Editor)': { bg: '#fee2e2', color: '#b91c1c', label: 'Editor Rework' },
    'Completed': { bg: '#dcfce7', color: '#166534', label: 'Done' },
};

export default function Automation() {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState({});
    const [tasks, setTasks] = useState([]);
    const [deliverables, setDeliverables] = useState([]);
    const [jobWorks, setJobWorks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [taskBoardFilter, setTaskBoardFilter] = useState('');
    const [activityTypes, setActivityTypes] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedDate, setSelectedDate] = useState('2026-03-01');
    const [selectedMonth, setSelectedMonth] = useState(3);
    const [selectedYear, setSelectedYear] = useState(2026);

    const headers = { Authorization: `Bearer ${token}` };

    const api = useCallback((url, opts = {}) =>
        axios({ url: `${API}${url}`, headers, ...opts }), [token]);
    const masterApi = useCallback((url, opts = {}) =>
        axios({ url: `/api/master${url}`, headers, ...opts }), [token]);

    const fetchAll = useCallback(async () => {
        if (!token) return;
        try {
            const [statsR, tasksR, delivR, jwR, empR, availR, atR, clR] = await Promise.all([
                api(`/stats?date=${selectedDate}`),
                api(`/tasks?date=${selectedDate}`),
                api(`/monthly-deliverables?month=${selectedMonth}&year=${selectedYear}`),
                api('/job-work'),
                api('/employees'),
                api(`/employee-availability?date=${selectedDate}`),
                masterApi('/activity-types'),
                masterApi('/clients'),
            ]);
            setStats(statsR.data);
            setTasks(tasksR.data);
            setDeliverables(delivR.data);
            setJobWorks(jwR.data);
            setEmployees(empR.data);
            setAvailability(availR.data);
            setActivityTypes(atR.data);
            setClients(clR.data);
        } catch (err) {
            console.error(err);
        }
    }, [selectedDate, selectedMonth, selectedYear, token, api, masterApi]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const generateTasks = async () => {
        setGenerating(true);
        setMessage('');
        try {
            const res = await api('/generate-tasks', {
                method: 'POST',
                data: { date: selectedDate },
            });
            setMessage(`✅ ${res.data.message}`);
            fetchAll();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            setMessage('❌ ' + errorMsg);
            if (err.response?.data?.already_generated || err.response?.data?.restricted) {
                fetchAll();
            }
        } finally {
            setGenerating(false);
        }
    };

    // Unified approveTask is now handled inside TaskBoardTab
    // Removing old simplified approveTask helper

    const updateAvailability = async (empId, minutes) => {
        try {
            await api('/employee-availability', {
                method: 'POST',
                data: { employee_id: empId, date: selectedDate, available_minutes: parseInt(minutes) },
            });
            fetchAll();
        } catch (err) {
            alert('Failed to update availability');
        }
    };

    const TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaChartBar />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'deliverables', label: 'Monthly Plan', icon: <FaCalendarAlt />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'jobwork', label: 'Job Work', icon: <FaBriefcase />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'availability', label: 'Staff Availability', icon: <FaUsers />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'tasks', label: 'Task Board', icon: <FaListAlt />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'roughcuts', label: 'Rough Cuts', icon: <FaPlay />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'completed', label: 'Completed Projects', icon: <FaCheckCircle />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { id: 'activity', label: 'Activity Types', icon: <FaEdit />, roles: ['Admin'] },
    ].filter(t => t.roles.includes(user?.role));

    return (
        <div className="animate-fade-in" style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: '16px', padding: '24px 32px', marginBottom: '24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 24px rgba(99,102,241,0.3)'
            }}>
                <div>
                    <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
                        🚀 Social Media Automation
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: '0.9rem' }}>
                        REACH SKYLINE — Task Generation Engine
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '0.9rem' }}
                    />
                    <button
                        onClick={generateTasks}
                        disabled={generating || tasks.length > 0}
                        style={{
                            background: generating ? '#a78bfa' : (tasks.length > 0) ? '#e2e8f0' : '#fff',
                            color: generating ? '#fff' : (tasks.length > 0) ? '#94a3b8' : '#6366f1',
                            border: 'none', padding: '10px 20px', borderRadius: '10px',
                            fontWeight: 700, cursor: (tasks.length > 0) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center',
                            gap: '8px', fontSize: '0.9rem', boxShadow: (tasks.length > 0) ? 'none' : '0 2px 8px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <FaPlay /> {
                            generating ? 'Generating…' :
                                tasks.length > 0 ? 'Tasks Already Assigned' :
                                    'Generate Tasks'
                        }
                    </button>
                </div>
            </div>

            {message && (
                <div style={{
                    background: message.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                    color: message.startsWith('✅') ? '#166534' : '#991b1b',
                    padding: '12px 20px', borderRadius: '10px', marginBottom: '16px', fontWeight: 600
                }}>
                    {message}
                </div>
            )}

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: '4px', background: '#f1f5f9',
                borderRadius: '12px', padding: '4px', marginBottom: '24px', flexWrap: 'wrap'
            }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        flex: '1 1 auto', padding: '10px 16px', border: 'none',
                        borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                        background: activeTab === t.id ? '#fff' : 'transparent',
                        color: activeTab === t.id ? '#6366f1' : '#64748b',
                        boxShadow: activeTab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s'
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ─── DASHBOARD TAB ─── */}
            {activeTab === 'dashboard' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        {[
                            { label: 'Assigned Today', value: stats?.today_tasks || 0, color: '#6366f1', icon: <FaRocket /> },
                            { label: 'Pending Approval', value: stats?.pending_approval || 0, color: '#f59e0b', icon: <FaClock /> },
                            { label: 'Monthly Deliverables', value: stats?.monthly_target || 0, color: '#6366f1', icon: <FaCalendarAlt /> },
                            { label: 'Monthly Completed', value: stats?.monthly_completed || 0, color: '#22c55e', icon: <FaCheckCircle /> },
                        ].map(s => (
                            <div key={s.label} className="card" onClick={s.label === 'Pending Approval' ? () => setActiveTab('tasks') : undefined} style={{
                                borderLeft: `4px solid ${s.color}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '20px', cursor: s.label === 'Pending Approval' ? 'pointer' : 'default',
                                transition: 'transform 0.15s', transform: 'scale(1)'
                            }}
                                onMouseEnter={e => { if (s.label === 'Pending Approval') e.currentTarget.style.transform = 'scale(1.02)'; }}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 4px' }}>{s.label}</p>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: s.color }}>{s.value}</h2>
                                    {s.label === 'Pending Approval' && s.value > 0 && (
                                        <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>Click to Review →</p>
                                    )}
                                </div>
                                <div style={{ fontSize: '1.8rem', color: s.color, opacity: 0.2 }}>{s.icon}</div>
                            </div>
                        ))}
                    </div>

                    {/* Pending Review Alert Banner */}
                    {(stats?.pending_approval || 0) > 0 && (
                        <div style={{
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            border: '2px solid #f59e0b',
                            borderRadius: '12px', padding: '16px 24px', marginBottom: '24px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            boxShadow: '0 4px 12px rgba(245,158,11,0.2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '1.8rem' }}>📬</span>
                                <div>
                                    <div style={{ fontWeight: 800, color: '#92400e', fontSize: '1rem' }}>
                                        {stats?.pending_approval || 0} Task{(stats?.pending_approval || 0) > 1 ? 's' : ''} Awaiting Your Review!
                                    </div>
                                    <div style={{ color: '#b45309', fontSize: '0.85rem' }}>
                                        Employees have submitted content — review and approve to keep the workflow moving.
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const filter = (stats?.pending_editor_approval > 0) ? 'Video Submitted' : 'Submitted to BM';
                                    setActiveTab('tasks');
                                    setTaskBoardFilter(filter);
                                }}
                                style={{
                                    background: '#f59e0b', color: '#fff', border: 'none',
                                    padding: '12px 24px', borderRadius: '10px', fontWeight: 800,
                                    cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 8px rgba(245,158,11,0.4)'
                                }}
                            >
                                🔍 Review Now →
                            </button>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '12px' }}>Monthly Progress — {new Date(selectedDate).toLocaleString('default', { month: 'long' })} {selectedYear}</h3>
                        <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '16px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${stats?.monthly_target ? Math.round(((stats?.monthly_completed || 0) / stats?.monthly_target) * 100) : 0}%`,
                                height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                borderRadius: '999px', transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                            <span>{stats?.monthly_completed || 0} completed</span>
                            <span>{stats?.monthly_remaining || 0} remaining</span>
                        </div>
                    </div>

                    {/* Today's Tasks */}
                    <div className="card">
                        <h3 style={{ marginBottom: '16px' }}>📋 Today's Tasks — {selectedDate}</h3>
                        {tasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                No tasks generated for this date yet. Click "Generate Tasks" to begin.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                                        <th style={{ padding: '10px 8px' }}>Code</th>
                                        <th>Client</th>
                                        <th>Activity</th>
                                        <th>Assigned To</th>
                                        <th>Stage</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc', background: ['Submitted to BM', 'Video Submitted'].includes(t.status) ? '#fffbeb' : 'transparent' }}>
                                            <td style={{ padding: '10px 8px', fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>{t.activity_code}</td>
                                            <td>{t.client_name}</td>
                                            <td>{t.activity_type_name}</td>
                                            <td>
                                                {['Assigned to Editor', 'Video Submitted', 'Rework Required (Editor)', 'Completed'].includes(t.status) || ['video_editing', 'brand_manager_video_review', 'completed'].includes(t.current_stage)
                                                    ? (t.video_editor_name || t.assigned_employee_name)
                                                    : t.assigned_employee_name || '—'}
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{STAGE_LABELS[t.current_stage]}</td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                                                    ...(STATUS_COLORS[t.status] || { bg: '#f1f5f9', color: '#475569' }),
                                                    background: STATUS_COLORS[t.status]?.bg
                                                }}>
                                                    {t.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                {['Submitted to BM', 'Video Submitted'].includes(t.status) && (
                                                    <button onClick={() => { setActiveTab('tasks'); setTaskBoardFilter(t.status); }} style={{
                                                        background: '#f59e0b', color: '#fff', border: 'none',
                                                        padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700
                                                    }}>⚡ Review Now</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ─── MONTHLY DELIVERABLES TAB ─── */}
            {activeTab === 'deliverables' && (
                <DeliverablesTab
                    deliverables={deliverables} clients={clients}
                    activityTypes={activityTypes} selectedMonth={selectedMonth}
                    selectedYear={selectedYear} setSelectedMonth={setSelectedMonth}
                    setSelectedYear={setSelectedYear} api={api} fetchAll={fetchAll}
                />
            )}

            {/* ─── JOB WORK TAB ─── */}
            {activeTab === 'jobwork' && (
                <JobWorkTab jobWorks={jobWorks} clients={clients}
                    activityTypes={activityTypes} api={api} fetchAll={fetchAll}
                    selectedDate={selectedDate} />
            )}

            {/* ─── AVAILABILITY TAB ─── */}
            {activeTab === 'availability' && (
                <AvailabilityTab
                    availability={availability} selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate} updateAvailability={updateAvailability}
                />
            )}

            {/* ─── TASK BOARD TAB ─── */}
            {activeTab === 'tasks' && (
                <TaskBoardTab api={api} defaultFilter={taskBoardFilter} />
            )}

            {/* ─── COMPLETED PROJECTS TAB ─── */}
            {activeTab === 'roughcuts' && <RoughCutTab employees={employees} api={api} token={token} user={user} />}
            {activeTab === 'completed' && <CompletedProjectsTab api={api} />}

            {/* ─── ACTIVITY TYPES TAB ─── */}
            {activeTab === 'activity' && (
                <ActivityTypesTab activityTypes={activityTypes} masterApi={masterApi} fetchAll={fetchAll} />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function DeliverablesTab({ deliverables, clients, activityTypes, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, api, fetchAll }) {
    const [form, setForm] = useState({ client_id: '', activity_type_id: '', monthly_target: 0 });
    const [msg, setMsg] = useState('');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const submit = async () => {
        if (!form.client_id || !form.activity_type_id) return setMsg('Select client and activity type');
        try {
            await api('/monthly-deliverables', {
                method: 'POST',
                data: { ...form, month: selectedMonth, year: selectedYear, monthly_target: parseInt(form.monthly_target) }
            });
            setMsg('✅ Saved!'); fetchAll();
        } catch (err) { setMsg('❌ ' + (err.response?.data?.error || err.message)); }
    };

    const del = async (id) => {
        if (!confirm('Delete this deliverable?')) return;
        await api(`/monthly-deliverables/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}><FaPlus /> Add Deliverable</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={form.activity_type_id} onChange={e => setForm({ ...form, activity_type_id: e.target.value })}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <option value="">Select Activity Type</option>
                            {activityTypes.map(a => <option key={a.id} value={a.id}>[{a.code_letter}] {a.name}</option>)}
                        </select>
                        <input type="number" placeholder="Monthly Target" value={form.monthly_target}
                            onChange={e => setForm({ ...form, monthly_target: e.target.value })}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} min="0" />
                        <button onClick={submit} style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                            border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700
                        }}>Save Deliverable</button>
                        {msg && <p style={{ fontSize: '0.85rem', color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>{msg}</p>}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Monthly Deliverables — {months[selectedMonth - 1]} {selectedYear}</h3>
                    {deliverables.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No deliverables for this month</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 8px' }}>Client</th>
                                    <th>Activity</th>
                                    <th>Target</th>
                                    <th>Done</th>
                                    <th>Left</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliverables.map(d => (
                                    <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '10px 8px' }}>{d.client_name}</td>
                                        <td><span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600 }}>{d.activity_code_letter} — {d.activity_type_name}</span></td>
                                        <td style={{ fontWeight: 700 }}>{d.monthly_target}</td>
                                        <td style={{ color: '#22c55e', fontWeight: 600 }}>{d.completed_count}</td>
                                        <td style={{ color: d.remaining > 0 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>{d.remaining}</td>
                                        <td><button onClick={() => del(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FaTrash /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

function JobWorkTab({ jobWorks, clients, activityTypes, api, fetchAll, selectedDate }) {
    const [form, setForm] = useState({ client_id: '', activity_type_id: '', description: '', deadline: '', assigned_employee_id: '', assignment_time: '' });
    const [msg, setMsg] = useState('');
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api('/employees');
                // Filter to show only Content Writers
                const writers = res.data.filter(emp => emp.role === 'Content Writer');
                setEmployees(writers);
            } catch (err) {
                console.error("Failed to fetch employees", err);
            }
        };
        fetchEmployees();
    }, [api]);

    const submit = async () => {
        if (!form.client_id || !form.activity_type_id || !form.description || !form.assigned_employee_id)
            return setMsg('All fields including Employee assignment are required');

        try {
            // Combine selectedDate with the time string
            let assignment_full = null;
            if (form.assignment_time) {
                assignment_full = `${selectedDate}T${form.assignment_time}:00`;
            }

            await api('/job-work', {
                method: 'POST',
                data: { ...form, assignment_time: assignment_full }
            });
            setMsg('✅ Job Work Added!');
            setForm({ client_id: '', activity_type_id: '', description: '', deadline: '', assigned_employee_id: '', assignment_time: '' });
            fetchAll();
        } catch (err) { setMsg('❌ ' + (err.response?.data?.error || err.message)); }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            <div className="card">
                <h3 style={{ marginBottom: '16px' }}><FaPlus /> New Job Work</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={form.activity_type_id} onChange={e => setForm({ ...form, activity_type_id: e.target.value })}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <option value="">Select Activity</option>
                        {activityTypes.map(a => <option key={a.id} value={a.id}>[{a.code_letter}] {a.name}</option>)}
                    </select>
                    <select value={form.assigned_employee_id} onChange={e => setForm({ ...form, assigned_employee_id: e.target.value })}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <option value="">Assign to Employee</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <textarea placeholder="Description / Instructions..." value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        rows={3} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical' }} />
                    <div>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Deadline (optional)</label>
                        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Assignment Time (Visible only after this time today)</label>
                        <input type="time" value={form.assignment_time} onChange={e => setForm({ ...form, assignment_time: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <button onClick={submit} style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                        border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700
                    }}>⚡ Add Job Work (High Priority)</button>
                    {msg && <p style={{ fontSize: '0.85rem', color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>{msg}</p>}
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '16px' }}>All Job Work</h3>
                {jobWorks.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No job work items</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {jobWorks.map(jw => (
                            <div key={jw.id} style={{
                                border: `2px solid ${jw.status.toLowerCase() === 'pending' ? '#fde68a' : jw.status.toLowerCase() === 'assigned' ? '#bfdbfe' : '#bbf7d0'}`,
                                borderRadius: '10px', padding: '14px', background: '#fafafa'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span style={{ fontWeight: 700, color: '#6366f1' }}>{jw.client_name}</span>
                                        <span style={{ margin: '0 8px', color: '#64748b' }}>·</span>
                                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>{jw.activity_type_name}</span>
                                        {jw.deadline && <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: '#ef4444' }}>📅 {jw.deadline}</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                                            background: jw.status.toLowerCase() === 'pending' ? '#fef9c3' : jw.status.toLowerCase() === 'assigned' ? '#dbeafe' : '#dcfce7',
                                            color: jw.status.toLowerCase() === 'pending' ? '#854d0e' : jw.status.toLowerCase() === 'assigned' ? '#1e40af' : '#166534'
                                        }}>{jw.status}</span>
                                        <button onClick={async () => { await api(`/job-work/${jw.id}`, { method: 'DELETE' }); fetchAll(); }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FaTrash /></button>
                                    </div>
                                </div>
                                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#64748b' }}>{jw.description}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AvailabilityTab({ availability, selectedDate, setSelectedDate, updateAvailability }) {
    const [edits, setEdits] = useState({});

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>👥 Employee Daily Availability</h3>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            </div>
            <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '0.875rem' }}>
                Set available work minutes per employee. Full-time = 480 min, Part-time = 240 min.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left', fontSize: '0.85rem' }}>
                        <th style={{ padding: '10px' }}>Employee</th>
                        <th>Role</th>
                        <th>Available (mins)</th>
                        <th>Used (mins)</th>
                        <th>Remaining</th>
                        <th>Update</th>
                    </tr>
                </thead>
                <tbody>
                    {availability.filter(emp => !['Admin', 'Brand Manager'].includes(emp.role)).map(emp => (
                        <tr key={emp.employee_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '12px 10px', fontWeight: 600 }}>{emp.employee_name}</td>
                            <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{emp.role}</td>
                            <td>
                                <input type="number"
                                    value={edits[emp.employee_id] !== undefined ? edits[emp.employee_id] : emp.available_minutes}
                                    onChange={e => setEdits({ ...edits, [emp.employee_id]: e.target.value })}
                                    style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}
                                    min="0" />
                            </td>
                            <td style={{ color: '#6366f1', fontWeight: 600 }}>{emp.used_minutes}</td>
                            <td style={{ color: emp.remaining_minutes === 0 ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
                                {emp.remaining_minutes} {emp.remaining_minutes === 0 ? '(MATCHED)' : ''}
                            </td>
                            <td>
                                <button onClick={() => updateAvailability(emp.employee_id, edits[emp.employee_id] ?? emp.available_minutes)}
                                    style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                                    <FaSave /> Save
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TaskBoardTab({ api, defaultFilter }) {
    const [allTasks, setAllTasks] = useState([]);
    const [statusFilter, setStatusFilter] = useState(defaultFilter || '');
    const [expandedTask, setExpandedTask] = useState(null);
    const [reworkNote, setReworkNote] = useState('');
    const [selectedEditor, setSelectedEditor] = useState('');
    const [editors, setEditors] = useState([]);
    const [logs, setLogs] = useState([]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await api(`/tasks/all${statusFilter ? `?status=${statusFilter}` : ''}`);
            setAllTasks(res.data);
        } catch (err) { console.error(err); }
    }, [api, statusFilter]);

    const fetchEditors = useCallback(async () => {
        const res = await api('/editors');
        setEditors(res.data);
    }, [api]);

    const fetchLogs = async (tid) => {
        try {
            const res = await api(`/tasks/${tid}/logs`);
            setLogs(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchTasks();
        fetchEditors();
        // Auto-refresh every 15 seconds to catch new submissions
        const interval = setInterval(fetchTasks, 15000);
        return () => clearInterval(interval);
    }, [fetchTasks, fetchEditors, statusFilter]);


    const handleContentAction = async (tid, action) => {
        try {
            await api(`/tasks/${tid}/bm-action`, {
                method: 'POST',
                data: { action, notes: reworkNote, editor_id: selectedEditor }
            });
            setExpandedTask(null); setReworkNote(''); setSelectedEditor('');
            fetchTasks();
        } catch (err) { alert(err.response?.data?.error || 'Action failed'); }
    };

    const handleVideoAction = async (tid, action) => {
        try {
            await api(`/tasks/${tid}/bm-video-action`, {
                method: 'POST',
                data: { action, notes: reworkNote }
            });
            setExpandedTask(null); setReworkNote('');
            fetchTasks();
        } catch (err) { alert(err.response?.data?.error || 'Action failed'); }
    };

    const statuses = ['', 'Assigned', 'In Progress', 'Submitted to BM', 'Rework Required (Writer)', 'Assigned to Editor', 'Video Submitted', 'Rework Required (Editor)', 'Completed'];

    return (
        <div className="card">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <h3 style={{ marginRight: '16px' }}>📋 Workflow Task Board</h3>
                {statuses.map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                        padding: '6px 14px', borderRadius: '999px', border: '1px solid #e2e8f0',
                        background: statusFilter === s ? '#6366f1' : '#fff',
                        color: statusFilter === s ? '#fff' : '#475569',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem'
                    }}>{s || 'All'}</button>
                ))}
                <button onClick={fetchTasks} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', color: '#6366f1' }}><FaSync /></button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                        {['Code', 'Date', 'Client', 'Assigned To', 'Priority', 'Stage', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '12px 10px' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {allTasks.map(t => (
                        <React.Fragment key={t.id}>
                            <tr style={{ borderBottom: '1px solid #f8fafc', background: expandedTask === t.id ? '#f5f7ff' : 'transparent' }}>
                                <td style={{ padding: '12px 10px', fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>{t.activity_code}</td>
                                <td style={{ color: '#64748b' }}>{t.assigned_date}</td>
                                <td>{t.client_name}</td>
                                <td>
                                    {['Assigned to Editor', 'Video Submitted', 'Rework Required (Editor)', 'Completed'].includes(t.status) || ['video_editing', 'brand_manager_video_review', 'completed'].includes(t.current_stage)
                                        ? (t.video_editor_name || t.assigned_employee_name)
                                        : t.assigned_employee_name || '—'}
                                </td>
                                <td>
                                    <button
                                        onClick={async () => {
                                            const newP = t.priority === 1 ? 3 : 1;
                                            await api(`/tasks/${t.id}/priority`, { method: 'PATCH', data: { priority: newP } });
                                            fetchTasks();
                                        }}
                                        style={{
                                            padding: '2px 8px', borderRadius: '4px', border: '1px solid currentColor',
                                            background: t.priority === 1 ? '#fee2e2' : 'transparent',
                                            color: t.priority === 1 ? '#ef4444' : '#94a3b8',
                                            fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer'
                                        }}
                                    >
                                        {t.priority === 1 ? '🔥 URGENT' : 'Normal'}
                                    </button>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{STAGE_LABELS[t.current_stage]}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                                        background: STATUS_COLORS[t.status]?.bg || '#f1f5f9',
                                        color: STATUS_COLORS[t.status]?.color || '#475569'
                                    }}>{t.status}</span>
                                </td>
                                <td>
                                    {['Submitted to BM', 'Video Submitted'].includes(t.status) ? (
                                        <button onClick={() => { setExpandedTask(expandedTask === t.id ? null : t.id); fetchLogs(t.id); }}
                                            style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {expandedTask === t.id ? 'Close' : 'Review'}
                                        </button>
                                    ) : (
                                        <button onClick={() => { setExpandedTask(expandedTask === t.id ? null : t.id); fetchLogs(t.id); }} style={{ background: 'none', border: '1px solid #e2e8f0', color: '#64748b', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>Details</button>
                                    )}
                                </td>
                            </tr>
                            {expandedTask === t.id && (
                                <tr>
                                    <td colSpan={8} style={{ padding: '24px', background: '#f5f7ff', borderBottom: '2px solid #e0e7ff' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                                            <div>
                                                {/* Content Review Section */}
                                                <div style={{ marginBottom: '24px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                    <h4 style={{ margin: '0 0 15px', color: '#1e293b' }}>📝 Submitted Content Details</h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                        <div>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>TITLE</label>
                                                            <p style={{ margin: '4px 0', fontSize: '0.95rem', fontWeight: 600 }}>{t.submission_title || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>THUMBNAIL CONCEPT</label>
                                                            <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>{t.submission_thumbnail || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginTop: '15px' }}>
                                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>VISUAL DESCRIPTION (FOR EDITOR)</label>
                                                        <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#475569' }}>{t.submission_description || 'N/A'}</p>
                                                    </div>
                                                    <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                                                        {t.submission_file_path && (
                                                            <a href={t.submission_file_path.startsWith('http') ? t.submission_file_path : `/${t.submission_file_path}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                                                                📄 Content Link
                                                            </a>
                                                        )}
                                                        {t.submission_reference && (
                                                            <a href={t.submission_reference} target="_blank"
                                                                style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                                                                🔗 Reference
                                                            </a>
                                                        )}
                                                        {t.submission_thumbnail_path && (
                                                            <a href={`/${t.submission_thumbnail_path}`} target="_blank"
                                                                style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                                                                🖼️ Writer Thumbnail
                                                            </a>
                                                        )}
                                                        {t.rough_cut_video_path && (
                                                            <a href={`/${t.rough_cut_video_path}`} target="_blank"
                                                                style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                                                                🎬 Rough Cut
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Video Review Section */}
                                                {(t.status === 'Video Submitted' || t.status === 'Completed') && (
                                                    <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                        <h4 style={{ margin: '0 0 15px', color: '#1e293b' }}>🎬 Produced Assets</h4>
                                                        {t.final_video_path || t.final_thumbnail_path ? (
                                                            <div style={{ display: 'grid', gridTemplateColumns: t.final_video_path && t.final_thumbnail_path ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '15px' }}>
                                                                {t.final_video_path && (
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Final Video</p>
                                                                        <video
                                                                            src={`/${t.final_video_path}`}
                                                                            controls
                                                                            style={{ width: '100%', borderRadius: '8px', maxHeight: '220px', background: '#000' }}
                                                                        />
                                                                        <a href={`/${t.final_video_path}`} target="_blank" download style={{ display: 'block', fontSize: '0.8rem', marginTop: '8px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>⬇ Download Video</a>
                                                                    </div>
                                                                )}
                                                                {t.final_thumbnail_path && (
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Thumbnail Image</p>
                                                                        <img
                                                                            src={`/${t.final_thumbnail_path}`}
                                                                            alt="Thumbnail"
                                                                            style={{ width: '100%', borderRadius: '8px', maxHeight: '220px', objectFit: 'contain', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                                                        />
                                                                        <a href={`/${t.final_thumbnail_path}`} target="_blank" download style={{ display: 'block', fontSize: '0.8rem', marginTop: '8px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>⬇ Download Image</a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : <p style={{ color: '#94a3b8' }}>Assets not yet uploaded.</p>}
                                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                                                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 4px', fontWeight: 700 }}>EDITOR NOTES:</p>
                                                            <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: 0 }}>{t.editor_notes || 'No notes provided by editor.'}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Audit Trail */}
                                                <div style={{ marginTop: '20px' }}>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>AUDIT TRAIL</label>
                                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                        {logs.map(l => (
                                                            <div key={l.id} style={{ fontSize: '0.75rem', marginBottom: '8px', borderLeft: '2px solid #e2e8f0', paddingLeft: '8px' }}>
                                                                <span style={{ fontWeight: 700 }}>{l.action}</span> · <span style={{ color: '#64748b' }}>{l.user_name}</span> · <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{new Date(l.created_at + (l.created_at.endsWith('Z') ? '' : 'Z')).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e0e7ff' }}>
                                                <h4 style={{ marginBottom: '16px' }}>Decision Center</h4>

                                                {t.status === 'Submitted to BM' && (
                                                    <>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>1. Assign Video Editor</label>
                                                        <select value={selectedEditor} onChange={e => setSelectedEditor(e.target.value)}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                                            <option value="">Select Editor...</option>
                                                            {editors.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                                        </select>

                                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>2. Feedback / Rework Instructions</label>
                                                        <textarea value={reworkNote} onChange={e => setReworkNote(e.target.value)} rows={3}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', resize: 'none' }} placeholder="Required for Rework..." />

                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button onClick={() => handleContentAction(t.id, 'approve')} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>✅ Approve Content</button>
                                                            <button onClick={() => handleContentAction(t.id, 'rework')} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>🔄 Request Rework</button>
                                                        </div>
                                                    </>
                                                )}

                                                {t.status === 'Video Submitted' && (
                                                    <>
                                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Video Feedback</label>
                                                        <textarea value={reworkNote} onChange={e => setReworkNote(e.target.value)} rows={3}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', resize: 'none' }} placeholder="Required for Rework..." />

                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button onClick={() => handleVideoAction(t.id, 'approve')} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>✅ Approve Video</button>
                                                            <button onClick={() => handleVideoAction(t.id, 'rework')} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>🔄 Request Rework</button>
                                                        </div>
                                                    </>
                                                )}

                                                {['Assigned', 'In Progress', 'Assigned to Editor'].includes(t.status) && (
                                                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                                        <FaClock style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }} />
                                                        <p>Waiting for employee to submit work.</p>
                                                    </div>
                                                )}

                                                {t.status === 'Completed' && (
                                                    <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', borderRadius: '10px' }}>
                                                        <FaCheckCircle style={{ fontSize: '2rem', color: '#22c55e', marginBottom: '10px' }} />
                                                        <p style={{ color: '#166534', fontWeight: 700 }}>Task Workflow Complete</p>
                                                        <p style={{ fontSize: '0.8rem', color: '#15803d' }}>Approved and closed by Brand Manager on {new Date(t.completed_at).toLocaleDateString()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


function CompletedProjectsTab({ api }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCompleted = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api('/tasks/all?status=Completed');
            console.log("Completed projects fetched:", res.data);
            setProjects(res.data);
        } catch (err) {
            console.error("Failed to fetch completed projects:", err);
            alert("Error fetching completed projects: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => { fetchCompleted(); }, [fetchCompleted]);

    const filtered = projects.filter(p => {
        const term = searchTerm.toLowerCase();
        return (
            (p.activity_code?.toLowerCase() || '').includes(term) ||
            (p.client_name?.toLowerCase() || '').includes(term) ||
            (p.submission_title?.toLowerCase() || '').includes(term) ||
            (p.title?.toLowerCase() || '').includes(term)
        );
    });

    if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading projects...</div>;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>📂 Project Archive (Completed)</h3>
                <input
                    type="text"
                    placeholder="Search by code, client or title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '300px' }}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <FaCheckCircle style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }} />
                    <p>No completed projects found matching your search.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                    {filtered.map(p => (
                        <div key={p.id} className="card" style={{ padding: '20px', borderTop: '4px solid #16a34a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '1rem' }}>{p.activity_code}</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Completed: {new Date(p.completed_at).toLocaleDateString()}</span>
                            </div>
                            <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>{p.client_name}</h4>
                            <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>{p.submission_title || 'Untitled'}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>PRODUCTION ASSETS</label>
                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {p.final_video_path && (
                                            <a href={`/${p.final_video_path}`} target="_blank" download style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>🎬 Final Video</a>
                                        )}
                                        {p.final_thumbnail_path && (
                                            <a href={`/${p.final_thumbnail_path}`} target="_blank" download style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>🖼️ Thumbnail Image</a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>RESOURCES</label>
                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {p.submission_file_path && (
                                            <a href={p.submission_file_path.startsWith('http') ? p.submission_file_path : `/${p.submission_file_path}`}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none' }}>
                                                📄 {p.submission_file_path.startsWith('http') ? 'Google Doc' : 'Approved Guide'}
                                            </a>
                                        )}
                                        {p.submission_reference && (
                                            <a href={p.submission_reference} target="_blank" style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none' }}>🔗 Ref Link</a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                <p style={{ margin: '0 0 4px' }}><b>Thumbnail Concept:</b> {p.submission_thumbnail || 'N/A'}</p>
                                <p style={{ margin: 0 }}><b>Description/Visual:</b> {p.submission_description || 'N/A'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ActivityTypesTab({ activityTypes, masterApi, fetchAll }) {
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [msg, setMsg] = useState('');

    const save = async () => {
        try {
            await masterApi(`/activity-types/${editing}`, {
                method: 'PATCH',
                data: editForm
            });
            setEditing(null); setMsg('✅ Saved!'); fetchAll();
        } catch (err) { setMsg('❌ ' + err.message); }
    };

    return (
        <div className="card">
            <h3 style={{ marginBottom: '16px' }}>⚙ Activity Types & Time Settings</h3>
            {msg && <p style={{ color: msg.startsWith('✅') ? '#166534' : '#991b1b', marginBottom: '12px' }}>{msg}</p>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                        {['Code', 'Name', 'Letter', 'Writer (Mins)', 'Editor (Mins)', ''].map(h =>
                            <th key={h} style={{ padding: '10px 8px' }}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {activityTypes.map(at => (
                        <tr key={at.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>{at.code_id}</td>
                            <td>{editing === at.id ? (
                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '180px' }} />
                            ) : at.name}</td>
                            <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{at.code_letter}</td>
                            <td>{editing === at.id ? (
                                <input type="number" value={editForm.activity_time} onChange={e => setEditForm({ ...editForm, activity_time: +e.target.value })}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '70px' }} />
                            ) : `${at.activity_time} m`}</td>
                            <td>{editing === at.id ? (
                                <input type="number" value={editForm.editor_minutes} onChange={e => setEditForm({ ...editForm, editor_minutes: +e.target.value })}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '70px' }} />
                            ) : `${at.editor_minutes} m`}</td>
                            <td>
                                {editing === at.id ? (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={save} style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}><FaSave /></button>
                                        <button onClick={() => setEditing(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}><FaTimes /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setEditing(at.id); setEditForm({ name: at.name, activity_time: at.activity_time, editor_minutes: at.editor_minutes }); }}
                                        style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}><FaEdit /></button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RoughCutTab({ employees, api, token, user }) {
    const [roughCuts, setRoughCuts] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [mediaPaths, setMediaPaths] = useState([]);
    const [msg, setMsg] = useState('');
    const [selectedEditors, setSelectedEditors] = useState({}); // rcId -> editorId
    const [previewMedia, setPreviewMedia] = useState(null);

    const fetchRoughCuts = useCallback(async () => {
        try {
            const res = await api('/rough-cuts');
            setRoughCuts(res.data);
        } catch (err) { console.error(err); }
    }, [api]);

    useEffect(() => { fetchRoughCuts(); }, [fetchRoughCuts]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploading(true);
        const uploaded = [];
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            try {
                const res = await axios.post('/api/automation/upload', fd, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
                uploaded.push(res.data.file_path);
            } catch (err) { console.error("Upload failed", err); }
        }
        setMediaPaths([...mediaPaths, ...uploaded]);
        setUploading(false);
    };

    const createRC = async () => {
        if (mediaPaths.length === 0) return;
        try {
            await api('/rough-cuts', { method: 'POST', data: { media_paths: mediaPaths } });
            setMediaPaths([]);
            setMsg('✅ Rough Cut created and sent to Brand Manager!');
            fetchRoughCuts();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Create failed';
            setMsg('❌ ' + errorMsg);
        }
    };

    const assignRC = async (rcId) => {
        const editorId = selectedEditors[rcId];
        if (!editorId) return alert('Please select an editor first');
        try {
            await api(`/rough-cuts/${rcId}/assign`, { method: 'PATCH', data: { editor_id: editorId } });
            setMsg('✅ Assigned to Editor!');
            fetchRoughCuts();
        } catch (err) { alert('Assign failed'); }
    };

    const canCreate = user.role !== 'Brand Manager';
    const canAssign = user.role === 'Brand Manager';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: canCreate ? 'minmax(300px, 1fr) 2fr' : '1fr', gap: '20px' }}>
            {canCreate && (
                <div className="card">
                    <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>🎬 Create Rough Cut</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>Upload raw media for editor compilation.</p>
                    <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#f8fafc', marginBottom: '15px' }}>
                        <input type="file" multiple onChange={handleFileUpload} style={{ fontSize: '0.8rem' }} />
                    </div>
                    {mediaPaths.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '10px' }}>QUEUED MEDIA ({mediaPaths.length}):</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {mediaPaths.map((p, i) => (
                                    <div key={i} style={{ fontSize: '0.7rem', padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        📄 {p.split(/[/\\]/).pop()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <button onClick={createRC} disabled={uploading || mediaPaths.length === 0} className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '12px' }}>
                        {uploading ? 'Uploading...' : <><FaRocket /> Send to Brand Manager</>}
                    </button>
                    {msg && <p style={{ marginTop: '15px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600, color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>{msg}</p>}
                </div>
            )}

            <div className="card">
                <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>📋 {canAssign ? 'Verify & Assign Rough Cuts' : 'Rough Cut Status'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {roughCuts.length === 0 ? (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            No rough cuts pending.
                        </div>
                    ) : roughCuts.map(rc => (
                        <div key={rc.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '15px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#6366f1', color: '#fff', padding: '3px 8px', borderRadius: '6px' }}>RC-{String(rc.id).padStart(3, '0')}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, background: rc.status === 'Completed' ? '#dcfce7' : '#fef3c7', color: rc.status === 'Completed' ? '#166534' : '#d97706', padding: '3px 8px', borderRadius: '6px' }}>{rc.status.toUpperCase()}</span>
                            </div>

                            {/* Media Verification View */}
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', margin: '0 0 8px' }}>MEDIA {canAssign ? 'FOR VERIFICATION' : 'FILES'}</p>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                                    {rc.media_paths.map((p, i) => {
                                        const isImg = p.match(/\.(jpg|jpeg|png|gif)$/i);
                                        const isVid = p.match(/\.(mp4|webm|mov)$/i);
                                        return (
                                            <div key={i}
                                                onClick={() => setPreviewMedia(p)}
                                                style={{ flexShrink: 0, width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e1e4e8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            >
                                                {isImg ? (
                                                    <img src={`/${p}`} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : isVid ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <FaPlay size={12} color="#6366f1" />
                                                        <span style={{ fontSize: '8px', fontWeight: 800, marginTop: '2px', color: '#6366f1' }}>PLAY</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '8px' }}>FILE</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                <b>Source:</b> {rc.media_paths.length} media files
                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '4px 0 0' }}>Created: {new Date(rc.created_at).toLocaleDateString()}</p>
                            </div>

                            {rc.status === 'Pending' && canAssign && (
                                <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', display: 'block' }}>SELECT VIDEO EDITOR</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select
                                            value={selectedEditors[rc.id] || ''}
                                            onChange={(e) => setSelectedEditors({ ...selectedEditors, [rc.id]: e.target.value })}
                                            style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                                        >
                                            <option value="">Select Editor...</option>
                                            {employees.filter(e => e.role === 'Video Editor').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                        <button
                                            onClick={() => assignRC(rc.id)}
                                            style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            )}

                            {rc.status === 'Assigned' && (
                                <div style={{ marginTop: '5px', padding: '8px', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #7dd3fc' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700 }}>👤 Workflow with: {rc.editor_name}</span>
                                </div>
                            )}

                            {rc.status === 'Completed' && (
                                <div style={{ marginTop: '5px', padding: '8px', background: '#dcfce7', borderRadius: '8px', border: '1px solid #86efac' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, display: 'block' }}>✅ Linked to: {rc.target_task_code}</span>
                                    <a href={`/${rc.edited_video_path}`} target="_blank" style={{ fontSize: '0.7rem', color: '#166534', textDecoration: 'underline' }}>View Final Rough Cut</a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Media Preview Modal Overlay */}
            {previewMedia && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}
                    onClick={() => setPreviewMedia(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '1000px', width: '100%', background: '#000', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewMedia(null)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', zIndex: 10, fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >
                            &times;
                        </button>
                        {previewMedia.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img src={`/${previewMedia}`} alt="preview" style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', display: 'block' }} />
                        ) : (
                            <video src={`/${previewMedia}`} controls autoPlay style={{ width: '100%', maxHeight: '85vh', display: 'block' }} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
