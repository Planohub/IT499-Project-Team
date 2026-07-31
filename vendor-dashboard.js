// ========================================
// VENDOR-DASHBOARD.JS — Vendor Dashboard Logic
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    // ========================================
    // 1. GET ACTIVE VENDOR SESSION
    // ========================================
    const activeVendor = getActiveVendorSession();
    const ACTIVE_VENDOR_ID = Number(activeVendor.id || activeVendor.vendorId || 1);

    // ========================================
    // 2. CHECK IF VENDOR IS ACTIVE
    // ========================================
    const allVendors = getAllVendors();
    const vendorProfile = allVendors.find(v => Number(v.id || v.vendorId) === ACTIVE_VENDOR_ID);

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
        vendorBadge.textContent = `🏬 Vendor: ${activeVendor.name || vendorProfile.name}`;
        vendorBadge.style.color = '';
    }

    // ========================================
    // 4. RENDER STATUS BANNER (Open/Closed)
    // ========================================
    function renderStatusBanner() {
        const isOpen = isVendorOpen(ACTIVE_VENDOR_ID);
        const statusText = isOpen ? 'Open' : 'Closed';

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
                <span>🟢 Your vendor is currently <strong>${statusText}</strong></span>
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
        noItemsBanner.className = 'no-items-banner';
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
    // 7. ORDER MANAGEMENT (CARD-BASED MOBILE LAYOUT)
    // ========================================
    function renderVendorOrders() {
        const container = document.getElementById('vendorOrdersContainer');
        if (!container) return;

        const allOrders = getOrdersHistory();

        // Safe normalization for vendor ID across all order schemas
        const vendorOrders = allOrders.filter(o => {
            const orderVendorId = Number(o.vendorId || o.vendorID || o.id);
            return orderVendorId === ACTIVE_VENDOR_ID;
        });

        if (vendorOrders.length === 0) {
            container.innerHTML = '<p style="color: var(--grey); padding: 15px 0;">No active orders found for this vendor.</p>';
            return;
        }

        // Sort: Newest orders at top
        vendorOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        let html = '';
        vendorOrders.forEach(order => {
            const statusColor = getStatusColor(order.currentStatus || 'Pending');
            
            // Build items list
            const itemsList = order.items ? order.items.map(i => `<li style="margin-bottom:4px;">${i.quantity}x ${i.name || i.item} ($${((i.price || 0) * i.quantity).toFixed(2)})</li>`).join('') : '<li>No details</li>';

            // Prepare ETA & Rejection Notes Display
            let etaDisplay = order.estimatedPrepTime ? `<span style="font-size:0.85rem; color:var(--black); font-weight:600;">⏱️ ETA: ~${order.estimatedPrepTime} mins</span>` : '';
            let rejectionDisplay = order.rejectionReason ? `<p style="color:#c62828; font-weight:600; font-size:0.85rem; margin-top:6px;">❌ Reason: ${order.rejectionReason}</p>` : '';

            html += `
                <div class="vendorOrderCard" style="border: 2px solid var(--black); border-radius: 10px; padding: 18px; background: var(--cardWhite); margin-bottom: 20px;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--lightGrey); padding-bottom: 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
                        <h4 style="font-size: 1.1rem; color: var(--black); font-weight: 700; margin: 0;">Order #${order.orderId}</h4>
                        <span style="font-size: 0.8rem; color: var(--grey);">${order.orderDate || 'N/A'}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                        <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; white-space: nowrap;">
                            ${order.currentStatus || 'Pending'}
                        </span>
                        ${etaDisplay}
                    </div>

                    ${rejectionDisplay}

                    <div style="margin-bottom: 14px; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid var(--lightGrey);">
                        <ul style="padding-left: 20px; font-size: 0.9rem; color: var(--black); margin-bottom: 8px;">
                            ${itemsList}
                        </ul>
                        <p style="font-weight: 700; font-size: 1rem; color: var(--black); margin: 0; border-top: 1px solid #eee; padding-top: 6px;">
                            Total: $${Number(order.total || 0).toFixed(2)}
                        </p>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${getActionButtons(order)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        attachOrderActionListeners();
    }

    function getActionButtons(order) {
        const isInactive = vendorProfile && vendorProfile.isActive === false;
        const disabledAttr = isInactive ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
        const currentStatus = order.currentStatus || 'Pending';

        if (currentStatus === 'Pending') {
            return `
                <button class="secondaryButton acceptOrderBtn" data-id="${order.orderId}" style="background:var(--black); color:#fff; border-color:var(--black); flex:1; min-width:130px; padding:8px 12px;" ${disabledAttr}>
                    ✅ Accept Order
                </button>
                <button class="secondaryButton rejectOrderBtn" data-id="${order.orderId}" style="color:#c62828; border-color:#c62828; flex:1; min-width:130px; padding:8px 12px;" ${disabledAttr}>
                    ❌ Reject Order
                </button>
            `;
        } else if (currentStatus === 'Preparing') {
            return `
                <button class="secondaryButton markReadyBtn" data-id="${order.orderId}" style="width:100%; padding:8px 12px;" ${disabledAttr}>
                    🔔 Mark Ready for Pickup
                </button>
            `;
        } else if (currentStatus === 'Ready') {
            return `
                <button class="secondaryButton markCompleteBtn" data-id="${order.orderId}" style="background:var(--black); color:#fff; width:100%; padding:8px 12px;" ${disabledAttr}>
                    🎉 Complete Pickup
                </button>
            `;
        } else if (currentStatus === 'Complete') {
            return `<span style="color: green; font-weight: 600;">✓ Completed</span>`;
        } else if (currentStatus === 'Rejected') {
            return `<span style="color: #cc0000; font-weight: 600;">❌ Rejected</span>`;
        } else {
            return `<span style="font-size:0.85rem; color:var(--grey); font-style:italic;">Archived</span>`;
        }
    }

    function attachOrderActionListeners() {
        // Accept & Prompt Prep Time
        document.querySelectorAll('.acceptOrderBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                const id = this.getAttribute('data-id');
                const prepTime = prompt('⏰ Enter estimated prep time in minutes (e.g., 10, 15, 20):', '15');
                
                if (prepTime !== null && prepTime.trim() !== '') {
                    updateOrderStatusWithDetails(id, 'Preparing', { estimatedPrepTime: prepTime.trim() });
                    renderVendorOrders();
                } else if (prepTime !== null) {
                    updateOrderStatus(id, 'Preparing');
                    renderVendorOrders();
                }
            });
        });

        // Reject & Select Reason
        document.querySelectorAll('.rejectOrderBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                const id = this.getAttribute('data-id');
                const reasons = ["Item Out of Stock", "Kitchen Closing Soon", "High Order Volume Delay", "Other / Unspecified"];
                
                const choice = prompt(`❌ Select Rejection Reason:\n\n1. Item Out of Stock\n2. Kitchen Closing Soon\n3. High Order Volume Delay\n4. Other\n\nEnter number (1-4):`, '1');
                
                if (choice) {
                    const reasonText = reasons[parseInt(choice) - 1] || "Unspecified Delay";
                    updateOrderStatusWithDetails(id, 'Rejected', { rejectionReason: reasonText });
                    renderVendorOrders();
                    alert(`Order #${id} rejected. Reason logged: "${reasonText}".`);
                }
            });
        });

        // Mark Ready
        document.querySelectorAll('.markReadyBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                const id = this.getAttribute('data-id');
                updateOrderStatus(id, 'Ready');
                renderVendorOrders();
            });
        });

        // Mark Complete
        document.querySelectorAll('.markCompleteBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                const id = this.getAttribute('data-id');
                updateOrderStatus(id, 'Complete');
                renderVendorOrders();
            });
        });
    }

    function updateOrderStatusWithDetails(orderId, status, details) {
        const orders = getOrdersHistory();
        const index = orders.findIndex(o => String(o.orderId) === String(orderId));
        if (index > -1) {
            orders[index].currentStatus = status;
            if (details.estimatedPrepTime) orders[index].estimatedPrepTime = details.estimatedPrepTime;
            if (details.rejectionReason) orders[index].rejectionReason = details.rejectionReason;
            localStorage.setItem('orders', JSON.stringify(orders));
        }
    }

    function getStatusColor(status) {
        const colors = {
            'Pending': '#c5922e',   /* Cozy Gold */
            'Preparing': '#1b3a28', /* Forest Green */
            'Ready': '#2c4c38',     /* Sage Green */
            'Complete': '#3d5c47',  /* Leaf Green */
            'Rejected': '#c62828'   /* Alert Red */
        };
        return colors[status] || '#3d5c47';
    }

    // ========================================
    // 8. MENU MANAGEMENT
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
        const statusText = isOpen ? 'Open' : 'Closed';

        const statusBanner = document.querySelector('.vendor-status-banner');
        if (statusBanner) {
            statusBanner.innerHTML = `
                <span>🟢 Your vendor is currently <strong>${statusText}</strong></span>
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