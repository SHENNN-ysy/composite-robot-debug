package com.robot.debug.interfaces.tcp;

import com.robot.debug.application.constants.DeviceConstants;
import com.robot.debug.application.model.RuntimeStateStore;
import com.robot.debug.application.service.DeviceService;
import com.robot.debug.interfaces.websocket.WebSocketHub;
import io.netty.channel.Channel;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
/**
 * 单台复合机器人 TCP 客户端连接状态管理器。
 *
 * <p>这里只维护控制系统状态上报连接，不提供任何 TCP 写入方法。</p>
 */
public class RobotSessionManager {
    private final AtomicReference<Channel> channel = new AtomicReference<>();
    private final RuntimeStateStore stateStore;
    private final DeviceService deviceService;
    private final WebSocketHub webSocketHub;
    private static final List<String> DEVICE_CODES = DeviceConstants.ALL_CODES;

    public RobotSessionManager(RuntimeStateStore stateStore, DeviceService deviceService, WebSocketHub webSocketHub) {
        this.stateStore = stateStore;
        this.deviceService = deviceService;
        this.webSocketHub = webSocketHub;
    }

    /** 记录客户端连接成功、关闭旧连接并广播在线事件。 */
    public void connected(Channel newChannel) {
        Channel old = channel.getAndSet(newChannel);
        if (old != null && old != newChannel) {
            log.warn("新TCP客户端连接替换旧连接 oldRemote={} newRemote={}",
                    old.remoteAddress(), newChannel.remoteAddress());
            old.close();
        }
        stateStore.setOnline(true);
        updateDatabaseConnectionState(true);
        webSocketHub.broadcast("device.online", null, stateStore.snapshot());
        log.info("控制系统TCP连接状态已设为在线 remote={} deviceCodes={}",
                newChannel.remoteAddress(), DEVICE_CODES);
    }

    /** 刷新数据库最后通信时间；高频调用不输出 INFO 日志。 */
    public void touch() {
        if (stateStore.isOnline()) {
            updateDatabaseConnectionState(true);
        }
    }

    /** 仅在当前有效连接断开时切换离线状态并广播。 */
    public void disconnected(Channel disconnectedChannel) {
        if (channel.compareAndSet(disconnectedChannel, null)) {
            stateStore.setOnline(false);
            updateDatabaseConnectionState(false);
            webSocketHub.broadcast("device.offline", null, stateStore.snapshot());
            log.warn("控制系统TCP连接已断开 remote={} deviceCodes={}",
                    disconnectedChannel.remoteAddress(), DEVICE_CODES);
        } else {
            log.debug("忽略已被替换连接的断开事件 remote={}", disconnectedChannel.remoteAddress());
        }
    }

    /** 判断当前控制系统通道及运行时状态是否均在线。 */
    public boolean isOnline() {
        Channel current = channel.get();
        return current != null && current.isActive() && stateStore.isOnline();
    }

    /** 异步写入数据库连接状态，并显式记录异步异常。 */
    private void updateDatabaseConnectionState(boolean online) {
        List<String> deviceCodes = DEVICE_CODES;
        CompletableFuture.runAsync(() -> deviceService.markConnection(online, deviceCodes))
                .exceptionally(exception -> {
                    log.error("异步刷新数据库设备状态失败 online={} deviceCodes={}",
                            online, deviceCodes, exception);
                    return null;
                });
    }
}
