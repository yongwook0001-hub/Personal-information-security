# 개발 로드맵 & API 명세

## 📅 상세 개발 일정

### 🔵 10주차: 데이터베이스 설계 및 구축

**목표:**
- MySQL 데이터베이스 완성
- 샘플 데이터 삽입
- 트리거 & 뷰 구현

**세부 작업:**

#### 10-1: 테이블 생성 (2일)
- [ ] `Users` 테이블 생성
- [ ] `Customers` 테이블 생성
- [ ] `PersonalInfoTypes` 테이블 생성
- [ ] `PersonalInfo` 테이블 생성
- [ ] `AccessLogs` 테이블 생성
- [ ] `DeletionRequests` 테이블 생성
- [ ] `Audits` 테이블 생성
- [ ] 외래키 제약 조건 설정
- [ ] 인덱스 생성

#### 10-2: 샘플 데이터 삽입 (1일)
- [ ] 직원 계정 5개
- [ ] 고객 정보 10명
- [ ] 개인정보 20개
- [ ] 테스트용 접근 기록 30개

#### 10-3: 뷰 & 프로시저 (2일)
- [ ] `AccessLogDetail` 뷰
- [ ] `AccessStatsByEmployee` 뷰
- [ ] `PendingDeletionRequests` 뷰
- [ ] `ApproveDeleteionRequest()` 프로시저
- [ ] `GenerateDailyAudit()` 프로시저

#### 10-4: 트리거 & 테스트 (1일)
- [ ] `UpdateAuditFlagsOnAccess` 트리거
- [ ] 데이터 무결성 테스트
- [ ] 쿼리 성능 테스트

**산출물:**
- ✅ `database_schema.sql`
- ✅ `sample_data.sql`
- ✅ MySQL Workbench ERD 다이어그램

---

### 🟢 11주차: 서버 API & 직원용 GUI

**목표:**
- Spring Boot 서버 구축
- REST API 개발
- 직원용 웹 페이지 개발

**세부 작업:**

#### 11-1: Spring Boot 프로젝트 초기화 (1일)
- [ ] Spring Boot 3.x 프로젝트 생성
- [ ] 의존성 추가 (JPA, MySQL Driver, Security 등)
- [ ] `application.yml` 설정
- [ ] 패키지 구조 설정

#### 11-2: Entity & Repository 개발 (2일)
- [ ] User Entity + UserRepository
- [ ] Customer Entity + CustomerRepository
- [ ] PersonalInfo Entity + PersonalInfoRepository
- [ ] AccessLog Entity + AccessLogRepository
- [ ] DeletionRequest Entity + DeletionRequestRepository
- [ ] Audit Entity + AuditRepository

#### 11-3: 서비스 계층 개발 (2일)
- [ ] AuthService (로그인 & JWT 토큰)
- [ ] CustomerService (고객 검색)
- [ ] PersonalInfoService (개인정보 조회)
- [ ] AccessLogService (접근 기록)
- [ ] DeletionRequestService (파기 요청)

#### 11-4: Controller & API 개발 (2일)

**인증 API:**
```
POST   /api/auth/login              - 로그인
POST   /api/auth/logout             - 로그아웃
GET    /api/auth/me                 - 현재 사용자 정보
```

**고객 API (공통):**
```
GET    /api/customers               - 고객 목록 (검색)
GET    /api/customers/{id}          - 고객 상세 정보
```

**개인정보 API (EMPLOYEE):**
```
GET    /api/customers/{id}/info     - 고객 개인정보 목록
GET    /api/info/{id}               - 개인정보 상세 조회
POST   /api/info/{id}/view          - 개인정보 열람 (AccessLog 기록)
```

**파기 요청 API (EMPLOYEE):**
```
POST   /api/deletion-requests       - 파기 요청 생성
GET    /api/deletion-requests/me    - 내 파기 요청 목록
GET    /api/deletion-requests/{id}  - 파기 요청 상세
```

**접근 기록 API (EMPLOYEE):**
```
GET    /api/access-logs/me          - 내 접근 기록
```

#### 11-5: 직원용 프론트엔드 개발 (2일)
- [ ] `index.html` - 기본 템플릿
- [ ] `pages/login.html` - 로그인 페이지
- [ ] `pages/dashboard.html` - 대시보드
- [ ] `pages/customer-search.html` - 고객 검색
- [ ] `pages/customer-detail.html` - 고객 상세 & 개인정보
- [ ] `pages/deletion-request.html` - 파기 요청 폼
- [ ] `pages/my-logs.html` - 접근 기록
- [ ] `js/app.js` - 메인 로직
- [ ] `js/api.js` - API 호출
- [ ] `css/style.css` - 스타일

