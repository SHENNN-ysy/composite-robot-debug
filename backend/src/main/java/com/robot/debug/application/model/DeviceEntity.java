package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@TableName("device")
@Getter
@Setter
/**
 * 复合机器人、机械臂和 AGV 的统一设备实体。
 */
public class DeviceEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 对外设备编号。 */
    private String deviceCode;
    /** 父设备主键；机械臂和 AGV 指向复合机器人。 */
    private Long parentId;
    /** 设备类型。 */
    private String deviceType;
    /** 设备显示名称。 */
    private String name;
    /** 设备型号。 */
    private String model;
    /** 扩展配置 JSON。 */
    private String configJson;
    /** 当前连接状态。 */
    private Boolean online;
    /** 最后一次通信时间。 */
    private LocalDateTime lastCommunicationAt;
    /** 创建时间。 */
    private LocalDateTime createdAt;
    /** 最后更新时间。 */
    private LocalDateTime updatedAt;
}
