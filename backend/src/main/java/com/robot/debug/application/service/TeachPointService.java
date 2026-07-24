package com.robot.debug.application.service;

import com.robot.debug.interfaces.rest.DTO.TeachPointDtos;
import java.util.List;

/**
 * 机械臂示教点业务服务接口。
 */
public interface TeachPointService {
    /** 查询固定机械臂的全部示教点。 */
    List<TeachPointDtos.View> list();

    /** 新增示教点。 */
    TeachPointDtos.View create(TeachPointDtos.SaveRequest request, String operator);

    /** 修改示教点。 */
    TeachPointDtos.View update(Long id, TeachPointDtos.SaveRequest request, String operator);

    /** 删除示教点。 */
    void delete(Long id, String operator);
}
