/**
 * 设备状态 WebSocket 连接管理（模块级单例）。
 *
 * <p>通道语义：前端连接后端 `/ws/control`，这是<b>单向</b>状态推送通道——
 * 后端把机械臂姿态/关节角/IO、AGV 位置/电量/站点、设备上下线推给前端，
 * 前端不通过它发送任何控制命令（控制走 services/controlHttp.ts 的独立 HTTP POST 接口）。</p>
 *
 * <p>推送的消息类型：device.snapshot（连接建立后先收到的全量状态快照）、
 * device.online / device.offline（设备上下线）、arm.status（机械臂实时状态）、
 * agv.status（AGV 实时状态）。消息结构见 types/backend.ts 的 ProtocolMessage。</p>
 *
 * <p>本模块职责：维护全局唯一连接、断线自动重连（固定 2 秒间隔）、
 * 以及面向各页面/store 的订阅-分发（消息订阅与连接状态订阅分开）。</p>
 */
import type { ProtocolMessage } from '@/types/backend';

/** 消息订阅者：收到任何一条服务端推送都会被回调。 */
type Listener = (message: ProtocolMessage) => void;
/** 连接状态订阅者：连接建立（true）或断开（false）时被回调。 */
type ConnectionListener = (connected: boolean) => void;

// —— 模块级状态：全应用共享一条连接，避免每个页面各开一条 WebSocket ——
const messageListeners = new Set<Listener>();
const connectionListeners = new Set<ConnectionListener>();
let socket: WebSocket | null = null;
/** 待执行的重连定时器；非 null 也表示“已安排了一次重连”，用于防止重复排程。 */
let reconnectTimer: number | null = null;
/**
 * 是否为用户主动关闭：区分“页面登出/卸载时的有意断开”与“网络抖动掉线”，
 * 只有后者才允许自动重连，否则 closeControlSocket 后 onclose 又会把连接拉起来。
 */
let manuallyClosed = false;

/**
 * 由当前页面地址推导 WebSocket URL：与页面同源同端口，
 * 开发期走 Vite 代理、生产期走 nginx 反代，无需单独配置后端地址；
 * https 页面自动升级为 wss。
 */
const websocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/control`;
};

const notifyConnection = (connected: boolean) => {
  connectionListeners.forEach((listener) => listener(connected));
};

/**
 * 安排 2 秒后重连。
 *
 * <p>手动关闭或已有一次重连在排队时直接返回，保证同一时刻最多一个重连定时器，
 * 避免连续掉线时定时器叠加、连接被并发创建。</p>
 */
const scheduleReconnect = () => {
  if (manuallyClosed || reconnectTimer !== null) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectControlSocket();
  }, 2000);
};

/**
 * 建立（或复用）控制 WebSocket 连接。
 *
 * <p>重复调用是安全的：已有 OPEN/CONNECTING 中的连接时直接返回；
 * 每次调用都会清除“手动关闭”标记，因此它也充当掉线后的重连入口。</p>
 */
export function connectControlSocket() {
  manuallyClosed = false;
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
  socket = new WebSocket(websocketUrl());
  socket.onopen = () => {
    notifyConnection(true);
  };
  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as ProtocolMessage;
      messageListeners.forEach((listener) => listener(parsed));
    } catch {
      // 丢弃无法解析的服务端消息。
    }
  };
  socket.onclose = () => {
    // 无论因何关闭都先广播离线，再视情况重连：手动关闭时 scheduleReconnect 内部会拦截。
    socket = null;
    notifyConnection(false);
    scheduleReconnect();
  };
  // 出错时不直接处理，统一走 close() → onclose 路径，让断线逻辑只有一处（广播离线 + 重连）。
  socket.onerror = () => socket?.close();
}

/**
 * 主动关闭连接并停止一切重连。
 *
 * <p>与异常掉线的区别就在于先把 manuallyClosed 置 true 并清掉已排队的重连定时器，
 * 使随后的 onclose 回调不再触发自动重连。</p>
 */
export function closeControlSocket() {
  manuallyClosed = true;
  if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
  socket?.close();
  socket = null;
}

/**
 * 订阅服务端推送消息（device.snapshot / arm.status / agv.status / 上下线等）。
 * 返回取消订阅函数，供 useEffect 清理时调用，防止组件卸载后回调泄漏。
 */
export function subscribeControlMessages(listener: Listener) {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}

/**
 * 订阅连接状态变化（true=已连接，false=已断开）。
 * 返回取消订阅函数，供 useEffect 清理时调用。
 */
export function subscribeControlConnection(listener: ConnectionListener) {
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}
