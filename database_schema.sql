-- ============================================================================
-- 고객 개인정보 처리·열람 관리 시스템 - 데이터베이스 스키마
-- ============================================================================

-- 데이터베이스 생성
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
) COMMENT='직원 정보';

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
) COMMENT='고객 정보';

-- ============================================================================
-- 3️⃣ PersonalInfoTypes (개인정보 유형)
-- ============================================================================
CREATE TABLE PersonalInfoTypes (
    info_type_id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL UNIQUE COMMENT '유형명',
    sensitivity_level INT CHECK (sensitivity_level BETWEEN 1 AND 5) COMMENT '민감도 레벨 (1~5)',
    description VARCHAR(255) COMMENT '설명'
) COMMENT='개인정보 유형 (주민번호, 계좌번호, 신용카드번호 등)';

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
) COMMENT='고객 개인정보';

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
    INDEX idx_info (info_id)
) COMMENT='개인정보 접근 기록 (감사 추적의 핵심)';

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
    INDEX idx_requested_at (requested_at)
) COMMENT='정보 파기 요청 및 승인';

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
    /*
       예시:
       {
         "excessive_access": true,
         "abnormal_time": true,
         "cross_department": true,
         "rapid_access": true
       }
    */
    audit_notes LONGTEXT COMMENT '감사 코멘트',
    audited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '감사 시각',
    audited_by INT NOT NULL COMMENT '감사자 (총괄 책임자)',
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (audited_by) REFERENCES Users(user_id),
    INDEX idx_user (user_id),
    INDEX idx_audit_type (audit_type),
    INDEX idx_audited_at (audited_at)
) COMMENT='감사 기록 및 이상 탐지';

-- ============================================================================
-- 초기 데이터 삽입
-- ============================================================================

-- 사용자 유형 추가
INSERT INTO PersonalInfoTypes (type_name, sensitivity_level, description) VALUES
('주민번호', 5, '고도로 민감한 개인식별정보'),
('여권번호', 4, '국제 신분증'),
('운전면허번호', 4, '신분증'),
('신용카드번호', 5, '금융 정보'),
('계좌번호', 5, '금융 정보'),
('생년월일', 3, '기본 개인정보'),
('전자우편주소', 2, '연락처');

-- 관리자 계정 (비밀번호는 실제 운영 시 해시 처리 필요)
INSERT INTO Users (username, password, name, department, position, email, role) VALUES
('admin', 'hashed_admin_password', '김총괄', '감시팀', '총괄책임자', 'admin@company.com', 'ADMIN'),
('emp001', 'hashed_emp001_password', '이직원', '영업팀', '과장', 'emp001@company.com', 'EMPLOYEE'),
('emp002', 'hashed_emp002_password', '박직원', '영업팀', '대리', 'emp002@company.com', 'EMPLOYEE'),
('emp003', 'hashed_emp003_password', '최직원', '고객팀', '과장', 'emp003@company.com', 'EMPLOYEE');

-- 샘플 고객
INSERT INTO Customers (name, phone, address) VALUES
('홍길동', '010-1234-5678', '서울시 강남구'),
('이순신', '010-2345-6789', '서울시 종로구'),
('유관순', '010-3456-7890', '대전시 중구'),
('강감찬', '010-4567-8901', '경주시 황성동');

-- ============================================================================
-- 뷰 (View)
-- ============================================================================

-- 접근 로그 상세 조회 뷰
CREATE VIEW AccessLogDetail AS
SELECT
    a.log_id,
    u.username AS employee_name,
    c.name AS customer_name,
    t.type_name AS info_type,
    a.action_type,
    a.access_reason,
    a.accessed_at,
    a.ip_address
FROM AccessLogs a
JOIN Users u ON a.user_id = u.user_id
JOIN Customers c ON a.customer_id = c.customer_id
JOIN PersonalInfo p ON a.info_id = p.info_id
JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
ORDER BY a.accessed_at DESC;

-- 직원별 접근 현황 뷰
CREATE VIEW AccessStatsByEmployee AS
SELECT
    u.user_id,
    u.username,
    u.name,
    u.department,
    COUNT(a.log_id) AS total_access_count,
    COUNT(DISTINCT a.customer_id) AS unique_customers_accessed,
    MAX(a.accessed_at) AS last_access_time
FROM Users u
LEFT JOIN AccessLogs a ON u.user_id = a.user_id
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.username, u.name, u.department;

-- 파기 대기 건수 뷰
CREATE VIEW PendingDeletionRequests AS
SELECT
    d.request_id,
    c.name AS customer_name,
    t.type_name AS info_type,
    u.username AS requested_by,
    d.deletion_reason,
    d.requested_at,
    DATEDIFF(NOW(), d.requested_at) AS days_pending
FROM DeletionRequests d
JOIN PersonalInfo p ON d.info_id = p.info_id
JOIN Customers c ON d.customer_id = c.customer_id
JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
JOIN Users u ON d.requested_by = u.user_id
WHERE d.status = 'PENDING'
ORDER BY d.requested_at ASC;

-- ============================================================================
-- 트리거 (Trigger) - 이상 탐지
-- ============================================================================

-- 접근 로그 저장 시 감시 플래그 업데이트
DELIMITER //

