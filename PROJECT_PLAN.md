# 고객 개인정보 처리·열람 관리 시스템 - 프로젝트 계획서

## 📋 프로젝트 개요

**시스템명:** 고객 개인정보 처리·열람 관리 시스템  
**목적:** 금융회사 내부통제용 DB 응용 프로그램  
**특징:** 직원의 개인정보 접근·처리 기록 및 총괄 책임자의 감시/감사 시스템

---

## 🗄️ 데이터베이스 설계 (ERD)

### 테이블 구조 (7개)

#### 1️⃣ **Users** (직원/사용자)
- `user_id` (PK): 직원 ID
- `username`: 로그인 ID
- `password`: 비밀번호 (해시)
- `name`: 직원 이름
- `department`: 부서
- `position`: 직책
- `email`: 이메일
- `role`: 권한 ('EMPLOYEE' / 'ADMIN')
- `is_active`: 활성 여부
- `created_at`: 가입일
- `updated_at`: 수정일

#### 2️⃣ **Customers** (고객)
- `customer_id` (PK): 고객 ID
- `name`: 고객 이름
- `phone`: 전화번호
- `address`: 주소
- `registered_at`: 등록일

#### 3️⃣ **PersonalInfoTypes** (개인정보 유형)
- `info_type_id` (PK): 유형 ID
- `type_name`: 유형명 (예: '주민번호', '계좌번호', '신용카드번호' 등)
- `sensitivity_level`: 민감도 레벨 (1~5, 높을수록 민감)

#### 4️⃣ **PersonalInfo** (고객 개인정보)
- `info_id` (PK): 정보 ID
- `customer_id` (FK): 고객 ID
- `info_type_id` (FK): 정보 유형 ID
- `info_value`: 실제 데이터 (암호화 저장 권장)
- `registered_at`: 등록일

#### 5️⃣ **AccessLogs** (개인정보 접근 기록)
- `log_id` (PK): 기록 ID
- `user_id` (FK): 접근한 직원
- `info_id` (FK): 접근한 개인정보
- `action_type`: 접근 유형 ('VIEW' / 'EDIT' / 'DELETE')
- `access_reason`: 접근 사유
- `accessed_at`: 접근 시각
- `ip_address`: IP 주소
- `device_info`: 장치 정보 (선택)

#### 6️⃣ **DeletionRequests** (정보 파기 요청)
- `request_id` (PK): 요청 ID
- `info_id` (FK): 파기할 정보
- `requested_by` (FK): 요청자 (직원 ID)
- `deletion_reason`: 파기 사유
- `status`: 상태 ('PENDING' / 'APPROVED' / 'REJECTED' / 'DELETED')
- `approved_by` (FK): 승인자 (총괄 책임자)
- `requested_at`: 요청일
- `approved_at`: 승인일
- `deleted_at`: 파기일

#### 7️⃣ **Audits** (감사 기록 & 이상 탐지)
- `audit_id` (PK): 감사 ID
- `user_id` (FK): 대상 직원
- `audit_type`: 감사 유형 ('ROUTINE' / 'ALERT' / 'INVESTIGATION')
- `access_count`: 해당 기간 접근 횟수
- `alert_flags`: 이상 탐지 플래그 (비정상 접근 패턴 등)
  - 장시간 집중 접근
  - 야간/휴일 접근
  - 부서 외 고객정보 접근
  - 단기간 대량 접근
- `audit_notes`: 감사 코멘트
- `audited_at`: 감사 시각
- `audited_by` (FK): 감사자 (총괄 책임자)

---

## 🎨 GUI 설계

### 직원용 GUI (EMPLOYEE)

**주요 기능:**
1. **로그인** - 직원 인증
2. **고객 정보 열람** - 고객 목록 조회, 고객별 개인정보 조회
3. **개인정보 접근** - 필요한 개인정보 열람 (자동 기록)
4. **접근 이유 입력** - 개인정보 접근 시 사유 기록
5. **파기 요청** - 더 이상 필요 없는 정보 삭제 요청
6. **내 접근 기록 조회** - 자신의 접근 이력 확인

