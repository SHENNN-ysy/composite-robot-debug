package com.robot.debug.application.service;

import com.robot.debug.application.model.CommandRecordEntity;
import com.robot.debug.application.model.DeviceLogEntity;
import com.robot.debug.application.model.OperationLogEntity;
import java.util.List;

/**
 * 日志与命令记录查询服务接口。
 */
public interface QueryService {
    /** 查询最近的操作审计日志。 */
    List<OperationLogEntity> operationLogs();

    /** 查询最近的设备日志。 */
    List<DeviceLogEntity> deviceLogs();

    /** 查询最近的命令生命周期记录。 */
    List<CommandRecordEntity> commands();
}
