/**
 * ============================================================================
 *  API 클라이언트 (직원 포털 / 관리자 포털 공용)
 * ============================================================================
 *  화면 코드 → api.searchCustomers('홍') → request('GET', '/customers?name=홍')
 *                                          ├─ USE_MOCK=true  → MockServer.handle()
 *                                          └─ USE_MOCK=false → fetch(API_BASE_URL + ...)
 *
 *  - 두 경로 모두 결과를 { status, data } 로 맞춘 뒤 같은 방식으로 처리하므로
 *    실제 백엔드로 바꿔도 화면 코드는 한 줄도 고칠 필요가 없습니다.
 *  - 실패 시 ApiError(status, message, code) 를 throw 합니다.
 * ============================================================================
 */
(function () {
    'use strict';

    const CFG = window.APP_CONFIG;

    /** API 오류 객체 — 화면에서 e.message 를 그대로 보여주면 됨 */
    class ApiError extends Error {
        constructor(status, message, code) {
            super(message || '요청을 처리하지 못했습니다.');
            this.status = status;
            this.code = code || null;
        }
    }

    /* ------------------------------------------------------------------
     * 세션 (로그인 정보) — localStorage 에 JSON 으로 저장
     *
     *  포털마다 다른 키를 사용합니다.
     *    /admin/...    → pims_session_admin
     *    /employee/... → pims_session_employee
     *  (키가 하나뿐이면 같은 브라우저에서 관리자로 로그인하는 순간
     *   직원 탭의 요청까지 관리자 토큰으로 나가서, 직원의 열람 기록이
     *   관리자 이름으로 저장되는 문제가 있었습니다)
     * ------------------------------------------------------------------ */
    const PORTAL = location.pathname.includes('/admin/') ? 'admin' : 'employee';
    const SESSION_KEY = `${CFG.SESSION_KEY}_${PORTAL}`;

    const Session = {
        get() {
            try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
        },
        set(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); },
        clear() { localStorage.removeItem(SESSION_KEY); },
    };

    /** 쿼리스트링 생성 (빈 값은 제외) */
    function qs(params) {
        const p = new URLSearchParams();
        Object.entries(params || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') p.append(k, v);
        });
        const s = p.toString();
        return s ? `?${s}` : '';
    }

    /**
     * 모든 요청이 지나가는 단 하나의 함수
     * @param {string} method
     * @param {string} path   '/customers' 처럼 /api 뒤 경로
     * @param {object} [body]
     */
    async function request(method, path, body) {
        const session = Session.get();
        const token = session && session.token;
        let res;

        if (CFG.USE_MOCK) {
            // ① 목 서버
            res = await window.MockServer.handle(method, path, body, token);
        } else {
            // ② 실제 Spring Boot
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            let r;
            try {
                r = await fetch(CFG.API_BASE_URL + path, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                });
            } catch (e) {
                throw new ApiError(0, '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
            }
            let data = null;
            const text = await r.text();
            try { data = text ? JSON.parse(text) : null; } catch (e) { data = { message: text }; }
            res = { status: r.status, data };
        }

        if (res.status >= 200 && res.status < 300) return res.data;

        const msg = (res.data && (res.data.message || res.data.error)) || `요청 실패 (${res.status})`;
        const code = res.data && res.data.code;

        // 세션 만료 또는 권한 해제된 계정 → 로그인 화면으로
        if (path !== '/auth/login' && (res.status === 401 || code === 'ACCOUNT_DISABLED')) {
            Session.clear();
            if (window.onSessionExpired) window.onSessionExpired(msg);
        }
        throw new ApiError(res.status, msg, code);
    }

    /* ------------------------------------------------------------------
     * 엔드포인트 함수 — 화면에서는 이 함수들만 사용
     * ------------------------------------------------------------------ */
    const api = {
        /* 인증 */
        async login(username, password) {
            const data = await request('POST', '/auth/login', { username, password });
            Session.set(data);
            return data;
        },
        logout() { Session.clear(); },
        session() { return Session.get(); },

        /* 직원: 고객/개인정보 */
        searchCustomers: (q) => request('GET', `/customers${qs({ name: q })}`),
        getCustomer: (id) => request('GET', `/customers/${id}`),
        getCustomerInfo: (id) => request('GET', `/info/customer/${id}`),
        viewPersonalInfo: (infoId, reason) => request('POST', `/info/${infoId}/view`, { reason }),
        downloadPersonalInfo: (infoId, reason) => request('POST', `/info/${infoId}/download`, { reason }),

        /* 직원: 내 기록 / 파기 요청 */
        getMyAccessLogs: (days) => request('GET', `/access-logs/me${qs({ days })}`),
        getMyDeletionRequests: () => request('GET', '/deletion-requests/me'),
        createDeletionRequest: (infoId, reason) => request('POST', '/deletion-requests', { infoId, reason }),

        /* 관리자: 파기 승인 */
        getPendingDeletions: () => request('GET', '/deletion-requests/pending'),
        getDeletionRequests: (status) => request('GET', `/deletion-requests${qs({ status })}`),
        approveDeletion: (id, notes) => request('POST', `/deletion-requests/${id}/approve`, { notes }),
        rejectDeletion: (id, reason) => request('POST', `/deletion-requests/${id}/reject`, { reason }),

        /* 관리자: 대시보드·기록·이상탐지 */
        getAdminStats: (days) => request('GET', `/admin/stats${qs({ days })}`),
        getAccessLogs: (filter) => request('GET', `/admin/access-logs${qs(filter)}`),
        /** CSV 내보내기용 전체 목록 (페이지 없음) — Spring 의 페이지 크기 상한(기본 2000) 회피 */
        exportAccessLogs: (filter) => request('GET', `/admin/access-logs/export${qs(filter)}`),
        getAnomalies: (days) => request('GET', `/admin/anomalies${qs({ days })}`),

        /* 관리자: 직원 */
        getUsers: () => request('GET', '/admin/users'),
        deactivateUser: (id, reason) => request('POST', `/admin/users/${id}/deactivate`, { reason }),
        activateUser: (id, reason) => request('POST', `/admin/users/${id}/activate`, { reason }),

        /* 관리자: 감사 */
        getAudits: (userId) => request('GET', `/admin/audits${qs({ userId })}`),
        createAudit: (payload) => request('POST', '/admin/audits', payload),

        /* 관리자: 고객 관점 */
        getAdminCustomers: (q) => request('GET', `/admin/customers${qs({ q })}`),
    };

    window.api = api;
    window.ApiError = ApiError;
})();
