import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function WhatsAppIcon() {
    const navigate = useNavigate();
    const location = useLocation();
    const { token } = useAuth();
    const [totalUnread, setTotalUnread] = useState(0);

    // Poll unread count every 5 s from anywhere in the app
    useEffect(() => {
        if (!token) return;
        const fetchBadge = async () => {
            try {
                const res = await axios.get('/api/chat/unread-counts', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTotalUnread(res.data.total_unread || 0);
            } catch { }
        };
        fetchBadge();
        const t = setInterval(fetchBadge, 5000);
        return () => clearInterval(t);
    }, [token]);

    // Don't show icon if already on chat page
    if (location.pathname === '/chat') return null;
    if (!token) return null;

    return (
        <div
            onClick={() => navigate('/chat')}
            style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                width: '62px',
                height: '62px',
                backgroundColor: '#25D366',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '30px',
                boxShadow: '0 6px 20px rgba(37, 211, 102, 0.5)',
                cursor: 'pointer',
                zIndex: 1000,
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                animation: 'wa-pulse 2.5s infinite'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.12) translateY(-4px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Open Skyline Chat"
        >
            <FaWhatsapp />

            {/* Global unread badge */}
            {totalUnread > 0 && (
                <div style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    minWidth: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    padding: '0 5px',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    animation: 'badge-pop 0.3s ease-out'
                }}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                </div>
            )}

            <style>{`
                @keyframes wa-pulse {
                    0%   { box-shadow: 0 0 0 0 rgba(37,211,102,0.7); }
                    70%  { box-shadow: 0 0 0 16px rgba(37,211,102,0); }
                    100% { box-shadow: 0 0 0 0  rgba(37,211,102,0); }
                }
                @keyframes badge-pop {
                    0%   { transform: scale(0); }
                    80%  { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
