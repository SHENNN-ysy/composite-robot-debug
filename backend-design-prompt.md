# 复合机器人后端系统设计提示词

你是一名资深后端架构师兼 Java 工程师。请为一个"复合机器人控制系统"设计并实现一套生产级后端服务。系统需要同时支持：设备/日志/用户等业务持久化、与前端实时双向通信、与底层机器人控制系统的工业协议对接。下面是你必须遵循的完整规范，请严格按此执行。

---

## 1. 业务背景与目标

### 1.1 系统定位
本系统是复合机器人（机械臂 + AGV 一体化）的统一控制与运营平台后端，处于中间层：
- **上层**：前端 Web 应用（React + AntD，已存在），提供可视化操作界面
- **本系统**：核心业务服务，负责数据持久化、权限控制、设备管理、流程编排、状态聚合、指令路由
- **下层**：复合机器人本体控制系统（运行在设备端/边缘网关），负责运动控制、传感器采集、安全保护

### 1.2 核心功能模块（必须覆盖）
1. **用户与权限**：登录、注销、JWT 鉴权、RBAC（管理员/操作员/观察者三级）
2. **设备管理**：机械臂、AGV、复合机器人三类设备的注册、配置、心跳、上下线、参数下发
3. **实时控制**：前端通过 WebSocket 发送运动指令（关节角、位姿、AGV 路径点）、抓取指令、停止/急停
4. **状态推送**：后端通过 WebSocket 把设备实时状态（位置、电量、速度、报警、传感器）推给前端，频率 ≥10Hz
5. **程序/流程编排**：保存用户通过节点编辑器编排的程序（JSON 描述），支持下发执行、暂停、恢复、停止
6. **日志系统**：操作日志（谁、什么时间、对哪个设备、做了什么）、运行日志（设备上报）、报警日志（分级：info/warn/error/critical）
7. **数据可视化支撑**：提供历史状态查询接口（用于前端画曲线/热力图），支持时间范围、字段聚合
8. **报警与事件**：设备报警实时上推到前端，支持确认、清除、查询
9. **多设备并发**：必须能同时管理 ≥10 台设备，每台设备独立通道，互不干扰
10. **断线重连**：网络抖动/设备重启后，后端能自动重连并恢复上下文，前端能自动重订阅

### 1.3 非功能性要求（硬指标）
- **可用性**：7×24，关键链路故障恢复时间 < 30s
- **实时性**：控制指令端到端延迟 < 200ms（局域网），状态推送延迟 < 100ms
- **吞吐**：单实例支持 10+ 设备并发、100+ WebSocket 客户端同时在线
- **可靠性**：关键指令（急停）必须可靠送达（至少一次 + ACK 超时重试）
- **安全性**：JWT + RBAC + 接口防重放 + TCP 链路白名单
- **可观测**：全链路 traceId、结构化日志、关键指标（设备在线数、消息堆积、延迟分位数）

---

## 2. 技术栈强制约束

| 维度 | 选型 | 理由 |
|---|---|---|
| 语言 | **Java 17+**（推荐 21 LTS） | 用户指定 |
| 框架 | **Spring Boot 3.2+** | 与 Java 17/21 适配、生态完善 |
| 持久化 | **MySQL 8.0+**，MyBatis-Plus 3.5+ | 用户指定，MP 简化 CRUD |
| 连接池 | **HikariCP**（Spring Boot 默认） | 高性能 |
| 迁移 | **Flyway** | 版本化 schema |
| WebSocket | **Spring WebFlux + Reactor Netty**（推荐）或 Spring MVC + WebSocket | 高并发场景推荐响应式 |
| TCP 服务端 | **Netty 4.1+**（必须用 Netty，不要用阻塞 IO） | 用户要求做 TCP 服务端 |
| JSON | **Jackson** | Spring Boot 默认 |
| 校验 | jakarta.validation + Hibernate Validator | |
| 安全 | Spring Security 6 + jjwt 0.12+ | |
| 缓存 | Caffeine（本地） | 热点数据/会话 |
| 消息总线 | Spring ApplicationEvent（进程内）+ 可选 Redis Pub/Sub（集群） | |
| 文档 | springdoc-openapi 2.x（Swagger UI） | |
| 日志 | Logback + MDC（traceId） | |
| 测试 | JUnit 5 + Mockito + Testcontainers（MySQL/Redis） | |
| 监控 | Spring Boot Actuator + Micrometer + Prometheus | |
| 构建 | Maven 3.9+ | |
| 容器 | Dockerfile（多阶段构建，eclipse-temurin:21-jre 基础镜像） | |

