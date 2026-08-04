/**
 * CampusFoodLink+ — Operational Reports Engine
 * Loads reporting metrics from Flask and SQLite.
 */

document.addEventListener('DOMContentLoaded', async function () {
    await loadOperationalReports();
});

async function loadOperationalReports() {
    showLoadingMessages();

    try {
        const response = await fetch('/api/admin/reports');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Unable to load operational reports.'
            );
        }

        renderPurchasesSummary(result.summary || {});
        renderVendorPerformance(
            Array.isArray(result.vendorPerformance)
                ? result.vendorPerformance
                : []
        );
        renderBuyingTrends(
            Array.isArray(result.buyingTrends)
                ? result.buyingTrends
                : []
        );
        renderPeakHours(
            Array.isArray(result.peakHours)
                ? result.peakHours
                : []
        );

        console.log(
            '✅ Operational reports loaded from SQLite'
        );

    } catch (error) {
        console.error(
            'Unable to load operational reports:',
            error
        );

        showReportError();
    }
}

function showLoadingMessages() {
    const containers = [
        'vendorPerformanceContainer',
        'buyingTrendsContainer',
        'peakHoursContainer'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);

        if (container) {
            container.innerHTML = `
                <div class="vendorGridMessage">
                    <p>Loading report data...</p>
                </div>
            `;
        }
    });
}

function showReportError() {
    const containers = [
        'vendorPerformanceContainer',
        'buyingTrendsContainer',
        'peakHoursContainer'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);

        if (container) {
            container.innerHTML = `
                <div class="vendorGridMessage vendorGridError">
                    <p>Unable to load report data.</p>
                    <p>Please refresh the page or try again later.</p>
                </div>
            `;
        }
    });
}

/**
 * 1. PURCHASES SUMMARY
 */
function renderPurchasesSummary(summary) {
    const totalOrdersElem = document.getElementById('totalOrders');
    const totalRevenueElem = document.getElementById('totalRevenue');
    const avgOrderValueElem = document.getElementById('avgOrderValue');
    const totalOrders = Number(summary.totalOrders || 0);
    const totalRevenue = Number(summary.totalRevenue || 0);
    const averageOrderValue = Number(summary.averageOrderValue || 0);

    if (totalOrdersElem) {
        totalOrdersElem.textContent = totalOrders;
    }

    if (totalRevenueElem) {
        totalRevenueElem.textContent =
            `$${totalRevenue.toFixed(2)}`;
    }

    if (avgOrderValueElem) {
        avgOrderValueElem.textContent =
            `$${averageOrderValue.toFixed(2)}`;
    }
}

/**
 * 2. VENDOR ORDER VOLUME AND PERFORMANCE
 */
function renderVendorPerformance(vendors) {
    const container = document.getElementById('vendorPerformanceContainer');

    if (!container) {
        return;
    }

    if (vendors.length === 0) {
        container.innerHTML = `
            <p style="color:var(--grey);">
                No vendor performance data available.
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
                    <th style="padding:10px;">
                        Vendor Name
                    </th>
                    <th style="padding:10px;">
                        Order Volume
                    </th>
                    <th style="padding:10px;">
                        Total Revenue
                    </th>
                    <th style="padding:10px;">
                        Avg Sale / Order
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    vendors.forEach(vendor => {
        html += `
            <tr style="
                border-bottom:1px solid var(--lightGrey);
            ">
                <td style="
                    padding:12px 10px;
                    font-weight:600;
                ">
                    ${escapeHtml(vendor.vendorName)}
                </td>

                <td style="padding:12px 10px;">
                    ${Number(vendor.orderCount)} orders
                </td>

                <td style="padding:12px 10px;">
                    $${Number(
            vendor.totalRevenue
        ).toFixed(2)}
                </td>

                <td style="padding:12px 10px;">
                    $${Number(
            vendor.averageOrderValue
        ).toFixed(2)}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * 3. BUYING TRENDS
 */
function renderBuyingTrends(items) {
    const container = document.getElementById('buyingTrendsContainer');

    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML = `
            <p style="color:var(--grey);">
                No item sales data available.
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
                    <th style="padding:10px;">
                        Menu Item
                    </th>
                    <th style="padding:10px;">
                        Units Sold
                    </th>
                    <th style="padding:10px;">
                        Total Revenue
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        html += `
            <tr style="
                border-bottom:1px solid var(--lightGrey);
            ">
                <td style="
                    padding:12px 10px;
                    font-weight:600;
                ">
                    ${escapeHtml(item.itemName)}
                </td>

                <td style="padding:12px 10px;">
                    ${Number(item.quantitySold)} units
                </td>

                <td style="padding:12px 10px;">
                    $${Number(
            item.totalRevenue
        ).toFixed(2)}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * 4. PEAK-DEMAND PERIODS
 */
function renderPeakHours(hours) {
    const container = document.getElementById('peakHoursContainer');

    if (!container) {
        return;
    }

    if (hours.length === 0) {
        container.innerHTML = `
            <p style="color:var(--grey);">
                No time-series data available.
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
                    <th style="padding:10px;">
                        Time Slot
                    </th>
                    <th style="padding:10px;">
                        Order Volume
                    </th>
                    <th style="padding:10px;">
                        Demand Indicator
                    </th>
                </tr>
            </thead>
            <tbody>
    `;

    hours.forEach(hourRecord => {
        const hour = Number(hourRecord.hour);
        const count = Number(hourRecord.orderCount);
        const timeSlot = formatHourSlot(hour);

        let indicator = '🟢 Normal';

        if (count >= 5) {
            indicator = '🔴 Peak Demand';
        } else if (count >= 3) {
            indicator = '🟡 Moderate Demand';
        }

        html += `
            <tr style="
                border-bottom:1px solid var(--lightGrey);
            ">
                <td style="
                    padding:12px 10px;
                    font-weight:600;
                ">
                    ${timeSlot}
                </td>

                <td style="padding:12px 10px;">
                    ${count} order(s)
                </td>

                <td style="padding:12px 10px;">
                    ${indicator}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function formatHourSlot(hour) {
    const normalizedHour =
        Number.isInteger(hour) &&
            hour >= 0 &&
            hour <= 23
            ? hour
            : 0;

    const nextHour = (normalizedHour + 1) % 24;

    return (
        `${formatHour(normalizedHour)} - ` +
        `${formatHour(nextHour)}`
    );
}

function formatHour(hour) {
    const period =
        hour >= 12 ? 'PM' : 'AM';

    const displayHour =
        hour % 12 === 0
            ? 12
            : hour % 12;

    return `${displayHour}:00 ${period}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}