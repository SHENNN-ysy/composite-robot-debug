import { create } from 'zustand';

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface AGVState {
  isConnected: boolean;
  position: { x: number; y: number };
  battery: number;
  status: 'idle' | 'moving' | 'charging' | 'error';
  currentStation: string | null;
  targetStation: string | null;
  stations: Station[];
  setConnected: (connected: boolean) => void;
  setPosition: (x: number, y: number) => void;
  setBattery: (battery: number) => void;
  setStatus: (status: AGVState['status']) => void;
  setTargetStation: (stationId: string | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  goToStation: (stationId: string) => Promise<void>;
  stop: () => void;
}

// 模拟工位数据
const mockStations: Station[] = [
  { id: 'station-1', name: '工位1', x: 80, y: 60 },
  { id: 'station-2', name: '工位2', x: 250, y: 60 },
  { id: 'station-3', name: '工位3', x: 420, y: 60 },
  { id: 'station-4', name: '工位4', x: 80, y: 200 },
  { id: 'station-5', name: '工位5', x: 250, y: 200 },
];

export const useAGVStore = create<AGVState>((set, get) => ({
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
  setTargetStation: (stationId) => set({ targetStation: stationId }),

  connect: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({ isConnected: true });
  },

  disconnect: () => {
    set({
      isConnected: false,
      status: 'idle',
      targetStation: null,
    });
  },

  goToStation: async (stationId) => {
    const { isConnected, stations } = get();
    if (!isConnected) return;

    const targetStation = stations.find((s) => s.id === stationId);
    if (!targetStation) return;

    set({ status: 'moving', targetStation: stationId });

    // 模拟移动过程
    const { position } = get();
    const steps = 20;
    const dx = (targetStation.x - position.x) / steps;
    const dy = (targetStation.y - position.y) / steps;

    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      set({
        position: {
          x: position.x + dx * i,
          y: position.y + dy * i,
        },
      });
    }

    set({
      status: 'idle',
      currentStation: stationId,
      targetStation: null,
    });
  },

  stop: () => {
    set({ status: 'idle', targetStation: null });
  },
}));
