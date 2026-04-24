import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    FaPlus, FaSearch, FaRegListAlt, FaCalendarDay,
    FaTrashAlt, FaTimes, FaBuilding, FaClock, FaUserTie
} from 'react-icons/fa';

const API = "/api";

const WorkRecords = () => {
    const { user, token } = useAuth();
    const [records, setRecords] = useState([]);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [efficiencyDate, setEfficiencyDate] = useState(new Date().toISOString().split('T')[0]);

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        client_id: '',
        work_description: '',
        time_minutes: '',
        status: 'Not Started'
    });

    const isAdmin = user?.role === 'Admin';
    const isBrandManager = user?.role === 'Brand Manager';
    const isManagement = isAdmin || isBrandManager;

    useEffect(() => {
        fetchRecords();
        if (isManagement) {
            fetchClients();
            fetchUsers();
        } else {
            fetchClients();
        }
    }, [clientFilter, userFilter, dateFrom, dateTo]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            // Only Admin sees everything. Brand Manager and others see only their own.
            const endpoint = isAdmin ? `${API}/work-records/all` : `${API}/work-records/my`;

            const params = {};
            if (isAdmin) {
                if (clientFilter) params.client_id = clientFilter;
                if (userFilter) params.user_id = userFilter;
                if (dateFrom) params.start_date = dateFrom;
                if (dateTo) params.end_date = dateTo;
            }

            const res = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setRecords(res.data);
        } catch (err) {
            console.error("Error fetching work records:", err);
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

    const fetchUsers = async () => {
        try {
            // Using /employees to get all staff then filtering for specifics
            const res = await axios.get(`/api/automation/employees`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const filterNames = ['Sasi', 'Mathesh', 'Swetha', 'Dharshan'];
            const filtered = res.data.filter(u =>
                filterNames.some(name => u.name.toLowerCase().includes(name.toLowerCase()))
            );
            setUsers(filtered);
        } catch (err) {
            console.error("Error fetching users:", err);
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
        (r.client_name && r.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.user_name && r.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Efficiency Logic
    const dailyEfficiency = users.map(u => {
        // Find all records for this user on the selected efficiency date
        const userDayRecords = records.filter(r => {
            const rDate = new Date(r.date).toISOString().split('T')[0];
            const uIdMatch = parseInt(r.user_id) === parseInt(u.id);
            return rDate === efficiencyDate && uIdMatch;
        });

        const totalMins = userDayRecords.reduce((sum, r) => sum + (parseInt(r.time_minutes) || 0), 0);
        const percentage = Math.min((totalMins / 480) * 100, 100);

        return {
            id: u.id,
            name: u.name,
            mins: totalMins,
            score: percentage.toFixed(1)
        };
    });

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
                        {isAdmin ? "Central Work Repository" : isBrandManager ? "Dharshan's Work Reports" : user?.role === 'Website Head' ? "Work Records" : "My Daily Records"}
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
                        {isAdmin ? "Complete audit trail of team deliverables" : "Log your tasks and production data directly into ERP"}
                    </p>
                </div>
                {!showAddForm && user?.role !== 'Admin' && (
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

            {isAdmin && (
                <section style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Staff Efficiency Tracker</h2>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Based on 480 mins daily capacity</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '8px 16px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                            <FaCalendarDay color="#4f46e5" />
                            <input
                                type="date"
                                value={efficiencyDate}
                                onChange={(e) => setEfficiencyDate(e.target.value)}
                                style={{ border: 'none', fontWeight: 800, color: '#1e293b', cursor: 'pointer', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                        {dailyEfficiency.map((staff, idx) => (
                            <div key={idx}
                                onClick={() => navigate(`/daily-work-records?date=${efficiencyDate}&emp_id=${staff.id}&display=${new Date(efficiencyDate).toLocaleDateString()}`)}
                                style={{ background: '#fff', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontWeight: 850, color: '#1e293b', fontSize: '0.95rem' }}>{staff.name}</h4>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{staff.mins} mins logged</span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4f46e5' }}>{staff.score}%</div>
                                </div>
                                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${staff.score}%`,
                                        height: '100%',
                                        background: parseFloat(staff.score) > 80 ? '#22c55e' : parseFloat(staff.score) > 50 ? '#f59e0b' : '#ef4444',
                                        transition: 'width 0.5s ease-out'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                        >
                            <FaTimes size={18} />
                        </button>

                        <h3 style={{ marginBottom: '2.5rem', fontWeight: 900, fontSize: '1.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '6px', height: '24px', background: '#4f46e5', borderRadius: '10px' }}></div>
                            New Work Entry Log
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
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Client</label>
                                    <select
                                        className="form-select"
                                        value={formData.client_id}
                                        onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                                        style={{ width: '100%', height: '52px', borderRadius: '14px', background: '#f8fafc', border: '2px solid #f1f5f9', padding: '0 16px', fontWeight: 700 }}
                                    >
                                        <option value="">General Work</option>
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
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Core Deliverables Description</label>
                                    <textarea
                                        className="form-input"
                                        placeholder="Briefly describe what was achieved..."
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
                                <button type="submit" className="btn btn-primary" style={{ borderRadius: '14px', padding: '14px 45px', fontWeight: 900, background: '#4f46e5' }}>Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, borderRadius: '25px', overflow: 'hidden', border: '1px solid #f1f5f9', background: '#fff' }}>
                <div style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <FaSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Find records..."
                            style={{ paddingLeft: '45px', borderRadius: '14px', border: '1.5px solid #f1f5f9', width: '100%', height: '48px', background: '#f8fafc' }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {isAdmin && (
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <select
                                className="form-select"
                                value={userFilter}
                                onChange={e => setUserFilter(e.target.value)}
                                style={{ borderRadius: '14px', minWidth: '150px', height: '48px', border: '1.5px solid #f1f5f9', background: '#f8fafc' }}
                            >
                                <option value="">All Staff</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <select
                                className="form-select"
                                value={clientFilter}
                                onChange={e => setClientFilter(e.target.value)}
                                style={{ borderRadius: '14px', minWidth: '150px', height: '48px', border: '1.5px solid #f1f5f9', background: '#f8fafc' }}
                            >
                                <option value="">All Brands</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', background: '#f8fafc', borderRadius: '14px', border: '1.5px solid #f1f5f9', padding: '0 12px', alignItems: 'center' }}>
                                <FaCalendarDay color="#cbd5e1" />
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: 'none', background: 'transparent', width: '130px', padding: '8px', fontSize: '0.8rem', fontWeight: 600 }} />
                            </div>
                        </div>
                    )}

                    {(isBrandManager) && (
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <select
                                className="form-select"
                                value={clientFilter}
                                onChange={e => setClientFilter(e.target.value)}
                                style={{ borderRadius: '14px', minWidth: '150px', height: '48px', border: '1.5px solid #f1f5f9', background: '#f8fafc' }}
                            >
                                <option value="">My Brands</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="table-responsive">
                    <table className="table" style={{ borderCollapse: 'separate', borderSpacing: '0 10px', padding: '0 25px' }}>
                        <thead>
                            <tr style={{ background: 'transparent' }}>
                                <th style={{ border: 'none', padding: '15px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Timeline</th>
                                {isManagement && <th style={{ border: 'none', padding: '15px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Professional</th>}
                                <th style={{ border: 'none', padding: '15px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Brand</th>
                                <th style={{ border: 'none', padding: '15px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', width: '30%' }}>Deliverables</th>
                                <th style={{ border: 'none', padding: '15px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Mins</th>
                                <th style={{ border: 'none', padding: '15px', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isManagement ? 6 : 5} style={{ textAlign: 'center', padding: '4rem' }}><div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #f1f5f9', borderTopColor: '#4f46e5', borderRadius: '50%', margin: '0 auto' }} /></td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={isManagement ? 6 : 5} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', fontWeight: 600 }}>No entries matched your criteria.</td></tr>
                            ) : (
                                filteredRecords.map(record => (
                                    <tr key={record.id} style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '20px', fontWeight: 800 }}>{new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                        {isManagement && (
                                            <td style={{ padding: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem' }}>{record.user_name === 'Brand Manager' ? 'D' : record.user_name?.charAt(0)}</div>
                                                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{record.user_name === 'Brand Manager' ? 'Dharshan' : record.user_name}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaBuilding color="#cbd5e1" size={12} />
                                                <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.9rem' }}>{record.client_name || "General"}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5', fontWeight: 500 }}>{record.work_description}</td>
                                        <td style={{ padding: '20px', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px' }}>
                                                <FaClock color="#94a3b8" size={10} />
                                                <span style={{ fontWeight: 900, color: '#1e293b', fontSize: '0.85rem' }}>{record.time_minutes}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                                                <span className={`badge ${record.status === 'Completed' ? 'badge-success' : record.status === 'In Progress' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.7rem', padding: '6px 12px' }}>{record.status}</span>
                                                {(user?.role === 'Admin' || record.user_id === parseInt(user?.id)) && (
                                                    <button onClick={() => handleDeleteRecord(record.id)} style={{ border: 'none', background: 'none', color: '#f1f5f9', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#f1f5f9'}><FaTrashAlt size={12} /></button>
                                                )}
                                            </div>
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

export default WorkRecords;
