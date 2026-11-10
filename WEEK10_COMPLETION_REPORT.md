# 10주차 완료 보고서

## 🎯 목표
데이터베이스 설계 및 구축 완료 (테이블 생성, 샘플 데이터, 뷰, 프로시저, 트리거)

---

## ✅ 완료 항목

### 1️⃣ 테이블 생성 (7개 테이블)

| 테이블명 | 레코드 수 | 주요 기능 |
|---------|---------|---------|
| **Users** | 5 | 직원 인증 및 권한 관리 |
| **Customers** | 10 | 고객 정보 저장 |
| **PersonalInfoTypes** | 8 | 개인정보 유형 정의 (주민번호, 계좌번호 등) |
| **PersonalInfo** | 27 | 고객 개인정보 저장 (암호화) |
| **AccessLogs** ⭐ | 24 | 개인정보 접근 기록 (감사 추적의 핵심) |
| **DeletionRequests** | 5 | 파기 요청 및 승인 워크플로우 |
| **Audits** | 4 | 감사 기록 및 이상 탐지 플래그 |

**특징:**
- 외래키 제약 조건 설정
- 자동 인덱스 생성 (성능 최적화)
- UTF-8 인코딩 적용
- 타임스탬프 자동 관리

---

### 2️⃣ 샘플 데이터 (총 78개 레코드)

#### 사용자 (5명)
- **admin** (ADMIN 역할) - 감시팀 / 총괄책임자
- **emp001, emp002** (EMPLOYEE) - 영업팀
- **emp003** (EMPLOYEE) - 고객팀
- **emp004** (EMPLOYEE) - 대출팀

#### 고객 (10명)
- 홍길동, 이순신, 유관순, 강감찬, 세종대왕
- 이황, 다산정약용, 신사임당, 장보고, 이순지

#### 개인정보 (27개)
- 각 고객별 2~3개의 개인정보 등록
- 정보 유형: 주민번호, 신용카드, 계좌번호 등

#### 접근 기록 (24개)
- 직원별 실제 같은 접근 시뮬레이션
- 시간, 사유, IP 주소 포함

#### 파기 요청 (5개)
- 모두 PENDING 상태 (승인 대기 중)

---

### 3️⃣ 뷰 (8개)

| 뷰 이름 | 용도 |
|--------|------|
| **AccessLogDetail** | 접근 로그 상세 조회 (직원명, 고객명, 정보유형 포함) |
| **AccessStatsByEmployee** | 직원별 일일 접근 통계 |
| **PendingDeletionRequests** | 파기 대기 목록 조회 |
| **AnomalyDetectionSummary** | 이상 탐지 기록 요약 |
| **DailyAccessReport** | 날짜별 접근 보고서 |
| **EmployeeAccessTimeline** | 직원의 접근 타임라인 |
| **HighRiskAccessActivity** | 고위험 접근 활동 (야간, 휴일, 부서외 접근) |
| **CustomerPrivacyStatus** | 고객의 개인정보 및 접근 현황 |

**특징:**
- 복잡한 JOIN 쿼리 사전 구성
- 관리자용 대시보드에 직접 활용 가능
- 성능 최적화된 조인 구조

---

### 4️⃣ 프로시저 (5개)

| 프로시저명 | 기능 | 호출 주체 |
|-----------|------|---------|
| **ApproveDeleteionRequest()** | 파기 요청 승인/거절 | 관리자 |
| **GenerateDailyAudit()** | 일일 감사 기록 자동 생성 | 스케줄러 (매일 자정) |
| **RecordAccessLog()** | 접근 기록 저장 | 백엔드 API |
| **GetAccessLogsByEmployee()** | 직원별 접근 기록 조회 | 관리자 |
| **DetectAnomalousActivity()** | 이상 활동 자동 탐지 | 스케줄러 (주기적) |

**특징:**
- 트랜잭션 처리
- 입력값 검증
- 자동 감사 로깅
- 예외 처리

---

### 5️⃣ 트리거 (5개)

| 트리거명 | 이벤트 | 기능 |
|---------|--------|------|
| **UpdateAuditFlagsOnAccess** | INSERT on AccessLogs | 접근 시 이상 탐지 플래그 자동 계산 |
| **LogUserActivity** | UPDATE on Users | 사용자 정보 변경 시 updated_at 갱신 |
| **PreventUnauthorizedDeletion** | DELETE on PersonalInfo | 미승인 삭제 방지 (검증용) |
| **AuditPersonalInfoChanges** | UPDATE on PersonalInfo | 개인정보 변경 감시 |
| **AutoSetUpdatedTimestamp** | UPDATE on Users | 수정 시간 자동 갱신 |

**자동화 기능:**
- 24시간 내 50회 이상 접근 감지
- 야간/휴일 접근 감지
- 빠른 연속 접근(1분 내 3회) 감지
- 이상 탐지 시 자동으로 Audits 테이블에 기록

---

## 📊 데이터베이스 통계

### 용량
```
personal_info_system: ~500 KB
AccessLogs (인덱스 포함): ~150 KB (가장 큼)
Users, Customers, PersonalInfo: 각 ~20 KB
```

### 성능 지표
- **총 인덱스 수:** 15개
- **복합 인덱스:** 1개 (user_id, accessed_at)
- **예상 쿼리 시간:** <10ms

---

## 🧪 테스트 결과

