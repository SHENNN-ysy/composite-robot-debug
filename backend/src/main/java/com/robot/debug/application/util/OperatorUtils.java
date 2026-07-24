package com.robot.debug.application.util;

/**
 * 操作人字段规范化工具。
 */
public final class OperatorUtils {
    /** 无法识别操作人时使用的固定值。 */
    public static final String UNKNOWN_OPERATOR = "unknown";

    /** 工具类禁止实例化。 */
    private OperatorUtils() {}

    /** 将空操作人统一转换为 unknown。 */
    public static String normalize(String operator) {
        return operator == null || operator.isBlank() ? UNKNOWN_OPERATOR : operator;
    }
}
