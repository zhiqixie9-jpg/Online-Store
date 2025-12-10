// product-detail.js - Product detail page specific logic

let currentProduct = null;
let currentProductId = null;

// Ensure updateNavbar function exists
if (typeof updateNavbar !== 'function') {
    console.warn('updateNavbar not defined, creating fallback function');
    window.updateNavbar = function() {
        console.log('updateNavbar fallback function called');
        const token = localStorage.getItem('access_token');
        const authLinks = document.getElementById('auth-links');
        if (authLinks) {
            if (token) {
                authLinks.innerHTML = '<li class="nav-item"><a class="nav-link" href="#" onclick="logout()">Logout</a></li>';
            } else {
                authLinks.innerHTML = '<li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>';
            }
        }
    };
}

// Check user authentication status
function checkAuth() {
    const token = localStorage.getItem('access_token');
    return !!token;
}

// Get current user information
function getCurrentUser() {
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

// Format price
function formatPrice(price) {
    return `$${parseFloat(price).toFixed(2)}`;
}

// Show message (commented out)
// function showMessage(message, type = 'info') {
//     // Simple message notification implementation
//     const alertDiv = document.createElement('div');
//     alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
//     alertDiv.innerHTML = `
//         ${message}
//         <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
//     `;
//
//     // Add to top of page
//     const container = document.querySelector('.container');
//     container.insertBefore(alertDiv, container.firstChild);
//
//     // Automatically disappear after 3 seconds
//     setTimeout(() => {
//         if (alertDiv.parentNode) {
//             alertDiv.remove();
//         }
//     }, 3000);
// }

// Show loading state
function showLoading(container) {
    container.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>Loading product information...</p>
        </div>
    `;
}

// Show error message
function showError(container, message) {
    container.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Failed to load</h4>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Reload</button>
            </div>
        </div>
    `;
}

// Token expired handling
function handleTokenExpired() {
    localStorage.removeItem('access_token');
    showMessage('Login expired, please login again', 'warning');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('product-detail.js loaded');

    // Update navigation bar
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }

    // Load product details
    loadProductDetail();
});

