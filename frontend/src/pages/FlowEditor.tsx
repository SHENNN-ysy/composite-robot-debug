/**
 * 拖拽式流程编辑器（基于 @xyflow/react），是「流程编排」页的主体组件。
 *
 * <p>业务职责：从左侧节点库添加机械臂/AGV/逻辑/系统节点，连线组成作业流程图，
 * 编辑节点参数，并把流程 JSON 保存到后端或导出为本地 flow.json；
 * 启动、暂停、恢复和停止分别通过对应的 HTTP POST 控制接口提交给后端。</p>
 *
 * <p>流程 JSON 结构：{ nodes, edges }。nodes 为 React Flow 节点数组，每个节点的 data 为
 * NodeData（label 名称、icon 图标、color 颜色、params 节点业务参数）；edges 为连线数组，
 * source/target 指向节点 id。保存时由 programStorage 按节点 label 生成同名 Lua 脚本一并入库。</p>
 */
import { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  BackgroundVariant,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Space, Modal, Form, Input, Select, InputNumber, message } from 'antd';
import {
  SaveOutlined,
  FolderOpenOutlined,
  ExportOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  StepForwardOutlined,
} from '@ant-design/icons';
import { useLogStore } from '../store/logs';
import styles from './FlowEditor.module.css';
import { controlProgram, executeProgram, getLuaPrograms, saveGeneratedLuaProgram } from '@/features/programming/programStorage';

/** 流程节点携带的业务数据（存进 React Flow 节点的 data 字段，随流程 JSON 一起入库）。 */
interface NodeData {
  /** 节点显示名称，保存时作为 Lua 步骤注释的文本。 */
  label: string;
  /** 节点库中配置的图标字符。 */
  icon: string;
  /** 节点主题色，用于小地图着色。 */
  color: string;
  /** 节点业务参数（速度、关节角、目标工位、延时、夹爪力度等），在「编辑参数」弹窗中维护。 */
  params: Record<string, unknown>;
  [key: string]: unknown;
}

// 左侧节点库的分组与节点定义：type 是节点类型标识（决定参数表单与业务语义），
// label/icon/color 决定展示；点击节点项即往画布添加一个对应节点。
// 分组即业务域：触发（流程入口/出口）、机械臂动作、AGV 动作、逻辑控制、系统辅助。
const nodeCategories = [
  {
    title: '触发',
    nodes: [
      { type: 'start', label: '开始', icon: '▶', color: '#52c41a' },
      { type: 'end', label: '结束', icon: '■', color: '#ff4d4f' },
    ],
  },
  {
    title: '机械臂',
    nodes: [
      { type: 'moveJ', label: '关节移动', icon: '🦾', color: '#1890ff' },
      { type: 'moveL', label: '直线移动', icon: '📍', color: '#1890ff' },
      { type: 'grasp', label: '抓取', icon: '✋', color: '#722ed1' },
      { type: 'release', label: '释放', icon: '🖐', color: '#722ed1' },
    ],
  },
  {
    title: 'AGV',
    nodes: [
      { type: 'gotoStation', label: '导航到工位', icon: '🚗', color: '#f58020' },
      { type: 'waitLoad', label: '等待装货', icon: '📦', color: '#f58020' },
      { type: 'waitUnload', label: '等待卸货', icon: '📤', color: '#f58020' },
    ],
  },
  {
    title: '逻辑',
    nodes: [
      { type: 'delay', label: '延时', icon: '⏱', color: '#faad14' },
      { type: 'condition', label: '条件判断', icon: '❓', color: '#faad14' },
      { type: 'loop', label: '循环', icon: '🔄', color: '#faad14' },
    ],
  },
  {
    title: '系统',
    nodes: [
      { type: 'setVariable', label: '设置变量', icon: '📝', color: '#8c8c8c' },
      { type: 'printLog', label: '打印日志', icon: '📋', color: '#8c8c8c' },
    ],
  },
];

// 画布初始内容：仅一个「开始」节点（React Flow 的 input 类型，只有出口），保证流程始终有入口
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    position: { x: 250, y: 50 },
    data: { label: '开始', icon: '▶', color: '#52c41a', params: {} } as NodeData,
  },
];