#### 11-6: 직원용 GUI 통합 테스트 (1일)
- [ ] 로그인 테스트
- [ ] 고객 검색 기능 테스트
- [ ] 개인정보 열람 & 접근 기록 확인
- [ ] 파기 요청 기능 테스트
- [ ] 버그 수정

**산출물:**
- ✅ Spring Boot 애플리케이션 (`src/`)
- ✅ 직원용 웹 애플리케이션 (`frontend/employee/`)
- ✅ REST API 문서

---

### 🟡 12주차: 관리자용 GUI & 감시 기능

**목표:**
- 관리자용 웹 페이지 개발
- 이상 탐지 기능 구현
- 감사 & 승인 기능 구현

**세부 작업:**

#### 12-1: 관리자 API 개발 (2일)

**사용자 관리 API (ADMIN):**
```
GET    /api/admin/users            - 직원 목록
POST   /api/admin/users            - 직원 생성
PUT    /api/admin/users/{id}       - 직원 수정
PATCH  /api/admin/users/{id}       - 직원 비활성화
```

**접근 모니터링 API (ADMIN):**
```
GET    /api/admin/access-logs      - 전체 접근 기록 (필터링)
GET    /api/admin/access-logs/{id} - 상세 보기
GET    /api/admin/stats            - 접근 통계
```

**이상 탐지 API (ADMIN):**
```
GET    /api/admin/alerts           - 이상 탐지 알림
GET    /api/admin/alerts/{id}      - 알림 상세
PATCH  /api/admin/alerts/{id}      - 알림 상태 변경
```

**감사 API (ADMIN):**
```
GET    /api/admin/audits           - 감사 기록 조회
POST   /api/admin/audits           - 감사 기록 생성
PUT    /api/admin/audits/{id}      - 감사 기록 수정
GET    /api/admin/audits/{id}/logs - 감사 대상 접근 기록
```

**파기 승인 API (ADMIN):**
```
GET    /api/admin/deletion-requests       - 파기 요청 목록
GET    /api/admin/deletion-requests/{id}  - 요청 상세
PATCH  /api/admin/deletion-requests/{id}  - 승인/거절
```

#### 12-2: 이상 탐지 로직 구현 (2일)
- [ ] AnomalyDetectionService 클래스 작성
- [ ] 접근 횟수 초과 감지 (24시간 내 50회 이상)
- [ ] 야간/휴일 접근 감지
- [ ] 부서 외 정보 접근 감지
- [ ] 빠른 연속 접근 감지
- [ ] Alert 엔티티 및 저장소 구현
- [ ] 이상 탐지 알림 생성 로직

#### 12-3: 관리자 GUI 개발 (2일)
- [ ] `pages/admin/dashboard.html` - 관리자 대시보드
- [ ] `pages/admin/access-logs.html` - 접근 모니터링
- [ ] `pages/admin/alerts.html` - 이상 탐지
- [ ] `pages/admin/audits.html` - 감사 기록
- [ ] `pages/admin/deletion-approval.html` - 파기 승인
- [ ] `pages/admin/users.html` - 직원 관리
- [ ] `pages/admin/reports.html` - 통계 & 보고서
- [ ] `js/admin.js` - 관리자 로직
- [ ] `js/charts.js` - 차트 라이브러리 (Chart.js)
- [ ] `css/admin-style.css` - 관리자 스타일

#### 12-4: 감사 기능 구현 (1일)
- [ ] AuditService 클래스
- [ ] 감사 기록 생성 로직
- [ ] 감사 코멘트 저장
- [ ] 감사 유형 변경

#### 12-5: 관리자 GUI 통합 테스트 (1일)
- [ ] 로그인 테스트
- [ ] 접근 기록 조회 & 필터링
- [ ] 이상 탐지 알림 확인
- [ ] 파기 승인 프로세스 테스트
- [ ] 직원 관리 테스트
- [ ] 통계 차트 렌더링 테스트

**산출물:**
- ✅ 관리자용 웹 애플리케이션 (`frontend/admin/`)
- ✅ 이상 탐지 기능
- ✅ 감사 시스템

---

### 🔴 13주차: 통합 테스트 & 최종 발표

**목표:**
- 시스템 통합 테스트
- 버그 수정 & 성능 최적화
- 최종 발표 준비

**세부 작업:**

