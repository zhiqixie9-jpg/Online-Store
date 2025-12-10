// Modified JavaScript code in profile.html
let userProfile = null;
let currentFavorites = []; // Used to store current favorite list
let currentSort = 'default'; // Current sorting method

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = 'login.html';
        return;
    }

    // Initialize page
    initializeProfilePage();
});

// Check authentication status
function checkAuth() {
    return window.AuthUtils ? window.AuthUtils.isTokenValid() : !!localStorage.getItem('access_token');
}

function getCurrentUser() {
    if (window.AuthUtils && window.AuthUtils.getCurrentUser) {
        return window.AuthUtils.getCurrentUser();
    }

    // Backup solution: get from localStorage
    const userStr = localStorage.getItem('current_user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Failed to parse user info:', e);
        }
    }

    // Parse from token
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                user_id: payload.user_id,
                user_name: payload.username || payload.user_name,
                email: payload.email,
                is_member: payload.is_member || false,
                is_admin: payload.is_admin || false
            };
        } catch (e) {
            console.error('Failed to parse token:', e);
        }
    }

    return null;
}

// Add admin check function
function isAdminUser() {
    try {
        const user = getCurrentUser();
        if (!user) return false;

        // According to backend model, admin flag field is is_admin
        const isAdmin = user.is_admin === true;

        console.log('Admin check - User:', user.user_name, 'Is admin:', isAdmin);
        return isAdmin;

    } catch (error) {
        console.error('Failed to check admin status:', error);
        return false;
    }
}

// Price formatting function
function formatPrice(price) {
    const num = parseFloat(price);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
}

// Add API check at the beginning of profile.js
function checkAPIAvailability() {
    if (!window.API || !window.userAPI) {
        console.error('API module not loaded correctly');
        showMessage('System initialization failed, please refresh the page', 'danger');
        return false;
    }

    // Check if necessary API methods exist
    const requiredAPIs = ['userAPI', 'favoriteAPI', 'orderAPI', 'cartAPI'];
    for (const apiName of requiredAPIs) {
        if (!window[apiName]) {
            console.error(`${apiName} not defined`);
            showMessage('System module loading incomplete, please refresh the page', 'danger');
            return false;
        }
    }

    return true;
}

// Missing updateCurrentUser function
async function updateCurrentUser() {
    try {
        const user = getCurrentUser();
        if (!user || !user.user_id) {
            console.error('Unable to get current user info');
            return null;
        }

        // Get latest user info from server
        const updatedUser = await userAPI.getUserInfo(user.user_id);
        if (updatedUser) {
            // Update locally stored user info
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
            console.log('User info updated:', updatedUser);
            return updatedUser;
        }
    } catch (error) {
        console.error('Failed to update user info:', error);
    }
    return null;
}

// Missing removeExistingMessages function
function removeExistingMessages() {
    const existingMessages = document.querySelectorAll('.alert');
    existingMessages.forEach(message => {
        if (message.parentNode) {
            message.parentNode.removeChild(message);
        }
    });
}

async function initializeProfilePage() {
    try {
        // Check API availability
        if (!checkAPIAvailability()) {
            return;
        }

        // Force update user info from server
        await updateCurrentUser();

        await loadUserProfile();
        updateSidebar();
        showProfileInfo();

        // Check and display admin access
        checkAndDisplayAdminAccess();

        console.log('Profile center initialization completed, current user status:', userProfile);

    } catch (error) {
        console.error('Failed to initialize profile center:', error);
        showMessage('Failed to load profile', 'danger');
    }
}

// Check and display admin access
function checkAndDisplayAdminAccess() {
    try {
        const isAdmin = isAdminUser();
        console.log('Admin status check - Is admin:', isAdmin);

        // Show/hide sidebar admin section
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            adminSection.style.display = isAdmin ? 'block' : 'none';
            console.log('Sidebar admin section:', isAdmin ? 'shown' : 'hidden');
        }

        // Show/hide admin function card
        const adminCard = document.getElementById('adminCard');
        if (adminCard) {
            adminCard.style.display = isAdmin ? 'block' : 'none';
            console.log('Admin function card:', isAdmin ? 'shown' : 'hidden');
        }
    } catch (error) {
        console.error('Failed to check admin permissions:', error);
    }
}

// Update sidebar user info
function updateSidebar() {
    const user = getCurrentUser();
    if (user) {
        // Update avatar letter
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileAvatar) {
            profileAvatar.textContent = user.user_name ? user.user_name.charAt(0).toUpperCase() : 'U';
        }

        // Update username
        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) {
            profileUsername.textContent = user.user_name || 'User';
        }

        // Update membership status - fix here
        const profileMemberStatus = document.getElementById('profileMemberStatus');
        if (profileMemberStatus) {
            profileMemberStatus.textContent = user.is_member ? 'Member User' : 'Regular User';
        }

        // Asynchronously load favorite count and update sidebar
        loadFavoriteCount();
    }
}

