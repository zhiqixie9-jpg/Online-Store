class ProductCard {
    constructor(product, options = {}) {
        this.product = product;
        this.options = {
            showFavorite: true,
            showDescription: true,
            showCategory: true,
            compact: false,
            ...options
        };
    }

    render() {
        const { product, options } = this;

        return `
            <div class="card product-card h-100">
                <div class="position-relative">
                    <img src="${window.APP_CONFIG.DEFAULTS.PRODUCT_IMAGE}" 
                         class="card-img-top product-image" 
                         alt="${product.product_name}"
                         loading="lazy">
                    
                    ${product.stock_quantity === 0 ? 
                        '<span class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 small rounded-bottom-end">Out of Stock</span>' : 
                        ''}
                    
                    ${options.showFavorite ? this.renderFavoriteButton() : ''}
                </div>
                
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.product_name}</h5>
                    
                    ${options.showDescription && product.description ? 
                        `<p class="card-text text-muted flex-grow-1">
                            ${product.description.substring(0, 80)}...
                         </p>` : 
                         ''}
                    
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="product-price h5 text-primary mb-0">
                                ${Utils.formatPrice(product.price)}
                            </span>
                            ${options.showCategory ? 
                                `<span class="badge bg-secondary">${product.type}</span>` : 
                                ''}
                        </div>
                        
                        ${!options.compact ? `
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <small class="text-muted">Stock: ${product.stock_quantity}</small>
                                <small class="text-muted">ID: ${product.product_id}</small>
                            </div>
                        ` : ''}
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="ProductCard.viewProduct(${product.product_id})">
                                <i class="bi bi-eye"></i> View Details
                            </button>
                            <button class="btn btn-primary btn-sm" 
                                    onclick="ProductCard.addToCart(${product.product_id})"
                                    ${product.stock_quantity === 0 ? 'disabled' : ''}>
                                <i class="bi bi-cart-plus"></i> 
                                ${product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFavoriteButton() {
        const { product } = this;

        return `
            <button class="btn btn-sm position-absolute top-0 end-0 m-2 btn-favorite" 
                    onclick="ProductCard.toggleFavorite(${product.product_id}, this)"
                    data-product-id="${product.product_id}">
                <i class="bi bi-heart"></i>
            </button>
        `;
    }

    static async toggleFavorite(productId, button) {
        if (!authManager.isAuthenticated()) {
            Utils.showMessage('Please log in first', 'warning');
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }

        const user = authManager.getUser();
        const isFavorite = button.classList.contains('active');

        try {
            if (isFavorite) {
                await API.favorites.remove(user.user_id, productId);
                button.classList.remove('active', 'btn-danger');
                button.classList.add('btn-outline-danger');
                button.innerHTML = '<i class="bi bi-heart"></i>';
                Utils.showMessage('Removed from favorites', 'info');
            } else {
                await API.favorites.add(user.user_id, productId);
                button.classList.add('active', 'btn-danger');
                button.classList.remove('btn-outline-danger');
                button.innerHTML = '<i class="bi bi-heart-fill"></i>';
                Utils.showMessage('Added to favorites', 'success');
            }
        } catch (error) {
            console.error('Favorite operation failed:', error);
            Utils.showMessage('Operation failed, please try again', 'danger');
        }
    }

    static viewProduct(productId) {
        window.location.href = `product-detail.html?id=${productId}`;
    }

    static async addToCart(productId) {
        if (!authManager.isAuthenticated()) {
            Utils.showMessage('Please log in first', 'warning');
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }

        const user = authManager.getUser();

        try {
            const result = await API.cart.add(user.user_id, productId, 1);

            if (result.success) {
                Utils.showMessage('Product added to cart', 'success');

                // Trigger cart update event
                window.dispatchEvent(new CustomEvent('cartUpdated'));
            } else {
                Utils.showMessage(result.message || 'Failed to add to cart', 'warning');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            Utils.showMessage('Failed to add to cart', 'danger');
        }
    }

    static async updateFavoriteStatus(productId, button) {
        if (!authManager.isAuthenticated()) return;

        const user = authManager.getUser();

        try {
            const result = await API.favorites.check(user.user_id, productId);

            if (result.is_favorite) {
                button.classList.add('active', 'btn-danger');
                button.classList.remove('btn-outline-danger');
                button.innerHTML = '<i class="bi bi-heart-fill"></i>';
            } else {
                button.classList.remove('active', 'btn-danger');
                button.classList.add('btn-outline-danger');
                button.innerHTML = '<i class="bi bi-heart"></i>';
            }
        } catch (error) {
            console.error('Failed to check favorite status:', error);
        }
    }
}

// Export to global scope
window.ProductCard = ProductCard;