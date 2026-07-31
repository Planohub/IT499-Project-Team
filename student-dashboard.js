// ========================================
// STUDENT-DASHBOARD.JS — Student Vendor Selection
// ========================================

document.addEventListener('DOMContentLoaded', async function () {

    // ========================================
    // 1. GET ACTIVE STUDENT
    // ========================================
    const activeStudent = getActiveStudentSession();

    const studentBadge = document.getElementById('studentHeaderBadge');
    if (studentBadge) {
        studentBadge.textContent =
            `🎓 ${activeStudent.firstName} ${activeStudent.lastName}`;
    }

    // ========================================
    // 2. UPDATE MEAL-PLAN BALANCE
    // ========================================
    const mealPlanBalanceElement =
        document.getElementById('mealPlanBalance');

    if (mealPlanBalanceElement) {
        mealPlanBalanceElement.textContent =
            `$${getMealPlanBalance().toFixed(2)}`;
    }

    // ========================================
    // 3. UPDATE CART COUNT
    // ========================================
    const cartLink = document.getElementById('cartLink');

    if (cartLink) {
        cartLink.textContent = `Cart (${getCartCount()})`;
    }

    // ========================================
    // 4. LOAD VENDORS FROM FLASK / SQLITE
    // ========================================
    const vendorGrid = document.getElementById('vendorGrid');

    if (!vendorGrid) {
        console.error('Vendor grid was not found.');
        return;
    }

    vendorGrid.innerHTML = `
        <div class="vendorGridMessage">
            <p>Loading vendors...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/vendors');

        if (!response.ok) {
            throw new Error(
                `Vendor request failed with status ${response.status}`
            );
        }

        const vendors = await response.json();

        if (!Array.isArray(vendors) || vendors.length === 0) {
            vendorGrid.innerHTML = `
                <div class="vendorGridMessage">
                    <p>🍽️ No vendors are currently available.</p>
                    <p>Please check back later.</p>
                </div>
            `;
            return;
        }

        renderVendors(vendors, vendorGrid);
        attachVendorClickHandlers();

        console.log(
            `✅ Student dashboard loaded ${vendors.length} vendors from SQLite`
        );

    } catch (error) {
        console.error('Unable to load vendors from the database:', error);

        vendorGrid.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load vendors.</p>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;
    }
});


function renderVendors(vendors, vendorGrid) {
    vendorGrid.innerHTML = vendors.map(vendor => {
        const openStatus = getOpenStatus(vendor.operatingHours);

        const statusText = openStatus.isOpen
            ? '🟢 Open'
            : '🔴 Closed';

        const statusClass = openStatus.isOpen
            ? 'vendorStatusOpen'
            : 'vendorStatusClosed';

        return `
            <a
                href="menu.html"
                class="vendorBox"
                data-vendor-id="${vendor.id}"
                data-vendor-name="${escapeHtml(vendor.name)}"
                data-vendor-location="${escapeHtml(vendor.location)}"
            >
                <h4>${escapeHtml(vendor.name)}</h4>

                <p>
                    ${escapeHtml(
                        vendor.location || 'Location not specified'
                    )}
                </p>

                <p class="vendorStatus ${statusClass}">
                    ${statusText}
                </p>

                <p class="vendorHours">
                    Hours: ${escapeHtml(vendor.operatingHours)}
                </p>

                <span class="secondaryButton">
                    View Menu →
                </span>
            </a>
        `;
    }).join('');
}


function attachVendorClickHandlers() {
    const vendorLinks =
        document.querySelectorAll('.vendorBox[data-vendor-id]');

    vendorLinks.forEach(vendorLink => {
        vendorLink.addEventListener('click', function (event) {
            event.preventDefault();

            const selectedVendor = {
                vendorId: Number(this.dataset.vendorId),
                vendorName: this.dataset.vendorName,
                location: this.dataset.vendorLocation
            };

            const saved = saveSelectedVendor(selectedVendor);

            if (!saved) {
                alert('Unable to select the vendor. Please try again.');
                return;
            }

            window.location.href = this.getAttribute('href');
        });
    });
}


function getOpenStatus(operatingHours) {
    if (
        typeof operatingHours !== 'string' ||
        !operatingHours.includes('-')
    ) {
        return { isOpen: true };
    }

    try {
        const [openingTime, closingTime] = operatingHours
            .split('-')
            .map(time => time.trim());

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
        console.error('Unable to parse vendor hours:', error);
        return { isOpen: true };
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