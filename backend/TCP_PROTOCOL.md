# 控制系统状态上报临时约定

## 通信方向

```text
控制系统 TCP Server → Java 后端 TCP Client → 前端 WebSocket Client
```

- 控制系统作为 TCP 服务端，默认监听 `127.0.0.1:9000`。
- Java 后端作为 TCP 客户端，启动后连接并在断开时自动重连。
- TCP 连接当前只允许控制系统向后端上报状态。
- Java 后端不会通过该 TCP 连接发送参数、命令、ACK 或心跳响应。
- 前端 WebSocket `/ws/control` 只接收状态，不允许发送控制命令。

正式 TCP 分帧和字段规则尚未确定。为便于当前代码联调，暂时使用 UTF-8 换行 JSON，一行表示一帧。

## 临时机械臂状态 JSON

每一帧必须包含位姿 6 字段、关节 6 字段，以及 DI、DO、CI、CO 各 8 个布尔状态。
**标准形式为嵌套三段式**（与后端归一化输出、前端订阅载荷保持一致）：

```json
{
  "tcp": {
    "x": 350.0,
    "y": 0.0,
    "z": 250.0,
    "rx": 180.0,
    "ry": 0.0,
    "rz": 0.0
  },
  "joints": {
    "j1": 0.0,
    "j2": -45.0,
    "j3": 90.0,
    "j4": 0.0,
    "j5": 45.0,
    "j6": 0.0
  },
  "io": {
    "DI": [false, false, false, false, false, false, false, false],
    "DO": [false, false, false, false, false, false, false, false],
    "CI": [false, false, false, false, false, false, false, false],
    "CO": [false, false, false, false, false, false, false, false]
  },
  "running": false,
  "speed": 30,
  "mode": "manual"
}
```

后端会校验 12 个数值字段及 32 个 IO 布尔值。字段不完整的整帧数据会被丢弃，不会覆盖前端最后一次有效状态。

为兼容旧厂商控制系统，后端 `RobotTcpHandler.normalizeArmState` 同时支持扁平入站（`x/y/z/.../j1..j6` 直接放在根对象）；
只要能从扁平或嵌套任一形式中解析出 12 个数值 + 4 组 IO 即视为合法帧。
**新接入的控制系统应统一使用嵌套形式**，与前端订阅载荷一致。

## 前端 WebSocket 出站载荷

后端在 `RobotTcpHandler.normalizeArmState` 二次规范化后，通过 `/ws/control` 向前端 WebSocket 单向推送 `arm.status` 消息。
**出站 payload 形态与 TCP 入站标准形式保持一致**：嵌套 `tcp / joints / io` 三段式，顶层只放控制类字段与后端注入字段。

```json
{
  "connected": true,
  "tcp": {
    "x": 350.0,
    "y": 0.0,
    "z": 250.0,
    "rx": 180.0,
    "ry": 0.0,
    "rz": 0.0
  },
  "joints": {
    "j1": 0.0,
    "j2": -45.0,
    "j3": 90.0,
    "j4": 0.0,
    "j5": 45.0,
    "j6": 0.0
  },
  "io": {
    "DI": [false, false, false, false, false, false, false, false],
    "DO": [false, false, false, false, false, false, false, false],
    "CI": [false, false, false, false, false, false, false, false],
    "CO": [false, false, false, false, false, false, false, false]
  },
  "running": false,
  "speed": 30,
  "mode": "manual",
  "receivedAt": 1784893420726
}
```

`connected` 与 `receivedAt` 由后端注入（分别表示本帧是控制系统活跃态与后端接收时刻），**不会出现在 TCP 入站帧中**。
其余字段均为透传：原样保留 TCP 入站时的同名顶层字段（`running` / `speed` / `mode`），便于前端按子对象聚合。

频率方面：后端对 TCP 入站帧不做节流，**WebSocket 推送频率 = TCP 接收频率**；
模拟器 `TCPtest/robot_controller_simulator.py` 默认 5Hz（`PUSH_INTERVAL_SECONDS = 0.2`），真实机器人控制系统由其自身决定。

## HTTP 控制接口

前端控制操作使用独立的语义化 POST 接口，请求体直接传业务参数。例如设置机械臂模式：

```http
POST /api/control/arm/mode
Content-Type: application/json
```

```json
{
  "mode": "1"
}
```

| 接口 | 指令 |
|---|---|
| `POST /api/control/arm/step-cartesian` | 机械臂笛卡尔步进 |
| `POST /api/control/arm/step-joint` | 机械臂关节步进 |
| `POST /api/control/arm/mode` | 设置机械臂模式 |
| `POST /api/control/arm/speed` | 设置机械臂速度 |
| `POST /api/control/arm/home` | 机械臂回零 |
| `POST /api/control/arm/stop` | 机械臂停止 |
| `POST /api/control/arm/emergency-stop` | 机械臂急停 |
| `POST /api/control/arm/io` | 设置机械臂 IO |
| `POST /api/control/arm/teach-point/run` | 运行机械臂示教点 |
| `POST /api/control/arm/joints` | 机械臂关节运动 |
| `POST /api/control/agv/move` | AGV 手动移动或旋转 |
| `POST /api/control/agv/station` | AGV 到站 |
| `POST /api/control/agv/stop` | AGV 停止 |
| `POST /api/control/agv/emergency-stop` | AGV 急停 |
| `POST /api/control/agv/recharge` | AGV 回充 |
| `POST /api/control/program/execute` | 执行程序 |
| `POST /api/control/program/pause` | 暂停程序 |
| `POST /api/control/program/resume` | 恢复程序 |
| `POST /api/control/program/stop` | 停止程序 |

后端当前只受理、记录并返回 `ACCEPTED`，不会把 HTTP 控制请求转发到 TCP 控制系统。控制系统命令接收方式确定后，再补充下一跳实现。
