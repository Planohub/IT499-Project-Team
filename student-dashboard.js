// ========================================
// STUDENT-DASHBOARD.JS — Student Vendor Selection
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
    // 1. UPDATE MEAL-PLAN BALANCE
    // ========================================
    const mealPlanBalanceElement = document.getElementById('mealPlanBalance');
    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent = `$${getMealPlanBalance().toFixed(2)}`;
    }

    // ========================================
    // 2. UPDATE CART COUNT
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
    // 3. RENDER VENDOR GRID
    // ========================================
    const vendorGrid = document.getElementById('vendorGrid');

    const allVendors = getAllVendors();

    const activeVendors = allVendors.filter(vendor => {
        if (vendor.isActive === false) return false;
        const menuItems = getVendorMenuItems(vendor.id);
        const hasActiveItem = menuItems.some(item => 
            item.isActive === true && item.isAvailable === true
        );
        return hasActiveItem;
    });

    if (activeVendors.length === 0) {
        vendorGrid.innerHTML = `
            <div style="text-align:center; padding:60px 20px; grid-column: 1 / -1;">
                <p style="font-size:1.2rem; color:var(--grey);">🍽️ No vendors are currently available</p>
                <p style="color:var(--lightGrey); margin-top:8px;">Please check back later</p>
            </div>
        `;
        return;
    }

    let vendorHTML = '';
    activeVendors.forEach(vendor => {
        const menuItems = getVendorMenuItems(vendor.id);
        const activeItemCount = menuItems.filter(item => 
            item.isActive === true && item.isAvailable === true
        ).length;

        const isOpen = isVendorOpen(vendor.id);
        const statusText = isOpen ? '🟢 Open' : '🔴 Closed';
        const statusColor = isOpen ? '#2e7d32' : '#c62828';
        const hours = getVendorHours(vendor.id);

        vendorHTML += `
            <a href="menu.html" class="vendorBox" 
               data-vendor-id="${vendor.id}" 
               data-vendor-name="${vendor.name}" 
               data-vendor-location="${vendor.location || 'Campus Location'}">
                <h4>${vendor.name}</h4>
                <p>${vendor.location || 'Location not specified'}</p>
                <p style="font-size:0.8rem; color:${statusColor}; font-weight:600; margin-top:4px;">${statusText}</p>
                <p style="font-size:0.75rem; color:var(--grey); margin-top:2px;">Hours: ${hours}</p>
                <p style="font-size:0.8rem; color:var(--grey); margin-top:2px;">${activeItemCount} items available</p>
                <span class="secondaryButton">View Menu →</span>
            </a>
        `;
    });

    vendorGrid.innerHTML = vendorHTML;

    // ========================================
    // 4. VENDOR CLICK HANDLER
    // ========================================
    const vendorLinks = document.querySelectorAll('.vendorBox[data-vendor-id]');

    vendorLinks.forEach(vendorLink => {
        vendorLink.addEventListener('click', function (event) {
            event.preventDefault();

            const selectedVendor = {
                vendorId: Number(this.dataset.vendorId),
                vendorName: this.dataset.vendorName,
                location: this.dataset.vendorLocation
            };

            try {
                localStorage.setItem('campusFoodLinkSelectedVendor', JSON.stringify(selectedVendor));
                console.log('✅ Vendor saved:', selectedVendor);
            } catch (e) {
                console.error('❌ Error saving vendor:', e);
                alert('Unable to select the vendor. Please try again.');
                return;
            }

            window.location.href = this.getAttribute('href');
        });
    });

    console.log('✅ Student dashboard loaded');
    console.log(`📦 ${activeVendors.length} active vendors with menu items`);
});