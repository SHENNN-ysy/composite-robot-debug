/**
 * 设备加载/卸载按钮（机械臂、AGV 控制页共用）。
 *
 * <p>按设备在线状态切换「加载」（主按钮）/「卸载」（危险按钮）两种形态；
 * 点击后应触发设备加载/卸载流程。联调原型中该流程尚未实现，页面以 disabled + disabledHint
 * 的形式挂出占位按钮。</p>
 */
import { PoweroffOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

/** DevicePowerButton 组件对外参数。 */
interface DevicePowerButtonProps {
  /** 设备是否已连接（已加载），决定按钮文案与配色。 */
  connected: boolean;
  /** 加载/卸载请求进行中，显示按钮 loading 态。 */
  loading: boolean;
  /** 点击回调，由父页面触发实际的加载/卸载指令。 */
  onClick: () => void;
  /** 强制禁用（如功能暂未实现的占位场景）。 */
  disabled?: boolean;
  /** 禁用时悬停提示的原因说明。 */
  disabledHint?: string;
}

/** 设备电源式加载/卸载按钮；禁用时通过 Tooltip 说明原因。 */
export default function DevicePowerButton({ connected, loading, onClick, disabled, disabledHint }: DevicePowerButtonProps) {
  const button = (
    <Button
      type={connected ? 'default' : 'primary'}
      danger={connected}
      icon={<PoweroffOutlined />}
      loading={loading}
      onClick={onClick}
      disabled={disabled}
    >
      {connected ? '卸载' : '加载'}
    </Button>
  );
  // disabled 的 Button 不会触发鼠标事件，需包一层 <span> 才能让 Tooltip 正常浮出
  return disabled && disabledHint ? <Tooltip title={disabledHint}><span>{button}</span></Tooltip> : button;
}
