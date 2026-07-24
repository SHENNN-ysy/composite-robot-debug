package com.robot.debug.interfaces.websocket;

import com.robot.debug.application.model.RuntimeStateStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@Slf4j
/**
 * 前端状态推送 WebSocket 处理器。
 *
 * <p>该通道严格单向：后端只向前端推送控制系统状态，不接收控制命令。</p>
 */
public class ControlWebSocketHandler extends TextWebSocketHandler {
    private final WebSocketHub hub;
    private final RuntimeStateStore stateStore;

    public ControlWebSocketHandler(WebSocketHub hub, RuntimeStateStore stateStore) {
        this.hub = hub;
        this.stateStore = stateStore;
    }

    /** 建立连接后注册会话并立即下发完整设备快照。 */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        hub.add(session);
        hub.send(session.getId(), "device.snapshot", null, stateStore.snapshot());
        log.info("前端WebSocket连接建立 sessionId={} remote={}", session.getId(), session.getRemoteAddress());
    }

    /** 拒绝所有前端文本消息，防止 WebSocket 被重新用于控制命令。 */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        log.warn("拒绝前端WebSocket上行消息 sessionId={} payloadLength={} reason=STATUS_ONLY",
                session.getId(), message.getPayloadLength());
        try {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("WebSocket仅用于状态推送"));
        } catch (Exception exception) {
            log.debug("关闭违规WebSocket会话失败 sessionId={}", session.getId(), exception);
        }
    }

    /** 连接关闭后移除会话。 */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        hub.remove(session.getId());
        log.info("前端WebSocket连接关闭 sessionId={} code={} reason={}",
                session.getId(), status.getCode(), status.getReason());
    }

    /** 传输异常时记录堆栈并清理会话。 */
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        hub.remove(session.getId());
        log.warn("前端WebSocket传输异常 sessionId={} remote={}",
                session.getId(), session.getRemoteAddress(), exception);
    }
}
