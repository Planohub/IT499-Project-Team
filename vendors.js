document.addEventListener('DOMContentLoaded', function () {
    const mealPlanBalanceElement =
        document.getElementById('mealPlanBalance');

    // Make sure there is a meal-plan balance element, then update it
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent =
            `$${getMealPlanBalance().toFixed(2)}`;
    }

    const cart = getCart();

    const cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    const cartLink = document.getElementById('cartLink');

    // Add the correct number of items in the cart to the nav cart link text
    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    const vendorLinks = document.querySelectorAll('.vendorBox[data-vendor-id]');

    vendorLinks.forEach(vendorLink => {
        vendorLink.addEventListener('click', function (event) {
            event.preventDefault();

            const selectedVendor = {
                vendorId: Number(vendorLink.dataset.vendorId),
                vendorName: vendorLink.dataset.vendorName
            };

            const wasSaved = saveSelectedVendor(selectedVendor);

            if (!wasSaved) {
                alert('Unable to select the vendor.');
                return;
            }

            window.location.href = vendorLink.getAttribute('href');
        });
    });
});