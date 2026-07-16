import { create } from 'zustand';

export interface LogEntry {
  id: string;
  time: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface LogState {
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string) => void;
  clearLogs: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

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
        ...state.logs,
      ].slice(0, 100), // 最多保留100条
    }));
  },

  clearLogs: () => set({ logs: [] }),
}));
