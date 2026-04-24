import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
    FaSearch, FaPaperclip, FaPaperPlane,
    FaFileAlt, FaEllipsisV, FaRegSmile, FaCheckDouble,
    FaWhatsapp, FaTimes, FaMicrophone, FaStop, FaUsers,
    FaRegCommentDots, FaPlay, FaChevronDown, FaChevronUp, FaCrown
} from 'react-icons/fa';

const API = '/api/chat';

// ── Quick Reaction Emojis ─────────────────────────────────────────────────
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '✅'];

// ── Emoji Palette ─────────────────────────────────────────────────────────
const EMOJI_GROUPS = [
    { label: '😀 Smiley', emojis: ['😀', '😄', '😂', '🤣', '😊', '😍', '😎', '🥳', '😇', '🤩'] },
    { label: '✅ Work Done', emojis: ['✅', '☑️', '👍', '🏆', '🎯', '💯', '🙌', '👏', '🥇', '🎉'] },
    { label: '❌ Not Done', emojis: ['❌', '🚫', '⛔', '😤', '😒', '🙁', '💔', '⚠️', '🛑', '🤦'] },
    { label: '🎭 Fun', emojis: ['🎬', '🎵', '🎮', '🎭', '🎤', '🎸', '🎲', '🍕', '🎂', '🎁'] },
    { label: '❤️ Reactions', emojis: ['❤️', '🔥', '👀', '🙏', '💪', '💡', '🤝', '🌟', '✨', '🥂'] },
];

