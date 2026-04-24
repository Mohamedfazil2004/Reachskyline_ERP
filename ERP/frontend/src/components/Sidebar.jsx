import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    FaThLarge, FaCalendarAlt, FaBriefcase, FaCamera, FaVideo,
    FaChartBar, FaUsers, FaCog, FaSignOutAlt, FaRocket, FaPaperPlane, FaRobot, FaListAlt, FaPlay, FaHistory, FaGlobe, FaWhatsapp
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();

    const isEditor = user?.role === 'Video Editor' || user?.role === 'Editor';
    const isWebsiteHead = user?.role === 'Website Head';
    const isWebsiteEmployee = user?.role === 'Website Employee';
    const dashName = isWebsiteHead ? 'Team Task Board' : 'Dashboard';
    const dashPath = isEditor ? '/editor-dashboard' : (isWebsiteHead ? '/website-assign-tasks' : (isWebsiteEmployee ? '/website-employee-dashboard' : '/dashboard'));
    const isStaffRole = ['Business Development Head', 'HR', 'Website & SEO Head'].includes(user?.role);

    const menuItems = [
        { name: 'Analytics', path: '/website-dashboard', icon: <FaChartBar />, roles: ['Website Head'] },
        { name: dashName, path: dashPath, icon: <FaThLarge />, roles: ['Admin', 'Manager', 'QC Team', 'Editor', 'Content Writer', 'Brand Manager', 'Video Editor', 'Business Development Head', 'HR', 'Website & SEO Head', 'Website Head', 'Website Employee'] },
        { name: 'Social Automation', path: '/automation', icon: <FaRobot />, roles: ['Admin', 'Manager', 'Brand Manager'] },
        { name: 'My Tasks', path: '/my-tasks', icon: <FaListAlt />, roles: ['Content Writer', 'Video Editor', 'Editor'] },
        { name: 'Website Tasks', path: '/website-tasks', icon: <FaGlobe />, roles: ['Website Employee'] },
        { name: 'Work Records', path: '/work-records', icon: <FaHistory />, roles: ['Admin', 'Brand Manager', 'Business Development Head', 'HR', 'Website & SEO Head', 'Website Head'] },
        { name: 'My Works Reports', path: '/admin-records', icon: <FaListAlt />, roles: ['Admin'] },
        { name: 'Rough Cuts', path: '/rough-cuts', icon: <FaPlay />, roles: ['Video Editor', 'Editor'] },
        { name: 'Skyline Chat', path: '/chat', icon: <FaWhatsapp />, roles: ['Admin', 'Manager', 'QC Team', 'Editor', 'Content Writer', 'Brand Manager', 'Video Editor', 'Business Development Head', 'HR', 'Website & SEO Head', 'Website Head', 'Website Employee'] },
        { name: 'Meetings & Calendar', path: '/meetings', icon: <FaVideo />, roles: ['Admin', 'Manager', 'QC Team', 'Editor', 'Content Writer', 'Brand Manager', 'Video Editor', 'Business Development Head', 'HR', 'Website & SEO Head', 'Website Head', 'Website Employee'] },
        { name: 'Clients/Team', path: '/master', icon: <FaUsers />, roles: ['Admin', 'Manager', 'Brand Manager'] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || 'Guest'));

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <FaRocket style={{ color: '#8b5cf6' }} />
                <span>Reach Skyline</span>
            </div>

            <nav style={{ flex: 1 }}>
                {filteredItems.map(item => (
                    <NavLink key={item.path} to={item.path} className="nav-link">
                        {item.icon}
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}>
                    <FaSignOutAlt />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
