// orders.js - fixed version

let ordersData = [];
let currentFilter = 'all';

// Check authentication status
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
    // Check if user is logged in
    if (!checkAuth()) {
        showMessage('Please login first', 'warning');
        window.location.href = 'login.html';
        return;
    }

    loadOrders();
    setupFilterEvents();
});

function setupFilterEvents() {
    const filterButtons = document.querySelectorAll('#orderFilters button');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to current button
            this.classList.add('active');

            currentFilter = this.getAttribute('data-status');
            filterOrders();
        });
    });
}

async function loadOrders() {
    const user = getCurrentUser();
    const container = document.getElementById('ordersList');

    try {
        console.log('Loading order data, user ID:', user.user_id);

        // Use API.orders instead of orderAPI
        ordersData = await API.orders.getList(user.user_id);
        console.log('Order data from API:', ordersData);

        if (!ordersData || ordersData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <h4 class="text-muted">No orders yet</h4>
                    <p class="text-muted mb-4">You don't have any orders yet, go shopping now!</p>
                    <a href="products.html" class="btn btn-primary">Go Shopping</a>
                </div>
            `;
            return;
        }

        filterOrders();

    } catch (error) {
        console.error('Failed to load orders:', error);

        // Display error message, but don't use mock data
        container.innerHTML = `
            <div class="text-center py-5">
                <h4 class="text-danger">Failed to load orders</h4>
                <p class="text-muted mb-4">Unable to load order data, please check your network connection or try again later</p>
                <button class="btn btn-primary" onclick="loadOrders()">Reload</button>
            </div>
        `;
    }
}

// Add null checks when rendering orders
function filterOrders() {
    const container = document.getElementById('ordersList');

    let filteredOrders = ordersData;
    if (currentFilter !== 'all') {
        filteredOrders = ordersData.filter(order => order.status === currentFilter);
    }

    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <h4 class="text-muted">No related orders</h4>
                <p class="text-muted">No orders found matching the filter criteria</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredOrders.map(order => `
        <div class="card mb-4">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Order ID: #${order.order_id || 'Unknown'}</strong>
                        <small class="text-muted ms-3">${formatOrderTime(order.created_at)}</small>
                    </div>
                    <span class="badge ${getStatusBadgeClass(order.status)}">${getStatusText(order.status)}</span>
                </div>
            </div>
            <div class="card-body">
                ${(order.items && order.items.length > 0) ? order.items.map(item => `
                    <div class="row align-items-center mb-3">
                        <div class="col-md-2">
                            <img src="../../images/placeholder.jpg" alt="${item.product_name || 'Product'}" class="img-fluid rounded">
                        </div>
                        <div class="col-md-6">
                            <h6 class="mb-1">${item.product_name || 'Unknown product'}</h6>
                            <p class="text-muted mb-0">Unit Price: ${formatPrice(item.price || 0)}</p>
                        </div>
                        <div class="col-md-2 text-center">
                            <span>× ${item.quantity || 1}</span>
                        </div>
                        <div class="col-md-2 text-end">
                            <strong>${formatPrice(item.subtotal || (item.price || 0) * (item.quantity || 1))}</strong>
                        </div>
                    </div>
                `).join('') : '<p class="text-muted">No product information available</p>'}

                <hr>

                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">Recipient: ${order.recipient || 'Unknown'}</small>
                        <br>
                        <small class="text-muted">Address: ${order.shipping_address || 'Unknown address'}</small>
                    </div>
                    <div class="text-end">
                        <div class="mb-2">
                            <strong>Total: ${formatPrice(order.total_amount || 0)}</strong>
                        </div>
                        <div class="btn-group">
                            ${getOrderActions(order)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'bg-warning',
        'paid': 'bg-info',
        'shipped': 'bg-primary',
        'completed': 'bg-success',
        'cancelled': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Pending Payment',
        'paid': 'Pending Shipment',
        'shipped': 'Shipped',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusTexts[status] || 'Unknown Status';
}

function getOrderActions(order) {
    let actions = '';

    if (order.status === 'pending') {
        actions = `
            <button class="btn btn-primary btn-sm" onclick="payOrder(${order.order_id})">Pay Now</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="cancelOrder(${order.order_id})">Cancel Order</button>
        `;
    } else if (order.status === 'shipped') {
        actions = `
            <button class="btn btn-success btn-sm" onclick="confirmReceipt(${order.order_id})">Confirm Receipt</button>
            <button class="btn btn-outline-primary btn-sm" onclick="viewLogistics(${order.order_id})">View Logistics</button>
        `;
    } else if (order.status === 'completed') {
        actions = `
            <button class="btn btn-outline-primary btn-sm" onclick="buyAgain(${order.order_id})">Buy Again</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="viewOrderDetail(${order.order_id})">Order Details</button>
        `;
    } else {
        actions = `
            <button class="btn btn-outline-secondary btn-sm" onclick="viewOrderDetail(${order.order_id})">Order Details</button>
        `;
    }

    return actions;
}

function formatOrderTime(timestamp) {
    // Handle null values
    if (!timestamp) return 'Unknown time';
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return 'Time format error';
    }
}

// Order operation functions
async function payOrder(orderId) {
    try {
        const user = getCurrentUser();
        if (!user) {
            showMessage('Please login first', 'warning');
            window.location.href = 'login.html';
            return;
        }

        // Use correct API method
        const result = await API.orders.pay(orderId);

        if (result.success) {
            showMessage('Payment successful! Order submitted, waiting for admin confirmation', 'success');
            // Reload order list
            loadOrders();
        } else {
            showMessage(result.message || 'Payment failed', 'danger');
        }
    } catch (error) {
        console.error('Payment failed:', error);
        // ... error handling code remains unchanged
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }

    try {
        // Use API.orders.cancel instead of orderAPI.cancelOrder
        const result = await API.orders.cancel(orderId);

        if (result.success) {
            showMessage('Order cancelled', 'success');
            // Reload order list to update status
            loadOrders();
        } else {
            showMessage(result.message || 'Failed to cancel order', 'danger');
        }
    } catch (error) {
        console.error('Failed to cancel order:', error);

        let errorMessage = 'Failed to cancel order';
        if (error.message) {
            if (error.message.includes('404')) {
                errorMessage = 'Order not found';
            } else if (error.message.includes('400')) {
                errorMessage = 'Only orders pending payment can be cancelled';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error, please try again later';
            } else {
                errorMessage = error.message;
            }
        }

        showMessage(errorMessage, 'danger');
    }
}

async function confirmReceipt(orderId) {
    if (confirm('Confirm you have received the product?')) {
        try {
            // Use API.orders.complete instead of orderAPI.completeOrder
            const result = await API.orders.complete(orderId);

            if (result.success) {
                showMessage('Receipt confirmed, order completed', 'success');
                // Reload order list
                loadOrders();

                // Update user membership status display
                updateMemberStatusDisplay();
            } else {
                showMessage(result.message || 'Failed to confirm receipt', 'danger');
            }
        } catch (error) {
            console.error('Failed to confirm receipt:', error);
            showMessage('Failed to confirm receipt', 'danger');
        }
    }
}

// Update membership status display
async function updateMemberStatusDisplay() {
    try {
        const user = getCurrentUser();
        // Use API.auth.getProfile instead of userAPI.getMemberStatus
        const profile = await API.auth.getProfile();

        // Update membership status display on page
        const memberBadges = document.querySelectorAll('.badge.bg-warning, .badge.bg-secondary');
        memberBadges.forEach(badge => {
            // Adjust based on actual API returned membership status field
            if (profile.is_member) {
                badge.className = 'badge bg-warning';
                badge.textContent = 'Member User';
            } else {
                badge.className = 'badge bg-secondary';
                badge.textContent = 'Regular User';
            }
        });

    } catch (error) {
        console.error('Failed to update membership status display:', error);
    }
}

function viewLogistics(orderId) {
    showMessage('Logistics information feature in development', 'info');
}

async function buyAgain(orderId) {
    try {
        const user = getCurrentUser();
        if (!user) {
            showMessage('Please login first', 'warning');
            window.location.href = 'login.html';
            return;
        }

        console.log(`Buy again order ${orderId}, current user:`, user);

        // Find order from order data
        const order = ordersData.find(o => o.order_id === orderId);
        if (!order || !order.items || order.items.length === 0) {
            showMessage('Order data does not exist or is empty', 'warning');
            return;
        }

        console.log('Order details:', order);

        let successCount = 0;
        let errorCount = 0;

        // Add products to cart one by one
        for (const item of order.items) {
            try {
                console.log(`Adding product to cart: product_id=${item.product_id}, quantity=${item.quantity}`);
                // Use API.cart.add instead of cartAPI.addToCart
                const result = await API.cart.add(user.user_id, item.product_id, item.quantity);

                if (result.success) {
                    successCount++;
                    console.log(`Successfully added product ${item.product_id} to cart`);
                } else {
                    errorCount++;
                    console.error(`Failed to add product ${item.product_id}:`, result.message);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error adding product ${item.product_id}:`, error);

                // If it's a business error like insufficient stock, continue adding other products
                if (error.message && error.message.includes('stock')) {
                    // Continue to next product
                    continue;
                }
            }
        }

        if (successCount > 0) {
            showMessage(`Successfully added ${successCount} products to cart`, 'success');
        } else {
            showMessage('Failed to add products to cart', 'danger');
        }

        if (errorCount > 0) {
            console.warn(`${errorCount} products failed to add`);
        }

    } catch (error) {
        console.error('Buy again failed:', error);
        showMessage('Operation failed, please try again', 'danger');
    }
}

function viewOrderDetail(orderId) {
    // Should actually navigate to order details page
    showMessage('Order details feature in development', 'info');
}

// Add to global scope
window.loadOrders = loadOrders;
window.payOrder = payOrder;
window.cancelOrder = cancelOrder;
window.confirmReceipt = confirmReceipt;
window.viewLogistics = viewLogistics;
window.buyAgain = buyAgain;
window.viewOrderDetail = viewOrderDetail;