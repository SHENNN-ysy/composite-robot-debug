/**
 * 机械臂实时状态与控制指令（Zustand）。
 *
 * <p>业务职责：保存机械臂的连接/运行状态、TCP 笛卡尔位姿、六轴关节角、
 * 运行模式与速度、四组 IO 开关状态，并向页面提供点动、回零、停止、IO 控制、
 * 示教点运行等动作。状态来源有两路：realtime.ts 分发的 WebSocket 推送（被动更新），
 * 以及本 store 动作经语义化 HTTP POST 接口发送的控制请求（主动操作）。
 * 所有控制动作在设备离线（isConnected=false）时直接忽略。</p>
 */
import { create } from 'zustand';
import { CONTROL_ENDPOINT, sendControlRequest, type ControlEndpoint } from '@/services/controlHttp';
import type { TeachPointInfo } from '@/types/backend';

/** 六轴关节角状态，j1~j6 一一对应机械臂六个关节。 */
export interface JointState {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
}

/** TCP（工具中心点）笛卡尔位姿：x/y/z 为位置分量，rx/ry/rz 为姿态角。 */
export interface CartesianPose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/** 机械臂 IO 类型；每种类型在联调原型中均提供 0~7 八个通道。 */
export type RobotArmIoGroup = 'DI' | 'DO' | 'CI' | 'CO';

/** 四组 IO 的当前开关状态。 */
export type RobotArmIoState = Record<RobotArmIoGroup, boolean[]>;

/** 示教点包含数据库主键、名称、笛卡尔位姿和六轴关节角度。 */
export type TeachPoint = TeachPointInfo;

/** 机械臂状态与控制动作集合；set 开头的方法为本地状态写入，其余为 HTTP 控制请求。 */
export interface RobotArmState {
  /** 机械臂控制连接是否在线（由 WebSocket 推送维护）；离线时所有控制动作被忽略。 */
  isConnected: boolean;
  /** 是否有程序/动作正在执行。 */
  isRunning: boolean;
  /** 当前六轴关节角，由实时推送增量更新。 */
  joints: JointState;
  /** 当前 TCP 笛卡尔位姿，由实时推送增量更新。 */
  tcp: CartesianPose;
  /** 全局运行速度设定值；页面修改后需调用 applySpeed 下发才生效。 */
  speed: number;
  /** 运行模式：manual 手动 / auto 自动；setMode 仅改本地，applyMode 才下发。 */
  mode: 'manual' | 'auto';
  /** 点动坐标系：cartesian 按笛卡尔轴点动 / joint 按关节点动（决定页面调用 stepAxis 还是 stepJoint）。 */
  coordMode: 'cartesian' | 'joint';
  /** 点动步长，随每次点动指令一起下发。 */
  stepLength: number;
  /** 四组 IO 当前开关状态，每组 8 通道（索引 0~7）。 */
  io: RobotArmIoState;
  /** 更新连接状态（供 realtime 分发层调用）。 */
  setConnected: (connected: boolean) => void;
  /** 更新运行状态（供 realtime 分发层调用）。 */
  setRunning: (running: boolean) => void;
  /** 增量合并关节角：未包含的轴保持原值。 */
  setJoints: (joints: Partial<JointState>) => void;
  /** 增量合并位姿：未包含的分量保持原值。 */
  setTcp: (tcp: Partial<CartesianPose>) => void;
  /** 更新本地速度设定值（不下发）。 */
  setSpeed: (speed: number) => void;
  /** 更新本地运行模式（不下发，供推送同步与 applyMode 前的本地切换使用）。 */
  setMode: (mode: 'manual' | 'auto') => void;
  /** 切换运行模式并发送 HTTP 请求，mode 为 '1' 自动 / '0' 手动；离线时忽略。 */
  applyMode: (mode: 'manual' | 'auto') => void;
  /** 切换点动坐标系（仅本地）。 */
  setCoordMode: (m: 'cartesian' | 'joint') => void;
  /** 调整点动步长（仅本地，随下次点动指令生效）。 */
  setStepLength: (s: number) => void;
  /** 增量合并 IO 状态（供 realtime 分发层调用）。 */
  setIoState: (io: Partial<RobotArmIoState>) => void;
  /** 下发六轴目标关节角联动指令（ARM_MOVE_JOINTS=310）；离线时忽略。 */
  moveJoints: (joints: JointState) => Promise<void>;
  /** 设置单个 IO 通道；HTTP 请求受理后同步本地状态，返回是否成功。 */
  setIo: (group: RobotArmIoGroup, index: number, value: boolean) => Promise<boolean>;
  /** 运行示教点（ARM_GOTO_TEACH_POINT=309）；返回指令是否被后端受理。 */
  runTeachPoint: (point: TeachPoint) => Promise<boolean>;
  /** 笛卡尔轴点动（ARM_STEP_CARTESIAN=301）：轴名 + 方向（delta 正负号）+ 当前步长。 */
  stepAxis: (axis: keyof CartesianPose, delta: number) => void;
  /** 关节点动（ARM_STEP_JOINT=302）：关节名 + 方向（delta 正负号）+ 当前步长。 */
  stepJoint: (joint: keyof JointState, delta: number) => void;
  /** 把当前 speed 下发为全局速度（ARM_SET_SPEED=304）。 */
  applySpeed: () => void;
  /** 回零/回原点（ARM_HOME=305）。 */
  goHome: () => Promise<void>;
  /** 停止当前动作（ARM_STOP=306）。 */
  stop: () => void;
}

