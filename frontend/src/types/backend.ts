/**
 * 与 Spring Boot 后端协议对应的类型定义。
 *
 * <p>分三部分：</p>
 * <p>1. REST 统一包装 ApiResponse 与各业务实体（用户/设备/程序/示教点/操作日志），
 *    字段与后端 DTO/数据库表一一对应；</p>
 * <p>2. 传统 HTTP 控制请求的受理回执 ControlCommandResponse；</p>
 * <p>3. WebSocket 推送消息信封 ProtocolMessage（/ws/control 通道，单向推送）。</p>
 */

/** 用户角色：超级管理员 / 管理员 / 技术员 / 普通用户，权限从高到低，后端做鉴权判断。 */
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TECHNICIAN' | 'USER';

/**
 * 后端所有 REST 接口的统一响应包装。
 *
 * <p>该类型只描述 HTTP 2xx 成功响应。成功响应不再携带业务状态码；
 * 请求失败时由 Axios 的错误分支读取 ApiErrorResponse。</p>
 */
export interface ApiResponse<T> {
  /** 业务数据载荷，结构随接口而定。 */
  data: T;
}

/** HTTP 非 2xx 响应中的统一业务错误结构。 */
export interface ApiErrorResponse {
  /** 后端集中定义的业务错误码。 */
  code: string;
  /** 可直接展示给用户的错误信息。 */
  message: string;
}

/** HTTP 控制请求的后端受理结果。 */
export interface ControlCommandResponse {
  /** 本次指令的请求 ID，可用于与后端/机器人侧日志对账。 */
  requestId: string;
  /** 后端记录的语义化命令类型，例如 arm.setMode。 */
  commandType: string;
  /**
   * 受理状态，固定 'ACCEPTED'：只表示后端已完成校验与记录，
   * 不代表控制系统已收到或执行。
   */
  status: 'ACCEPTED';
  /** 受理时间戳（毫秒）。 */
  acceptedAt: number;
}

/** 用户账号（后端 user 表）。 */
export interface UserAccount {
  id: number;
  username: string;
  nickname: string;
  role: UserRole;
  /** 是否启用；禁用账号无法登录。 */
  enabled: boolean;
  /** 是否已设置密码（用于区分初始账号/待重置密码场景）。 */
  passwordSet: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 新建/更新用户的请求体。 */
export interface UserSaveRequest {
  username: string;
  /** 新建时必填；更新时可省略表示不修改密码。 */
  password?: string;
  nickname: string;
  role: UserRole;
  /** 省略时由后端按默认值处理。 */
  enabled?: boolean;
}

/**
 * 设备（后端 device 表）。
 *
 * <p>以 parentId 构成层级：COMPOSITE 是复合机器人整机，
 * 其下挂 ROBOT_ARM（机械臂）与 AGV 两台子设备。</p>
 */
export interface DeviceInfo {
  id: number;
  /** 设备编号，与机器人控制系统中登记的唯一标识对应。 */
  deviceCode: string;
  /** 父设备主键；整机为 null，子设备指向所属整机。 */
  parentId: number | null;
  /** 设备类型：COMPOSITE=复合机器人整机，ROBOT_ARM=机械臂，AGV=移动底盘。 */
  deviceType: 'COMPOSITE' | 'ROBOT_ARM' | 'AGV';
  name: string;
  /** 设备型号，可空。 */
  model: string | null;
  /** 设备自定义配置（JSON 字符串），可空。 */
  configJson: string | null;
  /** 在线状态，由后端按 TCP 连接存活维护，并随 device.online/offline 推送实时刷新。 */
  online: boolean;
  /** 最近一次与机器人控制系统通信的时间，可空（从未通信过）。 */
  lastCommunicationAt: string | null;
}

/**
 * 流程程序（后端 program 表）。
 *
 * <p>同一份程序保存两种形态：flow 用于前端节点编辑器回显/继续编排，
 * luaContent 用于下发机器人控制系统执行。</p>
 */
export interface ProgramInfo {
  id: number;
  name: string;
  /** 拖拽流程 JSON（节点/连线的完整描述），结构由前端编辑器自定义，后端不透明存储。 */
  flow: Record<string, unknown>;
  /** 由流程生成的 Lua 脚本全文。 */
  luaContent: string;
  /** 版本号，每次更新由后端递增。 */
  version: number;
  /** 创建人用户名，可空。 */
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 数据库中的机械臂示教点。 */
export interface TeachPointInfo {
  id: number;
  name: string;
  /** 笛卡尔位姿：位置 x/y/z（毫米）与姿态 rx/ry/rz（度）。 */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** 六关节角 j1~j6（度），与笛卡尔位姿冗余存储，便于按任一种方式回点位。 */
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
}

/** 操作日志记录（后端 operation_log 表），由 X-Operator 头标识的操作人触发。 */
export interface OperationLogRecord {
  id: number;
  /** 操作人用户名（取自请求的 X-Operator 头）。 */
  operatorName: string;
  /** 动作标识，如创建/更新/删除/下发指令。 */
  action: string;
  /** 操作对象类型，如 user / device / teach-point / program。 */
  targetType: string;
  /** 操作对象主键，可空（如列表类操作）。 */
  targetId: string | null;
  /** 操作详情（JSON 字符串，通常为变更前后内容），可空。 */
  detailJson: string | null;
  /** 操作结果（成功/失败及原因）。 */
  result: string;
  createdAt: string;
}

/**
 * WebSocket `/ws/control` 通道的推送消息信封（后端 → 前端单向）。
 *
 * <p>`type` 取值：device.snapshot（连接建立后推送的全量状态快照）、
 * device.online / device.offline（设备上下线）、arm.status（机械臂姿态/关节角/IO）、
 * agv.status（AGV 位置/电量/站点）。payload 的具体结构随 type 而定，本层不做强约束。</p>
 */
export interface ProtocolMessage<T = Record<string, unknown>> {
  /** 协议版本号，便于后续协议演进时前后端兼容。 */
  version: string;
  /** 消息类型，见上；订阅方按它分发到对应的状态处理逻辑。 */
  type: string;
  /** 消息 ID，可空（服务端主动推送通常为 null）。 */
  messageId: string | null;
  /** 服务端发送时间戳（毫秒）。 */
  timestamp: number;
  /** 消息载荷，结构由 type 决定。 */
  payload: T;
}
