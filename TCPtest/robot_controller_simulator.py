#!/usr/bin/env python3
"""机器人控制系统 TCP 服务端模拟器。

仅用于本地联调：作为 TCP 服务端监听 127.0.0.1:9000，
按照 ``backend/TCP_PROTOCOL.md`` 约定，向 Java 后端 TCP 客户端
单向推送机械臂完整状态 JSON（UTF-8 换行分帧）。

字段嵌套三段式（与后端归一化输出、前端订阅载荷保持一致）：
- 姿态：tcp.{x, y, z, rx, ry, rz}
- 关节：joints.{j1, j2, j3, j4, j5, j6}
- IO：io.{DI, DO, CI, CO} 各 8 个布尔值
- 可选（顶层）：running / speed / mode
"""

from __future__ import annotations

import json
import math
import socket
import sys
import threading
import time
from typing import Callable


# ----------------------------- 协议默认值 -----------------------------

HOST = "127.0.0.1"
PORT = 9000
PUSH_INTERVAL_SECONDS = 0.2  # 5Hz，默认每秒推送 5 帧机械臂状态


# ----------------------------- 状态生成 -----------------------------

def make_initial_state() -> dict:
    """构造满足后端校验的初始状态帧（嵌套 tcp/joints/io 三段式）。"""
    return {
        "tcp": {"x": 350.0, "y": 0.0, "z": 250.0, "rx": 180.0, "ry": 0.0, "rz": 0.0},
        "joints": {"j1": 0.0, "j2": -45.0, "j3": 90.0, "j4": 0.0, "j5": 45.0, "j6": 0.0},
        "io": {group: [False] * 8 for group in ("DI", "DO", "CI", "CO")},
        "running": False,
        "speed": 30,
        "mode": "manual",
    }


