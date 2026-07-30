/**
 * CampusFoodLink+ — Operational Reports Engine (admin-reports.js)
 * Generates reporting metrics for Dining Services administrators based on order history.
 */

document.addEventListener('DOMContentLoaded', function () {
    // 🔥 Get REAL orders from localStorage
    const orders = getOrdersHistory();

    console.log('📊 Admin Reports — Orders loaded:', orders);

    // Render all operational report modules
    renderPurchasesSummary(orders);
    renderVendorPerformance(orders);
    renderBuyingTrends(orders);
    renderPeakHours(orders);
});

/**
 * 1. PURCHASES SUMMARY (Total Sales, Order Volume, Average Order Value)
 */
function renderPurchasesSummary(orders) {
    const totalOrdersElem = document.getElementById('totalOrders');
    const totalRevenueElem = document.getElementById('totalRevenue');
    const avgOrderValueElem = document.getElementById('avgOrderValue');

    const totalOrdersCount = orders.length;
    const totalRevenueSum = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgValue = totalOrdersCount > 0 ? totalRevenueSum / totalOrdersCount : 0;

    if (totalOrdersElem) totalOrdersElem.textContent = totalOrdersCount;
    if (totalRevenueElem) totalRevenueElem.textContent = `$${totalRevenueSum.toFixed(2)}`;
    if (avgOrderValueElem) avgOrderValueElem.textContent = `$${avgValue.toFixed(2)}`;
}

/**
 * 2. VENDOR ORDER VOLUME & PERFORMANCE
 */
function renderVendorPerformance(orders) {
    const container = document.getElementById('vendorPerformanceContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No vendor transaction data available.</p>';
        return;
    }

    const vendorStats = {};

    orders.forEach(order => {
        const vendor = order.vendorName || 'Unknown Vendor';
        if (!vendorStats[vendor]) {
            vendorStats[vendor] = { orderCount: 0, totalSales: 0 };
        }
        vendorStats[vendor].orderCount += 1;
        vendorStats[vendor].totalSales += (order.total || 0);
    });

    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--black);">
                    <th style="padding: 10px;">Vendor Name</th>
                    <th style="padding: 10px;">Order Volume</th>
                    <th style="padding: 10px;">Total Revenue</th>
                    <th style="padding: 10px;">Avg Sale / Order</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const [vendorName, stats] of Object.entries(vendorStats)) {
        const avgVendorSale = stats.orderCount > 0 ? stats.totalSales / stats.orderCount : 0;
        tableHTML += `
            <tr style="border-bottom: 1px solid var(--lightGrey);">
                <td style="padding: 12px 10px; font-weight: 600;">${vendorName}</td>
                <td style="padding: 12px 10px;">${stats.orderCount} orders</td>
                <td style="padding: 12px 10px;">$${stats.totalSales.toFixed(2)}</td>
                <td style="padding: 12px 10px;">$${avgVendorSale.toFixed(2)}</td>
            </tr>
        `;
    }

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

/**
 * 3. BUYING TRENDS (Top Menu Items)
 */
function renderBuyingTrends(orders) {
    const container = document.getElementById('buyingTrendsContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No item sales data available.</p>';
        return;
    }

    const itemStats = {};

    orders.forEach(order => {
        if (Array.isArray(order.items)) {
            order.items.forEach(item => {
                const itemName = item.name || item.item || 'Unknown Item';
                const qty = item.quantity || 1;
                const revenue = item.total || (item.price * qty) || 0;

                if (!itemStats[itemName]) {
                    itemStats[itemName] = { quantitySold: 0, totalRevenue: 0 };
                }
                itemStats[itemName].quantitySold += qty;
                itemStats[itemName].totalRevenue += revenue;
            });
        }
    });

    // Sort items by units sold descending
    const sortedItems = Object.entries(itemStats).sort((a, b) => b[1].quantitySold - a[1].quantitySold);

    if (sortedItems.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No item sales data available.</p>';
        return;
    }

    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--black);">
                    <th style="padding: 10px;">Menu Item</th>
                    <th style="padding: 10px;">Units Sold</th>
                    <th style="padding: 10px;">Total Revenue</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedItems.forEach(([itemName, stats]) => {
        tableHTML += `
            <tr style="border-bottom: 1px solid var(--lightGrey);">
                <td style="padding: 12px 10px; font-weight: 600;">${itemName}</td>
                <td style="padding: 12px 10px;">${stats.quantitySold} units</td>
                <td style="padding: 12px 10px;">$${stats.totalRevenue.toFixed(2)}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

/**
 * 4. PEAK-DEMAND PERIODS (Orders Grouped by Hour of Day)
 */
function renderPeakHours(orders) {
    const container = document.getElementById('peakHoursContainer');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No time-series data available.</p>';
        return;
    }

    // Initialize 24-hour slots
    const hourCounts = {};

    orders.forEach(order => {
        let orderTime;

        // Try to parse the order date in different formats
        if (order.timestamp) {
            orderTime = new Date(order.timestamp);
        } else if (order.orderDate) {
            orderTime = new Date(order.orderDate);
        } else {
            orderTime = new Date();
        }

        const hour = isNaN(orderTime.getTime()) ? new Date().getHours() : orderTime.getHours();

        // Format 12-hour display string (e.g., "12:00 PM - 1:00 PM")
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
        const timeSlot = `${formattedHour}:00 ${ampm}`;

        hourCounts[timeSlot] = (hourCounts[timeSlot] || 0) + 1;
    });

    // Sort by hour (chronological)
    const sortedHours = Object.entries(hourCounts).sort((a, b) => {
        const hourA = parseInt(a[0].split(':')[0]);
        const hourB = parseInt(b[0].split(':')[0]);
        return hourA - hourB;
    });

    if (sortedHours.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No time-series data available.</p>';
        return;
    }

    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--black);">
                    <th style="padding: 10px;">Time Slot</th>
                    <th style="padding: 10px;">Order Volume</th>
                    <th style="padding: 10px;">Demand Indicator</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const [timeSlot, count] of sortedHours) {
        let indicator = '🟢 Normal';
        if (count >= 5) {
            indicator = '🔴 Peak Demand';
        } else if (count >= 3) {
            indicator = '🟡 Moderate Demand';
        }

        tableHTML += `
            <tr style="border-bottom: 1px solid var(--lightGrey);">
                <td style="padding: 12px 10px; font-weight: 600;">${timeSlot}</td>
                <td style="padding: 12px 10px;">${count} order(s)</td>
                <td style="padding: 12px 10px;">${indicator}</td>
            </tr>
        `;
    }

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}