import { useState } from 'react';
import { Badge, Button, Card, Col, Divider, InputNumber, Row, Select, Slider, Space, message } from 'antd';
import { HomeOutlined, MinusOutlined, PauseCircleOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import DevicePowerButton from '@/components/device/DevicePowerButton';
import { useLogStore } from '@/store/logs';
import { useRobotArmStore, type CartesianPose, type JointState } from '@/store/robotArm';
import styles from '@/styles/common.module.css';
import pageStyles from './DeviceControl.module.css';

const cartesianLabels: Record<keyof CartesianPose, string> = { x: 'X', y: 'Y', z: 'Z', rx: 'RX', ry: 'RY', rz: 'RZ' };
const jointLabels: Record<keyof JointState, string> = { j1: 'J1', j2: 'J2', j3: 'J3', j4: 'J4', j5: 'J5', j6: 'J6' };

export default function RobotArmControl() {
  const robotArm = useRobotArmStore();
  const { addLog } = useLogStore();
  const [switching, setSwitching] = useState(false);

  const toggleDevice = async () => {
    setSwitching(true);
    try {
      if (robotArm.isConnected) {
        robotArm.disconnect();
        addLog('info', '机械臂已卸载');
      } else {
        await robotArm.connect();
        addLog('info', '机械臂加载成功');
      }
    } finally {
      setSwitching(false);
    }
  };

  const renderMotionGrid = <T extends keyof CartesianPose | keyof JointState>(
    keys: T[], labels: Record<T, string>, values: Record<T, number>, onStep: (key: T, direction: number) => void, joint = false,
  ) => (
    <div className={joint ? pageStyles.jointGrid : pageStyles.stepGrid}>
      {keys.map((key) => (
        <div key={key} className={joint ? pageStyles.jointRow : pageStyles.stepRow}>
          <Button type="primary" className={styles.actionButton} icon={<MinusOutlined />} onClick={() => onStep(key, -1)} disabled={!robotArm.isConnected || robotArm.isRunning}>{labels[key]}</Button>
          <div className={joint ? styles.valueBoxSmall : styles.valueBoxLarge}>{values[key].toFixed(joint ? 1 : 2)}{joint ? '°' : ''}</div>
          <Button type="primary" className={styles.actionButton} icon={<PlusOutlined />} onClick={() => onStep(key, 1)} disabled={!robotArm.isConnected || robotArm.isRunning}>{labels[key]}</Button>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader title="机械臂控制" />
      <Card
        title={<Space><RobotOutlined /><span>机械臂控制面板</span><Badge status={robotArm.isConnected ? 'success' : 'default'} text={robotArm.isConnected ? '已加载' : '未加载'} /></Space>}
        extra={<Space><span className={styles.textTertiary}>工作模式</span><Select size="small" value={robotArm.mode} onChange={robotArm.setMode} disabled={!robotArm.isConnected} options={[{ value: 'manual', label: '手动模式' }, { value: 'auto', label: '自动模式' }]} style={{ width: 110 }} /><DevicePowerButton connected={robotArm.isConnected} loading={switching} onClick={toggleDevice} /></Space>}
      >
        <Row gutter={16} align="middle">
          <Col xs={24} md={10}><div className={pageStyles.speedSection}><div className={pageStyles.speedLabel}><span>速度</span><span className={pageStyles.speedValue}>{robotArm.speed}%</span></div><Slider min={1} max={100} value={robotArm.speed} onChange={robotArm.setSpeed} disabled={!robotArm.isConnected} /></div></Col>
          <Col xs={24} md={6}><Button onClick={() => message.success(`速度已设置为 ${robotArm.speed}%`)} disabled={!robotArm.isConnected}>设置速度</Button></Col>
          <Col xs={24} md={8}><Space className={pageStyles.actionArea}><Button danger icon={<PauseCircleOutlined />} onClick={() => robotArm.stop()} disabled={!robotArm.isRunning}>停止运动</Button><Button icon={<HomeOutlined />} onClick={() => robotArm.goHome()} disabled={!robotArm.isConnected || robotArm.isRunning}>原点复归</Button></Space></Col>
        </Row>
        <Divider className={styles.divider} />
        <Space><span className={styles.textTertiary}>步长设置</span><InputNumber min={0.1} max={50} step={0.5} value={robotArm.stepLength} onChange={(value) => value !== null && robotArm.setStepLength(value)} disabled={!robotArm.isConnected} addonAfter="mm/°" /></Space>
        <Divider className={styles.divider} />
        <div className={pageStyles.stepSection}>步进运动</div>
        {renderMotionGrid(Object.keys(cartesianLabels) as (keyof CartesianPose)[], cartesianLabels, robotArm.tcp, robotArm.stepAxis)}
        <div className={pageStyles.stepSection}>关节运动</div>
        {renderMotionGrid(Object.keys(jointLabels) as (keyof JointState)[], jointLabels, robotArm.joints, robotArm.stepJoint, true)}
      </Card>
    </div>
  );
}