// 新建连线的默认样式：橙色动画边，与系统主色一致
const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#f58020', strokeWidth: 2 },
};

/** 流程编辑器主组件：节点库 + 画布 + 属性面板 + 运行日志，供流程编排页直接使用。 */
export function FlowEditorContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); // 画布节点集合（React Flow 托管）
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]); // 连线集合，source/target 指向节点 id
  const [selectedNode, setSelectedNode] = useState<Node | null>(null); // 当前选中节点，驱动右侧属性面板与参数弹窗
  const [isRunning, setIsRunning] = useState(false); // 程序是否已提交执行（仅前端标记，以 HTTP 请求受理为准）
  const [isPaused, setIsPaused] = useState(false); // 是否处于暂停态，决定暂停按钮显示「暂停/继续」
  const [modalVisible, setModalVisible] = useState(false); // 「编辑参数」弹窗开关
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null); // 已入库的程序 ID；为空表示未保存，保存时走新建
  const [form] = Form.useForm(); // 属性面板与参数弹窗共用的表单实例
  const { addLog } = useLogStore(); // 运行日志（本地 zustand store，展示在右侧面板）
  const reactFlowWrapper = useRef<HTMLDivElement>(null); // 画布容器引用

  // 用户连线：追加一条带默认样式的边，并记录一条操作日志
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
      addLog('info', '添加节点连接');
    },
    [setEdges]
  );

  // 点击节点：选中并把节点名称与业务参数回填到表单，供属性面板/参数弹窗编辑
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    form.setFieldsValue({
      label: (node.data as NodeData).label,
      ...(node.data as NodeData).params,
    });
  }, [form]);

  // 从节点库添加节点：开始/结束用 input 类型（仅出口），其余用 default（入出口皆有）；
  // id 取时间戳保证唯一，初始位置随机偏移避免新节点完全重叠
  const handleAddNode = (type: string, label: string, icon: string, color: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: type === 'start' || type === 'end' ? 'input' : 'default',
      position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 50 },
      data: { label, icon, color, params: {} } as NodeData,
    };
    setNodes((nds) => [...nds, newNode]);
    addLog('info', `添加节点: ${label}`);
  };

  // 参数弹窗确认：表单值整体写回节点——label 更新显示名，全量表单值作为 params 存入流程 JSON
  const handleUpdateNode = () => {
    if (!selectedNode) return;
    const values = form.getFieldsValue();
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...(node.data as NodeData),
                label: values.label,
                params: values,
              },
            }
          : node
      )
    );
    setModalVisible(false);
    addLog('info', `更新节点: ${values.label}`);
  };

  // 删除节点：同步删掉与其相连的所有边，避免产生悬空连线
  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
    addLog('info', '删除节点');
  };

  // 保存：流程 JSON（nodes+edges）连同节点 label 列表交给 programStorage 生成 Lua 并入库；
  // 已保存过则按 savedProgramId 覆盖更新，否则新建。成功后记住 ID，供再次保存与启动执行复用
  const handleSave = async () => {
    const flowData = { nodes, edges };
    try {
      const saved = await saveGeneratedLuaProgram(
        nodes.map((node) => String(node.data.label ?? node.type)),
        flowData as Record<string, unknown>,
        savedProgramId ?? undefined,
      );
      setSavedProgramId(saved.id);
      message.success('流程已保存到后端');
      addLog('info', `保存流程: ${saved.name}`);
      return saved.id;
    } catch {
      message.error('流程保存失败，请检查后端服务');
      return null;
    }
  };

  // 加载：取后端程序列表的第一条回显画布（联调阶段的演示行为）；
  // flow 缺 nodes/edges 字段时回退为空数组，避免旧数据导致画布渲染异常
  const handleLoad = async () => {
    try {
      const programs = await getLuaPrograms();
      const saved = programs[0];
      if (!saved) {
        message.info('后端暂无已保存流程');
        return;
      }
      const flow = saved.flow as { nodes?: Node[]; edges?: Edge[] };
      setNodes(flow.nodes ?? []);
      setEdges(flow.edges ?? []);
      setSavedProgramId(saved.id);
      message.success(`已加载 ${saved.name}`);
      addLog('info', `加载流程: ${saved.name}`);
    } catch {
      message.error('流程加载失败');
    }
  };

  // 导出：把流程 JSON 格式化后通过浏览器下载存为本地 flow.json，便于离线备份/交换，不经过后端
  const handleExport = () => {
    const flowData = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([flowData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    message.success('流程已导出');
    addLog('info', '导出流程');
  };

  // 清空：恢复为只有「开始」节点的初始画布；注意不清 savedProgramId，再次保存仍会覆盖原后端程序
  const handleClear = () => {
    setNodes(initialNodes);
    setEdges([]);
    setSelectedNode(null);
    addLog('info', '清空流程');
  };

  // 启动：未保存时先自动保存拿到程序 ID，再提交程序执行请求；
  // HTTP 请求受理后置 running 标记，暂停/停止按钮随之可用（不代表程序真实已运行）
  const handleRun = async () => {
    const programId = savedProgramId ?? await handleSave();
    if (!programId) return;
    try {
      await executeProgram(programId);
      setIsRunning(true);
      setIsPaused(false);
      addLog('info', '流程执行请求已受理');
      message.info('流程执行请求已受理');
    } catch {
      message.error('流程执行请求失败');
    }
  };

  // 暂停/继续：按当前状态二选一下发 PROGRAM_PAUSE(502)/PROGRAM_RESUME(503)，成功后翻转暂停标记
  const handlePause = async () => {
    try {
      await controlProgram(isPaused ? 'resume' : 'pause');
      setIsPaused(!isPaused);
      addLog('warn', isPaused ? '继续执行请求已受理' : '暂停执行请求已受理');
    } catch {
      message.error('程序暂停/恢复请求失败');
    }
  };

  // 停止：下发 PROGRAM_STOP(504)，受理后复位运行/暂停标记
  const handleStop = async () => {
    try {
      await controlProgram('stop');
      setIsRunning(false);
      setIsPaused(false);
      addLog('info', '停止流程请求已受理');
      message.warning('停止流程请求已受理');
    } catch {
      message.error('停止流程请求失败');
    }
  };

  // 顶部工具栏：左侧为流程文件操作（保存/加载/导出/清空），右侧为执行控制
  // （启动/暂停/停止经 HTTP 控制接口提交；“单步”暂无实现，仅占位并随运行态禁用）
  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <Space>
        <Button icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
        <Button icon={<FolderOpenOutlined />} onClick={handleLoad}>加载</Button>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
        <Button danger icon={<DeleteOutlined />} onClick={handleClear}>清空</Button>
      </Space>
      <Space>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRun} disabled={isRunning} className={styles.runButton}>启动</Button>
        <Button icon={<PauseCircleOutlined />} onClick={handlePause} disabled={!isRunning}>{isPaused ? '继续' : '暂停'}</Button>
        <Button danger icon={<StopOutlined />} onClick={handleStop} disabled={!isRunning}>停止</Button>
        <Button icon={<StepForwardOutlined />} disabled={isRunning}>单步</Button>
      </Space>
    </div>
  );

  // 左侧节点库：按业务分组渲染可点击节点项，点击即把对应节点加入画布
  const renderPalette = () => (
    <div className={styles.palette}>
      <div className={styles.paletteHeader}>节点库</div>
      {nodeCategories.map((category) => (
        <div key={category.title} className={styles.category}>
          <div className={styles.categoryTitle}>{category.title}</div>
          {category.nodes.map((node) => (
            <div key={node.type} className={styles.item} onClick={() => handleAddNode(node.type, node.label, node.icon, node.color)}>
              <span className={styles.itemIcon}>{node.icon}</span>
              <span>{node.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // 中间画布：React Flow 受控渲染节点与连线；小地图按节点 color 着色，背景为点阵
  const renderCanvas = () => (
    <div ref={reactFlowWrapper} className={styles.canvas}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={onNodeClick} fitView style={{ background: '#fafafa' }}>
        <Controls />
        <MiniMap nodeColor={(node) => (node.data as NodeData)?.color || '#ccc'} maskColor="rgba(0, 0, 0, 0.1)" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );

  // 右侧属性面板：选中节点时提供名称编辑、参数弹窗入口与删除按钮；下方展示最近 20 条运行日志
  const renderPropertyPanel = () => (
    <div className={styles.propertyPanel}>
      <div className={styles.panelHeader}>节点属性</div>
      {selectedNode ? (
        <>
          <Form form={form} layout="vertical" size="small">
            <Form.Item label="名称" name="label"><Input /></Form.Item>
            <Button type="primary" block onClick={() => setModalVisible(true)}>编辑参数</Button>
          </Form>
          <Button danger block style={{ marginTop: 16 }} onClick={handleDeleteNode}>删除节点</Button>
        </>
      ) : (
        <div className={styles.emptyHint}>点击节点查看属性</div>
      )}
      <div className={styles.logSection}>
        <div className={styles.logSectionHeader}>
          <span>运行日志</span>
          <Button type="link" size="small" onClick={() => useLogStore.getState().clearLogs()}>清空</Button>
        </div>
        <div className={styles.logContainer}>
          {useLogStore.getState().logs.slice(0, 20).map((log) => (
            <div key={log.id} className={styles.logItem}>
              <span className={styles.logTime}>[{log.time}]</span>{' '}
              <span className={log.level === 'info' ? styles.logInfo : log.level === 'warn' ? styles.logWarn : styles.logError}>
                {log.level === 'info' ? '[INFO]' : log.level === 'warn' ? '[WARN]' : '[ERROR]'}
              </span>{' '}{log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 参数编辑弹窗：按节点类型渲染对应参数表单项——
  // moveJ/moveL：速度百分比与 J1~J3 关节角；delay：延时秒数；gotoStation：目标工位；grasp：夹爪力度。
  // 其余节点类型仅可改名称。确认时表单全量值写入节点 data.params，随流程 JSON 一并入库
  const renderEditModal = () => (
    <Modal title="编辑节点参数" open={modalVisible} onOk={handleUpdateNode} onCancel={() => setModalVisible(false)}>
      <Form form={form} layout="vertical">
        <Form.Item label="名称" name="label"><Input /></Form.Item>
        {selectedNode?.type === 'moveJ' || selectedNode?.type === 'moveL' ? (
          <>
            <Form.Item label="速度 (%)" name="speed" initialValue={50}><InputNumber min={1} max={100} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="J1 (°)" name="j1" initialValue={0}><InputNumber /></Form.Item>
            <Form.Item label="J2 (°)" name="j2" initialValue={0}><InputNumber /></Form.Item>
            <Form.Item label="J3 (°)" name="j3" initialValue={0}><InputNumber /></Form.Item>
          </>
        ) : selectedNode?.type === 'delay' ? (
          <Form.Item label="延时时间 (秒)" name="delay" initialValue={1}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        ) : selectedNode?.type === 'gotoStation' ? (
          <Form.Item label="目标工位" name="station" initialValue="station-1">
            <Select>
              <Select.Option value="station-1">工位1</Select.Option>
              <Select.Option value="station-2">工位2</Select.Option>
              <Select.Option value="station-3">工位3</Select.Option>
              <Select.Option value="station-4">工位4</Select.Option>
              <Select.Option value="station-5">工位5</Select.Option>
            </Select>
          </Form.Item>
        ) : selectedNode?.type === 'grasp' ? (
          <Form.Item label="夹爪力度 (%)" name="force" initialValue={50}><InputNumber min={1} max={100} style={{ width: '100%' }} /></Form.Item>
        ) : null}
      </Form>
    </Modal>
  );

  // 整体布局：无边框卡片内上为工具栏、下为「节点库 | 画布 | 属性面板」三栏，参数弹窗挂在卡片外
  const renderMainContent = () => (
    <>
      <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ overflow: 'hidden' }}>
        {renderToolbar()}
        <div style={{ display: 'flex', height: 'calc(100vh - 380px)' }}>
          {renderPalette()}
          {renderCanvas()}
          {renderPropertyPanel()}
        </div>
      </Card>
      {renderEditModal()}
    </>
  );

  return renderMainContent();
}
