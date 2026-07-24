package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@TableName("command_record")
@Getter
@Setter
/**
 * 前端控制命令的完整生命周期记录。
 */
public class CommandRecordEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 协议消息唯一标识。 */
    private String messageId;
    /** 命令目标设备编号。 */
    private String deviceCode;
    /** 命令类型。 */
    private String commandType;
    /** 当前 HTTP 控制架构固定为 HTTP_ONLY。 */
    private String processingMode;
    /** 下发参数 JSON，不应被直接输出到控制台日志。 */
    private String payloadJson;
    /** 前端操作人。 */
    private String operatorName;
    /** 当前处理状态。 */
    private String status;
    /** 执行结果 JSON。 */
    private String resultJson;
    /** 失败或超时原因。 */
    private String errorMessage;
    /** 历史兼容字段，HTTP 控制请求不填写。 */
    private LocalDateTime sentAt;
    /** 历史兼容字段，HTTP 控制请求不填写。 */
    private LocalDateTime ackedAt;
    /** 生命周期结束时间。 */
    private LocalDateTime finishedAt;
    /** 记录创建时间。 */
    private LocalDateTime createdAt;
}
