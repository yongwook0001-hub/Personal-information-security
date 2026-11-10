# 고객 개인정보 처리·열람 관리 시스템

> 금융회사 내부통제용 데이터베이스 응용 프로그램  
> 직원의 개인정보 접근·처리 기록 및 총괄 책임자의 감시/감사 시스템

## 🎯 프로젝트 개요

### 목표
금융회사에서 고객의 개인정보를 누가, 언제, 어떤 이유로 다루었는지를 기록하고, 총괄 책임자가 이상 활동을 감시하며 감사할 수 있는 시스템을 구축합니다.

### 핵심 기능
- **접근 기록**: 모든 개인정보 접근 시 자동으로 기록 (직원, 시간, 사유, IP 등)
- **이상 탐지**: 비정상 접근 패턴 자동 감지 (야간 접근, 대량 접근, 부서 외 정보 접근 등)
- **감사 시스템**: 총괄 책임자가 직원별 활동 감시 및 감사 기록
- **파기 관리**: 더 이상 필요 없는 정보의 삭제를 요청하고 승인하는 프로세스

---

## 📊 데이터베이스 설계

### 테이블 구조 (7개)

| # | 테이블명 | 설명 | 핵심 필드 |
|---|---------|------|---------|
| 1 | **Users** | 직원/사용자 | user_id, username, role (EMPLOYEE/ADMIN) |
| 2 | **Customers** | 고객 정보 | customer_id, name, phone, address |
| 3 | **PersonalInfoTypes** | 개인정보 유형 | info_type_id, type_name (주민번호, 계좌번호 등) |
| 4 | **PersonalInfo** | 고객 개인정보 | info_id, customer_id, info_type_id, info_value |
| 5 | **AccessLogs** ⭐ | 개인정보 접근 기록 | log_id, user_id, info_id, action_type, accessed_at |
| 6 | **DeletionRequests** | 파기 요청 | request_id, info_id, status (PENDING/APPROVED/DELETED) |
| 7 | **Audits** | 감사 기록 | audit_id, user_id, audit_type, alert_flags |

**✨ 보기 & 프로시저:**
- `AccessLogDetail` - 접근 로그 상세 조회
- `AccessStatsByEmployee` - 직원별 접근 통계
- `PendingDeletionRequests` - 파기 대기 목록
- `ApproveDeleteionRequest()` - 파기 요청 승인 프로시저
- `GenerateDailyAudit()` - 일일 감사 기록 생성 프로시저

---

## 🎨 사용자 인터페이스

### 👨‍💼 직원용 GUI (Employee Portal)

**주요 페이지:**
1. **로그인** - 직원 인증
2. **대시보드** - 최근 접근 기록, 파기 요청 현황
3. **고객 검색** - 고객명/전화번호로 검색
4. **개인정보 열람** - 필요한 고객정보 조회 (사유 입력 필수)
5. **파기 요청** - 불필요한 정보 삭제 요청
6. **내 기록 조회** - 자신의 접근 이력 확인
7. **프로필** - 개인정보 확인 및 로그아웃

**특징:**
- 접근 시 사유를 반드시 입력
- 모든 접근이 자동으로 기록됨
- 민감도 수준 표시 (⭐ 1~5)

---

### 👔 총괄 책임자용 GUI (Admin Portal)

**주요 페이지:**
1. **대시보드** - 이상 탐지 알림, 실시간 모니터링
2. **접근 모니터링** - 전체 접근 기록 조회 (필터링 가능)
3. **이상 탐지** - 비정상 활동 자동 감지
4. **감사 기록** - 직원별 감사 수행 및 코멘트 기록
5. **파기 승인** - 파기 요청 검토 및 승인/거절
6. **직원 관리** - 직원 계정 생성/비활성화
7. **통계 & 보고서** - 접근 통계, 이상 탐지 현황

**특징:**
- 실시간 이상 탐지
  - 24시간 내 50회 이상 접근
  - 야간(18:00~08:00) 또는 휴일 접근
  - 부서가 다른 고객정보 접근
  - 1분 내 10회 이상 빠른 연속 접근
- 모든 관리자 조치 기록
- 차트 기반 통계

---

## 🔧 기술 스택

| 구분 | 기술 |
|------|------|
| **DBMS** | MySQL 8.0.x |
| **백엔드** | Java 21, Spring Boot 3.x |
| **백엔드 ORM** | Spring Data JPA |
| **인증** | JWT (JSON Web Token) |
| **프론트엔드** | HTML5, CSS3, JavaScript ES6+ |
| **프론트엔드 UI** | Bootstrap 5 |
| **차트** | Chart.js |
| **버전 관리** | Git, GitHub |
| **개발 IDE** | IntelliJ IDEA, VS Code |
| **실행 환경** | localhost (PC 1대) |

