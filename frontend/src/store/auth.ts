/**
 * 登录认证状态（Zustand）。
 *
 * <p>业务职责：维护当前登录用户与登录标志，是路由守卫与页面用户信息展示的数据源。
 * 登录成功后把用户对象持久化到 sessionStorage（键 {@link CURRENT_USER_KEY}），
 * 浏览器刷新后可恢复登录态，关闭标签页即失效，符合联调系统"按会话登录"的诉求。
 * services/http.ts 的 axios 请求拦截器读取同一份缓存，为每个 REST 请求
 * 附带 X-Operator 操作人请求头，供后端记录操作日志。</p>
 */
import { create } from 'zustand';
import { authApi } from '@/services/api';
import { CURRENT_USER_KEY } from '@/services/http';
import type { UserAccount } from '@/types/backend';

/** 登录状态与登录/登出动作。 */
interface AuthState {
  /** 是否已登录；初始值取决于 sessionStorage 中是否存在有效的用户缓存。 */
  isAuthenticated: boolean;
  /** 当前登录用户名；未登录时为空字符串。 */
  username: string;
  /** 当前登录用户的完整账号信息（含昵称、角色 role 等）；未登录时为 null。 */
  user: UserAccount | null;
  /** 调用后端 POST /api/auth/login 校验账号密码；成功写入登录态并返回 true，失败抛出带可读提示的 Error（400=用户名或密码错误，5xx/断网=系统繁忙）。 */
  login: (username: string, password: string) => Promise<boolean>;
  /** 清除会话缓存并复位登录态。 */
  logout: () => void;
}

/** 从 sessionStorage 读取并反序列化缓存用户；数据损坏时清除缓存并按未登录处理。 */
const readStoredUser = (): UserAccount | null => {
  try {
    const value = sessionStorage.getItem(CURRENT_USER_KEY);
    return value ? JSON.parse(value) as UserAccount : null;
  } catch {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
};

// 模块加载时读取一次会话缓存作为初始登录态，使刷新页面后无需重新登录
const storedUser = readStoredUser();

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: storedUser !== null,
  username: storedUser?.username ?? '',
  user: storedUser,

  login: async (username: string, password: string) => {
    // POST /api/auth/login；失败时 http 拦截器已把错误规范化为可读文案
    // （400 透传后端“用户名或密码错误”，5xx/断网统一“系统繁忙”），直接向上抛出由页面展示
    const user = await authApi.login(username, password);
    // 先写入 sessionStorage 再更新内存态，保证刷新后两处状态一致
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    set({
      isAuthenticated: true,
      username: user.username,
      user,
    });
    return true;
  },

  logout: () => {
    sessionStorage.removeItem(CURRENT_USER_KEY);
    set({
      isAuthenticated: false,
      username: '',
      user: null,
    });
  },
}));
