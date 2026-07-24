/**
 * WebSocket 实时数据分发中枢（Zustand）。
 *
 * <p>业务职责：管理到后端 /ws/control 控制通道 WebSocket 的生命周期，
 * 并把后端单向推送的五类协议消息（device.snapshot 全量快照、device.online、
 * device.offline、arm.status、agv.status）解析后分发到机械臂 store（robotArm.ts）
 * 与 AGV store（agv.ts）。本模块是"服务端推送 → 前端各设备状态"的唯一入口，
 * 页面组件不直接订阅 WebSocket，只消费各设备 store。</p>
 */
import { create } from 'zustand';
import {
  connectControlSocket,
  closeControlSocket,
  subscribeControlConnection,
  subscribeControlMessages,
} from '@/services/controlSocket';
import { useAGVStore } from './agv';
import { useRobotArmStore } from './robotArm';
import type { AGVState } from './agv';
import type { CartesianPose, JointState, RobotArmIoState } from './robotArm';
import type { ProtocolMessage } from '@/types/backend';

/** 实时通道状态：连接标志 + 幂等初始化入口。 */
interface RealtimeState {
  /** WebSocket 当前是否已连接，用于顶栏等处的在线指示。 */
  webSocketConnected: boolean;
  /** 是否已完成初始化，用于防止重复订阅与重复建连。 */
  initialized: boolean;
  /**
   * 初始化实时通道：订阅消息与连接状态监听，并建立 WebSocket 连接。
   * 幂等：已初始化时返回空清理函数，不重复订阅。
   * 返回的清理函数供调用方（如 MainLayout 的 useEffect）在卸载时取消订阅、
   * 关闭连接并复位 initialized，以便下次挂载可重新初始化。
   */
  initialize: () => () => void;
}

/**
 * arm.status 消息（及 device.snapshot 中 arm 字段）的负载结构。
 * 全部字段可选：后端按增量语义推送，缺省字段表示该维度本次无更新，前端保留旧值。
 * 协议与后端 RobotTcpHandler.normalizeArmState 对齐：tcp/joints/io 三个子对象，
 * 顶层仅放控制类字段（connected/running/speed/mode/receivedAt）。
 */
interface ArmTcpPose {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}
interface ArmJoints {
  j1?: number;
  j2?: number;
  j3?: number;
  j4?: number;
  j5?: number;
  j6?: number;
}
interface ArmStatusPayload {
  /** 机械臂控制连接是否在线。 */
  connected?: boolean;
  /** 是否有程序/动作正在执行。 */
  running?: boolean;
  /** TCP 笛卡尔位姿六分量（位置 x/y/z + 姿态角 rx/ry/rz），可增量更新。 */
  tcp?: ArmTcpPose;
  /** 六轴关节角，可增量更新。 */
  joints?: ArmJoints;
  /** 四组 IO（DI/DO/CI/CO）开关状态，允许只携带部分组。 */
  io?: Partial<RobotArmIoState>;
  /** 全局运行速度设定值。 */
  speed?: number;
  /** 运行模式；后端可能下发 'manual'/'auto' 或数字字符串 '0'/'1'，分发时统一归一。 */
  mode?: 'manual' | 'auto' | '0' | '1';
}

/** agv.status 消息（及 device.snapshot 中 agv 字段）的负载结构，同样为增量语义。 */
interface AgvStatusPayload {
  /** AGV 控制连接是否在线。 */
  connected?: boolean;
  /** 地图平面坐标位置。 */
  position?: { x: number; y: number };
  /** 剩余电量百分比（0~100）。 */
  battery?: number;
  /** 运行状态：idle 空闲 / moving 移动中 / charging 充电中 / error 故障。 */
  status?: AGVState['status'];
  /** 当前所在站点 id；null 表示不在任何站点。 */
  currentStation?: string | null;
  /** 导航目标站点 id；null 表示当前无导航目标。 */
  targetStation?: string | null;
}

/** 整机在线状态对机械臂与 AGV 同时生效：后端按控制系统整机维度上报上下线。 */
const applyOnline = (online: boolean) => {
  useRobotArmStore.getState().setConnected(online);
  useAGVStore.getState().setConnected(online);
};

