package com.robot.debug.application.service;

import java.util.Map;

/**
 * 操作审计日志服务接口。
 */
public interface AuditService {
    /**
     * 保存一条不包含密码、Lua 正文等敏感内容的操作记录。
     *
     * @param operator 操作人
     * @param action 操作动作
     * @param targetType 目标类型
     * @param targetId 目标标识
     * @param detail 已脱敏的详情字段
     * @param result 操作结果
     */
    void record(String operator, String action, String targetType, String targetId,
                Map<String, ?> detail, String result);
}
