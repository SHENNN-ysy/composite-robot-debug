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
  Panel,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, Button, Space, Table, Modal, Form, Input, Select, InputNumber, message } from 'antd';
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

interface NodeData {
  label: string;
  icon: string;
  color: string;
  params: Record<string, unknown>;
}

// 预置节点类型
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

const initialNodes: Node<NodeData>[] = [
  {
    id: '1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: '开始', icon: '▶', color: '#52c41a', params: {} },
  },
];

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#f58020', strokeWidth: 2 },
};

export default function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { addLog } = useLogStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds));
      addLog('info', '添加节点连接');
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
    form.setFieldsValue({
      label: node.data.label,
      ...node.data.params,
    });
  }, [form]);

  const handleAddNode = (type: string, label: string, icon: string, color: string) => {
    const newNode: Node<NodeData> = {
      id: `${Date.now()}`,
      type: type === 'start' || type === 'end' ? 'input' : 'default',
      position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 50 },
      data: { label, icon, color, params: {} },
    };
    setNodes((nds) => [...nds, newNode]);
    addLog('info', `添加节点: ${label}`);
  };

  const handleUpdateNode = () => {
    if (!selectedNode) return;
    const values = form.getFieldsValue();
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
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

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
    addLog('info', '删除节点');
  };

  const handleSave = () => {
    const flowData = { nodes, edges };
    localStorage.setItem('flowData', JSON.stringify(flowData));
    message.success('流程已保存');
    addLog('info', '保存流程');
  };

  const handleLoad = () => {
    const saved = localStorage.getItem('flowData');
    if (saved) {
      const data = JSON.parse(saved);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      message.success('流程已加载');
      addLog('info', '加载流程');
    }
  };

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

  const handleClear = () => {
    setNodes(initialNodes);
    setEdges([]);
    setSelectedNode(null);
    addLog('info', '清空流程');
  };

  const handleRun = () => {
    setIsRunning(true);
    setIsPaused(false);
    addLog('info', '启动流程执行');
    message.info('流程执行中...');
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    addLog('warn', isPaused ? '继续执行' : '暂停执行');
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    addLog('info', '停止流程执行');
    message.warning('流程已停止');
  };

  const logColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 100 },
    { title: '消息', dataIndex: 'message', key: 'message' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>可视化编程</h2>
      </div>

      <Card
        bordered={false}
        bodyStyle={{ padding: 0 }}
        style={{ overflow: 'hidden' }}
      >
        {/* 工具栏 */}
        <div className="flow-toolbar">
          <Space>
            <Button icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>
            <Button icon={<FolderOpenOutlined />} onClick={handleLoad}>
              加载
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleClear}>
              清空
            </Button>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRun}
              disabled={isRunning}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              启动
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handlePause}
              disabled={!isRunning}
            >
              {isPaused ? '继续' : '暂停'}
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleStop}
              disabled={!isRunning}
            >
              停止
            </Button>
            <Button icon={<StepForwardOutlined />} disabled={isRunning}>
              单步
            </Button>
          </Space>
        </div>

        <div style={{ display: 'flex', height: 'calc(100vh - 380px)' }}>
          {/* 左侧节点面板 */}
          <div className="node-palette">
            <div style={{ fontWeight: 500, marginBottom: 12, color: '#262626' }}>
              节点库
            </div>
            {nodeCategories.map((category) => (
              <div key={category.title} className="node-category">
                <div className="node-category-title">{category.title}</div>
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    className="node-item"
                    onClick={() =>
                      handleAddNode(node.type, node.label, node.icon, node.color)
                    }
                  >
                    <span className="icon">{node.icon}</span>
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 流程画布 */}
          <div ref={reactFlowWrapper} style={{ flex: 1, height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              fitView
              style={{ background: '#fafafa' }}
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => (node.data as NodeData)?.color || '#ccc'}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            </ReactFlow>
          </div>

          {/* 右侧属性面板 */}
          <div className="property-panel">
            <div style={{ fontWeight: 500, marginBottom: 16, color: '#262626' }}>
              节点属性
            </div>
            {selectedNode ? (
              <>
                <Form form={form} layout="vertical" size="small">
                  <Form.Item label="名称" name="label">
                    <Input />
                  </Form.Item>
                  <Button
                    type="primary"
                    block
                    onClick={() => setModalVisible(true)}
                  >
                    编辑参数
                  </Button>
                </Form>
                <Button
                  danger
                  block
                  style={{ marginTop: 16 }}
                  onClick={handleDeleteNode}
                >
                  删除节点
                </Button>
              </>
            ) : (
              <div style={{ color: '#8c8c8c', textAlign: 'center', padding: 20 }}>
                点击节点查看属性
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  fontWeight: 500,
                  marginBottom: 12,
                  color: '#262626',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>运行日志</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => useLogStore.getState().clearLogs()}
                >
                  清空
                </Button>
              </div>
              <div className="log-container" style={{ maxHeight: 300 }}>
                {useLogStore.getState().logs.slice(0, 20).map((log) => (
                  <div key={log.id} className={`log-item level-${log.level}`}>
                    <span className="time">[{log.time}]</span>{' '}
                    <span className={`level-${log.level}`}>
                      {log.level === 'info' ? '[INFO]' : log.level === 'warn' ? '[WARN]' : '[ERROR]'}
                    </span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 参数编辑弹窗 */}
      <Modal
        title="编辑节点参数"
        open={modalVisible}
        onOk={handleUpdateNode}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="名称" name="label">
            <Input />
          </Form.Item>
          {selectedNode?.type === 'moveJ' || selectedNode?.type === 'moveL' ? (
            <>
              <Form.Item label="速度 (%)" name="speed" initialValue={50}>
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="J1 (°)" name="j1" initialValue={0}>
                <InputNumber />
              </Form.Item>
              <Form.Item label="J2 (°)" name="j2" initialValue={0}>
                <InputNumber />
              </Form.Item>
              <Form.Item label="J3 (°)" name="j3" initialValue={0}>
                <InputNumber />
              </Form.Item>
            </>
          ) : selectedNode?.type === 'delay' ? (
            <Form.Item label="延时时间 (秒)" name="delay" initialValue={1}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
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
            <Form.Item label="夹爪力度 (%)" name="force" initialValue={50}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </div>
  );
}
