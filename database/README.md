# 데이터베이스 설치 가이드

## 📋 파일 구성

| 파일명 | 설명 | 내용 |
|--------|------|------|
| `00_init_all.sql` | 🔴 통합 초기화 (권장) | 모든 단계를 자동 실행 |
| `01_schema.sql` | 테이블 생성 | 7개 테이블 정의 |
| `02_sample_data.sql` | 샘플 데이터 | 테스트용 데이터 |
| `03_views.sql` | 뷰 생성 | 8개 쿼리 뷰 |
| `04_procedures.sql` | 프로시저 생성 | 5개 저장 프로시저 |
| `05_triggers.sql` | 트리거 생성 | 5개 자동화 트리거 |

---

## 🚀 빠른 시작

### 1️⃣ MySQL 설치 확인
```bash
mysql --version
# MySQL 8.0.x 이상 필요
```

### 2️⃣ 데이터베이스 생성 (자동)

#### 옵션 A: 커맨드라인 (권장)
```bash
cd database
mysql -u root -p < 00_init_all.sql
```

비밀번호를 입력하라고 하면 MySQL root 비밀번호 입력

#### 옵션 B: MySQL Workbench
1. MySQL Workbench 실행
2. **File** → **Open SQL Script** → `00_init_all.sql` 선택
3. **Execute** (⚡ 아이콘) 클릭
4. 완료 메시지 확인

#### 옵션 C: 단계별 실행
```bash
mysql -u root -p < 01_schema.sql
mysql -u root -p < 02_sample_data.sql
mysql -u root -p < 03_views.sql
mysql -u root -p < 04_procedures.sql
mysql -u root -p < 05_triggers.sql
```

### 3️⃣ 설치 확인
```bash
mysql -u root -p -e "USE personal_info_system; SHOW TABLES;"
```

다음과 같이 7개 테이블이 보이면 성공:
```
Audits
AccessLogs
Customers
DeletionRequests
PersonalInfo
PersonalInfoTypes
Users
```

---

## 📊 데이터베이스 구조

### 테이블 (7개)

```
Users (5명 - 관리자 1명, 직원 4명)
├── user_id, username, password, name, department
├── position, email, role, is_active
└── created_at, updated_at

Customers (10명)
├── customer_id, name, phone, address
└── registered_at

PersonalInfoTypes (8가지)
├── info_type_id, type_name
├── sensitivity_level (1~5)
└── description

PersonalInfo (20개)
├── info_id, customer_id, info_type_id
├── info_value (암호화됨)
└── registered_at

AccessLogs (30개) ⭐ 핵심
├── log_id, user_id, info_id, customer_id
├── action_type (VIEW/EDIT/DELETE), access_reason
├── accessed_at, ip_address, device_info
└── 인덱스: user_id, customer_id, accessed_at

DeletionRequests (5개 PENDING)
├── request_id, info_id, customer_id
├── requested_by, deletion_reason, status
├── approved_by, requested_at, approved_at
└── rejected_at, rejection_reason

Audits (4개)
├── audit_id, user_id, audit_period_start, audit_period_end
├── audit_type (ROUTINE/ALERT/INVESTIGATION)
├── access_count, alert_flags (JSON)
├── audit_notes, audited_at, audited_by
└── 자동 생성된 감사 기록
```

### 뷰 (8개)
- `AccessLogDetail` - 접근 로그 상세 조회
- `AccessStatsByEmployee` - 직원별 접근 통계
- `PendingDeletionRequests` - 파기 대기 목록
- `AnomalyDetectionSummary` - 이상 탐지 요약
- `DailyAccessReport` - 일일 접근 보고서
- `EmployeeAccessTimeline` - 직원 접근 타임라인
- `HighRiskAccessActivity` - 고위험 접근 활동
- `CustomerPrivacyStatus` - 고객 정보 현황

### 프로시저 (5개)
```sql
-- 파기 요청 승인/거절
CALL ApproveDeleteionRequest(request_id, approved_by, status, reason);

-- 일일 감사 기록 생성
CALL GenerateDailyAudit();

-- 접근 기록 저장 (백엔드에서 호출)
CALL RecordAccessLog(user_id, info_id, action_type, reason, ip, device);

-- 직원별 접근 기록 조회
CALL GetAccessLogsByEmployee(user_id, start_date, end_date, limit);

-- 이상 활동 탐지
CALL DetectAnomalousActivity();
```

### 트리거 (5개)
1. `UpdateAuditFlagsOnAccess` - 접근 시 이상 탐지 플래그 자동 계산
2. `LogUserActivity` - 사용자 활동 추적
3. `PreventUnauthorizedDeletion` - 미승인 삭제 방지
4. `AuditPersonalInfoChanges` - 개인정보 변경 감시
5. `AutoSetUpdatedTimestamp` - 수정 시간 자동 갱신

---

## 🔐 테스트 계정

### 관리자
- **Username:** `admin`
- **Password:** `password`
- **Role:** ADMIN
- **부서:** 감시팀

