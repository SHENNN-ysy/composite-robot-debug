package com.robot.debug.infrastructure.config;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.robot.debug.application.model.DeviceEntity;
import com.robot.debug.application.repository.DeviceMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@Slf4j
/**
 * 应用启动状态初始化器。
 *
 * <p>进程重启后不存在可复用的 TCP 会话，因此统一将数据库设备状态重置为离线。</p>
 */
public class StartupStateInitializer implements ApplicationRunner {
    private final DeviceMapper deviceMapper;

    public StartupStateInitializer(DeviceMapper deviceMapper) {
        this.deviceMapper = deviceMapper;
    }

    /** 清理上一次进程退出前残留的在线标记。 */
    @Override
    public void run(ApplicationArguments args) {
        DeviceEntity patch = new DeviceEntity();
        patch.setOnline(false);
        int affectedRows = deviceMapper.update(
                patch, Wrappers.<DeviceEntity>lambdaUpdate().eq(DeviceEntity::getOnline, true));
        log.info("启动设备状态初始化完成 resetOnlineRows={}", affectedRows);
    }
}
