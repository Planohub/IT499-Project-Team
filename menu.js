/**
 * CampusFoodLink+ — Menu Page Logic (menu.js)
 * Captures user item selections, validates data, and delegates to StorageManager.
 */

document.addEventListener('DOMContentLoaded', function () {
    const menuCards = document.querySelectorAll('.menuItemBox');

    menuCards.forEach(card => {
        card.addEventListener('click', () => {
            // Retrieve data attributes from card
            const itemName = card.getAttribute('data-item');
            const itemPrice = card.getAttribute('data-price');

            // Construct payload
            const rawPayload = {
                name: itemName,
                price: itemPrice
            };

            // Attempt to add item through StorageManager validation
            const success = StorageManager.addToCart(rawPayload, 1);

            if (success) {
                // Provide visual confirmation feedback
                card.classList.add('added');
                const overlay = card.querySelector('.menuItemPictureOverlay');

                if (overlay) {
                    overlay.textContent = 'Added!';
                }

                // Reset overlay text after 1.5 seconds
                setTimeout(() => {
                    card.classList.remove('added');
                    if (overlay) {
                        overlay.textContent = 'Add';
                    }
                }, 1500);
            }
        });
    });
});