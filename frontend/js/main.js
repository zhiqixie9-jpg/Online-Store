// Application Main Entry File
class OnlineStoreApp {
    constructor() {
        this.init();
    }

    async init() {
        // Initialize core modules
        await this.initCore();

        // Setup global error handling
        this.setupErrorHandling();

        // Setup performance monitoring
        this.setupPerformanceMonitoring();

        console.log('OnlineStore application initialized');
    }

    async initCore() {
        // Wait for DOM to load
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Initialize authentication status
        this.updateAuthUI();

        // Listen for authentication state changes
        window.addEventListener('authStateChange', (event) => {
            this.updateAuthUI();
        });

        // Listen for authentication errors
        window.addEventListener('authError', (event) => {
            console.log('Authentication error event received:', event.detail);
            this.updateAuthUI();
            this.showMessage(event.detail.message || 'Authentication failed, please login again', 'warning');
        });

        // Initialize common components
        this.initCommonComponents();
    }

    updateAuthUI() {
        // Unified use of updateNavbar function to update navigation
        updateNavbar();
    }

    async updateCartBadge() {
        if (!this.isAuthenticated()) return;

        try {
            const user = this.getUser();
            if (!user || !user.user_id) return;

            // Use API service instead of direct fetch to utilize token checking mechanism
            const cartData = await window.API.cart.get(user.user_id);

            // Calculate total items based on returned data structure
            let totalItems = cartData.items_count || 0;
            if (!totalItems && Array.isArray(cartData.items)) {
                totalItems = cartData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            }

            const cartBadge = document.getElementById('cart-badge');
            if (cartBadge) {
                cartBadge.textContent = totalItems;
                cartBadge.style.display = totalItems > 0 ? 'inline' : 'none';
            }
        } catch (error) {
            console.error('Failed to update cart badge:', error);
            // If it's an authentication error, UI will automatically update
        }
    }

    isAuthenticated() {
        return window.AuthUtils.isTokenValid();
    }

    getUser() {
        return window.AuthUtils.getCurrentUser();
    }

    // Alternative method: Parse user info directly from token
    _getUserFromToken() {
        const token = localStorage.getItem('access_token');
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                user_id: payload.user_id,
                username: payload.username,
                user_name: payload.user_name
            };
        } catch (e) {
            console.error('Failed to parse user info:', e);
            return null;
        }
    }

    initCommonComponents() {
        // Initialize all tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Listen for cart updates
        window.addEventListener('cartUpdated', () => {
            this.updateCartBadge();
        });

        // Check authentication status when page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('Page became visible again, checking authentication status');
                this.updateAuthUI();
            }
        });
    }

    // Modified error handling in main.js
    setupErrorHandling() {
        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            // For authentication errors, don't show generic error messages
            if (event.error && event.error.message &&
                event.error.message.includes('Authentication')) {
                return;
            }
            this.showMessage('An error occurred, please refresh the page and try again', 'danger');
        });

        // Unhandled Promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise rejection:', event.reason);

            // If it's an authentication error, don't show generic error messages
            if (event.reason && event.reason.message &&
                (event.reason.message.includes('Authentication') ||
                 event.reason.message.includes('Token') ||
                 event.reason.message.includes('No token'))) {
                return;
            }

            this.showMessage('Operation failed, please try again', 'danger');
        });
    }

    setupPerformanceMonitoring() {
        // Performance monitoring (unchanged)
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const navigationTiming = performance.getEntriesByType('navigation')[0];
                if (navigationTiming) {
                    console.log('Page load time:', {
                        DNS_Query: `${navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart}ms`,
                        TCP_Connection: `${navigationTiming.connectEnd - navigationTiming.connectStart}ms`,
                        Request_Response: `${navigationTiming.responseEnd - navigationTiming.requestStart}ms`,
                        DOM_Parsing: `${navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart}ms`,
                        Full_Load: `${navigationTiming.loadEventEnd - navigationTiming.loadEventStart}ms`
                    });
                }
            });
        }
    }

    showMessage(message, type = 'info') {
        // Simple message notification implementation
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to top of page
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);

            // Automatically disappear after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 3000);
        }
    }
}

// Initialize application
window.onlineStoreApp = new OnlineStoreApp();

// Initialize after page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add page load animation
        document.body.classList.add('fade-in');

        // Set page title
        const pageTitle = document.querySelector('h1, h2')?.textContent || 'OnlineStore';
        document.title = `${pageTitle} - OnlineStore`;
    });
} else {
    // Add page load animation
    document.body.classList.add('fade-in');

    // Set page title
    const pageTitle = document.querySelector('h1, h2')?.textContent || 'OnlineStore';
    document.title = `${pageTitle} - OnlineStore`;
}

