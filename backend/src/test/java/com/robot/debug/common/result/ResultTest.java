package com.robot.debug.common.result;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.robot.debug.common.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * REST 统一响应协议测试。
 */
class ResultTest {

    /** 成功响应序列化后不应包含业务码和消息。 */
    @Test
    void shouldOmitCodeAndMessageFromSuccessResponse() throws Exception {
        Result<List<String>> result = Result.success(List.of("data"));
        String json = new ObjectMapper().writeValueAsString(result);

        assertThat(result.getData()).containsExactly("data");
        assertThat(json).isEqualTo("{\"data\":[\"data\"]}");
        assertThat(json).doesNotContain("\"code\"", "\"message\"", "\"traceId\"");
    }

    /** 失败响应应分别保留错误码和可读错误信息。 */
    @Test
    void shouldBuildStructuredErrorResponse() {
        Result<Void> result = Result.error(ErrorCode.NOT_FOUND, "用户不存在");

        assertThat(result.getCode()).isEqualTo("NOT_FOUND");
        assertThat(result.getMessage()).isEqualTo("用户不存在");
    }
}