/**
 * 协议消息统一入口：按 type 分发到在线标志或对应设备 store。
 * device.snapshot 为（重）连后的全量快照，一次性恢复整机在线标志与两臂状态；
 * device.online / device.offline 为整机上下线事件；arm.status / agv.status 为增量状态推送。
 */
const handleMessage = (incoming: ProtocolMessage) => {
  if (incoming.type === 'device.snapshot') {
    const payload = incoming.payload as { online?: boolean; arm?: ArmStatusPayload; agv?: AgvStatusPayload };
    applyOnline(Boolean(payload.online));
    // 快照中 arm / agv 可能各自缺省，缺省一侧维持现状不清空
    if (payload.arm) applyArmStatus(payload.arm);
    if (payload.agv) applyAgvStatus(payload.agv);
    return;
  }
  if (incoming.type === 'device.online') applyOnline(true);
  if (incoming.type === 'device.offline') applyOnline(false);
  if (incoming.type === 'arm.status') applyArmStatus(incoming.payload as ArmStatusPayload);
  if (incoming.type === 'agv.status') applyAgvStatus(incoming.payload as AgvStatusPayload);
};

/**
 * 把增量 arm 负载写入机械臂 store。
 * 逐字段判 undefined 而非整体覆盖，保证未推送的维度保留旧值；
 * 位姿/关节先收集成 Partial，仅在确有字段时触发一次 set，减少无效的状态更新与渲染。
 * 协议载荷为嵌套结构（tcp/joints/io），这里按子对象分别聚合后下发到 store。
 */
const applyArmStatus = (payload: ArmStatusPayload) => {
  const store = useRobotArmStore.getState();
  const tcp: Partial<CartesianPose> = {};
  const joints: Partial<JointState> = {};
  // 笛卡尔位姿六分量：协议放在 payload.tcp 子对象中
  (['x', 'y', 'z', 'rx', 'ry', 'rz'] as const).forEach((key) => {
    const value = payload.tcp?.[key];
    if (value !== undefined) tcp[key] = value;
  });
  // 六轴关节角：协议放在 payload.joints 子对象中
  (['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const).forEach((key) => {
    const value = payload.joints?.[key];
    if (value !== undefined) joints[key] = value;
  });
  if (payload.connected !== undefined) store.setConnected(payload.connected);
  if (payload.running !== undefined) store.setRunning(payload.running);
  if (Object.keys(joints).length > 0) store.setJoints(joints);
  if (Object.keys(tcp).length > 0) store.setTcp(tcp);
  if (payload.speed !== undefined) store.setSpeed(payload.speed);
  // 模式归一：'1'/'auto' 视为自动，其余（'0'/'manual'）视为手动
  if (payload.mode) store.setMode(payload.mode === '1' || payload.mode === 'auto' ? 'auto' : 'manual');
  if (payload.io) store.setIoState(payload.io);
};

/** 把增量 agv 负载写入 AGV store；增量语义同 applyArmStatus。 */
const applyAgvStatus = (payload: AgvStatusPayload) => {
  const store = useAGVStore.getState();
  if (payload.connected !== undefined) store.setConnected(payload.connected);
  if (payload.position) store.setPosition(payload.position.x, payload.position.y);
  if (payload.battery !== undefined) store.setBattery(payload.battery);
  if (payload.status) store.setStatus(payload.status);
  if (payload.currentStation !== undefined) store.setCurrentStation(payload.currentStation);
  // 目标站点无条件写入且缺省置 null：导航完成/取消后需清除旧目标
  store.setTargetStation(payload.targetStation ?? null);
};

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  webSocketConnected: false,
  initialized: false,
  initialize: () => {
    // 幂等保护：重复调用（如 React StrictMode 双挂载）只真正初始化一次，返回空清理函数
    if (get().initialized) return () => undefined;
    set({ initialized: true });
    const unsubscribeMessages = subscribeControlMessages(handleMessage);
    const unsubscribeConnection = subscribeControlConnection((connected) => set({ webSocketConnected: connected }));
    connectControlSocket();
    // 清理函数：供 useEffect 卸载时调用——先退订消息与连接监听，再关闭 WebSocket，
    // 最后复位 initialized 使下次挂载可以重新初始化
    return () => {
      unsubscribeMessages();
      unsubscribeConnection();
      closeControlSocket();
      set({ initialized: false });
    };
  },
}));
