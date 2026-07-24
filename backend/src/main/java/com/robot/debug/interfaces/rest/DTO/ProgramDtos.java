package com.robot.debug.interfaces.rest.DTO;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * 程序接口请求和响应对象集合。
 */
public final class ProgramDtos {
    /** 工具容器禁止实例化。 */
    private ProgramDtos() {}

    /** 程序保存请求；Lua 文本不在此处解析或修改。 */
    public record SaveRequest(@NotBlank String name, @NotNull JsonNode flow, @NotNull String luaContent, String createdBy) {}
    /** 程序详情响应。 */
    public record View(Long id, String name, JsonNode flow, String luaContent, Integer version,
                       String createdBy, LocalDateTime createdAt, LocalDateTime updatedAt) {}
}
