/**
 * CampusFoodLink+ — Admin Vendor Management Logic (admin-vendors.js)
 * Enables Dining Services administrators to add and remove/deactivate vendors.
 */

document.addEventListener('DOMContentLoaded', async function () {
    await renderVendorDirectory();

    // ========================================
    // ADD VENDOR THROUGH FLASK
    // ========================================
    const addVendorForm =
        document.getElementById('addVendorForm');

    if (addVendorForm) {
        addVendorForm.addEventListener(
            'submit',
            async function (event) {
                event.preventDefault();

                const name = document.getElementById('vendorNameInput').value.trim();
                const location = document.getElementById('vendorLocationInput').value.trim();
                const hours = document.getElementById('vendorHoursInput').value.trim();

                if (!name || !location) {
                    alert(
                        'Please enter both a vendor name ' +
                        'and campus location.'
                    );
                    return;
                }

                const submitButton = addVendorForm.querySelector(
                    'button[type="submit"]'
                );

                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Adding...';
                }

                try {
                    const response = await fetch(
                        '/api/admin/vendors',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: name,
                                location: location,
                                operatingHours:
                                    hours || '08:00 - 20:00'
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            'Unable to create the vendor.'
                        );
                    }

                    addVendorForm.reset();

                    alert(
                        `✅ Vendor "${result.vendor.name}" ` +
                        'created successfully.'
                    );

                    await renderVendorDirectory();

                } catch (error) {
                    console.error(
                        'Unable to create vendor:',
                        error
                    );

                    alert(error.message);

                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent =
                            '➕ Add Vendor Account';
                    }
                }
            }
        );
    }
});

async function renderVendorDirectory() {
    const container = document.getElementById('vendorDirectoryContainer');

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="vendorGridMessage">
            <p>Loading vendor accounts...</p>
        </div>
    `;

    let vendors = [];

    try {
        const response = await fetch('/api/admin/vendors');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || 'Unable to load vendor accounts.'
            );
        }

        vendors = Array.isArray(result)
            ? result
            : [];

    } catch (error) {
        console.error(
            'Unable to load administrator vendor data:',
            error
        );

        container.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load vendor accounts.</p>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;

        return;
    }

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
    document.querySelectorAll('.updateHoursBtn').forEach(button => {
        button.addEventListener('click', async function () {
            const vendorId = Number(this.dataset.id);

            const input = document.querySelector(
                `.hoursInput[data-id="${vendorId}"]`
            );

            if (!input) {
                return;
            }

            const newHours = input.value.trim();

            const hoursPattern = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

            if (!hoursPattern.test(newHours)) {
                alert(
                    'Please enter hours in the format ' +
                    'HH:MM - HH:MM.'
                );
                return;
            }

            this.disabled = true;
            this.textContent = 'Updating...';

            try {
                const response = await fetch(
                    `/api/vendors/${vendorId}/hours`,
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

                alert(
                    `✅ Operating hours for ` +
                    `"${result.vendor.name}" were updated.`
                );

                await renderVendorDirectory();

            } catch (error) {
                console.error(
                    'Unable to update vendor hours:',
                    error
                );

                alert(error.message);

                this.disabled = false;
                this.textContent = 'Update';
            }
        });
    });
}

function attachVendorActionListeners() {

    // ========================================
    // DEACTIVATE VENDOR
    // ========================================
    document.querySelectorAll('.deactivateVendorBtn').forEach(button => {
        button.addEventListener('click', async function () {
            const vendorId = Number(this.dataset.id);
            const vendorName = this.dataset.name;

            const confirmed = confirm(
                `Are you sure you want to deactivate "${vendorName}"?\n\n` +
                'Students will no longer see this vendor, and the ' +
                'vendor dashboard will display an account-deactivated message.'
            );

            if (!confirmed) {
                return;
            }

            await submitVendorStatusChange(
                vendorId,
                vendorName,
                false
            );
        });
    });

    // ========================================
    // REACTIVATE VENDOR
    // ========================================
    document.querySelectorAll('.reactivateVendorBtn').forEach(button => {
        button.addEventListener('click', async function () {
            const vendorId = Number(this.dataset.id);
            const vendorName = this.dataset.name;

            const confirmed = confirm(
                `Are you sure you want to reactivate "${vendorName}"?\n\n` +
                'The vendor will regain access, and students may see it ' +
                'again once it has active available menu items.'
            );

            if (!confirmed) {
                return;
            }

            await submitVendorStatusChange(
                vendorId,
                vendorName,
                true
            );
        });
    });
}

async function submitVendorStatusChange(vendorId, vendorName, isActive) {
    const actionButtons =
        document.querySelectorAll(
            `[data-id="${vendorId}"]`
        );

    actionButtons.forEach(button => {
        button.disabled = true;
    });

    try {
        const response = await fetch(
            `/api/admin/vendors/${vendorId}/status`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isActive: isActive
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Unable to update the vendor status.'
            );
        }

        alert(
            isActive
                ? `✅ "${vendorName}" has been reactivated.`
                : `✅ "${vendorName}" has been deactivated.`
        );

        await renderVendorDirectory();

    } catch (error) {
        console.error(
            'Unable to update vendor status:',
            error
        );

        alert(error.message);

        actionButtons.forEach(button => {
            button.disabled = false;
        });
    }
}