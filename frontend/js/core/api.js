// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:8000/api',
    TIMEOUT: 10000,
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000
};

// Request cache
const requestCache = new Map();

class ApiService {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    async request(endpoint, options = {}) {
        // Check token status before sending request
        await this._ensureTokenValid();

        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const cacheKey = this.getCacheKey(url, options);
        const requestId = `${url}_${Date.now()}`;

        // Check cache
        if (options.method === 'GET' && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Prevent duplicate requests
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: API_CONFIG.TIMEOUT,
            ...options
        };

        // Add authentication token
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const promise = this._makeRequestWithRetry(url, config, API_CONFIG.RETRY_COUNT);
            this.pendingRequests.set(cacheKey, promise);

            const response = await promise;

            // Cache GET requests
            if (options.method === 'GET') {
                this.cache.set(cacheKey, response);
            }

            return response;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    async _makeRequestWithRetry(url, config, retries) {
        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                // If it's a 401 error, try refreshing token
                if (response.status === 401) {
                    const refreshed = await this._handleTokenRefresh();
                    if (refreshed) {
                        // Retry original request
                        config.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                        return this._makeRequestWithRetry(url, config, retries);
                    } else {
                        // Refresh failed, trigger authentication error
                        if (window.AuthUtils) {
                            window.AuthUtils.handleAuthError();
                        }
                        throw new Error('Authentication failed');
                    }
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (retries > 0 && this._shouldRetry(error)) {
                await this._delay(API_CONFIG.RETRY_DELAY);
                return this._makeRequestWithRetry(url, config, retries - 1);
            }
            throw error;
        }
    }

    // Function to ensure token is valid
    async _ensureTokenValid() {
        if (!window.AuthUtils) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            // If no token, don't throw error, let request continue (backend will return 401)
            console.log('No token found, but allowing request to continue');
            return;
        }

        // Check if token is about to expire (within 5 minutes)
        if (window.AuthUtils.isTokenExpiringSoon && window.AuthUtils.isTokenExpiringSoon()) {
            console.log('Detected token is about to expire, attempting refresh...');
            const refreshed = await this._handleTokenRefresh();
            if (!refreshed) {
                throw new Error('Token refresh failed');
            }
        }

        // Check if token is completely invalid
        if (window.AuthUtils.isTokenValid && !window.AuthUtils.isTokenValid()) {
            console.log('Token is invalid, requires re-authentication');
            this._triggerAuthError();
            throw new Error('Token is invalid');
        }
    }

    // Handle token refresh
    async _handleTokenRefresh() {
        // Prevent duplicate refresh
        if (this.isRefreshing) {
            return new Promise((resolve) => {
                this.refreshSubscribers.push(resolve);
            });
        }

        this.isRefreshing = true;

        try {
            // Use current access token to refresh, not refresh token
            const currentToken = localStorage.getItem('access_token');

            if (!currentToken) {
                console.log('No access token available, requires login');
                this._notifyRefreshSubscribers(false);
                this._triggerAuthError();
                return false;
            }

            // Directly use current token to call refresh endpoint
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Store new access token
                if (data.access_token) {
                    localStorage.setItem('access_token', data.access_token);
                    console.log('Token refresh successful');

                    this._notifyRefreshSubscribers(true);
                    return true;
                }
            }

            // Refresh failed
            console.error('Token refresh failed, status code:', response.status);
            this._notifyRefreshSubscribers(false);
            this._triggerAuthError();
            return false;

        } catch (error) {
            console.error('Token refresh failed:', error);
            this._notifyRefreshSubscribers(false);
            this._triggerAuthError();
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    // Add helper methods
    _notifyRefreshSubscribers(success) {
        this.refreshSubscribers.forEach(callback => callback(success));
        this.refreshSubscribers = [];
    }

    _triggerAuthError() {
        if (window.AuthUtils) {
            window.AuthUtils.handleAuthError();
        } else {
            // Backup solution
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = 'login.html';
        }
    }

    _shouldRetry(error) {
        // Network errors or 5xx server errors can be retried
        return error.name === 'TypeError' ||
               (error.message && error.message.includes('5'));
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCacheKey(url, options) {
        return `${url}_${JSON.stringify(options.body || '')}`;
    }

    clearCache() {
        this.cache.clear();
    }

    // Batch requests
    async batchRequests(requests) {
        return Promise.allSettled(requests);
    }

// Modify public request method in ApiService class to ensure it can be called without token
async publicRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, options);

    // Check cache
    if (options.method === 'GET' && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
    }

    // Prevent duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey);
    }

    const config = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        timeout: API_CONFIG.TIMEOUT,
        ...options
    };

    // For public requests, don't automatically add authentication token
    // Only add when there's a token, let backend decide if authentication is required
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const promise = this._makePublicRequest(url, config, API_CONFIG.RETRY_COUNT);
        this.pendingRequests.set(cacheKey, promise);

        const response = await promise;

        // Cache GET requests
        if (options.method === 'GET') {
            this.cache.set(cacheKey, response);
        }

        return response;
    } finally {
        this.pendingRequests.delete(cacheKey);
    }
}

    async _makePublicRequest(url, config, retries) {
        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (retries > 0 && this._shouldRetry(error)) {
                await this._delay(API_CONFIG.RETRY_DELAY);
                return this._makePublicRequest(url, config, retries - 1);
            }
            throw error;
        }
    }
}

// Create global API instance
window.apiService = new ApiService();

