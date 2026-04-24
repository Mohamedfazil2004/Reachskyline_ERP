import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUserPlus, FaBuilding, FaTrash } from 'react-icons/fa';

const Master = () => {
    const [clients, setClients] = useState([]);
    const [newClient, setNewClient] = useState({
        id: '',
        name: '',
        industry: '',
        contact_person: '',
        contact_email: '',
        contact_phone: ''
    });
    const [message, setMessage] = useState('');

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('erp_token');
            const res = await axios.get('/api/master/clients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const token = localStorage.getItem('erp_token');
            const res = await axios.post('/api/master/clients', newClient, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setMessage('Client added successfully!');
            setNewClient({
                id: '', name: '', industry: '',
                contact_person: '', contact_email: '', contact_phone: ''
            });
            fetchClients();
        } catch (err) {
            console.error("Master add failed", err);
            const errorMsg = err.response?.data?.error || err.response?.data?.msg || err.message;
            setMessage('Error: ' + errorMsg);
        }
    };

    const handleDelete = async (clientId) => {
        if (!window.confirm(`Are you sure you want to delete client ${clientId}?`)) return;
        try {
            const token = localStorage.getItem('erp_token');
            await axios.delete(`/api/master/clients/${clientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchClients();
            setMessage('Client deleted successfully');
        } catch (err) {
            console.error("Delete failed", err);
            setMessage('Delete failed: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="header">
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Master Management</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}><FaUserPlus /> Add New Client</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Client ID (e.g. C001)</label>
                            <input
                                type="text"
                                className="input-field"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                value={newClient.id}
                                onChange={(e) => setNewClient({ ...newClient, id: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Client Name</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                value={newClient.name}
                                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Industry</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                value={newClient.industry}
                                onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Contact Person</label>
                            <input
                                type="text"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                value={newClient.contact_person}
                                onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Email</label>
                                <input
                                    type="email"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                    value={newClient.contact_email}
                                    onChange={(e) => setNewClient({ ...newClient, contact_email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.4rem' }}>Phone</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                    value={newClient.contact_phone}
                                    onChange={(e) => setNewClient({ ...newClient, contact_phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Register Client</button>
                    </form>
                    {message && <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: message.includes('Error') ? 'var(--danger)' : 'var(--success)' }}>{message}</p>}
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0 }}><FaBuilding /> Existing Clients</h3>
                        {clients.length > 0 && (
                            <button
                                onClick={async () => {
                                    if (!window.confirm('Delete ALL clients? This cannot be undone.')) return;
                                    try {
                                        const token = localStorage.getItem('erp_token');
                                        for (const c of clients) {
                                            await axios.delete(`/api/master/clients/${c.id}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                        }
                                        fetchClients();
                                        setMessage('All clients cleared successfully');
                                    } catch (err) {
                                        setMessage('Clear all failed');
                                    }
                                }}
                                style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                                <th style={{ padding: '0.75rem' }}>ID</th>
                                <th>Name</th>
                                <th>Industry</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{c.id}</td>
                                    <td>{c.name}</td>
                                    <td>{c.industry}</td>
                                    <td>
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No clients found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Master;
