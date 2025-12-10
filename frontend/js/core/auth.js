class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadUserFromStorage();
        this.setupAutoRefresh();
    }

    loadUserFromStorage() {
        try {
            const userStr = localStorage.getItem('current_user');
            this.currentUser = userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Failed to load user info:', error);
            this.clearAuth();
        }
    }

    async login(username, password) {
        try {
            const result = await API.auth.login(username, password);

            if (result.access_token) {
                localStorage.setItem('access_token', result.access_token);

                // Get complete user information
                const userProfile = await API.auth.getProfile();
                this.setUser(userProfile);

                this.onAuthStateChange(true);
                return { success: true, user: userProfile };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    async register(userData) {
        try {
            const result = await API.auth.register(userData);

            if (result.user_id) {
                return { success: true, data: result };
            }
        } catch (error) {
            console.error('Registration failed:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('current_user', JSON.stringify(user));
    }

    clearAuth() {
        this.currentUser = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('current_user');
        this.onAuthStateChange(false);
    }

    logout() {
        this.clearAuth();
        window.location.href = 'index.html';
    }

    isAuthenticated() {
        const token = localStorage.getItem('access_token');
        return !!(token && this.currentUser);
    }

    getUser() {
        return this.currentUser;
    }

    async refreshUser() {
        if (!this.isAuthenticated()) return null;

        try {
            const userProfile = await API.auth.getProfile();
            this.setUser(userProfile);
            return userProfile;
        } catch (error) {
            console.error('Failed to refresh user info:', error);
            // If refresh fails, maintain current user state
            return this.currentUser;
        }
    }

    setupAutoRefresh() {
        // Refresh user info every 5 minutes
        setInterval(() => {
            if (this.isAuthenticated()) {
                this.refreshUser();
            }
        }, 5 * 60 * 1000);
    }

    onAuthStateChange(authenticated) {
        // Trigger authentication state change event
        const event = new CustomEvent('authStateChange', {
            detail: { authenticated, user: this.currentUser }
        });
        window.dispatchEvent(event);
    }

    getErrorMessage(error) {
        if (error.message) {
            if (error.message.includes('401')) {
                return 'Username or password incorrect';
            } else if (error.message.includes('404')) {
                return 'User does not exist';
            } else if (error.message.includes('422')) {
                return 'Data format error';
            } else if (error.message.includes('500')) {
                return 'Server error, please try again later';
            }
        }
        return error.message || 'Operation failed, please try again';
    }
}

// Create global authentication manager
window.authManager = new AuthManager();

// Compatibility helper functions for old code
window.checkAuth = () => window.authManager.isAuthenticated();
window.getCurrentUser = () => window.authManager.getUser();
window.logout = () => window.authManager.logout();