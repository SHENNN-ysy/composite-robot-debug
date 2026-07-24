package com.robot.debug.interfaces.tcp;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * 后端与机器人控制系统之间的 TCP 协议消息信封（服务端 ↔ 控制系统，单向状态上报）。
 *
 * <p>该信封只服务于后端作为 TCP 客户端、与机器人控制系统的私有通信协议，
 * 与 WebSocket 通道无关。后续接入正式 TCP 协议时，
 * 可在此扩展命令号（cmd）、请求序号（sequenceId）、协议子版本等专用字段，
 * 不影响 WebSocket 推送协议。</p>
 *
 * @param version 协议版本
 * @param type 消息类型
 * @param messageId 全链路消息标识
 * @param timestamp 发送方毫秒时间戳
 * @param payload 业务载荷
 */
public record ProtocolMessage(String version, String type, String messageId, long timestamp, JsonNode payload) {}