**禁止使用**：阻塞 IO 做 TCP 服务端、Servlet 同步 WebSocket、Spring Cloud 全家桶（本系统单体即可）、Hibernate（用 MyBatis-Plus）。

---

## 3. 系统架构设计

### 3.1 分层架构
```
┌─────────────────────────────────────────────────────────┐
│ Interface Layer  (REST Controller / WebSocket Handler)  │
├─────────────────────────────────────────────────────────┤
│ Application Layer  (Application Service / 编排)         │
├─────────────────────────────────────────────────────────┤
│ Domain Layer     (领域模型 / 领域服务 / 业务规则)        │
├─────────────────────────────────────────────────────────┤
│ Infrastructure   (MyBatis Mapper / Netty Client / Redis) │
└─────────────────────────────────────────────────────────┘
```
包结构参考：
```
com.example.robot
├── RobotApplication.java
├── interfaces
│   ├── rest        # @RestController，DTO 用 record
│   ├── websocket   # WS Handler / Session 管理
│   └── tcp         # Netty Server Bootstrap / ChannelHandler
├── application
│   ├── auth        # 登录、JWT
│   ├── device      # 设备应用服务
│   ├── control     # 控制指令应用服务
│   ├── program     # 程序编排应用服务
│   └── log         # 日志应用服务
├── domain
│   ├── model       # 实体（PO，充血模型轻量化）
│   ├── service     # 领域服务
│   └── event       # 领域事件
├── infrastructure
│   ├── persistence # MyBatis Mapper / Repository 实现
│   ├── tcp         # 协议编解码、客户端会话
│   ├── cache       # Caffeine
│   └── config      # 配置类
└── common
    ├── error       # 统一异常体系
    ├── result      # 统一响应包装
    └── util
```

### 3.2 三条核心通信链路

#### 链路 A：前端 ↔ 后端（REST）
- 用途：登录、设备 CRUD、程序保存、日志查询、历史数据查询
- 协议：HTTP/1.1 + JSON
- 鉴权：除 `/api/auth/**`、`/actuator/health` 外全部需 `Authorization: Bearer <jwt>`
- 响应统一格式：`{ code, message, data, traceId }`，业务码用 200 表示成功，其余按业务码表

#### 链路 B：前端 ↔ 后端（WebSocket）
- 端点：`/ws/control`（需 JWT 鉴权，token 通过 `?token=...` 或首条消息传递）
- 双向消息：JSON 文本帧，定义统一信封：
  ```json
  {
    "type": "control_command | status_update | alarm | subscribe | ack",
    "id": "uuid（幂等/去重用）",
    "ts": 1719000000000,
    "payload": { ... }
  }
  ```
- 订阅模式：前端按 `deviceId` 订阅状态，支持批量订阅
- 心跳：服务端每 30s ping，超时 60s 断开

#### 链路 C：后端 ↔ 机器人控制（TCP）
- 后端作为 **TCP Server**，监听 0.0.0.0:9000（可配置）
- 使用 Netty，自定义私有协议（二进制帧）
- 帧格式（建议）：
  ```
  ┌────────┬────────┬────────┬──────────┬──────────┬────────┬──────────┐
  │ 魔数2B │ 版本1B │ 类型1B │ 长度4B    │ 设备ID16B│ 序列号4B│ payload  │
  │ 0xCAFE │ 0x01   │ cmd/ack│ big-endian│ utf-8    │         │ json     │
  └────────┴────────┴────────┴──────────┴──────────┴────────┴──────────┘
  ```
- 类型字段：上行（设备→后端）= heartbeat/status/ack/event；下行（后端→设备）= command/stop/program/reboot
- 长连接保活：心跳 5s，超时 3 次断开
- ACK 机制：所有写指令需 ACK，含序列号，超时 1s/2s/5s 重试，超过最大次数标记设备故障

