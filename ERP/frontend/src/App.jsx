import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Planning from './pages/Planning';
import ContentCalendar from './pages/ContentCalendar';
import Master from './pages/Master';
import Automation from './pages/Automation';
import EmployeeTasks from './pages/EmployeeTasks';
import RoughCuts from './pages/RoughCuts';
import EditorDashboard from './pages/EditorDashboard';
import WorkRecords from './pages/WorkRecords';
import AdminWorkRecords from './pages/AdminWorkRecords';
import WebsiteHeadDashboard from './pages/WebsiteHeadDashboard';
import WebsiteMyTasks from './pages/WebsiteMyTasks';
import WebsiteEmployeeDashboard from './pages/WebsiteEmployeeDashboard';
import WebsiteTaskAssign from './pages/WebsiteTaskAssign';
import DailyWorkRecords from './pages/DailyWorkRecords';
import Chat from './pages/Chat';
import Meet from './pages/Meet';
import WhatsAppIcon from './components/WhatsAppIcon';

// Placeholder Pages (To be implemented)
const Placeholder = ({ name }) => (
  <div className="animate-fade-in">
    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>{name}</h1>
    <p style={{ color: 'var(--text-muted)' }}>This module is currently being finalized based on the ERP workflow.</p>
    <div className="card" style={{ marginTop: '2rem', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', border: '2px dashed #e2e8f0' }}>
      Feature coming in Phase 2
    </div>
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("ERP UI Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', textAlign: 'center', background: '#fff' }}>
          <h1 style={{ color: '#ef4444' }}>Critical UI Error</h1>
          <p>The ERP interface encountered a runtime error.</p>
          <pre style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', display: 'inline-block', textAlign: 'left', marginTop: '20px', border: '1px solid #e2e8f0' }}>
            {this.state.error?.toString()}
          </pre>
          <div style={{ marginTop: '20px' }}>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Reload System</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedLayout = ({ children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', margin: '0 auto 20px' }}></div>
      <p style={{ fontWeight: 600, color: '#64748b' }}>Initializing Reach Skyline ERP...</p>
    </div>
  </div>;
  if (!user || !token) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <div className="erp-container">
      <Sidebar />
      <div className="main-content">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <WhatsAppIcon />
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/planning" element={<ProtectedLayout><Planning /></ProtectedLayout>} />
          <Route path="/master" element={<ProtectedLayout><Master /></ProtectedLayout>} />
          <Route path="/automation" element={<ProtectedLayout><Automation /></ProtectedLayout>} />
          <Route path="/my-tasks" element={<ProtectedLayout><EmployeeTasks /></ProtectedLayout>} />
          <Route path="/rough-cuts" element={<ProtectedLayout><RoughCuts /></ProtectedLayout>} />
          <Route path="/editor-dashboard" element={<ProtectedLayout><EditorDashboard /></ProtectedLayout>} />
          <Route path="/work-records" element={<ProtectedLayout><WorkRecords /></ProtectedLayout>} />
          <Route path="/admin-records" element={<ProtectedLayout><AdminWorkRecords /></ProtectedLayout>} />
          <Route path="/website-dashboard" element={<ProtectedLayout><WebsiteHeadDashboard /></ProtectedLayout>} />
          <Route path="/website-tasks" element={<ProtectedLayout><WebsiteMyTasks /></ProtectedLayout>} />
          <Route path="/website-employee-dashboard" element={<ProtectedLayout><WebsiteEmployeeDashboard /></ProtectedLayout>} />
          <Route path="/website-assign-tasks" element={<ProtectedLayout><WebsiteTaskAssign /></ProtectedLayout>} />
          <Route path="/daily-work-records" element={<ProtectedLayout><DailyWorkRecords /></ProtectedLayout>} />
          <Route path="/chat" element={<ProtectedLayout><Chat /></ProtectedLayout>} />
          <Route path="/meetings" element={<ProtectedLayout><Meet /></ProtectedLayout>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
