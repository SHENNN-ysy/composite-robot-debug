package com.robot.debug.application.service;

import com.robot.debug.application.model.ProgramEntity;
import com.robot.debug.interfaces.rest.DTO.ProgramDtos;
import java.util.List;

/**
 * 可视化流程与 Lua 程序服务接口。
 */
public interface ProgramService {
    /** 查询程序列表。 */
    List<ProgramDtos.View> list();

    /** 按主键查询程序视图。 */
    ProgramDtos.View get(Long id);

    /** 查询内部流程实体。 */
    ProgramEntity getEntity(Long id);

    /** 按流程主键读取原始 Lua 文本。 */
    String getLuaContent(Long id);

    /** 保存新程序。 */
    ProgramDtos.View create(ProgramDtos.SaveRequest request, String operator);

    /** 更新程序并递增版本。 */
    ProgramDtos.View update(Long id, ProgramDtos.SaveRequest request, String operator);

    /** 删除程序。 */
    void delete(Long id, String operator);
}
