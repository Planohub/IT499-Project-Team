// ========================================
// ORDERS.JS — Student Order History
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    // ========================================
    // 1. GET ACTIVE STUDENT
    // ========================================
    const activeStudent = getActiveStudentSession();
    const studentId = activeStudent ? activeStudent.userID : 101;

    // Update header badge
    const studentBadge = document.getElementById('studentHeaderBadge');
    if (studentBadge && activeStudent) {
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
    if (!ordersContainer) return;

    const allOrders = getOrdersHistory();
    const studentOrders = allOrders.filter(o => Number(o.studentId) === Number(studentId));

    if (studentOrders.length === 0) {
        ordersContainer.innerHTML = '<p style="text-align:center; padding:40px; color:var(--grey);">No past orders found.</p>';
        return;
    }

    // Sort: Newest orders first
    studentOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    let ordersHTML = '';
    studentOrders.forEach(order => {
        const itemsHTML = order.items ? order.items.map(item => `
            <li style="margin-bottom: 4px;">${item.quantity}x ${item.name || item.item} ($${((item.price || 0) * item.quantity).toFixed(2)})</li>
        `).join('') : '<li>No item details</li>';

        // ⏱️ Build ETA Message if set by vendor
        let etaMsg = order.estimatedPrepTime ? 
            `<p style="color: var(--black); font-size: 0.9rem; font-weight: 600; margin-top: 8px;">⏱️ <strong>Estimated Pickup:</strong> ~${order.estimatedPrepTime} mins</p>` : '';

        // ❌ Build Rejection Message if set by vendor
        let rejectMsg = order.rejectionReason ? 
            `<p style="color: #c62828; font-size: 0.9rem; font-weight: 600; margin-top: 8px;">❌ <strong>Canceled:</strong> ${order.rejectionReason}</p>` : '';

        ordersHTML += `
            <div class="orderDetailsBox" style="border: 2px solid var(--black); border-radius: 10px; padding: 20px; margin-bottom: 20px; background: var(--cardWhite);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--lightGrey); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 6px;">
                    <div>
                        <h3 style="margin: 0; color: var(--black);">Order #${order.orderId} — ${order.vendorName || 'Vendor'}</h3>
                        <p style="font-size: 0.85rem; color: var(--grey); margin-top: 2px;">${order.orderDate || 'N/A'}</p>
                    </div>
                    <span class="orderStatusBadge" style="background-color: ${getStatusColor(order.currentStatus)}; color: #ffffff; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">
                        ${order.currentStatus || 'Pending'}
                    </span>
                </div>

                ${etaMsg}
                ${rejectMsg}

                <div style="margin-top: 12px; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid var(--lightGrey);">
                    <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--black); margin-bottom: 8px;">
                        ${itemsHTML}
                    </ul>
                    <p style="font-weight: 700; font-size: 1rem; color: var(--black); margin: 0; border-top: 1px solid #eee; padding-top: 6px;">
                        Total: $${Number(order.total || 0).toFixed(2)}
                    </p>
                </div>
            </div>
        `;
    });

    ordersContainer.innerHTML = ordersHTML;
    console.log(`✅ Loaded ${studentOrders.length} orders for student ${studentId}`);
});

function getStatusColor(status) {
    const colors = {
        'Pending': '#c5922e',   /* Cozy Gold */
        'Preparing': '#1b3a28', /* Forest Green */
        'Ready': '#2c4c38',     /* Sage Green */
        'Complete': '#3d5c47',  /* Leaf Green */
        'Rejected': '#c62828'   /* Alert Red */
    };
    return colors[status] || '#3d5c47';
}