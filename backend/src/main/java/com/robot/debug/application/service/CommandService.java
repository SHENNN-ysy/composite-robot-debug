package com.robot.debug.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.robot.debug.interfaces.rest.DTO.ControlCommandDtos;

/**
 * HTTP 控制请求受理服务接口。
 */
public interface CommandService {
    /** 接收并记录一个语义化控制请求，不通过 TCP 向控制系统转发。 */
    ControlCommandDtos.Response accept(String commandType, JsonNode data, String operator);
}
