// ===================================
// Menu buttons and interactions
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // Get cart count element
    const cartLink = document.querySelector('.navigationLinks a[href="checkout.html"]');
    let cartCount = 0;

    // Menu item cards
    const menuCards = document.querySelectorAll('.menuItemBox');

    menuCards.forEach(card => {
        card.addEventListener('click', () => {
            // Get item name and price from data attributes
            const itemName = card.getAttribute('data-item');
            const itemPrice = card.getAttribute('data-price');

            // Increment cart count
            cartCount++;

            if (cartLink) {
                cartLink.textContent = `Cart (${cartCount})`;
            }

            // Add visual feedback
            card.classList.add('added');

            const overlay = card.querySelector('.menuItemPictureOverlay');

            if (overlay) {
                overlay.textContent = 'Added!';
            }

            // Reset visual feedback after 1.5 seconds
            setTimeout(() => {
                card.classList.remove('added');

                if (overlay) {
                    overlay.textContent = 'Add';
                }
            }, 1500);

            // For later debugging, log the item added and current cart count
            console.log(`Added: ${itemName} ($${itemPrice}) - Cart: ${cartCount}`);
        });
    });
});