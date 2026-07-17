import { Routes, Route, Navigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import DeviceControl from './pages/DeviceControl';
import FlowEditor from './pages/FlowEditor';
import ProcessOrchestration from './pages/ProcessOrchestration';
import StatusLog from './pages/StatusLog';
import Settings from './pages/Settings';
import { useAuthStore } from './store/auth';
import type { SettingsTab } from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function SettingsPage() {
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as SettingsTab) || 'general';
  return <Settings initialTab={tab} />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="device" element={<DeviceControl />} />
        <Route path="flow" element={<Navigate to="/flow/process" replace />} />
        <Route path="flow/process" element={<ProcessOrchestration />} />
        <Route path="flow/program" element={<FlowEditor />} />
        <Route path="status" element={<StatusLog />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
