package com.robot.debug.common;

import com.robot.debug.common.result.Result;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
/**
 * 全局异常转换器，保证 REST 接口始终返回统一响应结构。
 */
public class GlobalExceptionHandler {
    /** 处理可预期业务异常，不输出敏感请求内容。 */
    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result<Void>> handleBiz(BizException exception) {
        log.warn("业务请求失败 code={} status={} message={}",
                exception.code(), exception.status().value(), exception.getMessage());
        return ResponseEntity.status(exception.status())
                .body(Result.error(exception.errorCode(), exception.getMessage()));
    }

    /** 处理 Bean Validation 参数校验异常。 */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class, ConstraintViolationException.class})
    public ResponseEntity<Result<Void>> handleValidation(Exception exception) {
        log.warn("请求参数校验失败 exceptionType={}", exception.getClass().getSimpleName());
        return ResponseEntity.badRequest().body(Result.error(ErrorCode.VALIDATION_ERROR, "请求参数不合法"));
    }

    /** 兜底处理未预期异常，并保留完整堆栈便于联调定位。 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnknown(Exception exception) {
        log.error("未处理的系统异常", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(ErrorCode.INTERNAL_ERROR, "系统内部错误"));
    }
}
