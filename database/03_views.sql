-- ============================================================================
-- 고객 개인정보 처리·열람 관리 시스템 - 뷰 (View)
-- ============================================================================

USE personal_info_system;

-- ============================================================================
-- 뷰 1: AccessLogDetail (접근 로그 상세 조회)
-- ============================================================================
-- 용도: 접근 기록을 직원명, 고객명, 정보유형 등과 함께 조회
DROP VIEW IF EXISTS AccessLogDetail;
CREATE VIEW AccessLogDetail AS
SELECT
    a.log_id,
    a.accessed_at,
    u.user_id,
    u.username AS employee_username,
    u.name AS employee_name,
    u.department,
    c.customer_id,
    c.name AS customer_name,
    c.phone,
    t.info_type_id,
    t.type_name AS info_type,
    t.sensitivity_level,
    a.action_type,
    a.access_reason,
    a.ip_address,
    a.device_info,
    HOUR(a.accessed_at) AS access_hour,
    DAYNAME(a.accessed_at) AS access_day
FROM AccessLogs a
JOIN Users u ON a.user_id = u.user_id
JOIN Customers c ON a.customer_id = c.customer_id
JOIN PersonalInfo p ON a.info_id = p.info_id
JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
ORDER BY a.accessed_at DESC;

-- ============================================================================
-- 뷰 2: AccessStatsByEmployee (직원별 접근 현황)
-- ============================================================================
-- 용도: 각 직원의 일일 접근 통계
DROP VIEW IF EXISTS AccessStatsByEmployee;
CREATE VIEW AccessStatsByEmployee AS
SELECT
    u.user_id,
    u.username,
    u.name,
    u.department,
    u.position,
    u.role,
    COUNT(a.log_id) AS total_access_count,
    COUNT(DISTINCT a.customer_id) AS unique_customers_accessed,
    COUNT(DISTINCT DATE(a.accessed_at)) AS access_days,
    MAX(a.accessed_at) AS last_access_time,
    MIN(a.accessed_at) AS first_access_time,
    SUM(CASE WHEN HOUR(a.accessed_at) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) AS abnormal_time_access_count,
    SUM(CASE WHEN HOUR(a.accessed_at) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) > 5 AS has_abnormal_time_flag
FROM Users u
LEFT JOIN AccessLogs a ON u.user_id = a.user_id
    AND DATE(a.accessed_at) = CURDATE()
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.username, u.name, u.department, u.position, u.role;

-- ============================================================================
-- 뷰 3: PendingDeletionRequests (파기 대기 건수)
-- ============================================================================
-- 용도: 승인 대기 중인 파기 요청 목록
DROP VIEW IF EXISTS PendingDeletionRequests;
CREATE VIEW PendingDeletionRequests AS
SELECT
    d.request_id,
    d.requested_at,
    c.customer_id,
    c.name AS customer_name,
    c.phone,
    t.type_name AS info_type,
    t.sensitivity_level,
    u.username AS requested_by_username,
    u.name AS requested_by_name,
    u.department,
    d.deletion_reason,
    DATEDIFF(CURDATE(), DATE(d.requested_at)) AS days_pending,
    d.status
FROM DeletionRequests d
JOIN PersonalInfo p ON d.info_id = p.info_id
JOIN Customers c ON d.customer_id = c.customer_id
JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
JOIN Users u ON d.requested_by = u.user_id
WHERE d.status = 'PENDING'
ORDER BY d.requested_at ASC;

-- ============================================================================
-- 뷰 4: AnomalyDetectionSummary (이상 탐지 요약)
-- ============================================================================
-- 용도: 이상 탐지 플래그가 설정된 감사 기록 조회
DROP VIEW IF EXISTS AnomalyDetectionSummary;
CREATE VIEW AnomalyDetectionSummary AS
SELECT
    a.audit_id,
    a.user_id,
    u.username,
    u.name,
    u.department,
    a.audit_period_start,
    a.audit_period_end,
    a.audit_type,
    a.access_count,
    JSON_EXTRACT(a.alert_flags, '$.excessive_access') AS excessive_access,
    JSON_EXTRACT(a.alert_flags, '$.abnormal_time') AS abnormal_time,
    JSON_EXTRACT(a.alert_flags, '$.rapid_access') AS rapid_access,
    JSON_EXTRACT(a.alert_flags, '$.cross_department') AS cross_department,
    a.audit_notes,
    a.audited_at,
    auditor.name AS audited_by_name
FROM Audits a
JOIN Users u ON a.user_id = u.user_id
JOIN Users auditor ON a.audited_by = auditor.user_id
WHERE a.audit_type IN ('ALERT', 'INVESTIGATION')
ORDER BY a.audited_at DESC;

