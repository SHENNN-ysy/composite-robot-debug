package com.robot.debug.interfaces.websocket;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 前端 WebSocket 状态推送消息信封（后端 → 前端，单向）。
 *
 * <p>该信封独立于 TCP 协议信封存在，便于后续两类通道按各自演进路线独立扩展。
 * 字段名与前端 {@code types/backend.ts} 中的 {@code ProtocolMessage} 保持一致，
 * 保证前后端协议兼容。</p>
 *
 * <p>{@code type} 取值示例：</p>
 * <ul>
 *   <li>{@code device.snapshot} — 连接建立后的全量设备状态快照</li>
 *   <li>{@code device.online} / {@code device.offline} — 控制系统上下线事件</li>
 *   <li>{@code arm.status} — 机械臂实时姿态/关节角/IO</li>
 *   <li>{@code agv.status} — AGV 实时位置/电量/站点</li>
 * </ul>
 *
 * @param version 协议版本，便于后续协议演进时前后端兼容
 * @param type 消息类型，订阅方按其分发到对应的状态处理逻辑
 * @param messageId 消息 ID；服务端主动推送时通常为 null
 * @param timestamp 服务端发送时间戳（毫秒）
 * @param payload 消息载荷，结构由 type 决定
 */
public record ControlPushMessage(
        String version,
        String type,
        String messageId,
        long timestamp,
        JsonNode payload) {}