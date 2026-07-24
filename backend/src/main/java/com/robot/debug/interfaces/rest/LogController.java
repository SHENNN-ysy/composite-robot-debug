package com.robot.debug.interfaces.rest;

import com.robot.debug.application.service.QueryService;
import com.robot.debug.common.result.Result;
import com.robot.debug.application.model.CommandRecordEntity;
import com.robot.debug.application.model.DeviceLogEntity;
import com.robot.debug.application.model.OperationLogEntity;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
/**
 * 日志和命令记录只读查询接口。
 */
public class LogController {
    private final QueryService service;

    public LogController(QueryService service) { this.service = service; }

    /** 查询最近操作审计日志。 */
    @GetMapping("/logs/operations")
    public Result<List<OperationLogEntity>> operationLogs() { return Result.success(service.operationLogs()); }

    /** 查询最近设备日志和告警。 */
    @GetMapping("/logs/devices")
    public Result<List<DeviceLogEntity>> deviceLogs() { return Result.success(service.deviceLogs()); }

    /** 查询最近命令生命周期记录。 */
    @GetMapping("/commands")
    public Result<List<CommandRecordEntity>> commands() { return Result.success(service.commands()); }
}
