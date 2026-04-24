import React, { useState, useEffect } from 'react';
import { FaEye, FaCalendarAlt, FaThLarge, FaList, FaShareSquare, FaCloudDownloadAlt, FaTimes } from 'react-icons/fa';
import { februaryCalendar } from '../data/calendarData';
import './ContentCalendar.css';

const ContentCalendar = () => {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const filteredData = februaryCalendar.filter(item => {
        const matchesSearch = item.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.activityCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || item.contentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusClass = (status) => {
        if (status.includes('Approved')) return 'status-success';
        if (status.includes('Remarks')) return 'status-warning';
        return 'status-pending';
    };

    const DetailModal = ({ item, onClose }) => (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
                <FaTimes className="modal-close" onClick={onClose} />
                <div className="modal-header-img">
                    <FaCalendarAlt />
                </div>
                <div className="modal-body">
                    <span className="activity-tag">{item.activityType}</span>
                    <h2 className="topic-title" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{item.topic}</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <p className="status-label">Content Status</p>
                            <p className={`status-value ${getStatusClass(item.contentStatus)}`}>{item.contentStatus}</p>
                        </div>
                        <div>
                            <p className="status-label">Creative Status</p>
                            <p className={`status-value ${getStatusClass(item.creativeStatus)}`}>{item.creativeStatus}</p>
                        </div>
                        <div>
                            <p className="status-label">Date</p>
                            <p className="status-value">{item.date} ({item.day})</p>
                        </div>
                        <div>
                            <p className="status-label">Activity Code</p>
                            <p className="status-value">{item.activityCode}</p>
                        </div>
                    </div>

                    <h4 style={{ marginBottom: '0.5rem' }}>Description</h4>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.8' }}>{item.description}</p>

                    <div className="modal-hashtag">
                        {item.hashtags}
                    </div>

                    <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                            <FaCloudDownloadAlt /> Download Files
                        </button>
                        {item.reference && (
                            <a href={item.reference} target="_blank" rel="noreferrer" className="btn" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                                <FaShareSquare /> Visit Reference
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className="header">
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--bg-dark)' }}>February Content Calendar</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage and track all social media deliverables for this month.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.25rem', borderRadius: '0.75rem' }}>
                        <button
                            className={`btn ${viewMode === 'grid' ? 'btn-primary' : ''}`}
                            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                            onClick={() => setViewMode('grid')}
                        >
                            <FaThLarge />
                        </button>
                        <button
                            className={`btn ${viewMode === 'list' ? 'btn-primary' : ''}`}
                            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                            onClick={() => setViewMode('list')}
                        >
                            <FaList />
                        </button>
                    </div>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
                    <p className="status-label">Total Deliverables</p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{februaryCalendar.length}</h2>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <p className="status-label">Content Approved</p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{februaryCalendar.filter(i => i.contentStatus === 'Content Approved').length}</h2>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <p className="status-label">Creative Approved</p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{februaryCalendar.filter(i => i.creativeStatus === 'Creative Approved').length}</h2>
                </div>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <input
                    type="text"
                    placeholder="Search by topic or code..."
                    className="card"
                    style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid var(--border-color)' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="card"
                    style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)' }}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="All">All Status</option>
                    <option value="Content Approved">Approved</option>
                    <option value="Content Not Written">Drafts</option>
                </select>
            </div>

            {viewMode === 'grid' ? (
                <div className="calendar-grid">
                    {filteredData.map(item => (
                        <div key={item.id} className="calendar-card" onClick={() => setSelectedItem(item)}>
                            <div className="card-header">
                                <div className="date-badge">
                                    <span className="date-day">{item.day.substring(0, 3)}</span>
                                    <span className="date-num">{item.date.split(' ')[0]}</span>
                                </div>
                                <span className="status-value status-pending" style={{ fontSize: '0.7rem' }}>{item.activityCode}</span>
                            </div>
                            <div className="card-body">
                                <span className="activity-tag">{item.activityType}</span>
                                <h3 className="topic-title">{item.topic}</h3>
                                <p className="description-preview">{item.description}</p>
                            </div>
                            <div className="card-footer">
                                <div className="status-indicator">
                                    <span className="status-label">Creative</span>
                                    <span className={`status-value ${getStatusClass(item.creativeStatus)}`}>
                                        {item.creativeStatus.replace('Creative ', '')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {item.reference && <div className="action-icon link"><FaShareSquare /></div>}
                                    <div className="action-icon"><FaEye /></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '1.25rem' }}>Date</th>
                                <th>Code</th>
                                <th>Topic</th>
                                <th>Type</th>
                                <th>Content Status</th>
                                <th style={{ padding: '1.25rem' }}>Creative</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
                                    <td style={{ padding: '1.25rem', fontWeight: 600 }}>{item.date}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.activityCode}</td>
                                    <td style={{ fontWeight: 700 }}>{item.topic}</td>
                                    <td><span className="badge" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary-color)' }}>{item.activityType}</span></td>
                                    <td className={getStatusClass(item.contentStatus)} style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.contentStatus}</td>
                                    <td style={{ padding: '1.25rem' }} className={getStatusClass(item.creativeStatus)}>{item.creativeStatus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedItem && <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </div>
    );
};

export default ContentCalendar;
