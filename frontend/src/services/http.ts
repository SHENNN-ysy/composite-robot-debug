/**
 * HTTP 通信层：全局唯一的 axios 实例与统一拦截器。
 *
 * <p>所有前端 → Spring Boot 后端的 REST 请求都经过本实例：
 * 由 Vite 代理把 `/api/**` 转发到后端，再由各业务 API 封装（services/api.ts）调用。</p>
 *
 * <p>本模块负责两件横切的事：</p>
 * <p>1. 请求拦截：从 sessionStorage 取当前登录用户，附加 `X-Operator` 请求头，
 *    供后端记录操作日志（谁改了用户/示教点/程序、谁下发了控制指令）。</p>
 * <p>2. 响应拦截：HTTP 2xx 直接作为成功响应返回；HTTP 4xx/5xx 从
 *    `{code, message}` 错误体中提取可读提示。</p>
 */
import axios from 'axios';
import type { ApiErrorResponse } from '@/types/backend';

/** 当前登录用户在 sessionStorage 中的存储键，登录/登出由 store/auth.ts 读写，与登录态同生命周期（关闭标签页即失效）。 */
export const CURRENT_USER_KEY = 'robot-current-user';

/**
 * 全局 axios 实例：baseURL 固定为 `/api`（开发期由 Vite 代理转发到后端），超时 10 秒。
 */
export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

/**
 * 请求拦截器：为每个请求附加操作人身份。
 *
 * <p>后端各写接口（用户/设备/示教点/程序增删改、HTTP 控制请求）通过 `X-Operator`
 * 请求头识别操作者并写入操作日志；未登录时缺省该头，后端按匿名处理。</p>
 */
http.interceptors.request.use((config) => {
  const stored = sessionStorage.getItem(CURRENT_USER_KEY);
  if (stored) {
    try {
      const user = JSON.parse(stored) as { username?: string };
      if (user.username) config.headers.set('X-Operator', user.username);
    } catch {
      // 存储内容被篡改或格式损坏时清掉脏数据，避免后续每个请求都反复解析失败。
      sessionStorage.removeItem(CURRENT_USER_KEY);
    }
  }
  return config;
});

/**
 * 响应拦截器：按 HTTP 状态判断成败，并把失败响应规范化为可读错误。
 *
 * <p>成功分支（HTTP 2xx）不再检查业务码，直接交给业务 API 解包 data。</p>
 *
 * <p>失败分支（非 2xx 或无响应）：</p>
 * <p>- 后端未启动、断网、超时（没有 response）：Vite 代理会把连接拒绝包装成 HTTP 500，
 *   与真正的服务端 5xx 一起，统一提示“系统繁忙”，不暴露底层连接细节；</p>
 * <p>- HTTP 4xx（如登录凭证错误 400、参数校验失败）：透传后端 ApiErrorResponse 的 `message`，
 *   由页面原样展示。</p>
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // 无响应（后端未启动/断网/超时）或服务端 5xx：统一归为系统繁忙
    const status = error.response?.status as number | undefined;
    if (status === undefined || status >= 500) {
      return Promise.reject(new Error('系统繁忙，请稍后重试'));
    }
    // 4xx：后端 GlobalExceptionHandler 返回 ApiErrorResponse，透传其 message
    const body = error.response?.data as ApiErrorResponse | undefined;
    return Promise.reject(new Error(body?.message || '请求失败，请检查输入'));
  },
);
