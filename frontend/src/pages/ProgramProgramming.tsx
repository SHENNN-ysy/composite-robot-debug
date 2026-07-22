import { useMemo, useState } from 'react';
import { Button, Empty, Tag, message } from 'antd';
import { CodeOutlined, CopyOutlined, FileTextOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import { getLuaPrograms } from '@/features/programming/programStorage';
import styles from './ProgramProgramming.module.css';

export default function ProgramProgramming() {
  const [programs] = useState(getLuaPrograms);
  const [selectedId, setSelectedId] = useState(programs[0]?.id ?? '');
  const selectedProgram = useMemo(() => programs.find((program) => program.id === selectedId), [programs, selectedId]);

  const copyCode = async () => {
    if (!selectedProgram) return;
    await navigator.clipboard.writeText(selectedProgram.code);
    message.success('程序代码已复制');
  };

  return (
    <div>
      <PageHeader title="程序编程" />
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}><FileTextOutlined /> Lua程序列表</div>
          <div className={styles.programList}>{programs.map((program) => <button type="button" key={program.id} className={`${styles.programItem} ${program.id === selectedId ? styles.active : ''}`} onClick={() => setSelectedId(program.id)}><span className={styles.fileName}>{program.name}</span><span className={styles.updatedAt}>{program.updatedAt}</span></button>)}</div>
        </aside>
        <main className={styles.editor}>
          {selectedProgram ? <><div className={styles.editorHeader}><div><CodeOutlined /><strong>{selectedProgram.name}</strong><Tag color="orange">Lua</Tag></div><Button icon={<CopyOutlined />} onClick={copyCode}>复制代码</Button></div><pre className={styles.code}><code>{selectedProgram.code}</code></pre></> : <Empty description="暂无生成的 Lua 程序" />}
        </main>
      </div>
    </div>
  );
}
