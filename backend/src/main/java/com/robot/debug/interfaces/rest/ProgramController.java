package com.robot.debug.interfaces.rest;

import com.robot.debug.application.service.ProgramService;
import com.robot.debug.common.result.Result;
import com.robot.debug.interfaces.rest.DTO.ProgramDtos;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/programs")
/**
 * 流程与 Lua 程序 REST 接口。
 */
public class ProgramController {
    private final ProgramService service;

    public ProgramController(ProgramService service) { this.service = service; }

    /** 查询程序列表。 */
    @GetMapping
    public Result<List<ProgramDtos.View>> list() { return Result.success(service.list()); }

    /** 查询程序详情。 */
    @GetMapping("/{id}")
    public Result<ProgramDtos.View> get(@PathVariable Long id) { return Result.success(service.get(id)); }

    /** 保存新程序。 */
    @PostMapping
    public Result<ProgramDtos.View> create(@Valid @RequestBody ProgramDtos.SaveRequest request,
                                                 @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.create(request, operator));
    }

    /** 更新程序并递增版本。 */
    @PutMapping("/{id}")
    public Result<ProgramDtos.View> update(@PathVariable Long id,
                                                 @Valid @RequestBody ProgramDtos.SaveRequest request,
                                                 @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.update(id, request, operator));
    }

    /** 删除程序。 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id,
                                    @RequestHeader(value = "X-Operator", required = false) String operator) {
        service.delete(id, operator);
        return Result.success();
    }
}