---

## 📁 프로젝트 구조

```
고객 개인정보 처리·열람 관리 시스템/
│
├── 📄 README.md                          (이 파일)
├── 📄 PROJECT_PLAN.md                    (프로젝트 계획서)
├── 📄 GUI_SPECIFICATION.md               (GUI 명세서)
├── 📄 DEVELOPMENT_ROADMAP.md             (개발 로드맵 & API 명세)
│
├── 🗂️ database/
│   ├── database_schema.sql               (테이블 생성 스크립트)
│   ├── sample_data.sql                   (샘플 데이터)
│   ├── triggers.sql                      (트리거)
│   ├── procedures.sql                    (프로시저)
│   └── views.sql                         (뷰)
│
├── 🗂️ backend/
│   ├── pom.xml                           (Maven 설정)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/finance/personalinfo/
│   │   │   │   ├── controller/           (REST API 컨트롤러)
│   │   │   │   ├── service/              (비즈니스 로직)
│   │   │   │   ├── repository/           (데이터 접근)
│   │   │   │   ├── entity/               (JPA 엔티티)
│   │   │   │   ├── dto/                  (데이터 전송 객체)
│   │   │   │   ├── config/               (설정 클래스)
│   │   │   │   └── util/                 (유틸리티)
│   │   │   └── resources/
│   │   │       ├── application.yml       (애플리케이션 설정)
│   │   │       ├── application-dev.yml   (개발 환경 설정)
│   │   │       └── logback-spring.xml    (로깅 설정)
│   │   └── test/
│   └── README.md                         (백엔드 개발 가이드)
│
├── 🗂️ frontend/
│   │
│   ├── 🗂️ employee/                       (직원용 GUI)
│   │   ├── index.html                    (기본 템플릿)
│   │   ├── pages/
│   │   │   ├── login.html                (로그인)
│   │   │   ├── dashboard.html            (대시보드)
│   │   │   ├── customer-search.html      (고객 검색)
│   │   │   ├── customer-detail.html      (고객 상세 & 개인정보)
│   │   │   ├── deletion-request.html     (파기 요청)
│   │   │   ├── my-logs.html              (접근 기록)
│   │   │   └── profile.html              (프로필)
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   ├── app.js                    (메인 로직)
│   │   │   ├── api.js                    (API 호출)
│   │   │   └── utils.js                  (유틸리티)
│   │   └── README.md
│   │
│   ├── 🗂️ admin/                         (관리자용 GUI)
│   │   ├── index.html                    (기본 템플릿)
│   │   ├── pages/
│   │   │   ├── login.html                (로그인)
│   │   │   ├── dashboard.html            (대시보드)
│   │   │   ├── access-logs.html          (접근 모니터링)
│   │   │   ├── alerts.html               (이상 탐지)
│   │   │   ├── audits.html               (감사 기록)
│   │   │   ├── deletion-approval.html    (파기 승인)
│   │   │   ├── users.html                (직원 관리)
│   │   │   └── reports.html              (통계 & 보고서)
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   ├── app.js
│   │   │   ├── api.js
│   │   │   ├── charts.js                 (Chart.js)
│   │   │   └── utils.js
│   │   └── README.md
│   │
│   └── shared/                            (공유 리소스)
│       ├── css/bootstrap.min.css
│       ├── js/bootstrap.min.js
│       └── images/logo.png
│
└── 📄 .gitignore
```

---

## 🚀 개발 일정 & 마일스톤

| 주차 | 목표 | 상태 |
|------|------|------|
| **9주차** | ✅ 개발 계획 발표, ERD 확정 | 진행 중 |
| **10주차** | 데이터베이스 설계 & 구축 | 예정 |
| **11주차** | 서버 API, 직원용 GUI | 예정 |
| **12주차** | 관리자용 GUI, 이상 탐지, 파기 승인 | 예정 |
| **13주차** | 통합 테스트, 최종 발표 | 예정 |

---

## 📖 문서

### 상세 문서 목록
1. **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - 프로젝트 전체 계획서
2. **[GUI_SPECIFICATION.md](./GUI_SPECIFICATION.md)** - UI/UX 상세 명세
3. **[DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)** - 개발 로드맵, API 명세, 테스트 시나리오
4. **[database_schema.sql](./database_schema.sql)** - 데이터베이스 스키마 (테이블, 뷰, 트리거, 프로시저)

