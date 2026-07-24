package com.robot.debug.interfaces.rest.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;

/**
 * 用户接口请求和响应对象集合。
 */
public final class UserDtos {
    /** 工具容器禁止实例化。 */
    private UserDtos() {}

    /** 登录请求；密码只参与服务端比较。 */
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    /** 新增用户请求。 */
    public record CreateRequest(
            @NotBlank String username,
            @NotBlank String password,
            @NotBlank String nickname,
            @NotBlank @Pattern(regexp = "SUPER_ADMIN|ADMIN|TECHNICIAN|USER") String role,
            Boolean enabled) {}

    /** 更新用户请求；password 为空时保留原值。 */
    public record UpdateRequest(
            String username,
            String password,
            String nickname,
            @Pattern(regexp = "SUPER_ADMIN|ADMIN|TECHNICIAN|USER") String role,
            Boolean enabled) {}

    /** 不包含密码值的用户响应视图。 */
    public record View(
            Long id,
            String username,
            String nickname,
            String role,
            Boolean enabled,
            Boolean passwordSet,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}
}
