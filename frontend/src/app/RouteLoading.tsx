import { Spin } from 'antd';
import styles from './RouteLoading.module.css';

export default function RouteLoading() {
  return (
    <div className={styles.container} role="status" aria-label="页面加载中">
      <Spin size="large" />
    </div>
  );
}
