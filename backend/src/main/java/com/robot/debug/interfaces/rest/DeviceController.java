package com.robot.debug.interfaces.rest;

import com.robot.debug.application.service.DeviceService;
import com.robot.debug.common.result.Result;
import java.util.List;

import com.robot.debug.interfaces.rest.DTO.DeviceDtos;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/devices")
/**
 * 设备信息 REST 接口。
 */
public class DeviceController {
    private final DeviceService service;

    public DeviceController(DeviceService service) { this.service = service; }

    /** 查询固定的复合机器人设备树列表。 */
    @GetMapping
    public Result<List<DeviceDtos.View>> list() { return Result.success(service.list()); }

    /** 查询单个设备。 */
    @GetMapping("/{id}")
    public Result<DeviceDtos.View> get(@PathVariable Long id) { return Result.success(service.get(id)); }

    /** 更新设备编号、名称、型号或扩展配置。 */
    @PutMapping("/{id}")
    public Result<DeviceDtos.View> update(@PathVariable Long id,
                                                @RequestBody DeviceDtos.UpdateRequest request,
                                                @RequestHeader(value = "X-Operator", required = false) String operator) {
        return Result.success(service.update(id, request, operator));
    }
}
