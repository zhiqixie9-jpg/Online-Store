class Utils {
    // Message notification system
    static showMessage(message, type = 'info', duration = 5000) {
        Utils.removeExistingMessages();

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show message-toast`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        document.body.appendChild(alert);

        // Auto hide
        if (duration > 0) {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, duration);
        }

        return alert;
    }

    static removeExistingMessages() {
        document.querySelectorAll('.message-toast').forEach(alert => {
            alert.remove();
        });
    }
    
    // Formatting functions
    static formatPrice(price) {
        const num = parseFloat(price);
        if (isNaN(num)) return '¥0.00';
        return `¥${num.toFixed(2)}`;
    }
    
    static formatDate(dateString) {
        if (!dateString) return 'Unknown Time';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return `Today ${date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
            })}`;
        } else if (days === 1) {
            return `Yesterday ${date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
            })}`;
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString('en-US');
        }
    }
    
    // Debounce and throttle
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Loading state management
    static showLoading(container, message = 'Loading...') {
        if (!container) return;
        
        container.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">${message}</span>
                </div>
                <p class="mt-2 text-muted">${message}</p>
            </div>
        `;
    }
    
    static showError(container, message = 'Loading failed, please try again', showRetry = true) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <div class="mb-3">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                </div>
                <h5>${message}</h5>
                ${showRetry ? `
                    <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                        Reload
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    // Local storage management
    static storage = {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Failed to store data:', error);
                return false;
            }
        },
        
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Failed to read data:', error);
                return defaultValue;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to delete data:', error);
                return false;
            }
        },
        
        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Failed to clear storage:', error);
                return false;
            }
        }
    };
    
    // Form validation
    static validate = {
        email: (email) => {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },
        
        phone: (phone) => {
            const regex = /^1[3-9]\d{9}$/;
            return regex.test(phone);
        },
        
        password: (password) => {
            return password.length >= 6;
        },
        
        required: (value) => {
            return value !== null && value !== undefined && value.toString().trim() !== '';
        }
    };
    
    // URL operations
    static getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    static updateUrlParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        window.history.replaceState({}, '', url);
    }
    
    // Performance monitoring
    static perf = {
        start: (name) => {
            if (!window.performance) return;
            performance.mark(`${name}-start`);
        },
        
        end: (name) => {
            if (!window.performance) return;
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
            
            const measures = performance.getEntriesByName(name);
            const lastMeasure = measures[measures.length - 1];
            console.log(`${name} took: ${lastMeasure.duration.toFixed(2)}ms`);
        }
    };
}

// Export to global scope
window.Utils = Utils;
window.formatPrice = Utils.formatPrice;
window.showMessage = Utils.showMessage;
window.showLoading = Utils.showLoading;
window.showError = Utils.showError;
window.debounce = Utils.debounce;