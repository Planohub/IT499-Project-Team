// ========================================
// MENU.JS — Database-Backed Menu Page
// ========================================

document.addEventListener('DOMContentLoaded', async function () {
    const activeStudent = getActiveStudentSession();
    const selectedVendor = getSelectedVendor();

    updateStudentHeader(activeStudent);
    updateBalance();
    updateCartCount();

    if (!selectedVendor || !selectedVendor.vendorId) {
        alert('Please select a vendor first.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    const menuGrid = document.getElementById('menuItemGrid');

    if (!menuGrid) {
        console.error('Menu item grid was not found.');
        return;
    }

    menuGrid.innerHTML = `
        <div class="vendorGridMessage">
            <p>Loading menu...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `/api/vendors/${selectedVendor.vendorId}/menu`
        );

        if (response.status === 404) {
            throw new Error('The selected vendor was not found.');
        }

        if (!response.ok) {
            throw new Error(
                `Menu request failed with status ${response.status}`
            );
        }

        const menuData = await response.json();
        const vendor = menuData.vendor;
        const menuItems = menuData.menuItems;

        updateVendorHeader(vendor);

        if (!vendor.isActive) {
            showClosedVendor(
                menuGrid,
                vendor,
                'This vendor is currently inactive.'
            );
            return;
        }

        const isOpen = getOpenStatus(vendor.operatingHours);

        addVendorStatusBanner(vendor, isOpen);

        if (!isOpen) {
            showClosedVendor(
                menuGrid,
                vendor,
                'This vendor is currently closed.'
            );
            return;
        }

        const availableItems = menuItems.filter(item =>
            item.isActive === true &&
            item.isAvailable === true
        );

        if (availableItems.length === 0) {
            menuGrid.innerHTML = `
                <div class="vendorGridMessage">
                    <p>🍽️ No menu items are currently available.</p>
                    <p>Please check back later.</p>
                </div>
            `;
            return;
        }

        renderMenuItems(availableItems, menuGrid);
        attachCartListeners(vendor);

        console.log(
            `✅ Loaded ${availableItems.length} menu items from SQLite`
        );

    } catch (error) {
        console.error('Unable to load the vendor menu:', error);

        menuGrid.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load this menu.</p>
                <p>Please return to the vendor list and try again.</p>
            </div>
        `;
    }
});


function updateStudentHeader(activeStudent) {
    const studentBadge = document.getElementById('studentHeaderBadge');

    if (studentBadge) {
        studentBadge.textContent =
            `🎓 ${activeStudent.firstName} ${activeStudent.lastName}`;
    }
}


function updateBalance() {
    const balanceElement = document.getElementById('mealPlanBalance');

    if (balanceElement) {
        balanceElement.textContent =
            `$${getMealPlanBalance().toFixed(2)}`;
    }
}


function updateCartCount() {
    const cartLink = document.getElementById('cartLink');

    if (cartLink) {
        cartLink.textContent = `Cart (${getCartCount()})`;
    }
}


function updateVendorHeader(vendor) {
    const vendorNameElement =
        document.getElementById('vendor-name');

    const vendorLocationElement =
        document.getElementById('vendorLocation');

    if (vendorNameElement) {
        vendorNameElement.textContent = vendor.name;
    }

    if (vendorLocationElement) {
        vendorLocationElement.textContent =
            vendor.location || 'Location not specified';
    }
}


function addVendorStatusBanner(vendor, isOpen) {
    const header = document.querySelector('.menuPageHeader');

    if (!header) {
        return;
    }

    const existingBanner =
        header.querySelector('.status-banner');

    if (existingBanner) {
        existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.className = 'status-banner';

    if (isOpen) {
        banner.style.cssText = `
            background-color: var(--success-background);
            border: 2px solid var(--success);
            color: var(--success);
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
            <span>
                🟢 This vendor is currently <strong>Open</strong>
            </span>

            <span style="font-weight:400; font-size:0.9rem;">
                Hours: ${escapeHtml(vendor.operatingHours)}
            </span>
        `;
    } else {
        banner.style.cssText = `
            background-color: var(--danger-background);
            border: 2px solid var(--danger);
            color: var(--danger);
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 10px;
            font-weight: 600;
        `;

        banner.textContent =
            `🔴 Closed — Hours: ${vendor.operatingHours}`;
    }

    header.appendChild(banner);
}


function showClosedVendor(menuGrid, vendor, message) {
    menuGrid.innerHTML = `
        <div class="vendorGridMessage">
            <div style="font-size:4rem; margin-bottom:20px;">
                🔒
            </div>

            <h2 style="color:var(--danger); margin-bottom:10px;">
                Vendor Unavailable
            </h2>

            <p>
                ${escapeHtml(message)}
            </p>

            <p style="margin-top:10px;">
                Operating Hours:
                <strong>
                    ${escapeHtml(vendor.operatingHours)}
                </strong>
            </p>

            <a
                href="student-dashboard.html"
                class="secondaryButton"
                style="margin-top:20px;"
            >
                ← Back to Vendors
            </a>
        </div>
    `;

    const menuActions = document.querySelector('.menuActions');

    if (menuActions) {
        menuActions.style.display = 'none';
    }
}


function renderMenuItems(items, menuGrid) {
    menuGrid.innerHTML = items.map(item => `
        <div class="menuItemWrapper">
            <span class="itemNameAbove">
                ${escapeHtml(item.name)}
            </span>

            <div
                class="menuItemBox"
                data-item-id="${item.id}"
                data-item-name="${escapeHtml(item.name)}"
                data-item-price="${item.price}"
            >
                <div class="menuItemPicture">
                    <span class="menuItemPictureOverlay">
                        Add
                    </span>
                </div>

                <div class="menuItemPriceArea">
                    <span class="menuItemPrice">
                        $${Number(item.price).toFixed(2)}
                    </span>
                </div>

                ${
                    item.description
                        ? `
                            <p class="menuItemDescription">
                                ${escapeHtml(item.description)}
                            </p>
                        `
                        : ''
                }
            </div>
        </div>
    `).join('');
}


function attachCartListeners(vendor) {
    const menuCards =
        document.querySelectorAll('.menuItemBox[data-item-id]');

    menuCards.forEach(card => {
        card.addEventListener('click', function () {
            const itemId = Number(this.dataset.itemId);
            const itemName = this.dataset.itemName;
            const itemPrice = Number(this.dataset.itemPrice);

            const cart = getCart();

            const existingItem = cart.find(item =>
                Number(item.itemId) === itemId
            );

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    itemId: itemId,
                    item: itemName,
                    price: itemPrice,
                    quantity: 1,
                    vendorId: vendor.id,
                    vendorName: vendor.name
                });
            }

            const saved = saveCart(cart);

            if (!saved) {
                alert('Unable to add this item to the cart.');
                return;
            }

            updateCartCount();
            showAddedFeedback(this);

            console.log(
                `✅ Added SQLite menu item ${itemId} to local cart`
            );
        });
    });
}


