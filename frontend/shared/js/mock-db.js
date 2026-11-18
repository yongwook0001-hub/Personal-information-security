/**
 * ============================================================================
 *  가상 데이터베이스 (Mock DB)
 * ============================================================================
 *  - MySQL 의 7개 테이블(Users, Customers, PersonalInfoTypes, PersonalInfo,
 *    AccessLogs, DeletionRequests, Audits)을 그대로 흉내낸 자바스크립트 객체입니다.
 *  - 데이터는 localStorage 에 저장되므로,
 *      직원 화면에서 '열람'한 기록이 → 관리자 화면 '접근 기록'에 바로 보입니다.
 *  - 사이드바의 [목데이터 초기화] 버튼을 누르면 처음 상태로 다시 생성됩니다.
 *
 *  ※ 실제 DB 로 전환하면(USE_MOCK=false) 이 파일은 전혀 사용되지 않습니다.
 *  ※ 고객/직원 이름은 database/02_sample_data.sql, 06_additional_sample_data.sql 과 맞췄습니다.
 * ============================================================================
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'pims_mock_db_v1';

    /* ------------------------------------------------------------------
     * 공통 유틸
     * ------------------------------------------------------------------ */

    /** 시드 고정 난수 생성기 (mulberry32)
     *  → 초기화할 때마다 '같은 모양'의 데이터가 나오도록 Math.random 대신 사용 */
    function createRng(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const pad = (n) => String(n).padStart(2, '0');

    /** Date → "2026-11-17T14:03:00" (Spring 의 LocalDateTime JSON 형식과 동일, 타임존 없음) */
    function toLocalISO(d) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
               `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    /** n일 전에서 가장 가까운 평일(월~금)까지 거슬러 간 일수 — 시연 데이터가 주말에 걸리지 않게 */
    function weekdayOffset(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        while (d.getDay() === 0 || d.getDay() === 6) { d.setDate(d.getDate() - 1); n++; }
        return n;
    }

    /** 오늘 기준 dayOffset 일 전의 h시 m분 Date 객체 */
    function at(dayOffset, h, m, s) {
        const d = new Date();
        d.setDate(d.getDate() - dayOffset);
        d.setHours(h, m, s || 0, 0);
        return d;
    }

    /* ------------------------------------------------------------------
     * 기준 데이터 (코드 테이블 성격)
     * ------------------------------------------------------------------ */

    /** PersonalInfoTypes — 02_sample_data.sql 의 INSERT 순서와 같은 ID */
    const INFO_TYPES = [
        { infoTypeId: 1, typeName: '주민번호',     sensitivityLevel: 5, description: '고도로 민감한 개인식별정보' },
        { infoTypeId: 2, typeName: '여권번호',     sensitivityLevel: 4, description: '국제 신분증' },
        { infoTypeId: 3, typeName: '운전면허번호', sensitivityLevel: 4, description: '신분증' },
        { infoTypeId: 4, typeName: '신용카드번호', sensitivityLevel: 5, description: '금융 정보' },
        { infoTypeId: 5, typeName: '계좌번호',     sensitivityLevel: 5, description: '금융 정보' },
        { infoTypeId: 6, typeName: '생년월일',     sensitivityLevel: 3, description: '기본 개인정보' },
        { infoTypeId: 7, typeName: '전자우편주소', sensitivityLevel: 2, description: '연락처' },
        { infoTypeId: 8, typeName: '직업',         sensitivityLevel: 2, description: '기본 개인정보' },
    ];

    /**
     * 부서별 '업무상 접근 가능한' 개인정보 유형 (이상탐지 cross_department 규칙에 사용)
     *  - 이 범위를 벗어난 정보를 열람하면 "업무 범위 밖 접근"으로 탐지됩니다.
     *  - 실제 백엔드로 옮길 때는 별도 테이블 또는 설정값으로 관리하면 됩니다.
     */
    const DEPT_SCOPE = {
        '영업팀':       ['신용카드번호', '계좌번호', '생년월일', '전자우편주소', '직업'],
        '고객팀':       ['주민번호', '계좌번호', '생년월일', '전자우편주소', '직업'],
        '대출팀':       ['주민번호', '운전면허번호', '계좌번호', '생년월일', '직업'],
        '콜센터':       ['생년월일', '전자우편주소', '직업'],
        '리스크관리팀': INFO_TYPES.map((t) => t.typeName),
        '감시팀':       INFO_TYPES.map((t) => t.typeName),
    };

    /** 직원이 고르는 접근 사유 프리셋 (직원 화면 모달과 공유) */
    const REASON_PRESETS = [
        '고객 본인 요청 처리',
        '대출 심사 서류 확인',
        '카드 발급 본인 확인',
        '민원 처리',
        '계좌 개설 확인',
        '정기 고객정보 현행화',
    ];

    /* ------------------------------------------------------------------
     * 초기 데이터 생성
     * ------------------------------------------------------------------ */

    function buildUsers() {
        // 1~5번은 02_sample_data.sql 과 동일, 6~7번은 시연용으로 추가한 계정
        const rows = [
            ['admin',  '김총괄', '감시팀',       '총괄책임자', 'ADMIN'],
            ['emp001', '이직원', '영업팀',       '과장',       'EMPLOYEE'],
            ['emp002', '박직원', '영업팀',       '대리',       'EMPLOYEE'],
            ['emp003', '최직원', '고객팀',       '과장',       'EMPLOYEE'],
            ['emp004', '정직원', '대출팀',       '대리',       'EMPLOYEE'],
            ['emp005', '한직원', '콜센터',       '주임',       'EMPLOYEE'],
            ['emp006', '윤직원', '리스크관리팀', '차장',       'EMPLOYEE'],
        ];
        return rows.map((r, i) => ({
            userId: i + 1,
            username: r[0],
            password: 'password',              // 목 전용 (실제 DB는 bcrypt 해시)
            name: r[1],
            department: r[2],
            position: r[3],
            email: `${r[0]}@company.com`,
            role: r[4],
            isActive: true,
            createdAt: toLocalISO(at(400 - i * 30, 9, 0)),
        }));
    }

    function buildCustomers() {
        // 02_sample_data.sql 10명 + 06_additional_sample_data.sql 17명
        const rows = [
            ['홍길동', '010-1111-2222', '서울시 강남구 테헤란로 123'],
            ['이순신', '010-2222-3333', '서울시 종로구 종로 456'],
            ['유관순', '010-3333-4444', '대전시 중구 대종로 789'],
            ['강감찬', '010-4444-5555', '경주시 황성동 대릉원로 321'],
            ['세종대왕', '010-5555-6666', '서울시 중구 세종대로 654'],
            ['이황', '010-6666-7777', '경주시 안강읍 도리사길 987'],
            ['다산정약용', '010-7777-8888', '경기도 남양주시 조안읍 541'],
            ['신사임당', '010-8888-9999', '강릉시 죽헌길 852'],
            ['장보고', '010-9999-0000', '전라남도 완도군 완도읍 369'],
            ['이순지', '010-0000-1111', '서울시 마포구 희우정로 147'],
            ['김철수', '010-1001-1001', '서울시 강남구'],
            ['이영희', '010-1002-1002', '서울시 송파구'],
            ['박민수', '010-1003-1003', '서울시 강동구'],
            ['최서현', '010-1004-1004', '서울시 강서구'],
            ['정재훈', '010-1005-1005', '서울시 마포구'],
            ['허진우', '010-1006-1006', '서울시 종로구'],
            ['배은정', '010-1007-1007', '서울시 중구'],
            ['신민준', '010-1008-1008', '서울시 도봉구'],
            ['윤채원', '010-1009-1009', '서울시 노원구'],
            ['조혁진', '010-1010-1010', '서울시 양천구'],
            ['장혜진', '010-1011-1011', '부산시 해운대구'],
            ['이준호', '010-1012-1012', '부산시 중앙구'],
            ['김지연', '010-1013-1013', '부산시 사상구'],
            ['박소연', '010-1014-1014', '부산시 연제구'],
            ['우진호', '010-1015-1015', '대구시 중구'],
            ['홍지은', '010-1016-1016', '대구시 동구'],
            ['오준영', '010-1017-1017', '대구시 북구'],
        ];
        return rows.map((r, i) => ({
            customerId: i + 1,
            name: r[0],
            phone: r[1],
            address: r[2],
            registeredAt: toLocalISO(at(700 - i * 20, 10, 0)),
        }));
    }

    /** 유형별 가짜 원문 값 생성 (실존하지 않는 형식의 더미 값) */
    function fakeValue(typeName, cust, rand) {
        const n = (len) => Array.from({ length: len }, () => Math.floor(rand() * 10)).join('');
        const yy = 60 + Math.floor(rand() * 40);
        const mm = pad(1 + Math.floor(rand() * 12));
        const dd = pad(1 + Math.floor(rand() * 28));
        switch (typeName) {
            case '주민번호':     return `${yy}${mm}${dd}-${1 + Math.floor(rand() * 2)}${n(6)}`;
            case '여권번호':     return `M${n(8)}`;
            case '운전면허번호': return `${pad(11 + Math.floor(rand() * 17))}-${n(2)}-${n(6)}-${n(2)}`;
            case '신용카드번호': return `9410-${n(4)}-${n(4)}-${n(4)}`;
            case '계좌번호':     return `110-${n(3)}-${n(6)}`;
            case '생년월일':     return `19${yy}-${mm}-${dd}`;
            case '전자우편주소': return `customer${cust.customerId}@example.com`;
            case '직업':         return ['회사원', '자영업', '공무원', '교사', '프리랜서', '연구원'][Math.floor(rand() * 6)];
            default:             return n(8);
        }
    }

    function buildPersonalInfo(customers, rand) {
        const list = [];
        let id = 1;
        customers.forEach((c) => {
            // 고객마다 4~7개의 정보 유형을 보유 (생년월일·전자우편은 기본 보유)
            const pool = INFO_TYPES.slice();
            const count = 4 + Math.floor(rand() * 4);
            const picked = new Set([6, 7]);
            while (picked.size < count) picked.add(pool[Math.floor(rand() * pool.length)].infoTypeId);
            [...picked].sort((a, b) => a - b).forEach((typeId) => {
                const t = INFO_TYPES.find((x) => x.infoTypeId === typeId);
                list.push({
                    infoId: id++,
                    customerId: c.customerId,
                    infoTypeId: typeId,
                    value: fakeValue(t.typeName, c, rand),
                    registeredAt: c.registeredAt,
                    deleted: false,             // 파기 승인 시 true (원문은 null 처리)
                });
            });
        });
        return list;
    }

    /** 접근 기록 생성 — 평범한 업무 패턴 + 시연용 이상행위 몇 건 */
    function buildAccessLogs(users, customers, infos, rand) {
        const logs = [];
        const typeOf = (info) => INFO_TYPES.find((t) => t.infoTypeId === info.infoTypeId);
        const pick = (arr) => arr[Math.floor(rand() * arr.length)];

        /** 특정 직원이 '업무 범위 안에서' 열람할 만한 정보를 하나 고른다 */
        function pickInfoInScope(user, onlyTypes) {
            const scope = onlyTypes || DEPT_SCOPE[user.department];
            for (let i = 0; i < 50; i++) {
                const c = pick(customers);
                const cand = infos.filter((x) => x.customerId === c.customerId && scope.includes(typeOf(x).typeName));
                if (cand.length) return cand[Math.floor(rand() * cand.length)];
            }
            return infos[0];
        }

        function push(user, info, action, date, extra) {
            logs.push({
                userId: user.userId,
                infoId: info.infoId,
                customerId: info.customerId,
                actionType: action,
                accessReason: (extra && extra.reason !== undefined) ? extra.reason : pick(REASON_PRESETS),
                accessedAt: toLocalISO(date),
                ipAddress: (extra && extra.ip) || `10.20.${user.userId}.${10 + user.userId}`,
                deviceInfo: (extra && extra.device) || 'Windows 11 / Chrome',
            });
        }

        const employees = users.filter((u) => u.role === 'EMPLOYEE');
        const now = new Date();

        // (1) 최근 14일, 평범한 근무 패턴
        for (let day = 13; day >= 0; day--) {
            const base = at(day, 0, 0);
            const weekend = base.getDay() === 0 || base.getDay() === 6;
            employees.forEach((u) => {
                const cnt = weekend ? 0 : 5 + Math.floor(rand() * 12);   // 정상 직원은 주말 근무 없음
                for (let k = 0; k < cnt; k++) {
                    const h = 9 + Math.floor(rand() * 9);            // 09~17시
                    const d = at(day, h, Math.floor(rand() * 60), Math.floor(rand() * 60));
                    if (d > now) continue;                           // 미래 시각은 만들지 않음
                    const r = rand();
                    const action = r < 0.86 ? 'VIEW' : r < 0.97 ? 'EDIT' : 'DOWNLOAD';
                    push(u, pickInfoInScope(u), action, d);
                }
            });
        }

        // (2) 시연용 이상행위 ----------------------------------------------------
        const u = (name) => users.find((x) => x.username === name);
        const highTypes = ['주민번호', '신용카드번호', '계좌번호'];

        // ① 박직원(emp002): 2일 전 밤 23시, 외부 IP·모바일로 고민감 정보 연속 열람 (15초 간격)
        //    → 업무시간 외(abnormal_time) + 단시간 연속(rapid_access) + 범위 밖(cross_department)
        for (let k = 0; k < 14; k++) {
            const when = new Date(at(2, 23, 5).getTime() + k * 15 * 1000);
            push(u('emp002'), pickInfoInScope(u('emp002'), highTypes), 'VIEW',
                 when, { ip: '175.223.14.77', device: 'Android / Mobile Chrome', reason: '확인' });
        }

        // ② 정직원(emp004): 최근 평일 14시, 4분 동안 주민번호·계좌번호 12건 다운로드
        //    → 대량 다운로드(bulk_download) + 단시간 연속(rapid_access)
        const d2 = weekdayOffset(1);
        for (let k = 0; k < 12; k++) {
            const when = new Date(at(d2, 14, 0).getTime() + k * 20 * 1000);   // 20초 간격
            push(u('emp004'), pickInfoInScope(u('emp004'), ['주민번호', '계좌번호']), 'DOWNLOAD',
                 when, { reason: '대출 심사 서류 확인' });
        }
        // 같은 날 조회도 많게 → 일일 과다 접근(excessive_access)
        for (let k = 0; k < 24; k++) {
            push(u('emp004'), pickInfoInScope(u('emp004')), 'VIEW', at(d2, 10 + Math.floor(k / 6), (k * 9) % 60));
        }

        // ③ 한직원(emp005, 콜센터): 업무 범위 밖인 여권번호·카드번호 열람
        for (let k = 0; k < 5; k++) {
            push(u('emp005'), pickInfoInScope(u('emp005'), ['여권번호', '신용카드번호']), 'VIEW',
                 at(weekdayOffset(3), 15, 10 + k * 7), { reason: '민원 처리' });
        }

        // 시간순 정렬 후 log_id 부여 (AUTO_INCREMENT 와 동일하게 오래된 것이 작은 번호)
        logs.sort((a, b) => a.accessedAt.localeCompare(b.accessedAt));
        logs.forEach((l, i) => { l.logId = i + 1; });
        return logs;
    }

    function buildDeletionRequests(infos) {
        const findInfo = (custId, typeId) =>
            infos.find((x) => x.customerId === custId && x.infoTypeId === typeId) ||
            infos.find((x) => x.customerId === custId);
        const rows = [
            // [고객ID, 유형ID, 요청자, 사유, 상태, 며칠 전]
            [3, 2, 2, '고객 탈회로 인한 보관 기간 만료', 'PENDING', 0],
            [8, 4, 4, '카드 해지 후 5년 경과', 'PENDING', 1],
            [12, 3, 5, '대출 상환 완료, 보관 사유 소멸', 'PENDING', 2],
            [5, 5, 2, '고객 파기 요청 (민원 접수 2026-11)', 'DELETED', 6],
            [9, 1, 3, '중복 등록된 정보 정리', 'REJECTED', 8],
        ];
        return rows.map((r, i) => {
            const info = findInfo(r[0], r[1]);
            const req = {
                requestId: i + 1,
                infoId: info.infoId,
                customerId: info.customerId,
                requestedBy: r[2],
                deletionReason: r[3],
                status: r[4],
                approvedBy: null,
                requestedAt: toLocalISO(at(r[5], 11, 20)),
                approvedAt: null,
                deletedAt: null,
                rejectionReason: null,
            };
            if (r[4] === 'DELETED') {
                req.approvedBy = 1;
                req.approvedAt = toLocalISO(at(r[5] - 1, 9, 40));
                req.deletedAt = req.approvedAt;
                info.deleted = true;
                info.value = null;
            }
            if (r[4] === 'REJECTED') {
                req.approvedBy = 1;
                req.approvedAt = toLocalISO(at(r[5] - 1, 10, 5));
                req.rejectionReason = '법정 보관 기간(5년) 미경과';
            }
            return req;
        });
    }

    function buildAudits() {
        return [
            {
                auditId: 1, userId: 2,
                auditPeriodStart: toLocalISO(at(14, 0, 0)), auditPeriodEnd: toLocalISO(at(8, 0, 0)),
                auditType: 'ROUTINE', accessCount: 58, alertFlags: {},
                auditNotes: '정기 점검. 접근 사유 기재 양호.',
                auditedAt: toLocalISO(at(7, 17, 30)), auditedBy: 1,
            },
            {
                auditId: 2, userId: 4,
                auditPeriodStart: toLocalISO(at(14, 0, 0)), auditPeriodEnd: toLocalISO(at(8, 0, 0)),
                auditType: 'ROUTINE', accessCount: 61, alertFlags: {},
                auditNotes: '정기 점검. 특이사항 없음.',
                auditedAt: toLocalISO(at(7, 17, 45)), auditedBy: 1,
            },
            {
                auditId: 3, userId: 6,
                auditPeriodStart: toLocalISO(at(3, 0, 0)), auditPeriodEnd: toLocalISO(at(2, 0, 0)),
                auditType: 'ALERT', accessCount: 5, alertFlags: { cross_department: 5 },
                auditNotes: '콜센터 업무 범위 밖(여권번호, 카드번호) 열람 확인. 본인 소명 요청함.',
                auditedAt: toLocalISO(at(2, 10, 0)), auditedBy: 1,
            },
        ];
    }

    /** 전체 초기 DB 생성 */
    function seed() {
        const rand = createRng(20261117);
        const users = buildUsers();
        const customers = buildCustomers();
        const personalInfo = buildPersonalInfo(customers, rand);
        const deletionRequests = buildDeletionRequests(personalInfo);
        const accessLogs = buildAccessLogs(users, customers, personalInfo.filter((x) => !x.deleted), rand);
        const audits = buildAudits();
        return {
            version: 1,
            seededAt: toLocalISO(new Date()),
            users, customers, infoTypes: INFO_TYPES, personalInfo,
            accessLogs, deletionRequests, audits,
            // AUTO_INCREMENT 흉내
            seq: {
                log: accessLogs.length + 1,
                request: deletionRequests.length + 1,
                audit: audits.length + 1,
            },
        };
    }

    /* ------------------------------------------------------------------
     * 저장 / 불러오기
     * ------------------------------------------------------------------ */
    let cache = null;

    function load() {
        if (cache) return cache;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) cache = JSON.parse(raw);
        } catch (e) {
            console.warn('[MockDB] 저장된 데이터를 읽지 못해 새로 생성합니다.', e);
        }
        // 목데이터는 '생성한 날' 기준 최근 14일로 만들어지므로,
        // 날짜가 바뀌면 새로 생성해서 대시보드·이상탐지가 항상 '최근 기록'을 보여주게 함
        // (그날 직접 남긴 열람 기록·권한 변경은 다음 날 초기화됩니다)
        const today = toLocalISO(new Date()).slice(0, 10);
        const stale = cache && (!cache.seededAt || cache.seededAt.slice(0, 10) !== today);
        if (!cache || cache.version !== 1 || stale) {
            if (stale) console.info('[MockDB] 날짜가 바뀌어 목데이터를 새로 생성합니다.');
            cache = seed();
            save();
        }
        return cache;
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('[MockDB] localStorage 저장 실패 (시크릿 모드일 수 있음)', e);
        }
    }

    function reset() {
        cache = seed();
        save();
        return cache;
    }

    // 다른 탭(예: 직원 포털)에서 DB가 바뀌면 캐시를 버려서 관리자 화면에 즉시 반영
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) cache = null;
    });

    /* 외부 공개 */
    window.MockDB = { load, save, reset, toLocalISO, DEPT_SCOPE, REASON_PRESETS, INFO_TYPES };
})();
