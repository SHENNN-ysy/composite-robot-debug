-- 创建数据库与全部业务表（如果不存在）
CREATE DATABASE IF NOT EXISTS robot_debug
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE robot_debug;

-- 系统用户：原型阶段按明确需求使用明文密码，应用接口不得返回 password 字段。
CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password VARCHAR(128) NOT NULL,
  nickname VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uk_sys_user_username UNIQUE (username),
  CONSTRAINT chk_sys_user_role CHECK (role IN ('SUPER_ADMIN','ADMIN','TECHNICIAN','USER'))
);

-- 固定的复合机器人、机械臂和 AGV 设备树。
CREATE TABLE IF NOT EXISTS device (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_code VARCHAR(64) NOT NULL,
  parent_id BIGINT NULL,
  device_type VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  model VARCHAR(128) NULL,
  config_json JSON NULL,
  online TINYINT(1) NOT NULL DEFAULT 0,
  last_communication_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uk_device_code UNIQUE (device_code),
  CONSTRAINT fk_device_parent FOREIGN KEY (parent_id) REFERENCES device(id),
  CONSTRAINT chk_device_type CHECK (device_type IN ('COMPOSITE','ROBOT_ARM','AGV')),
  INDEX idx_device_parent (parent_id)
);

-- 前端可视化流程及其版本元数据。
CREATE TABLE IF NOT EXISTS program (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  flow_json JSON NOT NULL,
  lua_content LONGTEXT NULL COMMENT '迁移兼容字段，脚本末尾转存后删除',
  version INT NOT NULL DEFAULT 1,
  created_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_program_updated_at (updated_at)
);

-- 如果数据库曾人工提前删除旧字段，则临时补回，保证后续迁移语句可重复执行。
ALTER TABLE program ADD COLUMN IF NOT EXISTS lua_content LONGTEXT NULL;

-- Lua 程序正文：与可视化流程一对一关联，后端原样保存且不解析内容。
CREATE TABLE IF NOT EXISTS lua_program (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  program_id BIGINT NOT NULL,
  lua_content LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uk_lua_program_program UNIQUE (program_id),
  CONSTRAINT fk_lua_program_program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE CASCADE,
  INDEX idx_lua_program_updated_at (updated_at)
);

-- 兼容已执行旧版 V1 的数据库：先把原 program.lua_content 迁入新表，再删除旧字段。
INSERT INTO lua_program (program_id, lua_content, created_at, updated_at)
SELECT id, lua_content, created_at, updated_at
FROM program
WHERE lua_content IS NOT NULL
ON DUPLICATE KEY UPDATE
  lua_content = VALUES(lua_content),
  updated_at = VALUES(updated_at);

ALTER TABLE program DROP COLUMN IF EXISTS lua_content;

-- 机械臂示教点：单机原型保留设备编号，便于后续扩展多机械臂。
CREATE TABLE IF NOT EXISTS teach_point (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_code VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  x DECIMAL(12,3) NOT NULL,
  y DECIMAL(12,3) NOT NULL,
  z DECIMAL(12,3) NOT NULL,
  rx DECIMAL(12,3) NOT NULL,
  ry DECIMAL(12,3) NOT NULL,
  rz DECIMAL(12,3) NOT NULL,
  j1 DECIMAL(12,3) NOT NULL,
  j2 DECIMAL(12,3) NOT NULL,
  j3 DECIMAL(12,3) NOT NULL,
  j4 DECIMAL(12,3) NOT NULL,
  j5 DECIMAL(12,3) NOT NULL,
  j6 DECIMAL(12,3) NOT NULL,
  created_by VARCHAR(64) NULL,
  updated_by VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uk_teach_point_device_name UNIQUE (device_code, name),
  CONSTRAINT fk_teach_point_device FOREIGN KEY (device_code) REFERENCES device(device_code),
  INDEX idx_teach_point_device_updated (device_code, updated_at)
);

-- 控制命令从创建到 ACK、结果或超时的生命周期记录。
CREATE TABLE IF NOT EXISTS command_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  message_id VARCHAR(64) NOT NULL,
  device_code VARCHAR(64) NOT NULL,
  command_type VARCHAR(64) NOT NULL,
  processing_mode VARCHAR(32) NOT NULL,
  payload_json JSON NULL,
  operator_name VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL,
  result_json JSON NULL,
  error_message VARCHAR(512) NULL,
  sent_at DATETIME(3) NULL,
  acked_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uk_command_message_id UNIQUE (message_id),
  INDEX idx_command_created_at (created_at),
  INDEX idx_command_device_created (device_code, created_at)
);

-- 用户操作审计日志。
CREATE TABLE IF NOT EXISTS operation_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  operator_name VARCHAR(64) NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(128) NULL,
  detail_json JSON NULL,
  result VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_operation_created_at (created_at)
);

-- 控制系统主动上报的日志与告警。
CREATE TABLE IF NOT EXISTS device_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source VARCHAR(64) NOT NULL,
  level VARCHAR(16) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  payload_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_device_log_created_at (created_at),
  INDEX idx_device_log_source_created (source, created_at)
);
