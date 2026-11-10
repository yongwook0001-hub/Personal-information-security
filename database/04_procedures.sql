-- ============================================================================
-- 고객 개인정보 처리·열람 관리 시스템 - 저장 프로시저 (Procedure)
-- ============================================================================

USE personal_info_system;

-- ============================================================================
-- 프로시저 1: ApproveDeleteionRequest (파기 요청 승인/거절)
-- ============================================================================
-- 용도: 관리자가 파기 요청을 승인하거나 거절할 때 호출
-- 입력: request_id (요청 ID), approved_by (승인자 ID), approval_status (승인 상태)
DROP PROCEDURE IF EXISTS ApproveDeleteionRequest;
DELIMITER //

CREATE PROCEDURE ApproveDeleteionRequest(
    IN p_request_id INT,
    IN p_approved_by INT,
    IN p_approval_status VARCHAR(20),
    IN p_rejection_reason VARCHAR(255)
)
BEGIN
    DECLARE p_info_id INT;

    -- 입력값 검증
    IF p_approval_status NOT IN ('APPROVED', 'REJECTED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '승인 상태는 APPROVED 또는 REJECTED여야 합니다.';
    END IF;

    -- 트랜잭션 시작
    START TRANSACTION;

    -- 요청 존재 여부 확인
    SELECT info_id INTO p_info_id
    FROM DeletionRequests
    WHERE request_id = p_request_id AND status = 'PENDING'
    FOR UPDATE;

    IF p_info_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '해당 파기 요청을 찾을 수 없거나 이미 처리되었습니다.';
    END IF;

    -- 승인 처리
    IF p_approval_status = 'APPROVED' THEN
        -- 1. 파기 요청 상태를 APPROVED로 업데이트
        UPDATE DeletionRequests
        SET status = 'APPROVED',
            approved_by = p_approved_by,
            approved_at = NOW()
        WHERE request_id = p_request_id;

        -- 2. 개인정보 삭제
        DELETE FROM PersonalInfo WHERE info_id = p_info_id;

        -- 3. 파기 완료 표시
        UPDATE DeletionRequests
        SET status = 'DELETED',
            deleted_at = NOW()
        WHERE request_id = p_request_id;

    -- 거절 처리
    ELSE
        UPDATE DeletionRequests
        SET status = 'REJECTED',
            approved_by = p_approved_by,
            approved_at = NOW(),
            rejection_reason = p_rejection_reason
        WHERE request_id = p_request_id;
    END IF;

    -- 감사 로그 기록 (선택)
    INSERT INTO Audits (user_id, audit_type, access_count, audit_notes, audited_by)
    VALUES (p_approved_by, 'ROUTINE', 0,
            CONCAT('파기 요청 ', p_request_id, ' - ', p_approval_status),
            p_approved_by);

    -- 트랜잭션 커밋
    COMMIT;

    SELECT '✅ 파기 요청 처리 완료' AS result;
END//

DELIMITER ;

-- ============================================================================
-- 프로시저 2: GenerateDailyAudit (일일 감사 기록 생성)
-- ============================================================================
-- 용도: 매일 정해진 시간(예: 자정)에 호출하여 전날의 접근 기록 기반으로 감사 생성
-- 입력: 없음 (내부적으로 어제 날짜 사용)
DROP PROCEDURE IF EXISTS GenerateDailyAudit;
DELIMITER //

CREATE PROCEDURE GenerateDailyAudit()
BEGIN
    DECLARE v_admin_id INT;
    DECLARE v_yesterday_date DATE;

    -- 어제 날짜
    SET v_yesterday_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY);

    -- ADMIN 계정 ID 조회 (첫 번째 ADMIN)
    SELECT user_id INTO v_admin_id
    FROM Users
    WHERE role = 'ADMIN' AND is_active = TRUE
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '활성 ADMIN 계정이 없습니다.';
    END IF;

    -- 트랜잭션 시작
    START TRANSACTION;

    -- 모든 활성 직원에 대해 감사 기록 생성
    INSERT INTO Audits (
        user_id,
        audit_period_start,
        audit_period_end,
        audit_type,
        access_count,
        alert_flags,
        audit_notes,
        audited_by
    )
    SELECT
        u.user_id,
        CONCAT(v_yesterday_date, ' 00:00:00'),
        CONCAT(v_yesterday_date, ' 23:59:59'),
        CASE
            WHEN COUNT(a.log_id) > 50 THEN 'ALERT'
            WHEN SUM(CASE WHEN HOUR(a.accessed_at) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) > 5 THEN 'ALERT'
            ELSE 'ROUTINE'
        END,
        COALESCE(COUNT(a.log_id), 0),
        JSON_OBJECT(
            'excessive_access', IF(COUNT(a.log_id) > 50, TRUE, FALSE),
            'abnormal_time', IF(SUM(CASE WHEN HOUR(a.accessed_at) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) > 5, TRUE, FALSE),
            'rapid_access', IF(COUNT(a.log_id) > 20, TRUE, FALSE),
            'audit_date', v_yesterday_date
        ),
        CONCAT('자동 생성된 일일 감사 기록 (', v_yesterday_date, ')'),
        v_admin_id
    FROM Users u
    LEFT JOIN AccessLogs a ON u.user_id = a.user_id
        AND DATE(a.accessed_at) = v_yesterday_date
    WHERE u.is_active = TRUE AND u.role = 'EMPLOYEE'
    GROUP BY u.user_id;

    COMMIT;

    SELECT CONCAT('✅ 일일 감사 기록 생성 완료 (', v_yesterday_date, ')') AS result;