---

## 🔐 보안 특징

✅ **세션 관리**
- JWT 토큰 기반 인증
- 타임아웃: 30분 (관리자), 60분 (직원)
- 동시 접속 제한

✅ **접근 제어 (RBAC)**
- EMPLOYEE: 자신의 기록만 조회
- ADMIN: 전체 시스템 관리 및 감시

✅ **감사 추적**
- 모든 접근 기록 (직원, 시간, IP, 사유)
- 모든 관리자 조치 기록
- 수정 불가능한 로그 (Append-only)

✅ **데이터 보호**
- 개인정보 암호화 저장
- HTTPS 통신
- 비밀번호 해시 (bcrypt/argon2)

✅ **이상 탐지**
- 자동 이상 활동 감지
- 실시간 알림
- 관리자에게 즉시 보고

---

## 💻 개발 환경 설정

### 필수 소프트웨어
- Java 21 JDK
- MySQL 8.0.x
- IntelliJ IDEA (또는 VS Code)
- Git

### 설치 및 실행

#### 1. 데이터베이스 초기화
```bash
mysql -u root -p < database_schema.sql
mysql -u root -p < sample_data.sql
```

#### 2. 백엔드 실행
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

#### 3. 프론트엔드 실행
```bash
# 직원용
open frontend/employee/index.html  (또는 localhost:8080/employee/)

# 관리자용
open frontend/admin/index.html     (또는 localhost:8080/admin/)
```

#### 4. 테스트
```bash
# 로그인 테스트
사용자명: emp001 / 비밀번호: password (또는 admin / password)
```

---

## 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│              클라이언트 (웹 브라우저)               │
│  ┌────────────────────┬──────────────────────────┐ │
│  │  직원용 GUI        │    관리자용 GUI          │ │
│  └────────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      │ REST API (JSON)
                      │
┌─────────────────────▼─────────────────────────────┐
│         Spring Boot 서버 (Java 21)                │
│  ┌────────────────────────────────────────────┐  │
│  │  Controller (REST API 엔드포인트)          │  │
│  ├────────────────────────────────────────────┤  │
│  │  Service Layer (비즈니스 로직)             │  │
│  │  - AuthService                            │  │
│  │  - AnomalyDetectionService                │  │
│  │  - AuditService                           │  │
│  │  - DeletionService                        │  │
│  ├────────────────────────────────────────────┤  │
│  │  Repository (JPA)                         │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────▲─────────────────────────────┘
                      │ SQL
                      │
┌─────────────────────▼─────────────────────────────┐
│      MySQL 8.0.x 데이터베이스                    │
│  ┌────────────────────────────────────────────┐  │
│  │  7개 테이블                               │  │
│  │  3개 뷰 (View)                           │  │
│  │  2개 프로시저 (Procedure)                 │  │
│  │  1개 트리거 (Trigger)                    │  │
│  └────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

---

## 🧪 테스트 전략

### 테스트 타입
- **단위 테스트** (Unit Test): 각 Service 클래스
- **통합 테스트** (Integration Test): Controller + Repository
- **엔드투엔드 테스트** (E2E): 전체 시스템 흐름
- **성능 테스트** (Performance Test): 데이터베이스 쿼리, API 응답 시간
- **보안 테스트** (Security Test): SQL Injection, XSS, CSRF 방지

### 테스트 시나리오
1. 직원의 개인정보 열람 및 접근 기록 자동 생성
2. 관리자의 이상 탐지 알림 및 감시
3. 파기 요청 및 승인 프로세스

---

## 🤝 팀 역할 분담

| 역할 | 책임 | 담당자 |
|------|------|--------|
| **DB & 백엔드** | 데이터베이스 설계, Spring Boot API, 이상 탐지 로직 | 이호현 |
| **프론트엔드** | 직원용 & 관리자용 GUI, 차트 구현 | 이용욱 |
| **통합 & 테스트** | 전체 시스템 통합, 성능/보안 테스트, 버그 수정 | 공동 |

---

## 📝 라이센스

이 프로젝트는 학습 목적으로 진행되는 팀 프로젝트입니다.

---

## ✉️ 문의

문제가 발생하거나 질문이 있으시면 GitHub Issues를 생성해주세요.

---

**최종 수정일:** 2024년 11월 5일  
**프로젝트 상태:** 9주차 - 개발 계획 단계
