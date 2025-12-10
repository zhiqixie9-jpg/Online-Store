// js/core/auth-utils.js

const AuthUtils = {
    // Get authentication token
    getToken() {
        return localStorage.getItem('access_token');
    },

    // Set authentication token
    setToken(token) {
        if (token && typeof token === 'string' && token.split('.').length === 3) {
            localStorage.setItem('access_token', token);
            console.log('Token stored');

            // Trigger authentication state change event
            window.dispatchEvent(new CustomEvent('authStateChange'));
            return true;
        }
        console.error('Invalid token format');
        return false;
    },

    // Clear authentication token
    clearToken() {
        localStorage.removeItem('access_token');
        console.log('Token cleared');

        // Trigger authentication state change event
        window.dispatchEvent(new CustomEvent('authStateChange'));
    },

    // Check if token is valid
    isTokenValid() {
        const token = this.getToken();
        if (!token) {
            console.log('No token found');
            return false;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            const now = Date.now();

            // Token is valid if not expired
            const isValid = exp > now;
            console.log(`Token check: ${isValid ? 'Valid' : 'Expired'}`);
            return isValid;
        } catch (e) {
            console.error('Failed to check token validity:', e);
            return false;
        }
    },

    // Check if token is expiring soon (within 5 minutes)
    isTokenExpiringSoon() {
        const token = this.getToken();
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            const now = Date.now();
            const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

            const isExpiringSoon = (exp - now) < bufferTime;
            console.log(`Token expiring soon check: ${isExpiringSoon ? 'Yes' : 'No'}`);

            return isExpiringSoon;
        } catch (e) {
            console.error('Failed to check token expiration:', e);
            return true;
        }
    },

    // Get current user information
    getCurrentUser() {
        const token = this.getToken();
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                user_id: payload.user_id,
                username: payload.username,
                user_name: payload.username || payload.user_name // Compatible with both field names
            };
        } catch (e) {
            console.error('Failed to parse user information:', e);
            return null;
        }
    },

    // Ensure authentication status
    ensureAuthenticated() {
        if (!this.isTokenValid()) {
            console.log('Token invalid, re-login required');
            this.handleAuthError();
            return false;
        }

        console.log('Token valid, proceed');
        return true;
    },

    // Handle authentication error
    handleAuthError() {
        console.log('Authentication failed, clearing token');
        this.clearToken();

        // Only trigger global authentication error event on pages requiring authentication
        const currentPage = window.location.pathname;
        const pagesRequiringAuth = ['/profile.html', '/orders.html', '/cart.html', '/admin.html'];

        if (pagesRequiringAuth.some(page => currentPage.includes(page))) {
            // Trigger global authentication error event
            window.dispatchEvent(new CustomEvent('authError', {
                detail: { message: 'Authentication failed, please log in again' }
            }));

            // Delay redirect to allow user to see the message
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
        // For public pages like homepage and product pages, do not trigger error event or auto-redirect
    },

    // Start token monitoring
    startTokenMonitor() {
        // Check token status every minute
        this.tokenMonitor = setInterval(() => {
            if (!this.isTokenValid()) {
                console.log('Monitor detected expired token');
                this.handleAuthError();
                this.stopTokenMonitor();
            } else if (this.isTokenExpiringSoon()) {
                console.log('Monitor detected token expiring soon');
                // Trigger event for API layer to handle refresh
                window.dispatchEvent(new CustomEvent('tokenExpiringSoon'));
            }
        }, 60 * 1000); // Check every 1 minute
        console.log('Token monitor started');
    },

    // Stop token monitoring
    stopTokenMonitor() {
        if (this.tokenMonitor) {
            clearInterval(this.tokenMonitor);
            this.tokenMonitor = null;
            console.log('Token monitor stopped');
        }
    },

    // Show token warning
    showTokenWarning() {
        // Can add UI notifications here to inform user session is about to expire
        console.warn('Your login session is about to expire, please save your work');

        // Optional: Show a non-intrusive notification
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning alert-dismissible fade show';
        warningDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1050; max-width: 300px;';
        warningDiv.innerHTML = `
            <strong>Session Notification</strong><br>
            Your login session is about to expire, please save your work in time.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Remove existing warning
        const existingWarning = document.querySelector('.alert-warning[style*="position: fixed"]');
        if (existingWarning) {
            existingWarning.remove();
        }

        document.body.appendChild(warningDiv);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.remove();
            }
        }, 5000);
    },

    // Helper method to parse JWT token
    parseToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Token parsing failed:', e);
            return null;
        }
    },

    // Initialize authentication system
    init() {
        console.log('Initializing authentication system');

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Check token when page becomes visible again
                console.log('Page became visible, checking token status');
                if (!this.isTokenValid()) {
                    this.handleAuthError();
                }
            }
        });

        // Listen for storage changes (login/logout in other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'access_token') {
                console.log('Detected token storage change');
                if (!e.newValue) {
                    // Token cleared in other tab
                    this.handleAuthError();
                } else {
                    // New token set in other tab, update UI
                    window.dispatchEvent(new CustomEvent('authStateChange'));
                }
            }
        });

        // Listen for token expiring soon event
        window.addEventListener('tokenExpiringSoon', () => {
            this.showTokenWarning();
        });

        // Start token monitoring
        this.startTokenMonitor();

        // Initial token status check, but only show errors on pages requiring authentication
        if (!this.isTokenValid()) {
            const currentPage = window.location.pathname;
            const pagesRequiringAuth = ['/profile.html', '/orders.html', '/cart.html', '/admin.html'];

            // Only handle authentication errors on pages requiring authentication
            if (pagesRequiringAuth.some(page => currentPage.includes(page))) {
                this.handleAuthError();
            } else {
                // For public pages, only clear invalid token without showing error
                console.log('Public page, clearing invalid token without showing error');
                this.clearToken();
            }
        }
    }
};

// Add to global scope
window.AuthUtils = AuthUtils;

// Initialize after page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - initializing authentication system');
    AuthUtils.init();
});

// If page already loaded, initialize immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Page already loaded - initializing authentication system immediately');
    AuthUtils.init();
}