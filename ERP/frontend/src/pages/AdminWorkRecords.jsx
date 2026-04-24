import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaPlus, FaSearch, FaRegListAlt, FaCalendarDay,
    FaTrashAlt, FaTimes, FaBuilding, FaClock
} from 'react-icons/fa';

const API = "/api";

const AdminWorkRecords = () => {
    const { user, token } = useAuth();
    const [records, setRecords] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        client_id: '',
        work_description: '',
        time_minutes: '',
        status: 'Not Started'
    });

    useEffect(() => {
        fetchRecords();
        fetchClients();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            // Specifically fetch ADMIN's records using /work-records/my
            const res = await axios.get(`${API}/work-records/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecords(res.data);
        } catch (err) {
            console.error("Error fetching admin records:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await axios.get(`${API}/master/clients`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(res.data);
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    };

    const handleAddRecord = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/work-records/add`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddForm(false);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                client_id: '',
                work_description: '',
                time_minutes: '',
                status: 'Not Started'
            });
            fetchRecords();
        } catch (err) {
            alert("Error adding record: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteRecord = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            await axios.delete(`${API}/work-records/delete/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRecords();
        } catch (err) {
            alert("Delete failed: " + (err.response?.data?.error || err.message));
        }
    };

    const filteredRecords = records.filter(r =>
        r.work_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.client_name && r.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2.5rem',
                background: '#fff',
                padding: '1.5rem 2rem',
                borderRadius: '24px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <FaRegListAlt color="#4f46e5" />
                        My Work Reports
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                        Private record of your management tasks and administrative actions
                    </p>
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-primary"
                        style={{
                            borderRadius: '14px',
                            padding: '12px 28px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#4f46e5',
                            boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)'
                        }}
                    >
                        <FaPlus /> New Work Entry
                    </button>
                )}
            </header>

            {showAddForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'all'
                }}>
                    <div style={{
                        background: '#fff',
                        width: '90%',
                        maxWidth: '700px',
                        borderRadius: '32px',
                        padding: '40px',
                        boxShadow: '0 40px 100px -15px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        margin: 'auto'
                    }}>
                        <button
                            onClick={() => setShowAddForm(false)}
                            style={{
                                position: 'absolute', top: '25px', right: '25px',
                                background: '#f8fafc', border: 'none', borderRadius: '50%',
                                width: '40px', height: '40px', cursor: 'pointer', color: '#64748b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <FaTimes size={18} />
                        </button>

                        <h3 style={{ marginBottom: '2.5rem', fontWeight: 900, fontSize: '1.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '6px', height: '24px', background: '#4f46e5', borderRadius: '10px' }}></div>
                            Admin Work Entry
                        </h3>

                        <form onSubmit={handleAddRecord}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                        style={{ width: '100%', height: '52px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', padding: '0 16px', fontWeight: 700 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Client / Portfolio</label>
                                    <select
                                        className="form-select"
                                        value={formData.client_id}
                                        onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                        style={{ width: '100%', height: '52px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', padding: '0 16px', fontWeight: 700 }}
                                    >
                                        <option value="">Admin / General</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Duration (Mins)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Minutes"
                                        value={formData.time_minutes}
                                        onChange={e => setFormData({ ...formData, time_minutes: e.target.value })}
                                        required
                                        style={{ width: '100%', height: '52px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', padding: '0 16px', fontWeight: 700 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Status</label>
                                    <select
                                        className="form-select"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        style={{ width: '100%', height: '52px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', padding: '0 16px', fontWeight: 700 }}
                                    >
                                        <option value="Not Started">Not Started</option>
                                        <option value="In-Progress">In-Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Work Description</label>
                                    <textarea
                                        className="form-input"
                                        placeholder="Detail the management actions taken..."
                                        value={formData.work_description}
                                        onChange={e => setFormData({ ...formData, work_description: e.target.value })}
                                        required
                                        style={{
                                            width: '100%', borderRadius: '16px', padding: '20px', height: '140px',
                                            resize: 'none', border: '2px solid #f1f5f9', background: '#f8fafc',
                                            fontSize: '1rem', lineHeight: '1.6'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={() => setShowAddForm(false)} className="btn" style={{ color: '#94a3b8', fontWeight: 800, padding: '12px 24px' }}>Discard</button>
                                <button type="submit" className="btn btn-primary" style={{ borderRadius: '14px', padding: '14px 45px', fontWeight: 900, background: '#4f46e5' }}>Save Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, borderRadius: '25px', overflow: 'hidden', border: '1px solid #f1f5f9', background: '#fff' }}>
                <div style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <FaSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Find logs..."
                            style={{ paddingLeft: '45px', borderRadius: '14px', border: '1.5px solid #f1f5f9', width: '100%', height: '48px', background: '#f8fafc' }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table" style={{ borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 25px' }}>
                        <thead>
                            <tr style={{ background: 'transparent' }}>
                                <th style={{ border: 'none', padding: '15px 20px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Timeline</th>
                                <th style={{ border: 'none', padding: '15px 20px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target Portfolio</th>
                                <th style={{ border: 'none', padding: '15px 20px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', width: '35%' }}>Deliverables Description</th>
                                <th style={{ border: 'none', padding: '15px 20px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Time Log</th>
                                <th style={{ border: 'none', padding: '15px 20px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Status</th>
                                <th style={{ border: 'none', padding: '15px 20px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem' }}><div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #f1f5f9', borderTopColor: '#4f46e5', borderRadius: '50%', margin: '0 auto' }} /></td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', fontWeight: 600 }}>No reports found. Start by adding a new log.</td></tr>
                            ) : (
                                filteredRecords.map(record => (
                                    <tr key={record.id} className="table-row-hover" style={{
                                        background: '#fff',
                                        borderRadius: '16px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                        border: '1px solid #f1f5f9',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <td style={{ padding: '20px', borderRadius: '16px 0 0 16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e293b' }}>
                                                    {new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit' })}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                                                    {new Date(record.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ background: '#f5f3ff', color: '#6366f1', padding: '8px', borderRadius: '10px', fontSize: '0.8rem' }}>
                                                    <FaBuilding />
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.95rem' }}>{record.client_name || "Admin / General"}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', color: '#475569', fontSize: '0.88rem', lineHeight: '1.5', fontWeight: 600 }}>
                                            {record.work_description}
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                                <FaClock color="#94a3b8" size={12} />
                                                <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.9rem' }}>{record.time_minutes}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>min</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                background: record.status === 'Completed' ? '#ecfdf5' : record.status === 'In-Progress' ? '#fffbeb' : '#f1f5f9',
                                                color: record.status === 'Completed' ? '#10b981' : record.status === 'In-Progress' ? '#f59e0b' : '#64748b',
                                                border: `1px solid ${record.status === 'Completed' ? '#d1fae5' : record.status === 'In-Progress' ? '#fef3c7' : '#e2e8f0'}`
                                            }}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'center', borderRadius: '0 16px 16px 0' }}>
                                            <button
                                                onClick={() => handleDeleteRecord(record.id)}
                                                style={{
                                                    border: 'none',
                                                    background: '#fff1f2',
                                                    color: '#ef4444',
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s',
                                                    margin: '0 auto'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = '#ef4444';
                                                    e.currentTarget.style.color = '#fff';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = '#fff1f2';
                                                    e.currentTarget.style.color = '#ef4444';
                                                }}
                                            >
                                                <FaTrashAlt size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminWorkRecords;
