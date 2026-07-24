/**
 * 应用根组件。
 *
 * 仅作路由层的薄封装：路由表、登录守卫与页面懒加载均在 app/AppRouter 中定义。
 * 这里保持极简，便于日后在根级追加全局 Provider（错误边界、全局消息等）。
 */
import AppRouter from './app/AppRouter';

/** 根组件：直接渲染全局路由表。 */
function App() {
  return <AppRouter />;
}

export default App;
