package com.robot.debug.application.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
/**
 * 单机原型的线程安全实时状态仓库。
 *
 * <p>状态只保存在内存中，不写入历史遥测表。</p>
 */
public class RuntimeStateStore {
    private final ObjectMapper objectMapper;
    private final AtomicBoolean online = new AtomicBoolean(false);
    private final AtomicReference<JsonNode> armState = new AtomicReference<>();
    private final AtomicReference<JsonNode> agvState = new AtomicReference<>();
    private final AtomicReference<JsonNode> programState = new AtomicReference<>();

    public RuntimeStateStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        armState.set(objectMapper.createObjectNode());
        agvState.set(objectMapper.createObjectNode());
        programState.set(objectMapper.createObjectNode());
    }

    /** 返回控制系统当前是否在线。 */
    public boolean isOnline() { return online.get(); }

    /** 更新整体在线状态，仅在状态发生变化时记录日志。 */
    public void setOnline(boolean value) {
        boolean previous = online.getAndSet(value);
        if (previous != value) log.info("机器人运行时在线状态变化 previous={} current={}", previous, value);
    }

    /** 返回最新机械臂状态快照。 */
    public JsonNode armState() { return armState.get(); }

    /** 保存最新机械臂状态的深拷贝。 */
    public void setArmState(JsonNode value) { armState.set(value.deepCopy()); }

    /** 返回最新 AGV 状态快照。 */
    public JsonNode agvState() { return agvState.get(); }

    /** 保存最新 AGV 状态的深拷贝。 */
    public void setAgvState(JsonNode value) { agvState.set(value.deepCopy()); }

    /** 返回最新程序运行状态。 */
    public JsonNode programState() { return programState.get(); }

    /** 保存最新程序状态的深拷贝。 */
    public void setProgramState(JsonNode value) { programState.set(value.deepCopy()); }

    /** 生成 WebSocket 重连后立即下发的完整状态快照。 */
    public JsonNode snapshot() {
        return objectMapper.valueToTree(Map.of(
                "online", online.get(),
                "arm", armState.get(),
                "agv", agvState.get(),
                "program", programState.get()));
    }
}
