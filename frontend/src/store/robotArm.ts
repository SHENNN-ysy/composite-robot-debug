import { create } from 'zustand';

export interface JointState {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
}

export interface CartesianPose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface RobotArmState {
  isConnected: boolean;
  isRunning: boolean;
  joints: JointState;
  tcp: CartesianPose;
  speed: number;
  mode: 'manual' | 'auto';
  coordMode: 'cartesian' | 'joint';
  stepLength: number;
  setConnected: (connected: boolean) => void;
  setRunning: (running: boolean) => void;
  setJoints: (joints: Partial<JointState>) => void;
  setTcp: (tcp: Partial<CartesianPose>) => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: 'manual' | 'auto') => void;
  setCoordMode: (m: 'cartesian' | 'joint') => void;
  setStepLength: (s: number) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  moveJoints: (joints: JointState) => Promise<void>;
  stepAxis: (axis: keyof CartesianPose, delta: number) => void;
  stepJoint: (joint: keyof JointState, delta: number) => void;
  goHome: () => Promise<void>;
  stop: () => void;
}

export const useRobotArmStore = create<RobotArmState>((set, get) => ({
  isConnected: false,
  isRunning: false,
  joints: { j1: 0, j2: -45, j3: 90, j4: 0, j5: 45, j6: 0 },
  tcp: { x: 350.0, y: 0.0, z: 250.0, rx: 180.0, ry: 0.0, rz: 0.0 },
  speed: 30,
  mode: 'manual',
  coordMode: 'cartesian',
  stepLength: 5,

  setConnected: (connected) => set({ isConnected: connected }),
  setRunning: (running) => set({ isRunning: running }),
  setJoints: (joints) =>
    set((state) => ({ joints: { ...state.joints, ...joints } })),
  setTcp: (tcp) =>
    set((state) => ({ tcp: { ...state.tcp, ...tcp } })),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => set({ mode }),
  setCoordMode: (coordMode) => set({ coordMode }),
  setStepLength: (stepLength) => set({ stepLength }),

  connect: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({ isConnected: true });
  },

  disconnect: () => {
    set({ isConnected: false, isRunning: false });
  },

  moveJoints: async (joints) => {
    const { isConnected } = get();
    if (!isConnected) return;
    set({ isRunning: true });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    set({ joints, isRunning: false });
  },

  stepAxis: (axis, delta) => {
    const { tcp, stepLength, isConnected } = get();
    if (!isConnected) return;
    set({
      tcp: { ...tcp, [axis]: +(tcp[axis] + delta * stepLength).toFixed(2) },
    });
  },

  stepJoint: (joint, delta) => {
    const { joints, stepLength, isConnected } = get();
    if (!isConnected) return;
    set({
      joints: { ...joints, [joint]: +(joints[joint] + delta * stepLength).toFixed(2) },
    });
  },

  goHome: async () => {
    const { isConnected } = get();
    if (!isConnected) return;
    set({ isRunning: true });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    set({
      joints: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 },
      isRunning: false,
    });
  },

  stop: () => set({ isRunning: false }),
}));