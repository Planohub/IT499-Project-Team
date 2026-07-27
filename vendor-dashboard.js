// BEFORE (Hardcoded):
// const ACTIVE_VENDOR_ID = 1;

// AFTER (Dynamic Session Retrieval):
document.addEventListener('DOMContentLoaded', function () {
    const activeVendor = getActiveVendorSession();
    const ACTIVE_VENDOR_ID = activeVendor.id;

    // Update Header Badge in UI
    const vendorBadge = document.getElementById('vendorHeaderBadge');
    if (vendorBadge) {
        vendorBadge.textContent = `🏬 Vendor: ${activeVendor.name}`;
    }


    // Tab Navigation Elements
    const tabOrdersBtn = document.getElementById('tabOrdersBtn');
    const tabMenuBtn = document.getElementById('tabMenuBtn');
    const ordersSection = document.getElementById('ordersSection');
    const menuSection = document.getElementById('menuSection');

    // Tab Switcher Handler
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

    // =========================================================================
    // 1. WORKFLOW: VENDOR PROCESSES AN ORDER (Order Lifecycle Management)
    // =========================================================================
    function renderVendorOrders() {
        const container = document.getElementById('vendorOrdersContainer');
        if (!container) return;

        const allOrders = getOrdersHistory();
        // Filter orders belonging to this vendor
        const vendorOrders = allOrders.filter(o => Number(o.vendorId) === ACTIVE_VENDOR_ID || !o.vendorId);

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
                        <th style="padding: 10px;">Order-Status Actions</th>
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

    /**
     * Renders standard order-status action buttons according to lifecycle state machine.
     */
    function renderStatusActionButtons(orderId, currentStatus) {
        switch (currentStatus) {
            case 'Pending':
                return `
                    <button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Accepted" style="padding: 4px 12px; background: #e6fffa;">Accept</button>
                    <button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Rejected" style="padding: 4px 12px; color: #cc0000; border-color: #cc0000;">Reject</button>
                `;
            case 'Accepted':
                return `<button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Preparing" style="padding: 4px 12px;">Start Preparing</button>`;
            case 'Preparing':
                return `<button class="secondaryButton actionBtn" data-id="${orderId}" data-status="Ready" style="padding: 4px 12px; background: #eef2ff;">Mark Ready</button>`;
            case 'Ready':
                return `<button class="defaultButton actionBtn" data-id="${orderId}" data-status="Complete" style="padding: 4px 12px; width: auto;">Complete Order</button>`;
            case 'Complete':
                return `<span style="color: green; font-weight: 600;">✓ Completed</span>`;
            case 'Rejected':
                return `<span style="color: #cc0000; font-weight: 600;">❌ Rejected</span>`;
            default:
                return `<span>N/A</span>`;
        }
    }

    function attachOrderStatusListeners() {
        const actionButtons = document.querySelectorAll('.actionBtn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const orderId = this.getAttribute('data-id');
                const newStatus = this.getAttribute('data-status');

                if (updateOrderStatus(orderId, newStatus)) {
                    renderVendorOrders(); // Re-render table with updated status
                }
            });
        });
    }

    // =========================================================================
    // 2. VENDOR MENU MANAGEMENT (CRUD Operations)
    // =========================================================================
    function renderVendorMenu() {
        const container = document.getElementById('vendorMenuContainer');
        if (!container) return;

        const menuItems = getVendorMenuItems(ACTIVE_VENDOR_ID);

        if (menuItems.length === 0) {
            container.innerHTML = '<p style="color: var(--grey);">No items found in your vendor menu.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--black);">
                        <th style="padding: 10px;">Item Name</th>
                        <th style="padding: 10px;">Price</th>
                        <th style="padding: 10px;">Description</th>
                        <th style="padding: 10px;">Availability</th>
                        <th style="padding: 10px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        menuItems.forEach(item => {
            const availText = item.isAvailable ? '🟢 Available' : '🔴 Out of Stock';
            const toggleText = item.isAvailable ? 'Mark Out of Stock' : 'Mark Available';

            html += `
                <tr style="border-bottom: 1px solid var(--lightGrey);">
                    <td style="padding: 12px 10px; font-weight: 600;">${item.name}</td>
                    <td style="padding: 12px 10px;">$${Number(item.price).toFixed(2)}</td>
                    <td style="padding: 12px 10px; color: var(--grey); font-size: 0.9rem;">${item.description || 'N/A'}</td>
                    <td style="padding: 12px 10px;">${availText}</td>
                    <td style="padding: 12px 10px;">
                        <button class="secondaryButton toggleAvailBtn" data-id="${item.id}" data-avail="${!item.isAvailable}" style="padding: 4px 10px; font-size: 0.8rem;">${toggleText}</button>
                        <button class="secondaryButton softDeleteBtn" data-id="${item.id}" style="padding: 4px 10px; font-size: 0.8rem; color: #cc0000; border-color: #cc0000;">Deactivate</button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

        attachMenuActionListeners();
    }

    function attachMenuActionListeners() {
        // Toggle Availability
        document.querySelectorAll('.toggleAvailBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                const itemId = Number(this.getAttribute('data-id'));
                const newAvail = this.getAttribute('data-avail') === 'true';

                saveMenuItem({ id: itemId, isAvailable: newAvail });
                renderVendorMenu();
            });
        });

        // Soft Delete / Deactivate Item
        document.querySelectorAll('.softDeleteBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                const itemId = Number(this.getAttribute('data-id'));
                if (confirm('Deactivating this item hides it from students while preserving historical order logs. Proceed?')) {
                    saveMenuItem({ id: itemId, isActive: false });
                    renderVendorMenu();
                }
            });
        });
    }

    // Add New Menu Item Form Submit Handler
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

            addForm.reset();
            alert(`"${name}" added successfully to your menu!`);
            renderVendorMenu();
        });
    }

    // Initial Load
    renderVendorOrders();
});