async function loadFavoriteCount() {
    try {
        const user = getCurrentUser();
        const favorites = await favoriteAPI.getFavorites(user.user_id);
        const favoriteCount = favorites.length;

        // Update favorite menu item in sidebar
        const favoriteMenuItem = document.querySelector('a[onclick="showFavorites()"]');
        if (favoriteMenuItem) {
            const badge = favoriteMenuItem.querySelector('.badge') || document.createElement('span');
            badge.className = 'badge bg-primary ms-2';
            badge.textContent = favoriteCount;

            if (!favoriteMenuItem.querySelector('.badge')) {
                favoriteMenuItem.appendChild(badge);
            }
        }
    } catch (error) {
        console.error('Failed to load favorite count:', error);
    }
}

async function loadUserProfile() {
    try {
        // First try to get latest user info from API
        const updatedUser = await updateCurrentUser();
        if (updatedUser) {
            userProfile = updatedUser;
        } else {
            // If API fails, use locally stored user info
            const currentUser = getCurrentUser();
            if (currentUser) {
                userProfile = {
                    user_id: currentUser.user_id,
                    user_name: currentUser.user_name,
                    email: currentUser.email || `${currentUser.user_name}@example.com`,
                    tel: currentUser.tel || '12345678900',
                    is_member: currentUser.is_member || false,
                    is_admin: currentUser.is_admin || false
                };
            } else {
                throw new Error('Unable to get user info');
            }
        }

        console.log('User info used:', userProfile);

    } catch (error) {
        console.error('Failed to load user info:', error);
        throw error;
    }
}

// Load profile statistics
async function loadProfileStats() {
    try {
        const user = getCurrentUser();

        // Load order data
        let totalOrders = 0;
        let completedOrders = 0;
        try {
            const orders = await orderAPI.getOrders(user.user_id);
            totalOrders = orders.length;
            completedOrders = orders.filter(order => order.status === 'completed').length;
        } catch (error) {
            console.error('Failed to load order data:', error);
        }

        // Load favorite data
        let totalFavorites = 0;
        try {
            const favorites = await favoriteAPI.getFavorites(user.user_id);
            totalFavorites = favorites.length;
        } catch (error) {
            console.error('Failed to load favorite data:', error);
        }

        // Update statistics
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('completedOrders').textContent = completedOrders;
        document.getElementById('totalFavorites').textContent = totalFavorites;

    } catch (error) {
        console.error('Failed to load statistics:', error);
        // Set default values
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('completedOrders').textContent = '0';
        document.getElementById('totalFavorites').textContent = '0';
    }
}

function updateProfile() {
    const email = document.getElementById('email').value;
    const tel = document.getElementById('tel').value;
    const bio = document.getElementById('bio').value;

    // Should call update user info API here
    // Temporarily simulate success
    showMessage('Profile updated', 'success');

    // Update local user info
    const user = getCurrentUser();
    if (user) {
        user.email = email;
        user.tel = tel;
        localStorage.setItem('current_user', JSON.stringify(user));
    }
}

// ==================== Favorite Functions ====================

function setupFavoriteSearch() {
    const searchInput = document.getElementById('favoriteSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            searchFavorites();
        }, 300));

        // Enter key search
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchFavorites();
            }
        });
    }
}

function showFavorites() {
    const container = document.getElementById('profileContent');

    container.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">My Favorites</h5>
                <button class="btn btn-outline-danger btn-sm" onclick="clearAllFavorites()">Clear All</button>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="input-group">
                            <input type="text" class="form-control" placeholder="Search favorite products..." id="favoriteSearch">
                            <button class="btn btn-outline-primary" type="button" onclick="searchFavorites()">
                                <i class="bi bi-search"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-6 text-end">
                        <div class="btn-group">
                            <button class="btn btn-outline-secondary btn-sm" onclick="sortFavorites('name')">By Name</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="sortFavorites('price')">By Price</button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="sortFavorites('price-desc')">Price Desc</button>
                        </div>
                    </div>
                </div>
                <div id="favoritesList" class="row">
                    <div class="col-12 text-center py-4">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p>Loading favorite list...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupFavoriteSearch();
    loadFavorites();
}