// Load product details
async function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        document.getElementById('productDetail').innerHTML = '<div class="alert alert-danger">Product ID not found</div>';
        return;
    }

    currentProductId = productId;
    const container = document.getElementById('productDetail');

    try {
        showLoading(container);

        // Get product details
        const response = await fetch(`http://localhost:8000/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Product does not exist');
        }

        const product = await response.json();
        currentProduct = product;

        // Render product details
        renderProductDetail(product);

        // Load product description and related information
        loadProductTabs(product);

        // Load related products
        loadRelatedProducts(product);

        // Check favorite status (if user is logged in)
        if (checkAuth()) {
            const user = getCurrentUser();
            checkFavoriteStatus(user.user_id, productId);
        }

    } catch (error) {
        console.error('Failed to load product details:', error);
        showError(container, 'Failed to load product details');
    }
}

// Render product details
function renderProductDetail(product) {
    const container = document.getElementById('productDetail');

    container.innerHTML = `
        <div class="col-md-6">
            <img src="../../images/placeholder.jpg" class="img-fluid product-detail-image" alt="${product.product_name}">
        </div>
        <div class="col-md-6">
            <h1>${product.product_name}</h1>
            <p class="text-muted">Category: ${product.type}</p>
            <p class="product-price h2 text-primary">${formatPrice(product.price)}</p>
            <p class="my-4">${product.description}</p>
            
            <div class="mb-3">
                <label for="quantity" class="form-label">Quantity</label>
                <input type="number" class="form-control" id="quantity" value="1" min="1" max="${product.stock_quantity}" style="width: 100px;">
            </div>

            <div class="d-grid gap-2 d-md-flex">
                <button class="btn btn-primary btn-lg" onclick="addToCartFromDetail(${product.product_id})" ${product.stock_quantity === 0 ? 'disabled' : ''}>
                    <i class="bi bi-cart-plus"></i> ${product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
                <button class="btn btn-outline-danger btn-lg" id="favoriteBtn" onclick="toggleFavorite(${product.product_id})">
                    <i class="bi bi-heart"></i> Favorite
                </button>
            </div>

            <div class="mt-4">
                <p>Stock: 
                    <span class="${product.stock_quantity > 0 ? 'text-success' : 'text-danger'}">
                        ${product.stock_quantity > 0 ? `In stock (${product.stock_quantity} items)` : 'Out of stock'}
                    </span>
                </p>
            </div>
        </div>
    `;

    // Update category in breadcrumb navigation
    document.getElementById('productCategory').textContent = product.type;
}

// Load product tab content
function loadProductTabs(product) {
    // Product description
    document.getElementById('productDescription').innerHTML = `
        <p>${product.description}</p>
        <p>This is a high-quality ${product.type} product, providing you with an excellent user experience.</p>
    `;

    // Specifications
    document.getElementById('productSpecs').innerHTML = `
        <table class="table">
            <tr>
                <th width="200">Product Name</th>
                <td>${product.product_name}</td>
            </tr>
            <tr>
                <th>Category</th>
                <td>${product.type}</td>
            </tr>
            <tr>
                <th>Price</th>
                <td>${formatPrice(product.price)}</td>
            </tr>
            <tr>
                <th>Stock</th>
                <td>${product.stock_quantity} items</td>
            </tr>
            <tr>
                <th>Product ID</th>
                <td>${product.product_id}</td>
            </tr>
        </table>
    `;

    // User reviews
    loadProductReviews(product.product_id);
}

// Load product reviews
async function loadProductReviews(productId) {
    const container = document.getElementById('productReviews');

    try {
        // Get product reviews
        const response = await fetch(`http://localhost:8000/api/reviews/product/${productId}`);

        if (response.ok) {
            const reviews = await response.json();
            renderProductReviews(container, reviews, productId);
        } else {
            throw new Error('Failed to get reviews');
        }
    } catch (error) {
        console.error('Failed to load product reviews:', error);
        container.innerHTML = `
            <div class="alert alert-warning">
                Failed to load reviews, please refresh and try again
            </div>
        `;
    }
}

// Check if user has purchased this product
async function checkUserPurchased(productId) {
    if (!checkAuth()) {
        return false;
    }

    const user = getCurrentUser();
    try {
        // Use API service to get orders
        const orders = await window.API.orders.getList(user.user_id);
        console.log('User order data:', orders); // For debugging

        // Ensure orders is an array
        if (!Array.isArray(orders)) {
            console.warn('Order data is not in array format:', orders);
            return false;
        }

        // Check if there are completed orders containing this product
        return orders.some(order => {
            // Check if order status is completed
            const isCompleted = order.status === 'completed';

            // Check if order items contain this product
            const hasProduct = order.items &&
                Array.isArray(order.items) &&
                order.items.some(item => item.product_id === productId);

            console.log(`Order ${order.order_id}: status=${order.status}, contains product=${hasProduct}`); // For debugging

            return isCompleted && hasProduct;
        });
    } catch (error) {
        console.error('Failed to check purchase record:', error);
        return false;
    }
}

// Render product reviews
async function renderProductReviews(container, reviews, productId) {
    const user = getCurrentUser();
    const hasPurchased = user ? await checkUserPurchased(productId) : false;

    let html = '';

    // Review form (only shown to logged-in users who have purchased the product)
    if (user && hasPurchased) {
        html += `
            <div class="card mb-4">
                <div class="card-body">
                    <h5 class="card-title">Submit Review</h5>
                    <form id="reviewForm">
                        <div class="mb-3">
                            <label class="form-label">Rating</label>
                            <div class="rating-stars">
                                ${[1,2,3,4,5].map(star => `
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="rating" id="star${star}" value="${star}" required>
                                        <label class="form-check-label" for="star${star}">
                                            ${'★'.repeat(star)}${'☆'.repeat(5-star)}
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="reviewContent" class="form-label">Review Content</label>
                            <textarea class="form-control" id="reviewContent" rows="3" placeholder="Share your user experience..." required></textarea>
                        </div>
                        <button type="button" class="btn btn-primary" onclick="submitReview(${productId})">Submit Review</button>
                    </form>
                </div>
            </div>
        `;
    } else if (user && !hasPurchased) {
        html += `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle"></i> Only users who have purchased this product can submit reviews
            </div>
        `;
    } else {
        html += `
            <div class="alert alert-info">
                Please <a href="login.html" class="alert-link">login</a> to submit reviews
            </div>
        `;
    }

    // Review list
    if (reviews && reviews.length > 0) {
        html += `
            <div class="reviews-list">
                <h5 class="mb-3">User Reviews (${reviews.length})</h5>
                ${reviews.map(review => `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <strong>${review.user_name}</strong>
                                    <div class="text-warning">
                                        ${'★'.repeat(Math.floor(review.rating))}${'☆'.repeat(5-Math.floor(review.rating))}
                                        <span class="text-muted ms-2">${review.rating} stars</span>
                                    </div>
                                </div>
                                <small class="text-muted">${review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}</small>
                            </div>
                            <p class="card-text">${review.content}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        html += `
            <div class="alert alert-info">
                No user reviews yet, be the first to review!
            </div>
        `;
    }

    container.innerHTML = html;
}

// Submit review
async function submitReview(productId) {
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const rating = document.querySelector('input[name="rating"]:checked');
    const content = document.getElementById('reviewContent').value.trim();
    const user = getCurrentUser();

    if (!rating) {
        showMessage('Please select a rating', 'warning');
        return;
    }

    if (!content) {
        showMessage('Please enter review content', 'warning');
        return;
    }

    try {
        const response = await fetch(`http://localhost:8000/api/reviews/${user.user_id}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                product_id: productId,
                rating: parseFloat(rating.value),
                content: content
            })
        });

        if (response.ok) {
            const result = await response.json();
            showMessage('Review submitted successfully', 'success');
            // Reload reviews
            loadProductReviews(productId);
            // Clear form
            document.getElementById('reviewForm').reset();
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Failed to submit review', 'danger');
        }
    } catch (error) {
        console.error('Failed to submit review:', error);
        showMessage('Failed to submit review, please try again', 'danger');
    }
}

