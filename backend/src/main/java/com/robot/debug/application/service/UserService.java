package com.robot.debug.application.service;

import com.robot.debug.interfaces.rest.DTO.UserDtos;
import java.util.List;

/**
 * 用户登录与用户资料管理服务接口。
 */
public interface UserService {
    /** 校验登录信息并返回脱敏用户资料。 */
    UserDtos.View login(UserDtos.LoginRequest request);

    /** 查询全部用户的脱敏视图。 */
    List<UserDtos.View> list();

    /** 按主键查询脱敏用户视图。 */
    UserDtos.View get(Long id);

    /** 新增用户。 */
    UserDtos.View create(UserDtos.CreateRequest request, String operator);

    /** 更新用户；空密码表示保留数据库原值。 */
    UserDtos.View update(Long id, UserDtos.UpdateRequest request, String operator);

    /** 删除指定用户。 */
    void delete(Long id, String operator);
}
