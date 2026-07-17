// ========================================
// CONFIRMATION.JS — Order Confirmation Logic
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    // Elements
    const orderNumberElement = document.getElementById('order-number');
    const orderVendorElement = document.getElementById('order-vendor');
    const orderTotalElement = document.getElementById('order-total');
    const orderStatusElement = document.getElementById('order-status');
    const orderDateElement = document.getElementById('order-date');
    const orderItemsContainer = document.getElementById('order-items');
    const orderSubtotalElement = document.getElementById('order-subtotal');
    const orderTaxElement = document.getElementById('order-tax');
    const orderGrandTotalElement = document.getElementById('order-grand-total');
    const errorMessage = document.getElementById('error-message');

    // ========================================
    // 1. LOAD ORDER
    // ========================================
    function loadOrder() {
        // Get orders from localStorage
        const orders = JSON.parse(localStorage.getItem('orders')) || [];

        // Find the order
        let order = null;

        if (orderId) {
            order = orders.find(o => o.orderId === orderId);
        }

        // If no order found, get the most recent order
        if (!order && orders.length > 0) {
            order = orders[orders.length - 1];
        }

        // Handle missing order error
        if (!order) {
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = '⚠️ Order not found. Please place an order first.';
            }
            // Show empty state
            document.querySelector('.confirmationBox')?.classList.add('order-not-found');
            console.warn('❌ No order found');
            return;
        }

        // Display order details
        if (orderNumberElement) orderNumberElement.textContent = order.orderId;
        if (orderVendorElement) orderVendorElement.textContent = order.vendor || 'Campus Grill';
        if (orderTotalElement) orderTotalElement.textContent = `$${order.total.toFixed(2)}`;
        if (orderStatusElement) orderStatusElement.textContent = order.status || 'Confirmed';
        if (orderDateElement) orderDateElement.textContent = order.orderDate || new Date().toLocaleString();

        // Display items
        if (orderItemsContainer && order.items) {
            let itemsHTML = '';
            order.items.forEach(item => {
                itemsHTML += `
                    <div class="order-item-row">
                        <span class="order-item-name">${item.name} ×${item.quantity}</span>
                        <span class="order-item-price">$${item.total.toFixed(2)}</span>
                    </div>
                `;
            });
            orderItemsContainer.innerHTML = itemsHTML;
        }

        // Display totals
        if (orderSubtotalElement) orderSubtotalElement.textContent = `$${order.subtotal.toFixed(2)}`;
        if (orderTaxElement) orderTaxElement.textContent = `$${order.tax.toFixed(2)}`;
        if (orderGrandTotalElement) orderGrandTotalElement.textContent = `$${order.total.toFixed(2)}`;

        console.log(`✅ Order ${order.orderId} loaded successfully`);
    }

    // ========================================
    // 2. EVENT LISTENERS
    // ========================================

    // "Order Another" button - clear cart and go to vendors
    const orderAnotherBtn = document.getElementById('order-another-btn');
    if (orderAnotherBtn) {
        orderAnotherBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear cart just in case
            localStorage.removeItem('cart');
            window.location.href = 'vendors.html';
        });
    }

    // "Continue Shopping" button
    const continueShoppingBtn = document.getElementById('continue-shopping-btn');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'vendors.html';
        });
    }

    // ========================================
    // 3. INITIALIZE
    // ========================================
    loadOrder();

    console.log('✅ Confirmation page loaded');
});