// Add global helper functions
window.checkAuth = function() {
    return window.AuthUtils ? window.AuthUtils.isTokenValid() : !!localStorage.getItem('access_token');
};

window.getCurrentUser = function() {
    if (window.AuthUtils && window.AuthUtils.getCurrentUser) {
        const user = window.AuthUtils.getCurrentUser();
        // Ensure user object contains admin information
        if (user && !user.hasOwnProperty('is_admin')) {
            // If AuthUtils returned user object doesn't have is_admin, parse from token
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    user.is_admin = payload.is_admin === true ||
                                   payload.role === 'admin' ||
                                   payload.admin === true;
                } catch (e) {
                    console.error('Failed to parse user info:', e);
                    user.is_admin = false;
                }
            }
        }
        return user;
    }
    return window.onlineStoreApp._getUserFromToken();
};

window.isAdminUser = function() {
    const user = window.getCurrentUser();
    return user ? user.is_admin : false;
};

// Synchronous admin permission check function (reference implementation from admin.js)
function checkAdminPermission() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.log('No access token found');
        return false;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload); // Debug info

        // Check if admin - compatible with multiple possible field names
        const isAdmin = payload.is_admin === true ||
                        payload.role === 'admin' ||
                        payload.admin === true;

        console.log('Admin check result:', isAdmin);
        return isAdmin;
    } catch (e) {
        console.error('Failed to parse user info:', e);
        return false;
    }
}

// Modified updateNavbar function, using synchronous permission check
function updateNavbar() {
    try {
        const isAuthenticated = window.checkAuth();
        const authLinks = document.getElementById('auth-links');

        if (!authLinks) {
            console.warn('auth-links element not found');
            return;
        }

        if (isAuthenticated) {
            const user = window.getCurrentUser();
            const username = user ? (user.user_name || user.username || 'User') : 'User';

            // Use synchronous admin permission check (consistent with admin.js)
            const isAdmin = checkAdminPermission();
            console.log('Navbar admin check result:', isAdmin);

            authLinks.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="cart.html">
                        <i class="bi bi-cart"></i> Cart
                        <span class="badge bg-primary cart-badge" id="cart-badge" style="display: none">0</span>
                    </a>
                </li>
                ${isAdmin ? `
                <li class="nav-item">
                    <a class="nav-link" href="admin.html">
                        <i class="bi bi-gear"></i> Management Tools
                    </a>
                </li>
                ` : ''}
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i> ${username}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person"></i> Profile</a></li>
                        <li><a class="dropdown-item" href="orders.html"><i class="bi bi-receipt"></i> My Orders</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
                    </ul>
                </li>
            `;

            // Update cart badge
            if (window.onlineStoreApp && typeof window.onlineStoreApp.updateCartBadge === 'function') {
                window.onlineStoreApp.updateCartBadge();
            }

        } else {
            // User not logged in
            authLinks.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="cart.html">
                        <i class="bi bi-cart"></i> Cart
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="login.html"><i class="bi bi-box-arrow-in-right"></i> Login</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="register.html"><i class="bi bi-person-plus"></i> Register</a>
                </li>
            `;
        }
    } catch (error) {
        console.error('updateNavbar error:', error);
    }
}

// Update global isAdminUser function to be consistent with checkAdminPermission
window.isAdminUser = function() {
    return checkAdminPermission();
};

// Update getCurrentUser function to ensure admin info is included
window.getCurrentUser = function() {
    let user = null;

    // Prioritize using AuthUtils
    if (window.AuthUtils && window.AuthUtils.getCurrentUser) {
        user = window.AuthUtils.getCurrentUser();
    }

    // If AuthUtils didn't return user, or user lacks admin info, parse from token
    if (!user || (!user.hasOwnProperty('is_admin') && !user.hasOwnProperty('role'))) {
        user = parseUserFromToken();
    }

    return user;
};

// Function specifically for parsing user info from token
function parseUserFromToken() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload); // Debug info

        // Use same logic as checkAdminPermission
        const isAdmin = payload.is_admin === true ||
                        payload.role === 'admin' ||
                        payload.admin === true;

        return {
            user_id: payload.user_id,
            username: payload.username,
            user_name: payload.user_name,
            is_admin: isAdmin,
            role: payload.role,
            admin: payload.admin
        };
    } catch (e) {
        console.error('Failed to parse user info:', e);
        return null;
    }
}

// Logout function
function logout() {
    if (window.AuthUtils) {
        window.AuthUtils.clearToken();
        window.AuthUtils.stopTokenMonitor();
    } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    updateNavbar();
    window.location.href = 'index.html';
}

// Add to global scope
window.updateNavbar = updateNavbar;
window.logout = logout;
window.checkAdminPermission = checkAdminPermission;

// Initialize navbar after page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateNavbar, 100);
});

// If page is already loaded, execute immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(updateNavbar, 100);
}