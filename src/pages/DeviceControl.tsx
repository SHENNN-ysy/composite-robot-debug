import {
  Card,
  Row,
  Col,
  Slider,
  Button,
  Badge,
  Progress,
  Space,
  Select,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Divider,
  Popconfirm,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  RobotOutlined,
  CarOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  HomeOutlined,
  EditOutlined,
  LinkOutlined,
  DisconnectOutlined,
  PlusOutlined,
  MinusOutlined,
  ApiOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useRobotArmStore, type CartesianPose, type JointState } from '../store/robotArm';
import { useAGVStore } from '../store/agv';
import { useLogStore } from '../store/logs';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';

type TabKey = 'list' | 'status';

interface DeviceInfo {
  id: string;
  name: string;
  type: '机械臂' | 'AGV';
  ip: string;
  port: number;
  protocol: 'TCP' | 'UDP' | 'Modbus';
  connected: boolean;
}

const initialDevices: DeviceInfo[] = [
  { id: 'arm-1', name: '六轴机械臂 #1', type: '机械臂', ip: '192.168.1.10', port: 502, protocol: 'TCP', connected: false },
  { id: 'agv-1', name: 'AGV #1',           type: 'AGV',    ip: '192.168.1.20', port: 8888, protocol: 'TCP', connected: false },
  { id: 'arm-2', name: '六轴机械臂 #2',    type: '机械臂', ip: '192.168.1.11', port: 502, protocol: 'TCP', connected: false },
  { id: 'agv-2', name: 'AGV #2',           type: 'AGV',    ip: '192.168.1.21', port: 8888, protocol: 'TCP', connected: false },
];

const cartesianLabels: Record<keyof CartesianPose, string> = {
  x: 'X',
  y: 'Y',
  z: 'Z',
  rx: 'RX',
  ry: 'RY',
  rz: 'RZ',
};
const jointLabels: Record<keyof JointState, string> = {
  j1: 'J1', j2: 'J2', j3: 'J3', j4: 'J4', j5: 'J5', j6: 'J6',
};