def serialize(state: dict) -> bytes:
    """按规范编码为单行 JSON，并在结尾追加换行作为分帧。"""
    return (json.dumps(state, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


# ----------------------------- 预设场景 -----------------------------

def scenario_static(_: float, state: dict) -> None:
    """不修改状态，仅用于验证链路。"""
    return None


def scenario_circles(t: float, state: dict) -> None:
    """TCP 位置沿半径 80mm 的圆周运动，周期 6s。"""
    radius = 80.0
    omega = 2 * math.pi / 6.0
    state["tcp"]["x"] = 350.0 + radius * math.cos(omega * t)
    state["tcp"]["y"] = radius * math.sin(omega * t)
    state["running"] = True
    state["mode"] = "auto"


def scenario_joint_swing(t: float, state: dict) -> None:
    """J2/J3 同步正弦摆动，模拟示教过程。"""
    state["joints"]["j2"] = -45.0 + 30.0 * math.sin(2 * math.pi / 4.0 * t)
    state["joints"]["j3"] = 90.0 + 20.0 * math.sin(2 * math.pi / 4.0 * t + math.pi / 2)
    state["running"] = True
    state["mode"] = "manual"


def scenario_io_blink(t: float, state: dict) -> None:
    """DO[0] 每 0.5 秒翻转一次，用于校验 IO 实时性。"""
    state["io"]["DO"][0] = int(t * 2) % 2 == 0
    state["mode"] = "auto"


def scenario_full_run(t: float, state: dict) -> None:
    """综合场景：位置循环 + 速度变化 + DO[0] 节拍。"""
    scenario_circles(t, state)
    scenario_io_blink(t, state)
    state["speed"] = 30 + int(40 * (0.5 + 0.5 * math.sin(2 * math.pi / 10.0 * t)))


SCENARIOS: dict[str, Callable[[float, dict], None]] = {
    "static": scenario_static,
    "circles": scenario_circles,
    "joint_swing": scenario_joint_swing,
    "io_blink": scenario_io_blink,
    "full_run": scenario_full_run,
}


# ----------------------------- 模拟器核心 -----------------------------

class ControllerSimulator:
    """TCP 服务端 + 状态生成器，支持暂停/模式切换/按需断开。"""

    def __init__(self, host: str = HOST, port: int = PORT, interval: float = PUSH_INTERVAL_SECONDS) -> None:
        self.host = host
        self.port = port
        self.interval = interval
        self.state = make_initial_state()
        self.scenario_name = "static"
        self.scenario = SCENARIOS[self.scenario_name]
        self._paused = False
        self._mode_override: str | None = None
        self._connection: socket.socket | None = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._accept_thread: threading.Thread | None = None

    # ---------- 控制接口（可由后台输入线程调用） ----------

    def pause(self) -> None:
        self._paused = not self._paused
        print(f"[模拟器] 推送已{'暂停' if self._paused else '恢复'}")

    def cycle_mode(self) -> None:
        order = ["manual", "auto", "standby"]
        with self._lock:
            current = self._mode_override or self.state.get("mode", "manual")
            self._mode_override = order[(order.index(current) + 1) % len(order)]
            self.state["mode"] = self._mode_override
        print(f"[模拟器] 模式切换为 {self._mode_override}")

    def drop_connection(self) -> None:
        """主动断开当前客户端，模拟控制系统重启。"""
        with self._lock:
            conn = self._connection
        if conn is not None:
            try:
                conn.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                conn.close()
            except OSError:
                pass
            print("[模拟器] 已主动断开当前客户端")
        else:
            print("[模拟器] 当前无客户端连接")

    def select_scenario(self, name: str) -> bool:
        """切换预设场景；同时重置 state，让新场景从初始姿态开始演化。"""
        if name not in SCENARIOS:
            print(f"[模拟器] 未知场景 '{name}'，可选：{', '.join(SCENARIOS)}")
            return False
        with self._lock:
            self.scenario_name = name
            self.scenario = SCENARIOS[name]
            self._mode_override = None
            self.state = make_initial_state()
        print(f"[模拟器] 已切换到场景 {name}")
        return True

    def list_scenarios(self) -> list[str]:
        """返回可用场景名列表（供快捷键提示打印）。"""
        return list(SCENARIOS.keys())

    def print_state(self) -> None:
        with self._lock:
            snapshot = json.dumps(self.state, ensure_ascii=False, indent=2)
        print("[模拟器] 当前状态：\n" + snapshot)

    def shutdown(self) -> None:
        self._stop_event.set()
        self.drop_connection()

    # ---------- 推送主循环 ----------

    def _push_loop(self, connection: socket.socket, peer: tuple) -> None:
        print(f"[模拟器] 客户端已连接 peer={peer} scenario={self.scenario_name}")
        start = time.monotonic()
        try:
            while not self._stop_event.is_set():
                if self._paused:
                    time.sleep(0.2)
                    continue
                elapsed = time.monotonic() - start
                with self._lock:
                    scenario = self.scenario
                    scenario_name = self.scenario_name
                    scenario(elapsed, self.state)
                    frame = serialize(self.state)
                    connection_ref = self._connection
                if connection_ref is None:
                    break
                try:
                    connection.sendall(frame)
                except (BrokenPipeError, ConnectionResetError, OSError):
                    print(f"[模拟器] 客户端已断开 peer={peer}")
                    break
                time.sleep(self.interval)
        finally:
            with self._lock:
                self._connection = None
            try:
                connection.close()
            except OSError:
                pass

    # ---------- 监听主循环 ----------

    def serve(self) -> None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind((self.host, self.port))
            server.listen(1)
            server.settimeout(0.5)
            print(f"[模拟器] TCP 服务端监听 {self.host}:{self.port}")
            try:
                while not self._stop_event.is_set():
                    try:
                        connection, peer = server.accept()
                    except socket.timeout:
                        continue
                    connection.settimeout(None)
                    with self._lock:
                        self._connection = connection
                    threading.Thread(
                        target=self._push_loop,
                        args=(connection, peer),
                        daemon=True,
                        name="controller-push",
                    ).start()
            finally:
                print("[模拟器] 服务端已停止")


def _scenario_shortcuts() -> str:
    """把可用场景拼成 0~N 的快捷键提示。"""
    lines = ["\n[场景快捷键] " + " ".join(f"{i}={name}" for i, name in enumerate(SCENARIOS))]
    return lines[0]


def stdin_listener(simulator: ControllerSimulator) -> None:
    """后台线程：读取 stdin 快捷键。"""
    help_text = (
        "\n[快捷键] 0~" + str(len(SCENARIOS) - 1) + "=切场景 s=打印状态 p=暂停/恢复 m=切换模式 q=断开客户端 h=帮助 Ctrl+C=退出\n"
        + _scenario_shortcuts()
    )
    print(help_text)
    while True:
        try:
            line = input()
        except EOFError:
            return
        key = line.strip().lower()
        if not key:
            continue
        # 数字快捷键：按编号切场景
        if key.isdigit():
            index = int(key)
            names = simulator.list_scenarios()
            if 0 <= index < len(names):
                simulator.select_scenario(names[index])
            else:
                print(f"[模拟器] 无效场景编号 {key}，范围 0~{len(names) - 1}")
            continue
        if key == "s":
            simulator.print_state()
        elif key == "p":
            simulator.pause()
        elif key == "m":
            simulator.cycle_mode()
        elif key == "q":
            simulator.drop_connection()
        elif key == "h":
            print(help_text)
        else:
            print(f"[模拟器] 未知快捷键 '{key}'，输入 h 查看帮助")


def main() -> int:
    """启动模拟器：初始场景由 CLI 决定，启动后通过快捷键 0~N 运行时切换。"""
    # CLI：--scenario <name> 决定初始场景；__main__ 已兜底为 static，所以这里一定有值
    if len(sys.argv) >= 3 and sys.argv[1] in ("--scenario", "-s"):
        scenario_name = sys.argv[2]
    else:
        scenario_name = "static"
    if scenario_name not in SCENARIOS:
        print(f"未知场景 {scenario_name}，可选：{', '.join(SCENARIOS)}")
        return 1

    simulator = ControllerSimulator()
    simulator.scenario_name = scenario_name
    simulator.scenario = SCENARIOS[scenario_name]

    threading.Thread(
        target=stdin_listener,
        args=(simulator,),
        daemon=True,
        name="controller-stdin",
    ).start()

    try:
        simulator.serve()
    except KeyboardInterrupt:
        print("\n[模拟器] 收到 Ctrl+C，正在退出...")
        simulator.shutdown()
        return 0
    return 0


if __name__ == "__main__":
    # 联调便利：IDE/Start-Process 启动时 stdin 关闭会触发 EOF，
    # 这里默认补一个 --scenario static；交互菜单仍可手动 python 启动走。
    if len(sys.argv) == 1:
        sys.argv = [sys.argv[0], "--scenario", "static"]
    sys.exit(main())