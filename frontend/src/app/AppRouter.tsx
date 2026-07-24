/**
 * 全局路由表。
 *
 * 业务结构：
 * - /login：登录页，唯一无需鉴权的页面；
 * - 其余页面全部挂在 ProtectedLayout 下：先经 ProtectedRoute 校验登录态（未登录重定向回 /login），
 *   再由 MainLayout 提供统一的顶部栏 + 侧边导航框架；
 * - 页面按业务域组织：首页总览、设备控制（机械臂/AGV）、系统流程（流程编排/程序编程）、
 *   状态信息、系统设置；
 * - 所有页面组件均 lazy 懒加载分包，chunk 加载期间由 Suspense 渲染 RouteLoading 占位，避免白屏。
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RouteLoading from './RouteLoading';
import type { SettingsTab } from '@/pages/Settings';

// 页面组件懒加载：首屏只下载骨架代码，各业务页面按需分包加载
const Login = lazy(() => import('@/pages/Login'));
const MainLayout = lazy(() => import('@/layouts/MainLayout'));
const Home = lazy(() => import('@/pages/Home'));
const RobotArmControl = lazy(() => import('@/pages/RobotArmControl'));
const AGVControl = lazy(() => import('@/pages/AGVControl'));
const ProgramProgramming = lazy(() => import('@/pages/ProgramProgramming'));
const ProcessOrchestration = lazy(() => import('@/pages/ProcessOrchestration'));
const StatusLog = lazy(() => import('@/pages/StatusLog'));
const Settings = lazy(() => import('@/pages/Settings'));

// 设置页支持的页签，与侧边导航「系统设置」的三个子菜单（?tab=general/user/about）一一对应
const SETTINGS_TABS: SettingsTab[] = ['general', 'user', 'about'];

/**
 * 设置页路由包装：从 /settings?tab=xxx 查询参数读取初始页签；
 * 参数缺失或非法时回退到「通用设置」，保证任意入口进入都有确定内容。
 */
function SettingsPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = SETTINGS_TABS.includes(requestedTab as SettingsTab)
    ? (requestedTab as SettingsTab)
    : 'general';

  return <Settings initialTab={initialTab} />;
}

/**
 * 受保护区域的外层路由：ProtectedRoute 做登录守卫（未登录跳 /login），
 * MainLayout 提供导航框架，具体页面经嵌套路由渲染到其 Outlet 中。
 */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  );
}

/** 全局路由表：/login 公开，其余路径均需登录并在主布局内渲染。 */
export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* 登录页：唯一无需鉴权的页面 */}
        <Route path="/login" element={<Login />} />
        {/* 受保护区域：登录守卫 + 主布局（侧边导航），业务页面均为其子路由 */}
        <Route path="/" element={<ProtectedLayout />}>
          {/* 根路径默认进入首页总览 */}
          <Route index element={<Navigate to="/home" replace />} />
          {/* 首页/总览：设备连接状态、机械臂与 AGV 实时状态、最近日志 */}
          <Route path="home" element={<Home />} />
          {/* 「设备控制」是菜单分组，无独立页面，默认落到机械臂控制 */}
          <Route path="device" element={<Navigate to="/device/robot-arm" replace />} />
          {/* 机械臂控制：位姿/关节点动、IO、示教点 */}
          <Route path="device/robot-arm" element={<RobotArmControl />} />
          {/* AGV 控制：地图位置、电量、站点调度 */}
          <Route path="device/agv" element={<AGVControl />} />
          {/* 「系统流程」菜单分组，默认落到流程编排 */}
          <Route path="flow" element={<Navigate to="/flow/process" replace />} />
          {/* 流程编排：拖拽编辑作业流程并保存为流程 JSON */}
          <Route path="flow/process" element={<ProcessOrchestration />} />
          {/* 程序编程：由流程生成 Lua 程序，保存并下发到机器人控制系统 */}
          <Route path="flow/program" element={<ProgramProgramming />} />
          {/* 状态信息：状态日志/数据监控，页内用 ?tab= 区分（见 config/navigation） */}
          <Route path="status" element={<StatusLog />} />
          {/* 系统设置：通用/用户/关于，页内用 ?tab= 区分 */}
          <Route path="settings" element={<SettingsPage />} />
          {/* 未匹配路径兜底回首页，避免停留在空白页 */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
