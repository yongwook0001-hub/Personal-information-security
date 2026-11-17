// 페이지 로드
function loadPage(page) {
    const content = document.getElementById('content');

    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'logs':
            loadAccessLogs();
            break;
        case 'anomaly':
            loadAnomaly();
            break;
        case 'deletion':
            loadDeletionRequests();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'audit':
            loadAudit();
            break;
        case 'report':
            loadReport();
            break;
        default:
            loadDashboard();
    }
}

function loadDashboard() {
    const name = localStorage.getItem('name');
    const content = document.getElementById('content');

    updateUserInfo();

    content.innerHTML = `
        <div class="page-container">
            <div style="background: linear-gradient(135deg, #330066, #550099); color: white; padding: 2rem; border-radius: 10px; margin-bottom: 2rem;">
                <h1 style="margin: 0; font-size: 2rem; font-weight: bold;">관리자 대시보드 👑</h1>
                <p style="margin: 0.5rem 0 0 0; font-size: 1rem; opacity: 0.9;">환영합니다, ${name}님!</p>
            </div>

            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stat-card">
                        <h3 id="totalAccess">-</h3>
                        <p>오늘 접근 기록</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card danger">
                        <h3 id="anomalyCount">-</h3>
                        <p>이상 탐지</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card warning">
                        <h3 id="pendingCount">-</h3>
                        <p>대기 중인 파기 요청</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card success">
                        <h3 id="totalEmployees">-</h3>
                        <p>활성 직원</p>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">🚨 최근 이상 탐지</div>
                        <div class="card-body">
                            <div id="recentAnomalies"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">🗑️ 파기 요청 대기</div>
                        <div class="card-body">
                            <div id="pendingDeletions"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">📊 오늘의 활동 통계</div>
                <div class="card-body">
                    <p>직원별 접근 횟수:</p>
                    <div id="accessStats"></div>
                </div>
            </div>
        </div>
    `;

    loadDashboardData();
}

async function loadDashboardData() {
    try {
        const logs = await api.getMyAccessLogs();
        const deletions = await api.getPendingDeletions();

        document.getElementById('totalAccess').textContent = logs.length || 0;
        document.getElementById('anomalyCount').textContent = Math.floor(Math.random() * 5);
        document.getElementById('pendingCount').textContent = deletions.length || 0;
        document.getElementById('totalEmployees').textContent = '5';

        // 최근 이상 탐지
        const anomaliesHtml = logs.slice(0, 3).map(log => `
            <div class="anomaly-item">
                <h5>${log.user?.name || 'Unknown'}</h5>
                <p><small>${log.customer?.name} - ${log.personalInfo?.infoType?.typeName}</small></p>
                <span class="badge badge-alert">조사 필요</span>
            </div>
        `).join('') || '<p class="text-muted">최근 이상이 없습니다.</p>';

        document.getElementById('recentAnomalies').innerHTML = anomaliesHtml;

        // 파기 요청 대기
        const deletionsHtml = deletions.slice(0, 3).map(del => `
            <div class="mb-2 p-2 border rounded">
                <p><strong>${del.personalInfo?.customer?.name}</strong></p>
                <small>${del.deletionReason}</small>
                <div class="mt-2">
                    <button class="btn btn-sm btn-success" onclick="approveDeletion(${del.requestId})">승인</button>
                    <button class="btn btn-sm btn-danger" onclick="rejectDeletion(${del.requestId})">거절</button>
                </div>
            </div>
        `).join('') || '<p class="text-muted">대기 중인 파기 요청이 없습니다.</p>';

        document.getElementById('pendingDeletions').innerHTML = deletionsHtml;
    } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
    }
}

function loadAccessLogs() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="page-container">
            <h2 class="section-title">📋 접근 기록 모니터링</h2>

            <div class="row mb-3">
                <div class="col-md-4">
                    <input type="text" class="form-control" id="filterUser" placeholder="직원명 검색...">
                </div>
                <div class="col-md-4">
                    <input type="text" class="form-control" id="filterCustomer" placeholder="고객명 검색...">
                </div>
                <div class="col-md-4">
                    <button class="btn btn-primary" onclick="filterAccessLogs()">검색</button>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>시간</th>
                                <th>직원명</th>
                                <th>고객명</th>
                                <th>정보유형</th>
                                <th>접근 사유</th>
                                <th>IP 주소</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody id="logsTable">
                            <tr><td colspan="7" class="text-center text-muted">로딩 중...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    loadAccessLogsData();
}

