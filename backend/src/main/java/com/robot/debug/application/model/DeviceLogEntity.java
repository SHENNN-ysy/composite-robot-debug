package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@TableName("device_log")
@Getter
@Setter
/**
 * 控制系统上报的设备日志和告警实体。
 */
public class DeviceLogEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 日志来源。 */
    private String source;
    /** 日志级别。 */
    private String level;
    /** 日志消息。 */
    private String message;
    /** 控制系统上报的原始载荷 JSON。 */
    private String payloadJson;
    /** 接收时间。 */
    private LocalDateTime createdAt;
}
