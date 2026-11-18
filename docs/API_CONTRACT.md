# API 명세 (프론트엔드 ↔ Spring Boot)

프론트는 `frontend/shared/js/api.js`를 통해서만 서버와 통신합니다.
`frontend/shared/js/config.js`의 `USE_MOCK`을 `false`로 바꾸면, 아래 명세대로 `http://localhost:8080/api`에 요청합니다.
목 모드의 동작은 `frontend/shared/js/mock-server.js`에 그대로 구현되어 있으므로, 응답 모양이 헷갈리면 그 파일을 참고하면 됩니다.

## 공통 규칙

- 요청과 응답은 모두 JSON입니다.
- 인증은 `Authorization: Bearer {token}` 헤더로 합니다. 서버는 **사용자 ID를 JWT에서 꺼내야 하며**, 헤더 값(`X-User-Id`)을 믿으면 안 됩니다.
- 날짜와 시간은 `LocalDateTime` 기본 직렬화 형식(`"2026-11-17T14:03:00"`, 타임존 없음)을 씁니다.
- 실패하면 HTTP 상태 코드와 함께 `{ "message": "사용자에게 보여줄 문장", "code": "선택" }`을 반환합니다. 프론트는 `message`를 그대로 화면에 표시합니다.
  - `401`: 토큰 없음 또는 만료 → 프론트가 로그인 화면으로 이동
  - `403` + `code: "ACCOUNT_DISABLED"`: 권한이 해제된 계정 → 로그인 화면으로 이동
  - `403`: 관리자 전용 API를 직원이 호출
- 엔티티를 그대로 반환하지 말고 **DTO로 평탄화**해야 합니다. 비밀번호 해시와 암호화된 원문이 응답에 섞이면 안 됩니다.

---

## 인증

### `POST /auth/login`
```json
// 요청
{ "username": "emp001", "password": "password" }
// 응답 200
{ "token": "...", "userId": 2, "username": "emp001", "name": "이직원",
  "department": "영업팀", "position": "과장", "role": "EMPLOYEE" }
```
- 아이디나 비밀번호가 틀리면 `401 { "message": "아이디 또는 비밀번호가 올바르지 않습니다." }`를 반환합니다.
- `is_active = FALSE`인 계정은 `403 { "message": "...", "code": "ACCOUNT_DISABLED" }`를 반환합니다.
- ✅ 위 두 가지와 `department`, `position` 필드는 백엔드에 반영되어 있습니다 (AuthController, AuthService, LoginResponse).

---

## 직원용

### `GET /customers?name={검색어}`
이름 일부 또는 연락처 뒷자리 4자리 이상으로 검색합니다. **검색어가 비어 있으면 빈 배열**을 반환해 전체 목록 노출을 막습니다.
```json
[{ "customerId": 1, "name": "홍길동", "phone": "010-****-2222",
   "address": "서울시 강남구 테헤란로 123", "registeredAt": "2024-12-17T10:00:00" }]
```
`phone`은 서버에서 마스킹해서 내려줍니다.

### `GET /customers/{id}`
위와 같은 형태의 단건을 반환합니다.

### `GET /info/customer/{customerId}`: PersonalInfoDTO[]
```json
[{ "infoId": 1, "customerId": 1, "infoType": "주민번호", "sensitivityLevel": 5,
   "infoValue": "850312-1******",
   "registeredAt": "2024-12-17T10:00:00",
   "deleted": false, "deletionPending": false }]
```
- `infoValue`는 **항상 마스킹된 값**입니다. 파기된 정보는 `null`입니다.
- 마스킹 규칙 예시는 `mock-server.js`의 `maskValue()`를 참고하세요.

### `POST /info/{infoId}/view`: 원문 열람, AccessLogs에 VIEW 기록
```json
// 요청
{ "reason": "고객 본인 요청 처리 (민원번호 1117-03)" }
// 응답
{ "infoId": 1, "infoType": "주민번호", "infoValue": "850312-1234567", "logId": 680, "revealSeconds": 30 }
```
사유가 5자 미만이면 `400`, 파기된 정보면 `410`을 반환합니다.

