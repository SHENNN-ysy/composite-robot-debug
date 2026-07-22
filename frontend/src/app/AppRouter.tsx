import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RouteLoading from './RouteLoading';
import type { SettingsTab } from '@/pages/Settings';

const Login = lazy(() => import('@/pages/Login'));
const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const Home = lazy(() => import('@/pages/Home'));
const RobotArmControl = lazy(() => import('@/pages/RobotArmControl'));
const AGVControl = lazy(() => import('@/pages/AGVControl'));
const ProgramProgramming = lazy(() => import('@/pages/ProgramProgramming'));
const ProcessOrchestration = lazy(() => import('@/pages/ProcessOrchestration'));
const StatusLog = lazy(() => import('@/pages/StatusLog'));
const Settings = lazy(() => import('@/pages/Settings'));

const SETTINGS_TABS: SettingsTab[] = ['general', 'user', 'about'];

function SettingsPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = SETTINGS_TABS.includes(requestedTab as SettingsTab)
    ? (requestedTab as SettingsTab)
    : 'general';

  return <Settings initialTab={initialTab} />;
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="device" element={<Navigate to="/device/robot-arm" replace />} />
          <Route path="device/robot-arm" element={<RobotArmControl />} />
          <Route path="device/agv" element={<AGVControl />} />
          <Route path="flow" element={<Navigate to="/flow/process" replace />} />
          <Route path="flow/process" element={<ProcessOrchestration />} />
          <Route path="flow/program" element={<ProgramProgramming />} />
          <Route path="status" element={<StatusLog />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
