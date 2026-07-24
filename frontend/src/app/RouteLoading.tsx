/**
 * 路由懒加载占位页。
 *
 * AppRouter 中所有页面组件都用 React.lazy 分包，chunk 下载/解析期间
 * 由 Suspense fallback 渲染本组件，显示居中的加载指示，避免白屏。
 */
import { Spin } from 'antd';
import styles from './RouteLoading.module.css';

/** 居中的整页加载指示；role/aria-label 便于屏幕阅读器识别加载状态。 */
export default function RouteLoading() {
  return (
    <div className={styles.container} role="status" aria-label="页面加载中">
      <Spin size="large" />
    </div>
  );
}
