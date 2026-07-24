package com.robot.debug.interfaces.rest.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * 示教点接口请求和响应对象集合。
 */
public final class TeachPointDtos {
    /** 工具容器禁止实例化。 */
    private TeachPointDtos() {}

    /** 新增和修改示教点使用的完整坐标请求。 */
    public record SaveRequest(
            @NotBlank @Size(max = 64) String name,
            @NotNull Double x,
            @NotNull Double y,
            @NotNull Double z,
            @NotNull Double rx,
            @NotNull Double ry,
            @NotNull Double rz,
            @NotNull Double j1,
            @NotNull Double j2,
            @NotNull Double j3,
            @NotNull Double j4,
            @NotNull Double j5,
            @NotNull Double j6) {}

    /** 返回前端的示教点详情。 */
    public record View(
            Long id,
            String deviceCode,
            String name,
            Double x,
            Double y,
            Double z,
            Double rx,
            Double ry,
            Double rz,
            Double j1,
            Double j2,
            Double j3,
            Double j4,
            Double j5,
            Double j6,
            String createdBy,
            String updatedBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {}
}