**화면 구성:**
- 메인 대시보드
- 고객 검색 & 상세 조회
- 개인정보 접근 (사유 입력 폼)
- 파기 요청 폼
- 내 접근 기록 조회

---

### 총괄 책임자용 GUI (ADMIN)

**주요 기능:**
1. **로그인** - 관리자 인증
2. **직원 관리** - 직원 계정 생성/비활성화
3. **접근 기록 모니터링** - 전체 접근 기록 실시간 조회
4. **이상 탐지** - 비정상 접근 패턴 자동 감지 및 알림
5. **감사 기록** - 직원별 감사 수행 및 코멘트 작성
6. **파기 승인** - 삭제 요청 검토 및 승인/거절
7. **통계 & 보고서** - 접근 통계, 이상 탐지 현황 등

**화면 구성:**
- 관리자 대시보드 (이상 탐지 알림 포함)
- 접근 기록 조회 (필터링/검색)
- 직원 관리 페이지
- 감사 수행 페이지
- 파기 승인 페이지
- 통계 & 보고서

---

## 📁 프로젝트 디렉토리 구조

```
고객 개인정보 처리·열람 관리 시스템/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/finance/personalinfo/
│   │   │   │       ├── controller/
│   │   │   │       ├── service/
│   │   │   │       ├── repository/
│   │   │   │       ├── entity/
│   │   │   │       ├── dto/
│   │   │   │       ├── config/
│   │   │   │       └── util/
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       ├── schema.sql
│   │   │       └── data.sql
│   │   └── test/
│   ├── pom.xml
│   └── README.md
├── frontend/
│   ├── employee/
│   │   ├── index.html
│   │   ├── css/
│   │   ├── js/
│   │   └── pages/
│   └── admin/
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── pages/
├── database/
│   ├── schema.sql (테이블 생성)
│   ├── triggers.sql (트리거)
│   ├── procedures.sql (프로시저)
│   └── sample_data.sql (샘플 데이터)
├── docs/
│   ├── ERD.md
│   ├── API_SPEC.md
│   └── USER_GUIDE.md
└── PROJECT_PLAN.md
```

---

## 🔄 개발 일정

| 주차 | 일정 | 주요 작업 |
|------|------|---------|
| **9주차** | 지금 | ✅ 개발 계획 발표, ERD 확정 |
| **10주차** | 예정 | 테이블 생성, 샘플 데이터, 뷰·트리거 작성 |
| **11주차** | 예정 | 서버 API 구현, 직원용 GUI 개발 |
| **12주차** | 예정 | 총괄 책임자용 GUI, 열람 감사·이상 탐지·파기 승인 |
| **13주차** | 예정 | 통합 테스트, 최종 발표 |

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **DBMS** | MySQL 8.0.x |
| **백엔드** | Java 21, Spring Boot 3.x |
| **프론트엔드** | HTML, CSS, JavaScript, Bootstrap 5 |
| **빌드/배포** | Maven, GitHub |
| **개발 환경** | IntelliJ IDEA, MySQL Workbench |
| **실행** | localhost (PC 1대) |

---

## ⚠️ 주의사항 및 보안

1. **개인정보 보호:**
   - 개인정보는 반드시 암호화하여 저장
   - 접근 기록은 변조 불가능하도록 설계

2. **권한 관리:**
   - 역할 기반 접근 제어 (RBAC)
   - 직원은 EMPLOYEE 권한, 총괄책임자는 ADMIN 권한

3. **감사 추적:**
   - 모든 접근에 대해 상세한 로그 기록
   - IP, 시간, 사유 등 기록

4. **이상 탐지:**
   - 자동 이상 탐지 알고리즘 필요
   - 관리자에게 즉시 알림

---

## 📝 다음 단계

- [ ] ERD 최종 확정 (MySQL Workbench)
- [ ] 데이터베이스 스키마 작성
- [ ] Spring Boot 프로젝트 초기화
- [ ] 프론트엔드 기본 레이아웃 구성
- [ ] API 엔드포인트 정의
