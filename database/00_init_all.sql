-- ============================================================================
-- 고객 개인정보 처리·열람 관리 시스템 - 통합 초기화 스크립트
-- ============================================================================
-- 이 스크립트는 모든 테이블, 데이터, 뷰, 프로시저, 트리거를 한 번에 생성합니다.
--
-- 실행 방법:
--   mysql -u root -p < 00_init_all.sql
-- 또는 MySQL 워크벤치에서 파일 실행
--
-- 주의: 기존 personal_info_system 데이터베이스가 있으면 삭제됩니다.
-- ============================================================================

-- 1. 테이블 생성
SOURCE 01_schema.sql;

-- 2. 샘플 데이터 삽입
SOURCE 02_sample_data.sql;

-- 3. 뷰 생성
SOURCE 03_views.sql;

-- 4. 프로시저 생성
SOURCE 04_procedures.sql;

-- 5. 트리거 생성
SOURCE 05_triggers.sql;

-- ============================================================================
-- 최종 검증 및 통계
-- ============================================================================

USE personal_info_system;

SELECT '\n========================================' AS '';
SELECT '✅ 데이터베이스 초기화 완료!' AS status;
SELECT '========================================' AS '';

SELECT '📊 생성된 객체 현황:' AS '';
SELECT COUNT(*) AS Tables_Count FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'personal_info_system' AND TABLE_TYPE = 'BASE TABLE' AS table_count;
SELECT COUNT(*) AS Views_Count FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'personal_info_system' AND TABLE_TYPE = 'VIEW';
SELECT COUNT(*) AS Procedures_Count FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = 'personal_info_system' AND ROUTINE_TYPE = 'PROCEDURE';
SELECT COUNT(*) AS Triggers_Count FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = 'personal_info_system';

SELECT '' AS '';
SELECT '📈 데이터 통계:' AS '';

SELECT CONCAT('Users: ', COUNT(*)) FROM Users;
SELECT CONCAT('Customers: ', COUNT(*)) FROM Customers;
SELECT CONCAT('PersonalInfoTypes: ', COUNT(*)) FROM PersonalInfoTypes;
SELECT CONCAT('PersonalInfo: ', COUNT(*)) FROM PersonalInfo;
SELECT CONCAT('AccessLogs: ', COUNT(*)) FROM AccessLogs;
SELECT CONCAT('DeletionRequests: ', COUNT(*)) FROM DeletionRequests;
SELECT CONCAT('Audits: ', COUNT(*)) FROM Audits;

SELECT '' AS '';
SELECT '🔐 테스트 계정:' AS '';
SELECT 'Username: admin, Role: ADMIN' AS '';
SELECT 'Username: emp001, Role: EMPLOYEE' AS '';
SELECT 'Username: emp002, Role: EMPLOYEE' AS '';
SELECT 'Username: emp003, Role: EMPLOYEE' AS '';
SELECT 'Username: emp004, Role: EMPLOYEE' AS '';
SELECT 'Password: password (실제 운영 시 변경 필수)' AS '';

SELECT '' AS '';
SELECT '🎯 다음 단계:' AS '';
SELECT '1. Spring Boot 백엔드 프로젝트 생성' AS '';
SELECT '2. Repository, Service, Controller 구현' AS '';
SELECT '3. 직원용 및 관리자용 프론트엔드 개발' AS '';
SELECT '4. 통합 테스트' AS '';

SELECT '\n========================================' AS '';