function stringToColor(s) {
    const palette = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#ea580c'];
    let h = 0; for (const c of s) h += c.charCodeAt(0);
    return palette[h % palette.length];
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Chat() {
    const { user, token } = useAuth();
    const headers = { Authorization: `Bearer ${token}` };

    // ── State ──────────────────────────────────────────────────────────────
    const [tab, setTab] = useState('dm');          // 'dm' | 'groups'
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null); // { type:'dm'|'group', data }
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [unread, setUnread] = useState({ total_unread: 0, by_sender: {} });
    const [showEmoji, setShowEmoji] = useState(false);
    const [emojiTab, setEmojiTab] = useState(0);
    const [recording, setRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const [reactTarget, setReactTarget] = useState(null); // msg id
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [showMembers, setShowMembers] = useState(false);

    const fileRef = useRef(null);
    const bottomRef = useRef(null);
    const mediaRef = useRef(null);   // MediaRecorder
    const chunksRef = useRef([]);
    const recTimerRef = useRef(null);
    const textareaRef = useRef(null);

    // ── Fetch users + groups once ──────────────────────────────────────────
    useEffect(() => {
        axios.get(`${API}/users`, { headers }).then(r => setUsers(r.data)).catch(() => { });
        axios.get(`${API}/groups`, { headers }).then(r => setGroups(r.data)).catch(() => { });
    }, []);

    // ── Poll unread badge every 5 s ────────────────────────────────────────
    useEffect(() => {
        const fetch = () => axios.get(`${API}/unread-counts`, { headers })
            .then(r => setUnread(r.data)).catch(() => { });
        fetch();
        const t = setInterval(fetch, 5000);
        return () => clearInterval(t);
    }, []);

    // ── Fetch messages for active chat ─────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        if (!selected) return;
        setLoadingMsgs(true);
        try {
            const url = selected.type === 'dm'
                ? `${API}/messages/${selected.data.id}`
                : `${API}/groups/${selected.data.id}/messages`;
            const res = await axios.get(url, { headers });
            setMessages(res.data);
            if (selected.type === 'dm') {
                setUnread(prev => {
                    const bs = { ...prev.by_sender };
                    const n = bs[String(selected.data.id)] || 0;
                    delete bs[String(selected.data.id)];
                    return { total_unread: Math.max(0, prev.total_unread - n), by_sender: bs };
                });
            }
        } catch { }
        setLoadingMsgs(false);
    }, [selected]);

    useEffect(() => {
        if (!selected) return;
        fetchMessages();
        const t = setInterval(fetchMessages, 3000);
        return () => clearInterval(t);
    }, [selected, fetchMessages]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── Paste screenshot ───────────────────────────────────────────────────
    useEffect(() => {
        const onPaste = async (e) => {
            if (!selected) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const formData = new FormData();
                    formData.append('file', blob, `paste_${Date.now()}.png`);
                    try {
                        setUploading(true);
                        const up = await axios.post(`${API}/upload`, formData, {
                            headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                        });
                        await sendAttachment(up.data.file_path, 'image', '📸 Screenshot');
                    } finally { setUploading(false); }
                }
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [selected, headers]);

    // ── Send message ───────────────────────────────────────────────────────
    const sendMsg = async (e) => {
        if (e) e.preventDefault();
        if (!text.trim() || !selected) return;
        const body = selected.type === 'dm'
            ? { receiver_id: selected.data.id, message: text }
            : { message: text };
        const url = selected.type === 'dm' ? `${API}/messages` : `${API}/groups/${selected.data.id}/messages`;
        try {
            const res = await axios.post(url, body, { headers });
            setMessages(p => [...p, res.data]);
            setText('');
            setShowEmoji(false);
        } catch { }
    };

    const sendAttachment = async (path, type, label) => {
        if (!selected) return;
        const body = selected.type === 'dm'
            ? { receiver_id: selected.data.id, attachment_path: path, attachment_type: type, message: label }
            : { attachment_path: path, attachment_type: type, message: label };
        const url = selected.type === 'dm' ? `${API}/messages` : `${API}/groups/${selected.data.id}/messages`;
        const res = await axios.post(url, body, { headers });
        setMessages(p => [...p, res.data]);
    };

    // ── File upload ────────────────────────────────────────────────────────
    const onFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !selected) return;
        setUploading(true);
        const fd = new FormData(); fd.append('file', file);
        try {
            const up = await axios.post(`${API}/upload`, fd, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
            });
            const type = file.type.startsWith('image/') ? 'image'
                : file.type.startsWith('video/') ? 'video' : 'document';
            await sendAttachment(up.data.file_path, type, `📎 ${file.name}`);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    // ── Voice recording ────────────────────────────────────────────────────
    const startRec = async () => {
        if (!navigator.mediaDevices) return alert('Microphone not supported');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chunksRef.current = [];
            const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mr.ondataavailable = e => chunksRef.current.push(e.data);
            mr.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const fd = new FormData();
                fd.append('file', blob, `voice_${Date.now()}.webm`);
                setUploading(true);
                try {
                    const up = await axios.post(`${API}/upload`, fd, {
                        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                    });
                    await sendAttachment(up.data.file_path, 'voice', '🎙️ Voice Note');
                } finally { setUploading(false); }
            };
            mr.start();
            mediaRef.current = mr;
            setRecording(true);
            setRecSeconds(0);
            recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
        } catch (err) { alert('Microphone access denied'); }
    };

    const stopRec = () => {
        mediaRef.current?.stop();
        clearInterval(recTimerRef.current);
        setRecording(false);
    };

    // ── Reaction ───────────────────────────────────────────────────────────
    const sendReaction = async (msgId, emoji, isGroup) => {
        const url = isGroup
            ? `${API}/groups/${selected.data.id}/messages/${msgId}/react`
            : `${API}/messages/${msgId}/react`;
        try {
            const res = await axios.post(url, { emoji }, { headers });
            setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
        } catch { }
        setReactTarget(null);
    };

    // ── Filtered lists ─────────────────────────────────────────────────────
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );
    const totalBadge = unread.total_unread;

    return (
        <div style={{ height: 'calc(100vh - 80px)' }}>
            <div style={S.wrap}>

                {/* ═══ SIDEBAR ═══════════════════════════════════════════ */}
                <div style={S.sidebar}>
                    {/* Header */}
                    <div style={S.sideHead}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ ...S.avLg, background: stringToColor(user.name) }}>{user.name[0]}</div>
                            <div>
                                <div style={S.myName}>{user.name === 'System Admin' ? 'Branch Manager' : user.name}</div>
                                <div style={S.myRole}>{user.role}</div>
                            </div>
                        </div>
                        {totalBadge > 0 && <div style={S.globalBadge}>{totalBadge > 99 ? '99+' : totalBadge}</div>}
                    </div>

                    {/* Tab bar */}
                    <div style={S.tabBar}>
                        <button style={{ ...S.tabBtn, ...(tab === 'dm' ? S.tabActive : {}) }} onClick={() => setTab('dm')}>
                            <FaRegCommentDots /> Chats
                        </button>
                        <button style={{ ...S.tabBtn, ...(tab === 'groups' ? S.tabActive : {}) }} onClick={() => setTab('groups')}>
                            <FaUsers /> Groups
                        </button>
                    </div>

                    {/* Search */}
                    <div style={{ padding: '8px 14px' }}>
                        <div style={S.searchWrap}>
                            <FaSearch style={{ color: '#8696a0', fontSize: '0.8rem' }} />
                            <input style={S.searchIn} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>

                    {/* List */}
                    <div style={S.list}>
                        {tab === 'dm' ? filteredUsers.map(u => {
                            const badge = unread.by_sender?.[String(u.id)] || 0;
                            const active = selected?.type === 'dm' && selected.data.id === u.id;
                            return (
                                <div key={u.id} style={{ ...S.item, background: active ? '#f0f2f5' : '#fff', borderLeft: active ? '4px solid #4f46e5' : '4px solid transparent' }}
                                    onClick={() => { setSelected({ type: 'dm', data: u }); setShowEmoji(false); setReactTarget(null); setShowMembers(false); }}>
                                    <div style={{ ...S.avMd, background: stringToColor(u.name) }}>{u.name[0]}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111b21' }}>{u.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#667781' }}>{u.role}</div>
                                    </div>
                                    {badge > 0 && <div style={S.badge}>{badge}</div>}
                                </div>
                            );
                        }) : filteredGroups.map(g => {
                            const active = selected?.type === 'group' && selected.data.id === g.id;
                            return (
                                <div key={g.id} style={{ ...S.item, background: active ? '#f0f2f5' : '#fff', borderLeft: active ? '4px solid #25d366' : '4px solid transparent' }}
                                    onClick={() => { setSelected({ type: 'group', data: g }); setShowEmoji(false); setReactTarget(null); setShowMembers(false); }}>
                                    <div style={{ ...S.avMd, background: '#1e293b', fontSize: '1.3rem' }}>{g.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111b21' }}>{g.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#667781' }}>{g.member_ids?.length} members</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ CHAT MAIN ═════════════════════════════════════════ */}
                <div style={S.main}>
                    {selected ? (<>
                        {/* Header */}
                        <div style={S.chatHead}>
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: selected.type === 'group' ? 'pointer' : 'default', flex: 1 }}
                                onClick={() => selected.type === 'group' && setShowMembers(p => !p)}
                            >
                                <div style={{ ...S.avMd, background: selected.type === 'group' ? '#1e293b' : stringToColor(selected.data.name), fontSize: selected.type === 'group' ? '1.2rem' : '1rem' }}>
                                    {selected.type === 'group' ? selected.data.icon : selected.data.name[0]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {selected.data.name}
                                        {selected.type === 'group' && (
                                            showMembers
                                                ? <FaChevronUp style={{ fontSize: '0.65rem', color: '#4f46e5' }} />
                                                : <FaChevronDown style={{ fontSize: '0.65rem', color: '#8696a0' }} />
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#25d366', fontWeight: 700 }}>
                                        {selected.type === 'group'
                                            ? `${selected.data.members?.length ?? selected.data.member_ids?.length ?? 0} members · tap to view`
                                            : selected.data.role}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 18, color: '#54656f' }}>
                                <FaSearch style={{ cursor: 'pointer' }} />
                                <FaEllipsisV style={{ cursor: 'pointer' }} />
                            </div>
                        </div>

                        {/* Group Members Panel */}
                        {selected.type === 'group' && showMembers && (
                            <div style={S.membersPanel}>
                                <div style={S.membersPanelHeader}>
                                    <FaUsers style={{ color: '#4f46e5' }} />
                                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111b21' }}>
                                        {selected.data.name} — Members ({selected.data.members?.length ?? 0})
                                    </span>
                                    <button style={S.memberCloseBtn} onClick={() => setShowMembers(false)}><FaTimes /></button>
                                </div>
                                <div style={S.membersList}>
                                    {(selected.data.members || []).map(m => (
                                        <div key={m.id} style={S.memberCard}>
                                            <div style={{ ...S.avSm, background: stringToColor(m.name) }}>{m.name[0]}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111b21', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {m.name}
                                                    {m.is_admin && <FaCrown style={{ color: '#f59e0b', fontSize: '0.65rem' }} title="Admin" />}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#667781' }}>{m.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div style={S.msgs} onClick={() => setReactTarget(null)}>
                            <div style={S.encNote}>🔒 Skyline internal chat — end-to-end private</div>
                            {messages.map(msg => {
                                const mine = msg.sender_id === user.id;
                                const isGroup = selected.type === 'group';
                                return (
                                    <div key={msg.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '65%', position: 'relative' }}>
                                        {/* Sender name for group */}
                                        {isGroup && !mine && (
                                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: stringToColor(msg.sender_name), marginBottom: 2, paddingLeft: 8 }}>
                                                {msg.sender_name}
                                            </div>
                                        )}
                                        <div
                                            style={{ ...S.bubble, background: mine ? '#d9fdd3' : '#fff', borderTopRightRadius: mine ? 2 : 12, borderTopLeftRadius: mine ? 12 : 2 }}
                                            onDoubleClick={() => setReactTarget(reactTarget === msg.id ? null : msg.id)}
                                        >
                                            {msg.attachment_path && <AttachView path={msg.attachment_path} type={msg.attachment_type} />}
                                            {msg.message && <div style={{ fontSize: '0.9rem', color: '#111b21', overflowWrap: 'anywhere' }}>{msg.message}</div>}
                                            <div style={S.meta}>
                                                <span>{fmtTime(msg.created_at)}</span>
                                                {mine && !isGroup && <FaCheckDouble style={{ color: msg.is_read ? '#34b7f1' : '#8696a0', fontSize: '0.65rem' }} />}
                                            </div>
                                        </div>

                                        {/* Existing reactions */}
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                                                {Object.entries(msg.reactions).map(([em, ids]) => (
                                                    <button key={em} onClick={() => sendReaction(msg.id, em, isGroup)}
                                                        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '2px 7px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                                        {em} {ids.length}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Quick reaction popup */}
                                        {reactTarget === msg.id && (
                                            <div style={{ ...S.reactPop, [mine ? 'right' : 'left']: 0 }}>
                                                {QUICK_REACTIONS.map(em => (
                                                    <button key={em} style={S.reactBtn}
                                                        onClick={() => sendReaction(msg.id, em, isGroup)}>
                                                        {em}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Emoji Picker */}
                        {showEmoji && (
                            <div style={S.emojiPanel}>
                                <button style={S.emojiClose} onClick={() => setShowEmoji(false)}><FaTimes /></button>
                                <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                                    {EMOJI_GROUPS.map((g, i) => (
                                        <button key={i} style={{ ...S.eTabBtn, background: emojiTab === i ? '#4f46e5' : '#f1f5f9', color: emojiTab === i ? '#fff' : '#475569' }}
                                            onClick={() => setEmojiTab(i)}>{g.label}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 3 }}>
                                    {EMOJI_GROUPS[emojiTab].emojis.map(em => (
                                        <button key={em} style={{ background: 'none', border: 'none', fontSize: '1.45rem', cursor: 'pointer', borderRadius: 6, padding: 3 }}
                                            onClick={() => setText(t => t + em)}>{em}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input bar */}
                        <div style={S.inputBar}>
                            <button style={S.iconBtn} title="Emoji" onClick={() => setShowEmoji(p => !p)}><FaRegSmile /></button>
                            <button style={S.iconBtn} title="Attach" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                {uploading ? <span style={{ fontSize: '0.7rem' }}>…</span> : <FaPaperclip />}
                            </button>
                            <input type="file" style={{ display: 'none' }} ref={fileRef} onChange={onFile} />

                            {/* Voice record button */}
                            {!recording ? (
                                <button style={{ ...S.iconBtn, color: '#25d366' }} title="Voice Note" onClick={startRec}>
                                    <FaMicrophone />
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'blink 1s infinite' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>{fmtDuration(recSeconds)}</span>
                                    <button style={{ ...S.iconBtn, color: '#ef4444' }} onClick={stopRec}><FaStop /></button>
                                </div>
                            )}

                            <form onSubmit={sendMsg} style={{ flex: 1 }}>
                                <input
                                    ref={textareaRef}
                                    style={S.textIn}
                                    type="text"
                                    placeholder="Type a message…"
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                            </form>
                            <button style={S.sendBtn} onClick={sendMsg}><FaPaperPlane /></button>
                        </div>
                    </>) : (
                        <EmptyState />
                    )}
                </div>
            </div>

            <style>{`
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
            `}</style>
        </div>
    );
}

// ── Attachment viewer ────────────────────────────────────────────────────────
function AttachView({ path, type }) {
    const url = `/${path}`;
    if (type === 'image') return (
        <img src={url} alt="img" onClick={() => window.open(url, '_blank')}
            style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', marginBottom: 6, display: 'block' }} />
    );
    if (type === 'video') return (
        <video controls style={{ width: '100%', borderRadius: 8, marginBottom: 6 }}><source src={url} /></video>
    );
    if (type === 'voice') return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(79,70,229,0.08)', padding: '8px 14px', borderRadius: 20, marginBottom: 6 }}>
            <FaPlay style={{ color: '#4f46e5' }} />
            <audio controls style={{ height: 32, flex: 1 }}><source src={url} /></audio>
        </div>
    );
    return (
        <div onClick={() => window.open(url, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,0,0,0.06)', borderRadius: 8, cursor: 'pointer', marginBottom: 6 }}>
            <FaFileAlt style={{ color: '#4f46e5', fontSize: '1.4rem' }} />
            <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }}>Open Document</span>
        </div>
    );
}

function EmptyState() {
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', color: '#8696a0', textAlign: 'center', padding: 40 }}>
            <FaWhatsapp style={{ fontSize: 100, color: '#25d366', marginBottom: 24, filter: 'drop-shadow(0 8px 16px rgba(37,211,102,0.3))' }} />
            <h2 style={{ color: '#111b21', marginBottom: 10 }}>Skyline Chat</h2>
            <p style={{ maxWidth: 420, lineHeight: 1.7 }}>Select a contact or group to start chatting.<br />Send messages, images, videos, voice notes & documents.<br /><b>Tip: Double-tap any message to react!</b></p>
        </div>
    );
}

// ── Styles object ────────────────────────────────────────────────────────────
const S = {
    wrap: { display: 'flex', height: '100%', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' },
    sidebar: { width: 350, borderRight: '1px solid #f0f2f5', display: 'flex', flexDirection: 'column', background: '#fff' },
    sideHead: { padding: '14px 18px', background: '#f0f2f5', borderBottom: '1px solid #e9edef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    avLg: { width: 44, height: 44, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 },
    avMd: { width: 44, height: 44, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0 },
    myName: { fontWeight: 800, fontSize: '0.92rem', color: '#111b21' },
    myRole: { fontSize: '0.7rem', color: '#667781', fontWeight: 600 },
    globalBadge: { background: '#25d366', color: '#fff', borderRadius: '50%', minWidth: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem', padding: '0 6px' },
    tabBar: { display: 'flex', borderBottom: '2px solid #f0f2f5' },
    tabBtn: { flex: 1, padding: '10px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#8696a0', transition: 'all 0.2s' },
    tabActive: { color: '#4f46e5', borderBottom: '2px solid #4f46e5' },
    searchWrap: { display: 'flex', alignItems: 'center', gap: 8, background: '#f0f2f5', borderRadius: 8, padding: '7px 12px' },
    searchIn: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem' },
    list: { flex: 1, overflowY: 'auto' },
    item: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' },
    badge: { minWidth: 22, height: 22, borderRadius: 11, background: '#25d366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.7rem', padding: '0 5px', flexShrink: 0 },
    main: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f2f5', position: 'relative', overflow: 'hidden' },
    chatHead: { padding: '10px 22px', background: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9edef' },
    msgs: { flex: 1, padding: '16px 50px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 },
    encNote: { textAlign: 'center', fontSize: '0.7rem', background: '#fff9c4', color: '#5d4037', padding: '4px 12px', borderRadius: 8, marginBottom: 12, display: 'inline-block', alignSelf: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
    bubble: { padding: '8px 12px 5px', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', wordBreak: 'break-word' },
    meta: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, fontSize: '0.63rem', color: '#8696a0', marginTop: 3 },
    reactPop: { position: 'absolute', top: -44, background: '#fff', borderRadius: 24, padding: '6px 10px', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', display: 'flex', gap: 4, zIndex: 10 },
    reactBtn: { background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', borderRadius: 8, padding: 3, transition: 'transform 0.15s' },
    emojiPanel: { position: 'absolute', bottom: 64, left: 10, right: 10, background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', border: '1px solid #e2e8f0', zIndex: 100 },
    emojiClose: { position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.95rem' },
    eTabBtn: { border: 'none', borderRadius: 20, padding: '4px 10px', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' },
    inputBar: { padding: '8px 14px', background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #e9edef' },
    iconBtn: { background: 'none', border: 'none', color: '#54656f', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8, transition: 'all 0.2s', flexShrink: 0 },
    textIn: { width: '100%', border: 'none', outline: 'none', background: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: '0.92rem', color: '#111b21' },
    sendBtn: { background: '#4f46e5', color: '#fff', width: 44, height: 44, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)', transition: 'all 0.2s', flexShrink: 0 },
    membersPanel: { background: '#fff', borderBottom: '1px solid #e9edef', padding: '12px 20px', maxHeight: 220, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', zIndex: 5 },
    membersPanelHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
    memberCloseBtn: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' },
    membersList: { display: 'flex', flexWrap: 'wrap', gap: 8, overflowY: 'auto' },
    memberCard: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', minWidth: 160, flex: '1 1 160px', maxWidth: 220 },
    avSm: { width: 32, height: 32, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 },
};
