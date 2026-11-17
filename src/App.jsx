import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import HeadDashboard from './pages/HeadDashboard.jsx';
import Projects from './pages/Projects.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Engineers from './pages/Engineers.jsx';
import Reports from './pages/Reports.jsx';
import ReportPage from './pages/ReportPage.jsx';
import EngineerHome from './pages/EngineerHome.jsx';
import SubmitUpdate from './pages/SubmitUpdate.jsx';
import Notifications from './pages/Notifications.jsx';
import Account from './pages/Account.jsx';
import Handovers from './pages/Handovers.jsx';

export default function App() {
  const { user, loading, isHead } = useAuth();
  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={isHead ? <HeadDashboard /> : <EngineerHome />} />
        {isHead && <Route path="/projects" element={<Projects />} />}
        {isHead && <Route path="/engineers" element={<Engineers />} />}
        {!isHead && <Route path="/submit" element={<SubmitUpdate />} />}
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:id" element={<ReportPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/handovers" element={<Handovers />} />
        {isHead && <Route path="/account" element={<Account />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
