package com.robot.debug.application.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.robot.debug.application.converter.DeviceConverter;
import com.robot.debug.application.service.AuditService;
import com.robot.debug.application.service.DeviceService;
import com.robot.debug.common.BizException;
import com.robot.debug.application.model.DeviceEntity;
import com.robot.debug.application.repository.DeviceMapper;
import com.robot.debug.interfaces.rest.DTO.DeviceDtos;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 设备资料及在线状态服务实现。
 */
@Service
@Slf4j
public class DeviceServiceImpl implements DeviceService {
    private final DeviceMapper mapper;
    private final AuditService auditService;

    public DeviceServiceImpl(DeviceMapper mapper, AuditService auditService) {
        this.mapper = mapper;
        this.auditService = auditService;
    }

    /** 查询复合机器人、机械臂和 AGV 列表。 */
    @Override
    public List<DeviceDtos.View> list() {
        List<DeviceDtos.View> devices = mapper.selectList(Wrappers.<DeviceEntity>lambdaQuery().orderByAsc(DeviceEntity::getId))
                .stream().map(DeviceConverter::toView).toList();
        log.debug("设备列表查询完成 count={}", devices.size());
        return devices;
    }

    /** 按主键查询设备。 */
    @Override
    public DeviceDtos.View get(Long id) {
        DeviceEntity entity = mapper.selectById(id);
        if (entity == null) {
            log.warn("设备查询失败 deviceId={} reason=NOT_FOUND", id);
            throw BizException.notFound("设备不存在");
        }
        return DeviceConverter.toView(entity);
    }

    /** 更新允许由调试页面维护的设备基础信息。 */
    @Override
    @Transactional
    public DeviceDtos.View update(Long id, DeviceDtos.UpdateRequest request, String operator) {
        log.info("更新设备开始 operator={} deviceId={}", operator, id);
        DeviceEntity entity = mapper.selectById(id);
        if (entity == null) {
            log.warn("更新设备失败 deviceId={} reason=NOT_FOUND", id);
            throw BizException.notFound("设备不存在");
        }
        if (request.deviceCode() != null && !request.deviceCode().isBlank()) entity.setDeviceCode(request.deviceCode());
        if (request.name() != null && !request.name().isBlank()) entity.setName(request.name());
        if (request.model() != null) entity.setModel(request.model());
        if (request.configJson() != null) entity.setConfigJson(request.configJson());
        mapper.updateById(entity);
        auditService.record(operator, "UPDATE", "DEVICE", String.valueOf(id),
                Map.of("deviceCode", entity.getDeviceCode(), "name", entity.getName()), "SUCCESS");
        log.info("更新设备成功 deviceId={} deviceCode={} name={}", id, entity.getDeviceCode(), entity.getName());
        return DeviceConverter.toView(entity);
    }

    /** 根据 TCP 会话变化批量刷新三个固定设备的在线状态。 */
    @Override
    @Transactional
    public void markConnection(boolean online, List<String> deviceCodes) {
        LocalDateTime now = LocalDateTime.now();
        int updated = 0;
        for (String code : deviceCodes) {
            DeviceEntity entity = mapper.selectOne(Wrappers.<DeviceEntity>lambdaQuery().eq(DeviceEntity::getDeviceCode, code));
            if (entity != null) {
                entity.setOnline(online);
                entity.setLastCommunicationAt(now);
                mapper.updateById(entity);
                updated++;
            } else {
                log.warn("刷新设备连接状态时未找到设备 deviceCode={} online={}", code, online);
            }
        }
        log.debug("设备连接状态已刷新 online={} requested={} updated={}", online, deviceCodes.size(), updated);
    }

}
