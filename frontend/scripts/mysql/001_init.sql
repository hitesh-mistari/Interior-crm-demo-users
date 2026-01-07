-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  leader_user_id CHAR(36),
  category VARCHAR(64),
  photo_url TEXT,
  deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by CHAR(36) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id CHAR(36) PRIMARY KEY,
  team_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INT NULL,
  skills_json JSON NOT NULL,
  employment_status VARCHAR(32) NULL,
  rate_type VARCHAR(16) NULL,
  rate_amount DECIMAL(12,2) NULL,
  photo_url TEXT,
  deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME NULL,
  deleted_by CHAR(36) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_team_members_team (team_id),
  INDEX idx_team_members_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trash snapshot for team members
CREATE TABLE IF NOT EXISTS team_member_trash (
  id CHAR(36) PRIMARY KEY,
  original_id CHAR(36) NOT NULL,
  team_id CHAR(36) NOT NULL,
  snapshot_json JSON NOT NULL,
  deleted_by CHAR(36) NULL,
  reason TEXT NULL,
  deleted_at DATETIME NOT NULL,
  retention_until DATETIME NOT NULL,
  INDEX idx_trash_original (original_id),
  INDEX idx_trash_retention (retention_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trash activity logs
CREATE TABLE IF NOT EXISTS trash_logs (
  id CHAR(36) PRIMARY KEY,
  item_type VARCHAR(64) NOT NULL, -- 'team_member'
  item_id CHAR(36) NOT NULL,      -- original id
  action ENUM('move','restore','purge','retention_purge') NOT NULL,
  actor_user_id CHAR(36) NULL,
  reason TEXT NULL,
  timestamp DATETIME NOT NULL,
  INDEX idx_logs_item (item_type, item_id),
  INDEX idx_logs_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;