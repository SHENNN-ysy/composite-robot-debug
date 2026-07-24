package com.robot.debug;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 后端主启动类声明测试。
 *
 * <p>该测试不创建 Spring 上下文，因此不依赖本机 MySQL，但可以防止主类或关键注解被误删。</p>
 */
class RobotDebugApplicationTest {
    /** 验证主类、包扫描、定时任务和 Mapper 扫描配置均存在。 */
    @Test
    void mainClassContainsRequiredBootAnnotations() throws NoSuchMethodException {
        Class<RobotDebugApplication> applicationClass = RobotDebugApplication.class;

        SpringBootApplication springBoot = applicationClass.getAnnotation(SpringBootApplication.class);
        assertEquals("com.robot.debug", springBoot.scanBasePackages()[0]);
        assertTrue(applicationClass.isAnnotationPresent(EnableScheduling.class));
        assertEquals("com.robot.debug.application.repository",
                applicationClass.getAnnotation(MapperScan.class).basePackages()[0]);

        Method mainMethod = applicationClass.getMethod("main", String[].class);
        assertTrue(Modifier.isPublic(mainMethod.getModifiers()));
        assertTrue(Modifier.isStatic(mainMethod.getModifiers()));
    }
}
