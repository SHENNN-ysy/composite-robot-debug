package com.robot.debug.application.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.UserService;
import com.robot.debug.common.BizException;
import com.robot.debug.common.ErrorCode;
import com.robot.debug.application.model.UserEntity;
import com.robot.debug.application.repository.UserMapper;
import com.robot.debug.interfaces.rest.DTO.UserDtos;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 用户登录与用户资料管理服务实现。
 *
 * <p>任何日志都不得包含密码值。</p>
 */
@Service
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserMapper mapper;
    private final AuditService auditService;

    public UserServiceImpl(UserMapper mapper, AuditService auditService) {
        this.mapper = mapper;
        this.auditService = auditService;
    }

    /** 校验用户名、启用状态和明文密码，成功后仅返回脱敏用户视图。 */
    @Override
    public UserDtos.View login(UserDtos.LoginRequest request) {
        log.info("用户登录校验开始 username={}", request.username());
        UserEntity user = mapper.selectOne(Wrappers.<UserEntity>lambdaQuery()
                .eq(UserEntity::getUsername, request.username()));
        if (user == null || !Boolean.TRUE.equals(user.getEnabled()) || !user.getPassword().equals(request.password())) {
            log.warn("用户登录失败 username={} reason=INVALID_CREDENTIALS_OR_DISABLED", request.username());
            throw new BizException(ErrorCode.LOGIN_FAILED, "用户名或密码错误", HttpStatus.BAD_REQUEST);
        }
        auditService.record(user.getUsername(), "LOGIN", "USER", String.valueOf(user.getId()), Map.of(), "SUCCESS");
        log.info("用户登录成功 userId={} username={} role={}", user.getId(), user.getUsername(), user.getRole());
        return toView(user);
    }

    /** 查询全部用户的脱敏视图。 */
    @Override
    public List<UserDtos.View> list() {
        List<UserDtos.View> users = mapper.selectList(Wrappers.<UserEntity>lambdaQuery().orderByAsc(UserEntity::getId))
                .stream().map(this::toView).toList();
        log.info("用户列表查询完成 count={}", users.size());
        return users;
    }

    /** 按主键查询脱敏用户视图。 */
    @Override
    public UserDtos.View get(Long id) {
        UserEntity user = mapper.selectById(id);
        if (user == null) {
            log.warn("用户查询失败 userId={} reason=NOT_FOUND", id);
            throw BizException.notFound("用户不存在");
        }
        return toView(user);
    }

    /** 新增用户，密码只写数据库，不写日志或审计详情。 */
    @Override
    @Transactional
    public UserDtos.View create(UserDtos.CreateRequest request, String operator) {
        log.info("创建用户开始 operator={} username={} role={}", operator, request.username(), request.role());
        Long count = mapper.selectCount(Wrappers.<UserEntity>lambdaQuery()
                .eq(UserEntity::getUsername, request.username()));
        if (count > 0) {
            log.warn("创建用户失败 username={} reason=DUPLICATE_USERNAME", request.username());
            throw BizException.conflict("用户名已存在");
        }
        UserEntity entity = new UserEntity();
        entity.setUsername(request.username());
        entity.setPassword(request.password());
        entity.setNickname(request.nickname());
        entity.setRole(request.role());
        entity.setEnabled(request.enabled() == null || request.enabled());
        mapper.insert(entity);
        auditService.record(operator, "CREATE", "USER", String.valueOf(entity.getId()),
                Map.of("username", entity.getUsername(), "role", entity.getRole()), "SUCCESS");
        log.info("创建用户成功 userId={} username={}", entity.getId(), entity.getUsername());
        return get(entity.getId());
    }

    /** 更新用户；空密码表示保留数据库原值。 */
    @Override
    @Transactional
    public UserDtos.View update(Long id, UserDtos.UpdateRequest request, String operator) {
        log.info("更新用户开始 operator={} userId={} passwordUpdated={}",
                operator, id, request.password() != null && !request.password().isBlank());
        UserEntity entity = mapper.selectById(id);
        if (entity == null) {
            log.warn("更新用户失败 userId={} reason=NOT_FOUND", id);
            throw BizException.notFound("用户不存在");
        }
        if (request.username() != null && !request.username().isBlank() && !request.username().equals(entity.getUsername())) {
            Long count = mapper.selectCount(Wrappers.<UserEntity>lambdaQuery()
                    .eq(UserEntity::getUsername, request.username()).ne(UserEntity::getId, id));
            if (count > 0) {
                log.warn("更新用户失败 userId={} username={} reason=DUPLICATE_USERNAME", id, request.username());
                throw BizException.conflict("用户名已存在");
            }
            entity.setUsername(request.username());
        }
        if (request.password() != null && !request.password().isBlank()) entity.setPassword(request.password());
        if (request.nickname() != null && !request.nickname().isBlank()) entity.setNickname(request.nickname());
        if (request.role() != null) entity.setRole(request.role());
        if (request.enabled() != null) entity.setEnabled(request.enabled());
        mapper.updateById(entity);
        auditService.record(operator, "UPDATE", "USER", String.valueOf(id),
                Map.of("username", entity.getUsername(), "role", entity.getRole()), "SUCCESS");
        log.info("更新用户成功 userId={} username={} role={} enabled={}",
                id, entity.getUsername(), entity.getRole(), entity.getEnabled());
        return get(id);
    }

    /** 删除指定用户并写入审计日志。 */
    @Override
    @Transactional
    public void delete(Long id, String operator) {
        log.info("删除用户开始 operator={} userId={}", operator, id);
        UserEntity entity = mapper.selectById(id);
        if (entity == null) {
            log.warn("删除用户失败 userId={} reason=NOT_FOUND", id);
            throw BizException.notFound("用户不存在");
        }
        mapper.deleteById(id);
        auditService.record(operator, "DELETE", "USER", String.valueOf(id),
                Map.of("username", entity.getUsername()), "SUCCESS");
        log.info("删除用户成功 userId={} username={}", id, entity.getUsername());
    }

    /** 将含密码的持久化实体转换为不含密码值的接口视图。 */
    private UserDtos.View toView(UserEntity entity) {
        return new UserDtos.View(entity.getId(), entity.getUsername(), entity.getNickname(), entity.getRole(),
                entity.getEnabled(), entity.getPassword() != null && !entity.getPassword().isBlank(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
