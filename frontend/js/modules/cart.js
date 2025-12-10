class CartPage {
    constructor() {
        this.cartData = null;
        this.init();
    }
    
    async init() {
        // Use unified authentication check
        if (!window.checkAuth()) {
            this.showLoginRequired();
            return;
        }
        
        await this.loadCart();
        this.setupEventListeners();
    }
    
    async loadCart() {
        // Use unified user retrieval function
        const user = window.getCurrentUser();
        const container = document.getElementById('cart-content');

        if (!user) {
            this.showLoginRequired();
            return;
        }

        Utils.showLoading(container, 'Loading cart...');

        try {
            // Use unified API call
            this.cartData = await window.API.cart.get(user.user_id);
            this.renderCart();
        } catch (error) {
            console.error('Failed to load cart:', error);

            // If it's an authentication error, show appropriate prompt
            if (error.message && error.message.includes('Authentication')) {
                this.showLoginRequired();
            } else {
                Utils.showError(container, 'Failed to load cart, please try again');
            }
        }
    }

    renderCart() {
        const container = document.getElementById('cart-content');
        if (!container) return;

        if (!this.cartData || !this.cartData.items || this.cartData.items.length === 0) {
            container.innerHTML = this.getEmptyCartHTML();
            return;
        }

        container.innerHTML = this.getCartHTML();
        this.bindCartEvents();
    }

    getEmptyCartHTML() {
        return `
            <div class="text-center py-5">
                <div class="empty-state">
                    <i class="bi bi-cart empty-state-icon"></i>
                    <h4 class="text-muted">Cart is empty</h4>
                    <p class="text-muted mb-4">Go pick some products!</p>
                    <a href="products.html" class="btn btn-primary">Go Shopping</a>
                </div>
            </div>
        `;
    }

    getCartHTML() {
        const { cartData } = this;
        const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);

        return `
            <div class="row">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Cart Items (${totalItems} items)</h5>
                            <button class="btn btn-outline-danger btn-sm" onclick="cartPage.clearCart()">
                                Clear Cart
                            </button>
                        </div>
                        <div class="card-body p-0">
                            ${cartData.items.map(item => this.getCartItemHTML(item)).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-4">
                    <div class="card sticky-top" style="top: 100px;">
                        <div class="card-header">
                            <h5 class="mb-0">Order Summary</h5>
                        </div>
                        <div class="card-body">
                            ${this.getOrderSummaryHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCartItemHTML(item) {
        return `
            <div class="cart-item" id="cart-item-${item.product_id}" data-product-id="${item.product_id}">
                <div class="cart-item-image">
                    <img src="images/placeholder.jpg" alt="${item.product_name}" class="rounded">
                </div>
                
                <div class="cart-item-info">
                    <h5 class="mb-1">${item.product_name}</h5>
                    <p class="text-muted mb-0">Unit Price: ${Utils.formatPrice(item.price)}</p>
                    ${item.stock_quantity < item.quantity ? 
                        '<small class="text-danger">Insufficient stock</small>' : ''}
                </div>
                
                <div class="cart-item-quantity">
                    <div class="quantity-controls">
                        <button class="btn btn-outline-secondary btn-quantity decrease-btn" 
                                data-product-id="${item.product_id}">-</button>
                        <span class="mx-2 quantity-display" id="quantity-${item.product_id}">
                            ${item.quantity}
                        </span>
                        <button class="btn btn-outline-secondary btn-quantity increase-btn" 
                                data-product-id="${item.product_id}">+</button>
                    </div>
                </div>
                
                <div class="cart-item-subtotal">
                    <span id="subtotal-${item.product_id}">${Utils.formatPrice(item.subtotal)}</span>
                </div>
                
                <div class="cart-item-actions">
                    <button class="btn btn-outline-danger btn-sm remove-btn" 
                            data-product-id="${item.product_id}">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    getOrderSummaryHTML() {
        const { cartData } = this;
        const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);

        return `
            <div class="d-flex justify-content-between mb-2">
                <span>Total Items:</span>
                <span id="total-items">${totalItems} items</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span id="total-amount">${Utils.formatPrice(cartData.total)}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>$0.00</span>
            </div>
            <hr>
            <div class="d-flex justify-content-between mb-3">
                <strong>Total:</strong>
                <strong class="text-primary h5" id="final-total">${Utils.formatPrice(cartData.total)}</strong>
            </div>
            <div class="d-grid">
                <button class="btn btn-primary btn-lg" id="checkout-btn">
                    Proceed to Checkout
                </button>
            </div>
            <div class="d-grid mt-2">
                <a href="products.html" class="btn btn-outline-primary">
                    Continue Shopping
                </a>
            </div>
        `;
    }

    bindCartEvents() {
        // Bind product item click events
        document.querySelectorAll('.cart-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                const productId = item.getAttribute('data-product-id');
                this.viewProduct(productId);
            });
        });

        // Bind quantity control events
        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.getAttribute('data-product-id'));
                const currentQuantity = parseInt(document.getElementById(`quantity-${productId}`).textContent);
                this.updateQuantity(productId, currentQuantity - 1);
            });
        });

        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.getAttribute('data-product-id'));
                const currentQuantity = parseInt(document.getElementById(`quantity-${productId}`).textContent);
                this.updateQuantity(productId, currentQuantity + 1);
            });
        });

        // Bind delete events
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.getAttribute('data-product-id'));
                this.removeItem(productId);
            });
        });

        // Bind checkout event
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }
    }

    setupEventListeners() {
        // Listen for cart update events
        window.addEventListener('cartUpdated', () => {
            this.loadCart();
        });
    }

    async updateQuantity(productId, newQuantity) {
        if (newQuantity < 1) {
            this.removeItem(productId);
            return;
        }

        // Use unified user retrieval function
        const user = window.getCurrentUser();

        try {
            // Immediately update UI
            document.getElementById(`quantity-${productId}`).textContent = newQuantity;

            // Calculate new subtotal
            const item = this.cartData.items.find(item => item.product_id === productId);
            if (item) {
                const newSubtotal = item.price * newQuantity;
                document.getElementById(`subtotal-${productId}`).textContent = Utils.formatPrice(newSubtotal);
                this.updateTotalAmount();
            }

            // Call API - use unified API call
            await window.API.cart.update(user.user_id, productId, newQuantity);

            // Update local data
            const itemIndex = this.cartData.items.findIndex(item => item.product_id === productId);
            if (itemIndex !== -1) {
                this.cartData.items[itemIndex].quantity = newQuantity;
                this.cartData.items[itemIndex].subtotal = this.cartData.items[itemIndex].price * newQuantity;
            }

            this.updateTotalAmount();
            //Utils.showMessage('Quantity updated', 'success');

        } catch (error) {
            console.error('Failed to update quantity:', error);

            // Handle authentication error
            if (error.message && error.message.includes('Authentication')) {
                Utils.showMessage('Please login again', 'warning');
            } else {
                Utils.showMessage('Failed to update quantity', 'danger');
            }
            this.loadCart(); // Reload to restore correct state
        }
    }

    async removeItem(productId) {
        if (!confirm('Are you sure you want to remove this item from your cart?')) {
            return;
        }

        // Use unified user retrieval function
        const user = window.getCurrentUser();
        const itemElement = document.getElementById(`cart-item-${productId}`);

        try {
            // Immediately update UI
            if (itemElement) {
                itemElement.style.opacity = '0.5';
                itemElement.style.pointerEvents = 'none';
            }

            // Use unified API call
            await window.API.cart.remove(user.user_id, productId);

            // Update local data
            this.cartData.items = this.cartData.items.filter(item => item.product_id !== productId);

            if (this.cartData.items.length === 0) {
                this.renderCart();
            } else {
                this.updateTotalAmount();
            }

            Utils.showMessage('Item removed from cart', 'success');

            // Trigger cart update event
            window.dispatchEvent(new CustomEvent('cartUpdated'));

        } catch (error) {
            console.error('Failed to remove item:', error);

            // Handle authentication error
            if (error.message && error.message.includes('Authentication')) {
                Utils.showMessage('Please login again', 'warning');
            } else {
                Utils.showMessage('Failed to remove item', 'danger');
            }
            this.loadCart(); // Reload to restore correct state
        }
    }

    async clearCart() {
        if (!confirm('Are you sure you want to clear your entire cart? This action cannot be undone.')) {
            return;
        }

        // Use unified user retrieval function
        const user = window.getCurrentUser();

        try {
            // Delete all items one by one
            const deletePromises = this.cartData.items.map(item =>
                // Use unified API call
                window.API.cart.remove(user.user_id, item.product_id)
            );

            await Promise.allSettled(deletePromises);

            this.cartData.items = [];
            this.renderCart();

            Utils.showMessage('Cart cleared successfully', 'success');

            // Trigger cart update event
            window.dispatchEvent(new CustomEvent('cartUpdated'));

        } catch (error) {
            console.error('Failed to clear cart:', error);

            // Handle authentication error
            if (error.message && error.message.includes('Authentication')) {
                Utils.showMessage('Please login again', 'warning');
            } else {
                Utils.showMessage('Failed to clear cart', 'danger');
            }
        }
    }

    updateTotalAmount() {
        if (!this.cartData || !this.cartData.items) return;

        let totalItems = 0;
        let totalAmount = 0;

        this.cartData.items.forEach(item => {
            totalItems += item.quantity;
            totalAmount += item.subtotal;
        });

        // Update UI
        const totalItemsElement = document.getElementById('total-items');
        const totalAmountElement = document.getElementById('total-amount');
        const finalTotalElement = document.getElementById('final-total');

        if (totalItemsElement) totalItemsElement.textContent = `${totalItems} items`;
        if (totalAmountElement) totalAmountElement.textContent = Utils.formatPrice(totalAmount);
        if (finalTotalElement) finalTotalElement.textContent = Utils.formatPrice(totalAmount);

        // Update local data
        this.cartData.total = totalAmount;
    }

    proceedToCheckout() {
        if (!this.cartData || !this.cartData.items || this.cartData.items.length === 0) {
            Utils.showMessage('Cart is empty', 'warning');
            return;
        }

        // Check stock
        const outOfStockItems = this.cartData.items.filter(item => item.stock_quantity < item.quantity);
        if (outOfStockItems.length > 0) {
            Utils.showMessage('Some items are out of stock, please adjust quantities before checkout', 'warning');
            return;
        }

        window.location.href = 'checkout.html';
    }

    viewProduct(productId) {
        window.location.href = `product-detail.html?id=${productId}`;
    }

    showLoginRequired() {
        const container = document.getElementById('cart-content');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <h4 class="text-muted">Please login first</h4>
                    <p class="text-muted mb-4">Login to view your cart</p>
                    <a href="login.html" class="btn btn-primary">Login Now</a>
                </div>
            `;
        }
    }
}

// Page initialization
let cartPage;

document.addEventListener('DOMContentLoaded', function() {
    cartPage = new CartPage();
});