### `POST /info/{infoId}/download`: 원문 다운로드, AccessLogs에 **DOWNLOAD** 기록 ⚠ 신규
```json
// 요청
{ "reason": "대출 심사 서류 확인" }
// 응답
{ "fileName": "customer1_주민번호_681.csv", "mimeType": "text/csv;charset=utf-8",
  "content": "...CSV 문자열...", "logId": 681 }
```
> 스키마 변경이 필요합니다: `ALTER TABLE AccessLogs MODIFY action_type ENUM('VIEW','EDIT','DELETE','DOWNLOAD') NOT NULL;`
> `AccessLog.ActionType` enum에도 `DOWNLOAD`를 추가해야 합니다.

### `GET /access-logs/me?days=30`: AccessLogDTO[] (최신순)
AccessLogDTO는 `03_views.sql`의 `AccessLogDetail` 뷰 컬럼과 같은 구성입니다.
```json
{ "logId": 680, "userId": 2, "username": "emp001", "userName": "이직원", "department": "영업팀",
  "customerId": 1, "customerName": "홍길동", "infoId": 1, "infoType": "주민번호", "sensitivityLevel": 5,
  "actionType": "VIEW", "accessReason": "고객 본인 요청 처리", "accessedAt": "2026-11-17T17:51:00",
  "ipAddress": "10.20.2.12", "deviceInfo": "Windows 11 / Chrome" }
```

### `POST /deletion-requests`
```json
{ "infoId": 12, "reason": "보관 기간 만료 (2021년 해지)" }
```
응답은 `201 DeletionRequestDTO`입니다. 같은 정보에 이미 대기 중인 요청이 있으면 `409`를 반환합니다.

### `GET /deletion-requests/me`: DeletionRequestDTO[] ⚠ 신규
```json
{ "requestId": 1, "infoId": 12, "infoType": "여권번호", "sensitivityLevel": 4,
  "customerId": 3, "customerName": "유관순",
  "requestedBy": 2, "requestedByName": "이직원", "requestedByDepartment": "영업팀",
  "deletionReason": "...", "status": "PENDING",
  "approvedBy": null, "approvedByName": null,
  "requestedAt": "...", "approvedAt": null, "deletedAt": null, "rejectionReason": null }
```

---

## 관리자용 (role = ADMIN)

| 메서드 | 경로 | 설명 | 상태 |
|---|---|---|---|
| GET | `/deletion-requests/pending` | 승인 대기 목록 (오래된 순) | 있음 → DTO로 변경 필요 |
| GET | `/deletion-requests?status=ALL` | 전체 내역 | 신규 |
| POST | `/deletion-requests/{id}/approve` | `{ notes }`. 상태를 DELETED로 바꾸고 원문을 파기, AccessLogs에 DELETE 기록 | 있음 |
| POST | `/deletion-requests/{id}/reject` | `{ reason }` | 있음 |
| GET | `/admin/stats?days=14` | 대시보드 집계 | 신규 |
| GET | `/admin/access-logs` | 전체 접근 기록 검색 (페이지) | 신규 |
| GET | `/admin/access-logs/export` | 같은 검색 조건, 페이지 없이 전체 배열 (CSV 내보내기용) | 신규 |
| GET | `/admin/anomalies?days=7` | 이상 탐지 결과 | 신규 |
| GET | `/admin/users` | 직원 목록과 통계 | 신규 |
| POST | `/admin/users/{id}/deactivate` | `{ reason }`. 권한 해제 후 Audits에 INVESTIGATION 기록 | 신규 |
| POST | `/admin/users/{id}/activate` | `{ reason }`. 권한 복구 | 신규 |
| GET | `/admin/audits?userId=` | 감사 기록 목록 | 신규 |
| POST | `/admin/audits` | 감사 기록 작성 | 신규 |
| GET | `/admin/customers?q=` | 고객별 접근 요약 | 신규 |

