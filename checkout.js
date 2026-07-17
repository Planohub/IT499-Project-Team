// ========================================
// CHECKOUT.JS — Checkout Page Logic
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartContainer = document.getElementById('checkout-items');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const emptyCartMessage = document.getElementById('empty-cart-message');

    // ========================================
    // 1. DISPLAY CART ITEMS
    // ========================================
    function displayCart() {
        if (cart.length === 0) {
            // Show empty cart message
            if (emptyCartMessage) {
                emptyCartMessage.style.display = 'block';
            }
            if (cartContainer) {
                cartContainer.innerHTML = '';
            }
            // Disable place order button
            if (placeOrderBtn) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.style.opacity = '0.5';
                placeOrderBtn.style.cursor = 'not-allowed';
            }
            // Update totals to $0.00
            if (subtotalElement) subtotalElement.textContent = '$0.00';
            if (taxElement) taxElement.textContent = '$0.00';
            if (totalElement) totalElement.textContent = '$0.00';
            return;
        }

        // Hide empty cart message
        if (emptyCartMessage) {
            emptyCartMessage.style.display = 'none';
        }

        // Enable place order button
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.style.opacity = '1';
            placeOrderBtn.style.cursor = 'pointer';
        }

        // Build cart items HTML
        let cartHTML = '';
        let subtotal = 0;

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            cartHTML += `
                <div class="checkout-item" data-index="${index}">
                    <div class="item-summary">
                        <span class="item-name">${item.name}</span>
                        <span class="item-qty">×${item.quantity}</span>
                    </div>
                    <div class="item-right">
                        <span class="item-price">$${itemTotal.toFixed(2)}</span>
                        <button class="remove-item-btn" data-index="${index}" aria-label="Remove item">
                            ✕
                        </button>
                    </div>
                </div>
            `;
        });

        cartContainer.innerHTML = cartHTML;

        // Calculate totals
        const tax = subtotal * 0.07; // 7% tax
        const total = subtotal + tax;

        // Update totals display
        if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        if (taxElement) taxElement.textContent = `$${tax.toFixed(2)}`;
        if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;

        // Save tax and total for order creation
        window._checkoutSubtotal = subtotal;
        window._checkoutTax = tax;
        window._checkoutTotal = total;

        // Add remove item functionality
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                removeItem(index);
            });
        });
    }

    // ========================================
    // 2. REMOVE ITEM FROM CART
    // ========================================
    function removeItem(index) {
        let currentCart = JSON.parse(localStorage.getItem('cart')) || [];
        if (index >= 0 && index < currentCart.length) {
            currentCart.splice(index, 1);
            localStorage.setItem('cart', JSON.stringify(currentCart));
            
            // Update cart count in navigation
            updateCartCount();
            
            // Refresh display
            displayCart();
        }
    }

    // ========================================
    // 3. UPDATE CART COUNT IN NAV
    // ========================================
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartLink = document.querySelector('.navigationLinks a[href="checkout.html"]');
        if (cartLink) {
            cartLink.textContent = `Cart (${totalItems})`;
        }
    }

    // ========================================
    // 4. PLACE ORDER
    // ========================================
    function placeOrder() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];

        // Prevent checkout with empty cart
        if (cart.length === 0) {
            alert('Your cart is empty! Please add items before placing an order.');
            return;
        }

        // Create order object
        const order = {
            orderId: '#' + String(Math.floor(1000 + Math.random() * 9000)),
            vendor: getVendorName(),
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
            })),
            subtotal: window._checkoutSubtotal || 0,
            tax: window._checkoutTax || 0,
            total: window._checkoutTotal || 0,
            status: 'Confirmed',
            orderDate: new Date().toLocaleString(),
            timestamp: Date.now()
        };

        // Save order to localStorage
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));

        // Clear the cart
        localStorage.removeItem('cart');

        // Redirect to confirmation page with order ID
        window.location.href = `confirmation.html?orderId=${order.orderId}`;
    }

    // ========================================
    // 5. GET VENDOR NAME (from cart or default)
    // ========================================
    function getVendorName() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        // Try to get vendor from first item (you can expand this later)
        // For now, use a default or try to extract from menu page
        if (cart.length > 0) {
            // You could store vendor in cart items or use a default
            return 'Campus Grill';
        }
        return 'Campus Grill';
    }

    // ========================================
    // 6. EVENT LISTENERS
    // ========================================
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }

    // ========================================
    // 7. INITIALIZE
    // ========================================
    displayCart();
    updateCartCount();

    // Listen for cart updates from other tabs/windows
    window.addEventListener('storage', function(e) {
        if (e.key === 'cart') {
            displayCart();
            updateCartCount();
        }
    });

    console.log('✅ Checkout page loaded');
});