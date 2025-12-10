// checkout.js - fixed version

let cartData = null;
let userInfo = null;

// Check authentication status
function checkAuth() {
    return window.AuthUtils ? window.AuthUtils.isTokenValid() : !!localStorage.getItem('access_token');
}

// Get current user information
function getCurrentUser() {
    return window.AuthUtils ? window.AuthUtils.getCurrentUser() : (() => {
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
            return null;
        }
    })();
}

// Format price
function formatPrice(price) {
    return `$${parseFloat(price).toFixed(2)}`;
}

// Show message (commented out as it's defined elsewhere)
// function showMessage(message, type = 'info') {
//     const alertDiv = document.createElement('div');
//     alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
//     alertDiv.innerHTML = `
//         ${message}
//         <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
//     `;
//
//     const container = document.querySelector('.container');
//     container.insertBefore(alertDiv, container.firstChild);
//
//     setTimeout(() => {
//         if (alertDiv.parentNode) {
//             alertDiv.remove();
//         }
//     }, 3000);
// }

document.addEventListener('DOMContentLoaded', function() {
    // Ensure authentication system is initialized
    if (window.AuthUtils) {
        window.AuthUtils.init();
    }

    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = 'login.html';
        return;
    }

    loadCheckoutData();
});

async function loadCheckoutData() {
    const user = getCurrentUser();
    const container = document.getElementById('checkoutContent');

    try {
        // Use API.cart instead of cartAPI
        cartData = await API.cart.get(user.user_id);

        if (!cartData.items || cartData.items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <h4 class="text-muted">Cart is empty</h4>
                    <p class="text-muted mb-4">Cannot proceed to checkout, please add items to cart first</p>
                    <a href="products.html" class="btn btn-primary">Go Shopping</a>
                </div>
            `;
            return;
        }

        // Get user information (simplified version, should actually call user info API)
        userInfo = {
            name: user.user_name,
            email: user.email || `${user.user_name}@example.com`,
            tel: user.tel || '12345678900'
        };

        renderCheckoutForm();

    } catch (error) {
        console.error('Failed to load checkout data:', error);
        container.innerHTML = `
            <div class="text-center py-5">
                <h4 class="text-danger">Failed to load checkout data</h4>
                <p class="text-muted">Please check your network connection or try again later</p>
                <button class="btn btn-primary" onclick="loadCheckoutData()">Reload</button>
            </div>
        `;
    }
}

function renderCheckoutForm() {
    const container = document.getElementById('checkoutContent');

    container.innerHTML = `
        <div class="row">
            <div class="col-lg-8">
                <!-- Shipping Information -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Shipping Information</h5>
                    </div>
                    <div class="card-body">
                        <form id="shippingForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="recipient" class="form-label">Recipient Name *</label>
                                    <input type="text" class="form-control" id="recipient" value="${userInfo.name}" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="phone" class="form-label">Phone Number *</label>
                                    <input type="tel" class="form-control" id="phone" value="${userInfo.tel}" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="address" class="form-label">Shipping Address *</label>
                                <textarea class="form-control" id="address" rows="3" placeholder="Please enter detailed shipping address" required></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="notes" class="form-label">Order Notes</label>
                                <textarea class="form-control" id="notes" rows="2" placeholder="Optional: Special requests or notes"></textarea>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Payment Method -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Payment Method</h5>
                    </div>
                    <div class="card-body">
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="radio" name="paymentMethod" id="paymentAlipay" value="alipay" checked>
                            <label class="form-check-label" for="paymentAlipay">
                                <i class="bi bi-credit-card"></i> Alipay
                            </label>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="radio" name="paymentMethod" id="paymentWechat" value="wechat">
                            <label class="form-check-label" for="paymentWechat">
                                <i class="bi bi-wechat"></i> WeChat Pay
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="paymentMethod" id="paymentCod" value="cod">
                            <label class="form-check-label" for="paymentCod">
                                <i class="bi bi-cash"></i> Cash on Delivery
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <!-- Order Summary -->
                <div class="card sticky-top" style="top: 100px;">
                    <div class="card-header">
                        <h5 class="mb-0">Order Summary</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <h6>Product List</h6>
                            ${cartData.items.map(item => `
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <small>${item.product_name}</small>
                                        <br>
                                        <small class="text-muted">× ${item.quantity}</small>
                                    </div>
                                    <small>${formatPrice(item.subtotal)}</small>
                                </div>
                            `).join('')}
                        </div>

                        <hr>

                        <div class="d-flex justify-content-between mb-2">
                            <span>Subtotal:</span>
                            <span>${formatPrice(cartData.total)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Shipping:</span>
                            <span>$0.00</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Discount:</span>
                            <span class="text-success">-$0.00</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-3">
                            <strong>Total Amount:</strong>
                            <strong class="text-primary h5">${formatPrice(cartData.total)}</strong>
                        </div>

                        <div class="d-grid">
                            <button class="btn btn-primary btn-lg" onclick="submitOrder()">
                                Submit Order
                            </button>
                        </div>
                        <div class="d-grid mt-2">
                            <a href="cart.html" class="btn btn-outline-secondary">
                                Back to Edit
                            </a>
                        </div>

                        <div class="mt-3">
                            <small class="text-muted">
                                Clicking "Submit Order" means you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function submitOrder() {
    const user = getCurrentUser();

    // Get form data
    const recipient = document.getElementById('recipient').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const notes = document.getElementById('notes').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    // Simple validation
    if (!recipient || !phone || !address) {
        showMessage('Please complete all shipping information fields', 'danger');
        return;
    }

    if (phone.length < 8) {
        showMessage('Please enter a valid phone number', 'danger');
        return;
    }

    const submitBtn = document.querySelector('button[onclick="submitOrder()"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        // Build order data
        const orderData = {
            user_id: user.user_id,
            recipient: recipient,
            shipping_address: `${address} (Phone: ${phone})${notes ? `, Notes: ${notes}` : ''}`
        };

        console.log('Order data being sent:', orderData);

        // Use API.orders instead of orderAPI
        const result = await API.orders.create(orderData);
        console.log('Order creation result:', result);

        if (result.success) {
            showMessage('Order submitted successfully!', 'success');

            // Clear cart
            try {
                await API.cart.clear(user.user_id);
            } catch (clearError) {
                console.error('Failed to clear cart:', clearError);
            }

            // Trigger cart update event
            window.dispatchEvent(new Event('cartUpdated'));

            // Redirect to orders page
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 2000);
        } else {
            throw new Error(result.message || 'Order creation failed');
        }

    } catch (error) {
        console.error('Failed to submit order:', error);

        // Handle authentication error
        if (error.message && error.message.includes('Authentication')) {
            showMessage('Please login again', 'warning');
            window.location.href = 'login.html';
        } else {
            // ... other error handling
            let errorMessage = 'Failed to submit order, please try again';
            if (error.message) {
                if (error.message.includes('404')) {
                    errorMessage = 'Cart not found';
                } else if (error.message.includes('400')) {
                    errorMessage = 'Cart is empty';
                } else if (error.message.includes('422')) {
                    errorMessage = 'Data format error, please check the information entered';
                } else if (error.message.includes('500')) {
                    errorMessage = 'Server error, please try again later';
                } else {
                    errorMessage = error.message;
                }
            }
            Utils.showMessage(errorMessage, 'danger');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Order';
        }

    }
}

// Add debug function in checkout.html
async function debugOrderCreation() {
    const user = getCurrentUser();
    console.log('Current user:', user);

    try {
        // Test cart data
        const cart = await API.cart.get(user.user_id);
        console.log('Cart data:', cart);

        // Test order creation
        const testOrderData = {
            user_id: user.user_id,
            recipient: "Test User",
            shipping_address: "Test Address"
        };

        console.log('Test order data:', testOrderData);
        const result = await API.orders.create(testOrderData);
        console.log('Test order creation result:', result);

    } catch (error) {
        console.error('Debug failed:', error);
    }
}

// Add to global scope
window.loadCheckoutData = loadCheckoutData;
window.submitOrder = submitOrder;
window.debugOrderCreation = debugOrderCreation;