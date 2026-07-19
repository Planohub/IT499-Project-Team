document.addEventListener('DOMContentLoaded', function () {
    const cart = getCart();

    const checkoutItems = document.getElementById('checkoutItems');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');
    const cartLink = document.getElementById('cartLink');
    const placeOrderButton = document.getElementById('placeOrderButton');
    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');

    const mealPlanBalance = getMealPlanBalance();
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent = `$${mealPlanBalance.toFixed(2)}`;
    }

    const cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    if (cart.length === 0) {
        checkoutItems.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">🛒 Your cart is empty</p>';
        subtotalElement.textContent = '$0.00';
        taxElement.textContent = '$0.00';
        totalElement.textContent = '$0.00';
        return;
    }

    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const checkoutItem = document.createElement('div');
        checkoutItem.classList.add('checkoutItem');

        checkoutItem.innerHTML = `
            <div class="itemSummary">
                <span class="itemName">${item.item}</span>
                <span class="itemQty">x${item.quantity}</span>
            </div>
            <span class="itemPrice">$${itemTotal.toFixed(2)}</span>
        `;

        checkoutItems.appendChild(checkoutItem);
    });

    const taxRate = 0.075; // 7.5% tax
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    taxElement.textContent = `$${tax.toFixed(2)}`;
    totalElement.textContent = `$${total.toFixed(2)}`;


    const NEXT_ORDER_ID_KEY = 'campusFoodLinkNextOrderId';

    function getNextOrderId() {
        const savedId = localStorage.getItem(NEXT_ORDER_ID_KEY);
        let nextOrderId = savedId ? Number(savedId) : 9004;

        localStorage.setItem(
            NEXT_ORDER_ID_KEY,
            String(nextOrderId + 1)
        );

        return nextOrderId;
    }


    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', function () {
            const currentCart = getCart();

            if (currentCart.length === 0) {
                alert('Your cart is empty. Please add items before placing an order.');
                return;
            }

            const selectedVendor = getSelectedVendor();

            if (!selectedVendor) {
                alert('Please select a vendor before placing an order.');
                window.location.href = 'vendors.html';
                return;
            }

            let orderSubtotal = 0;
            currentCart.forEach(item => {
                orderSubtotal += item.price * item.quantity;
            });
            const orderTax = Number((orderSubtotal * 0.075).toFixed(2));
            const orderTotal = Number((orderSubtotal + orderTax).toFixed(2));

            const currentBalance = getMealPlanBalance();

            if (orderTotal > currentBalance) {
                alert('Insufficient meal-plan balance.');
                return;
            }

            const updatedBalance = currentBalance - orderTotal;


            const order = {
                orderId: getNextOrderId(),
                studentId: 101,
                vendorId: selectedVendor.vendorId,
                vendorName: selectedVendor.vendorName,
                orderDate: new Date().toLocaleString(),
                timestamp: Date.now(),
                items: currentCart.map(item => ({
                    name: item.item,
                    price: item.price,
                    quantity: item.quantity,
                    total: item.price * item.quantity
                })),
                subtotal: Number(orderSubtotal.toFixed(2)),
                tax: Number(orderTax.toFixed(2)),
                total: Number(orderTotal.toFixed(2)),
                currentStatus: 'Pending',
                completedTime: null
            };

            const wasSaved = saveLatestOrder(order);

            if (!wasSaved) {
                alert('Unable to place the order. Please try again.');
                return;
            }

            const balanceWasSaved = saveMealPlanBalance(updatedBalance);

            if (!balanceWasSaved) {
                alert('Unable to update the meal-plan balance.');
                return;
            }

            // Retrieve existing order history from localStorage
            let orders = [];

            try {
                const savedOrders = JSON.parse(localStorage.getItem('orders'));

                if (Array.isArray(savedOrders)) {
                    orders = savedOrders;
                }
            } catch (e) {
                console.error('Unable to read order history', e);
            }

            // Add the new order and save the updated history
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));

            // Clear cart after saving the order to localStorage
            clearCart();
            window.location.href = `confirmation.html?orderId=${order.orderId}`;
        });
    }

    console.log('✅ Checkout page loaded');
});