package com.robot.debug.interfaces.tcp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.robot.debug.application.model.RuntimeStateStore;
import com.robot.debug.interfaces.websocket.WebSocketHub;
import io.netty.channel.embedded.EmbeddedChannel;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * TCP 单向机械臂状态处理测试。
 */
class RobotTcpHandlerTest {
    /** 验证完整姿态、关节和 IO 状态能够转换并推送到 WebSocket。 */
    @Test
    void completeArmStateIsForwardedToWebSocket() {
        RobotSessionManager sessionManager = mock(RobotSessionManager.class);
        RuntimeStateStore stateStore = mock(RuntimeStateStore.class);
        WebSocketHub hub = mock(WebSocketHub.class);
        RobotTcpHandler handler = new RobotTcpHandler(new ObjectMapper(), sessionManager, stateStore, hub);
        EmbeddedChannel channel = new EmbeddedChannel(handler);

        String json = """
                {
                  "x":350,"y":0,"z":250,"rx":180,"ry":0,"rz":0,
                  "j1":0,"j2":-45,"j3":90,"j4":0,"j5":45,"j6":0,
                  "io":{
                    "DI":[false,false,false,false,false,false,false,false],
                    "DO":[false,false,false,false,false,false,false,false],
                    "CI":[false,false,false,false,false,false,false,false],
                    "CO":[false,false,false,false,false,false,false,false]
                  }
                }
                """;
        channel.writeInbound(json);

        ArgumentCaptor<JsonNode> stateCaptor = ArgumentCaptor.forClass(JsonNode.class);
        verify(stateStore).setArmState(stateCaptor.capture());
        JsonNode state = stateCaptor.getValue();
        // 输出端为嵌套结构：tcp/joints/io 三个子对象
        assertEquals(350.0, state.path("tcp").path("x").asDouble());
        assertEquals(-45.0, state.path("joints").path("j2").asDouble());
        assertEquals(8, state.path("io").path("DO").size());
        verify(hub).broadcast(eq("arm.status"), isNull(), any(JsonNode.class));
        channel.finishAndReleaseAll();
    }

    /**
     * 验证 WebSocket 推送的 payload 是嵌套结构（tcp/joints/io），而不是扁平键值。
     * 后端 normalizeArmState 在输出端把位姿与关节角分别放进子对象，
     * 与 io 保持一致的三段式结构，便于前端按子对象聚合。
     */
    @Test
    void forwardedPayloadIsNested() {
        RobotSessionManager sessionManager = mock(RobotSessionManager.class);
        RuntimeStateStore stateStore = mock(RuntimeStateStore.class);
        WebSocketHub hub = mock(WebSocketHub.class);
        RobotTcpHandler handler = new RobotTcpHandler(new ObjectMapper(), sessionManager, stateStore, hub);
        EmbeddedChannel channel = new EmbeddedChannel(handler);

        String json = """
                {
                  "x":350,"y":0,"z":250,"rx":180,"ry":0,"rz":0,
                  "j1":0,"j2":-45,"j3":90,"j4":0,"j5":45,"j6":0,
                  "io":{
                    "DI":[false,false,false,false,false,false,false,false],
                    "DO":[false,false,false,false,false,false,false,false],
                    "CI":[false,false,false,false,false,false,false,false],
                    "CO":[false,false,false,false,false,false,false,false]
                  }
                }
                """;
        channel.writeInbound(json);

        ArgumentCaptor<JsonNode> payloadCaptor = ArgumentCaptor.forClass(JsonNode.class);
        verify(hub).broadcast(eq("arm.status"), isNull(), payloadCaptor.capture());
        JsonNode payload = payloadCaptor.getValue();
        // 顶层不应再出现扁平 x/j1
        org.junit.jupiter.api.Assertions.assertTrue(payload.path("x").isMissingNode());
        org.junit.jupiter.api.Assertions.assertTrue(payload.path("j1").isMissingNode());
        // 位姿与关节角应在子对象内
        org.junit.jupiter.api.Assertions.assertEquals(350.0, payload.path("tcp").path("x").asDouble());
        org.junit.jupiter.api.Assertions.assertEquals(-45.0, payload.path("joints").path("j2").asDouble());
        org.junit.jupiter.api.Assertions.assertEquals(8, payload.path("io").path("CO").size());
        channel.finishAndReleaseAll();
    }

    /** 验证缺少任一 IO 组时整帧数据不会进入运行时状态。 */
    @Test
    void incompleteIoStateIsRejected() {
        RobotSessionManager sessionManager = mock(RobotSessionManager.class);
        RuntimeStateStore stateStore = mock(RuntimeStateStore.class);
        WebSocketHub hub = mock(WebSocketHub.class);
        RobotTcpHandler handler = new RobotTcpHandler(new ObjectMapper(), sessionManager, stateStore, hub);
        EmbeddedChannel channel = new EmbeddedChannel(handler);

        String json = """
                {
                  "x":350,"y":0,"z":250,"rx":180,"ry":0,"rz":0,
                  "j1":0,"j2":-45,"j3":90,"j4":0,"j5":45,"j6":0,
                  "io":{"DI":[],"DO":[],"CI":[]}
                }
                """;
        channel.writeInbound(json);

        verify(stateStore, never()).setArmState(any());
        verify(hub, never()).broadcast(eq("arm.status"), isNull(), any(JsonNode.class));
        channel.finishAndReleaseAll();
    }

    /**
     * 验证嵌套（tcp/joints/io）入站帧也能被归一化为嵌套 WebSocket 载荷，
     * 与模拟器和前端订阅载荷的形态保持一致。
     */
    @Test
    void nestedIncomingFrameIsForwardedNested() {
        RobotSessionManager sessionManager = mock(RobotSessionManager.class);
        RuntimeStateStore stateStore = mock(RuntimeStateStore.class);
        WebSocketHub hub = mock(WebSocketHub.class);
        RobotTcpHandler handler = new RobotTcpHandler(new ObjectMapper(), sessionManager, stateStore, hub);
        EmbeddedChannel channel = new EmbeddedChannel(handler);

        String json = """
                {
                  "tcp":{"x":350,"y":0,"z":250,"rx":180,"ry":0,"rz":0},
                  "joints":{"j1":0,"j2":-45,"j3":90,"j4":0,"j5":45,"j6":0},
                  "io":{
                    "DI":[false,false,false,false,false,false,false,false],
                    "DO":[false,false,false,false,false,false,false,false],
                    "CI":[false,false,false,false,false,false,false,false],
                    "CO":[false,false,false,false,false,false,false,false]
                  },
                  "running":false,"speed":30,"mode":"manual"
                }
                """;
        channel.writeInbound(json);

        ArgumentCaptor<JsonNode> payloadCaptor = ArgumentCaptor.forClass(JsonNode.class);
        verify(hub).broadcast(eq("arm.status"), isNull(), payloadCaptor.capture());
        JsonNode payload = payloadCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertEquals(350.0, payload.path("tcp").path("x").asDouble());
        org.junit.jupiter.api.Assertions.assertEquals(-45.0, payload.path("joints").path("j2").asDouble());
        org.junit.jupiter.api.Assertions.assertEquals(8, payload.path("io").path("CO").size());
        org.junit.jupiter.api.Assertions.assertEquals("manual", payload.path("mode").asText());
        channel.finishAndReleaseAll();
    }
}
