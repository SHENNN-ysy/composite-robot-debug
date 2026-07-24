package com.robot.debug.infrastructure.config;

import com.robot.debug.interfaces.websocket.ControlWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
/**
 * 前端控制 WebSocket 端点配置。
 */
public class WebSocketConfig implements WebSocketConfigurer {
    private final ControlWebSocketHandler handler;
    private final String path;

    public WebSocketConfig(ControlWebSocketHandler handler,
                           @Value("${robot.websocket.path:/ws/control}") String path) {
        this.handler = handler;
        this.path = path;
    }

    /** 注册控制端点；原型阶段允许任意来源访问。 */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, path).setAllowedOriginPatterns("*");
    }
}