/** 发送 HTTP 控制请求并将网络异常转换为布尔结果。 */
const acceptControl = async (endpoint: ControlEndpoint, data: Record<string, unknown>) => {
  try {
    await sendControlRequest(endpoint, data);
    return true;
  } catch {
    return false;
  }
};

export const useRobotArmStore = create<RobotArmState>((set, get) => ({
  // 以下初始值均为占位示例；连接建立后由 device.snapshot 全量快照覆盖为真实状态
  isConnected: false,
  isRunning: false,
  joints: { j1: 0, j2: -45, j3: 90, j4: 0, j5: 45, j6: 0 },
  tcp: { x: 350.0, y: 0.0, z: 250.0, rx: 180.0, ry: 0.0, rz: 0.0 },
  speed: 30,
  mode: 'manual',
  coordMode: 'cartesian',
  stepLength: 5,
  io: {
    DI: Array(8).fill(false),
    DO: Array(8).fill(false),
    CI: Array(8).fill(false),
    CO: Array(8).fill(false),
  },

  setConnected: (connected) => set({ isConnected: connected }),
  setRunning: (running) => set({ isRunning: running }),
  setJoints: (joints) =>
    set((state) => ({ joints: { ...state.joints, ...joints } })),
  setTcp: (tcp) =>
    set((state) => ({ tcp: { ...state.tcp, ...tcp } })),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => set({ mode }),
  applyMode: (mode) => {
    if (!get().isConnected) return;
    set({ mode });
    // 协议约定运行模式为数字字符串：'1' 自动 / '0' 手动
    void acceptControl(CONTROL_ENDPOINT.ARM_SET_MODE, { mode: mode === 'auto' ? '1' : '0' });
  },
  setCoordMode: (coordMode) => set({ coordMode }),
  setStepLength: (stepLength) => set({ stepLength }),
  setIoState: (io) => set((state) => ({
    io: {
      ...state.io,
      ...io,
    },
  })),

  moveJoints: async (joints) => {
    const { isConnected } = get();
    if (!isConnected) return;
    await acceptControl(CONTROL_ENDPOINT.ARM_MOVE_JOINTS, { joints });
  },

  /** 通过独立 HTTP 接口提交单个 IO 控制请求。 */
  setIo: (group, index, value) => {
    if (!get().isConnected) return Promise.resolve(false);
    return acceptControl(CONTROL_ENDPOINT.ARM_SET_IO, { group, index, value }).then((accepted) => {
      // 请求被后端受理后才同步本地 IO 状态，避免失败时界面与设备实际不一致
      if (!accepted) return false;
      set((state) => ({
        io: {
          ...state.io,
          [group]: state.io[group].map((checked, channel) => (channel === index ? value : checked)),
        },
      }));
      return true;
    });
  },

  /** 通过独立 HTTP 接口提交完整示教点运行请求。 */
  runTeachPoint: (point) => {
    if (!get().isConnected) return Promise.resolve(false);
    const { id: pointId, name, x, y, z, rx, ry, rz, j1, j2, j3, j4, j5, j6 } = point;
    // 同时携带示教点主键、名称、笛卡尔位姿与六轴关节角，供控制系统按需选用
    return acceptControl(CONTROL_ENDPOINT.ARM_GOTO_TEACH_POINT, {
      pointId,
      name,
      pose: { x, y, z, rx, ry, rz },
      joints: { j1, j2, j3, j4, j5, j6 },
    });
  },

  stepAxis: (axis, delta) => {
    const { stepLength, isConnected } = get();
    if (!isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.ARM_STEP_CARTESIAN, {
      axis: axis.toUpperCase(),
      direction: delta < 0 ? -1 : 1,
      step: stepLength,
    });
  },

  stepJoint: (joint, delta) => {
    const { stepLength, isConnected } = get();
    if (!isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.ARM_STEP_JOINT, {
      joint: joint.toUpperCase(),
      direction: delta < 0 ? -1 : 1,
      step: stepLength,
    });
  },

  applySpeed: () => {
    const { speed, isConnected } = get();
    if (!isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.ARM_SET_SPEED, { speed });
  },

  goHome: async () => {
    const { isConnected } = get();
    if (!isConnected) return;
    await acceptControl(CONTROL_ENDPOINT.ARM_HOME, {});
  },

  stop: () => {
    if (!get().isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.ARM_STOP, {});
  },
}));
