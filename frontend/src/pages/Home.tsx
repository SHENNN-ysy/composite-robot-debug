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

export default function Home() {
  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const { logs, addLog } = useLogStore();

  useEffect(() => {
    addLog('info', '系统启动完成');
    if (robotArm.isConnected) {
      addLog('info', '机械臂已连接');
    }
    if (agv.isConnected) {
      addLog('info', 'AGV已连接');
    }
  }, []);

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
      name: '视觉',
      icon: <CameraOutlined className={pageStyles.deviceIcon} />,
      status: 'offline',
      info: '未连接',
    },
  ];

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
          <Progress percent={agv.battery} size="small" style={{ width: 120 }} strokeColor={agv.battery < 20 ? '#ff4d4f' : '#f58020'} />
        </div>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>状态</span>
          <Badge status={agv.status === 'idle' ? 'success' : agv.status === 'moving' ? 'processing' : 'error'}
            text={agv.status === 'idle' ? '待机' : agv.status === 'moving' ? '移动中' : '错误'} />
        </div>
        <div className={pageStyles.statusRow}>
          <span className={styles.textSecondary}>当前位置</span>
          <span className={pageStyles.statusValue}>
            {agv.currentStation ? agv.stations.find((s) => s.id === agv.currentStation)?.name : '未知'}
          </span>
        </div>
      </div>
    </Card>
  );

  const renderLogTable = () => (
    <Card title="最近操作日志" variant="borderless" style={{ marginTop: 16 }}>
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
