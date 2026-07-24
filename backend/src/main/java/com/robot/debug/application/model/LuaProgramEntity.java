package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Lua 程序正文持久化实体。
 *
 * <p>每条记录通过 {@code programId} 与一个可视化流程一对一关联。Lua 文本由前端生成，
 * 后端只负责原样保存和读取。</p>
 */
@TableName("lua_program")
@Getter
@Setter
public class LuaProgramEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 对应的可视化流程主键。 */
    private Long programId;
    /** 原始 Lua 程序全文。 */
    private String luaContent;
    /** 创建时间。 */
    private LocalDateTime createdAt;
    /** 最后更新时间。 */
    private LocalDateTime updatedAt;
}
