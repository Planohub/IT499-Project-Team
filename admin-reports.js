/**
 * CampusFoodLink+ Administrative Operational Analytics Engine
 * Tracks KPIs, calculates peak-demand clusters, and aggregates multi-tenant volumes.
 */
document.addEventListener('DOMContentLoaded', function () {
    // 1. Core Structural Data Initializer
    initializeReportingDashboard();
});

function initializeReportingDashboard() {
    // Verify administrative authentication role boundary constraints
    console.log("Initializing Administrative Analytics Engine...");

    // Extract records safely from persistent application layer storage
    let orders = [];
    try {
        const savedOrders = localStorage.getItem('orders');
        if (savedOrders) {
            orders = JSON.parse(savedOrders);
        }
    } catch (e) {
        console.error("Data Layer Error: Failed to extract orders matrix for report compilation.", e);
    }

    // Compile and render distinct datasets
    const kpis = calculateCoreKPIs(orders);
    renderKPICards(kpis);

    const vendorVolume = calculateVendorOrderVolume(orders);
    renderVendorVolumeTable(vendorVolume);

    const peakPeriods = calculatePeakDemandPeriods(orders);
    renderPeakDemandChart(peakPeriods);
}

/**
 * Metric Analysis 1: Core Standard Reporting Measures
 * Computes Average Order Preparation Time and cumulative system activity metrics.
 */
function calculateCoreKPIs(orders) {
    const totalOrders = orders.length;
    let completedCount = 0;
    let totalPrepTimeMinutes = 0;
    let totalRevenue = 0;

    orders.forEach(order => {
        // Accumulate processed sales volume metrics safely
        if (order.total && !isNaN(order.total)) {
            totalRevenue += Number(order.total);
        }

        // Standardized Measure: Average order preparation time
        if (order.currentStatus === 'Complete' && order.timestamp && order.completedTime) {
            const completionTimestamp = new Date(order.completedTime).getTime();
            const durationMs = completionTimestamp - order.timestamp;
            
            if (durationMs > 0) {
                totalPrepTimeMinutes += (durationMs / 1000 / 60);
                completedCount++;
            }
        }
    });

    const avgPrepTime = completedCount > 0 ? (totalPrepTimeMinutes / completedCount).toFixed(1) : "0.0";

    return {
        totalOrders: totalOrders,
        avgPrepTime: avgPrepTime + "m",
        totalRevenue: "$" + totalRevenue.toFixed(2),
        activeFulfillmentRate: totalOrders > 0 ? ((completedCount / totalOrders) * 100).toFixed(0) + "%" : "0%"
    };
}

/**
 * Metric Analysis 2: Multi-Tenant Vendor Performance Logging
 * Segregates order traffic volumes by distinct VendorID values.
 */
function calculateVendorOrderVolume(orders) {
    const vendorMap = {};

    orders.forEach(order => {
        const vId = order.vendorId || "Unknown";
        const vName = order.vendorName || "Unassigned Vendor Entity";

        if (!vendorMap[vId]) {
            vendorMap[vId] = {
                name: vName,
                count: 0,
                revenue: 0
            };
        }
        vendorMap[vId].count++;
        vendorMap[vId].revenue += Number(order.total || 0);
    });

    return Object.keys(vendorMap).map(id => ({
        vendorId: id,
        name: vendorMap[id].name,
        volume: vendorMap[id].count,
        totalSales: "$" + vendorMap[id].revenue.toFixed(2)
    }));
}

/**
 * Metric Analysis 3: Temporal Peak-Demand Clusters
 * Groups historical order transactions into actionable operational hour brackets.
 */
function calculatePeakDemandPeriods(orders) {
    const hourlyBuckets = Array(24).fill(0);

    orders.forEach(order => {
        if (order.timestamp) {
            const hour = new Date(order.timestamp).getHours();
            hourlyBuckets[hour]++;
        }
    });

    // Format metrics cleanly into actionable operational shifts
    return hourlyBuckets.map((count, hour) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        return {
            timeSlot: `${displayHour}${ampm}`,
            orderCount: count
        };
    }).filter(bucket => bucket.orderCount > 0); // Drop empty clusters for cleaner view
}

/**
 * DOM Rendering Bindings
 */
function renderKPICards(kpis) {
    const container = document.getElementById('reporting-kpi-container');
    if (!container) return;

    container.innerHTML = `
        <div class="kpiCard"><h3>Total Operational Orders</h3><p>${kpis.totalOrders}</p></div>
        <div class="kpiCard"><h3>Avg Prep Time (FR-09)</h3><p>${kpis.avgPrepTime}</p></div>
        <div class="kpiCard"><h3>Meal-Plan Volume Processed</h3><p>${kpis.totalRevenue}</p></div>
        <div class="kpiCard"><h3>Fulfillment Rate</h3><p>${kpis.activeFulfillmentRate}</p></div>
    `;
}

function renderVendorVolumeTable(vendorVolume) {
    const tableBody = document.getElementById('vendor-volume-table-body');
    if (!tableBody) return;

    if (vendorVolume.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="no-data">No recorded vendor history found in storage zone.</td></tr>`;
        return;
    }

    tableBody.innerHTML = vendorVolume.map(row => `
        <tr>
            <td>${row.vendorId}</td>
            <td>${row.name}</td>
            <td>${row.volume} orders</td>
            <td>${row.totalSales}</td>
        </tr>
    `).join('');
}

function renderPeakDemandChart(peakPeriods) {
    const element = document.getElementById('peak-demand-visual-target');
    if (!element) return;

    if (peakPeriods.length === 0) {
        element.innerHTML = `<p class="no-data">Insufficient transactional logs captured to build distribution grids.</p>`;
        return;
    }

    // Build standard text-scaffolded horizontal data bars for accessible presentation layers (NFR-04)
    element.innerHTML = peakPeriods.map(slot => `
        <div class="demandBarRow">
            <span class="timeLabel">${slot.timeSlot}</span>
            <div class="barContainer">
                <div class="barFill" style="width: ${Math.min(slot.orderCount * 10, 100)}%;"></div>
            </div>
            <span class="countLabel">${slot.orderCount} orders</span>
        </div>
    `).join('');
}