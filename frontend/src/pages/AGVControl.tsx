import { useState } from 'react';
import { ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined, CarOutlined, ReloadOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Divider, InputNumber, Modal, Progress, Space } from 'antd';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import DevicePowerButton from '@/components/device/DevicePowerButton';
import { useAGVStore } from '@/store/agv';
import { useLogStore } from '@/store/logs';
import styles from '@/styles/common.module.css';
import pageStyles from './DeviceControl.module.css';

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

function ParameterInput({ label, unit, value, min, max, step, disabled, onChange }: ParameterInputProps) {
  return (
    <div className={pageStyles.agv_field}>
      <div className={pageStyles.stepSection}>{label}（{unit}）</div>
      <InputNumber min={min} max={max} step={step} value={value} onChange={(next) => next !== null && onChange(next)} disabled={disabled} addonAfter={unit} className={pageStyles.agv_numberInput} />
    </div>
  );
}

export default function AGVControl() {
  const agv = useAGVStore();
  const { addLog } = useLogStore();
  const [switching, setSwitching] = useState(false);
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [speed, setSpeed] = useState(0.01);
  const [distance, setDistance] = useState(0.01);
  const [angle, setAngle] = useState(1);
  const [angularSpeed, setAngularSpeed] = useState(1);
  const [calibrationX, setCalibrationX] = useState(90);
  const [calibrationY, setCalibrationY] = useState(0);
  const [calibrationStep, setCalibrationStep] = useState(5);

  const toggleDevice = async () => {
    setSwitching(true);
    try {
      if (agv.isConnected) {
        agv.disconnect();
        addLog('info', 'AGV已卸载');
      } else {
        await agv.connect();
        addLog('info', 'AGV加载成功');
      }
    } finally {
      setSwitching(false);
    }
  };

  const move = (direction: '前进' | '后退' | '左转' | '右转' | '急停') => {
    if (!agv.isConnected) return;
    if (direction === '急停') agv.stop();
    else {
      const next = { ...agv.position };
      if (direction === '前进') next.y -= distance * 100;
      if (direction === '后退') next.y += distance * 100;
      if (direction === '左转') next.x -= distance * 100;
      if (direction === '右转') next.x += distance * 100;
      agv.setPosition(next.x, next.y);
    }
    addLog(direction === '急停' ? 'warn' : 'info', `AGV${direction}，速度 ${speed} m/s`);
  };

  return (
    <div>
      <PageHeader title="AGV控制" />
      <Card
        title={<Space><CarOutlined /><span>AGV控制面板</span><Badge status={agv.isConnected ? 'success' : 'default'} text={agv.isConnected ? '已加载' : '未加载'} /></Space>}
        extra={<div className={pageStyles.agv_headerInfo}><span className={styles.textSecondary}>位置：<strong>({agv.position.x.toFixed(0)}, {agv.position.y.toFixed(0)})</strong></span><span className={pageStyles.agv_batteryInfo}>电量 <Progress percent={agv.battery} showInfo={false} size="small" className={pageStyles.agv_batteryProgress} /><span>{agv.battery}%</span></span><DevicePowerButton connected={agv.isConnected} loading={switching} onClick={toggleDevice} /></div>}
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
      <Modal title="到点功能" open={stationModalOpen} footer={null} onCancel={() => setStationModalOpen(false)}><Space wrap>{agv.stations.map((station) => <Button key={station.id} disabled={!agv.isConnected || agv.status === 'moving'} onClick={() => { agv.goToStation(station.id); setStationModalOpen(false); }}>{station.name}</Button>)}<Button icon={<ReloadOutlined />}>回充</Button></Space></Modal>
    </div>
  );
}
