// ========================================
// MENU.JS — Database-Backed Menu Page
// ========================================

document.addEventListener('DOMContentLoaded', async function () {
    const activeStudent = getActiveStudentSession();
    const selectedVendor = getSelectedVendor();

    if (!activeStudent || !activeStudent.id) {
        alert('Please log in as a student first.');
        window.location.href = 'index.html';
        return;
    }

    const studentLoaded = await loadStudentProfile(activeStudent.id);

    if (!studentLoaded) {
        return;
    }

    updateCartCount();

    if (!selectedVendor || !selectedVendor.vendorId) {
        alert('Please select a vendor first.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    // Set Vendor Header Details
    const vendorNameHeader = document.getElementById('vendor-name');
    const vendorLocationHeader = document.getElementById('vendorLocation');
    
    if (vendorNameHeader) vendorNameHeader.textContent = selectedVendor.name || 'Vendor Menu';
    if (vendorLocationHeader) vendorLocationHeader.textContent = selectedVendor.location || '';

    const menuGrid = document.getElementById('menuItemGrid');

    if (!menuGrid) {
        console.error('Menu item grid was not found.');
        return;
    }

    menuGrid.innerHTML = `
        <div class="vendorGridMessage" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--grey);">
            <p>Loading menu...</p>
        </div>
    `;

    try {
        const response = await fetch(
            `/api/vendors/${selectedVendor.vendorId}/menu`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to load the menu.');
        }

        const menuItems = Array.isArray(result.menuItems) ? result.menuItems : [];

        if (menuItems.length === 0) {
            menuGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--grey);">
                    <p>This vendor currently has no active items available.</p>
                </div>
            `;
            return;
        }

        // Check if vendor is open based on their hours
        const isOpen = getOpenStatus(result.vendor.operatingHours);

        // 4. RENDER THE MENU ITEMS WITH PICTURES
        menuGrid.innerHTML = menuItems.map(item => {
            // 🔥 NEW IMAGE DISPLAY LOGIC 🔥
            const imageHTML = item.imageUrl 
                ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--lightGrey);">` 
                : `<div style="width: 100%; height: 160px; background: #eee; display: flex; align-items:center; justify-content:center; color:#999; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--lightGrey); font-size: 0.9rem;">No Image Available</div>`;

            const buttonHTML = isOpen 
                ? `<button class="defaultButton addToCartBtn" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}" style="width: 100%; padding: 10px; font-weight: bold;">Add to Cart</button>`
                : `<button class="secondaryButton" disabled style="width: 100%; padding: 10px; opacity: 0.6; cursor: not-allowed;">Closed</button>`;

            return `
                <div class="menuItemCard" style="display: flex; flex-direction: column; justify-content: space-between; background: var(--cardWhite); border: 2px solid var(--black); border-radius: 10px; padding: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div>
                        ${imageHTML}
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 5px;">
                            <h3 style="font-size: 1.15rem; color: var(--black); margin: 0;">${escapeHtml(item.name)}</h3>
                            <span style="font-weight: 700; color: var(--black); font-size: 1.1rem;">$${Number(item.price).toFixed(2)}</span>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--grey); margin-bottom: 15px; line-height: 1.4;">${escapeHtml(item.description || '')}</p>
                    </div>
                    ${buttonHTML}
                </div>
            `;
        }).join('');

        // 5. ATTACH ADD-TO-CART EVENT LISTENERS
        document.querySelectorAll('.addToCartBtn').forEach(button => {
            button.addEventListener('click', function () {
                const itemId = Number(this.dataset.id);
                const name = this.dataset.name;
                const price = Number(this.dataset.price);

                const cart = getCart();
                const existingItem = cart.find(i => Number(i.itemId) === itemId);

                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({ itemId, name, price, quantity: 1 });
                }

                saveCart(cart);
                updateCartCount();

                // Visual Feedback (Button flashes green)
                const originalText = this.innerHTML;
                this.innerHTML = '✅ Added!';
                this.style.backgroundColor = 'var(--success)';
                this.style.borderColor = 'var(--success)';
                this.style.color = '#fff';

                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.backgroundColor = '';
                    this.style.borderColor = '';
                    this.style.color = '';
                }, 1000);
            });
        });

    } catch (error) {
        console.error('Unable to load vendor menu:', error);
        menuGrid.innerHTML = `
            <div class="vendorGridMessage vendorGridError" style="grid-column: 1 / -1; text-align: center; color: var(--danger);">
                <p>Unable to load the menu.</p>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;
    }
});

async function loadStudentProfile(studentId) {
    try {
        const response = await fetch(`/api/students/${studentId}/profile`);
        const student = await response.json();

        if (!response.ok) {
            throw new Error(student.error || 'Unable to load profile.');
        }

        const studentBadge = document.getElementById('studentHeaderBadge');
        if (studentBadge) {
            studentBadge.textContent = `🎓 ${student.firstName} ${student.lastName}`;
        }

        const balanceEl = document.getElementById('mealPlanBalance');
        if (balanceEl) {
            balanceEl.textContent = `$${Number(student.balance).toFixed(2)}`;
        }

        return true;
    } catch (error) {
        console.error('Error loading student profile:', error);
        return false;
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
            background-color: var(--brand-green-light);
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
            background-color: var(--brand-red-light);
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
                <div
                    class="menuItemPicture"
                    ${item.imageUrl
            ? `style="
                                background-image:
                                    linear-gradient(
                                        rgba(0, 0, 0, 0.15),
                                        rgba(0, 0, 0, 0.15)
                                    ),
                                    url('${escapeHtml(item.imageUrl)}');
                                background-size: cover;
                                background-position: center;
                                background-repeat: no-repeat;
                            "`
            : ''
        }
                >
                    <span class="menuItemPictureOverlay">
                        Add
                    </span>
                </div>

                <div class="menuItemPriceArea">
                    <span class="menuItemPrice">
                        $${Number(item.price).toFixed(2)}
                    </span>
                </div>

                ${item.description
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