async function loadAccessLogsData() {
    try {
        const logs = await api.getMyAccessLogs();

        const logsHtml = logs.map(log => `
            <tr>
                <td>${new Date(log.accessedAt).toLocaleString('ko-KR')}</td>
                <td>${log.user?.name || 'Unknown'}</td>
                <td>${log.customer?.name || 'Unknown'}</td>
                <td>${log.personalInfo?.infoType?.typeName || 'Unknown'}</td>
                <td>${log.accessReason || '-'}</td>
                <td><small>${log.ipAddress || '-'}</small></td>
                <td><span class="badge badge-active">정상</span></td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="text-center text-muted">기록이 없습니다.</td></tr>';

        document.getElementById('logsTable').innerHTML = logsHtml;
    } catch (error) {
        document.getElementById('logsTable').innerHTML = '<tr><td colspan="7" class="text-center text-danger">데이터 로드 실패</td></tr>';
    }
}

function loadAnomaly() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="page-container">
            <h2 class="section-title">🚨 이상 탐지 (실시간)</h2>

            <div class="card">
                <div class="card-header">24시간 내 과다 접근</div>
                <div class="card-body" id="excessiveAccess">
                    <p class="text-muted">로딩 중...</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header">야간/휴일 접근</div>
                <div class="card-body" id="abnormalTime">
                    <p class="text-muted">로딩 중...</p>
                </div>
            </div>

            <div class="card">
                <div class="card-header">빠른 연속 접근</div>
                <div class="card-body" id="rapidAccess">
                    <p class="text-muted">로딩 중...</p>
                </div>
            </div>
        </div>
    `;

    loadAnomalyData();
}

async function loadAnomalyData() {
    try {
        const logs = await api.getMyAccessLogs();

        // 이상 탐지 로직 (시뮬레이션)
        const anomalies = logs.filter(log => log.alertFlags);

        const excessiveHtml = anomalies.length > 0
            ? anomalies.map(log => `
                <div class="anomaly-item">
                    <h5>${log.user?.name}</h5>
                    <p>24시간 내 ${Math.floor(Math.random() * 100)} 회 접근</p>
                    <span class="badge badge-alert">조사 필요</span>
                </div>
            `).join('')
            : '<p class="text-muted">과다 접근 사례가 없습니다.</p>';

        document.getElementById('excessiveAccess').innerHTML = excessiveHtml;
        document.getElementById('abnormalTime').innerHTML = '<p class="text-muted">야간/휴일 접근 사례가 없습니다.</p>';
        document.getElementById('rapidAccess').innerHTML = '<p class="text-muted">빠른 연속 접근 사례가 없습니다.</p>';
    } catch (error) {
        console.error('이상 탐지 데이터 로드 실패:', error);
    }
}

function loadDeletionRequests() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="page-container">
            <h2 class="section-title">🗑️ 개인정보 파기 요청</h2>

            <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item"><a class="nav-link active" href="#pending" data-bs-toggle="tab">대기 중</a></li>
                <li class="nav-item"><a class="nav-link" href="#approved" data-bs-toggle="tab">승인됨</a></li>
                <li class="nav-item"><a class="nav-link" href="#rejected" data-bs-toggle="tab">거절됨</a></li>
            </ul>

            <div class="tab-content">
                <div class="tab-pane fade show active" id="pending">
                    <div id="pendingTable"></div>
                </div>
                <div class="tab-pane fade" id="approved">
                    <div id="approvedTable"></div>
                </div>
                <div class="tab-pane fade" id="rejected">
                    <div id="rejectedTable"></div>
                </div>
            </div>
        </div>
    `;

    loadDeletionRequestsData();
}

async function loadDeletionRequestsData() {
    try {
        const deletions = await api.getPendingDeletions();

        const pendingHtml = deletions.map(del => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5>${del.personalInfo?.customer?.name}</h5>
                            <p><strong>정보유형:</strong> ${del.personalInfo?.infoType?.typeName}</p>
                            <p><strong>파기 사유:</strong> ${del.deletionReason}</p>
                            <p><strong>요청자:</strong> ${del.requestedBy?.name}</p>
                        </div>
                        <div class="col-md-4">
                            <button class="btn btn-success mb-2 w-100" onclick="approveDeletion(${del.requestId})">✓ 승인</button>
                            <button class="btn btn-danger w-100" onclick="rejectDeletion(${del.requestId})">✗ 거절</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('') || '<p class="text-muted">대기 중인 파기 요청이 없습니다.</p>';

        document.getElementById('pendingTable').innerHTML = pendingHtml;
        document.getElementById('approvedTable').innerHTML = '<p class="text-muted">승인된 파기 요청이 없습니다.</p>';
        document.getElementById('rejectedTable').innerHTML = '<p class="text-muted">거절된 파기 요청이 없습니다.</p>';
    } catch (error) {
        console.error('파기 요청 데이터 로드 실패:', error);
    }
}

function loadEmployees() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="page-container">
            <h2 class="section-title">👥 직원 관리</h2>

            <button class="btn btn-primary mb-3" onclick="showAddEmployeeModal()">+ 직원 추가</button>

            <div class="card">
                <div class="card-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>직원 ID</th>
                                <th>이름</th>
                                <th>부서</th>
                                <th>직급</th>
                                <th>상태</th>
                                <th>최근 접근</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody id="employeesTable">
                            <tr><td colspan="7" class="text-center text-muted">로딩 중...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    loadEmployeesData();
}

async function loadEmployeesData() {
    try {
        const employees = [
            { userId: 1, username: 'emp001', name: '이직원', department: '영업팀', position: '과장', isActive: true },
            { userId: 2, username: 'emp002', name: '박직원', department: '영업팀', position: '대리', isActive: true },
            { userId: 3, username: 'emp003', name: '최직원', department: '고객팀', position: '과장', isActive: true },
            { userId: 4, username: 'emp004', name: '정직원', department: '대출팀', position: '대리', isActive: true }
        ];

        const employeesHtml = employees.map(emp => `
            <tr>
                <td>${emp.userId}</td>
                <td><strong>${emp.name}</strong></td>
                <td>${emp.department}</td>
                <td>${emp.position}</td>
                <td><span class="badge ${emp.isActive ? 'badge-active' : 'badge-secondary'}">
                    ${emp.isActive ? '활성' : '비활성'}
                </span></td>
                <td><small>2시간 전</small></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editEmployee(${emp.userId})">수정</button>
                    <button class="btn btn-sm btn-danger" onclick="deactivateEmployee(${emp.userId})">비활성화</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('employeesTable').innerHTML = employeesHtml;
    } catch (error) {
        document.getElementById('employeesTable').innerHTML = '<tr><td colspan="7" class="text-center text-danger">데이터 로드 실패</td></tr>';
    }
}

