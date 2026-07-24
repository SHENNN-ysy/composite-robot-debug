package com.robot.debug;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 复合机器人单机联调后端启动入口。
 *
 * <p>启动 Spring MVC、WebSocket、MyBatis-Plus、定时任务以及 Netty TCP 客户端。</p>
 */
@SpringBootApplication(scanBasePackages = "com.robot.debug")
@EnableScheduling
@MapperScan(basePackages = "com.robot.debug.application.repository")
public class RobotDebugApplication {
    /**
     * 启动应用。
     *
     * @param args JVM 启动参数
     */
    public static void main(String[] args) {
        SpringApplication.run(RobotDebugApplication.class, args);
    }
}