-- ============================================================================
-- 뷰 5: DailyAccessReport (일일 접근 보고서)
-- ============================================================================
-- 용도: 날짜별 접근 통계 및 요약
DROP VIEW IF EXISTS DailyAccessReport;
CREATE VIEW DailyAccessReport AS
SELECT
    DATE(a.accessed_at) AS access_date,
    COUNT(a.log_id) AS total_access_count,
    COUNT(DISTINCT a.user_id) AS employee_count,
    COUNT(DISTINCT a.customer_id) AS customer_count,
    COUNT(DISTINCT a.info_id) AS info_count,
    SUM(CASE WHEN HOUR(a.accessed_at) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) AS abnormal_time_count,
    SUM(CASE WHEN DAYNAME(a.accessed_at) IN ('Saturday', 'Sunday') THEN 1 ELSE 0 END) AS weekend_count,
    MIN(a.accessed_at) AS first_access_time,
    MAX(a.accessed_at) AS last_access_time
FROM AccessLogs a
GROUP BY DATE(a.accessed_at)
ORDER BY access_date DESC;

-- ============================================================================
-- 뷰 6: EmployeeAccessTimeline (직원 접근 타임라인)
-- ============================================================================
-- 용도: 특정 직원의 시간대별 접근 기록
DROP VIEW IF EXISTS EmployeeAccessTimeline;
CREATE VIEW EmployeeAccessTimeline AS
SELECT
    a.log_id,
    a.user_id,
    u.username,
    u.name,
    u.department,
    a.accessed_at,
    HOUR(a.accessed_at) AS hour_of_day,
    DATE(a.accessed_at) AS access_date,
    c.name AS customer_name,
    t.type_name AS info_type,
    a.action_type,
    a.access_reason,
    a.ip_address
FROM AccessLogs a
JOIN Users u ON a.user_id = u.user_id
JOIN Customers c ON a.customer_id = c.customer_id
JOIN PersonalInfo p ON a.info_id = p.info_id
JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
ORDER BY a.accessed_at DESC;

-- ============================================================================
-- 뷰 7: HighRiskAccessActivity (고위험 접근 활동)
-- ============================================================================
-- 용도: 이상 패턴의 접근 활동 식별 (야간, 휴일, 대량 접근 등)
DROP VIEW IF EXISTS HighRiskAccessActivity;
CREATE VIEW HighRiskAccessActivity AS
SELECT
    a.log_id,
    a.user_id,
    u.username,
    u.name,
    u.department,
    a.accessed_at,
    c.name AS customer_name,
    t.type_name AS info_type,
    a.access_reason,
    CASE
        WHEN HOUR(a.accessed_at) < 8 OR HOUR(a.accessed_at) >= 18 THEN '야간 접근'
        WHEN DAYNAME(a.accessed_at) IN ('Saturday', 'Sunday') THEN '휴일 접근'
        WHEN u.department != (SELECT department FROM Customers WHERE customer_id = a.customer_id LIMIT 1) THEN '부서외 접근'
        ELSE '기타'
    END AS risk_category,
    CASE
        WHEN HOUR(a.accessed_at) < 8 OR HOUR(a.accessed_at) >= 18 THEN 'HIGH'
        WHEN DAYNAME(a.accessed_at) IN ('Saturday', 'Sunday') THEN 'HIGH'
        ELSE 'MEDIUM'
    END AS risk_level
FROM AccessLogs a
JOIN Users u ON a.user_id = u.user_id
JOIN Customers c ON a.customer_id = c.customer_id
JOIN PersonalInfo p ON a.info_id = p.info_id
JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
WHERE (HOUR(a.accessed_at) < 8 OR HOUR(a.accessed_at) >= 18)
   OR DAYNAME(a.accessed_at) IN ('Saturday', 'Sunday')
ORDER BY a.accessed_at DESC;

-- ============================================================================
-- 뷰 8: CustomerPrivacyStatus (고객 개인정보 현황)
-- ============================================================================
-- 용도: 각 고객의 등록된 정보와 접근 현황
DROP VIEW IF EXISTS CustomerPrivacyStatus;
CREATE VIEW CustomerPrivacyStatus AS
SELECT
    c.customer_id,
    c.name,
    c.phone,
    c.registered_at,
    COUNT(p.info_id) AS registered_info_count,
    COUNT(DISTINCT a.user_id) AS accessed_by_employee_count,
    MAX(a.accessed_at) AS last_access_time,
    GROUP_CONCAT(DISTINCT t.type_name ORDER BY t.type_name SEPARATOR ', ') AS info_types,
    GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS accessed_by_employees,
    SUM(CASE WHEN d.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_deletion_count
FROM Customers c
LEFT JOIN PersonalInfo p ON c.customer_id = p.customer_id
LEFT JOIN PersonalInfoTypes t ON p.info_type_id = t.info_type_id
LEFT JOIN AccessLogs a ON p.info_id = a.info_id
LEFT JOIN Users u ON a.user_id = u.user_id
LEFT JOIN DeletionRequests d ON p.info_id = d.info_id
GROUP BY c.customer_id, c.name, c.phone, c.registered_at
ORDER BY c.registered_at DESC;

-- ============================================================================
-- 뷰 생성 완료
-- ============================================================================
SELECT '✅ 8개 뷰 생성 완료' AS status;
