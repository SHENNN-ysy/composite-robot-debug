package com.robot.debug.application.service;

import com.robot.debug.interfaces.rest.DTO.DeviceDtos;
import java.util.List;

/**
 * 设备资料及在线状态服务接口。
 */
public interface DeviceService {
    /** 查询复合机器人、机械臂和 AGV 列表。 */
    List<DeviceDtos.View> list();

    /** 按主键查询设备。 */
    DeviceDtos.View get(Long id);

    /** 更新设备基础资料。 */
    DeviceDtos.View update(Long id, DeviceDtos.UpdateRequest request, String operator);

    /** 批量刷新指定设备的连接状态。 */
    void markConnection(boolean online, List<String> deviceCodes);
}
