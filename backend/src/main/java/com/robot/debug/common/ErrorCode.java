package com.robot.debug.common;

/**
 * REST 接口业务错误码。
 *
 * <p>错误码只出现在失败响应中，成功响应依靠 HTTP 2xx 状态判断。
 * 所有新增业务错误码应集中维护在此处，避免在业务代码中散落字符串。</p>
 */
public enum ErrorCode {
    /** 用户名、密码错误或账号被禁用。 */
    LOGIN_FAILED,
    /** 请求体格式或业务参数不符合要求。 */
    BAD_REQUEST,
    /** Bean Validation 参数校验未通过。 */
    VALIDATION_ERROR,
    /** 请求的业务资源不存在。 */
    NOT_FOUND,
    /** 唯一键或业务状态发生冲突。 */
    CONFLICT,
    /** 未预期的服务端异常。 */
    INTERNAL_ERROR
}