### 3.3 关键流程
1. **登录**：POST /api/auth/login → 校验密码（BCrypt） → 颁发 JWT（access 2h + refresh 7d）→ 记录登录日志
2. **设备注册**：管理员调用 REST 接口录入设备 → 写入 MySQL → TCP Server 接受连接 → 校验设备 ID 白名单 → 握手通过后进入在线状态 → 触发事件，前端 WS 收到 device_online
3. **控制下发**：前端 WS 发送 control_command → 后端应用服务校验权限 → 通过 TCP 发送到机器人 → 等待 ACK → 收到 ACK 后回前端 ack → 收到执行结果后回前端 status_update / event
4. **状态推送**：TCP Server 收到设备 status 帧 → 解析 → 通过进程内事件总线 → WebSessionManager 广播给订阅了该 deviceId 的所有前端 WS 会话
5. **急停**：前端通过专用 WS 消息 `type: emergency_stop` → 后端不校验设备在线状态（即使离线也写入数据库待恢复后下发）→ TCP 紧急帧（最高优先级）→ ACK 后回前端

---

## 4. 数据模型设计（MySQL DDL）

至少包含以下表，给出字段、类型、约束、索引建议（Flyway 迁移文件命名 `V1__init.sql` 等）：

### 4.1 用户与权限
- `sys_user`：id, username(uniq), password_hash, nickname, email, phone, status(0/1), last_login_at, created_at, updated_at, deleted(soft)
- `sys_role`：id, code(admin/operator/viewer), name, description
- `sys_user_role`：user_id, role_id（联合主键）
- `sys_permission`：id, code, name, type(menu/button/api), path

### 4.2 设备
- `device`：id, device_id(uniq, 业务编号如 RBT-001), device_type(arm/agv/composite), name, model, ip, mac, firmware_version, status(online/offline/error/unknown), last_heartbeat_at, registered_at, created_by, created_at, updated_at, deleted
- `device_param`：id, device_id, param_key, param_value(json), description（设备参数动态配置）
- `device_alarm`：id, device_id, level(info/warn/error/critical), code, message, occurred_at, acked(0/1), acked_by, acked_at

### 4.3 程序与流程
- `program`：id, name, description, content(json, 节点编辑器产物), version, status(draft/published/running/archived), created_by, created_at, updated_at, deleted
- `program_execution`：id, program_id, device_id, status(queued/running/paused/succeeded/failed/aborted), started_at, finished_at, error_message, operator_id

### 4.4 日志
- `operation_log`：id, user_id, username, action, resource_type, resource_id, request_ip, user_agent, detail(json), cost_ms, status, created_at
- `device_log`：id, device_id, level, source(control/system/sensor), message, payload(json), created_at
- `alarm_log`：复用 device_alarm 表 + 历史归档表 `alarm_log_archive`

### 4.5 系统
- `sys_login_log`：id, user_id, username, ip, user_agent, status(success/fail), message, created_at
- `sys_config`：id, config_key(uniq), config_value, description

**索引要点**：
- `device(device_id)`、`device(status, last_heartbeat_at)`、`device_log(device_id, created_at DESC)`、`operation_log(user_id, created_at DESC)`、`device_alarm(device_id, acked, occurred_at DESC)`、`program_execution(device_id, started_at DESC)`

---

## 5. REST API 设计规范

### 5.1 通用约定
- 路径前缀：`/api`
- 版本：URL 中不带版本（用 Header 演进），或 `/api/v1`
- 鉴权：除显式声明外全部需要 JWT
- 分页参数：`?page=1&size=20&sort=field,desc`
- 时间格式：ISO-8601 字符串（Jackson 配置）
- 字段命名：JSON 用 camelCase，DB 用 snake_case（MyBatis-Plus mapUnderscoreToCamelCase）

### 5.2 主要端点（必须实现）
```
POST   /api/auth/login                 # 登录，返回 access + refresh
POST   /api/auth/refresh               # 刷新 token
POST   /api/auth/logout                # 注销

GET    /api/devices                    # 分页/筛选设备列表
POST   /api/devices                    # 新增设备（管理员）
GET    /api/devices/{deviceId}         # 设备详情
PUT    /api/devices/{deviceId}         # 更新
DELETE /api/devices/{deviceId}         # 软删
POST   /api/devices/{deviceId}/reboot  # 远程重启

GET    /api/devices/{deviceId}/status  # 最新状态
GET    /api/devices/{deviceId}/history # 历史状态（时间范围查询）

POST   /api/programs                   # 创建程序
GET    /api/programs                   # 分页列表
GET    /api/programs/{id}              # 详情
PUT    /api/programs/{id}              # 更新
DELETE /api/programs/{id}              # 删除
POST   /api/programs/{id}/publish      # 发布（生成新版本）

POST   /api/executions                 # 启动执行：program_id + device_id
GET    /api/executions                 # 列表
GET    /api/executions/{id}            # 详情
POST   /api/executions/{id}/pause      # 暂停
POST   /api/executions/{id}/resume     # 恢复
POST   /api/executions/{id}/abort      # 终止

GET    /api/logs/operation             # 操作日志
GET    /api/logs/device                # 设备日志
GET    /api/alarms                     # 报警列表
POST   /api/alarms/{id}/ack            # 确认报警
```

