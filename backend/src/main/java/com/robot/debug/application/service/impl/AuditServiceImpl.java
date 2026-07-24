package com.robot.debug.application.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.util.OperatorUtils;
import com.robot.debug.application.model.OperationLogEntity;
import com.robot.debug.application.repository.OperationLogMapper;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 操作审计日志服务实现。
 */
@Service
@Slf4j
public class AuditServiceImpl implements AuditService {
    private final OperationLogMapper mapper;
    private final ObjectMapper objectMapper;

    public AuditServiceImpl(OperationLogMapper mapper, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    /**
     * 保存一条不包含密码、Lua 正文等敏感内容的操作记录。
     */
    @Override
    public void record(String operator, String action, String targetType, String targetId,
                       Map<String, ?> detail, String result) {
        OperationLogEntity entity = new OperationLogEntity();
        entity.setOperatorName(OperatorUtils.normalize(operator));
        entity.setAction(action);
        entity.setTargetType(targetType);
        entity.setTargetId(targetId);
        entity.setDetailJson(toJson(detail));
        entity.setResult(result);
        mapper.insert(entity);
        log.info("操作审计已记录 operator={} action={} targetType={} targetId={} result={}",
                entity.getOperatorName(), action, targetType, targetId, result);
    }

    /** 将安全的详情字段序列化为 JSON，失败时退化为空对象。 */
    private String toJson(Map<String, ?> detail) {
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (JsonProcessingException exception) {
            log.warn("操作审计详情序列化失败 detailKeys={}", detail.keySet(), exception);
            return "{}";
        }
    }
}
