/*
 * Load Page
 * Retrieve cart/meal-plan balance
 * Display each cart item
 * Allow individual/full cart item(s) removal
 * Calculate subtotal, tax, total
 * Validate order
 * Create and save order
 * Deduct total from meal-plan balance
 * OPTION: clear cart/cart item
 * Open confirmation page
 */

document.addEventListener('DOMContentLoaded', function () {
    // Load current cart from localStorage
    const cart = getCart();

    // All checkout page elements that script needs to update
    const checkoutItems = document.getElementById('checkoutItems');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');
    const cartLink = document.getElementById('cartLink');
    const placeOrderButton = document.getElementById('placeOrderButton');
    const clearCartButton = document.getElementById('clearCartButton');
    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');

    // Display meal plan balance if available
    const mealPlanBalance = getMealPlanBalance();
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent = `$${mealPlanBalance.toFixed(2)}`;
    }

    // Add total quantity of cart items
    const cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    // Update nav cart link with current amount of cart items
    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    // Display message if cart is empty
    if (cart.length === 0) {
        checkoutItems.innerHTML = '<p style="text-align:center; padding:20px; color:var(--grey);">🛒 Your cart is empty</p>';
        subtotalElement.textContent = '$0.00';
        taxElement.textContent = '$0.00';
        totalElement.textContent = '$0.00';
        return;
    }

    let subtotal = 0;

    // Populate and display on row for each cart item
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const checkoutItem = document.createElement('div');
        checkoutItem.classList.add('checkoutItem');


        checkoutItem.innerHTML = `
            <div class="itemSummary">
                <span class="itemName">${item.item}</span>
                <div class="quantityControls">
                    <button class="decreaseQuantityButton">-</button>
                    <span class="itemQty">${item.quantity}</span>
                    <button class="increaseQuantityButton">+</button>
                </div>
            </div>
            <span class="itemPrice">$${itemTotal.toFixed(2)}</span>

            <button class="removeItemButton">❌</button>
        `;

        // Decrease/Increase itemQty
        const decreaseQuantityButton = checkoutItem.querySelector('.decreaseQuantityButton');
        const increaseQuantityButton = checkoutItem.querySelector('.increaseQuantityButton');

        // Find and remove an item from the cart and save
        const removeItemButton = checkoutItem.querySelector('.removeItemButton');


        decreaseQuantityButton.addEventListener('click', function () {
            const updatedCart = cart.map(cartItem => {
                if (cartItem.item === item.item) {
                    return {
                        ...cartItem,
                        quantity: cartItem.quantity - 1
                    };
                }

                return cartItem;
            })
                .filter(cartItem => cartItem.quantity > 0);

            saveCart(updatedCart);
            window.location.reload();
        });

        increaseQuantityButton.addEventListener('click', function () {
            const updatedCart = cart.map(cartItem => {
                if (cartItem.item === item.item) {
                    return {
                        ...cartItem,
                        quantity: cartItem.quantity + 1
                    };
                }
                return cartItem;
            });

            saveCart(updatedCart);
            window.location.reload();
        });

        removeItemButton.addEventListener('click', function () {
            const updatedCart = cart.filter(cartItem => {
                return cartItem.item !== item.item;

            });

            saveCart(updatedCart);
            window.location.reload();
        })

        checkoutItems.appendChild(checkoutItem);
    });

    // Clear all cart items
    if (clearCartButton) {
        clearCartButton.addEventListener('click', function () {
            clearCart();
            window.location.reload();
        });
    }

    // Calc order total with tax
    const taxRate = 0.075; // 7.5% tax
    const tax = Number((subtotal * taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    // Display order total with subtotal, tax, and total
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    taxElement.textContent = `$${tax.toFixed(2)}`;
    totalElement.textContent = `$${total.toFixed(2)}`;

    // for localStorage - keep order IDs sequential
    const NEXT_ORDER_ID_KEY = 'campusFoodLinkNextOrderId';

    // Return next available order ID and save the next ID in localStorage
    function getNextOrderId() {
        const savedId = localStorage.getItem(NEXT_ORDER_ID_KEY);

        // Use ID of 9004 to start if no order ID exists
        let nextOrderId = savedId ? Number(savedId) : 9004;

        localStorage.setItem(
            NEXT_ORDER_ID_KEY,
            String(nextOrderId + 1)
        );

        return nextOrderId;
    }

    // Process order on click (Place Order)
    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', function () {
            const currentCart = getCart();

            // Prevent placing an order if cart is empty
            if (currentCart.length === 0) {
                alert('Your cart is empty. Please add items before placing an order.');
                return;
            }

            const selectedVendor = getSelectedVendor();

            // Student must select vendor to order
            if (!selectedVendor) {
                alert('Please select a vendor before placing an order.');
                window.location.href = 'vendors.html';
                return;
            }

            // Calculate final order subtotal, tax, and total
            let orderSubtotal = 0;
            currentCart.forEach(item => {
                orderSubtotal += item.price * item.quantity;
            });
            const orderTax = Number((orderSubtotal * 0.075).toFixed(2));
            const orderTotal = Number((orderSubtotal + orderTax).toFixed(2));

            // Check if student has sufficient meal-plan balance
            const currentBalance = getMealPlanBalance();

            if (orderTotal > currentBalance) {
                alert('Insufficient meal-plan balance.');
                return;
            }

            const updatedBalance = currentBalance - orderTotal;

            // Create order object with order details
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

            // Save order for confirmation page to retrieve
            const wasSaved = saveLatestOrder(order);

            if (!wasSaved) {
                alert('Unable to place the order. Please try again.');
                return;
            }

            // Deduct order total from meal-plan balance
            const balanceWasSaved = saveMealPlanBalance(updatedBalance);

            if (!balanceWasSaved) { // check for error
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