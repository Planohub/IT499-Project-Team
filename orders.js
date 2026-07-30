// ========================================
// ORDERS.JS — Student Order History
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    // ========================================
    // 1. GET ACTIVE STUDENT
    // ========================================
    const activeStudent = getActiveStudentSession();
    const studentId = activeStudent.userID;

    // Update header badge
    const studentBadge = document.getElementById('studentHeaderBadge');
    if (studentBadge) {
        studentBadge.textContent = `🎓 ${activeStudent.firstName} ${activeStudent.lastName}`;
    }

    // ========================================
    // 2. UPDATE MEAL-PLAN BALANCE
    // ========================================
    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent = `$${getMealPlanBalance().toFixed(2)}`;
    }

    // ========================================
    // 3. UPDATE CART COUNT
    // ========================================
    const cart = getCart();
    const cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    const cartLink = document.getElementById('cartLink');
    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    // ========================================
    // 4. LOAD AND DISPLAY ORDERS
    // ========================================
    const ordersContainer = document.getElementById('ordersContainer');

    // Get all orders from localStorage
    let allOrders = [];
    try {
        const ordersData = localStorage.getItem('orders');
        if (ordersData) {
            allOrders = JSON.parse(ordersData);
        }
    } catch (e) {
        console.error('Unable to read orders', e);
    }

    // Filter orders for this student
    const studentOrders = allOrders.filter(order => Number(order.studentId) === Number(studentId));

    if (studentOrders.length === 0) {
        ordersContainer.innerHTML = `
            <div style="text-align:center; padding:60px 20px; border: 2px solid var(--lightGrey); border-radius: 8px;">
                <p style="font-size:1.2rem; color:var(--grey);">📦 No orders yet</p>
                <p style="color:var(--lightGrey); margin-top:8px;">Start ordering from your favorite vendors!</p>
                <a href="student-dashboard.html" class="secondaryButton" style="margin-top:15px;">Browse Vendors →</a>
            </div>
        `;
        return;
    }

    // Sort orders by date (newest first)
    studentOrders.sort((a, b) => b.timestamp - a.timestamp);

    // Build order cards
    let ordersHTML = '';
    studentOrders.forEach(order => {
        const statusColor = getStatusColor(order.currentStatus);
        const itemsList = order.items ? order.items.map(item => 
            `${item.name} ×${item.quantity}`
        ).join(', ') : 'No items';

        ordersHTML += `
            <div style="border: 2px solid var(--lightGrey); border-radius: 8px; padding: 20px; margin-bottom: 16px; background: var(--white);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="font-weight: 700; font-size: 1.1rem;">Order #${order.orderId}</span>
                        <span style="color: var(--grey); font-size: 0.9rem; margin-left: 12px;">${order.orderDate || 'Date not available'}</span>
                    </div>
                    <span style="font-weight: 600; color: ${statusColor}; background: ${statusColor}20; padding: 4px 16px; border-radius: 20px; font-size: 0.85rem;">
                        ${order.currentStatus || 'Pending'}
                    </span>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--lightGrey);">
                    <p style="color: var(--grey); font-size: 0.9rem;">
                        <strong>Vendor:</strong> ${order.vendorName || 'Unknown Vendor'}
                    </p>
                    <p style="color: var(--grey); font-size: 0.9rem;">
                        <strong>Items:</strong> ${itemsList}
                    </p>
                    <p style="font-weight: 600; margin-top: 6px;">
                        Total: $${order.total.toFixed(2)}
                    </p>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--lightGrey); display: flex; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 0.85rem; color: var(--grey);">
                        <strong>Status History:</strong>
                    </span>
                    ${getStatusHistory(order)}
                </div>
            </div>
        `;
    });

    ordersContainer.innerHTML = ordersHTML;

    console.log(`✅ Loaded ${studentOrders.length} orders for student ${studentId}`);
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function getStatusColor(status) {
    const colors = {
        'Pending': '#f57f17',
        'Accepted': '#0d47a1',
        'Preparing': '#e65100',
        'Ready': '#2e7d32',
        'Complete': '#1b5e20',
        'Rejected': '#c62828'
    };
    return colors[status] || '#333';
}

function getStatusHistory(order) {
    // If order has status history, display it
    // Otherwise, show the current status as the only step
    const statuses = order.statusHistory || [{ status: order.currentStatus || 'Pending', changedAt: order.orderDate || 'N/A' }];
    
    let html = '';
    statuses.forEach((s, index) => {
        html += `
            <span style="font-size: 0.8rem; color: var(--grey); ${index > 0 ? 'margin-left: 8px;' : ''}">
                ${index > 0 ? '→' : ''} ${s.status}
                <span style="font-size: 0.7rem; color: var(--lightGrey);">(${s.changedAt || 'N/A'})</span>
            </span>
        `;
    });
    return html;
}