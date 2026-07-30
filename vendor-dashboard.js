// ========================================
// VENDOR-DASHBOARD.JS — Vendor Dashboard Logic
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    // ========================================
    // 1. GET ACTIVE VENDOR SESSION
    // ========================================
    const activeVendor = getActiveVendorSession();
    const ACTIVE_VENDOR_ID = activeVendor.id;

    // ========================================
    // 2. CHECK IF VENDOR IS ACTIVE
    // ========================================
    const allVendors = getAllVendors();
    const vendorProfile = allVendors.find(v => Number(v.id) === Number(ACTIVE_VENDOR_ID));

    // ========================================
    // 🔥 IF VENDOR IS INACTIVE — SHOW CONTACT ADMIN MESSAGE
    // ========================================
    if (!vendorProfile || vendorProfile.isActive === false) {
        const container = document.querySelector('.vendorSelectionContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px 20px; max-width:500px; margin:0 auto;">
                    <div style="font-size:4rem; margin-bottom:20px;">🔒</div>
                    <h2 style="color:#cc0000; margin-bottom:10px;">Account Deactivated</h2>
                    <p style="color:var(--grey); font-size:1.1rem; margin-bottom:20px;">
                        Your vendor account has been deactivated by the Dining Services Administration.
                    </p>
                    <p style="color:var(--grey); margin-bottom:30px;">
                        Please contact the Dining Services Administration for more information about your account status.
                    </p>
                    <a href="index.html" class="defaultButton" style="width:auto; padding:12px 30px;">Return to Login</a>
                </div>
            `;
        }
        const vendorBadge = document.getElementById('vendorHeaderBadge');
        if (vendorBadge) {
            vendorBadge.textContent = '🔒 Account Deactivated';
            vendorBadge.style.color = '#cc0000';
        }
        return;
    }

    // ========================================
    // 3. UPDATE HEADER BADGE (Active Vendor)
    // ========================================
    const vendorBadge = document.getElementById('vendorHeaderBadge');
    if (vendorBadge) {
        vendorBadge.textContent = `🏬 Vendor: ${activeVendor.name}`;
        vendorBadge.style.color = '';
    }

    // ========================================
    // 4. RENDER STATUS BANNER (Open/Closed)
    // ========================================
    function renderStatusBanner() {
        const isOpen = isVendorOpen(ACTIVE_VENDOR_ID);
        const hours = getVendorHours(ACTIVE_VENDOR_ID);
        const statusText = isOpen ? 'Open' : 'Closed';
        const statusColor = isOpen ? '#2e7d32' : '#c62828';

        const header = document.querySelector('.pageHeader');
        if (header) {
            const existingBanner = header.querySelector('.vendor-status-banner');
            if (existingBanner) existingBanner.remove();

            const banner = document.createElement('div');
            banner.className = 'vendor-status-banner';
            banner.style.cssText = `
                background-color: ${isOpen ? '#e8f5e9' : '#ffebee'};
                border: 2px solid ${isOpen ? '#2e7d32' : '#c62828'};
                color: ${isOpen ? '#2e7d32' : '#c62828'};
                padding: 10px 16px;
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
                <span>🟢 Your vendor is currently <strong>${statusText}</strong>
                </span>
            `;
            header.appendChild(banner);
        }
    }

    // ========================================
    // 5. CHECK IF VENDOR HAS ACTIVE MENU ITEMS
    // ========================================
    const menuItems = getVendorMenuItems(ACTIVE_VENDOR_ID);
    const hasActiveItems = menuItems.some(item => 
        item.isActive === true && item.isAvailable === true
    );

    if (!hasActiveItems && vendorProfile && vendorProfile.isActive !== false) {
        const noItemsBanner = document.createElement('div');
        noItemsBanner.style.cssText = `
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 15px;
        `;
        noItemsBanner.innerHTML = '⚠️ <strong>Your vendor account has no active menu items.</strong> Students cannot see your menu. Use the "Mark Available" button to reactivate items.';
        const pageHeader = document.querySelector('.pageHeader');
        if (pageHeader) {
            pageHeader.after(noItemsBanner);
        }
    }

    // ========================================
    // 6. TAB NAVIGATION
    // ========================================
    const tabOrdersBtn = document.getElementById('tabOrdersBtn');
    const tabMenuBtn = document.getElementById('tabMenuBtn');
    const ordersSection = document.getElementById('ordersSection');
    const menuSection = document.getElementById('menuSection');

    if (tabOrdersBtn && tabMenuBtn) {
        tabOrdersBtn.addEventListener('click', () => {
            ordersSection.style.display = 'block';
            menuSection.style.display = 'none';
            tabOrdersBtn.className = 'defaultButton';
            tabMenuBtn.className = 'secondaryButton';
        });

        tabMenuBtn.addEventListener('click', () => {
            ordersSection.style.display = 'none';
            menuSection.style.display = 'block';
            tabOrdersBtn.className = 'secondaryButton';
            tabMenuBtn.className = 'defaultButton';
            renderVendorMenu();
        });
    }

    // ========================================
    // 7. ORDER MANAGEMENT
    // ========================================
    function renderVendorOrders() {
        const container = document.getElementById('vendorOrdersContainer');
        if (!container) return;

        const allOrders = getOrdersHistory();
        const vendorOrders = allOrders.filter(o => Number(o.vendorId) === ACTIVE_VENDOR_ID);

        if (vendorOrders.length === 0) {
            container.innerHTML = '<p style="color: var(--grey); padding: 15px 0;">No active orders found for this vendor.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--black);">
                        <th style="padding: 10px;">Order #</th>
                        <th style="padding: 10px;">Items</th>
                        <th style="padding: 10px;">Total</th>
                        <th style="padding: 10px;">Current Status</th>
                        <th style="padding: 10px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        vendorOrders.forEach(order => {
            const itemsSummary = order.items ? order.items.map(i => `${i.name || i.item} (x${i.quantity})`).join(', ') : 'No details';
            const status = order.currentStatus || 'Pending';

            html += `
                <tr style="border-bottom: 1px solid var(--lightGrey);">
                    <td style="padding: 12px 10px; font-weight: 700;">#${order.orderId}</td>
                    <td style="padding: 12px 10px; max-width: 250px;">${itemsSummary}</td>
                    <td style="padding: 12px 10px; font-weight: 600;">$${Number(order.total || 0).toFixed(2)}</td>
                    <td style="padding: 12px 10px;">
                        <span class="userBadge" style="background: #f0f0f0;">${status}</span>
                    </td>
                    <td style="padding: 12px 10px;">
                        ${renderStatusActionButtons(order.orderId, status)}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

        attachOrderStatusListeners();
    }

    function renderStatusActionButtons(orderId, currentStatus) {
        const isInactive = vendorProfile && vendorProfile.isActive === false;
        const disabledAttr = isInactive ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';

        switch (currentStatus) {
            case 'Pending':
                return `
                    <button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Accepted" style="padding: 4px 12px; background: #e6fffa;" ${disabledAttr}>Accept</button>
                    <button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Rejected" style="padding: 4px 12px; color: #cc0000; border-color: #cc0000;" ${disabledAttr}>Reject</button>
                `;
            case 'Accepted':
                return `<button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Preparing" style="padding: 4px 12px;" ${disabledAttr}>Start Preparing</button>`;
            case 'Preparing':
                return `<button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Ready" style="padding: 4px 12px; background: #eef2ff;" ${disabledAttr}>Mark Ready</button>`;
            case 'Ready':
                return `<button class="defaultButton actionBtn" data-id="${orderId}" data-status="Complete" style="padding: 4px 12px; width: auto;" ${disabledAttr}>Complete Order</button>`;
            case 'Complete':
                return `<span style="color: green; font-weight: 600;">✓ Completed</span>`;
            case 'Rejected':
                return `<span style="color: #cc0000; font-weight: 600;">❌ Rejected</span>`;
            default:
                return `<span>N/A</span>`;
        }
    }

    function attachOrderStatusListeners() {
        document.querySelectorAll('.actionBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                if (this.disabled) return;
                const orderId = this.getAttribute('data-id');
                const newStatus = this.getAttribute('data-status');
                if (updateOrderStatus(orderId, newStatus)) {
                    renderVendorOrders();
                }
            });
        });
    }

    // ========================================
    // 8. MENU MANAGEMENT — SHOWS ALL ITEMS (Active + Inactive)
    // ========================================
    function renderVendorMenu() {
        const container = document.getElementById('vendorMenuContainer');
        if (!container) return;

        const menuItems = getVendorMenuItems(ACTIVE_VENDOR_ID);

        if (menuItems.length === 0) {
            container.innerHTML = '<p style="color: var(--grey);">No items found in your vendor menu.</p>';
            return;
        }

        const isVendorInactive = vendorProfile && vendorProfile.isActive === false;

        let warningHTML = '';
        if (isVendorInactive) {
            warningHTML = `
                <div style="background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px 16px; border-radius: 8px; margin-bottom: 15px;">
                    ⚠️ <strong>Your account is currently inactive.</strong> Students cannot see your menu. 
                    You can prepare your items here, then contact Dining Services Administration to reactivate your account.
                </div>
            `;
        }

        let html = warningHTML + `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--black);">
                        <th style="padding: 10px;">Item Name</th>
                        <th style="padding: 10px;">Price</th>
                        <th style="padding: 10px;">Description</th>
                        <th style="padding: 10px;">Status</th>
                        <th style="padding: 10px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        menuItems.forEach(item => {
            const isItemActive = item.isActive !== false && item.isAvailable === true;
            const statusText = isItemActive ? '🟢 Available' : '🔴 Inactive';
            const toggleText = isItemActive ? 'Mark Inactive' : 'Mark Available';

            html += `
                <tr style="border-bottom: 1px solid var(--lightGrey);">
                    <td style="padding: 12px 10px; font-weight: 600;">${item.name}</td>
                    <td style="padding: 12px 10px;">$${Number(item.price).toFixed(2)}</td>
                    <td style="padding: 12px 10px; color: var(--grey); font-size: 0.9rem;">${item.description || 'N/A'}</td>
                    <td style="padding: 12px 10px;">${statusText}</td>
                    <td style="padding: 12px 10px;">
                        <button class="secondaryButton toggleAvailBtn" data-id="${item.id}" data-avail="${!isItemActive}" style="padding: 4px 10px; font-size: 0.8rem;">${toggleText}</button>
                        <button class="secondaryButton softDeleteBtn" data-id="${item.id}" style="padding: 4px 10px; font-size: 0.8rem; color: #cc0000; border-color: #cc0000;">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

        attachMenuActionListeners();
    }

    function attachMenuActionListeners() {
        document.querySelectorAll('.toggleAvailBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                const itemId = Number(this.getAttribute('data-id'));
                const newAvail = this.getAttribute('data-avail') === 'true';
                saveMenuItem({ 
                    id: itemId, 
                    isAvailable: newAvail,
                    isActive: newAvail
                });
                renderVendorMenu();
            });
        });

        document.querySelectorAll('.softDeleteBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                const itemId = Number(this.getAttribute('data-id'));
                if (confirm('Deactivating this item hides it from students while preserving historical order logs. Proceed?')) {
                    saveMenuItem({ id: itemId, isActive: false, isAvailable: false });
                    renderVendorMenu();
                }
            });
        });
    }

    // ========================================
    // 9. ADD NEW MENU ITEM
    // ========================================
    const addForm = document.getElementById('addMenuItemForm');
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('newItemName').value.trim();
            const price = parseFloat(document.getElementById('newItemPrice').value);
            const description = document.getElementById('newItemDesc').value.trim();

            if (!name || isNaN(price) || price <= 0) {
                alert('Please enter a valid item name and positive price.');
                return;
            }

            saveMenuItem({
                vendorId: ACTIVE_VENDOR_ID,
                name: name,
                price: price,
                description: description
            });

            alert(`✅ "${name}" added successfully to your menu!`);

            addForm.reset();
            renderVendorMenu();

            const noItemsBanner = document.querySelector('.no-items-banner');
            if (noItemsBanner) {
                noItemsBanner.remove();
            }
        });
    }

    // ========================================
    // 10. OPERATING HOURS MANAGEMENT
    // ========================================

    function updateStatusBanner() {
        const isOpen = isVendorOpen(ACTIVE_VENDOR_ID);
        const hours = getVendorHours(ACTIVE_VENDOR_ID);
        const statusText = isOpen ? 'Open' : 'Closed';

        const statusBanner = document.querySelector('.vendor-status-banner');
        if (statusBanner) {
            statusBanner.innerHTML = `
                <span>🟢 Your vendor is currently <strong>${statusText}</strong></span>
                    </a>
                </span>
            `;
            statusBanner.style.borderColor = isOpen ? '#2e7d32' : '#c62828';
            statusBanner.style.color = isOpen ? '#2e7d32' : '#c62828';
            statusBanner.style.backgroundColor = isOpen ? '#e8f5e9' : '#ffebee';
        }
    }

    function renderOperatingHours() {
        const hoursContainer = document.getElementById('operatingHoursContainer');
        if (!hoursContainer) return;

        const currentHours = getVendorHours(ACTIVE_VENDOR_ID);
        const isOpen = isVendorOpen(ACTIVE_VENDOR_ID);
        const statusText = isOpen ? '🟢 Open' : '🔴 Closed';
        const statusColor = isOpen ? '#2e7d32' : '#c62828';

        hoursContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap; padding: 15px 0;">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <label for="vendorHoursInput" style="font-weight: 600;">Operating Hours:</label>
                    <input type="text" id="vendorHoursInput" value="${currentHours}" 
                           placeholder="e.g., 07:00 - 20:00" 
                           style="padding: 8px 12px; border: 1px solid var(--lightGrey); border-radius: 4px; width: 180px;">
                    <button id="updateHoursBtn" class="secondaryButton" style="padding: 8px 20px;">Update Hours</button>
                </div>
                <div style="font-size: 1.1rem; font-weight: 600;">
                    Current Status: <span style="color: ${statusColor};">${statusText}</span>
                </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--grey); margin-top: 5px;">
                💡 Hours format: <strong>HH:MM - HH:MM</strong> (e.g., 07:00 - 20:00 for 7 AM to 8 PM)
            </div>
        `;

        const updateBtn = document.getElementById('updateHoursBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', function () {
                const input = document.getElementById('vendorHoursInput');
                const newHours = input.value.trim();

                if (!newHours || !newHours.includes('-')) {
                    alert('⚠️ Please enter hours in format: HH:MM - HH:MM (e.g., 07:00 - 20:00)');
                    return;
                }

                const parts = newHours.split('-').map(s => s.trim());
                if (parts.length !== 2) {
                    alert('⚠️ Please enter hours in format: HH:MM - HH:MM');
                    return;
                }

                const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(parts[0]) || !timeRegex.test(parts[1])) {
                    alert('⚠️ Please use valid time format (HH:MM). Example: 07:00 - 20:00');
                    return;
                }

                const success = updateVendorHours(ACTIVE_VENDOR_ID, newHours);
                if (success) {
                    alert('✅ Operating hours updated successfully!');
                    renderOperatingHours();
                    updateStatusBanner();
                } else {
                    alert('❌ Failed to update hours. Please try again.');
                }
            });
        }
    }

    // ========================================
    // 11. INITIAL LOAD
    // ========================================
    renderVendorOrders();
    renderStatusBanner();
    renderOperatingHours();

    console.log('✅ Vendor dashboard loaded');
    console.log(`🏬 Vendor: ${activeVendor.name} (ID: ${ACTIVE_VENDOR_ID})`);
    console.log(`📊 Status: ${vendorProfile?.isActive ? 'Active' : 'Inactive'}`);
});