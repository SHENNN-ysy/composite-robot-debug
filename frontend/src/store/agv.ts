/**
 * AGV（自动导引车）实时状态与控制指令（Zustand）。
 *
 * <p>业务职责：保存 AGV 的连接状态、地图平面位置、剩余电量、运行状态、
 * 当前/目标站点与站点列表，并向页面提供手动移动、站点导航、停止/急停、
 * 回充等动作。状态更新来自 realtime.ts 分发的 WebSocket 推送；
 * 控制动作经独立的语义化 HTTP POST 接口发送，设备离线时一律忽略。</p>
 */
import { create } from 'zustand';
import { CONTROL_ENDPOINT, sendControlRequest, type ControlEndpoint } from '@/services/controlHttp';

/** 站点：AGV 导航目标点，id 供指令与状态引用，x/y 为地图平面坐标。 */
export interface Station {
  /** 站点唯一标识（如 'station-1'）。 */
  id: string;
  /** 站点显示名称（如 '工位1'）。 */
  name: string;
  /** 地图平面 X 坐标。 */
  x: number;
  /** 地图平面 Y 坐标。 */
  y: number;
}

/** AGV 状态与控制动作集合；set 开头的方法为本地状态写入，其余为 HTTP 控制请求。 */
export interface AGVState {
  /** AGV 控制连接是否在线（由 WebSocket 推送维护）；离线时所有控制动作被忽略。 */
  isConnected: boolean;
  /** 当前地图平面坐标位置。 */
  position: { x: number; y: number };
  /** 剩余电量百分比（0~100）。 */
  battery: number;
  /** 运行状态：idle 空闲 / moving 移动中 / charging 充电中 / error 故障。 */
  status: 'idle' | 'moving' | 'charging' | 'error';
  /** 当前所在站点 id；null 表示不在任何站点。 */
  currentStation: string | null;
  /** 导航目标站点 id；null 表示当前无导航目标。 */
  targetStation: string | null;
  /** 可选站点列表（当前为前端内置模拟数据）。 */
  stations: Station[];
  /** 更新连接状态（供 realtime 分发层调用）。 */
  setConnected: (connected: boolean) => void;
  /** 更新位置（供 realtime 分发层调用）。 */
  setPosition: (x: number, y: number) => void;
  /** 更新电量（供 realtime 分发层调用）。 */
  setBattery: (battery: number) => void;
  /** 更新运行状态（供 realtime 分发层调用）。 */
  setStatus: (status: AGVState['status']) => void;
  /** 更新当前站点（供 realtime 分发层调用）。 */
  setCurrentStation: (stationId: string | null) => void;
  /** 更新目标站点（供 realtime 分发层调用）。 */
  setTargetStation: (stationId: string | null) => void;
  /** 手动移动：kind 为方向，parameters 中的数值参数直接放入请求体；离线时忽略。 */
  moveManual: (kind: 'forward' | 'backward' | 'left' | 'right', parameters: Record<string, number>) => void;
  /** 导航到指定站点；站点不存在或离线时忽略。 */
  goToStation: (stationId: string) => Promise<void>;
  /** 停止移动。 */
  stop: () => void;
  /** 紧急停止。 */
  emergencyStop: () => void;
  /** 发送回充请求。 */
  recharge: () => void;
}

// 模拟站点数据
const mockStations: Station[] = [
  { id: 'station-1', name: '工位1', x: 80, y: 60 },
  { id: 'station-2', name: '工位2', x: 250, y: 60 },
  { id: 'station-3', name: '工位3', x: 420, y: 60 },
  { id: 'station-4', name: '工位4', x: 80, y: 200 },
  { id: 'station-5', name: '工位5', x: 250, y: 200 },
];

/** 发送 AGV HTTP 控制请求，网络失败时返回 false。 */
const acceptControl = async (endpoint: ControlEndpoint, data: Record<string, unknown>) => {
  try {
    await sendControlRequest(endpoint, data);
    return true;
  } catch {
    return false;
  }
};

export const useAGVStore = create<AGVState>((set, get) => ({
  // 以下初始值均为占位示例；连接建立后由 device.snapshot 全量快照覆盖为真实状态
  isConnected: false,
  position: { x: 80, y: 60 },
  battery: 85,
  status: 'idle',
  currentStation: 'station-1',
  targetStation: null,
  stations: mockStations,

  setConnected: (connected) => set({ isConnected: connected }),
  setPosition: (x, y) => set({ position: { x, y } }),
  setBattery: (battery) => set({ battery }),
  setStatus: (status) => set({ status }),
  setCurrentStation: (currentStation) => set({ currentStation }),
  setTargetStation: (stationId) => set({ targetStation: stationId }),

  moveManual: (kind, parameters) => {
    if (!get().isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.AGV_MOVE, { direction: kind, ...parameters });
  },

  goToStation: async (stationId) => {
    const { isConnected, stations } = get();
    if (!isConnected) return;

    const targetStation = stations.find((s) => s.id === stationId);
    if (!targetStation) return;

    // 本地查表把站点 id 展开为名称与坐标一并下发，后端无需再查站点库
    await acceptControl(CONTROL_ENDPOINT.AGV_GOTO_STATION, {
      stationId,
      stationName: targetStation.name,
      x: targetStation.x,
      y: targetStation.y,
    });
  },

  stop: () => {
    if (!get().isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.AGV_STOP, {});
  },
  emergencyStop: () => {
    if (!get().isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.AGV_EMERGENCY_STOP, {});
  },
  recharge: () => {
    if (!get().isConnected) return;
    void acceptControl(CONTROL_ENDPOINT.AGV_RECHARGE, {});
  },
}));
