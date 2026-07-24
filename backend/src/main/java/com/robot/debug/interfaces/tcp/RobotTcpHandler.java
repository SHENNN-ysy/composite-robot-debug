package com.robot.debug.interfaces.tcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.robot.debug.application.model.RuntimeStateStore;
import com.robot.debug.interfaces.websocket.WebSocketHub;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.timeout.IdleStateEvent;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 控制系统 TCP 单向状态数据处理器。
 *
 * <p>当前兼容根对象和旧信封中的 payload 对象，并统一转换为前端所需的机械臂状态 JSON。
 * 不注册、不应答，也不处理任何来自前端的控制命令。</p>
 */
@Component
@ChannelHandler.Sharable
@Slf4j
public class RobotTcpHandler extends SimpleChannelInboundHandler<String> {
    private static final List<String> POSE_FIELDS = List.of("x", "y", "z", "rx", "ry", "rz");
    private static final List<String> JOINT_FIELDS = List.of("j1", "j2", "j3", "j4", "j5", "j6");
    private static final List<String> IO_GROUPS = List.of("DI", "DO", "CI", "CO");

    private final ObjectMapper objectMapper;
    private final RobotSessionManager sessionManager;
    private final RuntimeStateStore stateStore;
    private final WebSocketHub webSocketHub;

    public RobotTcpHandler(
            ObjectMapper objectMapper,
            RobotSessionManager sessionManager,
            RuntimeStateStore stateStore,
            WebSocketHub webSocketHub) {
        this.objectMapper = objectMapper;
        this.sessionManager = sessionManager;
        this.stateStore = stateStore;
        this.webSocketHub = webSocketHub;
    }

    /** TCP 客户端连接成功后同步在线状态。 */
    @Override
    public void channelActive(ChannelHandlerContext context) {
        sessionManager.connected(context.channel());
        context.fireChannelActive();
    }

    /** 解析控制系统上报的一帧 JSON，校验完整状态后推送前端。 */
    @Override
    protected void channelRead0(ChannelHandlerContext context, String line) {
        try {
            JsonNode root = objectMapper.readTree(line);
            JsonNode source = root.has("payload") && root.path("payload").isObject()
                    ? root.path("payload") : root;
            ObjectNode state = normalizeArmState(source);
            stateStore.setArmState(state);
            sessionManager.touch();
            webSocketHub.broadcast("arm.status", null, state);
            log.debug("机械臂完整状态已从TCP转发至WebSocket payloadLength={}", line.length());
        } catch (IllegalArgumentException exception) {
            log.warn("丢弃字段不完整的机械臂TCP状态 remote={} reason={}",
                    context.channel().remoteAddress(), exception.getMessage());
        } catch (Exception exception) {
            log.warn("丢弃非法TCP状态JSON remote={} payloadLength={}",
                    context.channel().remoteAddress(), line.length(), exception);
        }
    }

    /** 将扁平或嵌套状态转换为前端统一的嵌套 JSON（tcp/joints/io 三个子对象）。 */
    private ObjectNode normalizeArmState(JsonNode source) {
        JsonNode pose = source.path("tcp").isObject() ? source.path("tcp") : source;
        JsonNode joints = source.path("joints").isObject() ? source.path("joints") : source;
        JsonNode io = source.path("io");
        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("connected", true);
        // 位姿与关节角分别构造成嵌套子对象，与 io 保持一致的三段式结构
        ObjectNode tcpNode = objectMapper.createObjectNode();
        copyRequiredNumbers(pose, tcpNode, POSE_FIELDS);
        normalized.set("tcp", tcpNode);
        ObjectNode jointsNode = objectMapper.createObjectNode();
        copyRequiredNumbers(joints, jointsNode, JOINT_FIELDS);
        normalized.set("joints", jointsNode);
        normalized.set("io", normalizeIo(io));
        copyOptionalFields(source, normalized);
        normalized.put("receivedAt", System.currentTimeMillis());
        return normalized;
    }

    /** 复制必需数值字段，缺失或非数值时拒绝整帧状态。 */
    private void copyRequiredNumbers(JsonNode source, ObjectNode target, List<String> fields) {
        for (String field : fields) {
            JsonNode value = source.get(field);
            if (value == null || !value.isNumber()) {
                throw new IllegalArgumentException("缺少数值字段 " + field);
            }
            target.put(field, value.asDouble());
        }
    }

    /** 校验四组 IO，每组必须恰好包含 8 个布尔值。 */
    private ObjectNode normalizeIo(JsonNode source) {
        if (!source.isObject()) throw new IllegalArgumentException("缺少 io 对象");
        ObjectNode normalized = objectMapper.createObjectNode();
        for (String group : IO_GROUPS) {
            JsonNode values = source.get(group);
            if (values == null || !values.isArray() || values.size() != 8) {
                throw new IllegalArgumentException(group + " 必须包含 8 个状态");
            }
            ArrayNode array = objectMapper.createArrayNode();
            for (JsonNode value : values) {
                if (!value.isBoolean()) throw new IllegalArgumentException(group + " 状态必须为布尔值");
                array.add(value.asBoolean());
            }
            normalized.set(group, array);
        }
        return normalized;
    }

    /** 复制运行状态等非必需字段，不影响核心姿态数据校验。 */
    private void copyOptionalFields(JsonNode source, ObjectNode target) {
        if (source.has("running") && source.path("running").isBoolean()) {
            target.put("running", source.path("running").asBoolean());
        }
        if (source.has("speed") && source.path("speed").isNumber()) {
            target.put("speed", source.path("speed").asDouble());
        }
        if (source.has("mode") && source.path("mode").isTextual()) {
            target.put("mode", source.path("mode").asText());
        }
    }

    /** TCP 连接断开后切换离线状态。 */
    @Override
    public void channelInactive(ChannelHandlerContext context) {
        sessionManager.disconnected(context.channel());
    }

    /** 长时间没有状态数据时关闭连接，由客户端生命周期组件发起重连。 */
    @Override
    public void userEventTriggered(ChannelHandlerContext context, Object event) {
        if (event instanceof IdleStateEvent) {
            log.warn("控制系统状态数据超时，关闭TCP连接 remote={}", context.channel().remoteAddress());
            context.close();
        } else {
            context.fireUserEventTriggered(event);
        }
    }

    /** 捕获 TCP 管道异常并关闭当前连接。 */
    @Override
    public void exceptionCaught(ChannelHandlerContext context, Throwable cause) {
        log.warn("控制系统TCP连接异常 remote={}", context.channel().remoteAddress(), cause);
        context.close();
    }
}
