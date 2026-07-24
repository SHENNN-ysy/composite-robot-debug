#!/usr/bin/env python3
"""仅用于联调的控制系统 TCP 服务端，单向发送机械臂完整状态。"""

import json
import socket
import time

HOST = "127.0.0.1"
PORT = 9000


def create_arm_state():
    """创建包含姿态、关节和全部 IO 的示例状态。"""
    return {
        "x": 350.0,
        "y": 0.0,
        "z": 250.0,
        "rx": 180.0,
        "ry": 0.0,
        "rz": 0.0,
        "j1": 0.0,
        "j2": -45.0,
        "j3": 90.0,
        "j4": 0.0,
        "j5": 45.0,
        "j6": 0.0,
        "io": {
            group: [False] * 8
            for group in ("DI", "DO", "CI", "CO")
        },
        "running": False,
        "speed": 30,
        "mode": "manual",
    }


def serve():
    """监听 Java 后端客户端连接，并每秒单向发送一帧换行 JSON。"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((HOST, PORT))
        server.listen(1)
        print(f"模拟控制系统 TCP 服务端监听 {HOST}:{PORT}")
        while True:
            connection, address = server.accept()
            print(f"Java 后端已连接: {address}")
            try:
                with connection:
                    while True:
                        state = create_arm_state()
                        body = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
                        connection.sendall((body + "\n").encode("utf-8"))
                        time.sleep(1)
            except (BrokenPipeError, ConnectionResetError):
                print("Java 后端已断开，继续等待重连")


if __name__ == "__main__":
    serve()
