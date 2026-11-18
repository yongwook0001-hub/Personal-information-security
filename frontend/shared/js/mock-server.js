/**
 * ============================================================================
 *  가상 API 서버 (Mock Server)
 * ============================================================================
 *  - Spring Boot 컨트롤러와 "같은 URL, 같은 요청, 같은 응답 모양"으로 동작합니다.
 *  - api.js 가 USE_MOCK=true 일 때 fetch 대신 MockServer.handle() 을 호출합니다.
 *  - 즉, 화면 코드는 목/실제를 구분하지 않습니다.
 *
 *  ※ 여기 정의된 경로와 응답 형태 = 백엔드가 구현해야 할 명세
 *     (정리본: docs/API_CONTRACT.md)
 * ============================================================================
 */
(function () {
    'use strict';

    const CFG = window.APP_CONFIG;
    const { toLocalISO, DEPT_SCOPE } = window.MockDB;

    /* ------------------------------------------------------------------
     * HTTP 응답 흉내
     * ------------------------------------------------------------------ */
    class HttpError extends Error {
        constructor(status, message, code) {
            super(message);
            this.status = status;
            this.code = code || null;
        }
    }
    const ok = (data) => ({ status: 200, data });
    const created = (data) => ({ status: 201, data });

    /* ------------------------------------------------------------------
     * 마스킹 규칙 (서버에서 마스킹해서 내려주는 것이 원칙)
     * ------------------------------------------------------------------ */
    function maskValue(typeName, v) {
        if (v == null) return null;
        switch (typeName) {
            case '주민번호':     return v.slice(0, 8) + '******';                 // 850312-1******
            case '여권번호':     return v.slice(0, 3) + '******';                 // M12******
            case '운전면허번호': return v.slice(0, 6) + '******' + v.slice(-3);   // 11-23-******-01
            case '신용카드번호': return v.slice(0, 5) + '****-****-' + v.slice(-4);
            case '계좌번호':     return v.slice(0, 4) + '***-***' + v.slice(-3);
            case '생년월일':     return v.slice(0, 4) + '-**-**';
            case '전자우편주소': {
                const [id, dom] = v.split('@');
                return id.slice(0, 2) + '***@' + dom;
            }
            default:             return v.slice(0, 1) + '**';
        }
    }
    const maskPhone = (p) => (p ? p.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, '$1-****-$3') : p);

    /* ------------------------------------------------------------------
     * 조회 헬퍼 (JOIN 역할)
     * ------------------------------------------------------------------ */
    function helpers(db) {
        const userById = (id) => db.users.find((u) => u.userId === id);
        const custById = (id) => db.customers.find((c) => c.customerId === id);
        const infoById = (id) => db.personalInfo.find((i) => i.infoId === id);
        const typeById = (id) => db.infoTypes.find((t) => t.infoTypeId === id);
        return { userById, custById, infoById, typeById };
    }

    /** AccessLog → AccessLogDTO (평탄화된 응답, 03_views.sql 의 AccessLogDetail 뷰와 같은 컬럼) */
    function toLogDTO(db, l) {
        const { userById, custById, infoById, typeById } = helpers(db);
        const u = userById(l.userId) || {};
        const c = custById(l.customerId) || {};
        const info = infoById(l.infoId) || {};
        const t = typeById(info.infoTypeId) || {};
        return {
            logId: l.logId,
            userId: l.userId,
            username: u.username,
            userName: u.name,
            department: u.department,
            customerId: l.customerId,
            customerName: c.name,
            infoId: l.infoId,
            infoType: t.typeName,
            sensitivityLevel: t.sensitivityLevel,
            actionType: l.actionType,
            accessReason: l.accessReason,
            accessedAt: l.accessedAt,
            ipAddress: l.ipAddress,
            deviceInfo: l.deviceInfo,
        };
    }

    /** User → UserDTO (비밀번호는 절대 내려주지 않음) */
    function toUserDTO(u) {
        const { password, ...rest } = u;   // eslint-disable-line no-unused-vars
        return rest;
    }

    function toCustomerDTO(c) {
        return { customerId: c.customerId, name: c.name, phone: maskPhone(c.phone), address: c.address, registeredAt: c.registeredAt };
    }

    function toDeletionDTO(db, r) {
        const { userById, custById, infoById, typeById } = helpers(db);
        const info = infoById(r.infoId) || {};
        const t = typeById(info.infoTypeId) || {};
        return {
            ...r,
            infoType: t.typeName,
            sensitivityLevel: t.sensitivityLevel,
            customerName: (custById(r.customerId) || {}).name,
            requestedByName: (userById(r.requestedBy) || {}).name,
            requestedByDepartment: (userById(r.requestedBy) || {}).department,
            approvedByName: r.approvedBy ? (userById(r.approvedBy) || {}).name : null,
        };
    }

    function toAuditDTO(db, a) {
        const { userById } = helpers(db);
        const u = userById(a.userId) || {};
        return { ...a, userName: u.name, department: u.department, auditedByName: (userById(a.auditedBy) || {}).name };
    }

    /* ------------------------------------------------------------------
     * 시간 유틸
     * ------------------------------------------------------------------ */
    const parse = (iso) => new Date(iso);
    const daysAgo = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
    const dayKey = (iso) => iso.slice(0, 10);
    function isOffHours(iso) {
        const d = parse(iso);
        const h = d.getHours();
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        return weekend || h < CFG.WORK_HOUR_START || h >= CFG.WORK_HOUR_END;
    }

    /* ------------------------------------------------------------------
     * 이상 탐지 규칙 (04_procedures.sql DetectAnomalousActivity 와 같은 플래그 이름)
     * ------------------------------------------------------------------ */
    const RULES = {
        excessive_access: { label: '일일 과다 접근',     weight: 20, desc: '하루 30건 이상 접근' },
        abnormal_time:    { label: '업무시간 외 접근',   weight: 15, desc: `${CFG.WORK_HOUR_END}시~${CFG.WORK_HOUR_START}시 또는 주말 접근` },
        rapid_access:     { label: '단시간 연속 조회',   weight: 25, desc: '5분 안에 10건 이상 연속 접근' },
        cross_department: { label: '업무 범위 밖 정보',  weight: 15, desc: '소속 부서 업무와 무관한 정보 유형 접근' },
        bulk_download:    { label: '대량 다운로드',      weight: 30, desc: '하루 5건 이상 원문 다운로드' },
    };

    /**
     * 직원 한 명의 로그 목록으로 이상 징후 계산
     * @returns {{flags:Object, alerts:Array, riskScore:number, hourly:number[]}}
     */
    function analyzeUser(db, user, logs) {
        const { infoById, typeById } = helpers(db);
        const flags = {};
        const alerts = [];
        const hourly = new Array(24).fill(0);
        logs.forEach((l) => { hourly[parse(l.accessedAt).getHours()]++; });

        const sorted = logs.slice().sort((a, b) => a.accessedAt.localeCompare(b.accessedAt));
        const addAlert = (rule, count, items, detail) => {
            if (!count) return;
            flags[rule] = count;
            alerts.push({
                rule,
                label: RULES[rule].label,
                description: RULES[rule].desc,
                count,
                detail,
                firstAt: items.length ? items[0].accessedAt : null,
                lastAt: items.length ? items[items.length - 1].accessedAt : null,
                logIds: items.slice(0, 50).map((x) => x.logId),
            });
        };

        // ① 일일 과다 접근
        const byDay = {};
        sorted.forEach((l) => { (byDay[dayKey(l.accessedAt)] = byDay[dayKey(l.accessedAt)] || []).push(l); });
        const heavyDays = Object.entries(byDay).filter(([, arr]) => arr.length >= 30);
        addAlert('excessive_access', heavyDays.length, heavyDays.flatMap(([, a]) => a),
                 heavyDays.map(([d, a]) => `${d.slice(5).replace('-', '/')} ${a.length}건`).join(', '));

        // ② 업무시간 외 접근
        const off = sorted.filter((l) => isOffHours(l.accessedAt));
        addAlert('abnormal_time', off.length, off,
                 off.length ? `IP ${[...new Set(off.map((x) => x.ipAddress))].join(', ')}` : '');

        // ③ 단시간 연속 조회 (5분 창, 10건 이상 → 1회로 집계 후 창을 건너뜀)
        let bursts = 0;
        const burstItems = [];
        for (let i = 0; i < sorted.length; ) {
            let j = i;
            const start = parse(sorted[i].accessedAt).getTime();
            while (j < sorted.length && parse(sorted[j].accessedAt).getTime() - start <= 5 * 60 * 1000) j++;
            if (j - i >= 10) {
                bursts++;
                burstItems.push(...sorted.slice(i, j));
                i = j;
            } else {
                i++;
            }
        }
        addAlert('rapid_access', bursts, burstItems, bursts ? `최대 ${burstItems.length}건이 5분 안에 집중` : '');

        // ④ 업무 범위 밖 정보 유형 접근
        const scope = DEPT_SCOPE[user.department] || [];
        const cross = sorted.filter((l) => {
            const info = infoById(l.infoId);
            const t = info && typeById(info.infoTypeId);
            return t && !scope.includes(t.typeName);
        });
        const crossTypes = [...new Set(cross.map((l) => typeById(infoById(l.infoId).infoTypeId).typeName))];
        addAlert('cross_department', cross.length, cross, crossTypes.join(', '));

        // ⑤ 대량 다운로드
        const dlDays = Object.entries(byDay)
            .map(([d, arr]) => [d, arr.filter((x) => x.actionType === 'DOWNLOAD')])
            .filter(([, arr]) => arr.length >= 5);
        addAlert('bulk_download', dlDays.length, dlDays.flatMap(([, a]) => a),
                 dlDays.map(([d, a]) => `${d.slice(5).replace('-', '/')} ${a.length}건`).join(', '));

        // 위험 점수: 규칙 가중치 합 (반복 횟수만큼 조금씩 가산, 최대 100)
        let score = 0;
        alerts.forEach((a) => { score += RULES[a.rule].weight + Math.min(10, Math.max(0, a.count - 1)); });
        return { flags, alerts, riskScore: Math.min(100, score), hourly };
    }

    function logsInRange(db, fromDate, toDate) {
        const from = toLocalISO(fromDate);
        const to = toDate ? toLocalISO(toDate) : '9999';
        return db.accessLogs.filter((l) => l.accessedAt >= from && l.accessedAt < to);
    }

    /* ------------------------------------------------------------------
     * 라우트 정의
     *   { method, path: '/customers/:id', auth: 'ANY'|'ADMIN'|null, handler(ctx) }
     * ------------------------------------------------------------------ */
    const routes = [];
    const route = (method, path, auth, handler) => {
        const keys = [];
        const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
        routes.push({ method, re, keys, auth, handler });
    };

    /* ===== 인증 ===================================================== */

    route('POST', '/auth/login', null, ({ db, body }) => {
        const u = db.users.find((x) => x.username === (body.username || '').trim());
        if (!u || u.password !== body.password) throw new HttpError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
        if (!u.isActive) throw new HttpError(403, '접근 권한이 해제된 계정입니다. 총괄책임자에게 문의하세요.', 'ACCOUNT_DISABLED');
        return ok({
            token: `mock-token-${u.userId}`,
            userId: u.userId, username: u.username, name: u.name,
            department: u.department, position: u.position, role: u.role,
        });
    });

    /* ===== 직원: 고객 조회 ========================================== */

    // 고객 검색 — 이름 또는 연락처 일부. 빈 검색어는 빈 배열 (전체 목록 노출 방지)
    route('GET', '/customers', 'ANY', ({ db, query }) => {
        const q = (query.name || query.q || '').trim();
        if (!q) return ok([]);
        const digits = q.replace(/\D/g, '');
        const list = db.customers.filter((c) =>
            c.name.includes(q) || (digits.length >= 4 && c.phone.replace(/\D/g, '').endsWith(digits)));
        return ok(list.slice(0, 50).map(toCustomerDTO));
    });

    route('GET', '/customers/:id', 'ANY', ({ db, params }) => {
        const c = db.customers.find((x) => x.customerId === +params.id);
        if (!c) throw new HttpError(404, '고객을 찾을 수 없습니다.');
        return ok(toCustomerDTO(c));
    });

    // 고객의 개인정보 목록 — 값은 항상 마스킹해서 반환
    route('GET', '/info/customer/:id', 'ANY', ({ db, params }) => {
        const { typeById } = helpers(db);
        const pendingIds = new Set(db.deletionRequests.filter((r) => r.status === 'PENDING').map((r) => r.infoId));
        const list = db.personalInfo
            .filter((i) => i.customerId === +params.id)
            .map((i) => {
                const t = typeById(i.infoTypeId);
                return {
                    infoId: i.infoId,
                    customerId: i.customerId,
                    infoType: t.typeName,
                    sensitivityLevel: t.sensitivityLevel,
                    infoValue: i.deleted ? null : maskValue(t.typeName, i.value),
                    registeredAt: i.registeredAt,
                    deleted: !!i.deleted,
                    deletionPending: pendingIds.has(i.infoId),
                };
            });
        return ok(list);
    });

    /** 열람/다운로드 공통: 사유 검증 + 접근 기록 INSERT */
    function recordAccess(db, user, infoId, action, reason, meta) {
        const { infoById, typeById } = helpers(db);
        const info = infoById(+infoId);
        if (!info) throw new HttpError(404, '개인정보 항목을 찾을 수 없습니다.');
        if (info.deleted) throw new HttpError(410, '이미 파기된 정보입니다.');
        if (!reason || reason.trim().length < 5) throw new HttpError(400, '접근 사유를 5자 이상 입력해야 합니다.');
        const log = {
            logId: db.seq.log++,
            userId: user.userId,
            infoId: info.infoId,
            customerId: info.customerId,
            actionType: action,
            accessReason: reason.trim(),
            accessedAt: toLocalISO(new Date()),
            ipAddress: meta.ip || `10.20.${user.userId}.${10 + user.userId}`,
            deviceInfo: meta.device || 'Web',
        };
        db.accessLogs.push(log);
        return { info, type: typeById(info.infoTypeId), log };
    }

    // 원문 열람 (사유 필수) → AccessLogs 에 VIEW 기록
    route('POST', '/info/:id/view', 'ANY', ({ db, params, body, user, meta }) => {
        const { info, type, log } = recordAccess(db, user, params.id, 'VIEW', body.reason, meta);
        return ok({
            infoId: info.infoId, infoType: type.typeName, infoValue: info.value,
            logId: log.logId, revealSeconds: CFG.REVEAL_SECONDS,
        });
    });

    // 원문 다운로드 (사유 필수) → AccessLogs 에 DOWNLOAD 기록
    route('POST', '/info/:id/download', 'ANY', ({ db, params, body, user, meta }) => {
        const { info, type, log } = recordAccess(db, user, params.id, 'DOWNLOAD', body.reason, meta);
        const cust = db.customers.find((c) => c.customerId === info.customerId);
        // 사유에 쉼표·따옴표가 있어도 열이 밀리지 않고, 수식으로 실행되지 않도록 UI.toCSV 사용
        const content = window.UI.toCSV(
            ['고객ID', '고객명', '정보유형', '값', '다운로드사유', '다운로드시각', '처리자'],
            [[cust.customerId, cust.name, type.typeName, info.value, log.accessReason, log.accessedAt, user.name]]);
        return ok({
            fileName: `customer${cust.customerId}_${type.typeName}_${log.logId}.csv`,
            mimeType: 'text/csv;charset=utf-8',
            content,
            logId: log.logId,
        });
    });

    /* ===== 직원: 내 기록 / 파기 요청 ================================ */

    route('GET', '/access-logs/me', 'ANY', ({ db, user, query }) => {
        const days = +query.days || 30;
        return ok(logsInRange(db, daysAgo(days - 1))
            .filter((l) => l.userId === user.userId)
            .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt))
            .map((l) => toLogDTO(db, l)));
    });

    route('POST', '/deletion-requests', 'ANY', ({ db, body, user }) => {
        const info = db.personalInfo.find((i) => i.infoId === +body.infoId);
        if (!info) throw new HttpError(404, '개인정보 항목을 찾을 수 없습니다.');
        if (info.deleted) throw new HttpError(410, '이미 파기된 정보입니다.');
        if (db.deletionRequests.some((r) => r.infoId === info.infoId && r.status === 'PENDING'))
            throw new HttpError(409, '이미 승인 대기 중인 파기 요청이 있습니다.');
        if (!body.reason || body.reason.trim().length < 5) throw new HttpError(400, '파기 사유를 5자 이상 입력해야 합니다.');
        const req = {
            requestId: db.seq.request++,
            infoId: info.infoId, customerId: info.customerId, requestedBy: user.userId,
            deletionReason: body.reason.trim(), status: 'PENDING', approvedBy: null,
            requestedAt: toLocalISO(new Date()), approvedAt: null, deletedAt: null, rejectionReason: null,
        };
        db.deletionRequests.push(req);
        return created(toDeletionDTO(db, req));
    });

    route('GET', '/deletion-requests/me', 'ANY', ({ db, user }) =>
        ok(db.deletionRequests.filter((r) => r.requestedBy === user.userId)
            .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
            .map((r) => toDeletionDTO(db, r))));

    /* ===== 관리자: 파기 승인 ======================================== */

    route('GET', '/deletion-requests/pending', 'ADMIN', ({ db }) =>
        ok(db.deletionRequests.filter((r) => r.status === 'PENDING')
            .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
            .map((r) => toDeletionDTO(db, r))));

    route('GET', '/deletion-requests', 'ADMIN', ({ db, query }) => {
        const st = query.status;
        return ok(db.deletionRequests.filter((r) => !st || st === 'ALL' || r.status === st)
            .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
            .map((r) => toDeletionDTO(db, r)));
    });

    route('POST', '/deletion-requests/:id/approve', 'ADMIN', ({ db, params, user, meta }) => {
        const r = db.deletionRequests.find((x) => x.requestId === +params.id);
        if (!r) throw new HttpError(404, '파기 요청을 찾을 수 없습니다.');
        if (r.status !== 'PENDING') throw new HttpError(409, '이미 처리된 요청입니다.');
        const info = db.personalInfo.find((i) => i.infoId === r.infoId);
        const now = toLocalISO(new Date());
        Object.assign(r, { status: 'DELETED', approvedBy: user.userId, approvedAt: now, deletedAt: now });
        // 파기 실행 기록 (AccessLogs DELETE)
        db.accessLogs.push({
            logId: db.seq.log++, userId: user.userId, infoId: info.infoId, customerId: info.customerId,
            actionType: 'DELETE', accessReason: `파기 승인 #${r.requestId}: ${r.deletionReason}`,
            accessedAt: now, ipAddress: meta.ip || '10.20.1.11', deviceInfo: meta.device || 'Web',
        });
        info.deleted = true;
        info.value = null;
        return ok(toDeletionDTO(db, r));
    });

    route('POST', '/deletion-requests/:id/reject', 'ADMIN', ({ db, params, body, user }) => {
        const r = db.deletionRequests.find((x) => x.requestId === +params.id);
        if (!r) throw new HttpError(404, '파기 요청을 찾을 수 없습니다.');
        if (r.status !== 'PENDING') throw new HttpError(409, '이미 처리된 요청입니다.');
        if (!body.reason || !body.reason.trim()) throw new HttpError(400, '거절 사유를 입력해야 합니다.');
        Object.assign(r, { status: 'REJECTED', approvedBy: user.userId, approvedAt: toLocalISO(new Date()), rejectionReason: body.reason.trim() });
        return ok(toDeletionDTO(db, r));
    });

    /* ===== 관리자: 대시보드 ========================================= */

    route('GET', '/admin/stats', 'ADMIN', ({ db, query }) => {
        const { infoById, typeById, userById } = helpers(db);
        const days = +query.days || 14;
        const range = logsInRange(db, daysAgo(days - 1));
        const today = logsInRange(db, daysAgo(0));
        const levelOf = (l) => typeById(infoById(l.infoId).infoTypeId).sensitivityLevel;

        // 일별
        const daily = [];
        for (let i = days - 1; i >= 0; i--) {
            const key = toLocalISO(daysAgo(i)).slice(0, 10);
            const arr = range.filter((l) => dayKey(l.accessedAt) === key);
            daily.push({ date: key, count: arr.length, offHours: arr.filter((l) => isOffHours(l.accessedAt)).length });
        }
        // 시간대별
        const hourly = new Array(24).fill(0);
        range.forEach((l) => { hourly[parse(l.accessedAt).getHours()]++; });
        // 정보 유형별
        const typeBreakdown = db.infoTypes.map((t) => ({
            infoType: t.typeName, sensitivityLevel: t.sensitivityLevel,
            count: range.filter((l) => infoById(l.infoId).infoTypeId === t.infoTypeId).length,
        })).sort((a, b) => b.sensitivityLevel - a.sensitivityLevel || b.count - a.count);
        // 직원별 TOP
        const byUser = {};
        range.forEach((l) => { byUser[l.userId] = (byUser[l.userId] || 0) + 1; });
        const topUsers = Object.entries(byUser)
            .map(([id, count]) => { const u = userById(+id); return { userId: +id, name: u.name, department: u.department, count }; })
            .sort((a, b) => b.count - a.count).slice(0, 6);
        // 이상 징후 직원 수 (최근 7일)
        const recent7 = logsInRange(db, daysAgo(6));
        const flagged = db.users.filter((u) => u.role === 'EMPLOYEE')
            .map((u) => analyzeUser(db, u, recent7.filter((l) => l.userId === u.userId)))
            .filter((a) => a.riskScore > 0).length;

        return ok({
            today: {
                total: today.length,
                highSensitivity: today.filter((l) => levelOf(l) >= 4).length,
                offHours: today.filter((l) => isOffHours(l.accessedAt)).length,
                downloads: today.filter((l) => l.actionType === 'DOWNLOAD').length,
            },
            periodTotal: range.length,
            activeUsers: db.users.filter((u) => u.role === 'EMPLOYEE' && u.isActive).length,
            inactiveUsers: db.users.filter((u) => u.role === 'EMPLOYEE' && !u.isActive).length,
            pendingDeletions: db.deletionRequests.filter((r) => r.status === 'PENDING').length,
            flaggedUsers: flagged,
            daily, hourly, typeBreakdown, topUsers,
            recentHighRisk: range
                .filter((l) => levelOf(l) >= 5 || isOffHours(l.accessedAt) || l.actionType === 'DOWNLOAD')
                .sort((a, b) => b.accessedAt.localeCompare(a.accessedAt)).slice(0, 8)
                .map((l) => toLogDTO(db, l)),
        });
    });

    /* ===== 관리자: 전체 접근 기록 (검색 + 페이지) =================== */

    /** 관리자 접근기록 검색 조건 적용 (목록·내보내기 공용) → 최신순 AccessLogDTO[] */
    function filterLogs(db, query) {
        const { infoById, typeById } = helpers(db);
        let list = db.accessLogs.slice();
        if (query.userId) list = list.filter((l) => l.userId === +query.userId);
        if (query.customerId) list = list.filter((l) => l.customerId === +query.customerId);
        if (query.action) list = list.filter((l) => l.actionType === query.action);
        if (query.from) list = list.filter((l) => l.accessedAt >= query.from);
        if (query.to) list = list.filter((l) => l.accessedAt < query.to + 'T99');   // to 날짜 하루 전체 포함
        if (query.minLevel) list = list.filter((l) => typeById(infoById(l.infoId).infoTypeId).sensitivityLevel >= +query.minLevel);
        if (query.offHours === 'true') list = list.filter((l) => isOffHours(l.accessedAt));
        if (query.logIds) { const ids = new Set(String(query.logIds).split(',').map(Number)); list = list.filter((l) => ids.has(l.logId)); }
        let dto = list.sort((a, b) => b.accessedAt.localeCompare(a.accessedAt)).map((l) => toLogDTO(db, l));
        if (query.q) {
            const q = query.q.trim();
            dto = dto.filter((d) => (d.customerName || '').includes(q) || (d.accessReason || '').includes(q) || (d.ipAddress || '').includes(q));
        }
        return dto;
    }

    route('GET', '/admin/access-logs', 'ADMIN', ({ db, query }) => {
        const dto = filterLogs(db, query);
        // Spring Data Page 와 같은 모양 { content, totalElements, totalPages, number, size }
        const size = +query.size || 20;
        const page = +query.page || 0;
        return ok({
            content: dto.slice(page * size, page * size + size),
            totalElements: dto.length,
            totalPages: Math.max(1, Math.ceil(dto.length / size)),
            number: page,
            size,
        });
    });

    // CSV 내보내기용: 같은 검색 조건, 페이지 없이 전체 배열
    route('GET', '/admin/access-logs/export', 'ADMIN', ({ db, query }) => ok(filterLogs(db, query)));

    /* ===== 관리자: 이상 탐지 ======================================== */

    route('GET', '/admin/anomalies', 'ADMIN', ({ db, query }) => {
        const days = +query.days || 7;
        const range = logsInRange(db, daysAgo(days - 1));
        const result = db.users.filter((u) => u.role === 'EMPLOYEE').map((u) => {
            const mine = range.filter((l) => l.userId === u.userId);
            const a = analyzeUser(db, u, mine);
            return {
                userId: u.userId, username: u.username, name: u.name, department: u.department,
                position: u.position, isActive: u.isActive, accessCount: mine.length, ...a,
            };
        }).sort((a, b) => b.riskScore - a.riskScore || b.accessCount - a.accessCount);
        return ok({ days, rules: RULES, users: result });
    });

    /* ===== 관리자: 직원 관리 ======================================== */

    route('GET', '/admin/users', 'ADMIN', ({ db }) => {
        const recent7 = logsInRange(db, daysAgo(6));
        return ok(db.users.map((u) => {
            const mine = recent7.filter((l) => l.userId === u.userId);
            const all = db.accessLogs.filter((l) => l.userId === u.userId);
            const last = all.reduce((m, l) => (l.accessedAt > m ? l.accessedAt : m), '');
            return {
                ...toUserDTO(u),
                accessCount7d: mine.length,
                lastAccessAt: last || null,
                riskScore: u.role === 'EMPLOYEE' ? analyzeUser(db, u, mine).riskScore : 0,
            };
        }));
    });

    /** 권한 해제/복구 공통 — 처리 내역은 Audits 에 INVESTIGATION 으로 남김 */
    function setActive(db, admin, userId, active, reason) {
        const u = db.users.find((x) => x.userId === +userId);
        if (!u) throw new HttpError(404, '직원을 찾을 수 없습니다.');
        if (u.role === 'ADMIN') throw new HttpError(400, '총괄책임자 계정은 변경할 수 없습니다.');
        if (!reason || reason.trim().length < 5) throw new HttpError(400, '처리 사유를 5자 이상 입력해야 합니다.');
        u.isActive = active;
        const now = new Date();
        const recent7 = logsInRange(db, daysAgo(6)).filter((l) => l.userId === u.userId);
        db.audits.push({
            auditId: db.seq.audit++, userId: u.userId,
            auditPeriodStart: toLocalISO(daysAgo(6)), auditPeriodEnd: toLocalISO(now),
            auditType: 'INVESTIGATION', accessCount: recent7.length,
            alertFlags: analyzeUser(db, u, recent7).flags,
            auditNotes: `[${active ? '권한 복구' : '권한 해제'}] ${reason.trim()}`,
            auditedAt: toLocalISO(now), auditedBy: admin.userId,
        });
        return toUserDTO(u);
    }
    route('POST', '/admin/users/:id/deactivate', 'ADMIN', ({ db, params, body, user }) => ok(setActive(db, user, params.id, false, body.reason)));
    route('POST', '/admin/users/:id/activate', 'ADMIN', ({ db, params, body, user }) => ok(setActive(db, user, params.id, true, body.reason)));

    /* ===== 관리자: 감사 기록 ======================================== */

    route('GET', '/admin/audits', 'ADMIN', ({ db, query }) =>
        ok(db.audits.filter((a) => !query.userId || a.userId === +query.userId)
            .sort((a, b) => b.auditedAt.localeCompare(a.auditedAt))
            .map((a) => toAuditDTO(db, a))));

    route('POST', '/admin/audits', 'ADMIN', ({ db, body, user }) => {
        const target = db.users.find((u) => u.userId === +body.userId);
        if (!target) throw new HttpError(404, '대상 직원을 찾을 수 없습니다.');
        if (!body.auditNotes || !body.auditNotes.trim()) throw new HttpError(400, '감사 의견을 입력해야 합니다.');
        const start = body.auditPeriodStart || toLocalISO(daysAgo(6));
        const end = body.auditPeriodEnd || toLocalISO(new Date());
        const logs = db.accessLogs.filter((l) => l.userId === target.userId && l.accessedAt >= start && l.accessedAt <= end);
        const a = {
            auditId: db.seq.audit++, userId: target.userId,
            auditPeriodStart: start, auditPeriodEnd: end,
            auditType: body.auditType || 'ROUTINE',
            accessCount: logs.length,
            // 플래그는 서버가 기간 내 로그로 다시 계산 (클라이언트 값을 믿지 않음)
            alertFlags: analyzeUser(db, target, logs).flags,
            auditNotes: body.auditNotes.trim(),
            auditedAt: toLocalISO(new Date()), auditedBy: user.userId,
        };
        db.audits.push(a);
        return created(toAuditDTO(db, a));
    });

    /* ===== 관리자: 고객 관점 조회 =================================== */

    route('GET', '/admin/customers', 'ADMIN', ({ db, query }) => {
        const q = (query.q || '').trim();
        const recent7 = logsInRange(db, daysAgo(6));
        return ok(db.customers
            .filter((c) => !q || c.name.includes(q) || c.phone.includes(q))
            .map((c) => {
                const mine = recent7.filter((l) => l.customerId === c.customerId);
                const all = db.accessLogs.filter((l) => l.customerId === c.customerId);
                return {
                    ...toCustomerDTO(c),
                    infoCount: db.personalInfo.filter((i) => i.customerId === c.customerId && !i.deleted).length,
                    accessCount7d: mine.length,
                    distinctUsers7d: new Set(mine.map((l) => l.userId)).size,
                    lastAccessAt: all.reduce((m, l) => (l.accessedAt > m ? l.accessedAt : m), '') || null,
                };
            })
            .sort((a, b) => b.accessCount7d - a.accessCount7d));
    });

    /* ------------------------------------------------------------------
     * 요청 처리 진입점
     * ------------------------------------------------------------------ */
    /**
     * @param {string} method  'GET' | 'POST' ...
     * @param {string} url     '/customers?name=홍' 처럼 API_BASE_URL 뒤의 경로
     * @param {object} body    요청 본문 (JSON)
     * @param {string} token   'mock-token-3' 형식
     * @returns {Promise<{status:number, data:any}>}
     */
    function handle(method, url, body, token) {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const [path, qs] = url.split('?');
                    const query = Object.fromEntries(new URLSearchParams(qs || ''));
                    const r = routes.find((x) => x.method === method && x.re.test(path));
                    if (!r) throw new HttpError(404, `[Mock] 정의되지 않은 API: ${method} ${path}`);

                    const db = window.MockDB.load();
                    const params = {};
                    const m = path.match(r.re);
                    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });

                    // 인증 확인 (Spring Security 필터 역할)
                    let user = null;
                    if (r.auth) {
                        const id = token && +String(token).replace('mock-token-', '');
                        user = db.users.find((u) => u.userId === id);
                        if (!user) throw new HttpError(401, '로그인이 필요합니다.');
                        if (!user.isActive) throw new HttpError(403, '접근 권한이 해제된 계정입니다. 총괄책임자에게 문의하세요.', 'ACCOUNT_DISABLED');
                        if (r.auth === 'ADMIN' && user.role !== 'ADMIN') throw new HttpError(403, '관리자만 사용할 수 있는 기능입니다.');
                    }

                    const meta = {
                        ip: user ? `10.20.${user.userId}.${10 + user.userId}` : null,
                        device: /Mobile/.test(navigator.userAgent) ? 'Mobile / Browser' : 'Windows 11 / Chrome',
                    };
                    const res = r.handler({ db, params, query, body: body || {}, user, meta });
                    if (method !== 'GET') window.MockDB.save();      // 쓰기 요청이면 저장
                    // 실제 네트워크처럼 깊은 복사본을 돌려줌 (화면에서 수정해도 DB에 영향 없음)
                    resolve({ status: res.status, data: JSON.parse(JSON.stringify(res.data)) });
                } catch (e) {
                    if (!(e instanceof HttpError)) console.error('[MockServer]', e);
                    resolve({ status: e.status || 500, data: { message: e.message, code: e.code || null } });
                }
            }, CFG.MOCK_LATENCY_MS);
        });
    }

    window.MockServer = { handle, RULES };
})();
