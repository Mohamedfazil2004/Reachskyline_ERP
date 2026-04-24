import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { JitsiMeeting } from '@jitsi/react-sdk';
import {
    FaCalendarAlt, FaVideo, FaPlus, FaClock, FaUserTie,
    FaTimes, FaMicrophone, FaVideoSlash, FaCog, FaPlay, FaLink, FaCopy
} from 'react-icons/fa';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const API = '/api/meetings';

export default function Meet() {
    const { user, token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    const [view, setView] = useState('dashboard'); // dashboard, calendar, room, prep
    const [meetings, setMeetings] = useState([]);
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);

    const [activeMeeting, setActiveMeeting] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [createdLink, setCreatedLink] = useState('');

    // Form Data
    const [formData, setFormData] = useState({
        title: '', description: '',
        start_time: '', end_time: '',
        duration: 60, password: '',
        waiting_room: false, recording_enabled: false,
        participants: [], external_emails: ''
    });

    const [prepState, setPrepState] = useState({
        audio: true, video: true
    });

    useEffect(() => {
        axios.get('/api/chat/users', { headers })
            .then(res => setUsers(res.data)).catch(() => {});

        const query = new URLSearchParams(window.location.search);
        const joinId = query.get('join');
        if (joinId) {
            axios.get(`${API}/room/${joinId}`, { headers })
                .then(res => {
                    setActiveMeeting(res.data);
                    setView('prep');
                    // clean url so reloading won't re-trigger
                    window.history.replaceState(null, '', '/meetings');
                }).catch(() => {
                    alert('Meeting link is invalid or expired.');
                });
        }
    }, []);

    useEffect(() => {
        if (view === 'dashboard' || view === 'calendar') {
            fetchMeetings();
            fetchEvents();
        }
    }, [view]);

    const fetchMeetings = async () => {
        try {
            const res = await axios.get(API, { headers });
            setMeetings(res.data);
        } catch (e) { console.error('Error fetching meetings', e); }
    };

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API}/calendar`, { headers });
            setEvents(res.data.map(e => ({
                ...e,
                start: new Date(e.start_time),
                end: new Date(e.end_time)
            })));
        } catch (e) { console.error('Error fetching events', e); }
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            start_time: new Date(formData.start_time).toISOString(),
            end_time: new Date(formData.end_time).toISOString(),
            external_emails: formData.external_emails.split(',').map(m => m.trim()).filter(m => m)
        };
        try {
            const res = await axios.post(API, payload, { headers });
            setShowScheduleModal(false);
            fetchMeetings();
            
            setCreatedLink(`${window.location.origin}/meetings?join=${res.data.meeting_id}`);
            setShowLinkModal(true);
        } catch (e) { 
            console.error('Schedule meeting error:', e);
            alert(`Failed to schedule meeting: ${e.response?.data?.error || e.message}`); 
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            description: formData.description,
            start_time: new Date(formData.start_time).toISOString(),
            end_time: new Date(formData.end_time).toISOString(),
            type: 'Personal'
        };
        try {
            await axios.post(`${API}/calendar`, payload, { headers });
            setShowEventModal(false);
            fetchEvents();
        } catch (e) { alert('Failed to add event'); }
    };

    const startInstantMeeting = async () => {
        try {
            const res = await axios.post(API, {
                title: `${user?.name || 'My'}'s Meeting`,
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                duration: 60
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            const newMeeting = res.data;
            setCreatedLink(`${window.location.origin}/meetings?join=${newMeeting.meeting_id}`);
            setShowLinkModal(true);
            fetchMeetings();

            // Automatically join the meeting room interface
            setActiveMeeting(newMeeting);
            setView('prep');
        } catch (e) { 
            console.error('Instant meeting error:', e);
            if (e.response?.status === 401) {
                // Token expired or invalid - clear it and redirect to login
                localStorage.removeItem('erp_token');
                alert('Your session has expired. Please log in again.');
                window.location.href = '/login';
                return;
            }
            alert(`Failed to create meeting link: ${e.response?.data?.error || e.message}`); 
        }
    };

    const joinMeeting = (meeting) => {
        setActiveMeeting(meeting);
        setView('prep');
    };

    const deleteMeeting = async (id) => {
        if (!window.confirm('Delete this meeting?')) return;
        try {
            await axios.delete(`${API}/${id}`, { headers });
            fetchMeetings();
        } catch { alert('Failed or unauthorized'); }
    };

    // ── Pre-Join Room ────────────────────────────────────────────────────────
    if (view === 'prep' && activeMeeting) {
        return (
            <div style={S.prepWrap}>
                <div style={S.prepCard}>
                    <h2>Ready to join?</h2>
                    <p>{activeMeeting.title}</p>
                    <div style={S.previewBox}>
                        {!prepState.video && <div style={S.noVideo}>Camera is off</div>}
                    </div>
                    <div style={{ display:'flex', gap: 15, margin: '20px 0', justifyContent: 'center' }}>
                        <button onClick={() => setPrepState(p => ({...p, audio: !p.audio}))} style={{...S.toolBtn, background: prepState.audio?'#374151':'#ef4444'}}>
                            {prepState.audio ? <FaMicrophone /> : <span style={{display:'flex', alignItems:'center', gap:5}}><FaMicrophone color="white" /><FaTimes size={10} color="white"/></span>}
                        </button>
                        <button onClick={() => setPrepState(p => ({...p, video: !p.video}))} style={{...S.toolBtn, background: prepState.video?'#374151':'#ef4444'}}>
                            {prepState.video ? <FaVideo /> : <FaVideoSlash />}
                        </button>
                    </div>
                    <button style={S.primaryBtnLg} onClick={() => setView('room')}>Join Now</button>
                    <button style={S.ghostBtn} onClick={() => { setActiveMeeting(null); setView('dashboard'); }}>Cancel</button>
                </div>
            </div>
        );
    }

    // ── Meeting Room (Jitsi) ─────────────────────────────────────────────────
    if (view === 'room' && activeMeeting) {
        return (
            <div style={{ width: '100%', height: 'calc(100vh - 70px)', background: '#000' }}>
                <JitsiMeeting
                    domain="meet.jit.si"
                    roomName={`SkylineERP_${activeMeeting.meeting_id.replace(/-/g, '')}`}
                    userInfo={{
                        displayName: user.name,
                        email: user.email
                    }}
                    configOverwrite={{
                        prejoinPageEnabled: false,
                        startWithAudioMuted: !prepState.audio,
                        startWithVideoMuted: !prepState.video,
                        disableModeratorIndicator: false,
                        enableSaveLogs: false
                    }}
                    interfaceConfigOverwrite={{
                        TOOLBAR_BUTTONS: [
                            'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting', 'fullscreen',
                            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'
                        ]
                    }}
                    getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
                    onApiReady={(externalApi) => {
                        // Hook events when API is ready
                        externalApi.addListener('videoConferenceLeft', () => {
                            setActiveMeeting(null);
                            setView('dashboard');
                        });
                        
                        // Apply password if exists and host
                        if (activeMeeting.host_id === user.id && activeMeeting.password) {
                            externalApi.addListener('participantRoleChanged', (event) => {
                                if (event.role === "moderator") {
                                    externalApi.executeCommand('password', activeMeeting.password);
                                }
                            });
                        }
                    }}
                />
            </div>
        );
    }

    // ── Tabs ────────────────────────────────────────────────────────────────
    return (
        <div style={S.container}>
            {/* Header / Tabs */}
            <div style={S.header}>
                <h1 style={S.pageTitle}>Meetings & Calendar</h1>
                <div style={S.tabs}>
                    <button style={view === 'dashboard' ? S.tabActive : S.tab} onClick={() => setView('dashboard')}>
                        <FaVideo /> Dashboard
                    </button>
                    <button style={view === 'calendar' ? S.tabActive : S.tab} onClick={() => setView('calendar')}>
                        <FaCalendarAlt /> Calendar
                    </button>
                </div>
            </div>

            {/* Dashboard View */}
            {view === 'dashboard' && (
                <div style={S.content}>
                    <div style={S.actionsBar}>
                        <button style={S.primaryBtn} onClick={startInstantMeeting}><FaLink /> Create Meeting Link</button>
                        <button style={S.secondaryBtn} onClick={() => {
                            setFormData({
                                title: '', description: '',
                                start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                                end_time: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
                                duration: 60, password: '',
                                waiting_room: false, recording_enabled: false,
                                participants: [], external_emails: ''
                            });
                            setShowScheduleModal(true);
                        }}><FaPlus /> Schedule Meeting</button>
                    </div>

                    <div style={S.grid}>
                        <div style={S.card}>
                            <h3 style={S.cardTitle}>Upcoming Meetings</h3>
                            {meetings.filter(m => new Date(m.start_time) > new Date()).length === 0 ? (
                                <p style={S.empty}>No upcoming meetings</p>
                            ) : meetings.filter(m => new Date(m.start_time) > new Date()).map(m => (
                                <div key={m.id} style={S.meetingItem}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{m.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            <FaClock style={{marginRight: 4}} />{new Date(m.start_time).toLocaleString()}
                                            <span style={{marginLeft: 10}}><FaUserTie style={{marginRight: 4}}/>Host: {m.host_name}</span>
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', gap: 8 }}>
                                        <button style={S.joinBtn} onClick={() => joinMeeting(m)}>Join</button>
                                        {(m.host_id === user.id || user.role === 'Admin') && (
                                            <button style={{...S.joinBtn, background:'#ef4444'}} onClick={() => deleteMeeting(m.id)}>Del</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={S.card}>
                            <h3 style={S.cardTitle}>My Created Meetings</h3>
                            {meetings.filter(m => m.host_id === user.id).length === 0 ? (
                                <p style={S.empty}>You haven't created any meetings</p>
                            ) : meetings.filter(m => m.host_id === user.id).map(m => (
                                <div key={m.id} style={S.meetingItem}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{m.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            ID: {m.meeting_id}
                                        </div>
                                    </div>
                                    <button style={S.joinBtn} onClick={() => joinMeeting(m)}>Start</button>
                                </div>
                            ))}
                        </div>
                        <div style={S.card}>
                            <h3 style={S.cardTitle}>Past Meetings</h3>
                            {meetings.filter(m => new Date(m.start_time) <= new Date()).length === 0 ? (
                                <p style={S.empty}>No past meetings</p>
                            ) : meetings.filter(m => new Date(m.start_time) <= new Date()).map(m => (
                                <div key={m.id} style={{...S.meetingItem, borderLeft: '4px solid #94a3b8', opacity: 0.8}}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{m.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            <FaClock style={{marginRight: 4}} />{new Date(m.start_time).toLocaleString()}
                                            <span style={{marginLeft: 10}}><FaUserTie style={{marginRight: 4}}/>Host: {m.host_name}</span>
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', gap: 8 }}>
                                        <span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: 600, padding: '6px 14px'}}>Ended</span>
                                        {(m.host_id === user.id || user.role === 'Admin') && (
                                            <button style={{...S.joinBtn, background:'#ef4444'}} onClick={() => deleteMeeting(m.id)}>Del</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar View */}
            {view === 'calendar' && (
                <div style={{...S.content, flex: 1, display: 'flex', flexDirection: 'column'}}>
                    <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={S.secondaryBtn} onClick={() => {
                            setFormData({...formData, title:'', description:'', type:'Personal'});
                            setShowEventModal(true);
                        }}><FaPlus /> Add Event</button>
                    </div>
                    <div style={{ flex: 1, background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%', minHeight: 600 }}
                            views={['month', 'week', 'day', 'agenda']}
                            selectable={true}
                            onSelectSlot={({ start, end }) => {
                                setFormData({
                                    ...formData,
                                    title: '', description: '',
                                    start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
                                    end_time: format(end, "yyyy-MM-dd'T'HH:mm")
                                });
                                setShowScheduleModal(true);
                            }}
                            eventPropGetter={(event) => ({
                                style: { backgroundColor: event.color || '#4f46e5' }
                            })}
                            onSelectEvent={(event) => {
                                if (event.type === 'Meeting') {
                                    alert(`Meeting: ${event.title}\nID: ${event.meeting_id}`);
                                } else {
                                    alert(`Event: ${event.title}\n${event.description || ''}`);
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Modals */}
            {showLinkModal && (
                <div style={S.modalOverlay}>
                    <div style={{...S.modal, textAlign: 'center'}}>
                        <h3 style={{ marginBottom: 15 }}>Meeting Created Successfully</h3>
                        <p style={{ color: '#64748b', marginBottom: 20 }}>Share this link with participants. Anyone with the link can join the meeting.</p>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 25 }}>
                            <input style={{...S.input, flex: 1, backgroundColor: '#f1f5f9', color: '#475569'}} readOnly value={createdLink} />
                            <button style={S.primaryBtn} onClick={() => {
                                navigator.clipboard.writeText(createdLink);
                                alert("Link Copied!");
                            }}><FaCopy /></button>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button style={S.secondaryBtn} onClick={() => setShowLinkModal(false)}>Close</button>
                            <button style={S.primaryBtn} onClick={() => {
                                setShowLinkModal(false);
                                window.location.href = createdLink;
                            }}>Join Meeting Now</button>
                        </div>
                    </div>
                </div>
            )}

            {showScheduleModal && (
                <div style={S.modalOverlay}>
                    <div style={S.modal}>
                        <h3>Schedule Meeting</h3>
                        <form onSubmit={handleSchedule}>
                            <div style={S.formGroup}>
                                <label>Title</label>
                                <input style={S.input} required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: 15 }}>
                                <div style={S.formGroup}>
                                    <label>Start Time</label>
                                    <input type="datetime-local" style={S.input} required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                                </div>
                                <div style={S.formGroup}>
                                    <label>End Time</label>
                                    <input type="datetime-local" style={S.input} required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                                </div>
                            </div>
                            <div style={S.formGroup}>
                                <label>Participants (Internal)</label>
                                <select multiple style={{...S.input, height: 100}} value={formData.participants} onChange={e => setFormData({...formData, participants: Array.from(e.target.selectedOptions, option => parseInt(option.value))})}>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            <div style={S.formGroup}>
                                <label>External Invites (comma separated emails)</label>
                                <input style={S.input} value={formData.external_emails} onChange={e => setFormData({...formData, external_emails: e.target.value})} placeholder="client@example.com, ..." />
                            </div>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <label><input type="checkbox" checked={formData.waiting_room} onChange={e => setFormData({...formData, waiting_room: e.target.checked})} /> Enable Waiting Room</label>
                                <label><input type="checkbox" checked={formData.recording_enabled} onChange={e => setFormData({...formData, recording_enabled: e.target.checked})} /> Allow Recording</label>
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" style={S.ghostBtn} onClick={() => setShowScheduleModal(false)}>Cancel</button>
                                <button type="submit" style={S.primaryBtn}>Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEventModal && (
                <div style={S.modalOverlay}>
                    <div style={S.modal}>
                        <h3>Add Calendar Event</h3>
                        <form onSubmit={handleCreateEvent}>
                            <div style={S.formGroup}>
                                <label>Event Title</label>
                                <input style={S.input} required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div style={S.formGroup}>
                                <label>Description (Optional)</label>
                                <textarea style={S.input} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', gap: 15 }}>
                                <div style={S.formGroup}>
                                    <label>Start Time</label>
                                    <input type="datetime-local" style={S.input} required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                                </div>
                                <div style={S.formGroup}>
                                    <label>End Time</label>
                                    <input type="datetime-local" style={S.input} required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                                </div>
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" style={S.ghostBtn} onClick={() => setShowEventModal(false)}>Cancel</button>
                                <button type="submit" style={S.primaryBtn}>Save Event</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
    container: { padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pageTitle: { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' },
    tabs: { display: 'flex', gap: 5, background: '#e2e8f0', padding: 4, borderRadius: 10 },
    tab: { padding: '8px 16px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 },
    tabActive: { padding: '8px 16px', border: 'none', background: '#fff', color: '#4f46e5', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    content: { flex: 1, overflowY: 'auto' },
    actionsBar: { display: 'flex', gap: 15, marginBottom: 25 },
    primaryBtn: { background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s', fontSize: '0.9rem' },
    secondaryBtn: { background: '#fff', color: '#1e293b', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.9rem' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 },
    card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
    cardTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: 15, color: '#0f172a' },
    meetingItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8fafc', borderRadius: 8, marginBottom: 10, borderLeft: '4px solid #4f46e5' },
    joinBtn: { background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' },
    empty: { color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' },
    prepWrap: { width: '100%', height: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' },
    prepCard: { background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', width: 450 },
    previewBox: { width: '100%', height: 220, background: '#1e293b', borderRadius: 12, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    noVideo: { color: '#94a3b8', fontWeight: 600 },
    toolBtn: { width: 48, height: 48, borderRadius: '50%', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer' },
    primaryBtnLg: { background: '#4f46e5', color: '#fff', width: '100%', border: 'none', padding: '14px', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginBottom: 10 },
    ghostBtn: { background: 'transparent', color: '#64748b', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: '#fff', width: 550, borderRadius: 16, padding: 30, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 15, flex: 1 },
    input: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.95rem', outline: 'none' }
};
