/**
 * 前端页面侧操作日志（Zustand）。
 *
 * <p>业务职责：记录页面操作与事件提示（如 AGV 手动控制、流程编排的增删改、
 * 流程执行请求受理结果等），供首页与流程编辑器的日志面板滚动展示。
 * 数据仅保存在内存中、最多保留 100 条，刷新页面即清空；
 * 需要持久化的操作/设备/命令日志由后端日志接口提供，不在本模块范围。</p>
 */
import { create } from 'zustand';

/** 一条页面日志记录。 */
export interface LogEntry {
  /** 随机生成的条目 id，用作列表渲染 key。 */
  id: string;
  /** 记录时间（zh-CN 的 HH:mm:ss 格式，24 小时制）。 */
  time: string;
  /** 级别：info 普通操作 / warn 警示（如急停、暂停）/ error 错误。 */
  level: 'info' | 'warn' | 'error';
  /** 日志内容文本。 */
  message: string;
}

/** 日志列表状态与写入/清空动作。 */
interface LogState {
  /** 日志条目列表，最新一条在最前，最多保留 100 条。 */
  logs: LogEntry[];
  /** 追加一条日志（自动补 id 与时间），超出 100 条时丢弃最旧记录。 */
  addLog: (level: LogEntry['level'], message: string) => void;
  /** 清空全部日志。 */
  clearLogs: () => void;
}

/** 生成短随机 id（仅用于前端列表 key，无唯一性强约束）。 */
const generateId = () => Math.random().toString(36).substring(2, 9);

/** 取当前时间的 HH:mm:ss 文本（24 小时制）。 */
const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const useLogStore = create<LogState>((set) => ({
  logs: [],

  addLog: (level, message) => {
    set((state) => ({
      logs: [
        {
          id: generateId(),
          time: formatTime(),
          level,
          message,
        },
        // 新条目插到队首，日志面板按"最新在上"展示
        ...state.logs,
      ].slice(0, 100), // 最多保留100条
    }));
  },

  clearLogs: () => set({ logs: [] }),
}));