### 쿼리 테스트 통과
```sql
✅ SELECT * FROM AccessLogDetail LIMIT 5;  (접근 로그 조회)
✅ SELECT * FROM AccessStatsByEmployee;    (직원별 통계)
✅ SELECT * FROM PendingDeletionRequests;  (파기 대기)
✅ CALL GetAccessLogsByEmployee(2, '2024-11-01', '2024-11-30', 50);
```

### 프로시저 테스트 통과
```sql
✅ CALL GenerateDailyAudit();              (일일 감사 생성)
✅ CALL DetectAnomalousActivity();         (이상 탐지)
```

### 트리거 작동 확인
```sql
✅ AccessLogs 삽입 시 Audits 테이블에 이상 탐지 플래그 자동 생성
✅ Users 수정 시 updated_at 자동 갱신
```

---

## 📁 생성된 파일 구조

```
database/
├── 00_init_all.sql              (통합 초기화 스크립트)
├── 01_schema.sql                (테이블 생성 - 7개)
├── 02_sample_data.sql           (샘플 데이터 - 78개 레코드)
├── 03_views.sql                 (뷰 생성 - 8개)
├── 04_procedures.sql            (프로시저 생성 - 5개)
├── 05_triggers.sql              (트리거 생성 - 5개)
└── README.md                    (설치 및 사용 가이드)
```

---

## 🔐 테스트 계정 정보

### 관리자
```
Username: admin
Password: password (bcrypt 해시: $2a$10$slYQmyNdGzin7olVN3p5be0DlH.PKZbv5H8KnzzVgXXbVxzy2QIDG)
Role: ADMIN
```

### 직원
```
emp001 - 이직원 (영업팀, 과장)
emp002 - 박직원 (영업팀, 대리)
emp003 - 최직원 (고객팀, 과장)
emp004 - 정직원 (대출팀, 대리)

Password (모두 동일): password
```

⚠️ **주의:** 실제 운영 환경에서는 강력한 비밀번호 사용 필수

---

## 🎓 핵심 설계 결정

### 1. AccessLogs 테이블의 중요성
- 모든 개인정보 접근은 반드시 기록
- 삭제 불가능한 감사 추적 구조
- 접근 사유 필수 입력

### 2. 이상 탐지 자동화
- 트리거를 통해 접근 시 자동으로 플래그 계산
- JSON 포맷으로 다양한 이상 유형 기록
- 관리자가 수동으로 감사 수행

### 3. 파기 요청 워크플로우
- 3단계 상태 관리 (PENDING → APPROVED → DELETED)
- 트랜잭션으로 원자성 보장
- 거절 사유 기록

### 4. 계층화된 감사
- 접근 기록 (AccessLogs): 자동 기록
- 감사 기록 (Audits): 관리자가 수행
- 프로시저: 파기 요청 처리 시 별도 기록

---

## ⚙️ 유지보수 계획

### 매일 (자정)
```sql
CALL GenerateDailyAudit();      -- 일일 감사 기록 생성
CALL DetectAnomalousActivity(); -- 이상 활동 탐지
```

### 매주
- AccessLogs 백업 (오래된 데이터)
- 인덱스 통계 갱신

### 매월
- 데이터베이스 용량 점검
- 불필요한 감사 기록 아카이빙

---

## 📊 10주차 체크리스트

- [x] 7개 테이블 생성
- [x] 외래키 & 인덱스 설정
- [x] 샘플 데이터 78개 삽입 (10명 고객, 24개 접근 기록)
- [x] 8개 뷰 구현
- [x] 5개 프로시저 구현
- [x] 5개 트리거 구현
- [x] 데이터 무결성 테스트
- [x] 쿼리 성능 테스트
- [x] 설치 가이드 작성
- [x] MySQL 스크립트 실행 성공

---

## 🚀 11주차 준비 사항

### 백엔드 (Spring Boot)
- [ ] 프로젝트 초기화 (Spring Boot 3.x)
- [ ] Entity 클래스 작성 (6개)
- [ ] JPA Repository 작성 (6개)
- [ ] Service 계층 구현 (5개)
- [ ] REST Controller 구현 (5개)
- [ ] API 문서 작성

### 프론트엔드 (직원용)
- [ ] 기본 HTML 템플릿
- [ ] 로그인 페이지
- [ ] 대시보드
- [ ] 고객 검색 & 조회
- [ ] 개인정보 열람
- [ ] 파기 요청

---

## 📝 참고 자료

- **프로젝트 계획서:** `PROJECT_PLAN.md`
- **GUI 명세서:** `GUI_SPECIFICATION.md`
- **개발 로드맵:** `DEVELOPMENT_ROADMAP.md`
- **DB 설치 가이드:** `database/README.md`

---

## 🎉 결론

10주차 데이터베이스 설계 및 구축이 **100% 완료**되었습니다.

**생성된 객체:**
- 7개 테이블 + 8개 뷰 + 5개 프로시저 + 5개 트리거
- 78개 샘플 레코드 (충분한 테스트 데이터)
- 완전한 감사 추적 시스템
- 자동화된 이상 탐지

**다음 단계:** 11주차부터 Spring Boot 백엔드와 프론트엔드 개발 시작

---

**작성일:** 2024년 11월 9일  
**상태:** ✅ 완료  
**진행도:** 10/13주차 (76%)
