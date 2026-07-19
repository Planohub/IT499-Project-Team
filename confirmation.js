// ========================================
// CONFIRMATION.JS — Order Confirmation Logic
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    // Elements
    const orderNumberElement = document.getElementById('orderNumber');
    const orderVendorElement = document.getElementById('orderVendor');
    const orderTotalElement = document.getElementById('orderTotal');
    const orderStatusElement = document.getElementById('orderStatus');
    const orderDateElement = document.getElementById('orderDate');
    const orderItemsContainer = document.getElementById('orderItems');
    const orderSubtotalElement = document.getElementById('orderSubtotal');
    const orderTaxElement = document.getElementById('orderTax');
    const orderGrandTotalElement = document.getElementById('orderGrandTotal');
    const errorMessage = document.getElementById('error-message');

    // ========================================
    // 1. LOAD ORDER
    // ========================================
    function loadOrder() {
        // Try to get orders from localStorage
        let orders = [];

        // Method 1: Try 'orders' key (from checkout page)
        const ordersData = localStorage.getItem('orders');
        if (ordersData) {
            orders = JSON.parse(ordersData);
        }

        // Method 2: Try 'latestOrder' key (from storage.js)
        if (orders.length === 0) {
            const latestOrder = JSON.parse(localStorage.getItem('latestOrder'));
            if (latestOrder) {
                orders = [latestOrder];
            }
        }

        // Find the order
        let order = null;

        if (orderId) {
            order = orders.find(o => String(o.orderId) === String(orderId));
        }

        // If no order found, get the most recent order
        if (!order && orders.length > 0) {
            order = orders[orders.length - 1];
            console.log('📦 Using most recent order:', order.orderId);
        }

        // Handle missing order error
        if (!order) {
            if (errorMessage) {
                errorMessage.style.display = 'block';
                errorMessage.textContent = '⚠️ Order not found. Please place an order first.';
            }
            document.querySelector('.confirmationBox')?.classList.add('order-not-found');
            console.warn('❌ No order found');
            return;
        }

        // Display order details
        if (orderNumberElement) orderNumberElement.textContent = `#${order.orderId}`;
        if (orderVendorElement) orderVendorElement.textContent = order.vendorName || 'Campus Grill';
        if (orderTotalElement) orderTotalElement.textContent = `$${order.total.toFixed(2)}`;
        if (orderStatusElement) orderStatusElement.textContent = order.currentStatus || 'Confirmed';
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

    // "Order Another" button
    const orderAnotherBtn = document.getElementById('orderAnotherBtn');
    if (orderAnotherBtn) {
        orderAnotherBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('cart');
            window.location.href = 'vendors.html';
        });
    }

    // "Continue Shopping" button
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
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