### 직원
| Username | Name | Department | Position |
|----------|------|-----------|----------|
| emp001 | 이직원 | 영업팀 | 과장 |
| emp002 | 박직원 | 영업팀 | 대리 |
| emp003 | 최직원 | 고객팀 | 과장 |
| emp004 | 정직원 | 대출팀 | 대리 |

**모두 동일한 비밀번호:** `password`

> ⚠️ **중요:** 실제 운영 환경에서는 bcrypt 등으로 해시 처리된 강력한 비밀번호 사용 필수

---

## 🧪 테스트 쿼리

### 1. 모든 접근 기록 조회
```sql
SELECT * FROM AccessLogDetail ORDER BY accessed_at DESC;
```

### 2. 직원별 접근 통계
```sql
SELECT * FROM AccessStatsByEmployee;
```

### 3. 파기 대기 건수
```sql
SELECT * FROM PendingDeletionRequests;
```

### 4. 이상 탐지 기록
```sql
SELECT * FROM AnomalyDetectionSummary;
```

### 5. 특정 직원의 접근 기록
```sql
CALL GetAccessLogsByEmployee(2, '2024-11-01', '2024-11-30', 50);
```

### 6. 파기 요청 승인 테스트
```sql
CALL ApproveDeleteionRequest(1, 1, 'APPROVED', NULL);
```

### 7. 일일 감사 생성
```sql
CALL GenerateDailyAudit();
```

---

## 📈 성능 최적화

### 생성된 인덱스
```sql
-- Users
KEY idx_role (role)
KEY idx_username (username)

-- Customers
KEY idx_name (name)
KEY idx_phone (phone)

-- PersonalInfo
KEY idx_customer (customer_id)
KEY idx_type (info_type_id)

-- AccessLogs (최중요)
KEY idx_user (user_id)
KEY idx_customer (customer_id)
KEY idx_accessed_at (accessed_at)
KEY idx_info (info_id)
KEY idx_composite (user_id, accessed_at)

-- DeletionRequests
KEY idx_status (status)
KEY idx_requested_at (requested_at)
KEY idx_approved_by (approved_by)

-- Audits
KEY idx_user (user_id)
KEY idx_audit_type (audit_type)
KEY idx_audited_at (audited_at)
```

---

## 🐛 일반적인 문제 해결

### Q1: "Access denied for user 'root'"
**해결:** MySQL 비밀번호 확인
```bash
mysql -u root -p  # 비밀번호 입력
```

### Q2: "Database personal_info_system already exists"
**해결:** 기존 데이터베이스 삭제 (데이터 손실 주의!)
```sql
DROP DATABASE personal_info_system;
```

### Q3: "Command 'source' not recognized"
**해결:** MySQL 워크벤치에서 실행하거나 전체 경로 사용
```bash
mysql -u root -p personal_info_system < 00_init_all.sql
```

### Q4: 트리거 생성 오류
**해결:** 트리거 권한 확인
```sql
SHOW GRANTS FOR 'root'@'localhost';
```

---

## 📚 MySQL 유용한 명령어

```bash
# 데이터베이스 선택
mysql -u root -p personal_info_system

# SQL 파일 실행 (MySQL 접속 후)
source 00_init_all.sql;

# 테이블 목록 보기
SHOW TABLES;

# 테이블 구조 확인
DESCRIBE Users;

# 뷰 목록 보기
SELECT * FROM information_schema.VIEWS 
WHERE TABLE_SCHEMA = 'personal_info_system';

# 프로시저 목록 보기
SELECT * FROM information_schema.ROUTINES 
WHERE ROUTINE_SCHEMA = 'personal_info_system';

# 트리거 목록 보기
SELECT * FROM information_schema.TRIGGERS 
WHERE TRIGGER_SCHEMA = 'personal_info_system';

# 전체 데이터 삭제 (테이블 구조 유지)
TRUNCATE TABLE AccessLogs;

# 데이터베이스 크기 확인
SELECT 
  table_schema, 
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb 
FROM information_schema.tables 
WHERE table_schema = 'personal_info_system' 
GROUP BY table_schema;
```

---

## 🔄 정기 유지보수

### 매일 (자정)
```sql
-- 일일 감사 기록 생성
CALL GenerateDailyAudit();

-- 이상 활동 탐지
CALL DetectAnomalousActivity();
```

### 매주
```sql
-- 접근 로그 백업
CREATE TABLE AccessLogs_Backup_YYYY_MM_DD AS 
SELECT * FROM AccessLogs 
WHERE accessed_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### 매월
```sql
-- 용량 점검
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'personal_info_system'
ORDER BY size_mb DESC;
```

---

## 📞 지원

문제가 발생하면:
1. 위의 "문제 해결" 섹션 참조
2. MySQL 로그 확인: `/var/log/mysql/error.log`
3. GitHub Issues에 보고

---

**생성일:** 2024년 11월 5일  
**버전:** 1.0  
**상태:** ✅ 완료
