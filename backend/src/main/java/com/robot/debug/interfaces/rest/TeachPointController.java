package com.robot.debug.interfaces.rest;

import com.robot.debug.application.service.TeachPointService;
import com.robot.debug.common.result.Result;
import com.robot.debug.interfaces.rest.DTO.TeachPointDtos;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 机械臂示教点 REST 接口。
 */
@RestController
@RequestMapping("/api/teach-points")
public class TeachPointController {
    private final TeachPointService service;

    public TeachPointController(TeachPointService service) {
        this.service = service;
    }

    /** 查询全部示教点。 */
    @GetMapping
    public Result<List<TeachPointDtos.View>> list() {
        return Result.success(service.list());
    }

    /** 新增示教点。 */
    @PostMapping
    public Result<TeachPointDtos.View> create(
            @Valid @RequestBody TeachPointDtos.SaveRequest request,
            @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.create(request, operator));
    }

    /** 修改示教点。 */
    @PutMapping("/{id}")
    public Result<TeachPointDtos.View> update(
            @PathVariable Long id,
            @Valid @RequestBody TeachPointDtos.SaveRequest request,
            @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.update(id, request, operator));
    }

    /** 删除示教点。 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(
            @PathVariable Long id,
            @RequestHeader(value = "X-Operator", required = false) String operator) {
        service.delete(id, operator);
        return Result.success();
    }
}
