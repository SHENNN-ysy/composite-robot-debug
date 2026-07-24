package com.robot.debug.application.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.robot.debug.application.constants.DeviceConstants;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.TeachPointService;
import com.robot.debug.application.util.OperatorUtils;
import com.robot.debug.common.BizException;
import com.robot.debug.application.model.TeachPointEntity;
import com.robot.debug.application.repository.TeachPointMapper;
import com.robot.debug.interfaces.rest.DTO.TeachPointDtos;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 机械臂示教点业务服务实现。
 */
@Service
@Slf4j
public class TeachPointServiceImpl implements TeachPointService {
    /** 单机原型固定机械臂编号。 */
    private static final String ARM_DEVICE_CODE = DeviceConstants.ARM_CODE;

    private final TeachPointMapper mapper;
    private final AuditService auditService;

    public TeachPointServiceImpl(TeachPointMapper mapper, AuditService auditService) {
        this.mapper = mapper;
        this.auditService = auditService;
    }

    /** 按最后更新时间倒序返回全部示教点。 */
    @Override
    public List<TeachPointDtos.View> list() {
        List<TeachPointDtos.View> points = mapper.selectList(
                        Wrappers.<TeachPointEntity>lambdaQuery()
                                .eq(TeachPointEntity::getDeviceCode, ARM_DEVICE_CODE)
                                .orderByDesc(TeachPointEntity::getUpdatedAt))
                .stream().map(this::toView).toList();
        log.debug("示教点列表查询完成 deviceCode={} count={}", ARM_DEVICE_CODE, points.size());
        return points;
    }

    /** 校验名称唯一后保存示教点。 */
    @Override
    @Transactional
    public TeachPointDtos.View create(TeachPointDtos.SaveRequest request, String operator) {
        String name = request.name().trim();
        ensureNameAvailable(name, null);
        log.info("创建示教点开始 operator={} deviceCode={} name={}", operator, ARM_DEVICE_CODE, name);
        TeachPointEntity entity = new TeachPointEntity();
        entity.setDeviceCode(ARM_DEVICE_CODE);
        copy(request, entity);
        entity.setName(name);
        entity.setCreatedBy(OperatorUtils.normalize(operator));
        entity.setUpdatedBy(OperatorUtils.normalize(operator));
        mapper.insert(entity);
        auditService.record(operator, "CREATE", "TEACH_POINT", String.valueOf(entity.getId()),
                Map.of("deviceCode", ARM_DEVICE_CODE, "name", name), "SUCCESS");
        log.info("创建示教点成功 teachPointId={} deviceCode={} name={}",
                entity.getId(), ARM_DEVICE_CODE, name);
        return toView(getEntity(entity.getId()));
    }

    /** 更新坐标和修改人，并保持同一机械臂下名称唯一。 */
    @Override
    @Transactional
    public TeachPointDtos.View update(Long id, TeachPointDtos.SaveRequest request, String operator) {
        TeachPointEntity entity = getEntity(id);
        String name = request.name().trim();
        ensureNameAvailable(name, id);
        log.info("更新示教点开始 operator={} teachPointId={} name={}", operator, id, name);
        copy(request, entity);
        entity.setName(name);
        entity.setUpdatedBy(OperatorUtils.normalize(operator));
        mapper.updateById(entity);
        auditService.record(operator, "UPDATE", "TEACH_POINT", String.valueOf(id),
                Map.of("deviceCode", ARM_DEVICE_CODE, "name", name), "SUCCESS");
        log.info("更新示教点成功 teachPointId={} name={}", id, name);
        return toView(getEntity(id));
    }

    /** 删除示教点并记录操作审计。 */
    @Override
    @Transactional
    public void delete(Long id, String operator) {
        TeachPointEntity entity = getEntity(id);
        log.info("删除示教点开始 operator={} teachPointId={} name={}", operator, id, entity.getName());
        mapper.deleteById(id);
        auditService.record(operator, "DELETE", "TEACH_POINT", String.valueOf(id),
                Map.of("deviceCode", ARM_DEVICE_CODE, "name", entity.getName()), "SUCCESS");
        log.info("删除示教点成功 teachPointId={} name={}", id, entity.getName());
    }

    /** 查询示教点实体，不存在时返回统一业务异常。 */
    private TeachPointEntity getEntity(Long id) {
        TeachPointEntity entity = mapper.selectById(id);
        if (entity == null || !ARM_DEVICE_CODE.equals(entity.getDeviceCode())) {
            log.warn("示教点查询失败 teachPointId={} reason=NOT_FOUND", id);
            throw BizException.notFound("示教点不存在");
        }
        return entity;
    }

    /** 检查同一机械臂下示教点名称是否已被占用。 */
    private void ensureNameAvailable(String name, Long excludedId) {
        var query = Wrappers.<TeachPointEntity>lambdaQuery()
                .eq(TeachPointEntity::getDeviceCode, ARM_DEVICE_CODE)
                .eq(TeachPointEntity::getName, name);
        if (excludedId != null) query.ne(TeachPointEntity::getId, excludedId);
        if (mapper.selectCount(query) > 0) {
            log.warn("示教点名称冲突 deviceCode={} name={} excludedId={}",
                    ARM_DEVICE_CODE, name, excludedId);
            throw BizException.conflict("示教点名称已存在");
        }
    }

    /** 将保存请求中的完整坐标复制到实体。 */
    private void copy(TeachPointDtos.SaveRequest request, TeachPointEntity entity) {
        entity.setName(request.name());
        entity.setX(request.x());
        entity.setY(request.y());
        entity.setZ(request.z());
        entity.setRx(request.rx());
        entity.setRy(request.ry());
        entity.setRz(request.rz());
        entity.setJ1(request.j1());
        entity.setJ2(request.j2());
        entity.setJ3(request.j3());
        entity.setJ4(request.j4());
        entity.setJ5(request.j5());
        entity.setJ6(request.j6());
    }

    /** 将实体转换为 REST 响应。 */
    private TeachPointDtos.View toView(TeachPointEntity entity) {
        return new TeachPointDtos.View(
                entity.getId(), entity.getDeviceCode(), entity.getName(),
                entity.getX(), entity.getY(), entity.getZ(),
                entity.getRx(), entity.getRy(), entity.getRz(),
                entity.getJ1(), entity.getJ2(), entity.getJ3(),
                entity.getJ4(), entity.getJ5(), entity.getJ6(),
                entity.getCreatedBy(), entity.getUpdatedBy(),
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

}
