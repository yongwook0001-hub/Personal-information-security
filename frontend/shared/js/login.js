/**
 * ============================================================================
 *  로그인 화면 공용 스크립트 (employee/login.html, admin/login.html)
 * ============================================================================
 *  - <body data-role="EMPLOYEE" data-next="index.html"> 처럼 HTML 에서 역할을 지정
 *  - 실제 로그인은 api.login() 을 통해 처리 (목 모드여도 아이디/비밀번호 검증을 거침)
 *    → 예전의 'test-token' 자동 로그인 우회는 제거했습니다.
 * ============================================================================
 */
(function () {
    'use strict';
    const { $, esc } = window.UI;
    const role = document.body.dataset.role;           // 'EMPLOYEE' | 'ADMIN'
    const next = document.body.dataset.next || 'index.html';

    // 이미 로그인되어 있으면 바로 이동
    const s = window.api.session();
    //  (포털별로 세션 키가 다르므로, 여기서 읽은 세션은 이 포털의 세션)
    if (s && s.role === role) location.replace(next);

    const form = $('#loginForm');
    const alertEl = $('#loginAlert');

    function showAlert(msg) {
        alertEl.textContent = msg;
        alertEl.hidden = !msg;
    }

    // 세션 만료·권한 해제로 튕겨나온 경우 안내
    const notice = sessionStorage.getItem('pims_login_notice');
    if (notice) { showAlert(notice); sessionStorage.removeItem('pims_login_notice'); }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showAlert('');
        const btn = $('button[type=submit]', form);
        btn.disabled = true;
        btn.textContent = '확인 중';
        try {
            const data = await window.api.login(form.username.value, form.password.value);
            if (role === 'ADMIN' && data.role !== 'ADMIN') {
                window.api.logout();
                throw new Error('관리자 계정이 아닙니다. 직원 포털에서 로그인하세요.');
            }
            if (role === 'EMPLOYEE' && data.role === 'ADMIN') {
                // 관리자 계정은 직원 포털을 쓰지 않음 (관리자의 열람이 직원 업무 기록에 섞이지 않게)
                window.api.logout();
                throw new Error('관리자 계정입니다. 아래 링크로 관리자 포털에서 로그인하세요.');
            }
            location.replace(next);
        } catch (err) {
            showAlert(err.message);
            btn.disabled = false;
            btn.textContent = '로그인';
        }
    });

    // 목 모드에서만 시연용 계정 버튼 표시 (클릭 시 입력칸만 채움 — 로그인은 직접)
    const demo = $('#demo');
    if (demo && window.APP_CONFIG.USE_MOCK) {
        const accounts = JSON.parse(demo.dataset.accounts || '[]');
        demo.hidden = false;
        $('.demo__list', demo).innerHTML = accounts
            .map((a) => `<button type="button" data-u="${esc(a[0])}">${esc(a[1])}</button>`).join('');
        demo.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-u]');
            if (!b) return;
            form.username.value = b.dataset.u;
            form.password.value = 'password';
            $('button[type=submit]', form).focus();
        });
    }
})();
