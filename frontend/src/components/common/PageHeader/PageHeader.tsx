import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: ReactNode;
  extra?: ReactNode;
}

export default function PageHeader({ title, extra }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {extra && <div className={styles.extra}>{extra}</div>}
    </header>
  );
}