### 5.3 错误码
- 200 成功
- 400 参数错误
- 401 未登录
- 403 无权限
- 404 资源不存在
- 409 状态冲突（如重复操作）
- 500 内部错误
- 503 下游不可用

---

## 6. WebSocket 协议设计

### 6.1 会话与订阅
- 客户端连上后第一帧必须是 `subscribe`，包含 `deviceIds: []`，可订阅多个
- 服务端维护 `Map<deviceId, Set<WebSocketSession>>`，状态更新时广播
- 单客户端断线不影响其他客户端

### 6.2 消息类型枚举（双向）
| type | 方向 | 说明 |
|---|---|---|
| `subscribe` | C→S | 订阅 |
| `unsubscribe` | C→S | 取消订阅 |
| `control_command` | C→S | 控制指令（move/grab/release/stop/...） |
| `emergency_stop` | C→S | 急停（最高优先级） |
| `program_command` | C→S | 程序执行/暂停/恢复/停止 |
| `status_update` | S→C | 状态推送 |
| `alarm` | S→C | 报警推送 |
| `device_online` / `device_offline` | S→C | 设备上下线 |
| `ack` | 双向 | 应答 |

### 6.3 关键实现要点
- 使用 `ChannelGroup` 或自定义 SessionManager
- 消息发送使用独立 EventLoop 线程，避免阻塞业务
- 序列化用 Jackson ObjectMapper 复用单例
- 消息大小限制 1MB，文本帧

---

## 7. TCP 协议实现要点（Netty）

### 7.1 Pipeline 顺序
```
frameDecoder(自定义) → protocolDecoder → businessHandler → exceptionHandler
```
上行：`frameDecoder → protocolDecoder → IdleStateHandler(读空闲30s) → HeartbeatHandler → DeviceMessageHandler`
下行：`DeviceOutboundHandler → protocolEncoder`

### 7.2 必须实现的 Handler
- `FrameDecoder`：解析魔数+长度，校验半包/粘包
- `ProtocolDecoder`：JSON payload 反序列化
- `HeartbeatHandler`：读空闲超时发心跳包，超过 N 次关闭
- `AuthHandler`：新连接首帧必须是 register，校验 deviceId 白名单
- `DeviceMessageHandler`：处理 status/heartbeat/ack/event
- `DeviceSessionManager`：维护 deviceId ↔ Channel，channel attr 关联

### 7.3 下行发送
- `CommandDispatcher` 根据设备 ID 找到 Channel，发送指令帧（带序列号）
- `AckWaiter` 维护 `Map<seq, SettableFuture<Void>>`，超时重试 3 次

---

## 8. 安全设计

- 密码 BCrypt（cost=10）
- JWT：HS256，access 2h，refresh 7d，refresh 只能换 access 不换 refresh
- WS 握手用 token 参数，握手成功后绑定 sessionId ↔ userId
- TCP 设备鉴权：首帧 `register` 带 deviceId + pre-shared key（从配置/DB 读取）
- 接口防重放：写接口要求 `Idempotency-Key` 头（24h 内唯一）
- 敏感配置（数据库密码、JWT 密钥、设备密钥）从环境变量读取，**禁止硬编码**
- RBAC 用 `@PreAuthorize("hasRole('ADMIN')")`
- 限流：登录接口 IP 限流（Bucket4j 或 Guava RateLimiter）

---

## 9. 可观测性

- 每个请求生成 `traceId`（UUID），放入 MDC，贯穿日志
- 日志格式：`%d{ISO8601} [%thread] %-5level [traceId=%X{traceId}] %logger{36} - %msg%n`
- Actuator 暴露 `/actuator/health`、`/actuator/info`、`/actuator/prometheus`
- 自定义指标：`device.online.count`、`device.offline.count`、`tcp.session.count`、`ws.session.count`、`control.command.latency`、`control.command.failure.rate`
- 关键告警：设备离线 > 5min、急停事件、指令失败率 > 阈值、数据库连接池等待 > 阈值

