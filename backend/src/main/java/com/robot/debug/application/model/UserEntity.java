package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@TableName("sys_user")
@Getter
@Setter
/**
 * 系统用户持久化实体。
 *
 * <p>原型阶段密码按需求明文保存；该实体不得作为 REST 响应直接返回。</p>
 */
public class UserEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 唯一登录名。 */
    private String username;
    /** 原型阶段使用的明文密码，禁止写入日志或响应。 */
    private String password;
    /** 页面显示名称。 */
    private String nickname;
    /** 固定四级角色编码。 */
    private String role;
    /** 是否允许登录。 */
    private Boolean enabled;
    /** 创建时间。 */
    private LocalDateTime createdAt;
    /** 最后更新时间。 */
    private LocalDateTime updatedAt;
}