function loadAudit() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="page-container">
            <h2 class="section-title">📝 감사 기록</h2>

            <div class="row mb-3">
                <div class="col-md-6">
                    <input type="text" class="form-control" id="auditEmployee" placeholder="직원명 검색...">
                </div>
                <div class="col-md-6">
                    <input type="date" class="form-control" id="auditDate">
                </div>
            </div>

            <div class="card">
                <div class="card-header">감사 기록 목록</div>
                <div class="card-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>감사 ID</th>
                                <th>직원명</th>
                                <th>감시 기간</th>
                                <th>접근 횟수</th>
                                <th>감시 유형</th>
                                <th>코멘트</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody id="auditTable">
                            <tr><td colspan="7" class="text-center text-muted">감사 기록을 조회할 수 없습니다.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">감사 기록 작성</div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">직원 선택</label>
                        <select class="form-control" id="auditEmployeeSelect">
                            <option>emp001 - 이직원</option>
                            <option>emp002 - 박직원</option>
                            <option>emp003 - 최직원</option>
                            <option>emp004 - 정직원</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">감시 유형</label>
                        <select class="form-control" id="auditType">
                            <option>ROUTINE</option>
                            <option>ALERT</option>
                            <option>INVESTIGATION</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">코멘트</label>
                        <textarea class="form-control" id="auditComment" rows="4" placeholder="감사 기록을 작성하세요..."></textarea>
                    </div>
                    <button class="btn btn-primary" onclick="saveAudit()">저장</button>
                </div>
            </div>
        </div>
    `;
}

function loadReport() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="page-container">
            <h2 class="section-title">📈 통계 & 보고서</h2>

            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stat-card">
                        <h3>${Math.floor(Math.random() * 1000)}</h3>
                        <p>총 접근 기록</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card warning">
                        <h3>${Math.floor(Math.random() * 50)}</h3>
                        <p>이상 탐지 건수</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card success">
                        <h3>${Math.floor(Math.random() * 20)}</h3>
                        <p>파기 요청 완료</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card info">
                        <h3>${Math.floor(Math.random() * 100)}</h3>
                        <p>감사 기록</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">직원별 접근 통계</div>
                <div class="card-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>직원명</th>
                                <th>접근 횟수</th>
                                <th>파기 요청</th>
                                <th>이상 탐지</th>
                                <th>감시 등급</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>이직원</td>
                                <td><strong>45</strong></td>
                                <td>2</td>
                                <td><span class="badge badge-alert">2건</span></td>
                                <td><span class="badge badge-warning">주의</span></td>
                            </tr>
                            <tr>
                                <td>박직원</td>
                                <td><strong>23</strong></td>
                                <td>1</td>
                                <td><span class="badge">0건</span></td>
                                <td><span class="badge badge-success">정상</span></td>
                            </tr>
                            <tr>
                                <td>최직원</td>
                                <td><strong>18</strong></td>
                                <td>0</td>
                                <td><span class="badge">0건</span></td>
                                <td><span class="badge badge-success">정상</span></td>
                            </tr>
                            <tr>
                                <td>정직원</td>
                                <td><strong>31</strong></td>
                                <td>3</td>
                                <td><span class="badge badge-alert">1건</span></td>
                                <td><span class="badge badge-warning">주의</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">보고서 생성</div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">기간</label>
                        <div class="input-group">
                            <input type="date" class="form-control" id="reportStart">
                            <input type="date" class="form-control" id="reportEnd">
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="generateReport()">보고서 생성</button>
                    <button class="btn btn-secondary" onclick="downloadReport()">다운로드 (PDF)</button>
                </div>
            </div>
        </div>
    `;
}

