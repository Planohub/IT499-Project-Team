document.addEventListener('DOMContentLoaded', function () {
    const mealPlanBalanceElement =
        document.getElementById('mealPlanBalance');

    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent =
            `$${getMealPlanBalance().toFixed(2)}`;
    }

    const cartLink = document.querySelector(
        '.navigationLinks a[href="checkout.html"]'
    );

    // Select all menu item cards
    const menuCards = document.querySelectorAll('.menuItemBox');

    let cart = getCart();

    // Count the total quantity of all cart items
    let cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    // Update nav cart text to display the current cart item count
    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    // Iterate through each menu item card
    menuCards.forEach(card => {
        // When a menuItemBox is clicked, add item to cart and update the cart count
        card.addEventListener('click', () => {
            const itemName = card.getAttribute('data-item');
            const itemPrice = card.getAttribute('data-price');

            // Check if the selected item is already in the cart
            const existingItem = cart.find(item => item.item === itemName);

            // Increase the existing quantity or add a new cart item
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    item: itemName,
                    price: Number(itemPrice),
                    quantity: 1
                });
            }
            // Send updated cart array to local storage (storage.js)
            saveCart(cart);

            // Recalculate the total cart count after updating the cart
            cartCount = cart.reduce((total, item) => {
                return total + item.quantity;
            }, 0);

            // Update the cart link text with the new count
            if (cartLink) {
                cartLink.textContent = `Cart (${cartCount})`;
            }

            // Add CSS to show the item has been added to the cart
            card.classList.add('added');

            const overlay = card.querySelector('.menuItemPictureOverlay');

            // Change overlay text to indicate the item has been added
            if (overlay) {
                overlay.textContent = 'Added!';
            }

            // Reset the visible confirmation after 1.5 seconds
            setTimeout(() => {
                card.classList.remove('added');

                if (overlay) {
                    overlay.textContent = 'Add';
                }
            }, 1500); // 1500ms

            // Log the addition of the item to the console
            console.log(
                `Added ${itemName} ($${itemPrice}) - Cart: ${cartCount}`
            );
        });
    });
});