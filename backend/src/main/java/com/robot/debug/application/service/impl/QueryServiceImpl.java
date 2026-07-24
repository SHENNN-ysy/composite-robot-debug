package com.robot.debug.application.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.robot.debug.application.service.QueryService;
import com.robot.debug.application.model.CommandRecordEntity;
import com.robot.debug.application.model.DeviceLogEntity;
import com.robot.debug.application.model.OperationLogEntity;
import com.robot.debug.application.repository.CommandRecordMapper;
import com.robot.debug.application.repository.DeviceLogMapper;
import com.robot.debug.application.repository.OperationLogMapper;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 操作日志、设备日志和命令记录查询服务实现。
 */
@Service
@Slf4j
public class QueryServiceImpl implements QueryService {
    private static final int MAX_ROWS = 500;
    private final OperationLogMapper operationLogMapper;
    private final DeviceLogMapper deviceLogMapper;
    private final CommandRecordMapper commandRecordMapper;

    public QueryServiceImpl(OperationLogMapper operationLogMapper, DeviceLogMapper deviceLogMapper,
                            CommandRecordMapper commandRecordMapper) {
        this.operationLogMapper = operationLogMapper;
        this.deviceLogMapper = deviceLogMapper;
        this.commandRecordMapper = commandRecordMapper;
    }

    /** 查询最近的操作审计日志。 */
    @Override
    public List<OperationLogEntity> operationLogs() {
        List<OperationLogEntity> rows = operationLogMapper.selectList(Wrappers.<OperationLogEntity>lambdaQuery()
                .orderByDesc(OperationLogEntity::getCreatedAt).last("LIMIT " + MAX_ROWS));
        log.info("操作日志查询完成 count={}", rows.size());
        return rows;
    }

    /** 查询最近的设备日志。 */
    @Override
    public List<DeviceLogEntity> deviceLogs() {
        List<DeviceLogEntity> rows = deviceLogMapper.selectList(Wrappers.<DeviceLogEntity>lambdaQuery()
                .orderByDesc(DeviceLogEntity::getCreatedAt).last("LIMIT " + MAX_ROWS));
        log.debug("设备日志查询完成 count={}", rows.size());
        return rows;
    }

    /** 查询最近的命令生命周期记录。 */
    @Override
    public List<CommandRecordEntity> commands() {
        List<CommandRecordEntity> rows = commandRecordMapper.selectList(Wrappers.<CommandRecordEntity>lambdaQuery()
                .orderByDesc(CommandRecordEntity::getCreatedAt).last("LIMIT " + MAX_ROWS));
        log.debug("命令记录查询完成 count={}", rows.size());
        return rows;
    }
}
