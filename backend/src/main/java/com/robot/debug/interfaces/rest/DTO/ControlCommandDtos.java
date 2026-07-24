package com.robot.debug.interfaces.rest.DTO;

/**
 * 传统 HTTP 控制请求的响应对象。
 */
public final class ControlCommandDtos {
    /** 工具容器禁止实例化。 */
    private ControlCommandDtos() {}

    /** 后端受理结果；不代表控制系统已经收到或执行。 */
    public record Response(String requestId, String commandType, String status, long acceptedAt) {}
}
