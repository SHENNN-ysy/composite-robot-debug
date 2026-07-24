/**
 * 程序编程页面：查看后端保存的 Lua 程序（由流程编排自动生成入库），并支持复制与执行下发。
 *
 * <p>数据来源为 GET /api/programs 的程序列表；“执行”通过
 * `POST /api/control/program/execute` 提交给后端受理。</p>
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Spin, Tag, message } from 'antd';
import { CodeOutlined, CopyOutlined, FileTextOutlined, PlayCircleOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import { executeProgram, getLuaPrograms, type LuaProgram } from '@/features/programming/programStorage';
import styles from './ProgramProgramming.module.css';

/** 程序编程页路由组件：左侧 Lua 程序列表 + 右侧代码预览与操作。 */
export default function ProgramProgramming() {
  const [programs, setPrograms] = useState<LuaProgram[]>([]); // 后端返回的全部 Lua 程序
  const [selectedId, setSelectedId] = useState(''); // 当前选中程序 ID，空串表示未选中
  const [loading, setLoading] = useState(true); // 首屏拉取列表的加载态
  // 当前选中程序对象，随列表或选中项变化重新计算
  const selectedProgram = useMemo(() => programs.find((program) => program.id === selectedId), [programs, selectedId]);

  // 首屏拉取程序列表并默认选中第一条；cancelled 标记避免组件卸载后仍 setState
  useEffect(() => {
    let cancelled = false;
    getLuaPrograms()
      .then((items) => {
        if (cancelled) return;
        setPrograms(items);
        setSelectedId(items[0]?.id ?? '');
      })
      .catch(() => message.error('程序列表加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // 复制当前程序的 Lua 代码到剪贴板
  const copyCode = async () => {
    if (!selectedProgram) return;
    await navigator.clipboard.writeText(selectedProgram.code);
    message.success('程序代码已复制');
  };

  // 提交程序执行请求；成功仅代表后端受理，不代表程序实际执行完成
  const runProgram = async () => {
    if (!selectedProgram) return;
    try {
      await executeProgram(selectedProgram.id);
      message.info('程序执行请求已受理');
    } catch {
      message.error('程序执行请求失败');
    }
  };

  return (
    <div>
      <PageHeader title="程序编程" />
      <Spin spinning={loading}>
        <div className={styles.workspace}>
          {/* 左侧：程序列表，点击切换选中项 */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}><FileTextOutlined /> Lua程序列表</div>
            <div className={styles.programList}>{programs.map((program) => <button type="button" key={program.id} className={`${styles.programItem} ${program.id === selectedId ? styles.active : ''}`} onClick={() => setSelectedId(program.id)}><span className={styles.fileName}>{program.name}</span><span className={styles.updatedAt}>{program.updatedAt}</span></button>)}</div>
          </aside>
          {/* 右侧：选中程序的 Lua 代码只读预览，头部提供执行/复制操作；无程序时显示空态 */}
          <main className={styles.editor}>
            {selectedProgram ? <><div className={styles.editorHeader}><div><CodeOutlined /><strong>{selectedProgram.name}</strong><Tag color="orange">Lua v{selectedProgram.version}</Tag></div><div><Button icon={<PlayCircleOutlined />} type="primary" onClick={runProgram}>执行</Button> <Button icon={<CopyOutlined />} onClick={copyCode}>复制代码</Button></div></div><pre className={styles.code}><code>{selectedProgram.code}</code></pre></> : <Empty className={styles.emptyState} description="暂无 Lua 程序" />}
          </main>
        </div>
      </Spin>
    </div>
  );
}
