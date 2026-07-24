package com.robot.debug.interfaces.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

@Component
@Slf4j
/**
 * 前端 WebSocket 会话注册表和消息推送中心。
 */
public class WebSocketHub {
    private final ObjectMapper objectMapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public WebSocketHub(ObjectMapper objectMapper) { this.objectMapper = objectMapper; }

    /** 将原始会话包装成并发安全会话并加入注册表。 */
    public void add(WebSocketSession rawSession) {
        sessions.put(rawSession.getId(), new ConcurrentWebSocketSessionDecorator(rawSession, 5_000, 2 * 1024 * 1024));
        log.info("WebSocket会话已加入 sessionId={} activeSessions={}", rawSession.getId(), sessions.size());
    }

    /** 从注册表移除会话。 */
    public void remove(String sessionId) {
        sessions.remove(sessionId);
        log.info("WebSocket会话已移除 sessionId={} activeSessions={}", sessionId, sessions.size());
    }

    /** 返回当前会话标识的只读副本。 */
    public Set<String> sessionIds() { return Set.copyOf(sessions.keySet()); }

    /** 向所有前端连接广播协议消息。 */
    public void broadcast(String type, String messageId, JsonNode payload) {
        String body = serialize(type, messageId, payload);
        sessions.forEach((id, session) -> sendBody(id, session, body));
        log.debug("WebSocket广播完成 type={} messageId={} sessionCount={}", type, messageId, sessions.size());
    }

    /** 向指定前端连接发送协议消息。 */
    public void send(String sessionId, String type, String messageId, JsonNode payload) {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null) {
            sendBody(sessionId, session, serialize(type, messageId, payload));
        } else {
            log.debug("WebSocket定向消息未发送 sessionId={} type={} reason=SESSION_NOT_FOUND", sessionId, type);
        }
    }

    /** 将协议消息序列化为 JSON 文本。 */
    private String serialize(String type, String messageId, JsonNode payload) {
        try {
            return objectMapper.writeValueAsString(new ControlPushMessage(
                    "1.0", type, messageId, System.currentTimeMillis(), payload));
        } catch (Exception exception) {
            log.error("WebSocket消息序列化失败 type={} messageId={}", type, messageId, exception);
            throw new IllegalStateException("WebSocket消息序列化失败", exception);
        }
    }

    /** 执行实际写入，并清理关闭或写入失败的会话。 */
    private void sendBody(String id, WebSocketSession session, String body) {
        if (!session.isOpen()) {
            sessions.remove(id);
            log.info("清理已关闭WebSocket会话 sessionId={} activeSessions={}", id, sessions.size());
            return;
        }
        try {
            session.sendMessage(new TextMessage(body));
        } catch (IOException exception) {
            log.warn("WebSocket消息发送失败 sessionId={}", id, exception);
            sessions.remove(id);
        }
    }
}
