-- 四级角色联调账号；仅供离线原型使用。
INSERT IGNORE INTO sys_user (username, password, nickname, role) VALUES
('superadmin', 'superadmin123', '超级管理员', 'SUPER_ADMIN'),
('admin', 'admin123', '管理员', 'ADMIN'),
('technician', 'tech123', '技术员', 'TECHNICIAN'),
('user', 'user123', '普通用户', 'USER');

-- 单台复合机器人的固定三设备初始数据。
INSERT IGNORE INTO device (id, device_code, parent_id, device_type, name, model, config_json) VALUES
(1, 'CMP-001', NULL, 'COMPOSITE', '复合机器人', 'CR-2026-Pro', JSON_OBJECT()),
(2, 'ARM-001', 1, 'ROBOT_ARM', '六轴机械臂', 'ARM-6DOF', JSON_OBJECT()),
(3, 'AGV-001', 1, 'AGV', '移动底盘', 'AGV-DIFF', JSON_OBJECT());
