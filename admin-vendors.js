/**
 * CampusFoodLink+ — Admin Vendor Management Logic (admin-student-dashboard.js)
 * Enables Dining Services administrators to add and remove/deactivate vendors.
 */

document.addEventListener('DOMContentLoaded', function () {
    renderVendorDirectory();

    // Add Vendor Form Submit Handler
    const addVendorForm = document.getElementById('addVendorForm');
    if (addVendorForm) {
        addVendorForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('vendorNameInput').value.trim();
            const location = document.getElementById('vendorLocationInput').value.trim();
            const hours = document.getElementById('vendorHoursInput').value.trim();

            if (!name || !location) {
                alert('Please enter both a vendor name and campus location.');
                return;
            }

            // Save new vendor to storage
            addVendor({
                name: name,
                location: location,
                operatingHours: hours
            });

            addVendorForm.reset();
            alert(`Vendor "${name}" created successfully!`);
            renderVendorDirectory();
        });
    }
});

/**
 * Renders the full directory of vendor accounts with activation controls.
 */
function renderVendorDirectory() {
    const container = document.getElementById('vendorDirectoryContainer');
    if (!container) return;

    const vendors = getAllVendors();

    if (vendors.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No vendors registered in the system.</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--black);">
                    <th style="padding: 10px;">ID</th>
                    <th style="padding: 10px;">Vendor Name</th>
                    <th style="padding: 10px;">Location</th>
                    <th style="padding: 10px;">Hours</th>
                    <th style="padding: 10px;">Status</th>
                    <th style="padding: 10px;">Administrative Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    vendors.forEach(v => {
        const isActive = v.isActive !== false;
        const statusBadge = isActive 
            ? '<span class="userBadge" style="background: #e6fffa; color: #007a5a; border-color: #007a5a;">🟢 Active</span>' 
            : '<span class="userBadge" style="background: #ffe6e6; color: #cc0000; border-color: #cc0000;">🔴 Inactive</span>';

        const actionButton = isActive
            ? `<button class="secondaryButton removeVendorBtn" data-id="${v.id}" data-name="${v.name}" style="padding: 4px 12px; color: #cc0000; border-color: #cc0000; font-size: 0.85rem;">Remove / Deactivate</button>`
            : `<button class="secondaryButton activateVendorBtn" data-id="${v.id}" style="padding: 4px 12px; font-size: 0.85rem;">Reactivate</button>`;

        html += `
            <tr style="border-bottom: 1px solid var(--lightGrey);">
                <td style="padding: 12px 10px; font-weight: 600;">#${v.id}</td>
                <td style="padding: 12px 10px; font-weight: 600;">${v.name}</td>
                <td style="padding: 12px 10px; color: var(--grey);">${v.location}</td>
                <td style="padding: 12px 10px; color: var(--grey); font-size: 0.9rem;">${v.operatingHours || 'N/A'}</td>
                <td style="padding: 12px 10px;">${statusBadge}</td>
                <td style="padding: 12px 10px;">${actionButton}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    attachVendorActionListeners();
}

/**
 * Attaches event listeners for removing/deactivating and reactivating vendors.
 */
function attachVendorActionListeners() {
    // Remove / Deactivate Vendor Handler
    document.querySelectorAll('.removeVendorBtn').forEach(btn => {
        btn.addEventListener('click', function () {
            const vendorId = this.getAttribute('data-id');
            const vendorName = this.getAttribute('data-name');

            if (confirm(`Are you sure you want to remove "${vendorName}"?\n\nNote: In accordance with system audit rules, this vendor will be deactivated (soft-deleted) to protect historical order records.`)) {
                setVendorActiveState(vendorId, false);
                renderVendorDirectory();
            }
        });
    });

    // Reactivate Vendor Handler
    document.querySelectorAll('.activateVendorBtn').forEach(btn => {
        btn.addEventListener('click', function () {
            const vendorId = this.getAttribute('data-id');
            setVendorActiveState(vendorId, true);
            renderVendorDirectory();
        });
    });
}