---

## 10. 部署与交付

### 10.1 交付物清单
1. 完整可运行的 Maven 工程（pom.xml + 源码）
2. `README.md`：架构图、技术栈、本地启动步骤、配置项说明
3. `application.yml` 默认配置 + `application-dev.yml` / `application-prod.yml`
4. Docker Compose：一键拉起 MySQL + Redis（可选）+ 后端
5. Dockerfile：多阶段构建，最终镜像 < 300MB
6. Flyway 迁移脚本：`V1__init_schema.sql`、`V2__seed_data.sql`
7. OpenAPI 文档（Swagger UI）：`/swagger-ui.html`
8. Postman / Apifox 接口集合
9. WebSocket 联调脚本（wscat 示例）
10. 关键单元测试（服务层核心业务 ≥ 80% 覆盖）
11. 架构图（PlantUML 或 Mermaid）

### 10.2 配置项示例
```yaml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:3306/robot?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: ${DB_USER:root}
    password: ${DB_PASS:root}
    hikari:
      maximum-pool-size: 20
  flyway:
    enabled: true
    locations: classpath:db/migration

jwt:
  secret: ${JWT_SECRET:please-change-me-in-prod-with-32bytes-min}
  access-expire: 7200
  refresh-expire: 604800

tcp:
  server:
    host: 0.0.0.0
    port: 9000
  heartbeat:
    interval: 5
    timeout: 3
  ack:
    retry-max: 3
    timeout-ms: 1000

websocket:
  path: /ws/control
  heartbeat: 30
  max-message-size: 1048576
```

---

## 11. 实施步骤（请按此顺序交付）

1. **阶段一：工程骨架**
   - 创建 Spring Boot 工程、配 pom、application.yml、基础包结构
   - Flyway 初始化全部表 + 种子数据（admin/admin123、默认角色、设备示例）
   - 统一响应/异常/日志/traceId 组件

2. **阶段二：基础设施**
   - JWT 工具 + Security 配置
   - WebSocket 配置（Netty/Reactor）
   - TCP Server（Netty）+ 自定义协议编解码
   - 设备会话管理（TCP session + WS session）

3. **阶段三：核心业务**
   - 设备模块：CRUD、心跳更新、上下线事件
   - 控制模块：指令下发、ACK、重试
   - 程序模块：CRUD、执行生命周期
   - 日志模块：操作日志（注解+AOP）、设备日志、报警

4. **阶段四：API 与 WS**
   - 全部 REST 接口（Controller + DTO + Service + Mapper）
   - WS Handler 实现 subscribe/control/ack/status_push
   - OpenAPI 注解

5. **阶段五：质量与可观测**
   - 单元测试
   - Actuator + Prometheus 指标
   - 全局异常处理
   - Dockerfile + docker-compose.yml

6. **阶段六：文档**
   - README + 架构图 + 接口示例 + WS 消息示例 + 协议文档

---

## 12. 必须遵守的工程实践

- **代码风格**：Google Java Style 或 Alibaba P3C（建议 P3C + spotless 插件）
- **DTO 用 Java 17 record**，不要用 Lombok @Data（除非团队一致同意）
- **事务边界在 Application Service**，Mapper 不写事务
- **禁止在 Controller 写业务逻辑**，只做参数校验和组装
- **领域异常 vs 系统异常**：业务异常用 `BizException` + `ErrorCode`，框架异常全局捕获
- **空值**：返回空集合而非 null；Optional 用于返回值
- **日志**：INFO 记录关键业务节点，DEBUG 记录详细上下文，ERROR 带堆栈；禁止在循环里打日志
- **测试**：Service 单测用 Mockito；Mapper 用 @MybatisTest + H2 或 Testcontainers MySQL
- **依赖管理**：所有第三方库写明版本号，禁止使用 `*` 或 `RELEASE`

---

## 13. 交付要求

请按上述规范生成完整代码，不要省略关键实现。完成后请提供：

1. 完整文件树清单
2. 各模块核心代码（带注释）
3. 启动命令（本地 + Docker）
4. 接口调用示例（curl / wscat）
5. 已知限制与后续可扩展点（如集群部署、Redis 替代进程内事件总线）

如果某处设计有多种合理方案，请在实现前用一段话对比说明并选定一种，标注理由。

**现在请开始阶段一的实现。**
