/**
 * 首页/总览页：登录成功后的默认落地页（路由 /home）。
 *
 * 业务职责：一屏展示单机联调最关心的概览信息——
 * - 设备连接状态卡（机械臂/AGV/视觉；视觉暂未接入，固定显示未连接）；
 * - 机械臂实时状态（连接/运行状态 + 六轴关节角，来自 WebSocket 推送写入的 robotArm store）；
 * - AGV 实时状态（坐标、电量、运行状态、当前站点，来自 agv store）；
 * - 最近 10 条操作日志（来自前端本地 log store）。
 * 页面自身不主动请求后端，所有实时数据都由 MainLayout 建立的 /ws/control 通道驱动。
 */
import { Card, Row, Col, Badge, Progress, Table } from 'antd';
import {
  RobotOutlined,
  CarOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { useRobotArmStore } from '../store/robotArm';
import { useAGVStore } from '../store/agv';
import { useLogStore, LogEntry } from '../store/logs';
import { useEffect } from 'react';
import styles from '../styles/common.module.css';
import pageStyles from './Home.module.css';
import PageHeader from '@/components/common/PageHeader/PageHeader';

/** 首页/总览组件：设备连接、机械臂与 AGV 实时状态、最近日志的概览。 */
export default function Home() {
  // 订阅设备与日志 store；实时数据由 MainLayout 建立的 WebSocket 推送写入（见 store/realtime.ts）
  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const { logs, addLog } = useLogStore();

  // 依赖为空数组，仅首次进入页面执行一次：补记系统启动日志，设备已连接也各记一条
  useEffect(() => {
    addLog('info', '系统启动完成');
    if (robotArm.isConnected) {
      addLog('info', '机械臂已连接');
    }
    if (agv.isConnected) {
      addLog('info', 'AGV已连接');
    }
  }, []);

  // 设备连接状态总览卡的数据源；机械臂/AGV 取 store 实时连接态
  const deviceStatus = [
    {
      name: '机械臂',
      icon: <RobotOutlined className={pageStyles.deviceIcon} />,
      status: robotArm.isConnected ? 'online' : 'offline',
      info: robotArm.isConnected ? '已连接' : '未连接',
    },
    {
      name: 'AGV',
      icon: <CarOutlined className={pageStyles.deviceIcon} />,
      status: agv.isConnected ? 'online' : 'offline',
      info: agv.isConnected ? '已连接' : '未连接',
    },
    {
      // 视觉模块后端尚未对接，联调原型中固定显示为未连接
      name: '视觉',
      icon: <CameraOutlined className={pageStyles.deviceIcon} />,
      status: 'offline',
      info: '未连接',
    },
  ];

  // 日志表格列定义；「级别」列自定义渲染为带颜色的中文文案
  const logColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 100,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: LogEntry['level']) => {
        // 日志级别 -> 颜色 / 中文文案的映射
        const colors: Record<string, string> = {
          info: '#52c41a',
          warn: '#faad14',
          error: '#ff4d4f',
        };
        const labels: Record<string, string> = {
          info: '信息',
          warn: '警告',
          error: '错误',
        };
        return <span style={{ color: colors[level] }}>{labels[level]}</span>;
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  const pageTitle = '欢迎使用复合机器人调试平台';

  const renderDeviceStatus = () => (
    <Card title="设备连接状态" variant="borderless">
      {deviceStatus.map((device) => (
        <div key={device.name} className={pageStyles.deviceRow}>
          <div className={pageStyles.deviceInfo}>
            {device.icon}
            <span>{device.name}</span>
          </div>
          <Badge status={device.status === 'online' ? 'success' : 'default'} text={device.info} />
        </div>
      ))}
    </Card>
  );

  const renderRobotArmStatus = () => (
    <Card title="机械臂状态" variant="borderless">
      <div className={styles.mb16}>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>连接状态</span>
          <Badge status={robotArm.isConnected ? 'success' : 'default'} text={robotArm.isConnected ? '在线' : '离线'} />
        </div>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>运行状态</span>
          <Badge status={robotArm.isRunning ? 'processing' : 'default'} text={robotArm.isRunning ? '运行中' : '待机'} />
        </div>
      </div>
      <div className={pageStyles.jointGrid}>
        {/* 六轴关节角实时值，保留一位小数展示 */}
        {Object.entries(robotArm.joints).map(([key, value]) => (
          <div key={key} className={pageStyles.jointCell}>
            <div className={pageStyles.jointLabel}>{key.toUpperCase()}</div>
            <div className={pageStyles.jointValue}>{value.toFixed(1)}°</div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderAGVStatus = () => (
    <Card title="AGV状态" variant="borderless">
      <div className={styles.mb16}>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>位置</span>
          <span className={pageStyles.statusValue}>({agv.position.x.toFixed(1)}, {agv.position.y.toFixed(1)})</span>
        </div>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>电量</span>
          {/* 电量低于 20% 时进度条标红，提示需要回充 */}
          <Progress percent={agv.battery} size="small" style={{ width: 120 }} strokeColor={agv.battery < 20 ? '#ff4d4f' : '#f58020'} />
        </div>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>状态</span>
          {/* 运行状态映射：idle 待机(绿) / moving 移动中(转圈) / 其余视为异常(红) */}
          <Badge status={agv.status === 'idle' ? 'success' : agv.status === 'moving' ? 'processing' : 'error'}
            text={agv.status === 'idle' ? '待机' : agv.status === 'moving' ? '移动中' : '错误'} />
        </div>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>当前位置</span>
          <span className={pageStyles.statusValue}>
            {/* 由当前站点 id 反查站点名；id 不在站点表中（数据不一致）时显示「未知」 */}
            {agv.currentStation ? agv.stations.find((s) => s.id === agv.currentStation)?.name : '未知'}
          </span>
        </div>
      </div>
    </Card>
  );

  const renderLogTable = () => (
    <Card title="最近操作日志" variant="borderless" style={{ marginTop: 16 }}>
      {/* 仅展示最近 10 条；完整日志在「状态信息-状态日志」页查看 */}
      <Table dataSource={logs.slice(0, 10)} columns={logColumns} rowKey="id" pagination={false} size="small" />
    </Card>
  );

  return (
    <div>
      <PageHeader title={pageTitle} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>{renderDeviceStatus()}</Col>
        <Col xs={24} lg={8}>{renderRobotArmStatus()}</Col>
        <Col xs={24} lg={8}>{renderAGVStatus()}</Col>
      </Row>
      {renderLogTable()}
    </div>
  );
}
