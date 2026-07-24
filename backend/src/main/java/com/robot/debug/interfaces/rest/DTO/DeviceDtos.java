package com.robot.debug.interfaces.rest.DTO;

import java.time.LocalDateTime;

/**
 * 设备接口请求和响应对象集合。
 */
public final class DeviceDtos {
    /** 工具容器禁止实例化。 */
    private DeviceDtos() {}

    /** 设备可编辑信息。 */
    public record UpdateRequest(String deviceCode, String name, String model, String configJson) {}

    /** 设备详情响应。 */
    public record View(Long id, String deviceCode, Long parentId, String deviceType, String name, String model,
                       String configJson, Boolean online, LocalDateTime lastCommunicationAt) {}
}