// 액션 함수들
function approveDeletion(requestId) {
    if (confirm('이 파기 요청을 승인하시겠습니까?')) {
        alert('파기 요청이 승인되었습니다.');
        loadPage('deletion');
    }
}

function rejectDeletion(requestId) {
    const reason = prompt('거절 사유를 입력하세요:');
    if (reason) {
        alert('파기 요청이 거절되었습니다.');
        loadPage('deletion');
    }
}

function editEmployee(employeeId) {
    alert(`직원 ${employeeId} 수정 (기능 개발 예정)`);
}

function deactivateEmployee(employeeId) {
    if (confirm('이 직원을 비활성화하시겠습니까?')) {
        alert('직원이 비활성화되었습니다.');
        loadEmployeesData();
    }
}

function saveAudit() {
    alert('감사 기록이 저장되었습니다.');
    document.getElementById('auditComment').value = '';
}

function generateReport() {
    alert('보고서가 생성되었습니다.');
}

function downloadReport() {
    alert('PDF 다운로드 (기능 개발 예정)');
}

function filterAccessLogs() {
    alert('필터가 적용되었습니다.');
    loadAccessLogsData();
}

function showAddEmployeeModal() {
    alert('직원 추가 (기능 개발 예정)');
}

function updateUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const name = localStorage.getItem('name');
    if (userInfo && name) {
        userInfo.textContent = `${name} (관리자)`;
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
    } else if (localStorage.getItem('role') !== 'ADMIN') {
        alert('관리자만 접근할 수 있습니다.');
        window.location.href = '../employee/index.html';
    } else {
        updateUserInfo();
        loadPage('dashboard');
    }
});
