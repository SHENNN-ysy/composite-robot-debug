package com.robot.debug.application.service.impl;

import com.robot.debug.application.constants.DeviceConstants;
import com.robot.debug.application.enums.ControlCommandStatus;
import com.robot.debug.application.enums.ControlProcessingMode;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.CommandService;
import com.robot.debug.application.util.OperatorUtils;
import com.robot.debug.common.BizException;
import com.robot.debug.application.model.CommandRecordEntity;
import com.robot.debug.application.repository.CommandRecordMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.robot.debug.interfaces.rest.DTO.ControlCommandDtos;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 传统 HTTP 控制请求受理服务实现。
 *
 * <p>当前只校验、持久化并返回受理结果，不向控制系统 TCP 连接转发。</p>
 */
@Service
@Slf4j
public class CommandServiceImpl implements CommandService {
    private final CommandRecordMapper recordMapper;
    private final AuditService auditService;

    public CommandServiceImpl(CommandRecordMapper recordMapper, AuditService auditService) {
        this.recordMapper = recordMapper;
        this.auditService = auditService;
    }

    /** 保存控制请求及安全审计信息，明确标记为仅 HTTP 受理。 */
    @Override
    @Transactional
    public ControlCommandDtos.Response accept(String commandType, JsonNode data, String operator) {
        if (data == null || !data.isObject()) {
            log.warn("HTTP控制请求被拒绝 commandType={} reason=BODY_NOT_OBJECT", commandType);
            throw BizException.badRequest("请求体必须是JSON对象");
        }
        String requestId = UUID.randomUUID().toString();
        String normalizedOperator = OperatorUtils.normalize(operator);
        String deviceCode = deviceCodeFor(commandType);
        long acceptedAt = System.currentTimeMillis();

        CommandRecordEntity record = new CommandRecordEntity();
        record.setMessageId(requestId);
        record.setDeviceCode(deviceCode);
        record.setCommandType(commandType);
        record.setProcessingMode(ControlProcessingMode.HTTP_ONLY.name());
        record.setPayloadJson(data.toString());
        record.setOperatorName(normalizedOperator);
        record.setStatus(ControlCommandStatus.ACCEPTED.name());
        record.setFinishedAt(LocalDateTime.now());
        recordMapper.insert(record);

        auditService.record(normalizedOperator, "CONTROL_HTTP", "DEVICE", deviceCode,
                Map.of("commandType", commandType, "requestId", requestId, "transport", "HTTP"),
                ControlCommandStatus.ACCEPTED.name());
        log.info("HTTP控制请求已受理 requestId={} commandType={} deviceCode={} operator={} forwardedToTcp=false",
                requestId, commandType, deviceCode, normalizedOperator);
        return new ControlCommandDtos.Response(
                requestId, commandType, ControlCommandStatus.ACCEPTED.name(), acceptedAt);
    }

    /** 按命令语义前缀映射目标设备。 */
    private String deviceCodeFor(String commandType) {
        if (commandType.startsWith("arm.")) return DeviceConstants.ARM_CODE;
        if (commandType.startsWith("agv.")) return DeviceConstants.AGV_CODE;
        return DeviceConstants.COMPOSITE_CODE;
    }
}
