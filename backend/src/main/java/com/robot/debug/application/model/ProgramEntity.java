package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@TableName("program")
@Getter
@Setter
/**
 * 前端可视化流程持久化实体。
 *
 * <p>Lua 正文存放在一对一关联的 {@code lua_program} 表中。</p>
 */
public class ProgramEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 程序名称。 */
    private String name;
    /** 可视化流程 JSON。 */
    private String flowJson;
    /** 每次更新递增的版本号。 */
    private Integer version;
    /** 创建人。 */
    private String createdBy;
    /** 创建时间。 */
    private LocalDateTime createdAt;
    /** 最后更新时间。 */
    private LocalDateTime updatedAt;
}
