// ========================================
// MENU.JS — Dynamic Menu Page Logic
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    
    // ========================================
    // 1. GET ACTIVE STUDENT
    // ========================================
    const activeStudent = getActiveStudentSession();
    const studentId = activeStudent.userID;

    // Update header badge
    const studentBadge = document.getElementById('studentHeaderBadge');
    if (studentBadge) {
        studentBadge.textContent = `🎓 ${activeStudent.firstName} ${activeStudent.lastName}`;
    }
    
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
    // 2. CHECK IF VENDOR IS OPEN
    // ========================================
    const isOpen = isVendorOpen(selectedVendor.vendorId);
    const hours = getVendorHours(selectedVendor.vendorId);

    // If vendor is closed, show a message and prevent ordering
    if (!isOpen) {
        const menuGrid = document.getElementById('menuItemGrid');
        if (menuGrid) {
            menuGrid.innerHTML = `
                <div style="text-align:center; padding:60px 20px; grid-column: 1 / -1;">
                    <div style="font-size:4rem; margin-bottom:20px;">🔒</div>
                    <h2 style="color:#c62828; margin-bottom:10px;">Vendor is Closed</h2>
                    <p style="color:var(--grey); font-size:1.1rem; margin-bottom:10px;">
                        ${selectedVendor.vendorName} is currently closed.
                    </p>
                    <p style="color:var(--grey); font-size:1rem; margin-bottom:20px;">
                        Operating Hours: <strong>${hours}</strong>
                    </p>
                    <a href="student-dashboard.html" class="secondaryButton">← Back to Vendors</a>
                </div>
            `;
        }

        // Update vendor name and location
        const vendorNameElement = document.getElementById('vendor-name');
        const vendorLocationElement = document.getElementById('vendorLocation');
        if (vendorNameElement) vendorNameElement.textContent = selectedVendor.vendorName + ' (Closed)';
        if (vendorLocationElement) vendorLocationElement.textContent = selectedVendor.location || 'Location not specified';

        // Add closed status banner
        const header = document.querySelector('.menuPageHeader');
        if (header) {
            const banner = document.createElement('div');
            banner.style.cssText = `
                background-color: #ffebee;
                border: 2px solid #c62828;
                color: #c62828;
                padding: 12px 16px;
                border-radius: 8px;
                margin-top: 10px;
                font-weight: 600;
            `;
            banner.innerHTML = `🔴 This vendor is currently closed. Orders cannot be placed.`;
            header.appendChild(banner);
        }

        // Hide cart button
        const menuActions = document.querySelector('.menuActions');
        if (menuActions) {
            menuActions.style.display = 'none';
        }

        // Update cart count in nav
        const cart = getCart();
        const cartCount = cart.reduce((total, item) => {
            return total + item.quantity;
        }, 0);
        const cartLink = document.getElementById('cartLink');
        if (cartLink) {
            cartLink.textContent = `Cart (${cartCount})`;
        }

        return; // Stop execution — don't load menu items
    }

    // ========================================
    // 3. UPDATE HEADER WITH VENDOR INFO (Open)
    // ========================================
    const vendorNameElement = document.getElementById('vendor-name');
    const vendorLocationElement = document.getElementById('vendorLocation');

    if (vendorNameElement) {
        vendorNameElement.textContent = selectedVendor.vendorName;
    }

    if (vendorLocationElement) {
        vendorLocationElement.textContent = selectedVendor.location || 'Location not specified';
    }

    // Add open status banner
    const header = document.querySelector('.menuPageHeader');
    if (header) {
        // Remove any existing banner
        const existingBanner = header.querySelector('.status-banner');
        if (existingBanner) existingBanner.remove();

        const banner = document.createElement('div');
        banner.className = 'status-banner';
        banner.style.cssText = `
            background-color: #e8f5e9;
            border: 2px solid #2e7d32;
            color: #2e7d32;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 10px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        `;
        banner.innerHTML = `
            <span>🟢 This vendor is currently <strong>Open</strong></span>
            <span style="font-weight:400; font-size:0.9rem;">Hours: ${hours}</span>
        `;
        header.appendChild(banner);
    }

    // ========================================
    // 4. UPDATE MEAL-PLAN BALANCE
    // ========================================
    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent = `$${getMealPlanBalance().toFixed(2)}`;
    }

    // ========================================
    // 5. UPDATE CART COUNT
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
    // 6. LOAD AND RENDER MENU ITEMS
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
    // 7. ADD TO CART FUNCTIONALITY
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

            // SAVE THE CART TO LOCALSTORAGE
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
    console.log(`🟢 Vendor is ${isOpen ? 'Open' : 'Closed'}`);
});