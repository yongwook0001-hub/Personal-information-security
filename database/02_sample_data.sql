-- ============================================================================
-- 고객 개인정보 처리·열람 관리 시스템 - 샘플 데이터
-- ============================================================================

USE personal_info_system;

-- ============================================================================
-- PersonalInfoTypes 초기 데이터 (개인정보 유형)
-- ============================================================================
INSERT INTO PersonalInfoTypes (type_name, sensitivity_level, description) VALUES
('주민번호', 5, '고도로 민감한 개인식별정보'),
('여권번호', 4, '국제 신분증'),
('운전면허번호', 4, '신분증'),
('신용카드번호', 5, '금융 정보'),
('계좌번호', 5, '금융 정보'),
('생년월일', 3, '기본 개인정보'),
('전자우편주소', 2, '연락처'),
('직업', 2, '기본 개인정보');

-- ============================================================================
-- Users 초기 데이터 (직원 계정)
-- ============================================================================
-- 비밀번호: password (실제 운영 시 bcrypt 해시 처리)
INSERT INTO Users (username, password, name, department, position, email, role, is_active) VALUES
('admin', '$2a$10$slYQmyNdGzin7olVN3p5be0DlH.PKZbv5H8KnzzVgXXbVxzy2QIDG', '김총괄', '감시팀', '총괄책임자', 'admin@company.com', 'ADMIN', TRUE),
('emp001', '$2a$10$slYQmyNdGzin7olVN3p5be0DlH.PKZbv5H8KnzzVgXXbVxzy2QIDG', '이직원', '영업팀', '과장', 'emp001@company.com', 'EMPLOYEE', TRUE),
('emp002', '$2a$10$slYQmyNdGzin7olVN3p5be0DlH.PKZbv5H8KnzzVgXXbVxzy2QIDG', '박직원', '영업팀', '대리', 'emp002@company.com', 'EMPLOYEE', TRUE),
('emp003', '$2a$10$slYQmyNdGzin7olVN3p5be0DlH.PKZbv5H8KnzzVgXXbVxzy2QIDG', '최직원', '고객팀', '과장', 'emp003@company.com', 'EMPLOYEE', TRUE),
('emp004', '$2a$10$slYQmyNdGzin7olVN3p5be0DlH.PKZbv5H8KnzzVgXXbVxzy2QIDG', '정직원', '대출팀', '대리', 'emp004@company.com', 'EMPLOYEE', TRUE);

-- ============================================================================
-- Customers 초기 데이터 (고객)
-- ============================================================================
INSERT INTO Customers (name, phone, address) VALUES
('홍길동', '010-1111-2222', '서울시 강남구 테헤란로 123'),
('이순신', '010-2222-3333', '서울시 종로구 종로 456'),
('유관순', '010-3333-4444', '대전시 중구 대종로 789'),
('강감찬', '010-4444-5555', '경주시 황성동 대릉원로 321'),
('세종대왕', '010-5555-6666', '서울시 중구 세종대로 654'),
('이황', '010-6666-7777', '경주시 안강읍 도리사길 987'),
('다산정약용', '010-7777-8888', '경기도 남양주시 조안읍 541'),
('신사임당', '010-8888-9999', '강릉시 죽헌길 852'),
('장보고', '010-9999-0000', '전라남도 완도군 완도읍 369'),
('이순지', '010-0000-1111', '서울시 마포구 희우정로 147');

-- ============================================================================
-- PersonalInfo 샘플 데이터 (고객 개인정보)
-- ============================================================================
-- 홍길동
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(1, 1, UNHEX('48657820656E636F646564') , '2024-01-15 10:00:00'),
(1, 4, UNHEX('48657820656E636F646564'), '2024-01-15 10:05:00'),
(1, 5, UNHEX('48657820656E636F646564'), '2024-01-15 10:10:00');

-- 이순신
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(2, 1, UNHEX('48657820656E636F646564'), '2024-01-20 14:00:00'),
(2, 4, UNHEX('48657820656E636F646564'), '2024-01-20 14:05:00'),
(2, 5, UNHEX('48657820656E636F646564'), '2024-01-20 14:10:00');

-- 유관순
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(3, 1, UNHEX('48657820656E636F646564'), '2024-02-01 09:00:00'),
(3, 3, UNHEX('48657820656E636F646564'), '2024-02-01 09:05:00'),
(3, 5, UNHEX('48657820656E636F646564'), '2024-02-01 09:10:00');

