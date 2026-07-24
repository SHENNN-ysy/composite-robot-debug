package com.robot.debug.interfaces.rest;

import com.robot.debug.application.service.UserService;
import com.robot.debug.common.result.Result;
import com.robot.debug.interfaces.rest.DTO.UserDtos;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
/**
 * 用户资料 REST 接口。
 *
 * <p>所有响应均使用脱敏视图，绝不返回密码字段。</p>
 */
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    /** 查询用户列表。 */
    @GetMapping
    public Result<List<UserDtos.View>> list() { return Result.success(service.list()); }

    /** 查询单个用户。 */
    @GetMapping("/{id}")
    public Result<UserDtos.View> get(@PathVariable Long id) { return Result.success(service.get(id)); }

    /** 新增用户。 */
    @PostMapping
    public Result<UserDtos.View> create(@Valid @RequestBody UserDtos.CreateRequest request,
                                              @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.create(request, operator));
    }

    /** 更新用户；空密码不会覆盖旧密码。 */
    @PutMapping("/{id}")
    public Result<UserDtos.View> update(@PathVariable Long id,
                                              @Valid @RequestBody UserDtos.UpdateRequest request,
                                              @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.update(id, request, operator));
    }

    /** 删除用户。 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id,
                                    @RequestHeader(value = "X-Operator", required = false) String operator) {
        service.delete(id, operator);
        return Result.success();
    }
}
