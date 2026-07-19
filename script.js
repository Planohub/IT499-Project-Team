document.addEventListener('DOMContentLoaded', function () {
    const cartLink = document.querySelector(
        '.navigationLinks a[href="checkout.html"]'
    );

    // Select all menu item cards (querySelectorAll)
    const menuCards = document.querySelectorAll('.menuItemBox');

    let cart = getCart();

    let cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    menuCards.forEach(card => {
        card.addEventListener('click', () => {
            const itemName = card.getAttribute('data-item');
            const itemPrice = card.getAttribute('data-price');

            const existingItem = cart.find(item => item.item === itemName);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    item: itemName,
                    price: Number(itemPrice),
                    quantity: 1
                });
            }
            saveCart(cart);

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

            if (overlay) {
                overlay.textContent = 'Added!';
            }

            // Reset the visible confirmation after 1.5 seconds
            setTimeout(() => {
                card.classList.remove('added');

                if (overlay) {
                    overlay.textContent = 'Add';
                }
            }, 1500);

            console.log(
                `Added ${itemName} ($${itemPrice}) - Cart: ${cartCount}`
            );
        });
    });
});