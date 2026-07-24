package com.robot.debug.interfaces.websocket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.robot.debug.interfaces.websocket.ControlPushMessage;
import org.junit.jupiter.api.Test;

/**
 * 前端状态推送 WebSocket 消息信封的 JSON 编码/解码测试。
 */
class ControlPushMessageTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 验证字段名与前端 {@code types/backend.ts} 中的 {@code ProtocolMessage} 保持一致。 */
    @Test
    void keepsFrontendCompatibleFieldNames() throws Exception {
        var payload = objectMapper.createObjectNode().put("connected", true);
        String json = objectMapper.writeValueAsString(
                new ControlPushMessage("1.0", "device.snapshot", null, 1712345678901L, payload));

        assertTrue(json.contains("\"version\":\"1.0\""), json);
        assertTrue(json.contains("\"type\":\"device.snapshot\""), json);
        assertTrue(json.contains("\"messageId\":null"), json);
        assertTrue(json.contains("\"timestamp\":1712345678901"), json);
        assertTrue(json.contains("\"payload\":{"), json);

        ControlPushMessage decoded = objectMapper.readValue(json, ControlPushMessage.class);
        assertEquals("1.0", decoded.version());
        assertEquals("device.snapshot", decoded.type());
        assertEquals(1712345678901L, decoded.timestamp());
        assertTrue(decoded.payload().path("connected").asBoolean());
    }

    /** 验证 payload 中的换行会被 JSON 转义，避免单帧被错误切分。 */
    @Test
    void escapesPayloadNewlinesInsideOneJsonLine() throws Exception {
        var payload = objectMapper.createObjectNode().put("luaContent", "第一行\n第二行\nprint(\"ok\")");
        String json = objectMapper.writeValueAsString(
                new ControlPushMessage("1.0", "arm.status", "message-1", 1L, payload));

        assertFalse(json.contains("第一行\n第二行"));
        assertTrue(json.contains("第一行\\n第二行"));
        ControlPushMessage decoded = objectMapper.readValue(json, ControlPushMessage.class);
        assertTrue(decoded.payload().path("luaContent").asText().contains("\n"));
    }
}