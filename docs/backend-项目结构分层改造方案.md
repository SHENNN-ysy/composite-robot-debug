# backend 项目结构分层改造方案

参考目标结构（截图项目 `agent.evaluation` 的分层风格）对 `backend` 进行包结构改造。
本文档只描述结构与文件归属，不改变任何业务逻辑、接口契约和数据库表结构。

## 一、参考结构的特点

```
com.xxx.evaluation
├── ApplicationLoader              # 启动类，直接放根包
├── application                    # 应用层（业务核心）
│   ├── constants                  # 常量
│   ├── converter                  # DTO / Entity 转换器
│   ├── enums                      # 枚举
│   ├── model                      # 数据模型
│   ├── repository                 # 持久化接口
│   ├── service                    # 业务服务，按业务域再分子包
│   │   ├── accesscontrol
│   │   ├── analysis
│   │   ├── dataset
│   │   └── ...
│   └── util                       # 应用层工具
├── common                         # 通用基础类
├── infrastructure                 # 基础设施（外部通信、技术组件）
└── starter                        # 启动装配（配置、接入入口）
```

关键差异点（相对本项目现状）：

- 顶层只有 `application` / `common` / `infrastructure` / `starter` 四层，**没有独立的
  `domain` 层和 `interfaces` 层**。
- Entity、DTO 统一收进 `application/model`；Mapper 收进 `application/repository`。
- `service` 不再按"接口包 + impl 包"横切，而是**按业务域纵向分包**，接口与实现同域放置。
- 启动类命名为 `ApplicationLoader`，配置类集中到 `starter`。
- 每个层用 `package-info.java` 写明职责边界。

## 二、现状与目标对照

现状（DDD 四层，48 个 Java 文件，约 2500 行）：

```
com.robot.debug
├── RobotDebugApplication
├── application
│   ├── RuntimeStateStore
│   └── service / service.impl          # 7 个接口 + 7 个实现，横切分包
├── common                              # ApiResponse / BizException / 全局异常 / TraceId
├── domain
│   ├── model                           # 7 个 Entity
│   └── service                         # 空目录
├── infrastructure
│   ├── config                          # Scheduling / WebSocket / 启动初始化
│   └── persistence                     # 7 个 MyBatis-Plus Mapper
└── interfaces
    ├── rest                            # 8 个 Controller + 6 个 DTO 文件
    ├── tcp                             # 4 个 TCP 通信类
    └── websocket                       # 2 个 WebSocket 类
```

目标：

```
com.robot.debug
├── ApplicationLoader                   # 由 RobotDebugApplication 更名
├── application
│   ├── constants                       # 散落常量归集（角色名、Topic、指令字等）
│   ├── converter                       # Entity ↔ DTO 转换（从 Dtos/Service 中抽出）
│   ├── enums                           # 用户角色、设备类型、在线状态等枚举
│   ├── model
│   │   ├── entity                      # 原 domain/model 的 7 个 Entity
│   │   └── dto                         # 原 interfaces/rest 的 6 个 DTO 文件
│   ├── repository                      # 原 infrastructure/persistence 的 7 个 Mapper
│   ├── service                         # 按业务域纵向分包，接口与实现同包
│   │   ├── user                        # UserService + UserServiceImpl
│   │   ├── device                      # DeviceService + DeviceServiceImpl
│   │   ├── teachpoint                  # TeachPointService + TeachPointServiceImpl
│   │   ├── program                     # ProgramService + ProgramServiceImpl
│   │   ├── command                     # CommandService + CommandServiceImpl
│   │   ├── audit                       # AuditService + AuditServiceImpl
│   │   └── query                       # QueryService + QueryServiceImpl
│   └── util
├── common                              # 保持现状不变
├── infrastructure
│   ├── state                           # RuntimeStateStore（内存实时状态仓库）
│   ├── tcp                             # 原 interfaces/tcp 4 个类
│   └── websocket                       # 原 interfaces/websocket 2 个类
└── starter
    ├── config                          # 原 infrastructure/config 3 个配置类
    └── rest                            # 原 interfaces/rest 的 8 个 Controller
```

各层职责约定：

| 层 | 职责 | 依赖规则 |
|---|---|---|
| `application` | 业务模型、持久化接口、业务服务 | 不依赖 `starter`、`infrastructure` 的通信细节 |
| `common` | 通用响应、异常、过滤器 | 不依赖任何业务层 |
| `infrastructure` | 与外部系统的通信（TCP/WebSocket）、内存状态 | 可回调 `application.service` |
| `starter` | 启动类装配、Spring 配置、REST 接入 | 只做参数解析与转发，不写业务逻辑 |

## 三、逐文件迁移清单

### 1. 启动类

| 现状 | 目标 | 说明 |
|---|---|---|
| `RobotDebugApplication` | `ApplicationLoader`（仍在 `com.robot.debug` 根包） | 类名对齐参考结构；`@MapperScan` 改为 `com.robot.debug.application.repository` |

### 2. application 层

