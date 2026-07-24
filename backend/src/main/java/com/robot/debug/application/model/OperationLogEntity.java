package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@TableName("operation_log")
@Getter
@Setter
/**
 * 用户操作审计日志实体。
 */
public class OperationLogEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 操作人。 */
    private String operatorName;
    /** 操作动作。 */
    private String action;
    /** 目标类型。 */
    private String targetType;
    /** 目标标识。 */
    private String targetId;
    /** 已脱敏的操作详情 JSON。 */
    private String detailJson;
    /** 操作结果。 */
    private String result;
    /** 记录时间。 */
    private LocalDateTime createdAt;
}
