/**
 * ============================================================================
 *  직원 포털 (보안담당자 / 개인정보 처리 직원)
 * ============================================================================
 *  화면 구성 (해시 라우팅)
 *    #/home              홈: 고객 검색, 내 처리 현황, 최근 조회 고객
 *    #/search?q=홍       고객 검색 결과
 *    #/customer/3        고객 상세: 개인정보 열람·다운로드·파기 요청
 *    #/logs              내 접근 기록
 *    #/requests          내 파기 요청
 *
 *  데이터는 전부 window.api 를 통해서만 가져옵니다.
 *  (목 모드/실제 API 전환은 shared/js/config.js 의 USE_MOCK)
 * ============================================================================
 */
(function () {
    'use strict';

    const { esc, $, $$, fmt, badge, modal, toast, reasonFields, readReason, isOffHours, empty, ICON } = window.UI;
    const api = window.api;
    const CFG = window.APP_CONFIG;
    // 사유 프리셋: 목 모드면 MockDB 에 정의된 것 사용, 실제 모드면 아래 기본값
    const REASONS = (window.MockDB && window.MockDB.REASON_PRESETS) ||
        ['고객 본인 요청 처리', '대출 심사 서류 확인', '카드 발급 본인 확인', '민원 처리'];

    /* ------------------------------------------------------------------
     * 앱 셸 생성
     * ------------------------------------------------------------------ */
    const app = window.UI.createApp({
        role: 'EMPLOYEE',
        loginPage: 'login.html',
        brand: '직원 포털',
        defaultRoute: 'home',
        nav: [
            { hash: '#/home', label: '홈', icon: ICON.home },
            { hash: '#/search', label: '고객 조회', icon: ICON.search, match: ['#/customer/'] },
            { hash: '#/logs', label: '내 접근 기록', icon: ICON.list },
            { hash: '#/requests', label: '내 파기 요청', icon: ICON.trash, badgeKey: 'pending' },
        ],
        routes: {
            'home': renderHome,
            'search': renderSearch,
            'customer/:id': renderCustomer,
            'logs': renderLogs,
            'requests': renderRequests,
        },
    });
    if (!app) return;   // 로그인 안 됨 → 로그인 페이지로 이동 중

    /** 사이드바 '내 파기 요청' 옆 대기 건수 갱신 */
    async function refreshBadge() {
        try {
            const list = await api.getMyDeletionRequests();
            app.setBadge('pending', list.filter((r) => r.status === 'PENDING').length);
        } catch (e) { /* 배지는 실패해도 무시 */ }
    }
    refreshBadge();

    /* ------------------------------------------------------------------
     * 공통: 고객 검색 입력 (홈·검색 화면 공용)
     * ------------------------------------------------------------------ */
    function finderHTML(q, big) {
        return `
            <form class="finder" id="finder" role="search">
                <label class="finder__label" for="finderInput">${big ? '어떤 고객을 찾으세요?' : '고객 검색'}</label>
                <div class="finder__row">
                    <input id="finderInput" class="input" name="q" value="${esc(q || '')}"
                           placeholder="이름 또는 연락처 뒷자리 4자리" autocomplete="off">
                    <button class="btn btn--primary" type="submit">검색</button>
                </div>
                <p class="finder__hint">검색 결과에는 연락처 일부만 표시됩니다. 개인정보 원문은 상세 화면에서 사유를 입력해야 볼 수 있습니다.</p>
            </form>`;
    }
    function bindFinder(view) {
        $('#finder', view).addEventListener('submit', (e) => {
            e.preventDefault();
            const q = e.target.q.value.trim();
            location.hash = `#/search?q=${encodeURIComponent(q)}`;
        });
    }

    /* ==================================================================
     * 1) 홈
     * ================================================================== */
    async function renderHome(view, params, alive) {
        const me = app.session;
        app.setTitle(`${me.name}님, 안녕하세요`, `${me.department || ''} ${me.position || ''}`);

        const [logs, requests] = await Promise.all([api.getMyAccessLogs(7), api.getMyDeletionRequests()]);
        if (!alive()) return;

        const todayKey = new Date().toDateString();
        const today = logs.filter((l) => new Date(l.accessedAt).toDateString() === todayKey);
        const downloads = logs.filter((l) => l.actionType === 'DOWNLOAD');
        const pending = requests.filter((r) => r.status === 'PENDING');
        const offHours = logs.filter((l) => isOffHours(l.accessedAt));

        // 최근 조회 고객 (중복 제거, 최신순 6명)
        const seen = new Map();
        logs.forEach((l) => { if (!seen.has(l.customerId)) seen.set(l.customerId, l); });
        const recent = [...seen.values()].slice(0, 6);

        view.innerHTML = `
            ${finderHTML('', true)}

            <section class="tiles" aria-label="내 처리 현황">
                <a class="tile" href="#/logs"><p class="tile__label">오늘 열람</p>
                    <p class="tile__value">${today.filter((l) => l.actionType === 'VIEW').length}<small>건</small></p>
                    <p class="tile__sub">수정·다운로드 포함 ${today.length}건</p></a>
                <a class="tile" href="#/logs"><p class="tile__label">최근 7일 접근</p>
                    <p class="tile__value">${logs.length}<small>건</small></p>
                    <p class="tile__sub">고객 ${seen.size}명</p></a>
                <a class="tile ${downloads.length ? 'tile--warn' : ''}" href="#/logs?action=DOWNLOAD"><p class="tile__label">최근 7일 다운로드</p>
                    <p class="tile__value">${downloads.length}<small>건</small></p>
                    <p class="tile__sub">하루 5건 이상이면 이상 징후로 분류</p></a>
                <a class="tile" href="#/requests"><p class="tile__label">승인 대기 파기 요청</p>
                    <p class="tile__value">${pending.length}<small>건</small></p>
                    <p class="tile__sub">전체 ${requests.length}건</p></a>
            </section>

            ${offHours.length ? `
            <div class="notice notice--alert" role="note">
                <span><b>업무시간 외 접근 ${offHours.length}건</b>이 최근 7일 기록에 있습니다. 총괄책임자가 소명을 요청할 수 있습니다.</span>
                <a class="btn btn--ghost btn--sm" href="#/logs">기록 보기</a>
            </div>` : ''}

            <div class="grid grid--3-1">
                <section class="panel">
                    <div class="panel__head"><div>
                        <h2 class="panel__title">최근 조회한 고객</h2>
                        <p class="panel__desc">최근 7일 동안 내가 정보를 확인한 고객입니다.</p>
                    </div></div>
                    <div class="panel__body--flush">
                        ${recent.length ? `<ul class="recent">${recent.map((l) => `
                            <li><a href="#/customer/${l.customerId}">
                                <b>${esc(l.customerName)}</b>
                                <time datetime="${esc(l.accessedAt)}">${fmt.relative(l.accessedAt)}</time>
                                <span>${esc(l.infoType)} ${l.actionType === 'DOWNLOAD' ? '다운로드' : l.actionType === 'EDIT' ? '수정' : '열람'}</span>
                            </a></li>`).join('')}</ul>`
                        : empty('아직 조회한 고객이 없습니다', '위 검색창에서 고객을 찾아보세요.')}
                    </div>
                </section>

                <section class="panel">
                    <div class="panel__head"><h2 class="panel__title">처리 원칙</h2></div>
                    <div class="panel__body">
                        <ul class="rules">
                            <li>원문 열람·다운로드는 사유 입력 후에만 가능합니다.</li>
                            <li>열람한 원문은 ${CFG.REVEAL_SECONDS}초 뒤 다시 가려집니다.</li>
                            <li>업무 범위 밖 정보, 업무시간 외 접근은 자동으로 표시됩니다.</li>
                            <li>보관 기간이 끝난 정보는 파기 요청 후 총괄책임자 승인으로 파기합니다.</li>
                        </ul>
                    </div>
                </section>
            </div>`;
        bindFinder(view);
    }

    /* ==================================================================
     * 2) 고객 검색
     * ================================================================== */
    async function renderSearch(view, params, alive) {
        const q = (params.q || '').trim();
        app.setTitle('고객 조회', q ? `검색어 "${q}"` : '');
        view.innerHTML = finderHTML(q) + `<section class="panel" id="result"></section>`;
        bindFinder(view);
        const box = $('#result', view);

        if (!q) {
            box.innerHTML = empty('검색어를 입력하세요', '전체 고객 목록은 제공하지 않습니다. 이름이나 연락처 뒷자리로 찾아 주세요.');
            $('#finderInput', view).focus();
            return;
        }
        box.innerHTML = window.UI.loading('검색 중');
        const list = await api.searchCustomers(q);
        if (!alive()) return;

        if (!list.length) {
            box.innerHTML = empty(`"${q}"에 해당하는 고객이 없습니다`, '이름 일부나 연락처 뒷자리 4자리로 다시 검색해 보세요.');
            return;
        }
        box.innerHTML = `
            <div class="panel__head"><h2 class="panel__title">검색 결과 ${list.length}명</h2></div>
            <div class="panel__body--flush table-wrap">
                <table class="table">
                    <thead><tr><th>고객번호</th><th>이름</th><th>연락처</th><th>주소</th><th>등록일</th><th></th></tr></thead>
                    <tbody>${list.map((c) => `
                        <tr class="is-link" data-id="${c.customerId}">
                            <td class="num muted">${c.customerId}</td>
                            <td class="cell-main">${esc(c.name)}</td>
                            <td class="mono">${esc(c.phone)}</td>
                            <td>${esc(c.address)}</td>
                            <td>${fmt.date(c.registeredAt)}</td>
                            <td><a class="btn btn--ghost btn--sm" href="#/customer/${c.customerId}">상세</a></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
        $$('tr.is-link', box).forEach((tr) => tr.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            location.hash = `#/customer/${tr.dataset.id}`;
        }));
    }

    /* ==================================================================
     * 3) 고객 상세 — 열람 / 다운로드 / 파기 요청
     * ================================================================== */
    // 열람한 원문 임시 보관 { infoId: { value, until } } — 화면 이동 시 초기화
    let revealed = {};
    let revealTimer = null;

    async function renderCustomer(view, params, alive) {
        revealed = {};
        clearInterval(revealTimer);
        const id = +params.id;

        const [cust, infos, myLogs] = await Promise.all([
            api.getCustomer(id), api.getCustomerInfo(id), api.getMyAccessLogs(30),
        ]);
        if (!alive()) return;

        app.setTitle(`${cust.name} 고객`, '');
        $('#crumb').innerHTML = `<a href="#/search">고객 조회</a> / 고객번호 ${cust.customerId}`;
        const mine = myLogs.filter((l) => l.customerId === id).slice(0, 8);

        view.innerHTML = `
            <section class="who">
                <span class="who__name">${esc(cust.name)}</span>
                <dl>
                    <div><dt>고객번호</dt><dd>${cust.customerId}</dd></div>
                    <div><dt>연락처</dt><dd class="mono">${esc(cust.phone)}</dd></div>
                    <div><dt>주소</dt><dd>${esc(cust.address)}</dd></div>
                    <div><dt>등록일</dt><dd>${fmt.date(cust.registeredAt)}</dd></div>
                </dl>
            </section>

            <section class="panel">
                <div class="panel__head"><div>
                    <h2 class="panel__title">보유 개인정보 ${infos.filter((i) => !i.deleted).length}건</h2>
                    <p class="panel__desc">값은 가려진 상태로 표시됩니다. 원문이 필요하면 사유를 입력하고 열람하세요.</p>
                </div></div>
                <div class="panel__body--flush table-wrap">
                    <table class="table">
                        <thead><tr><th>정보 유형</th><th>민감도</th><th>값</th><th>등록일</th><th>처리</th></tr></thead>
                        <tbody id="infoRows"></tbody>
                    </table>
                </div>
            </section>

            <section class="panel">
                <div class="panel__head"><div>
                    <h2 class="panel__title">이 고객에 대한 내 기록</h2>
                    <p class="panel__desc">최근 30일, 최신 8건</p>
                </div></div>
                <div class="panel__body--flush table-wrap" id="myRows"></div>
            </section>`;

        const rowsEl = $('#infoRows', view);
        const myEl = $('#myRows', view);

        function drawRows() {
            rowsEl.innerHTML = infos.map((i) => {
                const r = revealed[i.infoId];
                const left = r ? Math.max(0, Math.ceil((r.until - Date.now()) / 1000)) : 0;
                let value;
                if (i.deleted) value = '<span class="val val--deleted">파기된 정보</span>';
                else if (r && left > 0) value = `<span class="val val--revealed"><span class="mono">${esc(r.value)}</span><span class="val__timer">${left}초</span></span>`;
                else value = `<span class="val"><span class="mono">${esc(i.infoValue)}</span></span>`;

                const actions = i.deleted ? '<span class="muted">-</span>' : `
                    <div class="btn-row">
                        <button class="btn btn--ghost btn--sm" data-act="view" data-id="${i.infoId}">${r && left > 0 ? '다시 가리기' : '열람'}</button>
                        <button class="btn btn--ghost btn--sm" data-act="download" data-id="${i.infoId}">다운로드</button>
                        ${i.deletionPending
                            ? '<span class="status status--warning">파기 승인 대기</span>'
                            : `<button class="btn btn--ghost btn--sm" data-act="delete" data-id="${i.infoId}">파기 요청</button>`}
                    </div>`;
                return `<tr>
                    <td class="cell-main">${esc(i.infoType)}</td>
                    <td>${badge.level(i.sensitivityLevel)}</td>
                    <td>${value}</td>
                    <td>${fmt.date(i.registeredAt)}</td>
                    <td>${actions}</td>
                </tr>`;
            }).join('');
        }

        function drawMine() {
            myEl.innerHTML = mine.length ? `
                <table class="table">
                    <thead><tr><th>시각</th><th>정보 유형</th><th>처리</th><th>사유</th></tr></thead>
                    <tbody>${mine.map((l) => `
                        <tr class="${isOffHours(l.accessedAt) ? 'is-night' : ''}">
                            <td>${fmt.dateTime(l.accessedAt)} ${isOffHours(l.accessedAt) ? badge.offHours() : ''}</td>
                            <td>${esc(l.infoType)}</td>
                            <td>${badge.action(l.actionType)}</td>
                            <td class="ellipsis" title="${esc(l.accessReason)}">${esc(l.accessReason)}</td>
                        </tr>`).join('')}</tbody>
                </table>` : empty('이 고객 정보를 처리한 기록이 없습니다');
        }

        drawRows();
        drawMine();

        // 1초마다 남은 시간 갱신 → 0초가 되면 다시 마스킹
        revealTimer = setInterval(() => {
            if (!document.body.contains(rowsEl)) { clearInterval(revealTimer); return; }
            if (Object.keys(revealed).length) {
                Object.keys(revealed).forEach((k) => { if (revealed[k].until <= Date.now()) delete revealed[k]; });
                drawRows();
            }
        }, 1000);

        /** 서버 응답으로 받은 새 기록을 '내 기록' 표 맨 위에 추가 */
        function prependMine(info, action, reason) {
            mine.unshift({
                accessedAt: window.MockDB ? window.MockDB.toLocalISO(new Date()) : new Date().toISOString(),
                infoType: info.infoType, actionType: action, accessReason: reason,
            });
            if (mine.length > 8) mine.pop();
            drawMine();
        }

        rowsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-act]');
            if (!btn) return;
            const info = infos.find((x) => x.infoId === +btn.dataset.id);
            const act = btn.dataset.act;

            // 이미 열린 원문을 다시 가리기
            if (act === 'view' && revealed[info.infoId]) {
                delete revealed[info.infoId];
                drawRows();
                return;
            }

            const summary = `
                <dl class="kv">
                    <dt>고객</dt><dd>${esc(cust.name)} (고객번호 ${cust.customerId})</dd>
                    <dt>정보 유형</dt><dd>${esc(info.infoType)} ${badge.level(info.sensitivityLevel)}</dd>
                </dl>`;

            if (act === 'view') {
                modal({
                    title: '원문 열람',
                    body: summary + reasonFields(REASONS) +
                        `<p class="muted">열람 기록은 총괄책임자에게 공개됩니다. 원문은 ${CFG.REVEAL_SECONDS}초 동안 표시됩니다.</p>`,
                    confirmText: '사유 기록하고 열람',
                    onConfirm: async (form) => {
                        const reason = readReason(form);
                        const res = await api.viewPersonalInfo(info.infoId, reason);
                        revealed[info.infoId] = { value: res.infoValue, until: Date.now() + (res.revealSeconds || CFG.REVEAL_SECONDS) * 1000 };
                        drawRows();
                        prependMine(info, 'VIEW', reason);
                        toast('열람 기록이 저장되었습니다.', 'success');
                    },
                });
            }

            if (act === 'download') {
                modal({
                    title: '원문 다운로드',
                    body: summary + reasonFields(REASONS) +
                        '<p class="muted">다운로드는 열람보다 위험도가 높게 집계됩니다. 하루 5건 이상이면 이상 징후로 분류됩니다.</p>',
                    confirmText: '사유 기록하고 다운로드',
                    onConfirm: async (form) => {
                        const reason = readReason(form);
                        const res = await api.downloadPersonalInfo(info.infoId, reason);
                        window.UI.downloadText(res.fileName, res.content, res.mimeType);
                        prependMine(info, 'DOWNLOAD', reason);
                        toast('다운로드 기록이 저장되었습니다.', 'success');
                    },
                });
            }

            if (act === 'delete') {
                modal({
                    title: '파기 요청',
                    body: summary + reasonFields(
                        ['보관 기간 만료', '고객 파기 요청', '거래 종료로 보관 사유 소멸', '중복 등록 정보 정리'],
                        '예: 2021년 해지, 법정 보관 5년 경과') +
                        '<p class="muted">총괄책임자가 승인하면 원문이 파기되며 되돌릴 수 없습니다.</p>',
                    confirmText: '파기 요청 보내기',
                    onConfirm: async (form) => {
                        const reason = readReason(form);
                        await api.createDeletionRequest(info.infoId, reason);
                        info.deletionPending = true;
                        drawRows();
                        refreshBadge();
                        toast('파기 요청을 보냈습니다. 승인되면 내 파기 요청에서 확인할 수 있습니다.', 'success');
                    },
                });
            }
        });
    }

    /* ==================================================================
     * 4) 내 접근 기록
     * ================================================================== */
    async function renderLogs(view, params, alive) {
        app.setTitle('내 접근 기록', '내가 열람·수정·다운로드한 모든 기록');
        const state = { days: +params.days || 7, action: params.action || '' };

        view.innerHTML = `
            <section class="panel">
                <div class="panel__head">
                    <div class="filters">
                        <label class="field"><span class="field__label">기간</span>
                            <select class="input" id="fDays">
                                <option value="1">오늘</option><option value="7">최근 7일</option>
                                <option value="14">최근 14일</option><option value="30">최근 30일</option>
                            </select></label>
                        <label class="field"><span class="field__label">처리 유형</span>
                            <select class="input" id="fAction">
                                <option value="">전체</option><option value="VIEW">열람</option>
                                <option value="EDIT">수정</option><option value="DOWNLOAD">다운로드</option>
                            </select></label>
                    </div>
                    <p class="panel__desc" id="logCount"></p>
                </div>
                <div class="panel__body--flush table-wrap" id="logTable">${window.UI.loading()}</div>
            </section>`;
        $('#fDays', view).value = String(state.days);
        $('#fAction', view).value = state.action;

        const all = await api.getMyAccessLogs(30);
        if (!alive()) return;

        function draw() {
            const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (state.days - 1));
            const list = all.filter((l) => new Date(l.accessedAt) >= since && (!state.action || l.actionType === state.action));
            $('#logCount', view).textContent = `${list.length}건`;
            $('#logTable', view).innerHTML = list.length ? `
                <table class="table">
                    <thead><tr><th>시각</th><th>고객</th><th>정보 유형</th><th>민감도</th><th>처리</th><th>사유</th><th>접속 IP</th></tr></thead>
                    <tbody>${list.map((l) => `
                        <tr class="${isOffHours(l.accessedAt) ? 'is-night' : ''}">
                            <td>${fmt.dateTime(l.accessedAt)} ${isOffHours(l.accessedAt) ? badge.offHours() : ''}</td>
                            <td><a href="#/customer/${l.customerId}">${esc(l.customerName)}</a></td>
                            <td>${esc(l.infoType)}</td>
                            <td>${badge.level(l.sensitivityLevel)}</td>
                            <td>${badge.action(l.actionType)}</td>
                            <td class="ellipsis" title="${esc(l.accessReason)}">${esc(l.accessReason)}</td>
                            <td class="mono muted">${esc(l.ipAddress)}</td>
                        </tr>`).join('')}</tbody>
                </table>` : empty('해당 기간에 기록이 없습니다');
        }
        draw();
        $('#fDays', view).addEventListener('change', (e) => { state.days = +e.target.value; draw(); });
        $('#fAction', view).addEventListener('change', (e) => { state.action = e.target.value; draw(); });
    }

    /* ==================================================================
     * 5) 내 파기 요청
     * ================================================================== */
    async function renderRequests(view, params, alive) {
        app.setTitle('내 파기 요청', '고객 상세 화면에서 보낸 파기 요청의 처리 상태');
        const list = await api.getMyDeletionRequests();
        if (!alive()) return;
        refreshBadge();

        view.innerHTML = `
            <section class="panel">
                <div class="panel__body--flush table-wrap">
                    ${list.length ? `
                    <table class="table">
                        <thead><tr><th>요청일</th><th>고객</th><th>정보 유형</th><th>사유</th><th>상태</th><th>처리</th></tr></thead>
                        <tbody>${list.map((r) => `
                            <tr>
                                <td>${fmt.dateTime(r.requestedAt)}</td>
                                <td><a href="#/customer/${r.customerId}">${esc(r.customerName)}</a></td>
                                <td>${esc(r.infoType)} ${badge.level(r.sensitivityLevel)}</td>
                                <td class="ellipsis" title="${esc(r.deletionReason)}">${esc(r.deletionReason)}</td>
                                <td>${badge.deletion(r.status)}</td>
                                <td class="muted">${r.status === 'PENDING' ? '총괄책임자 검토 중'
                                    : r.status === 'REJECTED' ? `반려 사유: ${esc(r.rejectionReason || '-')}`
                                    : `${esc(r.approvedByName || '')} ${fmt.dateTime(r.approvedAt)}`}</td>
                            </tr>`).join('')}</tbody>
                    </table>` : empty('보낸 파기 요청이 없습니다', '고객 상세 화면의 [파기 요청] 버튼으로 요청할 수 있습니다.')}
                </div>
            </section>`;
    }
})();
