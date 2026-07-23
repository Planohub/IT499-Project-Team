/**
 * CampusFoodLink+ — Admin Dashboard Logic (admin.js)
 * Calculates operational KPIs directly from localStorage order data.
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Retrieve stored orders array from localStorage
    let orders = [];
    try {
        const savedOrders = localStorage.getItem('orders');
        if (savedOrders) {
            orders = JSON.parse(savedOrders);
        }
    } catch (e) {
        console.error('Unable to parse order history for reporting', e);
    }

    // 2. Elements
    const totalOrdersCount = document.getElementById('totalOrdersCount');
    const totalRevenueAmount = document.getElementById('totalRevenueAmount');
    const avgOrderValueAmount = document.getElementById('avgOrderValueAmount');
    const vendorReportTable = document.getElementById('vendorReportTable');

    // 3. Compute High-Level Metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const avgValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    // 4. Update KPI Display
    if (totalOrdersCount) totalOrdersCount.textContent = totalOrders;
    if (totalRevenueAmount) totalRevenueAmount.textContent = `$${totalRevenue.toFixed(2)}`;
    if (avgOrderValueAmount) avgOrderValueAmount.textContent = `$${avgValue.toFixed(2)}`;

    // 5. Aggregate Vendor Order Volume
    const vendorStats = {};

    orders.forEach(order => {
        const vendor = order.vendorName || 'Quad Side Café';
        if (!vendorStats[vendor]) {
            vendorStats[vendor] = { count: 0, revenue: 0 };
        }
        vendorStats[vendor].count += 1;
        vendorStats[vendor].revenue += (order.total || 0);
    });

    // 6. Render Operational Report Table
    if (vendorReportTable) {
        if (Object.keys(vendorStats).length === 0) {
            vendorReportTable.innerHTML = '<p style="color: var(--grey);">No operational data available yet. Place an order to generate reporting metrics.</p>';
        } else {
            let tableHTML = `
                <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--black);">
                            <th style="padding: 8px;">Vendor Name</th>
                            <th style="padding: 8px;">Order Volume</th>
                            <th style="padding: 8px;">Total Sales</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const [vendorName, stats] of Object.entries(vendorStats)) {
                tableHTML += `
                    <tr style="border-bottom: 1px solid var(--lightGrey);">
                        <td style="padding: 10px 8px; font-weight: 600;">${vendorName}</td>
                        <td style="padding: 10px 8px;">${stats.count} orders</td>
                        <td style="padding: 10px 8px;">$${stats.revenue.toFixed(2)}</td>
                    </tr>
                `;
            }

            tableHTML += '</tbody></table>';
            vendorReportTable.innerHTML = tableHTML;
        }
    }
});