#### 13-1: 통합 테스트 (1일)
- [ ] 엔드투엔드 테스트 (E2E)
  - 직원이 로그인하고 고객정보 열람 → 접근 기록 생성 확인
  - 관리자가 로그인하고 접근 기록 조회 확인
  - 이상 탐지 알림 생성 확인
  - 파기 요청 및 승인 프로세스 완료

#### 13-2: 성능 테스트 (1일)
- [ ] 데이터베이스 쿼리 성능 최적화
- [ ] 인덱스 효율성 확인
- [ ] API 응답 시간 측정
- [ ] 동시 접속 테스트

#### 13-3: 보안 & 데이터 검증 (1일)
- [ ] SQL Injection 방지 확인 (파라미터화된 쿼리)
- [ ] XSS 방지 확인
- [ ] CSRF 토큰 설정
- [ ] 암호화 설정 확인
- [ ] 권한 검증 테스트

#### 13-4: 버그 수정 (1일)
- [ ] 테스트 과정에서 발견된 버그 수정
- [ ] UI/UX 개선

#### 13-5: 최종 발표 준비 (1일)
- [ ] 시스템 아키텍처 문서 작성
- [ ] 사용자 가이드 작성
- [ ] 발표 슬라이드 준비
- [ ] 라이브 데모 준비

**산출물:**
- ✅ 완성된 시스템 (DB + Server + Frontend)
- ✅ 최종 테스트 보고서
- ✅ 사용자 가이드
- ✅ 발표 자료

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      클라이언트 계층                         │
├────────────────────┬────────────────────────────────────────┤
│  직원용 웹         │       관리자용 웹                       │
│  (HTML/CSS/JS)     │       (HTML/CSS/JS)                     │
└────────┬───────────┴────────────────────┬───────────────────┘
         │                                │
         │         REST API               │
         │         (JSON)                 │
         └────────────┬────────────────────┘
                      │
         ┌────────────▼──────────────┐
         │   서버 계층 (Spring Boot) │
         ├──────────────────────────┤
         │ Controller               │
         │ ├─ AuthController       │
         │ ├─ CustomerController   │
         │ ├─ PersonalInfoCtrl     │
         │ ├─ AccessLogCtrl        │
         │ └─ AdminController      │
         │                          │
         │ Service Layer            │
         │ ├─ AuthService          │
         │ ├─ CustomerService      │
         │ ├─ AnomalyDetection     │
         │ ├─ AuditService         │
         │ └─ DeletionService      │
         │                          │
         │ Repository (JPA)         │
         └────────────┬─────────────┘
                      │
         ┌────────────▼──────────────┐
         │   데이터베이스 계층       │
         │    (MySQL 8.0)           │
         ├──────────────────────────┤
         │ Tables (7개)             │
         │ Views (3개)              │
         │ Triggers (1개)           │
         │ Procedures (2개)         │
         └──────────────────────────┘
```

---

## 📊 ERD (Entity-Relationship Diagram)

```
┌──────────────┐
│    Users     │
├──────────────┤
│ user_id (PK) │────────┐
│ username     │        │
│ password     │        │ 1:N (승인자)
│ name         │        │
│ role         │        │
└──────────────┘        │
       │                │
       │ 1:N            │
       │ (접근자)       │
       │                │
┌──────▼──────────────────────────────┐
│        AccessLogs                   │
├─────────────────────────────────────┤
│ log_id (PK)                         │
│ user_id (FK)                        │
│ info_id (FK)                        │
│ customer_id (FK)                    │
│ action_type                         │
│ accessed_at                         │
└─────────┬──────────────────────────┘
          │
          │ 1:N
          │
┌─────────▼──────────────┐
│   PersonalInfo         │
├────────────────────────┤
│ info_id (PK)           │
│ customer_id (FK) ──────┬────────┐
│ info_type_id (FK)      │        │
│ info_value             │        │
└────────────────────────┘        │
                                  │
              ┌───────────────────┘
              │ 1:N
              │
    ┌─────────▼──────────────┐
    │   Customers            │
    ├────────────────────────┤
    │ customer_id (PK)       │
    │ name                   │
    │ phone                  │
    │ address                │
    └─────────────────────────┘

┌────────────────────┐
│ PersonalInfoTypes  │
├────────────────────┤
│ info_type_id (PK)  │
│ type_name          │
│ sensitivity_level  │
└─────────┬──────────┘
          │
          │ 1:N
          │
    ┌─────▼──────────────────┐
    │   PersonalInfo         │
    │   (참조 위에 표시)      │
    └────────────────────────┘

