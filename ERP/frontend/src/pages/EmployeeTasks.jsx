import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
    FaCheckCircle, FaClock, FaExclamationTriangle,
    FaRedo, FaTasks, FaLightbulb, FaSync,
    FaCalendarAlt, FaFire, FaRocket, FaInfoCircle,
    FaPlay, FaDownload, FaPenNib, FaEdit
} from 'react-icons/fa';

const API = '/api/automation';

export default function EmployeeTasks({ embedded = false }) {
    const { token, user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [taskData, setTaskData] = useState({});
    const [submitting, setSubmitting] = useState(null);
    const [msg, setMsg] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [totalMinutes, setTotalMinutes] = useState(0);
    const [dailyCapacity, setDailyCapacity] = useState(480);
    const [dateCounts, setDateCounts] = useState({});
    const [showTodayTasks, setShowTodayTasks] = useState(true);

    const headers = { Authorization: `Bearer ${token}` };

    const fetchTasks = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const res = await axios.get(`${API}/employee/tasks?date=${selectedDate}`, { headers });
            setTasks(res.data.tasks || []);
            setTotalMinutes(res.data.total_visible_minutes || 0);
            setDailyCapacity(res.data.daily_capacity || 480);
            setDateCounts(res.data.date_counts || {});
            setShowTodayTasks(res.data.show_today !== false);
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

    const startTask = async (taskId) => {
        try {
            await axios.post(`${API}/tasks/${taskId}/start`, {}, { headers });
            fetchTasks(false);
        } catch (err) {
            console.error(err);
        }
    };

    const submitTask = async (taskId, formData) => {
        setSubmitting(taskId);
        try {
            await axios.post(`${API}/tasks/${taskId}/submit`, formData, { headers });
            setMsg('✅ Content submitted successfully!');
            fetchTasks(false);
            setTimeout(() => setMsg(''), 5000);
        } catch (err) {
            alert(err.response?.data?.error || err.message);
        } finally {
            setSubmitting(null);
        }
    };

    const submitVideo = async (taskId, formData) => {
        setSubmitting(taskId);
        try {
            await axios.post(`${API}/tasks/${taskId}/submit-video`, formData, { headers });
            setMsg('✅ Video submitted successfully!');
            fetchTasks(false);
            setTimeout(() => setMsg(''), 5000);
        } catch (err) {
            alert(err.response?.data?.error || err.message);
        } finally {
            setSubmitting(null);
        }
    };

    const saveRoughCut = async (taskId, roughCutPath) => {
        try {
            await axios.post(`${API}/tasks/${taskId}/save-rough-cut`, {
                rough_cut_video_path: roughCutPath
            }, { headers });
            setMsg('✅ Rough cut sent successfully!');
            fetchTasks(false);
            setTimeout(() => setMsg(''), 5000);
        } catch (err) {
            alert(err.response?.data?.error || err.message);
        }
    };

    if (loading && tasks.length === 0) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
        </div>
    );

    return (
        <div className={embedded ? '' : 'dashboard-wrapper animate-fade-in'} style={{ paddingBottom: embedded ? '0' : '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                    <FaTasks style={{ color: '#6366f1', marginRight: '10px' }} /> My Task Board
                </h2>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {Object.keys(dateCounts).length > 0 && (
                        <div style={{
                            background: '#fff', padding: '8px 15px', borderRadius: '15px',
                            border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Source Dates</span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                    {Object.entries(dateCounts).map(([date, count]) => {
                                        const dateObj = new Date(date);
                                        const formatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                                        return (
                                            <div key={date} style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px',
                                                fontSize: '0.75rem', fontWeight: 700, color: '#475569'
                                            }}>
                                                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{formatted}:</span>
                                                <span style={{ color: '#6366f1' }}>{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <div style={{
                        background: '#f8fafc', padding: '8px 20px', borderRadius: '15px',
                        border: '1px solid #e2e8f0', textAlign: 'right', display: 'flex', flexDirection: 'column'
                    }}>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Daily Workload</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: totalMinutes > dailyCapacity ? '#ef4444' : '#6366f1' }}>
                            {totalMinutes} / {dailyCapacity} mins
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

            {tasks.some(t => t.is_urgent && !['Completed', 'Done', 'Submitted to BM', 'Video Submitted'].includes(t.status)) && (
                <div className="animate-pulse" style={{ background: '#fef2f2', border: '2px solid #ef4444', color: '#991b1b', padding: '20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ background: '#ef4444', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        <FaExclamationTriangle />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>URGENT ACTION REQUIRED</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 600, opacity: 0.9 }}>
                            The Brand Manager has assigned high-priority tasks. You must complete these urgent tasks before proceeding with regular work.
                        </p>
                    </div>
                </div>
            )}

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
                                {(() => {
                                    const hasUrgentPending = tasks.some(t => t.is_urgent && !['Completed', 'Done', 'Submitted to BM', 'Video Submitted'].includes(t.status));

                                    return tasks.map(t => {
                                        const isUrgentTask = t.is_urgent;
                                        const isMainRowLocked = hasUrgentPending && !isUrgentTask;

                                        return (
                                            <TaskRow
                                                key={t.id}
                                                task={t}
                                                taskForm={taskData}
                                                setTaskForm={setTaskData}
                                                onSubmit={t.current_stage === 'video_editing' ? submitVideo : submitTask}
                                                onStart={startTask}
                                                onSaveRoughCut={saveRoughCut}
                                                submitting={submitting}
                                                token={token}
                                                currentUser={user}
                                                isBlockedByUrgent={isMainRowLocked}
                                            />
                                        );
                                    });
                                })()}
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

function TaskRow({ task, taskForm, setTaskForm, onSubmit, onStart, onSaveRoughCut, submitting, token, currentUser, isBlockedByUrgent }) {
    const [expanded, setExpanded] = useState(false);
    const [uploading, setUploading] = useState(false);

    const isUserWriter = currentUser?.id === task?.assigned_employee_id;
    const isUserEditor = currentUser?.id === task?.video_editor_id;

    const editableStatuses = ['Assigned', 'In Progress', 'Rework Required (Writer)', 'Pending'];
    const isLocked = !editableStatuses.includes(task.status);
    let isCompleted = task.status === 'Completed' || task.status === 'Done';

    if (isUserWriter && !isUserEditor) {
        const pastContent = ['Assigned to Editor', 'Video Submitted', 'Rework Required (Editor)'].includes(task.status);
        if (pastContent) {
            isCompleted = true;
        }
    }

    const readOnly = isLocked;

    const updateForm = (field, value) => {
        setTaskForm({ ...taskForm, [task.id]: { ...(taskForm[task.id] || {}), [field]: value } });
    };

    const baseData = {
        title: task.submission_title || '',
        description: task.submission_description || '',
        caption_text: task.submission_caption || '',
        thumbnail_content: task.submission_thumbnail || '',
        reference: task.submission_reference || '',
        file_path: task.submission_file_path || '',
        thumbnail_path: task.submission_thumbnail_path || '',
        rough_cut_video_path: task.rough_cut_video_path || '',
        video_path: task.final_video_path || '',
        thumbnail_path_editor: task.final_thumbnail_path || '',
        notes: task.editor_notes || ''
    };
    const formData = { ...baseData, ...(taskForm[task.id] || {}) };

    const handleFileChange = async (e, type = 'content') => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await axios.post('/api/automation/upload', fd, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            let field = 'file_path';
            if (type === 'thumbnail') field = 'thumbnail_path';
            if (type === 'rough_cut') field = 'rough_cut_video_path';
            if (type === 'video') field = 'video_path';
            if (type === 'thumbnail_editor') field = 'thumbnail_path_editor';
            updateForm(field, res.data.file_path);
            alert('✅ Uploaded!');
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setUploading(false);
        }
    };

    const isEditorView = isUserEditor && task?.current_stage === 'video_editing';

    const getStatusInfo = (status) => {
        switch (status) {
            case 'Pending':
            case 'Assigned':
                return { status: 'pending', approval: '-', color: '#c4c4c4' };
            case 'In Progress':
                return { status: 'in progress', approval: '-', color: '#fdab3d' };
            case 'Submitted to BM':
                return { status: 'completed', approval: 'waiting for approval', color: '#0086e6' };
            case 'Completed':
            case 'Done':
            case 'Assigned to Editor':
            case 'Video Submitted':
                return { status: 'approved', approval: 'approved', color: '#00c875' };
            case 'Rework Required (Writer)':
            case 'Rework Required (Editor)':
                return { status: 'rework', approval: 'rework', color: '#e2445c' };
            default:
                return { status: status.toLowerCase(), approval: '-', color: '#c4c4c4' };
        }
    };

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
                    opacity: isBlockedByUrgent ? 0.6 : 1,
                    position: 'relative',
                    transition: 'background 0.2s'
                }}
            >
                {/* Accent Border */}
                <div style={{ width: '6px', background: accentColor }}></div>

                {/* Icon */}
                <div style={{ width: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {task.is_urgent ? <FaFire style={{ color: '#ef4444' }} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0' }}></div>}
                </div>

                {/* Client */}
                <div style={{ flex: 3, display: 'flex', alignItems: 'center', padding: '5px 10px', gap: '10px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.client_name}
                    </span>
                </div>

                {/* Activity Code */}
                <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid #f1f1f1' }}>
                    <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 800, background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                        {task.activity_code}
                    </span>
                </div>

                {/* Link (Edit Button) */}
                <div style={{ flex: 1.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderLeft: '1px solid #f1f1f1' }}>
                    <button
                        onClick={() => {
                            if (isBlockedByUrgent) {
                                alert("⚠️ Please finish your URGENT tasks first!");
                                return;
                            }
                            if (!expanded && (task.status === 'Assigned' || task.status === 'Pending')) {
                                onStart(task.id);
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

                        {!isEditorView ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>TASK TITLE</label>
                                        <input type="text" value={formData.title} onChange={e => updateForm('title', e.target.value)} readOnly={readOnly}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: readOnly ? '#f8fafc' : '#fff' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>DESCRIPTION</label>
                                        <textarea rows={4} value={formData.description} onChange={e => updateForm('description', e.target.value)} readOnly={readOnly}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', resize: 'none', background: readOnly ? '#f8fafc' : '#fff' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>REFERENCE LINK</label>
                                        <input type="text" value={formData.reference} onChange={e => updateForm('reference', e.target.value)} readOnly={readOnly}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: readOnly ? '#f8fafc' : '#fff' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>CONTENT LINK (DOCS)</label>
                                        <input type="text" value={formData.file_path} onChange={e => updateForm('file_path', e.target.value)} readOnly={readOnly}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', background: readOnly ? '#f8fafc' : '#fff' }} />
                                    </div>
                                    <div style={{ marginTop: '15px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', marginBottom: '5px', display: 'block' }}>THUMBNAIL CONTENT</label>
                                        <textarea rows={2} value={formData.thumbnail_content} onChange={e => updateForm('thumbnail_content', e.target.value)} readOnly={readOnly}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', resize: 'none', background: readOnly ? '#f8fafc' : '#fff' }} />
                                    </div>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    {!readOnly && (
                                        <button onClick={() => onSubmit(task.id, formData)} disabled={submitting === task.id || uploading}
                                            style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            {submitting === task.id ? 'Submitting...' : uploading ? 'Uploading...' : <><FaRocket /> Submit Content</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{ border: '1px solid #e1e4e8', borderRadius: '8px', padding: '15px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '8px' }}>FINAL VIDEO</span>
                                        <input type="file" accept="video/*" onChange={e => handleFileChange(e, 'video')} disabled={isCompleted} />
                                    </div>
                                    <div style={{ border: '1px solid #e1e4e8', borderRadius: '8px', padding: '15px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '8px' }}>FINAL THUMBNAIL</span>
                                        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'thumbnail_editor')} disabled={isCompleted} />
                                    </div>
                                </div>
                                <textarea rows={3} placeholder="Notes for manager..." value={formData.notes} onChange={e => updateForm('notes', e.target.value)} readOnly={isCompleted}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e1e4e8', resize: 'none', background: isCompleted ? '#f8fafc' : '#fff' }} />
                                {!isCompleted && (
                                    <button onClick={() => onSubmit(task.id, formData)} disabled={submitting === task.id || uploading}
                                        style={{ width: '100%', background: '#ec4899', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                        {submitting === task.id ? 'Submitting...' : 'Submit Final Production'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