// API module (unchanged)
const API = {
    // Authentication related
    auth: {
        login: (username, password) =>
            apiService.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            }),

        register: (data) =>
            apiService.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data)
            }),

        getProfile: () => apiService.request('/auth/me')
    },

    // Add user related API
    user: {
        // Get user information
        getUserInfo: (userId) => apiService.request(`/users/${userId}`),

        // Update membership status
        updateMemberStatus: (userId) =>
            apiService.request(`/users/${userId}/member-status`, {
                method: 'PUT'
            }),

        // Get membership status
        getMemberStatus: (userId) =>
            apiService.request(`/users/${userId}/member-status`),

        // Update user information
        updateUser: (userId, userData) =>
            apiService.request(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            })
    },

    // Product related
    products: {
        getList: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return apiService.request(`/products/?${query}`);
        },

        getDetail: (id) => apiService.request(`/products/${id}`),

        getCategories: () => apiService.request('/products/categories/types'),

        search: (keyword) =>
            apiService.request(`/products/?search=${encodeURIComponent(keyword)}`)
    },

    // Shopping cart related
    cart: {
        get: (userId) => apiService.request(`/cart/${userId}`),

        add: (userId, productId, quantity = 1) =>
            apiService.request(`/cart/${userId}/add`, {
                method: 'POST',
                body: JSON.stringify({ productId, quantity })
            }),

        update: (userId, productId, quantity) =>
            apiService.request(`/cart/${userId}/update`, {
                method: 'PUT',
                body: JSON.stringify({ productId, quantity })
            }),

        remove: (userId, productId) =>
            apiService.request(`/cart/${userId}/remove/${productId}`, {
                method: 'DELETE'
            })
    },

    // Order related
    orders: {
        getList: (userId) => apiService.request(`/orders/user/${userId}`),

        create: (data) =>
            apiService.request('/orders/create', {
                method: 'POST',
                body: JSON.stringify(data)
            }),

        cancel: (orderId) =>
            apiService.request(`/orders/${orderId}/cancel`, {
                method: 'PUT'
            }),

        complete: (orderId) =>
            apiService.request(`/orders/${orderId}/complete`, {
                method: 'PUT'
            }),

        // Add missing methods
        pay: (orderId) =>
            apiService.request(`/orders/${orderId}/pay`, {
                method: 'POST'
            }),

        // Get orders by status (for admin)
        getByStatus: (status) =>
            apiService.request(`/orders/admin/status/${status}`),

        // Update order status
        updateStatus: (orderId, status) =>
            apiService.request(`/orders/admin/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            }),

        // Manually complete old orders
        manualCompleteOldOrders: () =>
            apiService.request('/orders/complete-old-orders', {
                method: 'POST'
            }),

        // Get all orders (paginated)
        getAll: (skip = 0, limit = 100) =>
            apiService.request(`/orders/admin/all?skip=${skip}&limit=${limit}`)

        // getPendingOrders: function() {
        //     return this.get('/orders/admin/status/pending');
        // },
        //
        // getPaidOrders: function() {
        //     return this.get('/orders/admin/status/paid');
        // },
        //
        // updateOrderStatus: function(orderId, status) {
        //     return this.put(`/orders/admin/${orderId}/status`, { status });
        // },
    },

    // Favorites related
    favorites: {
        get: (userId) => apiService.request(`/favorites/${userId}`),

        add: (userId, productId) =>
            apiService.request(`/favorites/${userId}/add`, {
                method: 'POST',
                body: JSON.stringify({ product_id: productId })
            }),

        remove: (userId, productId) =>
            apiService.request(`/favorites/${userId}/remove/${productId}`, {
                method: 'DELETE'
            }),

        check: (userId, productId) =>
            apiService.request(`/favorites/${userId}/check/${productId}`)
    }
};

// Export to global
window.API = API;

// Provide compatibility for old code (ensure global variables used in profile.js exist)
window.userAPI = {
    getUserInfo: (userId) => API.user.getUserInfo(userId),
    updateMemberStatus: (userId) =>
        apiService.request(`/users/${userId}/update-member-status`, {
            method: 'PUT'  // Changed to PUT method
        }),
    getMemberStatus: (userId) => API.user.getMemberStatus(userId),
    updateUser: (userId, userData) => API.user.updateUser(userId, userData)
};

window.favoriteAPI = {
    getFavorites: (userId) => API.favorites.get(userId),
    addFavorite: (userId, productId) => API.favorites.add(userId, productId),
    removeFavorite: (userId, productId) => API.favorites.remove(userId, productId),
    checkFavorite: (userId, productId) => API.favorites.check(userId, productId)
};

window.orderAPI = {
    // User functions
    getOrders: (userId) => API.orders.getList(userId),
    createOrder: (data) => API.orders.create(data),
    cancelOrder: (orderId) => API.orders.cancel(orderId),
    completeOrder: (orderId) => API.orders.complete(orderId),

    // Admin functions - fix method references
    updateOrderStatus: (orderId, status) => API.orders.updateStatus(orderId, status),
    getOrdersByStatus: (status) => API.orders.getByStatus(status),
    getAllOrders: () => API.orders.getAll(),
    manualCompleteOldOrders: () => API.orders.manualCompleteOldOrders(),

    // Add payment method
    payOrder: (orderId) => API.orders.pay(orderId)
};

window.cartAPI = {
    get: (userId) => API.cart.get(userId),
    addToCart: (userId, productId, quantity) => API.cart.add(userId, productId, quantity),
    updateCart: (userId, productId, quantity) => API.cart.update(userId, productId, quantity),
    removeFromCart: (userId, productId) => API.cart.remove(userId, productId)
};

window.productAPI = {
    getProducts: (params) => apiService.publicRequest(`/products/?${new URLSearchParams(params).toString()}`),
    getProduct: (id) => apiService.publicRequest(`/products/${id}`),
    getCategories: () => apiService.publicRequest('/products/categories/types'),
    searchProducts: (keyword) => apiService.publicRequest(`/products/?search=${encodeURIComponent(keyword)}`)
};

console.log('API module loaded, includes user-related methods');