package com.robot.debug.application.constants;

import java.util.List;

/**
 * 单机复合机器人固定设备编号常量。
 */
public final class DeviceConstants {
    /** 复合机器人编号。 */
    public static final String COMPOSITE_CODE = "CMP-001";
    /** 机械臂编号。 */
    public static final String ARM_CODE = "ARM-001";
    /** AGV 编号。 */
    public static final String AGV_CODE = "AGV-001";
    /** 当前单机包含的全部设备编号。 */
    public static final List<String> ALL_CODES = List.of(COMPOSITE_CODE, ARM_CODE, AGV_CODE);

    /** 常量容器禁止实例化。 */
    private DeviceConstants() {}
}
