document.addEventListener('DOMContentLoaded', function () {
    const cart = getCart();

    const checkoutItems = document.getElementById('checkoutItems');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');
    const cartLink = document.getElementById('cartLink');

    const cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    const placeOrderButton = document.getElementById('placeOrderButton');

    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    if (cart.length === 0) {
        checkoutItems.innerHTML = '<p>Your cart is empty</p>';

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

    const taxRate = 0.075; // tax rate of 7.5%
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

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
            if (cart.length === 0) {
                alert('Your cart is empty');
                return;
            }

            const selectedVendor = getSelectedVendor();

            if (!selectedVendor) {
                alert('Please Select a vendor before placing an order.');
                window.location.href = 'vendors.html';
                return;
            }

            const order = {
                orderId: getNextOrderId(),
                studentId: 101,
                vendorId: selectedVendor.vendorId,
                vendorName: selectedVendor.vendorName,
                orderDate: new Date().toISOString(),
                items: cart,
                subtotal: Number(subtotal.toFixed(2)),
                tax: Number(tax.toFixed(2)),
                orderTotal: Number(total.toFixed(2)),
                currentStatus: 'Pending',
                completedTime: null
            };

            const wasSaved = saveLatestOrder(order);

            if (!wasSaved) {
                alert('Unable to place the order. Please try again.');
                return;
            }

            clearCart();
            window.location.href = 'confirmation.html';
        });
    }
});