package com.robot.debug.interfaces.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.robot.debug.application.service.CommandService;
import com.robot.debug.common.result.Result;
import com.robot.debug.interfaces.rest.DTO.ControlCommandDtos;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 机器人控制 HTTP 接口。
 *
 * <p>每个控制动作使用独立的语义化 POST 地址，请求体直接承载该动作的业务参数，
 * 不再使用统一命令号信封。当前接口只负责受理和记录请求，不通过 TCP
 * 向控制系统发送命令。</p>
 */
@RestController
@RequestMapping("/api/control")
public class ControlCommandController {
    private final CommandService commandService;

    public ControlCommandController(CommandService commandService) {
        this.commandService = commandService;
    }

    /** 机械臂笛卡尔坐标步进。 */
    @PostMapping("/arm/step-cartesian")
    public Result<ControlCommandDtos.Response> stepCartesian(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.stepCartesian", data, operator);
    }

    /** 机械臂关节步进。 */
    @PostMapping("/arm/step-joint")
    public Result<ControlCommandDtos.Response> stepJoint(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.stepJoint", data, operator);
    }

    /** 设置机械臂运行模式。 */
    @PostMapping("/arm/mode")
    public Result<ControlCommandDtos.Response> setArmMode(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.setMode", data, operator);
    }

    /** 设置机械臂速度。 */
    @PostMapping("/arm/speed")
    public Result<ControlCommandDtos.Response> setArmSpeed(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.setSpeed", data, operator);
    }

    /** 机械臂回零。 */
    @PostMapping("/arm/home")
    public Result<ControlCommandDtos.Response> homeArm(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.home", data, operator);
    }

    /** 停止机械臂。 */
    @PostMapping("/arm/stop")
    public Result<ControlCommandDtos.Response> stopArm(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.stop", data, operator);
    }

    /** 机械臂急停。 */
    @PostMapping("/arm/emergency-stop")
    public Result<ControlCommandDtos.Response> emergencyStopArm(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.emergencyStop", data, operator);
    }

    /** 设置机械臂 IO。 */
    @PostMapping("/arm/io")
    public Result<ControlCommandDtos.Response> setArmIo(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.setIo", data, operator);
    }

    /** 运行机械臂示教点。 */
    @PostMapping("/arm/teach-point/run")
    public Result<ControlCommandDtos.Response> runTeachPoint(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.runTeachPoint", data, operator);
    }

    /** 按给定关节角运行机械臂。 */
    @PostMapping("/arm/joints")
    public Result<ControlCommandDtos.Response> moveArmJoints(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("arm.moveJoints", data, operator);
    }

    /** AGV 手动移动。 */
    @PostMapping("/agv/move")
    public Result<ControlCommandDtos.Response> moveAgv(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("agv.move", data, operator);
    }

    /** AGV 前往指定站点。 */
    @PostMapping("/agv/station")
    public Result<ControlCommandDtos.Response> moveAgvToStation(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("agv.gotoStation", data, operator);
    }

    /** 停止 AGV。 */
    @PostMapping("/agv/stop")
    public Result<ControlCommandDtos.Response> stopAgv(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("agv.stop", data, operator);
    }

    /** AGV 急停。 */
    @PostMapping("/agv/emergency-stop")
    public Result<ControlCommandDtos.Response> emergencyStopAgv(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("agv.emergencyStop", data, operator);
    }

    /** AGV 回充。 */
    @PostMapping("/agv/recharge")
    public Result<ControlCommandDtos.Response> rechargeAgv(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("agv.recharge", data, operator);
    }

    /** 执行已保存程序。 */
    @PostMapping("/program/execute")
    public Result<ControlCommandDtos.Response> executeProgram(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("program.execute", data, operator);
    }

    /** 暂停程序。 */
    @PostMapping("/program/pause")
    public Result<ControlCommandDtos.Response> pauseProgram(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("program.pause", data, operator);
    }

    /** 恢复程序。 */
    @PostMapping("/program/resume")
    public Result<ControlCommandDtos.Response> resumeProgram(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("program.resume", data, operator);
    }

    /** 停止程序。 */
    @PostMapping("/program/stop")
    public Result<ControlCommandDtos.Response> stopProgram(
            @RequestBody JsonNode data, @RequestHeader(value = "X-Operator", required = false) String operator) {
        return accept("program.stop", data, operator);
    }

    /** 将各控制端点统一交给应用服务受理。 */
    private Result<ControlCommandDtos.Response> accept(String commandType, JsonNode data, String operator) {
        return Result.success(commandService.accept(commandType, data, operator));
    }
}
