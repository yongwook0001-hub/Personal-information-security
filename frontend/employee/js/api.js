const API_BASE_URL = 'http://localhost:8080/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userId = localStorage.getItem('userId');
        this.headers = {
            'Content-Type': 'application/json',
            'X-User-Id': this.userId,
            'X-IP-Address': this.getClientIP()
        };
        
        if (this.token) {
            this.headers['Authorization'] = `Bearer ${this.token}`;
        }
    }
    
    getClientIP() {
        return 'client-ip'; // 실제로는 클라이언트 IP 조회 필요
    }
    
    async login(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('username', data.username);
                localStorage.setItem('name', data.name);
                localStorage.setItem('role', data.role);
                return data;
            }
            throw new Error('Login failed');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    
    async searchCustomers(name) {
        this.updateHeaders();
        const response = await fetch(`${API_BASE_URL}/customers?name=${name}`, {
            headers: this.headers
        });
        if (!response.ok) throw new Error('Search failed');
        return await response.json();
    }

    async getCustomer(customerId) {
        this.updateHeaders();
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
            headers: this.headers
        });
        if (!response.ok) throw new Error('Fetch failed');
        return await response.json();
    }

    async getCustomerInfo(customerId) {
        this.updateHeaders();
        const response = await fetch(`${API_BASE_URL}/info/customer/${customerId}`, {
            headers: this.headers
        });
        if (!response.ok) throw new Error('Fetch failed');
        return await response.json();
    }

    async viewPersonalInfo(infoId, reason) {
        this.updateHeaders();
        const response = await fetch(`${API_BASE_URL}/info/${infoId}/view`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ reason })
        });
        if (!response.ok) throw new Error('View failed');
        return await response.json();
    }

    async createDeletionRequest(infoId, reason) {
        this.updateHeaders();
        const response = await fetch(`${API_BASE_URL}/deletion-requests`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ infoId, reason })
        });
        if (!response.ok) throw new Error('Request failed');
        return await response.json();
    }

    async getMyAccessLogs() {
        this.updateHeaders();
        const response = await fetch(`${API_BASE_URL}/access-logs/me`, {
            headers: this.headers
        });
        if (!response.ok) throw new Error('Fetch failed');
        return await response.json();
    }

    updateHeaders() {
        this.token = localStorage.getItem('token');
        if (this.token) {
            this.headers['Authorization'] = `Bearer ${this.token}`;
        }
    }
}

const api = new ApiClient();
