/**
 * ============================================================================
 *  관리자 포털 (관제 총괄 담당자 / 총책임자)
 * ============================================================================
 *  화면 구성 (해시 라우팅)
 *    #/dashboard                 관제 현황: 오늘 지표, 일별·시간대별 추이, 주의 기록
 *    #/anomalies?days=7          이상 탐지: 직원별 위험 점수, 탐지 규칙, 권한 해제
 *    #/logs?userId=3&...         전체 접근 기록 검색 (+ CSV 내보내기)
 *    #/users                     직원 관리: 권한 해제 / 복구
 *    #/deletions                 파기 요청 승인 / 반려
 *    #/audits                    감사 기록 조회 / 작성
 *    #/customers, #/customer/3   고객 관점: 이 고객 정보를 누가 봤는가
 *
 *  데이터는 전부 window.api 를 통해서만 가져옵니다.
 * ============================================================================
 */
(function () {
    'use strict';

    const { esc, $, $$, fmt, badge, modal, toast, isOffHours, empty, loading, riskLevel, ICON } = window.UI;
    const api = window.api;

    /** 이상탐지 플래그 키 → 한글 이름 (Audits.alert_flags JSON 키와 동일) */
    const FLAG_LABELS = {
        excessive_access: '일일 과다 접근',
        abnormal_time: '업무시간 외 접근',
        rapid_access: '단시간 연속 조회',
        cross_department: '업무 범위 밖 정보',
        bulk_download: '대량 다운로드',
    };

    /* ------------------------------------------------------------------
     * 앱 셸
     * ------------------------------------------------------------------ */
    const app = window.UI.createApp({
        role: 'ADMIN',
        loginPage: 'login.html',
        brand: '관리자 포털',
        defaultRoute: 'dashboard',
        nav: [
            { hash: '#/dashboard', label: '관제 현황', icon: ICON.chart },
            { hash: '#/anomalies', label: '이상 탐지', icon: ICON.alert, badgeKey: 'flagged' },
            { hash: '#/logs', label: '접근 기록', icon: ICON.list },
            { hash: '#/users', label: '직원 관리', icon: ICON.users },
            { hash: '#/deletions', label: '파기 승인', icon: ICON.trash, badgeKey: 'pending' },
            { hash: '#/audits', label: '감사 기록', icon: ICON.file },
            { hash: '#/customers', label: '고객별 조회', icon: ICON.person, match: ['#/customer/'] },
        ],
        routes: {
            'dashboard': renderDashboard,
            'anomalies': renderAnomalies,
            'logs': renderLogs,
            'users': renderUsers,
            'deletions': renderDeletions,
            'audits': renderAudits,
            'customers': renderCustomers,
            'customer/:id': renderCustomerDetail,
        },
    });
    if (!app) return;

    /** 사이드바 숫자 배지 (대기 중 파기 요청, 이상 징후 직원) */
    async function refreshBadges() {
        try {
            const s = await api.getAdminStats(7);
            app.setBadge('pending', s.pendingDeletions);
            app.setBadge('flagged', s.flaggedUsers);
        } catch (e) { /* 무시 */ }
    }
    refreshBadges();

    /** 이상탐지 플래그 객체 → 태그 HTML */
    function flagTags(flags) {
        const keys = Object.keys(flags || {}).filter((k) => flags[k]);
        if (!keys.length) return '<span class="muted">없음</span>';
        return `<span class="flags">${keys.map((k) => `<span class="tag">${esc(FLAG_LABELS[k] || k)} ${flags[k]}</span>`).join('')}</span>`;
    }

    /* ------------------------------------------------------------------
     * 공용 모달: 권한 해제 / 복구, 감사 기록 작성
     * ------------------------------------------------------------------ */
    function toggleAccessModal(user, onDone) {
        const deactivate = user.isActive;
        modal({
            title: deactivate ? `${user.name} 권한 해제` : `${user.name} 권한 복구`,
            body: `
                <dl class="kv">
                    <dt>직원</dt><dd>${esc(user.name)} (${esc(user.username)})</dd>
                    <dt>소속</dt><dd>${esc(user.department)} ${esc(user.position || '')}</dd>
                </dl>
                <p>${deactivate
                    ? '해제하면 이 직원은 즉시 로그인과 고객 정보 조회가 막힙니다. 처리 내역은 감사 기록에 조사·조치로 남습니다.'
                    : '복구하면 다시 고객 정보를 조회할 수 있습니다. 처리 내역은 감사 기록에 남습니다.'}</p>
                <label class="field"><span class="field__label">처리 사유</span>
                    <textarea class="input" name="reason" required placeholder="${deactivate ? '예: 업무시간 외 고민감 정보 연속 열람, 소명 전까지 권한 정지' : '예: 소명 확인 완료, 업무 복귀'}"></textarea>
                </label>`,
            confirmText: deactivate ? '권한 해제' : '권한 복구',
            danger: deactivate,
            onConfirm: async (form) => {
                const reason = form.reason.value.trim();
                if (reason.length < 5) throw new Error('처리 사유를 5자 이상 입력하세요.');
                if (deactivate) await api.deactivateUser(user.userId, reason);
                else await api.activateUser(user.userId, reason);
                toast(deactivate ? `${user.name}의 권한을 해제했습니다.` : `${user.name}의 권한을 복구했습니다.`, 'success');
                refreshBadges();
                if (onDone) onDone();
            },
        });
    }

    async function auditModal(prefill, onDone) {
        const users = (await api.getUsers()).filter((u) => u.role === 'EMPLOYEE');
        const p = prefill || {};
        modal({
            title: '감사 기록 작성',
            body: `
                <label class="field"><span class="field__label">대상 직원</span>
                    <select class="input" name="userId">${users.map((u) =>
                        `<option value="${u.userId}" ${u.userId === p.userId ? 'selected' : ''}>${esc(u.name)} (${esc(u.department)})</option>`).join('')}
                    </select></label>
                <label class="field"><span class="field__label">감사 유형</span>
                    <select class="input" name="auditType">
                        <option value="ROUTINE">정기 점검</option>
                        <option value="ALERT" ${p.auditType === 'ALERT' ? 'selected' : ''}>이상 경보</option>
                        <option value="INVESTIGATION">조사·조치</option>
                    </select></label>
                <div class="grid grid--2" style="gap:10px">
                    <label class="field"><span class="field__label">점검 시작일</span>
                        <input class="input" type="date" name="from" value="${window.UI.dateInputValue(p.days ? p.days - 1 : 6)}"></label>
                    <label class="field"><span class="field__label">점검 종료일</span>
                        <input class="input" type="date" name="to" value="${window.UI.dateInputValue(0)}"></label>
                </div>
                <label class="field"><span class="field__label">감사 의견</span>
                    <textarea class="input" name="notes" placeholder="확인한 내용과 조치를 적어 주세요.">${esc(p.notes || '')}</textarea></label>
                <p class="muted">접근 건수와 이상 탐지 플래그는 서버가 기간 내 기록으로 계산해 함께 저장합니다.</p>`,
            confirmText: '감사 기록 저장',
            onConfirm: async (form) => {
                if (!form.notes.value.trim()) throw new Error('감사 의견을 입력하세요.');
                if (form.from.value > form.to.value) throw new Error('시작일이 종료일보다 늦습니다.');
                await api.createAudit({
                    userId: +form.userId.value,
                    auditType: form.auditType.value,
                    auditPeriodStart: `${form.from.value}T00:00:00`,
                    auditPeriodEnd: `${form.to.value}T23:59:59`,
                    auditNotes: form.notes.value.trim(),
                });
                toast('감사 기록을 저장했습니다.', 'success');
                if (onDone) onDone();
            },
        });
    }

    /** 접근 기록 표 (대시보드·고객 상세·기록 화면 공용) */
    function logTable(list, opts) {
        const o = opts || {};
        return `
            <table class="table">
                <thead><tr>
                    <th>시각</th>${o.hideUser ? '' : '<th>직원</th>'}${o.hideCustomer ? '' : '<th>고객</th>'}
                    <th>정보 유형</th><th>민감도</th><th>처리</th><th>사유</th><th>접속 정보</th>
                </tr></thead>
                <tbody>${list.map((l) => {
                    const night = isOffHours(l.accessedAt);
                    return `<tr class="${night ? 'is-night' : ''}">
                        <td><span class="cell-main">${fmt.dateTime(l.accessedAt)}</span>${night ? ' ' + badge.offHours() : ''}</td>
                        ${o.hideUser ? '' : `<td><a href="#/logs?userId=${l.userId}">${esc(l.userName)}</a><span class="cell-sub">${esc(l.department)}</span></td>`}
                        ${o.hideCustomer ? '' : `<td><a href="#/customer/${l.customerId}">${esc(l.customerName)}</a></td>`}
                        <td>${esc(l.infoType)}</td>
                        <td>${badge.level(l.sensitivityLevel)}</td>
                        <td>${badge.action(l.actionType)}</td>
                        <td class="ellipsis" title="${esc(l.accessReason)}">${esc(l.accessReason || '-')}</td>
                        <td><span class="mono">${esc(l.ipAddress)}</span><span class="cell-sub">${esc(l.deviceInfo || '')}</span></td>
                    </tr>`;
                }).join('')}</tbody>
            </table>`;
    }

    /* ==================================================================
     * 1) 관제 현황 (대시보드)
     * ================================================================== */
    async function renderDashboard(view, params, alive) {
        app.setTitle('관제 현황', `${fmt.date(new Date())} 기준, 최근 14일`);
        const s = await api.getAdminStats(14);
        if (!alive()) return;
        app.setBadge('pending', s.pendingDeletions);
        app.setBadge('flagged', s.flaggedUsers);

        const t = s.today;
        view.innerHTML = `
            ${s.flaggedUsers ? `
            <div class="notice notice--alert" role="note">
                <span><b>이상 징후가 감지된 직원 ${s.flaggedUsers}명</b>이 있습니다. 최근 7일 기록 기준입니다.</span>
                <a class="btn btn--danger btn--sm" href="#/anomalies">이상 탐지 보기</a>
            </div>` : ''}

            <section class="tiles" aria-label="오늘 지표">
                <a class="tile" href="#/logs?from=${window.UI.dateInputValue(0)}">
                    <p class="tile__label">오늘 접근</p><p class="tile__value">${fmt.num(t.total)}<small>건</small></p>
                    <p class="tile__sub">14일 합계 ${fmt.num(s.periodTotal)}건</p></a>
                <a class="tile" href="#/logs?from=${window.UI.dateInputValue(0)}&minLevel=4">
                    <p class="tile__label">고민감 정보 접근</p><p class="tile__value">${fmt.num(t.highSensitivity)}<small>건</small></p>
                    <p class="tile__sub">민감도 4~5 (주민번호, 카드 등)</p></a>
                <a class="tile ${t.offHours ? 'tile--night' : ''}" href="#/logs?offHours=true&from=${window.UI.dateInputValue(0)}">
                    <p class="tile__label">업무시간 외 접근</p><p class="tile__value">${fmt.num(t.offHours)}<small>건</small></p>
                    <p class="tile__sub">오늘, 야간·주말</p></a>
                <a class="tile ${t.downloads ? 'tile--warn' : ''}" href="#/logs?action=DOWNLOAD">
                    <p class="tile__label">원문 다운로드</p><p class="tile__value">${fmt.num(t.downloads)}<small>건</small></p>
                    <p class="tile__sub">오늘</p></a>
                <a class="tile ${s.pendingDeletions ? 'tile--warn' : ''}" href="#/deletions">
                    <p class="tile__label">파기 승인 대기</p><p class="tile__value">${s.pendingDeletions}<small>건</small></p>
                    <p class="tile__sub">처리가 필요한 요청</p></a>
                <a class="tile" href="#/users">
                    <p class="tile__label">활성 직원</p><p class="tile__value">${s.activeUsers}<small>명</small></p>
                    <p class="tile__sub">권한 해제 ${s.inactiveUsers}명</p></a>
            </section>

            <div class="grid grid--2">
                <section class="panel">
                    <div class="panel__head"><div>
                        <h2 class="panel__title">일별 접근 건수</h2>
                        <p class="panel__desc">최근 14일. 막대에 마우스를 올리면 업무시간 외 건수가 보입니다.</p>
                    </div></div>
                    <div class="panel__body"><div class="chart" id="dailyChart"></div></div>
                </section>
                <section class="panel">
                    <div class="panel__head"><div>
                        <h2 class="panel__title">시간대별 접근 건수</h2>
                        <p class="panel__desc">최근 14일 합계. 빗금 구간은 업무시간 외입니다.</p>
                    </div></div>
                    <div class="panel__body"><div class="chart" id="hourlyChart"></div></div>
                </section>
            </div>

            <div class="grid grid--2">
                <section class="panel">
                    <div class="panel__head"><div>
                        <h2 class="panel__title">정보 유형별 접근</h2>
                        <p class="panel__desc">민감도 높은 순. 색이 진할수록 민감한 정보입니다.</p>
                    </div></div>
                    <div class="panel__body" id="typeBars"></div>
                </section>
                <section class="panel">
                    <div class="panel__head"><div>
                        <h2 class="panel__title">직원별 접근 순위</h2>
                        <p class="panel__desc">최근 14일. 이름을 누르면 해당 직원의 기록으로 이동합니다.</p>
                    </div></div>
                    <div class="panel__body" id="userBars"></div>
                </section>
            </div>

            <section class="panel">
                <div class="panel__head"><div>
                    <h2 class="panel__title">확인이 필요한 최근 접근</h2>
                    <p class="panel__desc">민감도 5 정보, 업무시간 외 접근, 다운로드만 모았습니다.</p>
                </div>
                <a class="btn btn--ghost btn--sm" href="#/logs">전체 기록 보기</a></div>
                <div class="panel__body--flush table-wrap">
                    ${s.recentHighRisk.length ? logTable(s.recentHighRisk) : empty('해당 기록이 없습니다')}
                </div>
            </section>`;

        const todayKey = window.UI.dateInputValue(0);
        window.UI.barChart($('#dailyChart', view), {
            ariaLabel: '최근 14일 일별 접근 건수',
            data: s.daily.map((d) => ({
                label: d.date.slice(5).replace('-', '/'),
                value: d.count,
                tip: `<b>${d.date.slice(5).replace('-', '/')}</b> ${d.count}건 (업무시간 외 ${d.offHours}건)`,
            })),
            accent: (i) => s.daily[i].date === todayKey,
            labelEvery: 2,
        });
        const CFG = window.APP_CONFIG;
        window.UI.barChart($('#hourlyChart', view), {
            ariaLabel: '시간대별 접근 건수',
            data: s.hourly.map((v, h) => ({ label: String(h), value: v, tip: `<b>${h}시</b> ${v}건` })),
            shade: (h) => h < CFG.WORK_HOUR_START || h >= CFG.WORK_HOUR_END,
            shadeLabel: `업무시간 외 (${CFG.WORK_HOUR_END}시~${CFG.WORK_HOUR_START}시)`,
            labelEvery: 3,
        });
        window.UI.hBars($('#typeBars', view), s.typeBreakdown.map((x) => ({
            label: x.infoType, sub: `민감도 ${x.sensitivityLevel}`, value: x.count, level: x.sensitivityLevel,
        })), { unit: '' });
        window.UI.hBars($('#userBars', view), s.topUsers.map((u) => ({
            label: u.name, sub: u.department, value: u.count, onclick: `#/logs?userId=${u.userId}`,
        })));
    }

    /* ==================================================================
     * 2) 이상 탐지
     * ================================================================== */
    async function renderAnomalies(view, params, alive) {
        const days = +params.days || 7;
        app.setTitle('이상 탐지', `최근 ${days}일 접근 기록을 탐지 규칙으로 분석한 결과`);
        const acts = app.setActions(`
            <div class="tabs" role="tablist" aria-label="분석 기간">
                ${[1, 7, 14].map((d) => `<button role="tab" data-d="${d}" aria-selected="${d === days}">${d === 1 ? '오늘' : `${d}일`}</button>`).join('')}
            </div>`);
        acts.addEventListener('click', (e) => {
            const b = e.target.closest('[data-d]');
            if (b) location.hash = `#/anomalies?days=${b.dataset.d}`;
        });

        const res = await api.getAnomalies(days);
        if (!alive()) return;
        const flagged = res.users.filter((u) => u.riskScore > 0);
        const calm = res.users.filter((u) => u.riskScore === 0);
        if (days === 7) app.setBadge('flagged', flagged.length);

        view.innerHTML = `
            <section class="panel">
                <div class="panel__head"><div>
                    <h2 class="panel__title">이상 징후 직원 ${flagged.length}명</h2>
                    <p class="panel__desc">위험 점수 = 해당한 규칙의 가중치 합계 (반복될수록 가산, 최대 100). 60 이상 위험, 35 이상 경고.</p>
                </div></div>
                <div class="panel__body--flush suspects">
                    ${flagged.length ? flagged.map(suspectRow).join('') : empty('탐지된 이상 징후가 없습니다', '선택한 기간 동안 모든 직원이 탐지 규칙을 통과했습니다.')}
                </div>
                ${calm.length ? `<div class="calm" aria-label="정상 직원">${calm.map((u) => `<span>${esc(u.name)} 정상</span>`).join('')}</div>` : ''}
            </section>

            <section class="panel">
                <div class="panel__head"><h2 class="panel__title">탐지 규칙</h2></div>
                <div class="panel__body--flush table-wrap">
                    <table class="table">
                        <thead><tr><th>규칙</th><th>기준</th><th class="num">가중치</th><th>플래그 키</th></tr></thead>
                        <tbody>${Object.entries(res.rules).map(([k, r]) => `
                            <tr><td class="cell-main">${esc(r.label)}</td><td>${esc(r.desc)}</td>
                                <td class="num">${r.weight}</td><td class="mono muted">${esc(k)}</td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </section>`;

        function suspectRow(u) {
            const r = riskLevel(u.riskScore);
            return `
                <article class="suspect suspect--${r.key} ${u.isActive ? '' : 'suspect--off'}">
                    <div class="suspect__who">
                        <b>${esc(u.name)}</b>
                        <small>${esc(u.department)} ${esc(u.position || '')}, ${esc(u.username)}</small>
                        ${badge.risk(u.riskScore).replace(/ \d+</, '<')} ${u.isActive ? '' : badge.active(false)}
                        <div class="suspect__score"><strong>${u.riskScore}</strong><span>/ 100점, 접근 ${u.accessCount}건</span></div>
                    </div>
                    <div class="suspect__body">
                        ${window.UI.hourStrip(u.hourly)}
                        <ul class="alerts">${u.alerts.map((a) => `
                            <li>
                                <b>${esc(a.label)} ${a.count}${a.rule === 'excessive_access' || a.rule === 'bulk_download' ? '일' : a.rule === 'rapid_access' ? '회' : '건'}</b>
                                <span class="muted">${esc(a.detail || a.description)}</span>
                                <a href="#/logs?logIds=${a.logIds.join(',')}"><time>${fmt.dateTime(a.lastAt)}</time></a>
                            </li>`).join('')}</ul>
                    </div>
                    <div class="suspect__actions">
                        <a class="btn btn--ghost btn--sm" href="#/logs?userId=${u.userId}">전체 기록 보기</a>
                        <button class="btn btn--ghost btn--sm" data-audit="${u.userId}">감사 기록 작성</button>
                        ${u.isActive
                            // 경고 이상만 빨간 버튼으로 강조, '주의' 단계는 일반 버튼
                            ? `<button class="btn ${u.riskScore >= 35 ? 'btn--danger' : 'btn--ghost'} btn--sm" data-toggle="${u.userId}">권한 해제</button>`
                            : `<button class="btn btn--ghost btn--sm" data-toggle="${u.userId}">권한 복구</button>`}
                    </div>
                </article>`;
        }

        view.addEventListener('click', (e) => {
            const t = e.target.closest('[data-toggle]');
            if (t) {
                const u = res.users.find((x) => x.userId === +t.dataset.toggle);
                toggleAccessModal(u, () => app.rerender());
            }
            const a = e.target.closest('[data-audit]');
            if (a) {
                const u = res.users.find((x) => x.userId === +a.dataset.audit);
                auditModal({
                    userId: u.userId, auditType: 'ALERT', days,
                    notes: `탐지: ${u.alerts.map((x) => `${x.label} ${x.count}`).join(', ')}\n확인 내용: `,
                });
            }
        });
    }

    /* ==================================================================
     * 3) 접근 기록 (검색 + 페이지 + CSV)
     * ================================================================== */
    async function renderLogs(view, params, alive) {
        app.setTitle('접근 기록', '직원의 모든 개인정보 열람·수정·다운로드·파기 기록');
        const users = await api.getUsers();
        if (!alive()) return;

        // 필터 상태 (URL 해시 쿼리와 동기화 → 새로고침해도 유지, 링크 공유 가능)
        const f = {
            userId: params.userId || '', customerId: params.customerId || '', action: params.action || '', minLevel: params.minLevel || '',
            from: params.from || '', to: params.to || '', q: params.q || '',
            offHours: params.offHours || '', logIds: params.logIds || '', page: +params.page || 0, size: 20,
        };

        const exportBtn = app.setActions('<button class="btn btn--ghost" id="exportBtn">CSV 내보내기</button>');

        view.innerHTML = `
            ${f.logIds ? `<div class="notice" role="note"><span>이상 탐지에서 선택한 기록 ${f.logIds.split(',').length}건만 보고 있습니다.</span>
                <a class="btn btn--ghost btn--sm" href="#/logs">전체 기록 보기</a></div>` : ''}
            ${f.customerId ? `<div class="notice" role="note"><span>고객번호 ${esc(f.customerId)}의 기록만 보고 있습니다.</span>
                <a class="btn btn--ghost btn--sm" href="#/logs${f.userId ? '?userId=' + esc(f.userId) : ''}">고객 조건 해제</a></div>` : ''}
            <section class="panel">
                <div class="panel__head">
                    <form class="filters" id="filters">
                        <label class="field"><span class="field__label">직원</span>
                            <select class="input" name="userId"><option value="">전체 직원</option>
                                ${users.map((u) => `<option value="${u.userId}">${esc(u.name)} (${esc(u.department)})</option>`).join('')}
                            </select></label>
                        <label class="field"><span class="field__label">처리 유형</span>
                            <select class="input" name="action"><option value="">전체</option>
                                <option value="VIEW">열람</option><option value="EDIT">수정</option>
                                <option value="DOWNLOAD">다운로드</option><option value="DELETE">파기</option>
                            </select></label>
                        <label class="field"><span class="field__label">민감도</span>
                            <select class="input" name="minLevel"><option value="">전체</option>
                                <option value="3">3 이상</option><option value="4">4 이상</option><option value="5">5만</option>
                            </select></label>
                        <label class="field"><span class="field__label">시작일</span><input class="input" type="date" name="from"></label>
                        <label class="field"><span class="field__label">종료일</span><input class="input" type="date" name="to"></label>
                        <label class="field field--grow"><span class="field__label">검색</span>
                            <input class="input" name="q" placeholder="고객명, 사유, IP"></label>
                        <label class="field"><span class="field__label">시간대</span>
                            <select class="input" name="offHours"><option value="">전체</option><option value="true">업무시간 외만</option></select></label>
                    </form>
                </div>
                <div class="panel__body--flush table-wrap" id="logBox">${loading()}</div>
                <div class="pager" id="pager"></div>
            </section>`;

        const form = $('#filters', view);
        ['userId', 'action', 'minLevel', 'from', 'to', 'q', 'offHours'].forEach((k) => { form[k].value = f[k]; });

        /** 현재 필터를 URL 에 반영 (화면 다시 그리지 않음) */
        function syncUrl() {
            const p = new URLSearchParams();
            Object.entries(f).forEach(([k, v]) => { if (v !== '' && k !== 'size' && !(k === 'page' && !v)) p.set(k, v); });
            history.replaceState(null, '', `#/logs${p.toString() ? '?' + p : ''}`);
        }

        async function load() {
            syncUrl();
            $('#logBox', view).innerHTML = loading();
            const page = await api.getAccessLogs(f);
            if (!alive()) return;
            $('#logBox', view).innerHTML = page.content.length ? logTable(page.content) : empty('조건에 맞는 기록이 없습니다', '필터를 바꿔 보세요.');
            $('#pager', view).innerHTML = `
                <span>총 ${fmt.num(page.totalElements)}건</span>
                <span class="btn-row">
                    <button class="btn btn--ghost btn--sm" data-p="${page.number - 1}" ${page.number <= 0 ? 'disabled' : ''}>이전</button>
                    <span style="align-self:center">${page.number + 1} / ${page.totalPages}</span>
                    <button class="btn btn--ghost btn--sm" data-p="${page.number + 1}" ${page.number + 1 >= page.totalPages ? 'disabled' : ''}>다음</button>
                </span>`;
        }

        const onChange = () => {
            ['userId', 'action', 'minLevel', 'from', 'to', 'q', 'offHours'].forEach((k) => { f[k] = form[k].value.trim(); });
            f.page = 0;
            load();
        };
        form.addEventListener('change', onChange);
        form.q.addEventListener('input', window.UI.debounce(onChange, 300));
        form.addEventListener('submit', (e) => { e.preventDefault(); onChange(); });
        $('#pager', view).addEventListener('click', (e) => {
            const b = e.target.closest('[data-p]');
            if (b && !b.disabled) { f.page = +b.dataset.p; load(); }
        });

        // CSV 내보내기: 현재 필터 그대로 전체 건수를 받아서 저장
        $('#exportBtn', exportBtn).addEventListener('click', async () => {
            // 페이지 API 대신 내보내기 전용 API 사용 (페이지 크기 상한 2000 에 걸리지 않게)
            const { page, size, ...filter } = f;   // eslint-disable-line no-unused-vars
            const rows = await api.exportAccessLogs(filter);
            const all = { content: rows };
            const csv = window.UI.toCSV(
                ['로그ID', '시각', '직원', '아이디', '부서', '고객ID', '고객명', '정보유형', '민감도', '처리', '사유', 'IP', '기기', '업무시간외'],
                all.content.map((l) => [l.logId, l.accessedAt, l.userName, l.username, l.department, l.customerId, l.customerName,
                    l.infoType, l.sensitivityLevel, l.actionType, l.accessReason, l.ipAddress, l.deviceInfo, isOffHours(l.accessedAt) ? 'Y' : 'N']));
            window.UI.downloadText(`access_logs_${window.UI.dateInputValue(0)}.csv`, csv);
            toast(`${all.content.length}건을 내보냈습니다.`, 'success');
        });

        load();
    }

    /* ==================================================================
     * 4) 직원 관리
     * ================================================================== */
    async function renderUsers(view, params, alive) {
        app.setTitle('직원 관리', '개인정보 처리 권한 현황. 권한 해제와 복구는 감사 기록에 자동으로 남습니다.');
        const users = await api.getUsers();
        if (!alive()) return;
        const emp = users.filter((u) => u.role === 'EMPLOYEE').sort((a, b) => b.riskScore - a.riskScore);
        const admins = users.filter((u) => u.role === 'ADMIN');

        view.innerHTML = `
            <section class="panel">
                <div class="panel__head"><div>
                    <h2 class="panel__title">개인정보 처리 직원 ${emp.length}명</h2>
                    <p class="panel__desc">위험도는 최근 7일 이상 탐지 결과입니다.</p>
                </div></div>
                <div class="panel__body--flush table-wrap">
                    <table class="table">
                        <thead><tr><th>이름</th><th>부서 / 직책</th><th>상태</th><th>위험도</th>
                            <th class="num">7일 접근</th><th>최근 접근</th><th>처리</th></tr></thead>
                        <tbody>${emp.map((u) => `
                            <tr>
                                <td><span class="cell-main">${esc(u.name)}</span><span class="cell-sub">${esc(u.username)}, ${esc(u.email)}</span></td>
                                <td>${esc(u.department)}<span class="cell-sub">${esc(u.position)}</span></td>
                                <td>${badge.active(u.isActive)}</td>
                                <td>${badge.risk(u.riskScore)}</td>
                                <td class="num">${fmt.num(u.accessCount7d)}</td>
                                <td>${u.lastAccessAt ? `${fmt.dateTime(u.lastAccessAt)}<span class="cell-sub">${fmt.relative(u.lastAccessAt)}</span>` : '-'}</td>
                                <td><div class="btn-row">
                                    <a class="btn btn--ghost btn--sm" href="#/logs?userId=${u.userId}">기록</a>
                                    ${u.isActive
                                        ? `<button class="btn btn--ghost btn--sm" data-toggle="${u.userId}">권한 해제</button>`
                                        : `<button class="btn btn--primary btn--sm" data-toggle="${u.userId}">권한 복구</button>`}
                                </div></td>
                            </tr>`).join('')}</tbody>
                    </table>
                </div>
            </section>
            <section class="panel">
                <div class="panel__head"><h2 class="panel__title">총괄책임자</h2></div>
                <div class="panel__body--flush table-wrap">
                    <table class="table"><tbody>${admins.map((u) => `
                        <tr><td class="cell-main">${esc(u.name)}</td><td>${esc(u.department)} ${esc(u.position)}</td>
                            <td class="mono muted">${esc(u.username)}</td><td>${badge.active(u.isActive)}</td></tr>`).join('')}</tbody></table>
                </div>
            </section>`;

        view.addEventListener('click', (e) => {
            const t = e.target.closest('[data-toggle]');
            if (!t) return;
            toggleAccessModal(users.find((u) => u.userId === +t.dataset.toggle), () => app.rerender());
        });
    }

    /* ==================================================================
     * 5) 파기 승인
     * ================================================================== */
    async function renderDeletions(view, params, alive) {
        const tab = params.status === 'ALL' ? 'ALL' : 'PENDING';
        app.setTitle('파기 승인', '직원이 보낸 개인정보 파기 요청을 승인하거나 반려합니다.');
        const acts = app.setActions(`
            <div class="tabs" role="tablist">
                <button role="tab" data-s="PENDING" aria-selected="${tab === 'PENDING'}">승인 대기</button>
                <button role="tab" data-s="ALL" aria-selected="${tab === 'ALL'}">전체 내역</button>
            </div>`);
        acts.addEventListener('click', (e) => {
            const b = e.target.closest('[data-s]');
            if (b) location.hash = `#/deletions${b.dataset.s === 'ALL' ? '?status=ALL' : ''}`;
        });

        const list = tab === 'PENDING' ? await api.getPendingDeletions() : await api.getDeletionRequests('ALL');
        if (!alive()) return;
        if (tab === 'PENDING') app.setBadge('pending', list.length);

        view.innerHTML = `
            <section class="panel">
                <div class="panel__body--flush table-wrap">
                    ${list.length ? `
                    <table class="table">
                        <thead><tr><th>요청일</th><th>요청 직원</th><th>고객</th><th>정보 유형</th><th>파기 사유</th><th>상태</th><th>${tab === 'PENDING' ? '처리' : '처리 결과'}</th></tr></thead>
                        <tbody>${list.map((r) => `
                            <tr>
                                <td>${fmt.dateTime(r.requestedAt)}<span class="cell-sub">${fmt.relative(r.requestedAt)}</span></td>
                                <td>${esc(r.requestedByName)}<span class="cell-sub">${esc(r.requestedByDepartment || '')}</span></td>
                                <td><a href="#/customer/${r.customerId}">${esc(r.customerName)}</a></td>
                                <td>${esc(r.infoType)} ${badge.level(r.sensitivityLevel)}</td>
                                <td class="ellipsis" title="${esc(r.deletionReason)}">${esc(r.deletionReason)}</td>
                                <td>${badge.deletion(r.status)}</td>
                                <td>${r.status === 'PENDING' ? `
                                    <div class="btn-row">
                                        <button class="btn btn--primary btn--sm" data-approve="${r.requestId}">승인</button>
                                        <button class="btn btn--ghost btn--sm" data-reject="${r.requestId}">반려</button>
                                    </div>` : `<span class="muted">${esc(r.approvedByName || '')} ${fmt.dateTime(r.approvedAt)}${r.rejectionReason ? `<span class="cell-sub">${esc(r.rejectionReason)}</span>` : ''}</span>`}</td>
                            </tr>`).join('')}</tbody>
                    </table>` : empty(tab === 'PENDING' ? '승인 대기 중인 요청이 없습니다' : '파기 요청 내역이 없습니다')}
                </div>
            </section>`;

        view.addEventListener('click', (e) => {
            const ap = e.target.closest('[data-approve]');
            const rj = e.target.closest('[data-reject]');
            const r = list.find((x) => x.requestId === +((ap || rj) && (ap || rj).dataset[ap ? 'approve' : 'reject']));
            if (!r) return;
            const summary = `
                <dl class="kv">
                    <dt>고객</dt><dd>${esc(r.customerName)}</dd>
                    <dt>정보 유형</dt><dd>${esc(r.infoType)} (민감도 ${r.sensitivityLevel})</dd>
                    <dt>요청 직원</dt><dd>${esc(r.requestedByName)}</dd>
                    <dt>사유</dt><dd>${esc(r.deletionReason)}</dd>
                </dl>`;
            if (ap) {
                modal({
                    title: '파기 승인',
                    body: summary + '<p>승인하면 원문이 즉시 파기되고 되돌릴 수 없습니다. 파기 실행은 접근 기록에 남습니다.</p>',
                    confirmText: '승인하고 파기', danger: true,
                    onConfirm: async () => {
                        await api.approveDeletion(r.requestId, '');
                        toast('파기를 승인했습니다.', 'success');
                        refreshBadges();
                        app.rerender();
                    },
                });
            } else {
                modal({
                    title: '파기 반려',
                    body: summary + `<label class="field"><span class="field__label">반려 사유</span>
                        <textarea class="input" name="reason" placeholder="예: 법정 보관 기간(5년) 미경과"></textarea></label>`,
                    confirmText: '반려',
                    onConfirm: async (form) => {
                        if (!form.reason.value.trim()) throw new Error('반려 사유를 입력하세요.');
                        await api.rejectDeletion(r.requestId, form.reason.value.trim());
                        toast('파기 요청을 반려했습니다.', 'success');
                        refreshBadges();
                        app.rerender();
                    },
                });
            }
        });
    }

    /* ==================================================================
     * 6) 감사 기록
     * ================================================================== */
    async function renderAudits(view, params, alive) {
        app.setTitle('감사 기록', '정기 점검, 이상 경보, 권한 조치 내역');
        const acts = app.setActions('<button class="btn btn--primary" id="newAudit">감사 기록 작성</button>');
        $('#newAudit', acts).addEventListener('click', () => auditModal({}, () => app.rerender()));

        const list = await api.getAudits();
        if (!alive()) return;
        view.innerHTML = `
            <section class="panel">
                <div class="panel__body--flush table-wrap">
                    ${list.length ? `
                    <table class="table">
                        <thead><tr><th>작성일</th><th>대상 직원</th><th>유형</th><th>점검 기간</th><th class="num">접근 건수</th><th>탐지 플래그</th><th>감사 의견</th><th>작성자</th></tr></thead>
                        <tbody>${list.map((a) => `
                            <tr>
                                <td>${fmt.dateTime(a.auditedAt)}</td>
                                <td><a href="#/logs?userId=${a.userId}">${esc(a.userName)}</a><span class="cell-sub">${esc(a.department)}</span></td>
                                <td>${badge.audit(a.auditType)}</td>
                                <td>${fmt.date(a.auditPeriodStart)} ~ ${fmt.date(a.auditPeriodEnd)}</td>
                                <td class="num">${fmt.num(a.accessCount)}</td>
                                <td>${flagTags(a.alertFlags)}</td>
                                <td style="max-width:320px;white-space:pre-line">${esc(a.auditNotes)}</td>
                                <td>${esc(a.auditedByName)}</td>
                            </tr>`).join('')}</tbody>
                    </table>` : empty('감사 기록이 없습니다', '[감사 기록 작성]으로 첫 기록을 남기세요.')}
                </div>
            </section>`;
    }

    /* ==================================================================
     * 7) 고객별 조회 — "이 고객 정보를 누가 봤는가"
     * ================================================================== */
    async function renderCustomers(view, params, alive) {
        app.setTitle('고객별 조회', '고객 기준으로 누가 정보를 확인했는지 봅니다.');
        view.innerHTML = `
            <section class="panel">
                <div class="panel__head">
                    <label class="field field--grow" style="max-width:360px"><span class="field__label">고객 검색</span>
                        <input class="input" id="custQ" placeholder="이름 또는 연락처" value="${esc(params.q || '')}"></label>
                    <p class="panel__desc">최근 7일 접근이 많은 고객부터 표시합니다.</p>
                </div>
                <div class="panel__body--flush table-wrap" id="custBox">${loading()}</div>
            </section>`;

        async function load(q) {
            const list = await api.getAdminCustomers(q);
            if (!alive()) return;
            $('#custBox', view).innerHTML = list.length ? `
                <table class="table">
                    <thead><tr><th>고객</th><th>연락처</th><th>주소</th><th class="num">보유 정보</th>
                        <th class="num">7일 접근</th><th class="num">접근 직원 수</th><th>최근 접근</th></tr></thead>
                    <tbody>${list.map((c) => `
                        <tr class="is-link" data-id="${c.customerId}">
                            <td class="cell-main">${esc(c.name)}<span class="cell-sub">고객번호 ${c.customerId}</span></td>
                            <td class="mono">${esc(c.phone)}</td>
                            <td>${esc(c.address)}</td>
                            <td class="num">${c.infoCount}</td>
                            <td class="num">${fmt.num(c.accessCount7d)}</td>
                            <td class="num">${c.distinctUsers7d}</td>
                            <td>${c.lastAccessAt ? fmt.relative(c.lastAccessAt) : '-'}</td>
                        </tr>`).join('')}</tbody>
                </table>` : empty('검색 결과가 없습니다');
            $$('tr.is-link', view).forEach((tr) => tr.addEventListener('click', () => { location.hash = `#/customer/${tr.dataset.id}`; }));
        }
        $('#custQ', view).addEventListener('input', window.UI.debounce((e) => load(e.target.value.trim()), 250));
        await load(params.q || '');
    }

    async function renderCustomerDetail(view, params, alive) {
        const id = +params.id;
        const [cust, page] = await Promise.all([
            api.getCustomer(id),
            api.getAccessLogs({ customerId: id, size: 500 }),
        ]);
        if (!alive()) return;
        app.setTitle(`${cust.name} 고객 접근 이력`, '');
        $('#crumb').innerHTML = `<a href="#/customers">고객별 조회</a> / 고객번호 ${cust.customerId}`;

        const logs = page.content;
        // 직원별 집계
        const byUser = {};
        logs.forEach((l) => {
            const k = l.userId;
            byUser[k] = byUser[k] || { userId: k, name: l.userName, department: l.department, count: 0, last: l.accessedAt, off: 0 };
            byUser[k].count++;
            if (isOffHours(l.accessedAt)) byUser[k].off++;
        });
        const people = Object.values(byUser).sort((a, b) => b.count - a.count);

        view.innerHTML = `
            <section class="who">
                <span class="who__name">${esc(cust.name)}</span>
                <dl>
                    <div><dt>연락처</dt><dd class="mono">${esc(cust.phone)}</dd></div>
                    <div><dt>주소</dt><dd>${esc(cust.address)}</dd></div>
                    <div><dt>전체 접근</dt><dd>${fmt.num(page.totalElements)}건</dd></div>
                    <div><dt>접근 직원</dt><dd>${people.length}명</dd></div>
                </dl>
            </section>
            <section class="panel">
                <div class="panel__head"><h2 class="panel__title">이 고객 정보를 확인한 직원</h2></div>
                <div class="panel__body--flush table-wrap">
                    ${people.length ? `<table class="table">
                        <thead><tr><th>직원</th><th class="num">접근 건수</th><th class="num">업무시간 외</th><th>최근 접근</th><th></th></tr></thead>
                        <tbody>${people.map((p) => `
                            <tr><td class="cell-main">${esc(p.name)}<span class="cell-sub">${esc(p.department)}</span></td>
                                <td class="num">${p.count}</td>
                                <td class="num">${p.off ? `<span class="tag tag--night">${p.off}</span>` : '0'}</td>
                                <td>${fmt.dateTime(p.last)}</td>
                                <td><a class="btn btn--ghost btn--sm" href="#/logs?userId=${p.userId}&customerId=${id}">기록</a></td></tr>`).join('')}</tbody>
                    </table>` : empty('접근 기록이 없습니다')}
                </div>
            </section>
            <section class="panel">
                <div class="panel__head"><h2 class="panel__title">전체 접근 기록</h2></div>
                <div class="panel__body--flush table-wrap">${logs.length ? logTable(logs, { hideCustomer: true }) : empty('접근 기록이 없습니다')}</div>
            </section>`;
    }
})();
