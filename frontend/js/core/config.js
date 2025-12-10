// Application Configuration
window.APP_CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:8000/api',
        TIMEOUT: 10000,
        RETRY_COUNT: 3
    },

    // Feature Toggles
    FEATURES: {
        CACHE_ENABLED: true,
        OFFLINE_SUPPORT: false,
        PUSH_NOTIFICATIONS: false
    },

    // UI Configuration
    UI: {
        ITEMS_PER_PAGE: 12,
        DEBOUNCE_DELAY: 500,
        MESSAGE_DURATION: 5000
    },

    // Default Values
    DEFAULTS: {
        PRODUCT_IMAGE: 'images/placeholder.jpg',
        AVATAR_IMAGE: 'images/avatar-placeholder.png'
    }
};