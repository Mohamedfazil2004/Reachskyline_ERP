import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FaPlay, FaDownload, FaRocket } from 'react-icons/fa';

const API = '/api/automation';

const RoughCuts = () => {
    const { token, user } = useAuth();
    const [roughCuts, setRoughCuts] = useState([]);
    const [ytCodes, setYtCodes] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState({}); // rcId -> taskId
    const [editPaths, setEditPaths] = useState({}); // rcId -> path
    const [searchTerm, setSearchTerm] = useState({}); // rcId -> search string

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = React.useCallback(async () => {
        try {
            const [rcRes, codeRes] = await Promise.all([
                axios.get(`${API}/rough-cuts`, { headers }),
                axios.get(`${API}/tasks/yt-codes`, { headers })
            ]);
            setRoughCuts(rcRes.data);
            setYtCodes(codeRes.data);
        } catch (err) { console.error(err); }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpload = async (rcId, file) => {
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        setUploading(true);
        try {
            const res = await axios.post(`${API}/upload`, fd, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });
            setEditPaths({ ...editPaths, [rcId]: res.data.file_path });
            alert('✅ Uploaded!');
        } catch (err) { alert('Upload failed'); }
        finally { setUploading(false); }
    };

    const submitRC = async (rcId) => {
        const path = editPaths[rcId];
        const taskId = selectedTasks[rcId];
        if (!path || !taskId) return alert('Select code and upload video first');

        setSubmitting(rcId);
        try {
            await axios.patch(`${API}/rough-cuts/${rcId}/complete`,
                { edited_video_path: path, target_task_id: taskId }, { headers });
            fetchData();
            alert('✅ Rough cut delivered to content writer!');
        } catch (err) { alert('Submit failed'); }
        finally { setSubmitting(null); }
    };

    const activeRCs = roughCuts.filter(r => r.status === 'Assigned');

    return (
        <div className="animate-fade-in" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FaPlay style={{ color: '#ec4899' }} /> Rough Cut Assignments
            </h2>

            {activeRCs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px', borderRadius: '25px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '1rem' }}>No new rough cut assignments at the moment.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px' }}>
                    {activeRCs.map(rc => (
                        <div key={rc.id} className="card" style={{ border: '2px solid #ec489933', borderRadius: '25px', padding: '25px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <span style={{ fontWeight: 900, color: '#ec4899', fontSize: '1rem', background: '#ec489910', padding: '4px 12px', borderRadius: '10px' }}>
                                    RC-{String(rc.id).padStart(3, '0')}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Received from BM</span>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '18px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Source Media ({rc.media_paths.length})</p>
                                    <button
                                        onClick={() => {
                                            rc.media_paths.forEach((p, idx) => {
                                                setTimeout(() => {
                                                    const link = document.createElement('a');
                                                    link.href = `/${p}`;
                                                    link.download = p.split(/[/\\]/).pop();
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }, idx * 300);
                                            });
                                        }}
                                        style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <FaDownload size={12} /> Download All
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                                    {rc.media_paths.map((p, i) => (
                                        <a key={i} href={`/${p}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', background: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '10px', whiteSpace: 'nowrap', textDecoration: 'none', color: '#6366f1', fontWeight: 800, transition: 'all 0.2s' }}>
                                            🔗 File {i + 1}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>DELIVER TO ACTIVITY CODE (YT / YTS)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search Activity Code or Client Name..."
                                            value={searchTerm[rc.id] || ''}
                                            onChange={(e) => setSearchTerm({ ...searchTerm, [rc.id]: e.target.value })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '15px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '8px', outline: 'none' }}
                                        />
                                        <select
                                            size={5}
                                            value={selectedTasks[rc.id] || ''}
                                            onChange={e => setSelectedTasks({ ...selectedTasks, [rc.id]: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '15px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', outline: 'none' }}
                                        >
                                            <option value="">Select Target Code...</option>
                                            {ytCodes
                                                .filter(t =>
                                                    t.activity_code.toLowerCase().includes((searchTerm[rc.id] || '').toLowerCase()) ||
                                                    t.client_name.toLowerCase().includes((searchTerm[rc.id] || '').toLowerCase())
                                                )
                                                .map(t => <option key={t.id} value={t.id}>{t.activity_code} - {t.client_name}</option>)
                                            }
                                        </select>
                                    </div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '18px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '10px' }}>UPLOAD YOUR EDIT</label>
                                    <input type="file" onChange={e => handleUpload(rc.id, e.target.files[0])} style={{ fontSize: '0.85rem', width: '100%' }} />
                                </div>
                                <button
                                    onClick={() => submitRC(rc.id)}
                                    disabled={submitting === rc.id || uploading}
                                    style={{ width: '100%', background: '#ec4899', color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s', opacity: (submitting === rc.id || uploading) ? 0.6 : 1, transform: uploading ? 'scale(0.98)' : 'scale(1)' }}
                                >
                                    {submitting === rc.id ? 'Delivering...' : uploading ? 'Uploading...' : <><FaRocket /> Deliver to Content Writer</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RoughCuts;
