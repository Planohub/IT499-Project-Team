/**
 * CampusFoodLink+ — Admin Vendor Management Logic (admin-vendors.js)
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

            addVendor({
                name: name,
                location: location,
                operatingHours: hours || '08:00 - 20:00'
            });

            addVendorForm.reset();
            alert(`✅ Vendor "${name}" created successfully!`);
            renderVendorDirectory();
        });
    }
});

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
            ? `<button class="secondaryButton deactivateVendorBtn" data-id="${v.id}" data-name="${v.name}" style="padding: 4px 12px; color: #cc0000; border-color: #cc0000; font-size: 0.85rem;">Deactivate</button>`
            : `<button class="secondaryButton reactivateVendorBtn" data-id="${v.id}" data-name="${v.name}" style="padding: 4px 12px; font-size: 0.85rem;">Reactivate</button>`;

        html += `
            <tr style="border-bottom: 1px solid var(--lightGrey);">
                <td style="padding: 12px 10px; font-weight: 600;">#${v.id}</td>
                <td style="padding: 12px 10px; font-weight: 600;">${v.name}</td>
                <td style="padding: 12px 10px; color: var(--grey);">${v.location}</td>
                <td style="padding: 12px 10px;">
                    <input type="text" class="hoursInput" data-id="${v.id}" value="${v.operatingHours || '08:00 - 20:00'}" 
                           style="width: 130px; padding: 4px 8px; border: 1px solid var(--lightGrey); border-radius: 4px; font-size: 0.85rem;">
                    <button class="secondaryButton updateHoursBtn" data-id="${v.id}" style="padding: 2px 10px; font-size: 0.75rem;">Update</button>
                </td>
                <td style="padding: 12px 10px;">${statusBadge}</td>
                <td style="padding: 12px 10px;">${actionButton}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    attachVendorActionListeners();
    attachHoursUpdateListeners();
}

function attachHoursUpdateListeners() {
    document.querySelectorAll('.updateHoursBtn').forEach(btn => {
        btn.addEventListener('click', function () {
            const vendorId = Number(this.dataset.id);
            const input = document.querySelector(`.hoursInput[data-id="${vendorId}"]`);
            if (!input) return;

            const newHours = input.value.trim();
            if (!newHours || !newHours.includes('-')) {
                alert('Please enter hours in format: HH:MM - HH:MM (e.g., 07:00 - 20:00)');
                return;
            }

            const success = updateVendorHours(vendorId, newHours);
            if (success) {
                alert('✅ Operating hours updated successfully!');
                renderVendorDirectory();
            } else {
                alert('❌ Failed to update hours. Please try again.');
            }
        });
    });
}

function attachVendorActionListeners() {
    document.querySelectorAll('.deactivateVendorBtn').forEach(btn => {
        btn.addEventListener('click', function () {
            const vendorId = this.getAttribute('data-id');
            const vendorName = this.getAttribute('data-name');

            if (confirm(`⚠️ Are you sure you want to deactivate "${vendorName}"?\n\nStudents will no longer see this vendor, and the vendor will be locked out with a "Contact Admin" message.`)) {
                setVendorActiveState(vendorId, false);
                renderVendorDirectory();
                alert(`✅ "${vendorName}" has been deactivated.`);
            }
        });
    });

    document.querySelectorAll('.reactivateVendorBtn').forEach(btn => {
        btn.addEventListener('click', function () {
            const vendorId = this.getAttribute('data-id');
            const vendorName = this.getAttribute('data-name');

            if (confirm(`✅ Are you sure you want to reactivate "${vendorName}"?\n\nStudents will be able to see this vendor again.`)) {
                setVendorActiveState(vendorId, true);
                renderVendorDirectory();
                alert(`✅ "${vendorName}" has been reactivated.`);
            }
        });
    });
}