document.addEventListener('DOMContentLoaded', function () {
    const cartLink = document.querySelector(
        '.navigationLinks a[href="checkout.html"]'
    );

    let cartCount = 0;

    // Select all menu item cards (querySelectorAll)
    const menuCards = document.querySelectorAll('.menuItemBox');

    menuCards.forEach(card => {
        card.addEventListener('click', () => {
            console.log('Card clicked', card);

            const itemName = card.getAttribute('data-item');
            const itemPrice = card.getAttribute('data-price');

            cartCount++;

            // Template literal to update the cart link text with the new count
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