// Unified favorite loading function
async function loadFavorites() {
    try {
        const user = getCurrentUser();
        currentFavorites = await favoriteAPI.getFavorites(user.user_id);
        console.log('Favorite list data:', currentFavorites);

        const container = document.getElementById('favoritesList');

        if (!currentFavorites || currentFavorites.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="mb-4">
                        <i class="bi bi-heart" style="font-size: 3rem; color: #6c757d;"></i>
                    </div>
                    <h4 class="text-muted">No favorite products</h4>
                    <p class="text-muted mb-4">You haven't favorited any products yet</p>
                    <a href="products.html" class="btn btn-primary">Discover Products</a>
                </div>
            `;
            return;
        }

        // Apply current sorting
        applyCurrentSort();
        updateFavoriteCount();

    } catch (error) {
        console.error('Failed to load favorite list:', error);
        const container = document.getElementById('favoritesList');
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="text-danger">Failed to load favorite list</p>
                <button class="btn btn-primary" onclick="loadFavorites()">Retry</button>
            </div>
        `;
    }
}

function applyCurrentSort() {
    let sortedFavorites = [...currentFavorites];

    switch (currentSort) {
        case 'name':
            sortedFavorites.sort((a, b) => a.product_name.localeCompare(b.product_name));
            break;
        case 'price':
            sortedFavorites.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sortedFavorites.sort((a, b) => b.price - a.price);
            break;
        case 'date':
            // If backend provides favorite time, can sort by time
            // Assuming sort by product ID as example here
            sortedFavorites.sort((a, b) => b.product_id - a.product_id);
            break;
        default:
            // Default sort, keep original order
            break;
    }

    renderFavorites(sortedFavorites);
}

function renderFavorites(favorites) {
    const container = document.getElementById('favoritesList');

    container.innerHTML = favorites.map(product => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card product-card h-100">
                <div class="position-relative">
                    <img src="images/placeholder.jpg" class="card-img-top product-image" alt="${product.product_name}">
                    ${product.stock_quantity === 0 ? 
                        '<span class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 small rounded-bottom-end">Out of Stock</span>' : 
                        ''}
                    <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2" 
                            onclick="removeFavoriteFromList(${product.product_id})"
                            title="Remove Favorite">
                        <i class="bi bi-heart-fill"></i>
                    </button>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.product_name}</h5>
                    <p class="card-text text-muted flex-grow-1">${product.description ? product.description.substring(0, 80) + '...' : 'No description available'}</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="product-price h5 text-primary mb-0">${formatPrice(product.price)}</span>
                            <span class="badge bg-secondary">${product.type || 'Uncategorized'}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">Stock: ${product.stock_quantity || 0}</small>
                            <small class="text-muted">ID: ${product.product_id}</small>
                        </div>
                        <div class="d-grid gap-2 mt-3">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewProduct(${product.product_id})">
                                <i class="bi bi-eye"></i> View Details
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="addToCartFromFavorite(${product.product_id})" 
                                    ${product.stock_quantity === 0 ? 'disabled' : ''}>
                                <i class="bi bi-cart-plus"></i> ${product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Add to cart from favorite page
async function addToCartFromFavorite(productId) {
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        return;
    }

    const user = getCurrentUser();
    try {
        const result = await cartAPI.addToCart(user.user_id, productId, 1);
        if (result.success) {
            showMessage('Product added to cart', 'success');
        } else {
            showMessage(result.message || 'Failed to add to cart', 'warning');
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showMessage('Failed to add to cart', 'danger');
    }
}

// Remove single product from favorite list
async function removeFavoriteFromList(productId) {
    if (!confirm('Are you sure you want to remove this product from favorites?')) {
        return;
    }

    try {
        const user = getCurrentUser();
        await favoriteAPI.removeFavorite(user.user_id, productId);
        showMessage('Removed from favorites', 'success');

        // Reload favorite list
        await loadFavorites();
        // Update sidebar favorite count
        loadFavoriteCount();
    } catch (error) {
        console.error('Failed to remove favorite:', error);
        showMessage('Failed to remove favorite', 'danger');
    }
}

// Clear all favorites
async function clearAllFavorites() {
    if (!confirm('Are you sure you want to clear all favorites? This action cannot be undone.')) {
        return;
    }

    try {
        const user = getCurrentUser();
        const favorites = await favoriteAPI.getFavorites(user.user_id);

        if (favorites.length === 0) {
            showMessage('Favorite list is already empty', 'info');
            return;
        }

        // Delete favorites one by one
        let successCount = 0;
        for (const product of favorites) {
            try {
                await favoriteAPI.removeFavorite(user.user_id, product.product_id);
                successCount++;
            } catch (error) {
                console.error(`Failed to remove favorite ${product.product_id}:`, error);
            }
        }

        if (successCount > 0) {
            showMessage(`Cleared ${successCount} favorites`, 'success');
        } else {
            showMessage('Failed to clear favorites', 'danger');
        }

        // Reload favorite list
        await loadFavorites();
        // Update sidebar favorite count
        loadFavoriteCount();
    } catch (error) {
        console.error('Failed to clear favorites:', error);
        showMessage('Failed to clear favorites', 'danger');
    }
}

// Search favorite products
function searchFavorites() {
    const searchTerm = document.getElementById('favoriteSearch').value.toLowerCase();
    const favoriteItems = document.querySelectorAll('#favoritesList .col-md-6');

    favoriteItems.forEach(item => {
        const productName = item.querySelector('.card-title').textContent.toLowerCase();
        const productDescription = item.querySelector('.card-text').textContent.toLowerCase();

        if (productName.includes(searchTerm) || productDescription.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Sort favorite products
async function sortFavorites(sortBy) {
    currentSort = sortBy;
    applyCurrentSort();
    showMessage(`Sorted by ${getSortText(sortBy)}`, 'info');
}

function getSortText(sortBy) {
    const sortTexts = {
        'name': 'Product Name',
        'price': 'Price: Low to High',
        'price-desc': 'Price: High to Low',
        'date': 'Favorite Time',
        'default': 'Default'
    };
    return sortTexts[sortBy] || 'Default';
}

function updateFavoriteCount() {
    const countElement = document.getElementById('totalFavorites');
    if (countElement) {
        countElement.textContent = currentFavorites.length;
    }
}

// ==================== Other Functions ====================

// View product details
function viewProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

function showSecurity() {
    const container = document.getElementById('profileContent');

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Account Security</h5>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <strong>Security Tip:</strong> Regularly changing your password can increase account security.
                </div>

                <form id="securityForm">
                    <div class="mb-3">
                        <label for="currentPassword" class="form-label">Current Password</label>
                        <input type="password" class="form-control" id="currentPassword" required>
                    </div>
                    <div class="mb-3">
                        <label for="newPassword" class="form-label">New Password</label>
                        <input type="password" class="form-control" id="newPassword" required>
                        <div class="form-text">Password must be at least 6 characters long</div>
                    </div>
                    <div class="mb-3">
                        <label for="confirmNewPassword" class="form-label">Confirm New Password</label>
                        <input type="password" class="form-control" id="confirmNewPassword" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('securityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        changePassword();
    });
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters long', 'danger');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showMessage('New passwords do not match', 'danger');
        return;
    }

    // Should call change password API here
    // Temporarily simulate success
    showMessage('Password changed successfully', 'success');

    // Clear form
    document.getElementById('securityForm').reset();
}

// Add to cart from product card
async function addToCartFromCard(productId) {
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        return;
    }

    const user = getCurrentUser();
    try {
        const result = await cartAPI.addToCart(user.user_id, productId, 1);
        if (result.success) {
            showMessage('Product added to cart', 'success');
        } else {
            showMessage(result.message || 'Failed to add to cart', 'warning');
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showMessage('Failed to add to cart', 'danger');
    }
}

// In showProfileInfo function, add manual update button
function showProfileInfo() {
    const container = document.getElementById('profileContent');

    if (!userProfile) {
        container.innerHTML = '<div class="alert alert-danger">Unable to load user info</div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Profile</h5>
            </div>
            <div class="card-body">
                <form id="profileForm">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="username" class="form-label">Username</label>
                            <input type="text" class="form-control" id="username" value="${userProfile.user_name}" readonly>
                            <div class="form-text">Username cannot be changed</div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="email" class="form-label">Email Address</label>
                            <input type="email" class="form-control" id="email" value="${userProfile.email || ''}">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="tel" class="form-label">Phone Number</label>
                            <input type="tel" class="form-control" id="tel" value="${userProfile.tel || ''}">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Membership Status</label>
                            <div>
                                <span class="badge ${userProfile.is_member ? 'bg-warning' : 'bg-secondary'}" id="memberStatusBadge">
                                    ${userProfile.is_member ? 'Member User' : 'Regular User'}
                                </span>
                                <div class="form-text" id="memberStatusText">
                                    ${userProfile.is_member ? 
                                        'You are our valued member!' : 
                                        'Become a member: Complete any order to upgrade to member'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="bio" class="form-label">Personal Introduction</label>
                        <textarea class="form-control" id="bio" rows="3" placeholder="Introduce yourself...">Shopping enthusiast</textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
        </div>

        <!-- Statistics -->
        <div class="row mt-4">
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h3 class="text-primary" id="totalOrders">0</h3>
                        <p class="text-muted">All Orders</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h3 class="text-success" id="completedOrders">0</h3>
                        <p class="text-muted">Completed</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h3 class="text-warning" id="totalFavorites">0</h3>
                        <p class="text-muted">My Favorites</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add form submit event
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateProfile();
    });

    // Load statistics
    loadProfileStats();
}