| 现状 | 目标 |
|---|---|
| `domain/model/*Entity`（7 个） | `application/model/entity/` |
| `interfaces/rest/*Dtos`（6 个） | `application/model/dto/` |
| `infrastructure/persistence/*Mapper`（7 个） | `application/repository/` |
| `application/service/XxxService` + `application/service/impl/XxxServiceImpl` | `application/service/<域>/`，接口与实现同包同域 |
| 散落于 Service/Dtos 中的 Entity→DTO 转换代码 | 抽到 `application/converter/`（纯移动，不改逻辑） |
| 角色字符串 `"superadmin"/"admin"/...` 等字面量 | 抽到 `application/enums/`、`application/constants/` |
| — | 新增 `application/util/`（暂空，放 `package-info.java`） |

业务域划分（与现有 7 个 Service 一一对应，不额外拆分）：`user`、`device`、
`teachpoint`、`program`、`command`、`audit`、`query`。

### 3. common 层

`ApiResponse`、`BizException`、`GlobalExceptionHandler`、`TraceIdFilter` 保持原位不动。

### 4. infrastructure 层

| 现状 | 目标 | 说明 |
|---|---|---|
| `application/RuntimeStateStore` | `infrastructure/state/` | 内存状态仓库属于技术设施，不属于业务服务 |
| `interfaces/tcp/`（ProtocolMessage、RobotTcpClient、RobotTcpHandler、RobotSessionManager） | `infrastructure/tcp/` | 与控制系统通信的客户端设施 |
| `interfaces/websocket/`（ControlWebSocketHandler、WebSocketHub） | `infrastructure/websocket/` | 向前端推送的通信设施 |

### 5. starter 层

| 现状 | 目标 |
|---|---|
| `infrastructure/config/SchedulingConfig`、`WebSocketConfig`、`StartupStateInitializer` | `starter/config/` |
| `interfaces/rest/` 8 个 Controller | `starter/rest/` |

### 6. 空目录处理

`domain/service` 是空目录，`domain`、`interfaces` 两层整体删除。

## 四、需要同步修改的配置与文档

1. `pom.xml`：`<start-class>` 改为 `com.robot.debug.ApplicationLoader`。
2. `backend/.run/RobotDebugApplication.run.xml`：启动类名同步更新（文件名可保留）。
3. `@MapperScan`：指向 `com.robot.debug.application.repository`。
4. `@SpringBootApplication(scanBasePackages = "com.robot.debug")`：根包不变，无需修改，
   所有新包仍在扫描范围内。
5. 测试代码（4 个测试类）：同步修改 `package` 与 `import`；测试目录结构跟随主代码
   （如 `application/service/user/UserServiceImplTest`、`infrastructure/tcp/...`）。
6. `backend/README.md`：`ClassNotFoundException: com.robot.debug.RobotDebugApplication`
   等提及启动类全限定名的段落同步更新。
7. 为 `application`、`application/service` 等新增 `package-info.java`，写清该层职责，
   对齐参考结构的做法。

不需要改动：`resources/`（含 Flyway 迁移脚本）、`tools/`、前端任何代码、
TCP 协议（`TCP_PROTOCOL.md`）、REST 路径与报文格式。

## 五、实施步骤（按此顺序执行，每步可独立编译）

1. 新建目标包骨架及 `package-info.java`。
2. 迁移 `domain/model` → `application/model/entity`，`interfaces/rest/*Dtos` →
   `application/model/dto`，全局替换 import。
3. 迁移 `infrastructure/persistence` → `application/repository`，更新 `@MapperScan`。
4. 按业务域重排 `application/service`（7 个域包，接口与 impl 同包）。
5. 迁移 Controller → `starter/rest`，配置类 → `starter/config`。
6. 迁移 TCP/WebSocket → `infrastructure/tcp|websocket`，`RuntimeStateStore` →
   `infrastructure/state`。
7. 启动类更名 `ApplicationLoader`，同步 pom、`.run` 配置、README。
8. 抽取 `constants` / `enums` / `converter`（只做代码移动，不做逻辑重构）。
9. 删除 `domain`、`interfaces` 空包。
10. 验证：`mvn test` 全绿 + `mvn package` 成功 + 按 README 联调顺序启动一次，
    确认登录、`/api/teach-points`、WebSocket 推送、TCP 连接模拟器均正常。

## 六、风险与注意事项

- 本次改造涉及全部 48 个文件的 `package` 声明和 import，IDE 内用
  "Move / Refactor" 完成，避免手工改包名遗漏。
- 类名变更只有启动类一处；REST 路径、WebSocket 路径、TCP 协议、数据库表全部不变，
  前端与控制系统模拟器无感知。
- 第 8 步（constants/enums/converter 抽取）是唯一触碰方法体内部的步骤，
  如要控制改动面，可单独作为一个提交，且允许暂缓——先完成纯包移动，结构已对齐参考方案。
- 建议分两个提交：步骤 1–7、9（纯移动，可机器验证）；步骤 8（少量代码归集）。
