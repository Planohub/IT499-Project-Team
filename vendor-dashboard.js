// ========================================
// VENDOR-DASHBOARD.JS — Vendor Dashboard Logic
// ========================================

document.addEventListener('DOMContentLoaded', async function () {

    // ========================================
    // 1. GET ACTIVE VENDOR SESSION
    // ========================================
    const activeVendor = getActiveVendorSession();

    if (!activeVendor) {
        alert('Please log in as a vendor first.');
        window.location.href = 'index.html';
        return;
    }

    const ACTIVE_VENDOR_ID = Number(
        activeVendor.id || activeVendor.vendorId
    );

    if (!Number.isInteger(ACTIVE_VENDOR_ID)) {
        alert('The active vendor session is invalid.');
        window.location.href = 'index.html';
        return;
    }

    /*
     * The vendor profile is loaded from SQLite below.
     * It remains available to the prototype-backed menu and
     * operating-hours sections later in this file.
     */
    let vendorProfile = null;
    let vendorOrders = [];

    // ========================================
    // 2. LOAD VENDOR PROFILE AND ORDERS
    // ========================================
    try {
        const response = await fetch(
            `/api/vendors/${ACTIVE_VENDOR_ID}/orders`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || 'Unable to load the vendor dashboard.'
            );
        }

        vendorProfile = result.vendor;
        vendorOrders = Array.isArray(result.orders)
            ? result.orders
            : [];

    } catch (error) {
        console.error('Unable to load vendor data:', error);

        const container =
            document.querySelector('.vendorSelectionContainer');

        if (container) {
            container.innerHTML = `
                <div class="vendorGridMessage vendorGridError">
                    <p>Unable to load the vendor dashboard.</p>
                    <p>Please refresh the page or try again later.</p>
                </div>
            `;
        }

        return;
    }

    // ========================================
    // 3. CHECK IF VENDOR IS ACTIVE
    // ========================================
    if (!vendorProfile || vendorProfile.isActive === false) {
        showInactiveVendorMessage();
        return;
    }

    function showInactiveVendorMessage() {
        const container =
            document.querySelector('.vendorSelectionContainer');

        if (container) {
            container.innerHTML = `
                <div style="
                    text-align:center;
                    padding:60px 20px;
                    max-width:500px;
                    margin:0 auto;
                ">
                    <div style="font-size:4rem; margin-bottom:20px;">
                        🔒
                    </div>

                    <h2 style="
                        color:#cc0000;
                        margin-bottom:10px;
                    ">
                        Account Deactivated
                    </h2>

                    <p style="
                        color:var(--grey);
                        font-size:1.1rem;
                        margin-bottom:20px;
                    ">
                        Your vendor account has been deactivated by
                        Dining Services Administration.
                    </p>

                    <p style="
                        color:var(--grey);
                        margin-bottom:30px;
                    ">
                        Please contact Dining Services Administration
                        for more information about your account status.
                    </p>

                    <a
                        href="index.html"
                        class="defaultButton"
                        style="width:auto; padding:12px 30px;"
                    >
                        Return to Login
                    </a>
                </div>
            `;
        }

        const vendorBadge =
            document.getElementById('vendorHeaderBadge');

        if (vendorBadge) {
            vendorBadge.textContent = '🔒 Account Deactivated';
            vendorBadge.style.color = '#cc0000';
        }
    }

    // ========================================
    // 4. UPDATE HEADER BADGE
    // ========================================
    const vendorBadge =
        document.getElementById('vendorHeaderBadge');

    if (vendorBadge) {
        vendorBadge.textContent =
            `🏬 Vendor: ${vendorProfile.name}`;

        vendorBadge.style.color = '';
    }

    // ========================================
    // 5. RENDER DATABASE-BACKED STATUS BANNER
    // ========================================
    function renderStatusBanner() {
        const operatingHours = vendorProfile.operatingHours || 'Hours unavailable';
        const openStatus = getVendorOpenStatus(operatingHours);
        const statusText = openStatus.isOpen ? 'Open' : 'Closed';
        const statusIcon = openStatus.isOpen ? '🟢' : '🔴';
        const statusColor = openStatus.isOpen ? '#2e7d32' : '#c62828';
        const statusBackground = openStatus.isOpen ? '#e8f5e9' : '#ffebee';
        const header = document.querySelector('.pageHeader');

        if (!header) {
            return;
        }

        const existingBanner = header.querySelector('.vendor-status-banner');

        if (existingBanner) {
            existingBanner.remove();
        }

        const banner = document.createElement('div');

        banner.className = 'vendor-status-banner';

        banner.style.cssText = `
            background-color:${statusBackground};
            border:2px solid ${statusColor};
            color:${statusColor};
            padding:10px 16px;
            border-radius:8px;
            margin-top:10px;
            font-weight:600;
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:wrap;
            gap:10px;
        `;

        banner.innerHTML = `
            <span>
                ${statusIcon} Your vendor is currently
                <strong>${statusText}</strong>
            </span>

            <span style="
                font-size:0.9rem;
                font-weight:400;
            ">
                Hours: ${escapeHtml(operatingHours)}
            </span>
        `;

        header.appendChild(banner);
    }

    // ========================================
    // 6. CHECK FOR ACTIVE MENU ITEMS IN SQLITE
    // ========================================
    async function checkForActiveMenuItems() {
        try {
            const response = await fetch(
                `/api/vendors/${ACTIVE_VENDOR_ID}/menu`
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || 'Unable to load vendor menu items.'
                );
            }

            const menuItems = Array.isArray(result.menuItems)
                ? result.menuItems
                : [];

            const hasActiveItems = menuItems.some(item =>
                item.isActive === true &&
                item.isAvailable === true
            );

            const existingBanner =
                document.querySelector('.no-items-banner');

            if (existingBanner) {
                existingBanner.remove();
            }

            if (!hasActiveItems) {
                const noItemsBanner =
                    document.createElement('div');

                noItemsBanner.className = 'no-items-banner';

                noItemsBanner.style.cssText = `
                    background-color: #fff3cd;
                    border: 1px solid #ffc107;
                    color: #856404;
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                `;

                noItemsBanner.innerHTML = `
                    ⚠️ <strong>Your vendor account has no active menu items.</strong>
                    Students cannot see your menu. Use the Menu Management tab
                    to reactivate or add items.
                `;

                const pageHeader =
                    document.querySelector('.pageHeader');

                if (pageHeader) {
                    pageHeader.after(noItemsBanner);
                }
            }

        } catch (error) {
            console.error(
                'Unable to check active vendor menu items:',
                error
            );
        }
    }

    // ========================================
    // 7. TAB NAVIGATION
    // ========================================
    const tabOrdersBtn = document.getElementById('tabOrdersBtn');
    const tabMenuBtn = document.getElementById('tabMenuBtn');
    const ordersSection = document.getElementById('ordersSection');
    const menuSection = document.getElementById('menuSection');

    if (
        tabOrdersBtn &&
        tabMenuBtn &&
        ordersSection &&
        menuSection
    ) {
        tabOrdersBtn.addEventListener('click', function () {
            ordersSection.style.display = 'block';
            menuSection.style.display = 'none';

            tabOrdersBtn.className = 'defaultButton';
            tabMenuBtn.className = 'secondaryButton';
        });

        tabMenuBtn.addEventListener('click', async function () {
            ordersSection.style.display = 'none';
            menuSection.style.display = 'block';

            tabMenuBtn.className = 'defaultButton';
            tabOrdersBtn.className = 'secondaryButton';

            await renderVendorMenu();
        });
    }

    // ========================================
    // 8. DATABASE-BACKED ORDER MANAGEMENT
    // ========================================
    async function renderVendorOrders() {
        const container = document.getElementById('vendorOrdersContainer');

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="vendorGridMessage">
                <p>Loading vendor orders...</p>
            </div>
        `;

        try {
            const response = await fetch(
                `/api/vendors/${ACTIVE_VENDOR_ID}/orders`
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || 'Unable to load vendor orders.'
                );
            }

            vendorProfile = result.vendor;
            vendorOrders = Array.isArray(result.orders)
                ? result.orders
                : [];

            if (vendorOrders.length === 0) {
                container.innerHTML = `
                    <p style="
                        color:var(--grey);
                        padding:15px 0;
                    ">
                        No orders found for this vendor.
                    </p>
                `;
                return;
            }

            container.innerHTML = vendorOrders
                .map(buildOrderCard)
                .join('');

            attachOrderActionListeners();

            console.log(
                `✅ Loaded ${vendorOrders.length} SQLite orders ` +
                `for vendor ${ACTIVE_VENDOR_ID}`
            );

        } catch (error) {
            console.error('Unable to load vendor orders:', error);

            container.innerHTML = `
                <div class="vendorGridMessage vendorGridError">
                    <p>Unable to load vendor orders.</p>
                    <p>Please refresh the page or try again later.</p>
                </div>
            `;
        }
    }

    function buildOrderCard(order) {
        const status = order.currentStatus || 'Pending';

        const statusColor = getStatusColor(status);

        const itemsList = Array.isArray(order.items)
            ? order.items.map(item => `
                <li style="margin-bottom:4px;">
                    ${item.quantity}×
                    ${escapeHtml(item.name)}
                    ($${Number(item.total).toFixed(2)})
                </li>
            `).join('')
            : '<li>No item details available.</li>';

        const statusNote = order.latestStatusNote
            ? `
                <p style="
                    color:${status === 'Rejected'
                ? '#c62828'
                : 'var(--grey)'};
                    font-weight:600;
                    font-size:0.85rem;
                    margin-top:6px;
                ">
                    ${escapeHtml(order.latestStatusNote)}
                </p>
            `
            : '';

        return `
            <article class="vendorOrderCard">
                <div class="vendorOrderHeader">
                    <div>
                        <h4 style="
                            font-size:1.1rem;
                            color:var(--black);
                            font-weight:700;
                            margin:0;
                        ">
                            Order #${order.orderId}
                        </h4>

                        <p style="
                            font-size:0.85rem;
                            color:var(--grey);
                            margin-top:3px;
                        ">
                            Student:
                            ${escapeHtml(
            order.studentName || 'Unknown Student'
        )}
                        </p>
                    </div>

                    <span style="
                        font-size:0.8rem;
                        color:var(--grey);
                    ">
                        ${formatOrderDate(order.orderDate)}
                    </span>
                </div>

                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-bottom:12px;
                ">
                    <span
                        class="orderStatusBadge"
                        style="background-color:${statusColor};"
                    >
                        ${escapeHtml(status)}
                    </span>
                </div>

                ${statusNote}

                <div style="
                    margin-bottom:14px;
                    background:#ffffff;
                    padding:12px;
                    border-radius:6px;
                    border:1px solid var(--lightGrey);
                ">
                    <ul style="
                        padding-left:20px;
                        font-size:0.9rem;
                        color:var(--black);
                        margin-bottom:8px;
                    ">
                        ${itemsList}
                    </ul>

                    <p style="
                        font-weight:700;
                        font-size:1rem;
                        color:var(--black);
                        margin:0;
                        border-top:1px solid #eee;
                        padding-top:6px;
                    ">
                        Total:
                        $${Number(order.total || 0).toFixed(2)}
                    </p>
                </div>

                <div class="vendorActionGroup">
                    ${getActionButtons(order)}
                </div>
            </article>
        `;
    }

    function getActionButtons(order) {
        const currentStatus = order.currentStatus || 'Pending';

        if (currentStatus === 'Pending') {
            return `
                <button
                    class="secondaryButton orderStatusAction"
                    data-id="${order.orderId}"
                    data-status="Accepted"
                >
                    ✅ Accept Order
                </button>

                <button
                    class="secondaryButton rejectOrderBtn"
                    data-id="${order.orderId}"
                    style="
                        color:#c62828;
                        border-color:#c62828;
                    "
                >
                    ❌ Reject Order
                </button>
            `;
        }

        if (currentStatus === 'Accepted') {
            return `
                <button
                    class="secondaryButton startPreparingBtn"
                    data-id="${order.orderId}"
                >
                    🍳 Start Preparing
                </button>

                <button
                    class="secondaryButton rejectOrderBtn"
                    data-id="${order.orderId}"
                    style="
                        color:#c62828;
                        border-color:#c62828;
                    "
                >
                    ❌ Reject Order
                </button>
            `;
        }

        if (currentStatus === 'Preparing') {
            return `
                <button
                    class="secondaryButton orderStatusAction"
                    data-id="${order.orderId}"
                    data-status="Ready"
                >
                    🔔 Mark Ready for Pickup
                </button>
            `;
        }

        if (currentStatus === 'Ready') {
            return `
                <button
                    class="defaultButton orderStatusAction"
                    data-id="${order.orderId}"
                    data-status="Complete"
                    style="width:auto;"
                >
                    🎉 Complete Pickup
                </button>
            `;
        }

        if (currentStatus === 'Complete') {
            return `
                <span style="
                    color:#2e7d32;
                    font-weight:600;
                ">
                    ✓ Completed
                </span>
            `;
        }

        if (currentStatus === 'Rejected') {
            return `
                <span style="
                    color:#c62828;
                    font-weight:600;
                ">
                    ❌ Rejected and Refunded
                </span>
            `;
        }

        return `
            <span style="
                font-size:0.85rem;
                color:var(--grey);
                font-style:italic;
            ">
                No actions available
            </span>
        `;
    }

    function attachOrderActionListeners() {

        // Standard sequential status transitions
        document.querySelectorAll('.orderStatusAction').forEach(button => {
            button.addEventListener('click', async function () {
                const orderId =
                    Number(this.dataset.id);

                const newStatus =
                    this.dataset.status;

                await submitOrderStatus(
                    orderId,
                    newStatus,
                    `Order moved to ${newStatus}`
                );
            });
        });

        // Accepted orders move to Preparing with an optional ETA note
        document.querySelectorAll('.startPreparingBtn').forEach(button => {
            button.addEventListener('click', async function () {
                const orderId =
                    Number(this.dataset.id);

                const prepTime = prompt(
                    'Enter the estimated preparation time in minutes:',
                    '15'
                );

                if (prepTime === null) {
                    return;
                }

                const trimmedTime = prepTime.trim();

                const notes = trimmedTime
                    ? `Estimated preparation time: ${trimmedTime} minutes`
                    : 'Order preparation started';

                await submitOrderStatus(
                    orderId,
                    'Preparing',
                    notes
                );
            });
        });

        // Rejected orders require a reason and are refunded by Flask
        document.querySelectorAll('.rejectOrderBtn').forEach(button => {
            button.addEventListener('click', async function () {
                const orderId = Number(this.dataset.id);
                const rejectionReason = getRejectionReason();

                if (!rejectionReason) {
                    return;
                }

                await submitOrderStatus(
                    orderId,
                    'Rejected',
                    rejectionReason
                );
            });
        });
    }

    function getRejectionReason() {
        const reasons = [
            'Item out of stock',
            'Kitchen closing soon',
            'High order volume',
            'Other or unspecified reason'
        ];

        const choice = prompt(
            'Select a rejection reason:\n\n' +
            '1. Item out of stock\n' +
            '2. Kitchen closing soon\n' +
            '3. High order volume\n' +
            '4. Other\n\n' +
            'Enter a number from 1 to 4:',
            '1'
        );

        if (choice === null) {
            return null;
        }

        const selectedIndex = Number.parseInt(choice, 10) - 1;

        return reasons[selectedIndex] ||
            'Other or unspecified reason';
    }

    async function submitOrderStatus(
        orderId,
        newStatus,
        notes
    ) {
        const actionButtons = document.querySelectorAll(
            `[data-id="${orderId}"]`
        );

        actionButtons.forEach(button => {
            button.disabled = true;
        });

        try {
            const response = await fetch(
                `/api/orders/${orderId}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        vendorId: ACTIVE_VENDOR_ID,
                        status: newStatus,
                        notes: notes
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    'Unable to update the order status.'
                );
            }

            if (result.refund) {
                alert(
                    `Order #${orderId} was rejected.\n\n` +
                    `$${Number(result.refund.amount).toFixed(2)} ` +
                    `was refunded to the student's meal-plan balance.`
                );
            }

            await renderVendorOrders();

        } catch (error) {
            console.error(
                'Unable to update order status:',
                error
            );

            alert(error.message);

            actionButtons.forEach(button => {
                button.disabled = false;
            });
        }
    }

    function formatOrderDate(orderDate) {
        if (!orderDate) {
            return 'Date unavailable';
        }

        const parsedDate = new Date(
            String(orderDate).replace(' ', 'T') + 'Z'
        );

        if (Number.isNaN(parsedDate.getTime())) {
            return escapeHtml(orderDate);
        }

        return parsedDate.toLocaleString();
    }

    function getStatusColor(status) {
        const colors = {
            Pending: '#c5922e',
            Accepted: '#1f478d',
            Preparing: '#1b3a28',
            Ready: '#2c4c38',
            Complete: '#3d5c47',
            Rejected: '#c62828'
        };

        return colors[status] || '#3d5c47';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // Determine whether the vendor is currently open from its SQLite hours.
    function getVendorOpenStatus(operatingHours) {
        if (typeof operatingHours !== 'string' || !operatingHours.includes('-')) {
            return { isOpen: false };
        }

        try {
            const [openingTime, closingTime] = operatingHours
                .split('-')
                .map(time => time.trim());

            const [openingHour, openingMinute] =
                openingTime.split(':').map(Number);

            const [closingHour, closingMinute] =
                closingTime.split(':').map(Number);

            const values = [
                openingHour,
                openingMinute,
                closingHour,
                closingMinute
            ];

            if (values.some(value => Number.isNaN(value))) {
                return { isOpen: false };
            }

            const now = new Date();

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const openingMinutes = openingHour * 60 + openingMinute;
            const closingMinutes = closingHour * 60 + closingMinute;

            // Support operating periods that continue past midnight.
            if (closingMinutes < openingMinutes) {
                return {
                    isOpen:
                        currentMinutes >= openingMinutes ||
                        currentMinutes < closingMinutes
                };
            }

            return {
                isOpen:
                    currentMinutes >= openingMinutes &&
                    currentMinutes < closingMinutes
            };

        } catch (error) {
            console.error(
                'Unable to interpret vendor operating hours:',
                error
            );

            return { isOpen: false };
        }
    }

    // ========================================
    // 9. DATABASE-BACKED MENU MANAGEMENT
    // ========================================
    async function renderVendorMenu() {
        const container = document.getElementById('vendorMenuContainer');

        if (!container) {
            return;
        }

        // Show a temporary loading message while Flask queries SQLite.
        container.innerHTML = `
            <div class="vendorGridMessage">
                <p>Loading vendor menu...</p>
            </div>
        `;

        try {
            const response = await fetch(
                `/api/vendors/${ACTIVE_VENDOR_ID}/menu?includeInactive=true`
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || 'Unable to load the vendor menu.'
                );
            }

            const menuItems = Array.isArray(result.menuItems)
                ? result.menuItems
                : [];

            if (menuItems.length === 0) {
                container.innerHTML = `
                <p style="color:var(--grey);">
                    No items were found in your vendor menu.
                </p>
            `;
                return;
            }

            let html = `
            <table style="
                width:100%;
                border-collapse:collapse;
                text-align:left;
            ">
                <thead>
                    <tr style="
                        border-bottom:2px solid var(--black);
                    ">
                        <th style="padding:10px;">Item Name</th>
                        <th style="padding:10px;">Price</th>
                        <th style="padding:10px;">Description</th>
                        <th style="padding:10px;">Status</th>
                        <th style="padding:10px;">Actions</th>
                    </tr>
                </thead>

                <tbody>
        `;

            menuItems.forEach(item => {
                const statusText = item.isActive
                    ? item.isAvailable
                        ? '🟢 Available'
                        : '🔴 Unavailable'
                    : '⚫ Deactivated';

                let actionButtons = '';

                if (item.isActive) {
                    actionButtons = `
                        <button
                            class="secondaryButton toggleAvailBtn"
                            data-id="${item.id}"
                            data-avail="${!item.isAvailable}"
                            style="
                                padding:4px 10px;
                                font-size:0.8rem;
                            "
                        >
                            ${item.isAvailable
                            ? 'Mark Unavailable'
                            : 'Mark Available'}
                        </button>

                        <button
                            class="secondaryButton softDeleteBtn"
                            data-id="${item.id}"
                            style="
                                padding:4px 10px;
                                font-size:0.8rem;
                                color:#cc0000;
                                border-color:#cc0000;
                            "
                        >
                            Deactivate
                        </button>
                    `;
                } else {
                    actionButtons = `
                        <button
                            class="secondaryButton reactivateItemBtn"
                            data-id="${item.id}"
                            style="
                                padding:4px 10px;
                                font-size:0.8rem;
                            "
                        >
                            Reactivate
                        </button>
                    `;
                }

                // 🔥 Build the thumbnail if a picture exists
                const imageThumbnail = item.imageUrl
                    ? `<img src="${escapeHtml(item.imageUrl)}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1px solid #ccc; flex-shrink: 0;">`
                    : `<div style="width: 40px; height: 40px; border-radius: 6px; background: #eee; display: flex; align-items:center; justify-content:center; font-size:10px; color:#999; border: 1px solid #ccc; flex-shrink: 0;">No Pic</div>`;

                html += `
                <tr style="
                    border-bottom:1px solid var(--lightGrey);
                ">
                    <td style="
                        padding:12px 10px;
                        vertical-align:top;
                    ">
                        <div style="
                            display:flex;
                            align-items:flex-start;
                            gap:12px;
                        ">
                            <div style="
                                display:flex;
                                flex-direction:column;
                                align-items:flex-start;
                                gap:8px;
                                min-width:170px;
                            ">
                                ${imageThumbnail}

                                <input
                                    type="file"
                                    id="menuItemImage-${item.id}"
                                    class="menuItemImageInput"
                                    data-id="${item.id}"
                                    accept="image/png, image/jpeg"
                                    hidden
                                >

                                <label
                                    for="menuItemImage-${item.id}"
                                    class="secondaryButton"
                                    style="
                                        padding:4px 10px;
                                        font-size:0.8rem;
                                        width:auto;
                                        cursor:pointer;
                                        display:inline-block;
                                    "
                                >
                                    ${item.imageUrl ? 'Replace Image' : 'Choose Image'}
                                </label>

                                <span
                                    class="menuItemImageStatus"
                                    data-id="${item.id}"
                                    style="
                                        display:none;
                                        color:var(--grey);
                                        font-size:0.75rem;
                                    "
                                >
                                    Uploading...
                                </span>
                            </div>

                            <span style="
                                font-weight:600;
                                padding-top:4px;
                            ">
                                ${escapeHtml(item.name)}
                            </span>
                        </div>
                    </td>

                    <td style="padding:12px 10px;">
                        $${Number(item.price).toFixed(2)}
                    </td>

                    <td style="
                        padding:12px 10px;
                        color:var(--grey);
                        font-size:0.9rem;
                    ">
                        ${escapeHtml(
                    item.description || 'N/A'
                )}
                    </td>

                    <td style="padding:12px 10px;">
                        ${statusText}
                    </td>

                    <td style="padding:12px 10px;">
                        ${actionButtons}
                    </td>
                </tr>
            `;
            });

            html += `
                </tbody>
            </table>
        `;

            container.innerHTML = html;

            attachMenuActionListeners();

            console.log(
                `✅ Loaded ${menuItems.length} SQLite menu items ` +
                `for vendor ${ACTIVE_VENDOR_ID}`
            );

        } catch (error) {
            console.error('Unable to load vendor menu:', error);

            container.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load the vendor menu.</p>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;
        }
    }

    function attachMenuActionListeners() {

        // ========================================
        // ADD OR REPLACE MENU-ITEM IMAGE
        // ========================================
        document.querySelectorAll('.menuItemImageInput').forEach(input => {
            input.addEventListener('change', async function () {
                const itemId = Number(this.dataset.id);
                const imageFile = this.files?.[0];

                if (!imageFile) {
                    return;
                }

                const statusMessage = document.querySelector(
                    `.menuItemImageStatus[data-id="${itemId}"]`
                );

                const formData = new FormData();

                formData.append(
                    'vendorId',
                    String(ACTIVE_VENDOR_ID)
                );

                formData.append('image', imageFile);

                this.disabled = true;

                if (statusMessage) {
                    statusMessage.style.display = 'inline';
                    statusMessage.textContent = 'Uploading...';
                }

                try {
                    const response = await fetch(
                        `/api/menu-items/${itemId}/image`,
                        {
                            method: 'PATCH',
                            body: formData
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            'Unable to update the menu-item image.'
                        );
                    }

                    await renderVendorMenu();

                } catch (error) {
                    console.error(
                        'Unable to update menu-item image:',
                        error
                    );

                    alert(error.message);

                    this.disabled = false;
                    this.value = '';

                    if (statusMessage) {
                        statusMessage.style.display = 'none';
                    }
                }
            });
        });

        // ========================================
        // TOGGLE MENU-ITEM AVAILABILITY
        // ========================================
        document.querySelectorAll('.toggleAvailBtn').forEach(button => {
            button.addEventListener('click', async function () {
                const itemId = Number(this.dataset.id);
                const newAvailability =
                    this.dataset.avail === 'true';

                this.disabled = true;

                try {
                    const response = await fetch(
                        `/api/menu-items/${itemId}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                vendorId: ACTIVE_VENDOR_ID,
                                isAvailable: newAvailability
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            'Unable to update menu-item availability.'
                        );
                    }

                    await renderVendorMenu();
                    await checkForActiveMenuItems();

                } catch (error) {
                    console.error(
                        'Unable to update menu-item availability:',
                        error
                    );

                    alert(error.message);
                    this.disabled = false;
                }
            });
        });

        // ========================================
        // DEACTIVATE MENU ITEM
        // ========================================
        document.querySelectorAll('.softDeleteBtn').forEach(button => {
            button.addEventListener('click', async function () {
                const itemId = Number(this.dataset.id);

                const confirmed = confirm(
                    'Deactivating this item hides it from students ' +
                    'while preserving historical order records. Continue?'
                );

                if (!confirmed) {
                    return;
                }

                this.disabled = true;

                try {
                    const response = await fetch(
                        `/api/menu-items/${itemId}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                vendorId: ACTIVE_VENDOR_ID,
                                isActive: false,
                                isAvailable: false
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            'Unable to deactivate the menu item.'
                        );
                    }

                    await renderVendorMenu();
                    await checkForActiveMenuItems();

                } catch (error) {
                    console.error(
                        'Unable to deactivate menu item:',
                        error
                    );

                    alert(error.message);
                    this.disabled = false;
                }
            });
        });

        // ========================================
        // REACTIVATE MENU ITEM
        // ========================================
        document.querySelectorAll('.reactivateItemBtn').forEach(button => {
            button.addEventListener('click', async function () {
                const itemId = Number(this.dataset.id);

                this.disabled = true;

                try {
                    const response = await fetch(
                        `/api/menu-items/${itemId}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                vendorId: ACTIVE_VENDOR_ID,
                                isActive: true,
                                isAvailable: false
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            'Unable to reactivate the menu item.'
                        );
                    }

                    await renderVendorMenu();
                    await checkForActiveMenuItems();

                } catch (error) {
                    console.error(
                        'Unable to reactivate menu item:',
                        error
                    );

                    alert(error.message);
                    this.disabled = false;
                }
            });
        });
    }

    // ========================================
    // 10. ADD NEW MENU ITEM THROUGH FLASK
    // ========================================
    const addForm = document.getElementById('addMenuItemForm');

    if (addForm) {
        addForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const name =
                document.getElementById('newItemName').value.trim();

            const price = Number.parseFloat(
                document.getElementById('newItemPrice').value
            );

            const description =
                document.getElementById('newItemDesc').value.trim();

            const imageInput =
                document.getElementById('newItemImage');

            const imageFile =
                imageInput?.files?.[0];

            if (!name || Number.isNaN(price) || price <= 0) {
                alert(
                    'Please enter a valid item name and positive price.'
                );

                return;
            }

            const submitButton = addForm.querySelector(
                'button[type="submit"]'
            );

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Adding...';
            }

            try {
                const formData = new FormData();

                formData.append('name', name);
                formData.append('price', String(price));
                formData.append('description', description);

                if (imageFile) {
                    formData.append('image', imageFile);
                }

                const response = await fetch(
                    `/api/vendors/${ACTIVE_VENDOR_ID}/menu`,
                    {
                        method: 'POST',
                        body: formData // No headers needed, fetch sets boundary automatically
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        'Unable to add the menu item.'
                    );
                }

                alert(
                    `✅ "${result.menuItem.name}" was added successfully.`
                );

                addForm.reset();

                await renderVendorMenu();
                await checkForActiveMenuItems();

            } catch (error) {
                console.error(
                    'Unable to add menu item:',
                    error
                );

                alert(error.message);

            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Add Menu Item';
                }
            }
        });
    }

    // ========================================
    // 11. DATABASE-BACKED OPERATING HOURS
    // ========================================
    function renderOperatingHours() {
        const hoursContainer =
            document.getElementById('operatingHoursContainer');

        if (!hoursContainer) {
            return;
        }

        const currentHours =
            vendorProfile.operatingHours || '08:00 - 20:00';

        const openStatus =
            getVendorOpenStatus(currentHours);

        const statusText =
            openStatus.isOpen ? '🟢 Open' : '🔴 Closed';

        const statusColor =
            openStatus.isOpen ? '#2e7d32' : '#c62828';

        hoursContainer.innerHTML = `
        <div style="
            display:flex;
            align-items:center;
            gap:15px;
            flex-wrap:wrap;
            padding:15px 0;
        ">
            <div style="
                display:flex;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
            ">
                <label
                    for="vendorHoursInput"
                    style="font-weight:600;"
                >
                    Operating Hours:
                </label>

                <input
                    type="text"
                    id="vendorHoursInput"
                    value="${escapeHtml(currentHours)}"
                    placeholder="e.g., 07:00 - 20:00"
                    style="
                        padding:8px 12px;
                        border:1px solid var(--lightGrey);
                        border-radius:4px;
                        width:180px;
                    "
                >

                <button
                    id="updateHoursBtn"
                    class="secondaryButton"
                    style="padding:8px 20px;"
                >
                    Update Hours
                </button>
            </div>

            <div style="
                font-size:1.1rem;
                font-weight:600;
            ">
                Current Status:

                <span style="color:${statusColor};">
                    ${statusText}
                </span>
            </div>
        </div>

        <div style="
            font-size:0.85rem;
            color:var(--grey);
            margin-top:5px;
        ">
            💡 Use 24-hour format:
            <strong>HH:MM - HH:MM</strong>,
            such as 07:00 - 20:00.
        </div>
    `;

        const updateButton =
            document.getElementById('updateHoursBtn');

        if (!updateButton) {
            return;
        }

        updateButton.addEventListener('click', async function () {
            const input =
                document.getElementById('vendorHoursInput');

            const newHours =
                input.value.trim();

            const hoursPattern =
                /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

            if (!hoursPattern.test(newHours)) {
                alert(
                    'Please enter operating hours in the format ' +
                    'HH:MM - HH:MM.'
                );

                return;
            }

            updateButton.disabled = true;
            updateButton.textContent = 'Updating...';

            try {
                const response = await fetch(
                    `/api/vendors/${ACTIVE_VENDOR_ID}/hours`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            operatingHours: newHours
                        })
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error ||
                        'Unable to update operating hours.'
                    );
                }

                vendorProfile.operatingHours =
                    result.vendor.operatingHours;

                alert(
                    '✅ Operating hours updated successfully.'
                );

                renderOperatingHours();
                renderStatusBanner();

            } catch (error) {
                console.error(
                    'Unable to update operating hours:',
                    error
                );

                alert(error.message);

                updateButton.disabled = false;
                updateButton.textContent = 'Update Hours';
            }
        });
    }

    // ========================================
    // 12. INITIAL LOAD
    // ========================================
    await renderVendorOrders();
    await checkForActiveMenuItems();

    renderStatusBanner();
    renderOperatingHours();

    console.log('✅ Vendor dashboard loaded');
    console.log(
        `🏬 Vendor: ${activeVendor.name} ` +
        `(ID: ${ACTIVE_VENDOR_ID})`
    );
    console.log(
        `📊 Status: ` +
        `${vendorProfile.isActive ? 'Active' : 'Inactive'}`
    );

});