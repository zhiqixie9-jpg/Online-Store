// Homepage functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Homepage initialization starting...');

    loadFeaturedProducts();
    loadCategories();
});

// Load featured products
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) {
        console.error('Featured products container not found');
        return;
    }

    try {
        console.log('Loading featured products...');

        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>Loading products...</p>
            </div>
        `;

        // Use API module to load products
        const products = await API.products.getList({ limit: 8 });
        console.log('Featured products data:', products);

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">No products available</p>
                </div>
            `;
            return;
        }

        // Render products
        container.innerHTML = products.map(product => `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="card product-card h-100">
                    <img src="${window.APP_CONFIG?.DEFAULTS?.PRODUCT_IMAGE || 'img/default-product.jpg'}" 
                         class="card-img-top product-image" alt="${product.product_name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${product.product_name}</h5>
                        <p class="card-text text-muted flex-grow-1">
                            ${product.description ? product.description.substring(0, 60) + '...' : 'No description available'}
                        </p>
                        <div class="mt-auto">
                            <p class="product-price">${Utils.formatPrice ? Utils.formatPrice(product.price) : '$' + product.price}</p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="viewProduct(${product.product_id})">
                                    View Details
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="addToCartFromCard(${product.product_id})">
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        console.log('Featured products loaded successfully');

    } catch (error) {
        console.error('Failed to load products:', error);

        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning">
                    <h5>Failed to load products</h5>
                    <p>${error.message || 'Please check your network connection and try again later'}</p>
                    <button class="btn btn-primary mt-2" onclick="loadFeaturedProducts()">Reload</button>
                </div>
            </div>
        `;
    }
}

// Fix category loading function
async function loadCategories() {
    const container = document.getElementById('categories-list'); // Fixed container ID
    if (!container) {
        console.error('Categories container not found');
        return;
    }

    try {
        console.log('Loading categories...');

        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>Loading categories...</p>
            </div>
        `;

        // Use correct API call method
        const categories = await API.products.getCategories();
        console.log('Categories data:', categories);

        if (!categories || categories.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted"><p>No categories available</p></div>';
            return;
        }

        // Directly render categories, without using undefined renderCategories function
        container.innerHTML = categories.map(category => `
            <div class="col-md-3 col-6 mb-3">
                <a href="products.html?type=${encodeURIComponent(category)}" class="category-card text-decoration-none">
                    <div class="card text-center h-100">
                        <div class="card-body">
                            <h5 class="card-title">${category}</h5>
                            <p class="card-text text-muted">Browse related products</p>
                        </div>
                    </div>
                </a>
            </div>
        `).join('');

        console.log('Categories loaded successfully');

    } catch (error) {
        console.error('Failed to load categories:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });

        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning">
                    <h5>Failed to load categories</h5>
                    <p>${error.message || 'Please check your network connection and try again later'}</p>
                    <button class="btn btn-primary mt-2" onclick="loadCategories()">Reload</button>
                </div>
            </div>
        `;
    }
}

// View product details
function viewProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

// Add to cart from product card - fix authentication check
async function addToCartFromCard(productId) {
    // Use AuthUtils to check authentication status
    if (!window.AuthUtils || !window.AuthUtils.isTokenValid()) {
        // Use simple alert since Utils.showMessage might not be defined
        alert('Please login first');
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const user = window.AuthUtils.getCurrentUser();
    if (!user) {
        alert('Unable to get user information, please login again');
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    console.log(`Adding product to cart: user_id=${user.user_id}, product_id=${productId}`);

    try {
        const result = await API.cart.add(user.user_id, productId, 1);
        console.log('Add to cart result:', result);

        if (result.success) {
            alert('Product added to cart');

            // Trigger cart update event
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } else {
            alert(result.message || 'Failed to add to cart');
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);

        // Handle authentication error
        if (error.message && error.message.includes('Authentication')) {
            alert('Please login again');
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
        } else {
            let errorMessage = 'Failed to add to cart';
            if (error.message) {
                if (error.message.includes('404')) {
                    errorMessage = 'Product not found';
                } else if (error.message.includes('400')) {
                    errorMessage = 'Insufficient stock';
                } else if (error.message.includes('500')) {
                    errorMessage = 'Server error, please try again later';
                }
            }
            alert(errorMessage);
        }
    }
}