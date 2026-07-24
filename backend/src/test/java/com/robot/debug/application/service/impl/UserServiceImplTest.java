package com.robot.debug.application.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.UserService;
import com.robot.debug.application.model.UserEntity;
import com.robot.debug.application.repository.UserMapper;
import com.robot.debug.interfaces.rest.DTO.UserDtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
/**
 * 用户服务密码脱敏和更新语义测试。
 */
class UserServiceImplTest {
    @Mock private UserMapper mapper;
    @Mock private AuditService auditService;
    private UserService service;
    private UserEntity entity;

    /** 为每个测试构造包含明文密码的数据库实体。 */
    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(mapper, auditService);
        entity = new UserEntity();
        entity.setId(1L);
        entity.setUsername("admin");
        entity.setPassword("plain-password");
        entity.setNickname("管理员");
        entity.setRole("ADMIN");
        entity.setEnabled(true);
    }

    /** 登录可比较明文密码，但响应只能暴露是否已设置密码。 */
    @Test
    void loginComparesPlainPasswordButResponseContainsOnlyPasswordFlag() {
        when(mapper.selectOne(any())).thenReturn(entity);

        UserDtos.View view = service.login(new UserDtos.LoginRequest("admin", "plain-password"));

        assertEquals("admin", view.username());
        assertTrue(view.passwordSet());
    }

    /** 更新请求中的空密码必须保留数据库原密码。 */
    @Test
    void blankPasswordOnUpdateKeepsStoredPassword() {
        when(mapper.selectById(1L)).thenReturn(entity);

        service.update(1L, new UserDtos.UpdateRequest(null, "", "新昵称", null, null), "operator");

        assertEquals("plain-password", entity.getPassword());
        verify(mapper).updateById(entity);
    }
}
