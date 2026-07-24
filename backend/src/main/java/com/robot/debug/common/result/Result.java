package com.robot.debug.common.result;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.robot.debug.common.ErrorCode;
import lombok.Data;

import java.io.Serializable;

/**
 * REST 接口统一响应。
 *
 * <p>成功响应只包含 {@code data}；失败响应包含 {@code code} 和
 * {@code message}。成功与失败由 HTTP 状态码区分。</p>
 *
 * @param <T> 业务数据类型
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> implements Serializable {
    private static final long serialVersionUID = 1L;

    /** 业务错误码，仅失败响应返回。 */
    private String code;
    /** 面向调用方的错误信息，仅失败响应返回。 */
    private String message;
    /** 业务数据。 */
    private T data;
    /** 创建不携带数据的成功响应。 */
    public static <T> Result<T> success() {
        return new Result<>();
    }

    /** 创建携带业务数据的成功响应。 */
    public static <T> Result<T> success(T object) {
        Result<T> result = new Result<>();
        result.data = object;
        return result;
    }

    /** 创建指定业务错误码的失败响应。 */
    public static <T> Result<T> error(ErrorCode errorCode, String message) {
        Result<T> result = new Result<>();
        result.code = errorCode.name();
        result.message = message;
        return result;
    }
}
