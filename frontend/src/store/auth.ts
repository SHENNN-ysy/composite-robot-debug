import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// 模拟用户数据
const mockUsers = [
  { username: 'admin', password: 'admin123', token: 'mock-token-001' },
  { username: 'user', password: 'user123', token: 'mock-token-002' },
];

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  username: '',
  token: null,

  login: async (username: string, password: string) => {
    // 模拟登录验证
    await new Promise((resolve) => setTimeout(resolve, 500));

    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      set({
        isAuthenticated: true,
        username: user.username,
        token: user.token,
      });
      return true;
    }

    return false;
  },

  logout: () => {
    set({
      isAuthenticated: false,
      username: '',
      token: null,
    });
  },
}));
