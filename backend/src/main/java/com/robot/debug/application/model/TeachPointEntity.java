package com.robot.debug.application.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * 机械臂示教点持久化实体。
 */
@TableName("teach_point")
@Getter
@Setter
public class TeachPointEntity {
    /** 数据库主键。 */
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 所属机械臂设备编号。 */
    private String deviceCode;
    /** 示教点名称。 */
    private String name;
    /** 笛卡尔位置 X。 */
    private Double x;
    /** 笛卡尔位置 Y。 */
    private Double y;
    /** 笛卡尔位置 Z。 */
    private Double z;
    /** 笛卡尔姿态 RX。 */
    private Double rx;
    /** 笛卡尔姿态 RY。 */
    private Double ry;
    /** 笛卡尔姿态 RZ。 */
    private Double rz;
    /** 第一关节角度。 */
    private Double j1;
    /** 第二关节角度。 */
    private Double j2;
    /** 第三关节角度。 */
    private Double j3;
    /** 第四关节角度。 */
    private Double j4;
    /** 第五关节角度。 */
    private Double j5;
    /** 第六关节角度。 */
    private Double j6;
    /** 创建人。 */
    private String createdBy;
    /** 最后修改人。 */
    private String updatedBy;
    /** 创建时间。 */
    private LocalDateTime createdAt;
    /** 最后更新时间。 */
    private LocalDateTime updatedAt;
}