// Load related products
async function loadRelatedProducts(product) {
    const container = document.getElementById('relatedProducts');

    try {
        // Get all products
        const response = await fetch('http://localhost:8000/api/products/');
        if (!response.ok) {
            throw new Error('Failed to get product list');
        }

        const allProducts = await response.json();

        console.log('All products:', allProducts); // For debugging
        console.log('Current product category:', product.type); // For debugging

        // Filter products in same category as related products
        const relatedProducts = allProducts.filter(p => {
            // Ensure not current product, and same category
            const isSameCategory = p.type && product.type &&
                                 p.type.toLowerCase() === product.type.toLowerCase();
            const isNotCurrent = p.product_id != product.product_id;

            return isSameCategory && isNotCurrent;
        }).slice(0, 4); // Show up to 4

        console.log('Filtered related products:', relatedProducts); // For debugging

        if (relatedProducts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="bi bi-info-circle"></i> No other products in same category
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = relatedProducts.map(p => `
            <div class="col-md-3 mb-4">
                <div class="card product-card h-100">
                    <img src="../../images/placeholder.jpg" class="card-img-top product-image" alt="${p.product_name}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${p.product_name}</h5>
                        <p class="card-text text-muted flex-grow-1">${p.description ? p.description.substring(0, 60) + '...' : 'No description available'}</p>
                        <div class="mt-auto">
                            <p class="product-price h5 text-primary mb-2">${formatPrice(p.price)}</p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="viewProduct(${p.product_id})">View Details</button>
                                <button class="btn btn-primary btn-sm" onclick="addToCartFromCard(${p.product_id})" ${p.stock_quantity === 0 ? 'disabled' : ''}>
                                    ${p.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load related products:', error);
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load related products
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadRelatedProducts(currentProduct)">Retry</button>
                </div>
            </div>
        `;
    }
}

// Add to cart from detail page
async function addToCartFromDetail(productId) {
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const user = getCurrentUser();

    try {
        // Use correct API endpoint - according to backend definition use /api/cart/{user_id}/add
        const response = await fetch(`http://localhost:8000/api/cart/${user.user_id}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                productId: productId,  // Note field name matches backend
                quantity: quantity
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add to cart');
        }

        const result = await response.json();

        if (result.success) {
            // Show success modal
            showAddToCartModal(currentProduct, quantity);

            // Trigger cart update event
            window.dispatchEvent(new Event('cartUpdated'));
        } else {
            showMessage(result.message || 'Failed to add to cart', 'warning');
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);

        let errorMessage = 'Failed to add to cart';
        if (error.message && error.message.includes('404')) {
            errorMessage = 'Product does not exist';
        } else if (error.message && error.message.includes('400')) {
            errorMessage = 'Insufficient stock';
        }

        showMessage(errorMessage, 'danger');
    }
}

// Add to cart from product card
async function addToCartFromCard(productId) {
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const user = getCurrentUser();
    try {
        // Use correct API endpoint - according to backend definition use /api/cart/{user_id}/add
        const response = await fetch(`http://localhost:8000/api/cart/${user.user_id}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
                productId: productId,  // Note field name matches backend
                quantity: 1
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage('Product added to cart', 'success');
                // Trigger cart update event
                window.dispatchEvent(new Event('cartUpdated'));
            } else {
                showMessage(result.message || 'Failed to add to cart', 'warning');
            }
        } else {
            throw new Error('Failed to add to cart');
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showMessage('Failed to add to cart', 'danger');
    }
}

// Show add to cart success modal
function showAddToCartModal(product, quantity) {
    document.getElementById('modalProductImage').src = '../images/placeholder.jpg';
    document.getElementById('modalProductName').textContent = product.product_name;
    document.getElementById('modalProductQuantity').textContent = quantity;
    document.getElementById('modalProductPrice').textContent = formatPrice(product.price * quantity);

    const modal = new bootstrap.Modal(document.getElementById('addToCartModal'));
    modal.show();
}

// Check favorite status
async function checkFavoriteStatus(userId, productId) {
    if (!checkAuth()) {
        console.log('User not logged in, skipping favorite status check');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const user = getCurrentUser();

        if (!token || !user) {
            console.log('Token or user info not found, skipping favorite status check');
            return;
        }

        // Ensure correct user ID is used
        const currentUserId = user.user_id;
        console.log('Checking favorite status, user ID:', currentUserId, 'product ID:', productId);

        // Use endpoint with path parameters
        const response = await fetch(`http://localhost:8000/api/favorites/${currentUserId}/check/${productId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const favoriteBtn = document.getElementById('favoriteBtn');

            if (result.is_favorite) {
                favoriteBtn.innerHTML = '<i class="bi bi-heart-fill"></i> Favorited';
                favoriteBtn.classList.remove('btn-outline-danger');
                favoriteBtn.classList.add('btn-danger');
            } else {
                favoriteBtn.innerHTML = '<i class="bi bi-heart"></i> Favorite';
                favoriteBtn.classList.remove('btn-danger');
                favoriteBtn.classList.add('btn-outline-danger');
            }
            console.log('Favorite status check successful:', result.is_favorite);
        } else if (response.status === 401) {
            console.warn('Token invalid, clearing local storage');
            handleTokenExpired();
        } else {
            console.error('Failed to check favorite status:', response.status);
        }
    } catch (error) {
        console.error('Failed to check favorite status:', error);
    }
}

// Toggle favorite status
async function toggleFavorite(productId) {
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const user = getCurrentUser();
    const favoriteBtn = document.getElementById('favoriteBtn');

    if (!user) {
        showMessage('Unable to get user info, please login again', 'warning');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            showMessage('Please login again', 'warning');
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }

        const currentUserId = user.user_id;
        console.log('Toggling favorite status, user ID:', currentUserId, 'product ID:', productId);

        // Use endpoint with path parameters
        const checkResponse = await fetch(`http://localhost:8000/api/favorites/${currentUserId}/check/${productId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (checkResponse.ok) {
            const checkResult = await checkResponse.json();

            if (checkResult.is_favorite) {
                // Remove favorite - use endpoint with path parameters
                const response = await fetch(`http://localhost:8000/api/favorites/${currentUserId}/remove/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        favoriteBtn.innerHTML = '<i class="bi bi-heart"></i> Favorite';
                        favoriteBtn.classList.remove('btn-danger');
                        favoriteBtn.classList.add('btn-outline-danger');
                        showMessage('Removed from favorites', 'info');
                    }
                } else if (response.status === 401) {
                    handleTokenExpired();
                } else {
                    throw new Error('Failed to remove favorite');
                }
            } else {
                // Add favorite - use endpoint with path parameters
                const response = await fetch(`http://localhost:8000/api/favorites/${currentUserId}/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        product_id: productId
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        favoriteBtn.innerHTML = '<i class="bi bi-heart-fill"></i> Favorited';
                        favoriteBtn.classList.remove('btn-outline-danger');
                        favoriteBtn.classList.add('btn-danger');
                        showMessage('Added to favorites', 'success');
                    }
                } else if (response.status === 401) {
                    handleTokenExpired();
                } else {
                    throw new Error('Failed to add favorite');
                }
            }
        } else if (checkResponse.status === 401) {
            handleTokenExpired();
        } else {
            throw new Error('Failed to check favorite status');
        }
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        showMessage('Operation failed, please try again', 'danger');
    }
}

// View product details
function viewProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

// Logout function
function logout() {
    localStorage.removeItem('access_token');
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }
    window.location.href = 'index.html';
}

// Add to global scope
window.addToCartFromDetail = addToCartFromDetail;
window.toggleFavorite = toggleFavorite;
window.viewProduct = viewProduct;
window.addToCartFromCard = addToCartFromCard;
window.logout = logout;
window.submitReview = submitReview;