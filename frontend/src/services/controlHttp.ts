/**
 * 机器人控制 HTTP 请求封装。
 *
 * <p>每个控制动作使用独立的语义化 POST 地址，请求体直接传递业务参数。
 * WebSocket 仍然只负责接收后端推送的设备状态，不用于发送控制命令。</p>
 */
import { controlApi } from './api';

/**
 * 控制动作与后端 HTTP 地址的集中映射。
 */
export const CONTROL_ENDPOINT = {
  /** 机械臂笛卡尔坐标步进。 */
  ARM_STEP_CARTESIAN: '/control/arm/step-cartesian',
  /** 机械臂关节步进。 */
  ARM_STEP_JOINT: '/control/arm/step-joint',
  /** 设置机械臂模式。 */
  ARM_SET_MODE: '/control/arm/mode',
  /** 设置机械臂速度。 */
  ARM_SET_SPEED: '/control/arm/speed',
  /** 机械臂回零。 */
  ARM_HOME: '/control/arm/home',
  /** 停止机械臂。 */
  ARM_STOP: '/control/arm/stop',
  /** 机械臂急停。 */
  ARM_EMERGENCY_STOP: '/control/arm/emergency-stop',
  /** 设置机械臂 IO。 */
  ARM_SET_IO: '/control/arm/io',
  /** 运行机械臂示教点。 */
  ARM_GOTO_TEACH_POINT: '/control/arm/teach-point/run',
  /** 按六关节角运行机械臂。 */
  ARM_MOVE_JOINTS: '/control/arm/joints',
  /** AGV 手动移动。 */
  AGV_MOVE: '/control/agv/move',
  /** AGV 前往指定站点。 */
  AGV_GOTO_STATION: '/control/agv/station',
  /** 停止 AGV。 */
  AGV_STOP: '/control/agv/stop',
  /** AGV 急停。 */
  AGV_EMERGENCY_STOP: '/control/agv/emergency-stop',
  /** AGV 回充。 */
  AGV_RECHARGE: '/control/agv/recharge',
  /** 执行程序。 */
  PROGRAM_EXECUTE: '/control/program/execute',
  /** 暂停程序。 */
  PROGRAM_PAUSE: '/control/program/pause',
  /** 恢复程序。 */
  PROGRAM_RESUME: '/control/program/resume',
  /** 停止程序。 */
  PROGRAM_STOP: '/control/program/stop',
} as const;

/** 控制接口地址类型，防止调用方传入未登记的地址。 */
export type ControlEndpoint = typeof CONTROL_ENDPOINT[keyof typeof CONTROL_ENDPOINT];

/**
 * 向指定控制接口发送业务参数并返回后端受理结果。
 */
export async function sendControlRequest(endpoint: ControlEndpoint, data: Record<string, unknown>) {
  return controlApi.execute(endpoint, data);
}
