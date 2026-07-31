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

    // Get the active student
    const activeStudent = getActiveStudentSession();
    const studentId = activeStudent ? activeStudent.userID : 101;

    // Update header badge
    const studentBadge = document.getElementById('studentHeaderBadge');
    if (studentBadge && activeStudent) {
        studentBadge.textContent = `🎓 ${activeStudent.firstName} ${activeStudent.lastName}`;
    }

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
        if (checkoutItems) {
            checkoutItems.innerHTML = '<p style="text-align:center; padding:20px; color:var(--grey);">🛒 Your cart is empty</p>';
        }
        if (subtotalElement) subtotalElement.textContent = '$0.00';
        if (taxElement) taxElement.textContent = '$0.00';
        if (totalElement) totalElement.textContent = '$0.00';
        return;
    }

    let subtotal = 0;

    // Populate and display row for each cart item
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
        const removeItemButton = checkoutItem.querySelector('.removeItemButton');

        if (decreaseQuantityButton) {
            decreaseQuantityButton.addEventListener('click', function () {
                const updatedCart = cart.map(cartItem => {
                    if (cartItem.item === item.item) {
                        return {
                            ...cartItem,
                            quantity: cartItem.quantity - 1
                        };
                    }
                    return cartItem;
                }).filter(cartItem => cartItem.quantity > 0);

                saveCart(updatedCart);
                window.location.reload();
            });
        }

        if (increaseQuantityButton) {
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
        }

        if (removeItemButton) {
            removeItemButton.addEventListener('click', function () {
                const updatedCart = cart.filter(cartItem => {
                    return cartItem.item !== item.item;
                });

                saveCart(updatedCart);
                window.location.reload();
            });
        }

        if (checkoutItems) {
            checkoutItems.appendChild(checkoutItem);
        }
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
    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `$${tax.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;

    // Process order on click (Place Order)
    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', async function () {
            const currentCart = getCart();

            if (currentCart.length === 0) {
                alert(
                    'Your cart is empty. Please add items before placing an order.'
                );
                return;
            }

            const selectedVendor = getSelectedVendor();

            if (!selectedVendor) {
                alert('Please select a vendor before placing an order.');
                window.location.href = 'student-dashboard.html';
                return;
            }

            const itemsWithoutIds = currentCart.filter(item =>
                !Number.isInteger(Number(item.itemId))
            );

            if (itemsWithoutIds.length > 0) {
                alert(
                    'This cart contains older item data. Clear the cart and add the items again.'
                );
                return;
            }

            const targetVendorId = Number(
                selectedVendor.vendorId || selectedVendor.id
            );

            placeOrderButton.disabled = true;
            placeOrderButton.textContent = 'Placing Order...';

            try {
                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        studentId: Number(studentId),
                        vendorId: targetVendorId,
                        items: currentCart.map(item => ({
                            itemId: Number(item.itemId),
                            quantity: Number(item.quantity)
                        }))
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || 'Unable to place the order.'
                    );
                }

                /*
                 * Temporary compatibility:
                 * confirmation.js still reads orders from localStorage.
                 * We will replace that with a database GET endpoint next.
                 */
                saveOrder(result.order);
                saveMealPlanBalance(Number(result.newBalance));

                clearCart();

                window.location.href =
                    `confirmation.html?orderId=${result.order.orderId}`;

            } catch (error) {
                console.error('Unable to place order:', error);
                alert(error.message);

                placeOrderButton.disabled = false;
                placeOrderButton.textContent = 'Place Order';
            }
        });
    }

    console.log('✅ Checkout page loaded');
});