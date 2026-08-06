// ========================================
// ORDERS.JS — Database-Backed Student Order History
// ========================================

document.addEventListener('DOMContentLoaded', async function () {

    // ========================================
    // 1. GET ACTIVE STUDENT
    // ========================================
    const activeStudent = getActiveStudentSession();

    if (!activeStudent || !activeStudent.id) {
        alert('Please log in as a student first.');
        window.location.href = 'login.html?role=student';
        return;
    }

    const studentId = Number(activeStudent.id);

    // Update header badge with the active student
    const studentBadge = document.getElementById('studentHeaderBadge');

    // ========================================
    // 2. UPDATE CART COUNT
    // ========================================
    const cartLink = document.getElementById('cartLink');

    if (cartLink) {
        cartLink.textContent = `Cart (${getCartCount()})`;
    }

    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');

    try {
        // --- LOAD STUDENT PROFILE ---
        const profileResponse = await fetch(`/api/students/${studentId}/profile`);
        const student = await profileResponse.json();

        if (!profileResponse.ok) {
            throw new Error(student.error || 'Unable to load the student profile.');
        }

        if (studentBadge) {
            studentBadge.textContent = `🎓 ${student.firstName} ${student.lastName}`;
        }

        if (mealPlanBalanceElement) {
            mealPlanBalanceElement.textContent = `$${Number(student.balance).toFixed(2)}`;
        }

        // --- LOAD ORDERS ---
        const ordersResponse = await fetch(`/api/students/${studentId}/orders`);
        const result = await ordersResponse.json();

        if (!ordersResponse.ok) {
            throw new Error(result.error || 'Unable to load your orders.');
        }

        const orders = Array.isArray(result.orders) ? result.orders : [];
        const ordersContainer = document.getElementById('ordersContainer');

        if (!ordersContainer) return;

        if (orders.length === 0) {
            ordersContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--grey); background: var(--cardWhite); border: 2px solid var(--black); border-radius: 10px;">
                    <p style="font-size: 1.1rem;">You have not placed any orders yet.</p>
                    <a href="student-dashboard.html" class="defaultButton" style="margin-top: 15px; display: inline-block; text-decoration: none; width: auto;">Start Browsing Vendors</a>
                </div>
            `;
            return;
        }

        // --- 🟢 THE FIX IS RIGHT HERE IN THIS LOOP ---
        ordersContainer.innerHTML = orders.map(order => {
            const status = order.currentStatus || 'Pending';
            const statusColor = getStatusColor(status);

            const itemsHTML = Array.isArray(order.items)
                ? order.items.map(item => `
                    <li style="margin-bottom: 5px;">
                        ${item.quantity}× ${escapeHtml(item.name)}
                    </li>
                `).join('')
                : '<li>No items available.</li>';

            // 🔥 Here we check if the vendor wrote a note/ETA, and format it nicely!
            const statusNoteHTML = order.latestStatusNote
                ? `
                    <div style="margin-top: 12px; margin-bottom: 12px; padding: 10px 12px; background-color: #e8f5e9; border-left: 4px solid #2e7d32; border-radius: 4px;">
                        <span style="font-weight: 700; color: #1b3a28; font-size: 0.9rem;">
                            🔔 Note from Vendor: <span style="font-weight: 400;">${escapeHtml(order.latestStatusNote)}</span>
                        </span>
                    </div>
                `
                : '';

            return `
                <article class="vendorOrderCard" style="padding: 20px; border: 2px solid var(--black); border-radius: 10px; margin-bottom: 15px; background: var(--cardWhite);">
                    <div class="vendorOrderHeader" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--grey); padding-bottom: 12px;">
                        <div>
                            <h4 style="font-size:1.2rem; color:var(--black); font-weight:700; margin:0;">
                                ${escapeHtml(order.vendorName || 'Vendor')}
                            </h4>
                            <p style="font-size:0.85rem; color:var(--grey); margin-top:4px;">
                                ${formatOrderDate(order.orderDate)}
                            </p>
                        </div>
                        <span class="orderStatusBadge" style="background-color:${statusColor}; color: white; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">
                            ${escapeHtml(status)}
                        </span>
                    </div>

                    ${statusNoteHTML}

                    <div class="studentOrderDetails" style="margin-top: 15px; background: white; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">
                        <ul style="padding-left: 20px; margin-bottom: 10px; color: var(--black);">
                            ${itemsHTML}
                        </ul>

                        <p class="studentOrderTotal" style="font-weight: 700; font-size: 1.05rem; color: var(--black); border-top: 1px solid #eee; padding-top: 10px; margin: 0;">
                            Total: $${Number(order.total || 0).toFixed(2)}
                        </p>
                    </div>

                    <a
                        href="confirmation.html?orderId=${order.orderId}"
                        class="secondaryButton studentOrderViewButton"
                        style="display: block; text-align: center; text-decoration: none; margin-top: 15px;"
                    >
                        View Full Order Details
                    </a>
                </article>
            `;
        }).join('');

    } catch (error) {
        console.error('Unable to load orders page:', error);
        const container = document.getElementById('ordersContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #c62828; background: #ffebee; border: 2px solid #c62828; border-radius: 10px;">
                    <p>Unable to load your orders.</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
});

function formatOrderDate(orderDate) {
    if (!orderDate) {
        return 'Date unavailable';
    }
    const parsedDate = new Date(String(orderDate).replace(' ', 'T') + 'Z');
    if (Number.isNaN(parsedDate.getTime())) {
        return orderDate;
    }
    return parsedDate.toLocaleString();
}

function getStatusColor(status) {
    const colors = {
        Pending: '#c5922e',
        Accepted: '#1f478d',
        Preparing: '#1b3a28',
        Ready: '#2c4c38',
        Complete: '#3d5c47',
        Rejected: '#c62828'
    };
    return colors[status] || '#3d5c47';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}