-- 강감찬
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(4, 1, UNHEX('48657820656E636F646564'), '2024-02-10 11:00:00'),
(4, 4, UNHEX('48657820656E636F646564'), '2024-02-10 11:05:00'),
(4, 6, UNHEX('48657820656E636F646564'), '2024-02-10 11:10:00');

-- 세종대왕
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(5, 1, UNHEX('48657820656E636F646564'), '2024-03-01 08:00:00'),
(5, 2, UNHEX('48657820656E636F646564'), '2024-03-01 08:05:00'),
(5, 5, UNHEX('48657820656E636F646564'), '2024-03-01 08:10:00');

-- 이황
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(6, 1, UNHEX('48657820656E636F646564'), '2024-03-15 13:00:00'),
(6, 4, UNHEX('48657820656E636F646564'), '2024-03-15 13:05:00');

-- 다산정약용
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(7, 1, UNHEX('48657820656E636F646564'), '2024-04-01 10:00:00'),
(7, 5, UNHEX('48657820656E636F646564'), '2024-04-01 10:05:00'),
(7, 6, UNHEX('48657820656E636F646564'), '2024-04-01 10:10:00');

-- 신사임당
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(8, 1, UNHEX('48657820656E636F646564'), '2024-04-20 15:00:00'),
(8, 3, UNHEX('48657820656E636F646564'), '2024-04-20 15:05:00');

-- 장보고
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(9, 1, UNHEX('48657820656E636F646564'), '2024-05-05 09:00:00'),
(9, 4, UNHEX('48657820656E636F646564'), '2024-05-05 09:05:00'),
(9, 5, UNHEX('48657820656E636F646564'), '2024-05-05 09:10:00');

-- 이순지
INSERT INTO PersonalInfo (customer_id, info_type_id, info_value, registered_at) VALUES
(10, 1, UNHEX('48657820656E636F646564'), '2024-05-20 11:00:00'),
(10, 4, UNHEX('48657820656E636F646564'), '2024-05-20 11:05:00');

-- ============================================================================
-- AccessLogs 샘플 데이터 (접근 기록) - 30개 항목
-- ============================================================================

-- 이직원 (emp001) - 영업팀
INSERT INTO AccessLogs (user_id, info_id, customer_id, action_type, access_reason, accessed_at, ip_address, device_info) VALUES
(2, 1, 1, 'VIEW', '대출 심사', '2024-11-04 09:30:00', '192.168.1.5', 'Chrome/Windows'),
(2, 2, 1, 'VIEW', '거래 확인', '2024-11-04 10:15:00', '192.168.1.5', 'Chrome/Windows'),
(2, 4, 2, 'VIEW', '신용 조회', '2024-11-04 11:00:00', '192.168.1.5', 'Chrome/Windows'),
(2, 6, 3, 'VIEW', '카드 발급', '2024-11-04 14:30:00', '192.168.1.5', 'Chrome/Windows'),
(2, 7, 4, 'VIEW', '대출 상담', '2024-11-04 15:45:00', '192.168.1.5', 'Chrome/Windows'),
(2, 13, 7, 'VIEW', '계좌 개설', '2024-11-05 08:00:00', '192.168.1.5', 'Chrome/Windows'),
(2, 16, 9, 'VIEW', '대출 심사', '2024-11-05 09:30:00', '192.168.1.5', 'Chrome/Windows');

-- 박직원 (emp002) - 영업팀
INSERT INTO AccessLogs (user_id, info_id, customer_id, action_type, access_reason, accessed_at, ip_address, device_info) VALUES
(3, 3, 1, 'VIEW', '신용카드 발급', '2024-11-04 09:00:00', '192.168.1.8', 'Firefox/MacOS'),
(3, 4, 2, 'VIEW', '대출 신청', '2024-11-04 10:30:00', '192.168.1.8', 'Firefox/MacOS'),
(3, 5, 2, 'VIEW', '계좌 거래', '2024-11-04 11:15:00', '192.168.1.8', 'Firefox/MacOS'),
(3, 8, 4, 'VIEW', '신용카드', '2024-11-04 13:45:00', '192.168.1.8', 'Firefox/MacOS'),
(3, 10, 5, 'VIEW', '대출 상담', '2024-11-04 16:00:00', '192.168.1.8', 'Firefox/MacOS'),
(3, 14, 8, 'VIEW', '거래 확인', '2024-11-05 10:00:00', '192.168.1.8', 'Firefox/MacOS'),
(3, 15, 8, 'VIEW', '운면 조회', '2024-11-05 10:30:00', '192.168.1.8', 'Firefox/MacOS');