### `GET /admin/stats?days=14`
```json
{
  "today": { "total": 61, "highSensitivity": 22, "offHours": 0, "downloads": 3 },
  "periodTotal": 679, "activeUsers": 6, "inactiveUsers": 0,
  "pendingDeletions": 4, "flaggedUsers": 3,
  "daily":  [{ "date": "2026-11-04", "count": 54, "offHours": 0 }],
  "hourly": [0,0,0,0,0,0,0,0,0,71,85,77,75,61,92,62,77,70,0,0,0,0,0,14],
  "typeBreakdown": [{ "infoType": "주민번호", "sensitivityLevel": 5, "count": 48 }],
  "topUsers": [{ "userId": 5, "name": "정직원", "department": "대출팀", "count": 137 }],
  "recentHighRisk": [ /* AccessLogDTO 최대 8건 */ ]
}
```
`hourly`는 0시부터 23시까지 24개 값입니다. SQL `HOUR(accessed_at)`로 GROUP BY하면 됩니다.

### `GET /admin/access-logs`
쿼리 파라미터는 모두 선택입니다.
`userId, customerId, action(VIEW|EDIT|DOWNLOAD|DELETE), minLevel(1~5), from(yyyy-MM-dd), to(yyyy-MM-dd, 그날 포함), q(고객명·사유·IP), offHours(true), logIds(1,2,3), page(0부터), size`

응답은 Spring Data `Page`와 같은 모양입니다. `Page<AccessLogDTO>`를 그대로 반환하면 됩니다.
```json
{ "content": [ /* AccessLogDTO */ ], "totalElements": 679, "totalPages": 34, "number": 0, "size": 20 }
```

### `GET /admin/access-logs/export`
`/admin/access-logs`와 같은 검색 조건을 받고, `page`와 `size` 없이 **`AccessLogDTO[]` 배열 전체**를 반환합니다.
Spring의 페이지 크기 상한(기본 2000건) 때문에 페이지 API로는 전체를 받을 수 없어서 따로 둡니다.

### `GET /admin/anomalies?days=7`
```json
{
  "days": 7,
  "rules": { "abnormal_time": { "label": "업무시간 외 접근", "weight": 15, "desc": "22시~7시 또는 주말 접근" } },
  "users": [{
    "userId": 3, "username": "emp002", "name": "박직원", "department": "영업팀", "position": "대리",
    "isActive": true, "accessCount": 74, "riskScore": 69,
    "flags": { "abnormal_time": 14, "rapid_access": 1, "cross_department": 5 },
    "hourly": [/* 24개 */],
    "alerts": [{ "rule": "abnormal_time", "label": "업무시간 외 접근", "description": "...",
                 "count": 14, "detail": "IP 175.223.14.77",
                 "firstAt": "...", "lastAt": "...", "logIds": [601, 602] }]
  }]
}
```

탐지 규칙의 플래그 키는 `Audits.alert_flags` JSON 키와 같습니다.

| 키 | 기준 | 가중치 |
|---|---|---|
| `excessive_access` | 하루 30건 이상 | 20 |
| `abnormal_time` | 22시~7시 또는 주말 | 15 |
| `rapid_access` | 5분 안에 10건 이상 | 25 |
| `cross_department` | 부서 업무 범위 밖 정보 유형 | 15 |
| `bulk_download` | 하루 다운로드 5건 이상 | 30 |

`riskScore`는 해당한 규칙의 가중치 합에 반복 횟수에 따른 가산(최대 +10)을 더한 값이며, 상한은 100입니다.
`cross_department`에 쓰는 부서별 허용 유형은 `mock-db.js`의 `DEPT_SCOPE`에 있습니다. 백엔드에서는 설정값이나 별도 테이블로 옮기면 됩니다.

### `GET /admin/users`
`UserDTO`에 `accessCount7d`, `lastAccessAt`, `riskScore` 필드를 더한 목록입니다. `password`는 제외합니다.

### `POST /admin/audits`
```json
{ "userId": 3, "auditType": "ALERT",
  "auditPeriodStart": "2026-11-11T00:00:00", "auditPeriodEnd": "2026-11-17T23:59:59",
  "auditNotes": "..." }
```
`accessCount`와 `alertFlags`는 **서버가 기간 내 로그로 다시 계산**해서 저장합니다. 클라이언트가 보낸 값은 믿지 않습니다.

### `GET /admin/customers?q=`
`CustomerDTO`에 `infoCount`, `accessCount7d`, `distinctUsers7d`, `lastAccessAt`을 더한 목록이며, 최근 7일 접근이 많은 순으로 정렬합니다.