CREATE TRIGGER UpdateAuditFlagsOnAccess
AFTER INSERT ON AccessLogs
FOR EACH ROW
BEGIN
    DECLARE access_count INT;
    DECLARE flag_json JSON;

    -- 직원의 접근 횟수 계산 (24시간 이내)
    SELECT COUNT(*) INTO access_count
    FROM AccessLogs
    WHERE user_id = NEW.user_id
    AND accessed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);

    -- 이상 탐지 플래그 설정
    SET flag_json = JSON_OBJECT(
        'excessive_access', IF(access_count > 50, TRUE, FALSE),  -- 24시간 내 50회 이상
        'abnormal_time', IF(HOUR(NOW()) NOT BETWEEN 8 AND 18 OR DAYNAME(NOW()) IN ('Saturday', 'Sunday'), TRUE, FALSE),  -- 야간/휴일 접근
        'rapid_access', IF(access_count > 20, TRUE, FALSE)  -- 빠른 연속 접근
    );

    -- Audits 테이블에 기록 (또는 업데이트)
    -- 실제 운영 시에는 프로시저를 통해 주기적으로 감사 기록을 생성합니다.
END//

DELIMITER ;

-- ============================================================================
-- 프로시저 (Procedure)
-- ============================================================================

-- 파기 요청 승인 프로시저
DELIMITER //

CREATE PROCEDURE ApproveDeleteionRequest(
    IN p_request_id INT,
    IN p_approved_by INT,
    IN p_approval_status VARCHAR(20)
)
BEGIN
    DECLARE p_info_id INT;

    -- 요청 상태 확인
    IF p_approval_status NOT IN ('APPROVED', 'REJECTED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid approval status';
    END IF;

    -- 요청 조회
    SELECT info_id INTO p_info_id
    FROM DeletionRequests
    WHERE request_id = p_request_id;

    IF p_info_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Request not found';
    END IF;

    -- 상태 업데이트
    IF p_approval_status = 'APPROVED' THEN
        UPDATE DeletionRequests
        SET status = 'APPROVED',
            approved_by = p_approved_by,
            approved_at = NOW()
        WHERE request_id = p_request_id;

        -- 개인정보 삭제
        DELETE FROM PersonalInfo WHERE info_id = p_info_id;

        -- 파기 완료 표시
        UPDATE DeletionRequests
        SET status = 'DELETED',
            deleted_at = NOW()
        WHERE request_id = p_request_id;
    ELSE
        UPDATE DeletionRequests
        SET status = 'REJECTED',
            approved_by = p_approved_by,
            approved_at = NOW()
        WHERE request_id = p_request_id;
    END IF;
END//

DELIMITER ;

-- 일일 감사 기록 생성 프로시저
DELIMITER //

CREATE PROCEDURE GenerateDailyAudit()
BEGIN
    -- 어제의 접근 기록을 기반으로 감사 레코드 생성
    INSERT INTO Audits (user_id, audit_period_start, audit_period_end, audit_type, access_count, audited_by, alert_flags)
    SELECT
        u.user_id,
        DATE_SUB(DATE(NOW()), INTERVAL 1 DAY),
        DATE(NOW()),
        'ROUTINE',
        COALESCE(COUNT(a.log_id), 0),
        (SELECT user_id FROM Users WHERE role = 'ADMIN' LIMIT 1),
        JSON_OBJECT(
            'excessive_access', IF(COUNT(a.log_id) > 50, TRUE, FALSE),
            'abnormal_time', IF(SUM(CASE WHEN HOUR(a.accessed_at) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) > 5, TRUE, FALSE)
        )
    FROM Users u
    LEFT JOIN AccessLogs a ON u.user_id = a.user_id
        AND DATE(a.accessed_at) = DATE_SUB(DATE(NOW()), INTERVAL 1 DAY)
    WHERE u.is_active = TRUE
    GROUP BY u.user_id;
END//

DELIMITER ;

-- ============================================================================
-- 인덱스 생성 (성능 최적화)
-- ============================================================================

CREATE INDEX idx_audit_alert ON Audits(audited_at, audit_type);
CREATE INDEX idx_deletion_status ON DeletionRequests(status, requested_at);

-- ============================================================================
-- 테이블 설명
-- ============================================================================
/*

📊 테이블 관계도:

Users (직원)
  ├─ 1:N ─> AccessLogs (접근 기록)
  ├─ 1:N ─> DeletionRequests (파기 요청)
  └─ 1:N ─> Audits (감사 기록)

Customers (고객)
  ├─ 1:N ─> PersonalInfo (개인정보)
  └─ 1:N ─> AccessLogs (접근 기록)

PersonalInfoTypes (유형)
  └─ 1:N ─> PersonalInfo

PersonalInfo (개인정보)
  ├─ 1:N ─> AccessLogs
  └─ 1:N ─> DeletionRequests

💡 핵심 기능:

1. 접근 추적: AccessLogs는 모든 개인정보 접근을 기록
2. 파기 관리: DeletionRequests를 통해 승인 프로세스 구현
3. 감사: Audits 테이블에 일일 감사 기록 저장
4. 이상 탐지: 트리거와 프로시저로 자동화

*/
