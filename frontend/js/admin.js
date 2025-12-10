// Add variables at the beginning of admin.js
let pendingShippingOrders = [];

// Add these functions at the beginning of the file
async function loadPendingShippingOrders() {
    try {
        console.log('Loading pending shipment orders...');

        // Only load pending shipment orders (orders that are paid but not shipped)
        const shippingOrders = await window.orderAPI.getOrdersByStatus('paid');

        // Assign API returned data to global variable
        pendingShippingOrders = shippingOrders;

        console.log('Pending shipment orders:', pendingShippingOrders);

        renderPendingShippingOrders(pendingShippingOrders);

    } catch (error) {
        console.error('Failed to load orders:', error);

        // Add null check
        const shippingContainer = document.getElementById('pendingShippingOrders');

        if (shippingContainer) {
            shippingContainer.innerHTML = '<div class="text-danger">Failed to load</div>';
        }
    }
}

function renderPendingShippingOrders(orders) {
    const container = document.getElementById('pendingShippingOrders');
    const countElement = document.getElementById('pendingShippingCount');

    if (!container) {
        console.error('pendingShippingOrders container not found');
        return;
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="text-muted">No pending shipment orders</div>';
        if (countElement) countElement.textContent = '0';
        return;
    }

    if (countElement) countElement.textContent = orders.length.toString();

    container.innerHTML = orders.map(order => `
        <div class="order-item border rounded p-3 mb-2">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>Order ID: #${order.order_id}</strong>
                    <div class="text-muted small">
                        Amount: ${formatPrice(order.total_amount)} | 
                        User: ${order.recipient || 'Unknown'}
                    </div>
                    <div class="text-muted small">
                        Address: ${order.shipping_address || 'Unknown address'}
                    </div>
                    <div class="text-muted small">
                        Order time: ${formatOrderTime(order.created_at)}
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="confirmShipment(${order.order_id})">
                    Mark as Shipped
                </button>
            </div>
        </div>
    `).join('');
}

async function confirmShipment(orderId) {
    if (!confirm('Confirm that shipment has been completed?')) {
        return;
    }

    try {
        const result = await window.orderAPI.updateStatus(orderId, 'shipped');

        if (result.success) {
            showAdminMessage('Shipment confirmed successfully', 'success');
            // Reload order list
            loadPendingShippingOrders();
        } else {
            showAdminMessage(result.message || 'Operation failed', 'danger');
        }
    } catch (error) {
        console.error('Failed to confirm shipment:', error);
        showAdminMessage('Operation failed: ' + error.message, 'danger');
    }
}

function formatPrice(price) {
    return `$${parseFloat(price).toFixed(2)}`;
}

// Modify existing manualCompleteOldOrders function, add automatic order loading on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check admin permissions
    if (!checkAdminAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // Load pending shipment orders
    loadPendingShippingOrders();

    // Set manual completion button event
    const manualCompleteBtn = document.getElementById('manualCompleteBtn');
    if (manualCompleteBtn) {
        manualCompleteBtn.addEventListener('click', manualCompleteOldOrders);
    }

    // Auto refresh pending orders every 30 seconds
    setInterval(loadPendingShippingOrders, 30000);
});

// Fix admin permission check function
function checkAdminAuth() {
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

// Admin message display function
function showAdminMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
    }

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Helper function: format order time
function formatOrderTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return 'Time format error';
    }
}

// Modify existing manualCompleteOldOrders function
async function manualCompleteOldOrders() {
    const btn = document.getElementById('manualCompleteBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = 'Executing...';

    try {
        const result = await orderAPI.manualCompleteOldOrders();

        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="alert alert-success">
                    <strong>Execution successful!</strong><br>
                    ${result.message}<br>
                    ${result.updated_orders.length > 0 ? 
                        `Updated ${result.updated_orders.length} orders, affecting ${result.updated_users.length} users` : 
                        'No orders need to be updated'}
                </div>
            `;
        }

    } catch (error) {
        console.error('Execution failed:', error);
        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Execution failed:</strong> ${error.message}
                </div>
            `;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Add to global scope
window.loadPendingShippingOrders = loadPendingShippingOrders;
window.confirmShipment = confirmShipment;