END//

DELIMITER ;

-- ============================================================================
-- 프로시저 3: RecordAccessLog (접근 기록 저장)
-- ============================================================================
-- 용도: 직원이 개인정보를 열람할 때 백엔드에서 호출
DROP PROCEDURE IF EXISTS RecordAccessLog;
DELIMITER //

CREATE PROCEDURE RecordAccessLog(
    IN p_user_id INT,
    IN p_info_id INT,
    IN p_action_type VARCHAR(20),
    IN p_access_reason VARCHAR(255),
    IN p_ip_address VARCHAR(45),
    IN p_device_info VARCHAR(255)
)
BEGIN
    DECLARE v_customer_id INT;
    DECLARE v_user_exists INT;
    DECLARE v_info_exists INT;

    -- 사용자 존재 확인
    SELECT COUNT(*) INTO v_user_exists
    FROM Users
    WHERE user_id = p_user_id AND is_active = TRUE;

    IF v_user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '활성 사용자가 없습니다.';
    END IF;

    -- 개인정보 존재 확인 및 고객 ID 조회
    SELECT customer_id INTO v_customer_id
    FROM PersonalInfo
    WHERE info_id = p_info_id;

    IF v_customer_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '해당 개인정보를 찾을 수 없습니다.';
    END IF;

    -- 접근 로그 삽입
    INSERT INTO AccessLogs (
        user_id,
        info_id,
        customer_id,
        action_type,
        access_reason,
        ip_address,
        device_info
    ) VALUES (
        p_user_id,
        p_info_id,
        v_customer_id,
        p_action_type,
        p_access_reason,
        p_ip_address,
        p_device_info
    );

    SELECT '✅ 접근 기록 저장 완료' AS result;
END//

DELIMITER ;

-- ============================================================================
-- 프로시저 4: GetAccessLogsByEmployee (직원별 접근 기록 조회)
-- ============================================================================
-- 용도: 특정 직원의 접근 기록을 조회 (필터링 가능)
DROP PROCEDURE IF EXISTS GetAccessLogsByEmployee;
DELIMITER //

CREATE PROCEDURE GetAccessLogsByEmployee(
    IN p_user_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_limit INT
)
BEGIN
    IF p_limit IS NULL THEN
        SET p_limit = 100;
    END IF;

    SELECT
        a.log_id,
        a.accessed_at,
        c.name AS customer_name,
        t.type_name AS info_type,
        a.action_type,
        a.access_reason,
        a.ip_address
    FROM AccessLogs a
    JOIN Customers c ON a.customer_id = c.customer_id
    JOIN PersonalInfo p ON a.info_id = p.info_id
    JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
    WHERE a.user_id = p_user_id
        AND DATE(a.accessed_at) BETWEEN p_start_date AND p_end_date
    ORDER BY a.accessed_at DESC
    LIMIT p_limit;
END//

DELIMITER ;

-- ============================================================================
-- 프로시저 5: DetectAnomalousActivity (이상 활동 탐지)
-- ============================================================================
-- 용도: 지난 24시간 동안의 이상 활동을 감지하고 알림 생성
DROP PROCEDURE IF EXISTS DetectAnomalousActivity;
DELIMITER //

CREATE PROCEDURE DetectAnomalousActivity()
BEGIN
    DECLARE v_admin_id INT;

    -- ADMIN 계정 ID 조회
    SELECT user_id INTO v_admin_id
    FROM Users
    WHERE role = 'ADMIN' AND is_active = TRUE
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '활성 ADMIN 계정이 없습니다.';
    END IF;

    -- 이상 활동 감지: 지난 24시간 50회 이상 접근
    INSERT INTO Audits (
        user_id,
        audit_period_start,
        audit_period_end,
        audit_type,
        access_count,
        alert_flags,
        audit_notes,
        audited_by
    )
    SELECT
        u.user_id,
        DATE_SUB(NOW(), INTERVAL 24 HOUR),
        NOW(),
        'ALERT',
        COUNT(a.log_id),
        JSON_OBJECT(
            'excessive_access', TRUE,
            'detection_time', NOW()
        ),
        CONCAT('이상 활동 감지: 24시간 내 ', COUNT(a.log_id), '회 접근'),
        v_admin_id
    FROM Users u
    JOIN AccessLogs a ON u.user_id = a.user_id
    WHERE a.accessed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND u.is_active = TRUE
        AND u.role = 'EMPLOYEE'
    GROUP BY u.user_id
    HAVING COUNT(a.log_id) > 50;

    SELECT '✅ 이상 활동 탐지 완료' AS result;
END//

DELIMITER ;

-- ============================================================================
-- 프로시저 생성 완료
-- ============================================================================
SELECT '✅ 5개 프로시저 생성 완료' AS status;
