// ========================================
// MENU.JS — Dynamic Menu Page Logic
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    // ========================================
    // 1. GET SELECTED VENDOR
    // ========================================
    const selectedVendor = getSelectedVendor();

    // If no vendor selected, redirect back to student dashboard
    if (!selectedVendor) {
        alert('Please select a vendor first.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    // ========================================
    // 2. UPDATE HEADER WITH VENDOR INFO
    // ========================================
    const vendorNameElement = document.getElementById('vendor-name');
    const vendorLocationElement = document.getElementById('vendorLocation');

    if (vendorNameElement) {
        vendorNameElement.textContent = selectedVendor.vendorName || 'Vendor';
    }

    if (vendorLocationElement) {
        vendorLocationElement.textContent = selectedVendor.location || 'Location not specified';
    }

    // ========================================
    // 3. UPDATE MEAL-PLAN BALANCE
    // ========================================
    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent = `$${getMealPlanBalance().toFixed(2)}`;
    }

    // ========================================
    // 4. UPDATE CART COUNT
    // ========================================
    const cart = getCart();
    const cartCount = cart.reduce((total, item) => {
        return total + item.quantity;
    }, 0);

    const cartLink = document.getElementById('cartLink');
    if (cartLink) {
        cartLink.textContent = `Cart (${cartCount})`;
    }

    // ========================================
    // 5. LOAD AND RENDER MENU ITEMS
    // ========================================
    const menuGrid = document.getElementById('menuItemGrid');

    // Get menu items for this vendor
    const allMenuItems = getVendorMenuItems(selectedVendor.vendorId);

    // Filter to show only active and available items
    const availableItems = allMenuItems.filter(item => 
        item.isActive === true && item.isAvailable === true
    );

    if (availableItems.length === 0) {
        menuGrid.innerHTML = `
            <div style="text-align:center; padding:60px 20px; grid-column: 1 / -1;">
                <p style="font-size:1.2rem; color:var(--grey);">🍽️ No menu items currently available</p>
                <p style="color:var(--lightGrey); margin-top:8px;">Please check back later</p>
            </div>
        `;
        return;
    }

    // Build menu item cards
    let menuHTML = '';
    availableItems.forEach(item => {
        menuHTML += `
            <div class="menuItemWrapper">
                <span class="itemNameAbove">${item.name}</span>
                <div class="menuItemBox" data-item="${item.name}" data-price="${item.price}" data-item-id="${item.id}">
                    <div class="menuItemPicture">
                        <span class="menuItemPictureOverlay">Add</span>
                    </div>
                    <div class="menuItemPriceArea">
                        <span class="menuItemPrice">$${item.price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    });

    menuGrid.innerHTML = menuHTML;

    // ========================================
    // 6. ADD TO CART FUNCTIONALITY
    // ========================================
    const menuCards = document.querySelectorAll('.menuItemBox');

    menuCards.forEach(card => {
        card.addEventListener('click', function () {
            const itemName = this.getAttribute('data-item');
            const itemPrice = parseFloat(this.getAttribute('data-price'));

            // Get current cart from localStorage
            let cart = getCart();

            // Check if item already exists in cart
            const existingItem = cart.find(item => item.item === itemName);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    item: itemName,
                    price: itemPrice,
                    quantity: 1
                });
            }

            // 🔥 SAVE THE CART TO LOCALSTORAGE
            const saved = saveCart(cart);
            console.log('💾 Cart saved:', saved, cart);

            // Update cart count
            const newCartCount = cart.reduce((total, item) => {
                return total + item.quantity;
            }, 0);

            if (cartLink) {
                cartLink.textContent = `Cart (${newCartCount})`;
            }

            // Visual feedback
            this.classList.add('added');
            const overlay = this.querySelector('.menuItemPictureOverlay');
            if (overlay) {
                overlay.textContent = '✅ Added!';
            }

            setTimeout(() => {
                this.classList.remove('added');
                if (overlay) {
                    overlay.textContent = 'Add';
                }
            }, 1500);

            console.log(`✅ Added: ${itemName} ($${itemPrice}) - Cart: ${newCartCount}`);
        });
    });

    console.log(`✅ Menu loaded for vendor: ${selectedVendor.vendorName}`);
    console.log(`📦 ${availableItems.length} items available`);
});