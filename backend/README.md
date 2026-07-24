# 复合机器人联调后端

## 项目结构

```text
com.robot.debug
├─ application
│  ├─ constants       业务常量
│  ├─ converter       实体与接口模型转换
│  ├─ enums           业务枚举
│  ├─ model           实体及运行时状态
│  ├─ repository      MyBatis-Plus Mapper
│  ├─ service         Service 接口
│  ├─ service/impl    Service 实现
│  └─ util            应用层工具
├─ common             统一响应、异常和链路信息
├─ infrastructure     Spring 配置与启动初始化
├─ interfaces         REST、TCP、WebSocket 接口适配
└─ RobotDebugApplication
```

## 功能

- 用户登录和用户管理。密码按当前联调要求以明文保存，但查询接口不返回密码。
- 单台复合机器人、机械臂和 AGV 信息管理。
- 机械臂示教点的 MySQL 持久化及 `/api/teach-points` 增删改查。
- 流程 JSON 与前端生成 Lua 的保存、查询、修改、删除和下发。
- 可视化流程保存在 `program` 表，Lua 正文保存在一对一关联的 `lua_program` 表。
- `/ws/control` 单向状态推送，不接收前端控制消息。
- 后端作为 TCP Client 连接 `127.0.0.1:9000` 控制系统服务端。
- `/api/control/arm/*`、`/api/control/agv/*`、`/api/control/program/*` 使用独立 POST 接口接收控制请求，请求体直接传业务参数。
- 操作日志、设备日志和命令处理记录。

## 开发环境启动

准备 Java 21、Maven 3.9 和 MySQL 8.4，创建空数据库：

```sql
CREATE DATABASE robot_debug CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

首次启动先创建本地私密配置文件：

```powershell
Copy-Item application-secrets.example.yml src/main/resources/application-secrets.yml
```

编辑 `src/main/resources/application-secrets.yml`，填写本机 MySQL 密码。该文件已被
`.gitignore` 排除，不会上传 GitHub。配置中的值也可以继续通过环境变量覆盖：

```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_NAME=robot_debug
export DB_USER=root
export DB_PASSWORD=root
mvn spring-boot:run
```

Windows PowerShell 使用实际的 MySQL 密码启动：

```powershell
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_NAME = "robot_debug"
$env:DB_USER = "root"
$env:DB_PASSWORD = "你的实际MySQL密码"
mvn spring-boot:run
```

IDEA 必须使用 JDK 21 导入 `backend/pom.xml`。工程已提供共享启动配置
`backend/.run/RobotDebugApplication.run.xml`；重新加载 Maven 项目后，可直接选择
`RobotDebugApplication` 运行。

如果 IDEA 启动命令中没有 `-classpath`，或出现
`ClassNotFoundException: com.robot.debug.RobotDebugApplication`，说明当前只是打开了普通目录，
尚未建立 Maven 模块。请在项目树中右键 `pom.xml`，选择“添加为 Maven 项目”，等待
`src/main/java` 显示为蓝色源码目录后再运行。不要手工创建一个没有绑定模块的 Application 配置。

若启动日志出现 `Access denied for user 'root'@'localhost'`，表示启动类和 Spring 注解已经生效，
失败点是 MySQL 认证。请检查 `DB_USER`、`DB_PASSWORD` 及 `robot_debug` 数据库是否存在。

Flyway 会自动建表并创建以下联调账号：

迁移目录固定保留两个脚本：`V1__create_schema.sql` 负责建表及旧 Lua
数据迁移，`V2__seed_data.sql` 负责填充联调账号和固定设备。

| 账号 | 密码 | 角色 |
|---|---|---|
| `superadmin` | `superadmin123` | 超级管理员 |
| `admin` | `admin123` | 管理员 |
| `technician` | `tech123` | 技术员 |
| `user` | `user123` | 普通用户 |

这些密码只适用于离线联调原型。

## 联调顺序

1. 启动 MySQL。
2. 在 `backend` 目录运行 `python3 tools/robot_controller_simulator.py`，模拟控制系统 TCP 服务端。
3. 启动 Java 后端，由后端主动连接模拟控制系统。
4. 在 `frontend` 目录运行 `npm run dev`。
5. 浏览器访问 `http://localhost:3000`，使用任一预置账号登录。

Vite 会把 `/api` 和 `/ws` 代理到 `127.0.0.1:8080`。

## 测试与构建

```bash
mvn test
mvn package
```

模拟器只向 Java 后端单向发送机械臂姿态、关节和 IO 状态，不接收任何控制命令。

## 控制台日志

后端统一使用 SLF4J 的 `@Slf4j` 输出控制台日志，默认业务日志级别为 `INFO`。每个 REST 请求会记录请求方法、路径、状态码、耗时和 `traceId`；TCP、WebSocket、命令、程序及用户管理会记录关键状态变化。

心跳和高频设备状态使用 `TRACE` 或 `DEBUG`，默认不会刷屏。日志不会输出用户密码、Lua 正文、HTTP 请求体或完整控制载荷；程序日志只记录程序 ID、版本和 Lua 字符数。

## 端口

| 用途 | 默认值 |
|---|---:|
| REST / WebSocket | `8080` |
| 机器人 TCP | `127.0.0.1:9000` |
| Vite 开发服务 | `3000` |

正式工控机使用 Nginx 托管前端构建产物并代理 `/api`、`/ws`，示例见 `deploy/nginx/robot-debug.conf`。
