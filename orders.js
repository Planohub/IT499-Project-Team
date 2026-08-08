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
        const profileResponse = await fetch(
            `/api/students/${studentId}/profile`
        );

        const student = await profileResponse.json();

        if (!profileResponse.ok) {
            throw new Error(
                student.error ||
                'Unable to load the student profile.'
            );
        }

        if (studentBadge) {
            studentBadge.textContent = `🎓 ${student.firstName} ${student.lastName}`;
        }

        if (mealPlanBalanceElement) {
            mealPlanBalanceElement.textContent = `$${Number(student.balance).toFixed(2)}`;
        }

        setActiveStudentSession(student);

    } catch (error) {
        console.error(
            'Unable to load student profile:',
            error
        );

        alert(error.message);
        window.location.href = 'login.html?role=student';
        return;
    }

    // ========================================
    // 3. LOAD ORDERS FROM FLASK / SQLITE
    // ========================================
    const ordersContainer =
        document.getElementById('ordersContainer');

    if (!ordersContainer) {
        console.error('Orders container was not found.');
        return;
    }

    ordersContainer.innerHTML = `
        <div class="vendorGridMessage">
            <p>Loading order history...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `/api/students/${studentId}/orders`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || 'Unable to load order history.'
            );
        }

        if (!Array.isArray(result.orders) || result.orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="vendorGridMessage">
                    <p>No past orders found.</p>
                    <p>Your completed and active orders will appear here.</p>
                </div>
            `;
            return;
        }

        renderOrders(result.orders, ordersContainer);

        console.log(
            `✅ Loaded ${result.orders.length} SQLite orders for student ${studentId}`
        );

    } catch (error) {
        console.error('Unable to load student orders:', error);

        ordersContainer.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load order history.</p>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;
    }
});


function renderOrders(orders, ordersContainer) {

    // ========================================
    // 4. BUILD ORDER-HISTORY CARDS
    // ========================================
    ordersContainer.innerHTML = orders.map(order => {
        const itemsHTML = Array.isArray(order.items)
            ? order.items.map(item => `
                <li class="studentOrderItem">
                    ${item.quantity}× ${escapeHtml(item.name)}
                    ($${Number(item.total).toFixed(2)})
                </li>
            `).join('')
            : '<li>No item details available.</li>';

        const statusNoteHTML = order.latestStatusNote
            ? `
                <p class="studentOrderStatusNote">
                    ${escapeHtml(order.latestStatusNote)}
                </p>
            `
            : '';
        return `
            <article class="studentOrderCard">
                <div class="studentOrderHeader">
                    <div>
                        <h3>
                            Order #${order.orderId}
                            — ${escapeHtml(order.vendorName || 'Vendor')}
                        </h3>

                        <p class="studentOrderDate">
                            ${formatOrderDate(order.orderDate)}
                        </p>
                    </div>

                    <span
                        class="orderStatusBadge"
                        style="background-color: ${getStatusColor(order.currentStatus)};"
                    >
                        ${escapeHtml(order.currentStatus || 'Pending')}
                    </span>
                </div>

                ${statusNoteHTML}

                <div class="studentOrderDetails">
                    <ul>
                        ${itemsHTML}
                    </ul>

                    <p class="studentOrderTotal">
                        Total: $${Number(order.total || 0).toFixed(2)}
                    </p>
                </div>

                <a
                    href="confirmation.html?orderId=${order.orderId}"
                    class="secondaryButton studentOrderViewButton"
                >
                    View Order
                </a>
            </article>
        `;
    }).join('');
}


function formatOrderDate(orderDate) {
    if (!orderDate) {
        return 'Date unavailable';
    }

    const parsedDate = new Date(
        String(orderDate).replace(' ', 'T') + 'Z'
    );

    if (Number.isNaN(parsedDate.getTime())) {
        return orderDate;
    }

    return parsedDate.toLocaleString();
}


function getStatusColor(status) {
    const colors = {
        Pending: 'var(--brand-gold)',
        Accepted: 'var(--brand-blue)',
        Preparing: 'var(--brand-purple)',
        Ready: 'var(--brand-green-light)',
        Complete: 'var(--brand-green)',
        Rejected: 'var(--brand-red)'
    };

    return colors[status] || 'var(--brand-black)';
}


function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}