/**
 * 按业务域划分的后端 REST API 封装。
 *
 * <p>覆盖的业务域：登录认证（auth）、传统 HTTP 控制接口（control）、账号管理（users）、
 * 设备管理（devices）、流程程序管理（programs）、示教点管理（teach-points）、操作日志（logs）。</p>
 *
 * <p>所有接口共用约定：</p>
 * <p>- 路径前缀 `/api` 已由 http 实例的 baseURL 提供，这里只写相对路径；</p>
 * <p>- 后端成功响应为 `ApiResponse<T> = {data}`，HTTP 错误已被
 *   http.ts 的响应拦截器转成异常，本层只负责取出 `data` 字段返回给页面；</p>
 * <p>- 写操作会自动携带 `X-Operator` 头（见 http.ts 请求拦截器）供后端记录操作日志。</p>
 */
import { http } from './http';
import type {
  ApiResponse,
  ControlCommandResponse,
  DeviceInfo,
  OperationLogRecord,
  ProgramInfo,
  TeachPointInfo,
  UserAccount,
  UserSaveRequest,
} from '@/types/backend';

/** 从成功响应包装体中取出业务数据，屏蔽 `{data}` 结构对上层的影响。 */
const data = <T>(response: { data: ApiResponse<T> }) => response.data.data;

/**
 * 登录认证。
 *
 * <p>注意：本系统没有 token 会话机制，登录成功后前端仅把用户信息存入
 * sessionStorage（见 store/auth.ts），后续请求靠 `X-Operator` 头声明身份。</p>
 */
export const authApi = {
  /** POST /api/auth/login —— 用户名密码登录，成功返回账号信息（含角色/启用状态）。 */
  login: async (username: string, password: string) =>
    data(await http.post<ApiResponse<UserAccount>>('/auth/login', { username, password })),
};

/**
 * 机器人控制 HTTP 接口。
 *
 * <p>调用方传入具体动作地址，请求体直接使用该动作的业务参数，不附加 cmd/data 信封。
 * 返回值仅表示后端已经受理和记录请求，不代表控制系统已经执行。</p>
 */
export const controlApi = {
  /** 向具体语义化控制地址发送 POST 请求。 */
  execute: async (endpoint: string, commandData: Record<string, unknown>) =>
    data(await http.post<ApiResponse<ControlCommandResponse>>(endpoint, commandData)),
};

/** 账号管理（用户增删改查），对应后端 UserController。 */
export const userApi = {
  /** GET /api/users —— 查询全部用户账号。 */
  list: async () => data(await http.get<ApiResponse<UserAccount[]>>('/users')),
  /** POST /api/users —— 新建用户，返回创建后的账号信息。 */
  create: async (request: UserSaveRequest) =>
    data(await http.post<ApiResponse<UserAccount>>('/users', request)),
  /** PUT /api/users/{id} —— 按主键更新用户（支持局部字段，如只改昵称/角色/启用状态/重置密码）。 */
  update: async (id: number, request: Partial<UserSaveRequest>) =>
    data(await http.put<ApiResponse<UserAccount>>(`/users/${id}`, request)),
  /** DELETE /api/users/{id} —— 删除用户，无返回体。 */
  remove: async (id: number) => { await http.delete(`/users/${id}`); },
};

/**
 * 设备管理，对应后端 DeviceController。
 *
 * <p>设备指复合机器人整机（COMPOSITE）及其下挂的机械臂（ROBOT_ARM）、AGV；
 * 在线状态由后端根据 TCP 连接维护，前端这里只做查询与基础信息维护。</p>
 */
export const deviceApi = {
  /** GET /api/devices —— 查询全部设备（含 deviceType、parentId 层级、online 在线状态、最近通信时间）。 */
  list: async () => data(await http.get<ApiResponse<DeviceInfo[]>>('/devices')),
  /** PUT /api/devices/{id} —— 更新设备基础信息（编号/名称/型号/配置 JSON），不支持改层级与类型。 */
  update: async (id: number, request: Partial<Pick<DeviceInfo, 'deviceCode' | 'name' | 'model' | 'configJson'>>) =>
    data(await http.put<ApiResponse<DeviceInfo>>(`/devices/${id}`, request)),
};

/**
 * 流程程序管理，对应后端 ProgramController。
 *
 * <p>一个程序同时保存两份内容：`flow` 是节点编辑器拖拽出的流程 JSON（用于回显编辑），
 * `luaContent` 是由流程生成的 Lua 脚本（用于下发机器人执行）。</p>
 */
export const programApi = {
  /** GET /api/programs —— 查询全部已保存程序（含版本号 version）。 */
  list: async () => data(await http.get<ApiResponse<ProgramInfo[]>>('/programs')),
  /** POST /api/programs —— 新建程序，同时提交流程 JSON 与 Lua 脚本。 */
  create: async (request: { name: string; flow: Record<string, unknown>; luaContent: string; createdBy?: string }) =>
    data(await http.post<ApiResponse<ProgramInfo>>('/programs', request)),
  /** PUT /api/programs/{id} —— 覆盖更新程序内容，后端递增版本号。 */
  update: async (id: number, request: { name: string; flow: Record<string, unknown>; luaContent: string; createdBy?: string }) =>
    data(await http.put<ApiResponse<ProgramInfo>>(`/programs/${id}`, request)),
  /** DELETE /api/programs/{id} —— 删除程序，无返回体。 */
  remove: async (id: number) => { await http.delete(`/programs/${id}`); },
};

/** 示教点保存时由数据库生成主键。 */
type TeachPointSaveRequest = Omit<TeachPointInfo, 'id'>;

/**
 * 机械臂示教点管理，对应后端 TeachPointController。
 *
 * <p>示教点同时记录笛卡尔位姿（x/y/z/rx/ry/rz）与六关节角（j1~j6），
 * 供示教、回点位（ARM_GOTO_TEACH_POINT）与流程编排引用。</p>
 */
export const teachPointApi = {
  /** GET /api/teach-points —— 查询全部示教点。 */
  list: async () => data(await http.get<ApiResponse<TeachPointInfo[]>>('/teach-points')),
  /** POST /api/teach-points —— 新建示教点，主键 id 由后端生成并随结果返回。 */
  create: async (request: TeachPointSaveRequest) =>
    data(await http.post<ApiResponse<TeachPointInfo>>('/teach-points', request)),
  /** PUT /api/teach-points/{id} —— 按主键整体更新示教点位姿/关节角。 */
  update: async (id: number, request: TeachPointSaveRequest) =>
    data(await http.put<ApiResponse<TeachPointInfo>>(`/teach-points/${id}`, request)),
  /** DELETE /api/teach-points/{id} —— 删除示教点，无返回体。 */
  remove: async (id: number) => { await http.delete(`/teach-points/${id}`); },
};

/** 日志查询，对应后端日志接口。 */
export const logApi = {
  /** GET /api/logs/operations —— 查询操作日志（谁、何时、对什么对象、做了什么、结果如何）。 */
  operations: async () => data(await http.get<ApiResponse<OperationLogRecord[]>>('/logs/operations')),
};
