package com.robot.debug.interfaces.rest;

import com.robot.debug.application.service.UserService;
import com.robot.debug.common.result.Result;
import com.robot.debug.interfaces.rest.DTO.UserDtos;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
/**
 * 登录接口。
 */
public class AuthController {
    private final UserService service;

    public AuthController(UserService service) {
        this.service = service;
    }

    /** 校验数据库中的用户名和明文密码并返回脱敏用户资料。 */
    @PostMapping("/login")
    public Result<UserDtos.View> login(@Valid @RequestBody UserDtos.LoginRequest request) {
        return Result.success(service.login(request));
    }
}
