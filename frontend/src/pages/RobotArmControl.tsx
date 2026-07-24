/**
 * 机械臂控制页（路由页面组件）。
 *
 * <p>业务职责：面向现场调试人员的机械臂手动控制界面，涵盖工作模式切换（手动/自动）、
 * 速度设定与下发、步长设置、笛卡尔六维位姿（X/Y/Z/RX/RY/RZ）步进、六轴关节（J1~J6）步进、
 * 停止运动与原点复归，并内嵌 IO 控制面板（RobotArmIoPanel）和示教点面板（RobotArmTeachPointPanel）。</p>
 *
 * <p>数据流：页面本身不直接请求后端，全部读写 useRobotArmStore（Zustand）。
 * 控制动作由 store 调用对应的语义化 HTTP POST 接口；机械臂在线状态、关节角、TCP 位姿、IO 状态
 * 则由后端通过 WebSocket（/ws/control 的 device.snapshot / arm.status 等单向推送）写回同一 store，
 * 因此页面上的示数是控制系统实时上报值，而非前端本地推算值。</p>
 */
import { Badge, Button, Card, Col, Divider, InputNumber, Row, Select, Slider, Space, message } from 'antd';
import { HomeOutlined, MinusOutlined, PauseCircleOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import DevicePowerButton from '@/components/device/DevicePowerButton';
import RobotArmIoPanel from '@/components/device/RobotArmIoPanel';
import RobotArmTeachPointPanel from '@/components/device/RobotArmTeachPointPanel';
import { useRobotArmStore, type CartesianPose, type JointState } from '@/store/robotArm';
import styles from '@/styles/common.module.css';
import pageStyles from './DeviceControl.module.css';

// 步进网格的轴/关节显示标签；key 与 store 中 CartesianPose / JointState 的字段一一对应
const cartesianLabels: Record<keyof CartesianPose, string> = { x: 'X', y: 'Y', z: 'Z', rx: 'RX', ry: 'RY', rz: 'RZ' };
const jointLabels: Record<keyof JointState, string> = { j1: 'J1', j2: 'J2', j3: 'J3', j4: 'J4', j5: 'J5', j6: 'J6' };

/**
 * 机械臂控制页组件。
 *
 * <p>useRobotArmStore() 一次性订阅整个机械臂状态仓库：isConnected/isRunning 决定各按钮可用性，
 * tcp/joints 为 WebSocket 实时回显的当前位姿，其余动作（applyMode/stepAxis/stepJoint/applySpeed/
 * stop/goHome/setIo/runTeachPoint）由 store 内部经 controlHttp 提交对应请求。</p>
 */
export default function RobotArmControl() {
  const robotArm = useRobotArmStore();

  /**
   * 渲染一组「减 — 当前值 — 加」的步进控制行，笛卡尔位姿与关节角共用。
   *
   * <p>onStep 实际为 store.stepAxis / stepJoint：按下后通过对应 HTTP 接口
   * 提交 {axis|joint, direction, step}，
   * 示数本身由 WebSocket 推送刷新，按钮点击不做本地数值增减。
   * joint=true 时使用关节网格样式、单位 ° 并保留 1 位小数，否则按毫米保留 2 位小数。
   * 设备未连接或正在运动（isRunning）时禁用，避免步进指令与运行中的程序冲突。</p>
   */
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
      {/* 工作模式 Select 走 store.applyMode：切换即调用模式控制接口并提交 {mode: '1'自动/'0'手动}。
          DevicePowerButton 为联调原型占位，固定禁用并提示未实现加载/卸载。 */}
      <Card
        title={<Space><RobotOutlined /><span>姿态控制</span><Badge status={robotArm.isConnected ? 'success' : 'default'} text={robotArm.isConnected ? '已加载' : '未加载'} /></Space>}
        extra={<Space><span className={styles.textTertiary}>工作模式</span><Select size="small" value={robotArm.mode} onChange={robotArm.applyMode} disabled={!robotArm.isConnected} options={[{ value: 'manual', label: '手动模式' }, { value: 'auto', label: '自动模式' }]} style={{ width: 110 }} /><DevicePowerButton connected={robotArm.isConnected} loading={false} onClick={() => undefined} disabled disabledHint="联调原型暂未实现加载/卸载" /></Space>}
      >
        {/* 速度滑块只更新本地 store.speed；点“设置速度”才调用速度控制接口。
            停止运动调用停止接口，仅运动中可点；原点复归调用回零接口，运动中禁止重复提交。 */}
        <Row gutter={16} align="middle">
          <Col xs={24} md={10}><div className={pageStyles.speedSection}><div className={pageStyles.speedLabel}><span>速度</span><span className={pageStyles.speedValue}>{robotArm.speed}%</span></div><Slider min={1} max={100} value={robotArm.speed} onChange={robotArm.setSpeed} disabled={!robotArm.isConnected} /></div></Col>
          <Col xs={24} md={6}><Button onClick={() => { robotArm.applySpeed(); message.info(`速度设置指令已发送：${robotArm.speed}%`); }} disabled={!robotArm.isConnected}>设置速度</Button></Col>
          <Col xs={24} md={8}><Space className={pageStyles.actionArea}><Button danger icon={<PauseCircleOutlined />} onClick={() => robotArm.stop()} disabled={!robotArm.isRunning}>停止运动</Button><Button icon={<HomeOutlined />} onClick={() => robotArm.goHome()} disabled={!robotArm.isConnected || robotArm.isRunning}>原点复归</Button></Space></Col>
        </Row>
        <Divider className={styles.divider} />
        {/* 步长仅保存在前端 store，不单独下发；作为 step 参数随步进指令（301/302）一起发送 */}
        <Space><span className={styles.textTertiary}>步长设置</span><InputNumber min={0.1} max={50} step={0.5} value={robotArm.stepLength} onChange={(value) => value !== null && robotArm.setStepLength(value)} disabled={!robotArm.isConnected} addonAfter="mm/°" /></Space>
        <Divider className={styles.divider} />
        {/* 步进运动 → store.stepAxis（ARM_STEP_CARTESIAN=301）；关节运动 → store.stepJoint（ARM_STEP_JOINT=302）。
            示数来自 WebSocket 回显的 tcp/joints，按钮只负责发指令 */}
        <div className={pageStyles.stepSection}>步进运动</div>
        {renderMotionGrid(Object.keys(cartesianLabels) as (keyof CartesianPose)[], cartesianLabels, robotArm.tcp, robotArm.stepAxis)}
        <div className={pageStyles.stepSection}>关节运动</div>
        {renderMotionGrid(Object.keys(jointLabels) as (keyof JointState)[], jointLabels, robotArm.joints, robotArm.stepJoint, true)}
      </Card>
      <RobotArmIoPanel
        connected={robotArm.isConnected}
        states={robotArm.io}
        onChange={robotArm.setIo}
      />
      <RobotArmTeachPointPanel
        tcp={robotArm.tcp}
        joints={robotArm.joints}
        onRun={robotArm.runTeachPoint}
      />
    </div>
  );
}