export default function DeviceControl() {
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabKey = rawTab === 'status' ? 'status' : 'list';

  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const { addLog } = useLogStore();

  // 设备列表本地数据
  const [devices, setDevices] = useState<DeviceInfo[]>(initialDevices);
  const [editTarget, setEditTarget] = useState<DeviceInfo | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [agvSpeed, setAgvSpeed] = useState(0.01);
  const [agvDistance, setAgvDistance] = useState(0.01);
  const [agvAngle, setAgvAngle] = useState(1);
  const [agvAngularSpeed, setAgvAngularSpeed] = useState(1);
  const [calibrationX, setCalibrationX] = useState(90);
  const [calibrationY, setCalibrationY] = useState(0);
  const [calibrationYaw, setCalibrationYaw] = useState<'positive' | 'negative'>('positive');
  const [calibrationStep, setCalibrationStep] = useState(5);
  const [stationModalOpen, setStationModalOpen] = useState(false);

  // 真实设备状态与本地列表联动
  const refreshDeviceConnected = (id: string, connected: boolean) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, connected } : d)));
  };

  const handleListConnect = async (record: DeviceInfo) => {
    if (record.type === '机械臂') {
      await robotArm.connect();
      addLog('info', `${record.name} 连接成功`);
    } else {
      await agv.connect();
      addLog('info', `${record.name} 连接成功`);
    }
    refreshDeviceConnected(record.id, true);
  };
  const handleListDisconnect = (record: DeviceInfo) => {
    if (record.type === '机械臂') {
      robotArm.disconnect();
    } else {
      agv.disconnect();
    }
    addLog('info', `${record.name} 已断开`);
    refreshDeviceConnected(record.id, false);
  };

  const handleGoHome = () => {
    robotArm.goHome();
    addLog('info', '机械臂原点复归');
  };
  const handleStop = () => {
    robotArm.stop();
    addLog('warn', '机械臂停止运动');
  };

  const handleGoToStation = (stationId: string) => {
    const station = agv.stations.find((s) => s.id === stationId);
    if (!station) return;
    agv.goToStation(stationId);
    addLog('info', `AGV前往${station.name}`);
  };

  const handleDeleteDevice = (record: DeviceInfo) => {
    setDevices((prev) => prev.filter((d) => d.id !== record.id));
    message.success(`设备 ${record.name} 已删除`);
    addLog('info', `设备 ${record.name} 已删除`);
  };

  const handleAddDevice = () => {
    addForm.validateFields().then((values) => {
      const newDevice: DeviceInfo = {
        id: `device-${Date.now()}`,
        name: values.name,
        type: values.type,
        ip: values.ip,
        port: values.port,
        protocol: values.protocol,
        connected: false,
      };
      setDevices((prev) => [...prev, newDevice]);
      message.success('设备添加成功');
      addLog('info', `新设备 ${values.name} 已添加`);
      setAddModalOpen(false);
      addForm.resetFields();
    });
  };

  const handleAgvMove = (direction: '前进' | '后退' | '左转' | '右转') => {
    if (!agv.isConnected) return;
    const nextPosition = { ...agv.position };
    if (direction === '前进') nextPosition.y -= agvDistance * 100;
    if (direction === '后退') nextPosition.y += agvDistance * 100;
    if (direction === '左转') nextPosition.x -= agvDistance * 100;
    if (direction === '右转') nextPosition.x += agvDistance * 100;
    agv.setPosition(nextPosition.x, nextPosition.y);
    addLog('info', `AGV${direction}：速度 ${agvSpeed} m/s，距离 ${agvDistance} m`);
  };

  /* ---------- 设备列表页 ---------- */
  const deviceColumns: TableProps<DeviceInfo>['columns'] = [
    { title: '序号', key: 'idx', width: 60, render: (_v, _r, idx) => idx + 1 },
    { title: '设备名称', dataIndex: 'name', key: 'name', width: 160 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (val: string) => (
        <Tag color={val === '机械臂' ? 'geekblue' : 'cyan'}>{val}</Tag>
      ),
    },
    {
      title: '连接状态',
      dataIndex: 'connected',
      key: 'connected',
      width: 110,
      render: (val: boolean) => (
        <Badge
          status={val ? 'success' : 'default'}
          text={val ? '已连接' : '未连接'}
        />
      ),
    },
    { title: 'IP 地址', dataIndex: 'ip', key: 'ip', width: 130 },
    { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      width: 90,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_v, record) => (
        <Space size="small">
          {record.connected ? (
            <Button
              size="small"
              danger
              icon={<DisconnectOutlined />}
              onClick={() => handleListDisconnect(record)}
            >
              断开连接
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => handleListConnect(record)}
            >
              连接
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditTarget(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除设备 "${record.name}" 吗？`}
            onConfirm={() => handleDeleteDevice(record)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderDeviceList = () => (
    <Card
      title={
        <Space>
          <ApiOutlined />
          <span>设备列表</span>
        </Space>
      }
      extra={
        <Space>
          <Badge status="success" text={`已连接 ${devices.filter((d) => d.connected).length}`} />
          <Badge status="default" text={`未连接 ${devices.filter((d) => !d.connected).length}`} />
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
        >
          添加设备
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={deviceColumns}
        dataSource={devices}
        pagination={false}
        size="small"
        bordered
      />
      <Divider style={{ margin: '16px 0' }} />
      <div style={{ color: '#8c8c8c', fontSize: 12 }}>
        提示：编辑可修改设备的 IP、端口和通讯协议；连接/断开与控制面板共用同一连接状态。
      </div>
    </Card>
  );

  /* ---------- 设备状态页 ---------- */
  const renderDeviceStatus = () => (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* 机械臂状态面板 */}
      <Card
        title={
          <Space>
            <RobotOutlined />
            <span>机械臂</span>
            <Badge
              status={robotArm.isConnected ? 'success' : 'default'}
              text={robotArm.isConnected ? '已连接' : '未连接'}
            />
          </Space>
        }
        extra={
          <Space>
            <span style={{ color: '#8c8c8c' }}>工作模式</span>
            <Select
              size="small"
              value={robotArm.mode}
              onChange={(v) => robotArm.setMode(v)}
              disabled={!robotArm.isConnected}
              options={[
                { value: 'manual', label: '手动模式' },
                { value: 'auto', label: '自动模式' },
              ]}
              style={{ width: 110 }}
            />
          </Space>
        }
      >
        {/* 速度 + 停止 + 原点复归 */}
        <Row gutter={16} align="middle">
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#8c8c8c', fontSize: 13 }}>速度</span>
              <span style={{ float: 'right', color: '#262626', fontWeight: 600 }}>{robotArm.speed}%</span>
            </div>
            <Slider
              min={1}
              max={100}
              value={robotArm.speed}
              onChange={(v) => robotArm.setSpeed(v)}
              disabled={!robotArm.isConnected}
              railStyle={{ backgroundColor: '#e8e8e8' }}
              trackStyle={{ backgroundColor: '#f58020' }}
              handleStyle={{ borderColor: '#f58020', backgroundColor: '#f58020' }}
              tooltip={{
                formatter: (value) => <span style={{ color: '#262626', fontWeight: 600 }}>{value}%</span>,
                overlayInnerStyle: { backgroundColor: '#fff', color: '#262626' },
              }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button
              style={{ marginTop: 4 }}
              onClick={() => message.info(`当前速度已设置为 ${robotArm.speed}%`)}
              disabled={!robotArm.isConnected}
            >
              设置速度
            </Button>
          </Col>
          <Col xs={24} md={8}>
            <Space wrap style={{ float: 'right' }}>
              <Button
                danger
                icon={<PauseCircleOutlined />}
                onClick={handleStop}
                disabled={!robotArm.isRunning}
              >
                停止运动
              </Button>
              <Button
                icon={<HomeOutlined />}
                onClick={handleGoHome}
                disabled={!robotArm.isConnected || robotArm.isRunning}
              >
                原点复归
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }} />

        {/* 步长设置 */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span style={{ color: '#8c8c8c' }}>步长设置</span>
            <InputNumber
              size="small"
              min={0.1}
              max={50}
              step={0.5}
              value={robotArm.stepLength}
              onChange={(v) => v !== null && robotArm.setStepLength(v)}
              disabled={!robotArm.isConnected}
              style={{ width: 90 }}
            />
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 步进运动按钮组 */}
        <div style={{ marginBottom: 8, color: '#8c8c8c', fontSize: 13 }}>步进运动</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {(['x', 'y', 'z', 'rx', 'ry', 'rz'] as (keyof CartesianPose)[]).map((axis) => (
            <div
              key={axis}
              style={{ display: 'grid', gridTemplateColumns: 'auto 200px auto', gap: 8, alignItems: 'center' }}
            >
              <Button
                type="primary"
                style={{
                  background: '#f58020',
                  borderColor: '#f58020',
                  minWidth: 80,
                  height: 36,
                  padding: '0 14px',
                }}
                icon={<MinusOutlined />}
                onClick={() => robotArm.stepAxis(axis, -1)}
                disabled={!robotArm.isConnected || robotArm.isRunning}
              >
                {cartesianLabels[axis]}
              </Button>
              <div
                style={{
                  textAlign: 'center',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  padding: '0 16px',
                  height: 36,
                  minWidth: 200,
                  fontFamily: 'monospace',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#262626',
                  lineHeight: '34px',
                }}
                title={`${cartesianLabels[axis]} 当前值`}
              >
                {robotArm.tcp[axis].toFixed(2)}
              </div>
              <Button
                type="primary"
                style={{
                  background: '#f58020',
                  borderColor: '#f58020',
                  minWidth: 80,
                  height: 36,
                  padding: '0 14px',
                }}
                icon={<PlusOutlined />}
                onClick={() => robotArm.stepAxis(axis, 1)}
                disabled={!robotArm.isConnected || robotArm.isRunning}
              >
                {cartesianLabels[axis]}
              </Button>
            </div>
          ))}
        </div>

        {/* 关节运动按钮组 */}
        <div style={{ marginBottom: 8, color: '#8c8c8c', fontSize: 13 }}>关节运动</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {(['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as (keyof JointState)[]).map((joint) => (
            <div
              key={joint}
              style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center' }}
            >
              <Button
                type="primary"
                style={{
                  background: '#f58020',
                  borderColor: '#f58020',
                  minWidth: 80,
                  height: 36,
                  padding: '0 14px',
                }}
                icon={<MinusOutlined />}
                onClick={() => robotArm.stepJoint(joint, -1)}
                disabled={!robotArm.isConnected || robotArm.isRunning}
              >
                {jointLabels[joint]}
              </Button>
              <div
                style={{
                  textAlign: 'center',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  padding: '0 16px',
                  height: 36,
                  minWidth: 160,
                  fontFamily: 'monospace',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#262626',
                  lineHeight: '34px',
                }}
                title={`${jointLabels[joint]} 当前值`}
              >
                {robotArm.joints[joint].toFixed(1)}°
              </div>
              <Button
                type="primary"
                style={{
                  background: '#f58020',
                  borderColor: '#f58020',
                  minWidth: 80,
                  height: 36,
                  padding: '0 14px',
                }}
                icon={<PlusOutlined />}
                onClick={() => robotArm.stepJoint(joint, 1)}
                disabled={!robotArm.isConnected || robotArm.isRunning}
              >
                {jointLabels[joint]}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* AGV 状态面板 */}
      <Card
        className="agv-control-card"
        title={
          <Space>
            <CarOutlined />
            <span>AGV</span>
            <Badge
              status={agv.isConnected ? 'success' : 'default'}
              text={agv.isConnected ? '已连接' : '未连接'}
            />
          </Space>
        }
        extra={
          <Space size={24}>
            <span style={{ color: '#595959' }}>
              当前位置: <strong style={{ color: '#262626' }}>({agv.position.x.toFixed(0)}, {agv.position.y.toFixed(0)})</strong>
            </span>
            <span style={{ color: '#595959' }}>
              电量: <Progress percent={agv.battery} size="small" strokeColor={agv.battery < 20 ? '#ff4d4f' : '#f58020'} style={{ width: 80, display: 'inline-block', verticalAlign: 'middle' }} />
            </span>
            <Button type="primary" size="small" onClick={() => setStationModalOpen(true)}>到点功能</Button>
          </Space>
        }
      >
        <div className="agv-remote-panel">
          <div className="agv-panel-heading">
            <Space align="center" size={16}>
              <div className="agv-panel-title">遥控模式</div>
              <Badge
                status={agv.status === 'moving' ? 'processing' : agv.status === 'error' ? 'error' : 'success'}
                text={agv.status === 'moving' ? '移动中' : agv.status === 'error' ? '异常' : '待机'}
              />
              <Divider type="vertical" style={{ margin: '0 8px' }} />
              <span className="agv-panel-description">设置单次运动参数并控制 AGV 移动</span>
            </Space>
          </div>

          <div className="agv-control-layout">
            <div className="agv-control-column">
              <section className="agv-control-section">
                <div className="agv-section-title">运动参数</div>
                <div className="agv-parameter-grid">
                  <div className="agv-field">
                    <label>运动速度 <span style={{ color: '#8c8c8c', fontSize: 12 }}>m/s</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvSpeed(Math.max(0.01, Math.round((agvSpeed - 0.01) * 100) / 100))}
                        disabled={!agv.isConnected}
                      >−</Button>
                      <input
                        type="number"
                        value={agvSpeed}
                        onChange={(e) => setAgvSpeed(parseFloat(e.target.value) || 0)}
                        disabled={!agv.isConnected}
                        style={{
                          width: 60,
                          height: 28,
                          textAlign: 'center',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        }}
                      />
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvSpeed(Math.min(10, Math.round((agvSpeed + 0.01) * 100) / 100))}
                        disabled={!agv.isConnected}
                      >+</Button>
                    </div>
                  </div>
                  <div className="agv-field">
                    <label>运动距离 <span style={{ color: '#8c8c8c', fontSize: 12 }}>m</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvDistance(Math.max(0.01, Math.round((agvDistance - 0.01) * 100) / 100))}
                        disabled={!agv.isConnected}
                      >−</Button>
                      <input
                        type="number"
                        value={agvDistance}
                        onChange={(e) => setAgvDistance(parseFloat(e.target.value) || 0)}
                        disabled={!agv.isConnected}
                        style={{
                          width: 60,
                          height: 28,
                          textAlign: 'center',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        }}
                      />
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvDistance(Math.min(100, Math.round((agvDistance + 0.01) * 100) / 100))}
                        disabled={!agv.isConnected}
                      >+</Button>
                    </div>
                  </div>
                  <div className="agv-field">
                    <label>转动角度 <span style={{ color: '#8c8c8c', fontSize: 12 }}>rad</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvAngle(Math.max(1, agvAngle - 1))}
                        disabled={!agv.isConnected}
                      >−</Button>
                      <input
                        type="number"
                        value={agvAngle}
                        onChange={(e) => setAgvAngle(parseInt(e.target.value) || 0)}
                        disabled={!agv.isConnected}
                        style={{
                          width: 60,
                          height: 28,
                          textAlign: 'center',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        }}
                      />
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvAngle(Math.min(180, agvAngle + 1))}
                        disabled={!agv.isConnected}
                      >+</Button>
                    </div>
                  </div>
                  <div className="agv-field">
                    <label>转动速度 <span style={{ color: '#8c8c8c', fontSize: 12 }}>rad/s</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvAngularSpeed(Math.max(0.01, Math.round((agvAngularSpeed - 0.01) * 100) / 100))}
                        disabled={!agv.isConnected}
                      >−</Button>
                      <input
                        type="number"
                        value={agvAngularSpeed}
                        onChange={(e) => setAgvAngularSpeed(parseFloat(e.target.value) || 0)}
                        disabled={!agv.isConnected}
                        style={{
                          width: 60,
                          height: 28,
                          textAlign: 'center',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        }}
                      />
                      <Button
                        type="primary"
                        style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                        onClick={() => setAgvAngularSpeed(Math.min(10, Math.round((agvAngularSpeed + 0.01) * 100) / 100))}
                        disabled={!agv.isConnected}
                      >+</Button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="agv-control-section">
                <div className="agv-section-title">校准控件</div>
                <div className="agv-calibration-grid">
                  <label>X 方向 <span style={{ color: '#8c8c8c', fontSize: 12 }}>°</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Button
                      type="primary"
                      style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                      onClick={() => setCalibrationX(Math.max(-180, calibrationX - 1))}
                    >−</Button>
                    <input
                      type="number"
                      value={calibrationX}
                      onChange={(e) => setCalibrationX(parseInt(e.target.value) || 0)}
                      style={{
                        width: 60,
                        height: 28,
                        textAlign: 'center',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 13,
                      }}
                    />
                    <Button
                      type="primary"
                      style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                      onClick={() => setCalibrationX(Math.min(180, calibrationX + 1))}
                    >+</Button>
                  </div>
                  <Button onClick={() => setCalibrationX(90)}>正向</Button>

                  <label>Y 方向 <span style={{ color: '#8c8c8c', fontSize: 12 }}>°</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Button
                      type="primary"
                      style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                      onClick={() => setCalibrationY(Math.max(-180, calibrationY - 1))}
                    >−</Button>
                    <input
                      type="number"
                      value={calibrationY}
                      onChange={(e) => setCalibrationY(parseInt(e.target.value) || 0)}
                      style={{
                        width: 60,
                        height: 28,
                        textAlign: 'center',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 13,
                      }}
                    />
                    <Button
                      type="primary"
                      style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                      onClick={() => setCalibrationY(Math.min(180, calibrationY + 1))}
                    >+</Button>
                  </div>
                  <Button onClick={() => setCalibrationY(0)}>正向</Button>

                  <label>Yaw 方向</label>
                  <div className="agv-yaw-value">{calibrationYaw === 'positive' ? '正向' : '反向'}</div>
                  <Button onClick={() => setCalibrationYaw((v) => v === 'positive' ? 'negative' : 'positive')}>切换方向</Button>

                  <label>校准步长 <span style={{ color: '#8c8c8c', fontSize: 12 }}>deg</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Button
                      type="primary"
                      style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                      onClick={() => setCalibrationStep(Math.max(1, calibrationStep - 1))}
                    >−</Button>
                    <input
                      type="number"
                      value={calibrationStep}
                      onChange={(e) => setCalibrationStep(parseInt(e.target.value) || 1)}
                      style={{
                        width: 60,
                        height: 28,
                        textAlign: 'center',
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 13,
                      }}
                    />
                    <Button
                      type="primary"
                      style={{ width: 28, height: 28, padding: 0, background: '#f58020', borderColor: '#f58020' }}
                      onClick={() => setCalibrationStep(Math.min(90, calibrationStep + 1))}
                    >+</Button>
                  </div>
                  <div></div>
                </div>
              </section>
            </div>

            <section className="agv-control-section agv-direction-section">
              <div className="agv-section-title">方向控制</div>
              <div className="agv-direction-hint">X axis / Y axis</div>
              <div className="agv-direction-pad">
                <Button type="primary" className="agv-direction-button agv-forward" icon={<ArrowUpOutlined />} onClick={() => handleAgvMove('前进')} disabled={!agv.isConnected}>前进</Button>
                <Button type="primary" className="agv-direction-button agv-left" icon={<ArrowLeftOutlined />} onClick={() => handleAgvMove('左转')} disabled={!agv.isConnected}>左转</Button>
                <Button className="agv-emergency-button" danger onClick={agv.stop}>急停</Button>
                <Button type="primary" className="agv-direction-button agv-right" icon={<ArrowRightOutlined />} onClick={() => handleAgvMove('右转')} disabled={!agv.isConnected}>右转</Button>
                <Button type="primary" className="agv-direction-button agv-back" icon={<ArrowDownOutlined />} onClick={() => handleAgvMove('后退')} disabled={!agv.isConnected}>后退</Button>
              </div>
              <div className="agv-connection-hint">
                {agv.isConnected ? '控制已启用' : '连接 AGV 后可使用方向控制'}
              </div>
            </section>
          </div>
        </div>

        <Modal title="到点功能" open={stationModalOpen} footer={null} onCancel={() => setStationModalOpen(false)}>
          <Space wrap>
            {agv.stations.map((station) => (
              <Button key={station.id} onClick={() => { handleGoToStation(station.id); setStationModalOpen(false); }} disabled={!agv.isConnected || agv.status === 'moving'}>
                {station.name}
              </Button>
            ))}
            <Button icon={<ReloadOutlined />}>回充</Button>
          </Space>
        </Modal>
      </Card>
    </Space>
  );

  /* ---------- 编辑设备对话框 ---------- */
  const renderEditModal = () => (
    <Modal
      title={editTarget ? `编辑设备 - ${editTarget.name}` : ''}
      open={!!editTarget}
      onCancel={() => {
        setEditTarget(null);
        editForm.resetFields();
      }}
      onOk={() => {
        editForm.validateFields().then((values) => {
          if (!editTarget) return;
          setDevices((prev) =>
            prev.map((d) => (d.id === editTarget.id ? { ...editTarget, ...values } : d))
          );
          addLog('info', `设备 ${editTarget.name} 配置已更新`);
          setEditTarget(null);
          editForm.resetFields();
        });
      }}
      destroyOnClose
    >
      {editTarget && (
        <Form
          form={editForm}
          layout="vertical"
          initialValues={editTarget}
        >
          <Form.Item
            name="name"
            label="设备名称"
            rules={[
              { required: true, message: '请输入设备名称' },
              { min: 2, max: 30, message: '设备名称长度应在 2-30 个字符之间' },
            ]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择设备类型' }]}
          >
            <Select
              options={[
                { value: '机械臂', label: '机械臂' },
                { value: 'AGV', label: 'AGV' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="ip"
            label="IP 地址"
            rules={[
              { required: true, message: '请输入 IP 地址' },
              { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的 IP 地址格式（如：192.168.1.100）' },
              {
                validator: (_rule, value) => {
                  if (!value) return Promise.resolve();
                  const parts = value.split('.');
                  const valid = parts.every((part: string) => {
                    const num = parseInt(part, 10);
                    return num >= 0 && num <= 255;
                  });
                  return valid ? Promise.resolve() : Promise.reject(new Error('IP 地址每个段应在 0-255 之间'));
                },
              },
            ]}
          >
            <Input placeholder="例如：192.168.1.100" />
          </Form.Item>
          <Form.Item
            name="port"
            label="端口"
            rules={[
              { required: true, message: '请输入端口号' },
              { type: 'number', min: 1, max: 65535, message: '端口号应在 1-65535 之间' },
            ]}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="例如：502" />
          </Form.Item>
          <Form.Item
            name="protocol"
            label="通讯协议"
            rules={[{ required: true, message: '请选择通讯协议' }]}
          >
            <Select
              options={[
                { value: 'TCP', label: 'TCP' },
                { value: 'UDP', label: 'UDP' },
                { value: 'Modbus', label: 'Modbus' },
              ]}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );

  /* ---------- 添加设备对话框 ---------- */
  const renderAddModal = () => (
    <Modal
      title="添加设备"
      open={addModalOpen}
      onCancel={() => {
        setAddModalOpen(false);
        addForm.resetFields();
      }}
      onOk={handleAddDevice}
      okText="添加"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={addForm}
        layout="vertical"
        initialValues={{
          type: '机械臂',
          protocol: 'TCP',
        }}
      >
        <Form.Item
          name="name"
          label="设备名称"
          rules={[{ required: true, message: '请输入设备名称' }]}
        >
          <Input placeholder="请输入设备名称" />
        </Form.Item>
        <Form.Item
          name="type"
          label="类型"
          rules={[{ required: true, message: '请选择设备类型' }]}
        >
          <Select
            options={[
              { value: '机械臂', label: '机械臂' },
              { value: 'AGV', label: 'AGV' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="ip"
          label="IP 地址"
          rules={[
            { required: true, message: '请输入 IP 地址' },
            { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的 IP 地址' },
          ]}
        >
          <Input placeholder="例如：192.168.1.100" />
        </Form.Item>
        <Form.Item
          name="port"
          label="端口"
          rules={[
            { required: true, message: '请输入端口号' },
            { type: 'number', min: 1, max: 65535, message: '端口号应在 1-65535 之间' },
          ]}
        >
          <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="例如：502" />
        </Form.Item>
        <Form.Item
          name="protocol"
          label="通讯协议"
          rules={[{ required: true, message: '请选择通讯协议' }]}
        >
          <Select
            options={[
              { value: 'TCP', label: 'TCP' },
              { value: 'UDP', label: 'UDP' },
              { value: 'Modbus', label: 'Modbus' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div>
      <div className="page-header">
        <h2>设备列表</h2>
      </div>

      {tab === 'list' ? renderDeviceList() : renderDeviceStatus()}
      {renderEditModal()}
      {renderAddModal()}
    </div>
  );
}
