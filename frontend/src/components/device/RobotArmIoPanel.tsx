/**
 * 机械臂 IO 控制面板。
 *
 * <p>展示四组各 8 通道的 IO：数字输入 DI、数字输出 DO、控制输入 CI、控制输出 CO。
 * 其中 DI/CI 是输入信号，只读显示状态点（接通=绿点，断开=灰色空心点）；
 * DO/CO 是输出信号，保留 Switch 开关供用户拨动。</p>
 *
 * <p>状态来自 useRobotArmStore，由后端 WebSocket 推送（arm.status 中的 IO 数据）实时刷新；
 * 用户拨动输出开关时回调 store.setIo，通过 `POST /api/control/arm/io`
 * 直接提交 {group, index, value}。</p>
 */
import { ApiOutlined } from '@ant-design/icons';
import { Card, Switch, message } from 'antd';
import type { RobotArmIoGroup, RobotArmIoState } from '@/store/robotArm';
import panelStyles from './RobotArmPanels.module.css';

/** IO 面板组件对外参数。 */
interface RobotArmIoPanelProps {
  /** 机械臂是否已连接；未连接时全部开关禁用，避免下发无效 IO 指令。 */
  connected: boolean;
  /** 四组 IO 当前状态，来自 store（WebSocket 实时回显）。 */
  states: RobotArmIoState;
  /** 拨动开关回调，即 store.setIo：请求受理后更新本地状态；返回是否被后端受理。 */
  onChange: (group: RobotArmIoGroup, index: number, value: boolean) => Promise<boolean>;
}

/** 四组 IO 的显示名称和联调说明；readonly 标记输入类信号（DI/CI），只读显示不可下发。 */
const ioGroups: { key: RobotArmIoGroup; title: string; description: string; readonly: boolean }[] = [
  { key: 'DI', title: '数字输入 DI', description: 'DI0–DI7', readonly: true },
  { key: 'DO', title: '数字输出 DO', description: 'DO0–DO7', readonly: false },
  { key: 'CI', title: '控制输入 CI', description: 'CI0–CI7', readonly: true },
  { key: 'CO', title: '控制输出 CO', description: 'CO0–CO7', readonly: false },
];

/**
 * 机械臂 IO 控制面板。
 *
 * <p>开关值来自机械臂状态仓库，可被控制系统上报的 arm.status.io 实时刷新。</p>
 */
export default function RobotArmIoPanel({ connected, states, onChange }: RobotArmIoPanelProps) {
  /** 切换通道时先下发指令；同步发送失败则保持原状态并提示。 */
  const handleChange = async (group: RobotArmIoGroup, index: number, value: boolean) => {
    try {
      const accepted = await onChange(group, index, value);
      if (!accepted) {
        message.warning('IO 控制请求未被后端受理');
        return;
      }
      message.info(`${group}${index} 控制请求已受理`);
    } catch {
      message.error(`${group}${index} 切换指令发送失败`);
    }
  };

  return (
    <Card
      className={panelStyles.panelCard}
      title={<span><ApiOutlined /> IO 控制</span>}
      extra={<span className={panelStyles.panelHint}>每组 8 个通道</span>}
    >
      <div className={panelStyles.ioGroups}>
        {ioGroups.map((group) => (
          <section key={group.key} className={panelStyles.ioGroup}>
            <div className={panelStyles.ioGroupHeader}>
              <strong>{group.title}</strong>
              <span>{group.description}</span>
            </div>
            <div className={panelStyles.ioChannels}>
              {states[group.key].map((checked, index) => (
                <div key={`${group.key}${index}`} className={panelStyles.ioChannel}>
                  <span>{group.key}{index}</span>
                  {group.readonly ? (
                    /* 输入类信号（DI/CI）只读：接通显示绿点，断开显示灰色空心点 */
                    <span
                      className={`${panelStyles.ioDot} ${checked ? panelStyles.ioDotOn : panelStyles.ioDotOff}`}
                      role="img"
                      aria-label={`${group.key}${index} 状态：${checked ? '接通' : '断开'}`}
                    />
                  ) : (
                    <Switch
                      size="small"
                      checked={checked}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                      disabled={!connected}
                      aria-label={`${group.key}${index} 开关`}
                      onChange={(value) => handleChange(group.key, index, value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
