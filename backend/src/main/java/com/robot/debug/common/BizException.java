package com.robot.debug.common;

import org.springframework.http.HttpStatus;

/**
 * 可直接转换成 HTTP 响应的业务异常。
 */
public class BizException extends RuntimeException {
    private final ErrorCode errorCode;
    private final HttpStatus status;

    /** 创建指定业务码与 HTTP 状态的异常。 */
    public BizException(ErrorCode errorCode, String message, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    /** 返回业务错误码。 */
    public String code() {
        return errorCode.name();
    }

    /** 返回业务错误码枚举。 */
    public ErrorCode errorCode() {
        return errorCode;
    }

    /** 返回对应的 HTTP 状态。 */
    public HttpStatus status() {
        return status;
    }

    /** 创建资源不存在异常。 */
    public static BizException notFound(String message) {
        return new BizException(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
    }

    /** 创建请求参数错误异常。 */
    public static BizException badRequest(String message) {
        return new BizException(ErrorCode.BAD_REQUEST, message, HttpStatus.BAD_REQUEST);
    }

    /** 创建数据冲突异常。 */
    public static BizException conflict(String message) {
        return new BizException(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
    }
}
