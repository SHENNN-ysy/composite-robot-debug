/**
 * 通用页头组件：各业务页面统一的标题栏。
 *
 * 左侧渲染页面标题，右侧 extra 插槽可放置页面级操作（按钮、筛选控件等），
 * 首页、设备控制、流程编排等页面复用它以保证页头风格一致。
 */
import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

/** 页头属性。 */
interface PageHeaderProps {
  /** 页面标题；支持 ReactNode 以便组合图标、徽标等富文本。 */
  title: ReactNode;
  /** 标题栏右侧扩展区（可选），一般放页面级操作按钮；未传时不渲染占位节点。 */
  extra?: ReactNode;
}

/** 通用页头：标题 + 可选的右侧操作区。 */
export default function PageHeader({ title, extra }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {extra && <div className={styles.extra}>{extra}</div>}
    </header>
  );
}
