/**
 * AGV 控制页（路由页面组件）。
 *
 * <p>业务职责：AGV 手动遥控界面，包括运动参数（速度/距离/转角/角速度）设置、
 * 四方向移动与急停、站点导航（到点功能）和回充；卡片头部实时展示 AGV 位置与电量。</p>
 *
 * <p>数据流：控制动作经 useAGVStore 调用对应的语义化 HTTP POST 接口；
 * AGV 的在线状态、位置、电量、运行状态
 * 由后端 WebSocket 推送（device.snapshot / agv.status）写回 store，页面只订阅 store。
 * 每次手动移动还会向前端内存中的日志 store（useLogStore，仅会话内保留最多 100 条）追加一条记录。</p>
 */
import { useState } from 'react';
import { ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined, CarOutlined, ReloadOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Divider, InputNumber, Modal, Progress, Space } from 'antd';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import DevicePowerButton from '@/components/device/DevicePowerButton';
import { useAGVStore } from '@/store/agv';
import { useLogStore } from '@/store/logs';
import styles from '@/styles/common.module.css';
import pageStyles from './DeviceControl.module.css';

/** 带单位和取值范围约束的数值输入框参数。 */
interface ParameterInputProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

/** 运动/校准参数输入框：标签 + 单位后缀的 InputNumber，清空时不回写，避免提交非法参数。 */
function ParameterInput({ label, unit, value, min, max, step, disabled, onChange }: ParameterInputProps) {
  return (
    <div className={pageStyles.agv_field}>
      <div className={pageStyles.stepSection}>{label}（{unit}）</div>
      <InputNumber min={min} max={max} step={step} value={value} onChange={(next) => next !== null && onChange(next)} disabled={disabled} addonAfter={unit} className={pageStyles.agv_numberInput} />
    </div>
  );
}

