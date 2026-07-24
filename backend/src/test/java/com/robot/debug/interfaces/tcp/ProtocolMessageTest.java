package com.robot.debug.interfaces.tcp;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

/**
 * TCP 协议 JSON 编码测试。
 */
class ProtocolMessageTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 验证多行 Lua 被 JSON 转义后仍保持单帧，并可无损还原。 */
    @Test
    void luaNewlinesAreEscapedInsideOneJsonLine() throws Exception {
        var payload = objectMapper.createObjectNode().put("luaContent", "第一行\n第二行\nprint(\"ok\")");
        String json = objectMapper.writeValueAsString(
                new ProtocolMessage("1.0", "program.execute", "message-1", 1L, payload));

        assertFalse(json.contains("第一行\n第二行"));
        assertTrue(json.contains("第一行\\n第二行"));
        ProtocolMessage decoded = objectMapper.readValue(json, ProtocolMessage.class);
        assertTrue(decoded.payload().path("luaContent").asText().contains("\n"));
    }
}
