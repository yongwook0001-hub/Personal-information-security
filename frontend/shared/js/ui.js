/**
 * ============================================================================
 *  공용 UI 헬퍼 — 포맷, 배지, 모달, 토스트, 차트, 앱 셸(사이드바 + 해시 라우터)
 * ============================================================================
 *  직원 포털(employee/js/app.js)과 관리자 포털(admin/js/admin-app.js)이 함께 사용합니다.
 *  프레임워크 없이 순수 JS 로 작성했고, 전역 객체 UI 하나로 노출합니다.
 * ============================================================================
 */
(function () {
    'use strict';

    const CFG = window.APP_CONFIG;

    /* ------------------------------------------------------------------
     * 1. 기본 유틸
     * ------------------------------------------------------------------ */

    /** HTML 이스케이프 — 서버 데이터를 innerHTML 에 넣을 때 반드시 사용 (XSS 방지) */
    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const pad = (n) => String(n).padStart(2, '0');

    const fmt = {
        /** "2026-11-17T14:03:00" → "11.17 14:03" */
        dateTime(iso) {
            if (!iso) return '-';
            const d = new Date(iso);
            return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
        /** → "2026.11.17" */
        date(iso) {
            if (!iso) return '-';
            const d = new Date(iso);
            return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
        },
        /** → "14:03:22" */
        time(iso) {
            if (!iso) return '-';
            const d = new Date(iso);
            return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        },
        /** → "3분 전", "어제" 등 */
        relative(iso) {
            if (!iso) return '-';
            const diff = (Date.now() - new Date(iso).getTime()) / 1000;
            if (diff < 60) return '방금';
            if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
            if (diff < 86400 * 2) return '어제';
            return `${Math.floor(diff / 86400)}일 전`;
        },
        num: (n) => (n == null ? '-' : Number(n).toLocaleString('ko-KR')),
    };

    /** 업무시간 외(야간·주말) 여부 — config.js 의 WORK_HOUR_* 기준 */
    function isOffHours(iso) {
        const d = new Date(iso);
        const h = d.getHours();
        return d.getDay() === 0 || d.getDay() === 6 || h < CFG.WORK_HOUR_START || h >= CFG.WORK_HOUR_END;
    }

    /** "yyyy-mm-dd" (input[type=date] 값) */
    function dateInputValue(offsetDays) {
        const d = new Date();
        d.setDate(d.getDate() - (offsetDays || 0));
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    /** 텍스트 파일 내려받기 (CSV 등) */
    function downloadText(fileName, content, mime) {
        const blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    /** 배열 → CSV 문자열 (엑셀 한글 깨짐 방지 BOM 포함) */
    function toCSV(headers, rows) {
        const cell = (v) => {
            const raw = String(v == null ? '' : v);
            // CSV 수식 삽입(CSV Injection) 방지:
            //  = + - @ 탭 CR 로 시작하는 값은 엑셀이 수식으로 실행하므로 앞에 ' 를 붙여 글자로 취급
            //  (따옴표로 감싸는 것만으로는 막히지 않음)
            const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\n');
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    /* ------------------------------------------------------------------
     * 2. 배지 (상태 표시)
     *    — 색만으로 의미를 전달하지 않도록 항상 글자를 함께 표시
     * ------------------------------------------------------------------ */
    const ACTION = {
        VIEW:     { label: '열람',     cls: 'tag--view' },
        EDIT:     { label: '수정',     cls: 'tag--edit' },
        DOWNLOAD: { label: '다운로드', cls: 'tag--download' },
        DELETE:   { label: '파기',     cls: 'tag--delete' },
    };
    const DELETION_STATUS = {
        PENDING:  { label: '승인 대기', cls: 'status--warning' },
        APPROVED: { label: '승인',      cls: 'status--good' },
        DELETED:  { label: '파기 완료', cls: 'status--neutral' },
        REJECTED: { label: '반려',      cls: 'status--serious' },
    };
    const AUDIT_TYPE = {
        ROUTINE:       { label: '정기 점검', cls: 'status--neutral' },
        ALERT:         { label: '이상 경보', cls: 'status--serious' },
        INVESTIGATION: { label: '조사·조치', cls: 'status--critical' },
    };

    const badge = {
        action(a) {
            const x = ACTION[a] || { label: a, cls: '' };
            return `<span class="tag ${x.cls}">${esc(x.label)}</span>`;
        },
        /** 민감도 1~5 → 5칸 막대 + 숫자 */
        level(n) {
            const cells = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('');
            return `<span class="lvl lvl--${n}" title="민감도 ${n} / 5"><span class="lvl__bar">${cells}</span>${n}</span>`;
        },
        deletion(s) {
            const x = DELETION_STATUS[s] || { label: s, cls: '' };
            return `<span class="status ${x.cls}">${esc(x.label)}</span>`;
        },
        audit(t) {
            const x = AUDIT_TYPE[t] || { label: t, cls: '' };
            return `<span class="status ${x.cls}">${esc(x.label)}</span>`;
        },
        active(isActive) {
            return isActive
                ? '<span class="status status--good">활성</span>'
                : '<span class="status status--critical">권한 해제</span>';
        },
        /** 위험 점수 → 정상/주의/경고/위험 */
        risk(score) {
            const r = riskLevel(score);
            return `<span class="status ${r.cls}">${r.label}${score ? ` ${score}` : ''}</span>`;
        },
        offHours: () => '<span class="tag tag--night" title="업무시간 외 접근">업무시간 외</span>',
    };

    function riskLevel(score) {
        if (score >= 60) return { label: '위험', cls: 'status--critical', key: 'critical' };
        if (score >= 35) return { label: '경고', cls: 'status--serious', key: 'serious' };
        if (score > 0)   return { label: '주의', cls: 'status--warning', key: 'warning' };
        return { label: '정상', cls: 'status--good', key: 'good' };
    }

    /* ------------------------------------------------------------------
     * 3. 토스트 / 모달
     * ------------------------------------------------------------------ */
    function toast(message, type) {
        let root = $('#toastRoot');
        if (!root) { root = document.createElement('div'); root.id = 'toastRoot'; document.body.appendChild(root); }
        const el = document.createElement('div');
        el.className = `toast toast--${type || 'info'}`;
        el.setAttribute('role', 'status');
        el.textContent = message;
        root.appendChild(el);
        setTimeout(() => el.classList.add('out'), 3200);
        setTimeout(() => el.remove(), 3600);
    }

    /**
     * 모달 대화상자
     * @param {object} o
     *   title, body(HTML 문자열), confirmText, cancelText, danger(bool),
     *   onConfirm(form) → Promise. throw 하면 모달 안에 오류 표시, 성공하면 닫힘
     */
    function modal(o) {
        const wrap = document.createElement('div');
        wrap.className = 'modal';
        wrap.innerHTML = `
            <div class="modal__backdrop" data-close></div>
            <form class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle" novalidate>
                <h2 id="modalTitle" class="modal__title">${esc(o.title)}</h2>
                <div class="modal__body">${o.body || ''}</div>
                <p class="modal__error" role="alert" hidden></p>
                <div class="modal__actions">
                    <button type="button" class="btn btn--ghost" data-close>${esc(o.cancelText || '취소')}</button>
                    ${o.onConfirm ? `<button type="submit" class="btn ${o.danger ? 'btn--danger' : 'btn--primary'}">${esc(o.confirmText || '확인')}</button>` : ''}
                </div>
            </form>`;
        document.body.appendChild(wrap);
        const form = $('form', wrap);
        const errEl = $('.modal__error', wrap);
        const prevFocus = document.activeElement;

        const close = () => {
            wrap.remove();
            document.removeEventListener('keydown', onKey);
            if (prevFocus && prevFocus.focus) prevFocus.focus();
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        $$('[data-close]', wrap).forEach((b) => b.addEventListener('click', close));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!o.onConfirm) return close();
            const btn = $('button[type=submit]', form);
            btn.disabled = true;
            errEl.hidden = true;
            try {
                await o.onConfirm(form);
                close();
            } catch (err) {
                errEl.textContent = err.message;
                errEl.hidden = false;
                btn.disabled = false;
            }
        });

        // 첫 입력칸에 포커스
        setTimeout(() => {
            const first = $('input:not([type=hidden]), select, textarea', form) || $('button[type=submit]', form);
            if (first) first.focus();
        }, 30);
        if (o.onOpen) o.onOpen(form);
        return { close, form };
    }

    /**
     * 접근 사유 입력 필드 묶음 (프리셋 선택 + 직접 입력)
     *  - 직원 열람/다운로드, 파기 요청 모달에서 공용
     *  - 사용: modal body 에 UI.reasonFields() 를 넣고, onConfirm 에서 UI.readReason(form)
     */
    function reasonFields(presets, placeholder) {
        const opts = (presets || []).map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
        return `
            <label class="field">
                <span class="field__label">사유</span>
                <select name="preset" class="input">
                    ${opts}
                    <option value="__custom">직접 입력</option>
                </select>
            </label>
            <label class="field">
                <span class="field__label">상세 내용 <small>(선택한 사유 뒤에 붙어 기록됩니다)</small></span>
                <input name="detail" class="input" maxlength="120" placeholder="${esc(placeholder || '예: 민원번호 2026-1117-03')}">
            </label>`;
    }
    function readReason(form) {
        const preset = form.preset.value;
        const detail = form.detail.value.trim();
        const reason = preset === '__custom' ? detail : (detail ? `${preset} (${detail})` : preset);
        if (reason.length < 5) throw new Error('사유를 5자 이상 입력하세요.');
        return reason;
    }

    /* ------------------------------------------------------------------
     * 4. 차트 (SVG 직접 그림 — 외부 라이브러리 없음)
     * ------------------------------------------------------------------ */
    let tipEl = null;
    function tip(show, html, x, y) {
        if (!tipEl) {
            tipEl = document.createElement('div');
            tipEl.className = 'chart-tip';
            document.body.appendChild(tipEl);
        }
        if (!show) { tipEl.style.opacity = 0; return; }
        tipEl.innerHTML = html;
        tipEl.style.opacity = 1;
        const w = tipEl.offsetWidth;
        tipEl.style.left = Math.min(window.innerWidth - w - 8, x + 12) + 'px';
        tipEl.style.top = (y - 12 - tipEl.offsetHeight) + 'px';
    }

    /**
     * 세로 막대 차트
     * @param {HTMLElement} el
     * @param {object} o
     *   data: [{label, value, tip}]
     *   height: 기본 180
     *   shade: (i) => true 이면 해당 칸 배경을 음영 처리 (예: 업무시간 외 구간)
     *   shadeLabel: 음영 의미 (범례 대신 차트 아래 한 줄)
     *   labelEvery: x축 라벨 간격
     *   accent: (i) => true 이면 막대를 강조색으로
     */
    function barChart(el, o) {
        const data = o.data || [];
        const W = Math.max(280, el.clientWidth || 600);
        const H = o.height || 180;
        const m = { t: 12, r: 8, b: 26, l: 34 };
        const iw = W - m.l - m.r;
        const ih = H - m.t - m.b;
        const max = Math.max(1, ...data.map((d) => d.value));
        // 보기 좋은 눈금 최대값 (1, 2, 5 단위)
        const step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => max / s <= 4) || 1000;
        const top = Math.ceil(max / step) * step;
        const slot = iw / data.length;
        const bw = Math.max(3, Math.min(28, slot - 4));    // 막대 사이 간격 최소 4px
        const y = (v) => m.t + ih - (v / top) * ih;

        let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.ariaLabel || '막대 차트')}">`;
        // 음영 구간
        if (o.shade) {
            data.forEach((d, i) => {
                if (o.shade(i)) svg += `<rect x="${m.l + i * slot}" y="${m.t}" width="${slot}" height="${ih}" class="c-shade"/>`;
            });
        }
        // 가로 눈금선
        for (let v = 0; v <= top; v += step) {
            svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="c-grid${v === 0 ? ' c-base' : ''}"/>`;
            svg += `<text x="${m.l - 6}" y="${y(v) + 4}" class="c-tick" text-anchor="end">${v}</text>`;
        }
        // 막대 (윗부분만 둥글게, 바닥은 기준선에 붙임)
        data.forEach((d, i) => {
            const x = m.l + i * slot + (slot - bw) / 2;
            const h = Math.max(0, (d.value / top) * ih);
            const r = Math.min(3, h, bw / 2);
            const yy = m.t + ih - h;
            const path = h <= 0 ? '' :
                `M${x},${m.t + ih} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${m.t + ih} Z`;
            const cls = o.accent && o.accent(i) ? 'c-bar c-bar--accent' : 'c-bar';
            svg += `<path d="${path}" class="${cls}"/>`;
            // 마우스 감지 영역 (막대보다 넓게)
            svg += `<rect x="${m.l + i * slot}" y="${m.t}" width="${slot}" height="${ih}" class="c-hit" data-i="${i}"/>`;
            if (!o.labelEvery || i % o.labelEvery === 0) {
                svg += `<text x="${m.l + i * slot + slot / 2}" y="${H - 8}" class="c-tick" text-anchor="middle">${esc(d.label)}</text>`;
            }
        });
        svg += '</svg>';
        el.innerHTML = svg + (o.shadeLabel ? `<p class="chart-note"><span class="swatch swatch--shade"></span>${esc(o.shadeLabel)}</p>` : '');

        $$('.c-hit', el).forEach((r) => {
            const d = data[+r.dataset.i];
            r.addEventListener('mousemove', (e) => tip(true, d.tip || `<b>${esc(d.label)}</b> ${fmt.num(d.value)}건`, e.clientX, e.clientY));
            r.addEventListener('mouseleave', () => tip(false));
        });
    }

    /**
     * 가로 막대 목록 (순위·구성비)
     * rows: [{label, sub, value, level}]  level(1~5)이 있으면 민감도 색 단계 사용
     */
    function hBars(el, rows, o) {
        const max = Math.max(1, ...rows.map((r) => r.value));
        el.innerHTML = `<ul class="hbars">${rows.map((r) => `
            <li class="hbars__row"${r.onclick ? ` data-go="${esc(r.onclick)}" tabindex="0"` : ''}>
                <span class="hbars__label">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
                <span class="hbars__track"><span class="hbars__fill ${r.level ? 'seq-' + r.level : ''}" style="width:${(r.value / max) * 100}%"></span></span>
                <span class="hbars__value">${fmt.num(r.value)}${o && o.unit ? o.unit : ''}</span>
            </li>`).join('')}</ul>`;
        $$('[data-go]', el).forEach((li) => {
            const go = () => { location.hash = li.dataset.go; };
            li.addEventListener('click', go);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        });
    }

    /**
     * 24시간 접근 띠 — 한 직원이 몇 시에 접근했는지 한눈에 보는 미니 히트맵
     *  업무시간 외 칸은 빗금, 접근이 있으면 진하기로 건수 표현
     */
    function hourStrip(hourly) {
        const max = Math.max(1, ...hourly);
        const cells = hourly.map((v, h) => {
            const off = h < CFG.WORK_HOUR_START || h >= CFG.WORK_HOUR_END;
            const a = v ? 0.18 + 0.82 * (v / max) : 0;
            const cls = `hs__cell${off ? ' hs__cell--off' : ''}${v && off ? ' hs__cell--hit' : ''}`;
            return `<span class="${cls}" style="--a:${a.toFixed(2)}" title="${h}시 ${v}건"></span>`;
        }).join('');
        return `<div class="hs" aria-label="시간대별 접근 분포">
                    <div class="hs__cells">${cells}</div>
                    <div class="hs__axis"><span>0시</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
                </div>`;
    }

    /* ------------------------------------------------------------------
     * 5. 공통 상태 화면
     * ------------------------------------------------------------------ */
    const loading = (text) => `<div class="state"><span class="spinner" aria-hidden="true"></span>${esc(text || '불러오는 중')}</div>`;
    const empty = (title, desc) => `<div class="state state--empty"><b>${esc(title)}</b>${desc ? `<span>${esc(desc)}</span>` : ''}</div>`;
    const errorBox = (msg) => `<div class="state state--error"><b>불러오지 못했습니다</b><span>${esc(msg)}</span></div>`;

    /* ------------------------------------------------------------------
     * 6. 앱 셸 — 로그인 확인, 사이드바, 해시 라우터
     * ------------------------------------------------------------------ */
    /**
     * @param {object} o
     *   role: 'ADMIN' | 'EMPLOYEE'
     *   loginPage: 'login.html'
     *   brand: 사이드바 제목
     *   nav: [{hash:'#/home', label:'홈', icon:'svg문자열', badgeKey?, match?:['#/customer/']}]
     *        match: 이 메뉴를 '선택됨'으로 표시할 추가 경로 (예: 고객 조회 → 고객 상세)
     *   routes: { 'home': fn(view, params), 'customer/:id': fn ... }
     *   defaultRoute: 'home'
     */
    function createApp(o) {
        const session = window.api.session();
        if (!session) { location.replace(o.loginPage); return; }
        // 포털 역할과 세션 역할이 다르면 돌려보냄 (관리자 ↔ 직원 포털 혼용 방지)
        if (session.role !== o.role) { window.api.logout(); location.replace(o.loginPage); return; }

        // 세션 만료/권한 해제 시 로그인 화면으로 (api.js 가 호출)
        window.onSessionExpired = (msg) => {
            sessionStorage.setItem('pims_login_notice', msg);
            location.replace(o.loginPage);
        };

        document.body.innerHTML = `
            <a class="skip" href="#view">본문으로 건너뛰기</a>
            <aside class="side">
                <div class="side__brand">
                    <span class="side__mark" aria-hidden="true"></span>
                    <span><b>${esc(o.brand)}</b><small>개인정보 처리 관제 시스템</small></span>
                </div>
                <nav class="side__nav" aria-label="주 메뉴">
                    ${o.nav.map((n) => `<a href="${n.hash}" class="side__link" data-hash="${n.hash}">${n.icon || ''}<span>${esc(n.label)}</span><em class="side__count" data-badge="${n.badgeKey || ''}" hidden></em></a>`).join('')}
                </nav>
                <div class="side__foot">
                    ${CFG.USE_MOCK ? `<div class="mockbox"><span>목데이터로 동작 중</span><button type="button" class="linkbtn" id="resetMock">초기화</button></div>` : ''}
                    <div class="me">
                        <span class="me__avatar" aria-hidden="true">${esc(session.name.slice(0, 1))}</span>
                        <span class="me__text"><b>${esc(session.name)}</b><small>${esc(session.department || '')} ${esc(session.position || '')}</small></span>
                        <button type="button" class="btn btn--ghost btn--sm" id="logoutBtn">로그아웃</button>
                    </div>
                </div>
            </aside>
            <div class="main">
                <header class="top">
                    <div>
                        <p class="top__crumb" id="crumb"></p>
                        <h1 class="top__title" id="pageTitle"></h1>
                    </div>
                    <div class="top__actions" id="topActions"></div>
                </header>
                <main id="view" class="view" tabindex="-1"></main>
            </div>
            <div id="toastRoot" aria-live="polite"></div>`;

        $('#logoutBtn').addEventListener('click', () => { window.api.logout(); location.replace(o.loginPage); });
        const reset = $('#resetMock');
        if (reset) reset.addEventListener('click', () => {
            modal({
                title: '목데이터를 초기화할까요?',
                body: '<p>지금까지 쌓인 열람·다운로드 기록, 파기 요청, 권한 변경이 모두 처음 상태로 돌아갑니다.</p>',
                confirmText: '초기화', danger: true,
                onConfirm: async () => { window.MockDB.reset(); location.reload(); },
            });
        });

        // 라우트 패턴 → 정규식
        const table = Object.entries(o.routes).map(([pattern, fn]) => {
            const keys = [];
            const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
            return { re, keys, fn };
        });

        /** 같은 id·class 를 가진 빈 요소로 교체해서 반환 */
        function freshEl(sel) {
            const old = $(sel);
            const el = old.cloneNode(false);
            old.replaceWith(el);
            return el;
        }

        let renderToken = 0;
        async function render() {
            const raw = (location.hash || '').replace(/^#\/?/, '');
            const [path, qstr] = raw.split('?');
            const hit = table.find((r) => r.re.test(path || ''));
            if (!hit) { location.hash = '#/' + o.defaultRoute; return; }
            const m = path.match(hit.re);
            const params = Object.fromEntries(new URLSearchParams(qstr || ''));
            hit.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });

            // 메뉴 활성화 표시
            $$('.side__link').forEach((a) => {
                const cur = '#/' + path;
                const item = o.nav.find((n) => n.hash === a.dataset.hash);
                const on = cur.startsWith(a.dataset.hash) ||
                    ((item && item.match) || []).some((m) => cur.startsWith(m));
                a.classList.toggle('is-active', on);
                if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
            });

            // 화면마다 #view, #topActions 를 새 요소로 교체
            //  → 이전 화면에서 붙인 이벤트 리스너가 쌓여 모달이 여러 번 뜨는 문제 방지
            const view = freshEl('#view');
            freshEl('#topActions');
            $('#crumb').textContent = '';
            view.innerHTML = loading();
            const token = ++renderToken;
            try {
                await hit.fn(view, params, () => token === renderToken);
            } catch (e) {
                if (token === renderToken) view.innerHTML = errorBox(e.message);
                console.error(e);
            }
            // 화면 함수가 이미 입력칸 등에 포커스를 줬다면 그대로 둠 (검색창 포커스 유지)
            if (!view.contains(document.activeElement)) view.focus({ preventScroll: true });
            window.scrollTo(0, 0);
        }
        window.addEventListener('hashchange', render);
        // 첫 화면은 한 박자 늦게 그림:
        //  화면 함수들이 `const app = UI.createApp(...)` 의 app 을 사용하는데,
        //  여기서 바로 render() 하면 app 에 값이 들어가기 전이라
        //  "Cannot access 'app' before initialization" 오류가 남 (주소에 #/경로 가 있는 채로 새로고침할 때)
        Promise.resolve().then(render);

        return {
            session,
            /** 페이지 제목 + 상단 경로 */
            setTitle(title, crumb) {
                $('#pageTitle').textContent = title;
                $('#crumb').textContent = crumb || '';
                document.title = `${title} | ${o.brand}`;
            },
            /** 상단 우측 버튼 영역 */
            setActions(html) { $('#topActions').innerHTML = html; return $('#topActions'); },
            /** 사이드바 메뉴 옆 숫자 (예: 대기 중 파기 요청 3) */
            setBadge(key, n) {
                const el = $(`[data-badge="${key}"]`);
                if (!el) return;
                el.textContent = n;
                el.hidden = !n;
            },
            rerender: render,
        };
    }

    /** 사이드바 아이콘 (선 아이콘, currentColor) */
    const ICON = {
        home:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
        search:  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
        list:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
        trash:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
        chart:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
        alert:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2zM12 10v5M12 18h.01"/></svg>',
        users:   '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c.8-3.5 3.6-5 7-5s6.2 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.4 2.2 4 5"/></svg>',
        file:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/></svg>',
        person:  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4M15 10h3M15 13h3"/></svg>',
    };

    window.UI = {
        esc, $, $$, fmt, isOffHours, dateInputValue, downloadText, toCSV, debounce,
        badge, riskLevel, toast, modal, reasonFields, readReason,
        barChart, hBars, hourStrip, loading, empty, errorBox, createApp, ICON,
    };
})();
