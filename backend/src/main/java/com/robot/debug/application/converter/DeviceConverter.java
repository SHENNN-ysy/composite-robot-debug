package com.robot.debug.application.converter;

import com.robot.debug.application.model.DeviceEntity;
import com.robot.debug.interfaces.rest.DTO.DeviceDtos;

/**
 * 设备实体与接口视图转换器。
 */
public final class DeviceConverter {
    /** 转换器禁止实例化。 */
    private DeviceConverter() {}

    /** 将设备实体转换为 REST 响应视图。 */
    public static DeviceDtos.View toView(DeviceEntity entity) {
        return new DeviceDtos.View(
                entity.getId(),
                entity.getDeviceCode(),
                entity.getParentId(),
                entity.getDeviceType(),
                entity.getName(),
                entity.getModel(),
                entity.getConfigJson(),
                entity.getOnline(),
                entity.getLastCommunicationAt());
    }
}