/** AGV 控制页组件。 */
export default function AGVControl() {
  const agv = useAGVStore();
  const { addLog } = useLogStore();
  const [stationModalOpen, setStationModalOpen] = useState(false);
  // 以下为“运动参数”区输入值，随 moveManual 一起放入 HTTP 请求体
  const [speed, setSpeed] = useState(0.01); // 运动速度 m/s，前进/后退时使用
  const [distance, setDistance] = useState(0.01); // 运动距离 m，前进/后退时使用
  const [angle, setAngle] = useState(1); // 转动角度 rad，左转/右转时使用
  const [angularSpeed, setAngularSpeed] = useState(1); // 转动速度 rad/s，左转/右转时使用
  // 以下为「校准控件」区输入值；联调原型仅维护界面状态，尚未接入校准指令下发
  const [calibrationX, setCalibrationX] = useState(90);
  const [calibrationY, setCalibrationY] = useState(0);
  const [calibrationStep, setCalibrationStep] = useState(5);

  /**
   * 方向控制统一入口：按方向调用 store 中对应的 HTTP 控制动作，并写入一条前端操作日志。
   *
   * <p>急停使用 `/control/agv/emergency-stop`；
   * 前进/后退使用 `/control/agv/move` 并提交 {direction, speed, distance}；
   * 左转/右转同样使用 `/control/agv/move` 并提交 {direction, angle, angularSpeed}。
   * 未连接时直接忽略，防止产生无效指令；日志级别急停记 warn、其余记 info。</p>
   */
  const move = (direction: '前进' | '后退' | '左转' | '右转' | '急停') => {
    if (!agv.isConnected) return;
    if (direction === '急停') agv.emergencyStop();
    if (direction === '前进') agv.moveManual('forward', { speed, distance });
    if (direction === '后退') agv.moveManual('backward', { speed, distance });
    if (direction === '左转') agv.moveManual('left', { angle, angularSpeed });
    if (direction === '右转') agv.moveManual('right', { angle, angularSpeed });
    addLog(direction === '急停' ? 'warn' : 'info', `AGV${direction}，速度 ${speed} m/s`);
  };

  return (
    <div>
      <PageHeader title="AGV控制" />
      <Card
        title={<Space><CarOutlined /><span>AGV控制面板</span><Badge status={agv.isConnected ? 'success' : 'default'} text={agv.isConnected ? '已加载' : '未加载'} /></Space>}
        extra={<div className={pageStyles.agv_headerInfo}><span className={styles.textSecondary}>位置：<strong>({agv.position.x.toFixed(0)}, {agv.position.y.toFixed(0)})</strong></span><span className={pageStyles.agv_batteryInfo}>电量 <Progress percent={agv.battery} showInfo={false} size="small" className={pageStyles.agv_batteryProgress} /><span>{agv.battery}%</span></span><DevicePowerButton connected={agv.isConnected} loading={false} onClick={() => undefined} disabled disabledHint="联调原型暂未实现加载/卸载" /></div>}
      >
        <div className={pageStyles.agv_remotePanel}>
          <div className={pageStyles.agv_panelHeading}><div><div className={pageStyles.agv_panelTitle}>遥控模式</div><div className={pageStyles.agv_panelDescription}>设置运动和校准参数后控制 AGV 移动</div></div><Badge status={agv.status === 'moving' ? 'processing' : agv.status === 'error' ? 'error' : 'success'} text={agv.status === 'moving' ? '移动中' : agv.status === 'error' ? '异常' : '待机'} /></div>
          <div className={pageStyles.agv_controlLayout}>
            <div className={pageStyles.agv_controlColumn}>
              <section className={pageStyles.agv_controlSection}>
                <div className={pageStyles.agv_sectionTitle}>运动参数</div>
                <div className={pageStyles.agv_parameterGrid}>
                  <ParameterInput label="运动速度" unit="m/s" value={speed} min={0.01} max={10} step={0.01} disabled={!agv.isConnected} onChange={setSpeed} />
                  <ParameterInput label="运动距离" unit="m" value={distance} min={0.01} max={100} step={0.01} disabled={!agv.isConnected} onChange={setDistance} />
                  <ParameterInput label="转动角度" unit="rad" value={angle} min={1} max={180} step={1} disabled={!agv.isConnected} onChange={setAngle} />
                  <ParameterInput label="转动速度" unit="rad/s" value={angularSpeed} min={0.01} max={10} step={0.01} disabled={!agv.isConnected} onChange={setAngularSpeed} />
                </div>
              </section>
              <section className={pageStyles.agv_controlSection}>
                <div className={pageStyles.agv_sectionTitle}>校准控件</div>
                <div className={pageStyles.agv_parameterGrid}>
                  <ParameterInput label="X方向" unit="mm" value={calibrationX} min={-999} max={999} step={1} disabled={!agv.isConnected} onChange={setCalibrationX} />
                  <ParameterInput label="Y方向" unit="mm" value={calibrationY} min={-999} max={999} step={1} disabled={!agv.isConnected} onChange={setCalibrationY} />
                  <ParameterInput label="Yaw方向" unit="deg" value={0} min={-180} max={180} step={1} disabled={!agv.isConnected} onChange={() => undefined} />
                  <ParameterInput label="步长" unit="deg" value={calibrationStep} min={1} max={90} step={1} disabled={!agv.isConnected} onChange={setCalibrationStep} />
                </div>
              </section>
            </div>
            <section className={`${pageStyles.agv_controlSection} ${pageStyles.agv_directionSection}`}>
              <div className={pageStyles.agv_sectionTitle}>方向控制</div>
              <div className={pageStyles.agv_directionPad}>
                <Button type="primary" className={`${pageStyles.agv_directionButton} ${pageStyles.agv_forward}`} icon={<ArrowUpOutlined />} onClick={() => move('前进')} disabled={!agv.isConnected}>前进</Button>
                <Button type="primary" className={`${pageStyles.agv_directionButton} ${pageStyles.agv_left}`} icon={<ArrowLeftOutlined />} onClick={() => move('左转')} disabled={!agv.isConnected}>左转</Button>
                <Button danger type="primary" className={`${pageStyles.agv_emergencyButton} ${pageStyles.agv_middle}`} onClick={() => move('急停')} disabled={!agv.isConnected}>急停</Button>
                <Button type="primary" className={`${pageStyles.agv_directionButton} ${pageStyles.agv_right}`} icon={<ArrowRightOutlined />} onClick={() => move('右转')} disabled={!agv.isConnected}>右转</Button>
                <Button type="primary" className={`${pageStyles.agv_directionButton} ${pageStyles.agv_back}`} icon={<ArrowDownOutlined />} onClick={() => move('后退')} disabled={!agv.isConnected}>后退</Button>
              </div>
              <Divider />
              <Button type="primary" block disabled={!agv.isConnected} onClick={() => setStationModalOpen(true)}>到点功能</Button>
            </section>
          </div>
        </div>
      </Card>
      {/* 到点功能：站点列表目前来自 store 内置的模拟站点（mockStations）。
          点站点 → goToStation 调用站点控制接口并提交 {stationId, stationName, x, y}，移动中禁止重复选点；
          回充 → recharge 调用回充控制接口。 */}
      <Modal title="到点功能" open={stationModalOpen} footer={null} onCancel={() => setStationModalOpen(false)}><Space wrap>{agv.stations.map((station) => <Button key={station.id} disabled={!agv.isConnected || agv.status === 'moving'} onClick={() => { agv.goToStation(station.id); setStationModalOpen(false); }}>{station.name}</Button>)}<Button icon={<ReloadOutlined />} disabled={!agv.isConnected} onClick={agv.recharge}>回充</Button></Space></Modal>
    </div>
  );
}