-- 최직원 (emp003) - 고객팀
INSERT INTO AccessLogs (user_id, info_id, customer_id, action_type, access_reason, accessed_at, ip_address, device_info) VALUES
(4, 9, 5, 'VIEW', '여권번호 확인', '2024-11-04 10:00:00', '192.168.1.10', 'Safari/iOS'),
(4, 11, 6, 'VIEW', '신용카드 발급', '2024-11-04 12:00:00', '192.168.1.10', 'Safari/iOS'),
(4, 12, 6, 'VIEW', '계좌 개설', '2024-11-04 12:30:00', '192.168.1.10', 'Safari/iOS'),
(4, 17, 9, 'VIEW', '대출 심사', '2024-11-04 15:00:00', '192.168.1.10', 'Safari/iOS'),
(4, 18, 10, 'VIEW', '거래 확인', '2024-11-04 16:30:00', '192.168.1.10', 'Safari/iOS');

-- 정직원 (emp004) - 대출팀
INSERT INTO AccessLogs (user_id, info_id, customer_id, action_type, access_reason, accessed_at, ip_address, device_info) VALUES
(5, 1, 1, 'VIEW', '대출 승인', '2024-11-05 08:30:00', '192.168.1.15', 'Chrome/Windows'),
(5, 2, 1, 'VIEW', '신용 조회', '2024-11-05 09:00:00', '192.168.1.15', 'Chrome/Windows'),
(5, 3, 1, 'VIEW', '카드 한도', '2024-11-05 09:15:00', '192.168.1.15', 'Chrome/Windows'),
(5, 6, 3, 'VIEW', '대출 신청', '2024-11-05 11:00:00', '192.168.1.15', 'Chrome/Windows'),
(5, 19, 10, 'VIEW', '신용카드', '2024-11-05 14:00:00', '192.168.1.15', 'Chrome/Windows');

-- ============================================================================
-- DeletionRequests 샘플 데이터 (파기 요청)
-- ============================================================================
INSERT INTO DeletionRequests (info_id, customer_id, requested_by, deletion_reason, status, requested_at) VALUES
(1, 1, 2, '계약 종료로 더 이상 필요 없음', 'PENDING', '2024-11-05 09:00:00'),
(4, 2, 2, '고객 요청', 'PENDING', '2024-11-05 10:30:00'),
(7, 4, 3, '신용 정보 변경', 'PENDING', '2024-11-05 11:00:00'),
(13, 7, 4, '계약 해지', 'PENDING', '2024-11-05 13:45:00'),
(16, 9, 5, '고객 삭제 요청', 'PENDING', '2024-11-05 14:00:00');

-- ============================================================================
-- Audits 샘플 데이터 (감사 기록)
-- ============================================================================
INSERT INTO Audits (user_id, audit_period_start, audit_period_end, audit_type, access_count, alert_flags, audit_notes, audited_by) VALUES
(2, '2024-11-01 00:00:00', '2024-11-05 23:59:59', 'ROUTINE', 7, JSON_OBJECT(
    'excessive_access', FALSE,
    'abnormal_time', FALSE,
    'rapid_access', FALSE
), '정상 접근 패턴', 1),
(3, '2024-11-01 00:00:00', '2024-11-05 23:59:59', 'ROUTINE', 7, JSON_OBJECT(
    'excessive_access', FALSE,
    'abnormal_time', FALSE,
    'rapid_access', FALSE
), '정상 접근 패턴', 1),
(4, '2024-11-01 00:00:00', '2024-11-05 23:59:59', 'ROUTINE', 5, JSON_OBJECT(
    'excessive_access', FALSE,
    'abnormal_time', FALSE,
    'rapid_access', FALSE
), '정상 접근 패턴', 1),
(5, '2024-11-01 00:00:00', '2024-11-05 23:59:59', 'ROUTINE', 5, JSON_OBJECT(
    'excessive_access', FALSE,
    'abnormal_time', FALSE,
    'rapid_access', FALSE
), '정상 접근 패턴', 1);

-- ============================================================================
-- 데이터 삽입 완료
-- ============================================================================
SELECT '✅ 샘플 데이터 삽입 완료' AS status;
SELECT COUNT(*) AS Users_Count FROM Users;
SELECT COUNT(*) AS Customers_Count FROM Customers;
SELECT COUNT(*) AS PersonalInfo_Count FROM PersonalInfo;
SELECT COUNT(*) AS AccessLogs_Count FROM AccessLogs;
SELECT COUNT(*) AS DeletionRequests_Count FROM DeletionRequests;
SELECT COUNT(*) AS Audits_Count FROM Audits;