function showAddedFeedback(card) {
    card.classList.add('added');

    const overlay =
        card.querySelector('.menuItemPictureOverlay');

    if (overlay) {
        overlay.textContent = '✅ Added!';
    }

    setTimeout(() => {
        card.classList.remove('added');

        if (overlay) {
            overlay.textContent = 'Add';
        }
    }, 1500);
}


function getOpenStatus(operatingHours) {
    if (
        typeof operatingHours !== 'string' ||
        !operatingHours.includes('-')
    ) {
        return true;
    }

    try {
        const [openingTime, closingTime] =
            operatingHours.split('-').map(time => time.trim());

        const [openingHour, openingMinute] =
            openingTime.split(':').map(Number);

        const [closingHour, closingMinute] =
            closingTime.split(':').map(Number);

        const now = new Date();

        const currentMinutes =
            now.getHours() * 60 + now.getMinutes();

        const openingMinutes =
            openingHour * 60 + openingMinute;

        const closingMinutes =
            closingHour * 60 + closingMinute;

        if (closingMinutes < openingMinutes) {
            return (
                currentMinutes >= openingMinutes ||
                currentMinutes < closingMinutes
            );
        }

        return (
            currentMinutes >= openingMinutes &&
            currentMinutes < closingMinutes
        );

    } catch (error) {
        console.error('Unable to parse vendor hours:', error);
        return true;
    }
}


function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}