┌──────────────────────────────┐
│ DeletionRequests             │
├──────────────────────────────┤
│ request_id (PK)              │
│ info_id (FK)                 │
│ customer_id (FK)             │
│ requested_by (FK) ───┐       │
│ approved_by (FK) ────┼─── Users
│ status               │
│ requested_at         │
└──────────────────────┘

┌──────────────────────────────┐
│ Audits                       │
├──────────────────────────────┤
│ audit_id (PK)                │
│ user_id (FK)                 │
│ audited_by (FK) ────────── Users
│ audit_type                   │
│ access_count                 │
│ alert_flags                  │
└──────────────────────────────┘
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 직원의 개인정보 열람

```
1. 직원 "이직원" 로그인
   → AuthService.login("emp001", "password")
   → JWT 토큰 발급

2. 고객 "홍길동" 검색
   → GET /api/customers?name=홍길동
   → Customers 테이블에서 조회

3. 고객의 개인정보 목록 조회
   → GET /api/customers/1/info
   → PersonalInfo 테이블에서 조회

4. 개인정보 (주민번호) 열람
   → POST /api/info/1/view
   → Body: { "access_reason": "대출심사" }
   → AccessLog 생성
   → trigger: UpdateAuditFlagsOnAccess 실행

5. 내 접근 기록 확인
   → GET /api/access-logs/me
   → 방금 생성된 기록 조회
```

### 시나리오 2: 관리자의 이상 탐지

```
1. 관리자 로그인
   → AuthService.login("admin", "password")

2. 대시보드 조회
   → GET /api/admin/alerts
   → 이상 탐지 알림 조회

3. 이상 탐지 상세 확인
   → GET /api/admin/alerts/1
   → 박직원의 과도한 접근 활동 확인
   
4. 감사 기록 생성
   → POST /api/admin/audits
   → Body: { user_id: 2, audit_type: "INVESTIGATION" }
   → Audits 테이블에 레코드 생성

5. 감사 코멘트 추가
   → PUT /api/admin/audits/1
   → Body: { audit_notes: "직원과 면담 완료..." }
```

### 시나리오 3: 파기 요청 & 승인

```
1. 직원 "이직원"이 파기 요청
   → POST /api/deletion-requests
   → Body: { info_id: 1, deletion_reason: "계약종료" }
   → DeletionRequests 테이블에 status='PENDING'으로 저장

2. 관리자가 파기 승인 대기 목록 조회
   → GET /api/admin/deletion-requests?status=PENDING

3. 파기 요청 승인
   → PATCH /api/admin/deletion-requests/1
   → Body: { status: "APPROVED" }
   → ApproveDeleteionRequest() 프로시저 실행
   → PersonalInfo 테이블에서 레코드 삭제
   → DeletionRequests.status = 'DELETED'
```

---

## 🔧 개발 팀 역할 분담 (예시)

| 담당자 | 역할 | 주요 작업 |
|--------|------|---------|
| 이호현 | 데이터베이스 & 백엔드 | DB 설계, Spring Boot API 개발, 이상 탐지 로직 |
| 이용욱 | 프론트엔드 | 직원용 & 관리자용 웹 페이지, 차트 라이브러리 |
| 공동   | 테스트 & 통합 | 통합 테스트, 성능 테스트, 버그 수정 |

---

## 📋 체크리스트

### 10주차 완료 체크
- [ ] 7개 테이블 생성
- [ ] 외래키 & 인덱스 설정
- [ ] 샘플 데이터 10명 고객, 30개 접근 기록
- [ ] 3개 뷰 구현
- [ ] 2개 프로시저 구현
- [ ] 1개 트리거 구현
- [ ] MySQL Workbench ERD 다이어그램 완성

### 11주차 완료 체크
- [ ] Spring Boot 프로젝트 초기화
- [ ] 6개 Entity + Repository 구현
- [ ] 5개 Service 클래스 구현
- [ ] 5개 REST API 엔드포인트
- [ ] 직원용 7개 페이지 구현
- [ ] 직원용 GUI 통합 테스트

### 12주차 완료 체크
- [ ] 관리자 API 15개 엔드포인트
- [ ] 이상 탐지 로직 구현 (4가지 규칙)
- [ ] Alert 엔티티 & 저장소
- [ ] 관리자용 7개 페이지 구현
- [ ] AuditService 구현
- [ ] 관리자 GUI 통합 테스트

### 13주차 완료 체크
- [ ] E2E 테스트 3개 시나리오
- [ ] 성능 테스트 완료
- [ ] 보안 테스트 완료
- [ ] 버그 수정 & 최적화
- [ ] 발표 자료 완성
- [ ] 시스템 아키텍처 문서 완성

