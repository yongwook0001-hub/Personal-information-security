-- ============================================================================
-- 고객 개인정보 처리·열람 관리 시스템 - 테이블 생성
-- ============================================================================

-- 데이터베이스 생성
DROP DATABASE IF EXISTS personal_info_system;
CREATE DATABASE IF NOT EXISTS personal_info_system;
USE personal_info_system;

-- ============================================================================
-- 1️⃣ Users (직원/사용자)
-- ============================================================================
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '로그인 ID',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호 (해시)',
    name VARCHAR(100) NOT NULL COMMENT '직원 이름',
    department VARCHAR(100) COMMENT '부서',
    position VARCHAR(50) COMMENT '직책',
    email VARCHAR(100) UNIQUE COMMENT '이메일',
    role ENUM('EMPLOYEE', 'ADMIN') NOT NULL DEFAULT 'EMPLOYEE' COMMENT '권한',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    INDEX idx_role (role),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='직원 정보';

-- ============================================================================
-- 2️⃣ Customers (고객)
-- ============================================================================
CREATE TABLE Customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '고객 이름',
    phone VARCHAR(20) COMMENT '전화번호',
    address VARCHAR(255) COMMENT '주소',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    INDEX idx_name (name),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 정보';

-- ============================================================================
-- 3️⃣ PersonalInfoTypes (개인정보 유형)
-- ============================================================================
CREATE TABLE PersonalInfoTypes (
    info_type_id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL UNIQUE COMMENT '유형명',
    sensitivity_level INT CHECK (sensitivity_level BETWEEN 1 AND 5) COMMENT '민감도 레벨 (1~5)',
    description VARCHAR(255) COMMENT '설명'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인정보 유형';

-- ============================================================================
-- 4️⃣ PersonalInfo (고객 개인정보)
-- ============================================================================
CREATE TABLE PersonalInfo (
    info_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL COMMENT '고객 ID',
    info_type_id INT NOT NULL COMMENT '정보 유형 ID',
    info_value LONGBLOB NOT NULL COMMENT '실제 데이터 (암호화 저장)',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (info_type_id) REFERENCES PersonalInfoTypes(info_type_id),
    INDEX idx_customer (customer_id),
    INDEX idx_type (info_type_id),
    UNIQUE KEY unique_info (customer_id, info_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='고객 개인정보';

-- ============================================================================
-- 5️⃣ AccessLogs (개인정보 접근 기록) ⭐ 핵심 테이블
-- ============================================================================
CREATE TABLE AccessLogs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '접근한 직원',
    info_id INT NOT NULL COMMENT '접근한 개인정보',
    customer_id INT NOT NULL COMMENT '고객 ID',
    action_type ENUM('VIEW', 'EDIT', 'DELETE') NOT NULL COMMENT '접근 유형',
    access_reason VARCHAR(255) COMMENT '접근 사유',
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '접근 시각',
    ip_address VARCHAR(45) COMMENT 'IP 주소',
    device_info VARCHAR(255) COMMENT '장치 정보',
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (info_id) REFERENCES PersonalInfo(info_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
    INDEX idx_user (user_id),
    INDEX idx_customer (customer_id),
    INDEX idx_accessed_at (accessed_at),
    INDEX idx_info (info_id),
    INDEX idx_composite (user_id, accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개인정보 접근 기록';

-- ============================================================================
-- 6️⃣ DeletionRequests (정보 파기 요청)
-- ============================================================================
CREATE TABLE DeletionRequests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    info_id INT NOT NULL COMMENT '파기할 정보',
    customer_id INT NOT NULL COMMENT '고객 ID',
    requested_by INT NOT NULL COMMENT '요청자 (직원 ID)',
    deletion_reason VARCHAR(255) COMMENT '파기 사유',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DELETED') DEFAULT 'PENDING' COMMENT '상태',
    approved_by INT COMMENT '승인자 (총괄 책임자)',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '요청일',
    approved_at TIMESTAMP COMMENT '승인일',
    deleted_at TIMESTAMP COMMENT '파기일',
    rejection_reason VARCHAR(255) COMMENT '거절 사유',
    FOREIGN KEY (info_id) REFERENCES PersonalInfo(info_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
    FOREIGN KEY (requested_by) REFERENCES Users(user_id),
    FOREIGN KEY (approved_by) REFERENCES Users(user_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at),
    INDEX idx_approved_by (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='정보 파기 요청 및 승인';

-- ============================================================================
-- 7️⃣ Audits (감사 기록 & 이상 탐지)
-- ============================================================================
CREATE TABLE Audits (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '대상 직원',
    audit_period_start TIMESTAMP COMMENT '감시 시작일',
    audit_period_end TIMESTAMP COMMENT '감시 종료일',
    audit_type ENUM('ROUTINE', 'ALERT', 'INVESTIGATION') DEFAULT 'ROUTINE' COMMENT '감사 유형',
    access_count INT DEFAULT 0 COMMENT '해당 기간 접근 횟수',
    alert_flags JSON COMMENT '이상 탐지 플래그 (JSON)',
    audit_notes LONGTEXT COMMENT '감사 코멘트',
    audited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '감사 시각',
    audited_by INT NOT NULL COMMENT '감사자 (총괄 책임자)',
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (audited_by) REFERENCES Users(user_id),
    INDEX idx_user (user_id),
    INDEX idx_audit_type (audit_type),
    INDEX idx_audited_at (audited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='감사 기록 및 이상 탐지';

-- ============================================================================
-- 테이블 생성 완료
-- ============================================================================
SELECT '✅ 7개 테이블 생성 완료' AS status;
