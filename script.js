// ===================================
// Menu buttons and interactions
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // Get cart count element
    const cartLink = document.querySelector('.navigationLinks a[href="checkout.html"]');
    let cartCount = 0;

    // Menu item cards
    const menuCards = document.querySelectorAll('.menu-item-card');

    menuCards.forEach(card => {
        card.addEventListener('click', function() {
            // Get item name and price from data attributes
            const itemName = this.getAttribute('data-item');
            const itemPrice = this.getAttribute('data-price');

            // Increment cart count
            cartCount++;
            if (cartLink) {
                cartLink.textContent = `Cart (${cartCount})`;
            }

            // Visual feedback - show added state
            this.classList.add('added');

            // Change overlay text to "Added!"
            const overlay = this.querySelector('.add-overlay');
            if (overlay) {
                overlay.textContent = 'Added!';
            }

            // Reset after 1.5 seconds
            setTimeout(() => {
                this.classList.remove('added');
                if (overlay) {
                    overlay.textContent = 'Add';
                }
            }, 1500);

            console.log(`Added: ${itemName} ($${itemPrice}) - Cart: ${cartCount}`);
        });
    });
});