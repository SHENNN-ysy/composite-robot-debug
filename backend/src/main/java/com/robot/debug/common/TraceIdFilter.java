package com.robot.debug.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Slf4j
/**
 * 为每个 HTTP 请求建立仅供后端日志使用的 traceId，并记录请求完成状态与耗时。
 *
 * <p>traceId 不写入响应体或响应头。日志只记录请求方法、路径和响应码，
 * 不记录请求体，防止密码或 Lua 内容泄漏。</p>
 */
public class TraceIdFilter extends OncePerRequestFilter {
    /** 注入 traceId，执行过滤链并在结束后清理线程上下文。 */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }
        MDC.put("traceId", traceId);
        try {
            chain.doFilter(request, response);
        } finally {
            long durationMillis = (System.nanoTime() - startedAt) / 1_000_000;
            log.info("HTTP请求完成 method={} path={} status={} durationMs={}",
                    request.getMethod(), request.getRequestURI(), response.getStatus(), durationMillis);
            MDC.remove("traceId");
        }
    }
}
