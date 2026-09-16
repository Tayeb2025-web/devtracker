import { lazy, Suspense } from 'react';
import './App.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuth } from './contexts/AuthContextStore';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Timer = lazy(() => import('./pages/Timer'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Technologies = lazy(() => import('./pages/Technologies'));
const Projects = lazy(() => import('./pages/Projects'));
const History = lazy(() => import('./pages/History'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Notes = lazy(() => import('./pages/Notes'));
const Music = lazy(() => import('./pages/Music'));
const Community = lazy(() => import('./pages/Community'));
const Settings = lazy(() => import('./pages/Settings'));
const Auth = lazy(() => import('./pages/Auth'));
const About = lazy(() => import('./pages/About'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'));

function ProtectedAdminApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-text-muted">در حال بارگذاری...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.role === 'admin' || user.email === 'dtadmincode2026@gmail.com';
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <AdminLayout>
      <Suspense fallback={<div className="flex justify-center py-12 text-text-muted">در حال بارگذاری...</div>}>
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/users/:id" element={<AdminUserDetail />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <MainLayout><Suspense fallback={<div className="flex justify-center py-12 text-text-muted">Loading…</div>}><Routes>
    <Route path="/" element={<Dashboard />} /><Route path="/timer" element={<Timer />} /><Route path="/statistics" element={<Statistics />} /><Route path="/calendar" element={<Calendar />} /><Route path="/technologies" element={<Technologies />} /><Route path="/projects" element={<Projects />} /><Route path="/history" element={<History />} /><Route path="/achievements" element={<Achievements />} /><Route path="/challenges" element={<Challenges />} /><Route path="/notes" element={<Notes />} /><Route path="/music" element={<Music />} /><Route path="/community" element={<Community />} /><Route path="/settings" element={<Settings />} /><Route path="/about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></MainLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={null}><Auth mode="login" /></Suspense>} />
      <Route path="/signup" element={<Suspense fallback={null}><Auth mode="signup" /></Suspense>} />
      <Route path="/admin/*" element={<ProtectedAdminApp />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
