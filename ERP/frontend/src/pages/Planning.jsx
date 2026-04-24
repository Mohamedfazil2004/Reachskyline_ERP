import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaTrash, FaCheckCircle } from 'react-icons/fa';

const Planning = () => {
    const [clients, setClients] = useState([]);
    const [activityTypes, setActivityTypes] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [deliverables, setDeliverables] = useState([{ type_id: '', count: 1 }]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cRes, aRes] = await Promise.all([
                    axios.get('/api/master/clients'),
                    axios.get('/api/master/activity-types')
                ]);
                setClients(cRes.data);
                setActivityTypes(aRes.data);
            } catch (err) {
                console.error("Fetch error", err);
            }
        };
        fetchData();
    }, []);

    const addDeliverableRow = () => {
        setDeliverables([...deliverables, { type_id: '', count: 1 }]);
    };

    const removeRow = (index) => {
        setDeliverables(deliverables.filter((_, i) => i !== index));
    };

    const updateRow = (index, field, value) => {
        const newDeliverables = [...deliverables];
        newDeliverables[index][field] = value;
        setDeliverables(newDeliverables);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await axios.post('/api/workflow/planning', {
                client_id: selectedClient,
                month,
                year,
                deliverables
            });
            setMessage('Planning created and Activity Codes generated successfully!');
            setDeliverables([{ type_id: '', count: 1 }]);
        } catch (err) {
            setMessage('Error creating plan: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="header">
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Monthly Deliverable Planning</h1>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Select Client</label>
                            <select
                                className="card"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                required
                            >
                                <option value="">Choose Client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Month</label>
                            <select
                                className="card"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Year</label>
                            <input
                                type="number"
                                className="card"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0' }}
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <h3 style={{ marginBottom: '1rem' }}>Define Deliverables</h3>
                    <div style={{ marginBottom: '1.5rem' }}>
                        {deliverables.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Activity Type</label>
                                    <select
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                        value={item.type_id}
                                        onChange={(e) => updateRow(index, 'type_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Type...</option>
                                        {activityTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                        value={item.count}
                                        onChange={(e) => updateRow(index, 'count', parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeRow(index)}
                                    style={{ padding: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button type="button" onClick={addDeliverableRow} className="btn" style={{ color: 'var(--primary-color)', backgroundColor: 'rgba(79, 70, 229, 0.1)' }}>
                            <FaPlus /> Add Deliverable Type
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 2.5rem' }}>
                            {loading ? 'Processing...' : 'Generate Plan & Activity Codes'}
                        </button>
                    </div>
                </form>

                {message && (
                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: message.includes('Error') ? '#fef2f2' : '#f0fdf4', color: message.includes('Error') ? '#b91c1c' : '#15803d', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FaCheckCircle /> {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Planning;
