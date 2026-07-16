import { Card, Row, Col, Badge, Progress, Table } from 'antd';
import {
  RobotOutlined,
  CarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useRobotArmStore } from '../store/robotArm';
import { useAGVStore } from '../store/agv';
import { useLogStore, LogEntry } from '../store/logs';
import { useEffect } from 'react';

export default function Home() {
  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const { logs, addLog } = useLogStore();

  useEffect(() => {
    // 模拟系统启动日志
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
      icon: <RobotOutlined style={{ fontSize: 20 }} />,
      status: robotArm.isConnected ? 'online' : 'offline',
      info: robotArm.isConnected ? '已连接' : '未连接',
    },
    {
      name: 'AGV',
      icon: <CarOutlined style={{ fontSize: 20 }} />,
      status: agv.isConnected ? 'online' : 'offline',
      info: agv.isConnected ? '已连接' : '未连接',
    },
    {
      name: '视觉',
      icon: <CameraOutlined style={{ fontSize: 20 }} />,
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

  return (
    <div>
      <div className="page-header">
        <h2>欢迎使用复合机器人调试平台</h2>
      </div>

      <Row gutter={[16, 16]}>
        {/* 设备连接状态 */}
        <Col xs={24} lg={8}>
          <Card title="设备连接状态" bordered={false}>
            {deviceStatus.map((device) => (
              <div
                key={device.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {device.icon}
                  <span>{device.name}</span>
                </div>
                <Badge
                  status={device.status === 'online' ? 'success' : 'default'}
                  text={device.info}
                />
              </div>
            ))}
          </Card>
        </Col>

        {/* 机械臂状态 */}
        <Col xs={24} lg={8}>
          <Card title="机械臂状态" bordered={false}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#595959' }}>连接状态</span>
                <Badge
                  status={robotArm.isConnected ? 'success' : 'default'}
                  text={robotArm.isConnected ? '在线' : '离线'}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#595959' }}>运行状态</span>
                <Badge
                  status={robotArm.isRunning ? 'processing' : 'default'}
                  text={robotArm.isRunning ? '运行中' : '待机'}
                />
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {Object.entries(robotArm.joints).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    background: '#fafafa',
                    padding: '8px 12px',
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{key.toUpperCase()}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#262626' }}>
                    {value.toFixed(1)}°
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* AGV状态 */}
        <Col xs={24} lg={8}>
          <Card title="AGV状态" bordered={false}>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#595959' }}>位置</span>
                <span style={{ fontWeight: 500 }}>
                  ({agv.position.x.toFixed(1)}, {agv.position.y.toFixed(1)})
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#595959' }}>电量</span>
                <Progress
                  percent={agv.battery}
                  size="small"
                  style={{ width: 120 }}
                  strokeColor={agv.battery < 20 ? '#ff4d4f' : '#f58020'}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#595959' }}>状态</span>
                <Badge
                  status={
                    agv.status === 'idle'
                      ? 'success'
                      : agv.status === 'moving'
                      ? 'processing'
                      : 'error'
                  }
                  text={
                    agv.status === 'idle'
                      ? '待机'
                      : agv.status === 'moving'
                      ? '移动中'
                      : '错误'
                  }
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#595959' }}>当前位置</span>
                <span style={{ fontWeight: 500 }}>
                  {agv.currentStation
                    ? agv.stations.find((s) => s.id === agv.currentStation)?.name
                    : '未知'}
                </span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近操作日志 */}
      <Card
        title="最近操作日志"
        bordered={false}
        style={{ marginTop: 16 }}
      >
        <Table
          dataSource={logs.slice(0, 10)}
          columns={logColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
