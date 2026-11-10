// 페이지 로드
function loadPage(page) {
    const content = document.getElementById('content');
    
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'search':
            loadSearchPage();
            break;
        case 'logs':
            loadAccessLogs();
            break;
        default:
            loadDashboard();
    }
}

function loadDashboard() {
    const name = localStorage.getItem('name');
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="page-container">
            <h1>환영합니다, ${name}님!</h1>
            <div class="row mt-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">🔍 고객 검색</div>
                        <div class="card-body">
                            <p>고객명으로 개인정보를 검색하고 관리할 수 있습니다.</p>
                            <button class="btn btn-primary" onclick="loadPage('search')">고객 검색 →</button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">📋 내 접근 기록</div>
                        <div class="card-body">
                            <p>당신의 모든 접근 이력을 확인할 수 있습니다.</p>
                            <button class="btn btn-primary" onclick="loadPage('logs')">기록 보기 →</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadSearchPage() {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="page-container">
            <h2>고객 검색</h2>
            <div class="row mt-3">
                <div class="col-md-6">
                    <div class="input-group mb-3">
                        <input type="text" class="form-control" id="searchInput" placeholder="고객명 입력...">
                        <button class="btn btn-primary" onclick="searchCustomers()">검색</button>
                    </div>
                </div>
            </div>
            <div id="searchResults"></div>
        </div>
    `;
}

async function searchCustomers() {
    const searchInput = document.getElementById('searchInput').value;
    if (!searchInput) {
        alert('고객명을 입력해주세요.');
        return;
    }
    
    try {
        const customers = await api.searchCustomers(searchInput);
        displaySearchResults(customers);
    } catch (error) {
        alert('검색 중 오류가 발생했습니다.');
        console.error(error);
    }
}

function displaySearchResults(customers) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (customers.length === 0) {
        resultsDiv.innerHTML = '<div class="alert alert-info">검색 결과가 없습니다.</div>';
        return;
    }
    
    let html = '<table class="table table-striped mt-3"><thead><tr>';
    html += '<th>고객ID</th><th>이름</th><th>전화번호</th><th>주소</th><th>작업</th></tr></thead><tbody>';
    
    customers.forEach(c => {
        html += `<tr>
            <td>${c.customerId}</td>
            <td>${c.name}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.address || '-'}</td>
            <td><button class="btn btn-sm btn-primary" onclick="viewCustomerInfo(${c.customerId})">상세보기</button></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
}

async function viewCustomerInfo(customerId) {
    try {
        const infos = await api.getCustomerInfo(customerId);
        displayPersonalInfo(customerId, infos);
    } catch (error) {
        alert('개인정보 조회 중 오류가 발생했습니다.');
        console.error(error);
    }
}

function displayPersonalInfo(customerId, infos) {
    const content = document.getElementById('content');
    
    let html = `<div class="page-container">
        <h2>개인정보 열람</h2>
        <button class="btn btn-secondary mb-3" onclick="loadPage('search')">← 돌아가기</button>
        <div class="card">
            <div class="card-header">등록된 개인정보</div>
            <div class="card-body">`;
    
    if (infos.length === 0) {
        html += '<p class="alert alert-info">등록된 개인정보가 없습니다.</p>';
    } else {
        infos.forEach(info => {
            const sensitivity = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'][info.sensitivityLevel] || '';
            html += `
                <div class="mb-3 p-2 border rounded">
                    <h5>${info.infoType} ${sensitivity}</h5>
                    <div class="mb-2">
                        <label>접근 사유</label>
                        <input type="text" class="form-control" placeholder="접근 사유를 입력하세요">
                    </div>
                    <button class="btn btn-success btn-sm" onclick="viewInfo(${info.infoId})">열람</button>
                    <button class="btn btn-danger btn-sm" onclick="requestDeletion(${info.infoId})">파기요청</button>
                </div>
            `;
        });
    }
    
    html += '</div></div></div>';
    content.innerHTML = html;
}

async function loadAccessLogs() {
    const content = document.getElementById('content');
    
    try {
        const logs = await api.getMyAccessLogs();
        
        let html = `<div class="page-container">
            <h2>내 접근 기록</h2>
            <table class="table table-striped">
            <thead><tr>
            <th>시간</th><th>고객명</th><th>정보유형</th><th>행동</th><th>사유</th>
            </tr></thead><tbody>`;
        
        logs.forEach(log => {
            html += `<tr>
                <td>${new Date(log.accessedAt).toLocaleString()}</td>
                <td>${log.customer.name}</td>
                <td>${log.personalInfo.infoType.typeName}</td>
                <td>${log.actionType}</td>
                <td>${log.accessReason || '-'}</td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        content.innerHTML = html;
    } catch (error) {
        alert('기록 조회 중 오류가 발생했습니다.');
        console.error(error);
    }
}

async function viewInfo(infoId) {
    const reason = document.querySelector(`input[placeholder="접근 사유를 입력하세요"]`).value;
    
    if (!reason) {
        alert('접근 사유를 입력해주세요.');
        return;
    }
    
    try {
        await api.viewPersonalInfo(infoId, reason);
        alert('개인정보를 열람했습니다. (기록이 저장되었습니다)');
    } catch (error) {
        alert('열람 중 오류가 발생했습니다.');
    }
}

async function requestDeletion(infoId) {
    const reason = prompt('파기 사유를 입력하세요:');
    
    if (!reason) return;
    
    try {
        await api.createDeletionRequest(infoId, reason);
        alert('파기 요청이 제출되었습니다.');
    } catch (error) {
        alert('파기 요청 중 오류가 발생했습니다.');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// 페이지 로드 시 로그인 확인
window.addEventListener('load', function() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
    } else {
        loadPage('dashboard');
    }
});
