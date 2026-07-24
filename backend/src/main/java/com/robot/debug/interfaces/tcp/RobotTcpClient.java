package com.robot.debug.interfaces.tcp;

import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import io.netty.handler.codec.LineBasedFrameDecoder;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.timeout.IdleStateHandler;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

/**
 * 连接机器人控制系统 TCP 服务端的 Netty 客户端。
 *
 * <p>该连接只接收控制系统上报的数据，不向控制系统写入参数或控制命令。
 * 当前暂用 UTF-8 换行 JSON 分帧，待正式 TCP 协议确定后只需替换管道解码器。</p>
 */
@Component
@Slf4j
public class RobotTcpClient implements SmartLifecycle {
    private final RobotTcpHandler handler;
    private final String host;
    private final int port;
    private final int maxFrameLength;
    private final int dataTimeoutSeconds;
    private final int reconnectDelaySeconds;
    private volatile boolean running;
    private EventLoopGroup workerGroup;
    private Bootstrap bootstrap;
    private volatile Channel channel;

    public RobotTcpClient(
            RobotTcpHandler handler,
            @Value("${robot.tcp.host:127.0.0.1}") String host,
            @Value("${robot.tcp.port:9000}") int port,
            @Value("${robot.tcp.max-frame-length:2097152}") int maxFrameLength,
            @Value("${robot.tcp.data-timeout-seconds:15}") int dataTimeoutSeconds,
            @Value("${robot.tcp.reconnect-delay-seconds:3}") int reconnectDelaySeconds) {
        this.handler = handler;
        this.host = host;
        this.port = port;
        this.maxFrameLength = maxFrameLength;
        this.dataTimeoutSeconds = dataTimeoutSeconds;
        this.reconnectDelaySeconds = reconnectDelaySeconds;
    }

    /**
     * 初始化客户端线程组并发起首次非阻塞连接。
     */
    @Override
    public void start() {
        if (running) return;
        running = true;
        workerGroup = new NioEventLoopGroup(1);
        bootstrap = new Bootstrap()
                .group(workerGroup)
                .channel(NioSocketChannel.class)
                .option(ChannelOption.TCP_NODELAY, true)
                .option(ChannelOption.SO_KEEPALIVE, true)
                .handler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel socketChannel) {
                        socketChannel.pipeline()
                                .addLast(new LineBasedFrameDecoder(maxFrameLength, true, true))
                                .addLast(new StringDecoder(StandardCharsets.UTF_8))
                                .addLast(new IdleStateHandler(dataTimeoutSeconds, 0, 0, TimeUnit.SECONDS))
                                .addLast(handler);
                    }
                });
        log.info("机器人TCP客户端已启动 server={}:{} maxFrameLength={} dataTimeoutSeconds={}",
                host, port, maxFrameLength, dataTimeoutSeconds);
        connect();
    }

    /** 连接控制系统服务端；失败或断开后按固定间隔自动重连。 */
    private void connect() {
        if (!running) return;
        log.info("正在连接机器人控制系统TCP服务 server={}:{}", host, port);
        bootstrap.connect(host, port).addListener((ChannelFutureListener) future -> {
            if (!running) {
                if (future.isSuccess()) future.channel().close();
                return;
            }
            if (!future.isSuccess()) {
                log.warn("机器人TCP连接失败 server={}:{} reconnectAfterSeconds={}",
                        host, port, reconnectDelaySeconds, future.cause());
                scheduleReconnect();
                return;
            }
            channel = future.channel();
            log.info("机器人TCP连接成功 server={}:{} local={}", host, port, channel.localAddress());
            channel.closeFuture().addListener(ignored -> {
                channel = null;
                if (running) scheduleReconnect();
            });
        });
    }

    /** 在 Netty 事件循环中安排下一次重连，避免阻塞 Spring 启动线程。 */
    private void scheduleReconnect() {
        if (running && workerGroup != null && !workerGroup.isShuttingDown()) {
            workerGroup.schedule(this::connect, reconnectDelaySeconds, TimeUnit.SECONDS);
        }
    }

    /** 关闭当前连接和客户端线程组。 */
    @Override
    public void stop() {
        log.info("正在停止机器人TCP客户端 server={}:{}", host, port);
        running = false;
        Channel current = channel;
        channel = null;
        if (current != null) current.close();
        if (workerGroup != null) workerGroup.shutdownGracefully();
        log.info("机器人TCP客户端停止请求已提交 server={}:{}", host, port);
    }

    /** 返回客户端生命周期状态。 */
    @Override
    public boolean isRunning() {
        return running;
    }

    /** 随 Spring 容器自动启动。 */
    @Override
    public boolean isAutoStartup() {
        return true;
    }

    /** 在大部分 Spring Bean 就绪后启动 TCP 客户端。 */
    @Override
    public int getPhase() {
        return Integer.MAX_VALUE - 100;
    }
}
