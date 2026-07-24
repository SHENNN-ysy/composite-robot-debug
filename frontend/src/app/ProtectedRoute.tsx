/**
 * 登录守卫模块。
 *
 * 为所有需要鉴权的路由提供统一的登录态校验（在 AppRouter 中通过 ProtectedLayout
 * 包裹 MainLayout 生效），未登录访问一律重定向到登录页。
 */
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

/**
 * 登录守卫组件。
 *
 * 登录态取自 useAuthStore.isAuthenticated，该值由 sessionStorage 中保存的用户信息初始化
 * （见 store/auth.ts）：刷新页面不丢登录态，关闭标签页后需重新登录。
 * 未登录时重定向到 /login，并通过 location.state.from 记录原目标地址，供登录成功后回跳。
 */
export default function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  // 未登录：replace 重定向，避免在历史栈中留下无权限访问的页面
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
