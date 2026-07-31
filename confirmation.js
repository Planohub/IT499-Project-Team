// ========================================
// CONFIRMATION.JS — Database-Backed Confirmation
// ========================================

document.addEventListener('DOMContentLoaded', async function () {
    const activeStudent = getActiveStudentSession();

    const studentBadge = document.getElementById('studentHeaderBadge');
    if (studentBadge) {
        studentBadge.textContent =
            `🎓 ${activeStudent.firstName} ${activeStudent.lastName}`;
    }

    const mealPlanBalanceElement =
        document.getElementById('mealPlanBalance');

    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent =
            `$${getMealPlanBalance().toFixed(2)}`;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        showOrderError('No order number was provided.');
        return;
    }

    try {
        const response = await fetch(`/api/orders/${orderId}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to load the order.');
        }

        renderOrder(result);

        console.log(
            `✅ Order ${result.orderId} loaded from SQLite`
        );

    } catch (error) {
        console.error('Unable to load order:', error);
        showOrderError(error.message);
    }

    attachNavigationListeners();
});


function renderOrder(order) {
    setText('orderNumber', `#${order.orderId}`);
    setText('orderVendor', order.vendorName);
    setText('orderTotal', `$${Number(order.total).toFixed(2)}`);
    setText('orderStatus', order.currentStatus);
    setText('orderDate', formatOrderDate(order.orderDate));

    setText(
        'orderSubtotal',
        `$${Number(order.subtotal).toFixed(2)}`
    );

    setText(
        'orderTax',
        `$${Number(order.tax).toFixed(2)}`
    );

    setText(
        'orderGrandTotal',
        `$${Number(order.total).toFixed(2)}`
    );

    const orderItemsContainer =
        document.getElementById('orderItems');

    if (orderItemsContainer) {
        orderItemsContainer.innerHTML = order.items.map(item => `
            <div class="order-item-row">
                <span class="order-item-name">
                    ${escapeHtml(item.name)} ×${item.quantity}
                </span>

                <span class="order-item-price">
                    $${Number(item.total).toFixed(2)}
                </span>
            </div>
        `).join('');
    }
}


function showOrderError(message) {
    const errorMessage = document.getElementById('error-message');

    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = `⚠️ ${message}`;
    }

    const confirmationBox =
        document.querySelector('.confirmationBox');

    if (confirmationBox) {
        confirmationBox.classList.add('order-not-found');
    }
}


function attachNavigationListeners() {
    const orderAnotherBtn =
        document.getElementById('orderAnotherBtn');

    if (orderAnotherBtn) {
        orderAnotherBtn.addEventListener('click', function (event) {
            event.preventDefault();
            clearCart();
            window.location.href = 'student-dashboard.html';
        });
    }

    const continueShoppingBtn =
        document.getElementById('continueShoppingBtn');

    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', function (event) {
            event.preventDefault();
            window.location.href = 'student-dashboard.html';
        });
    }
}


function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value;
    }
}


function formatOrderDate(orderDate) {
    const parsedDate = new Date(
        String(orderDate).replace(' ', 'T') + 'Z'
    );

    if (Number.isNaN(parsedDate.getTime())) {
        return orderDate;
    }

    return parsedDate.toLocaleString();
}


function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}