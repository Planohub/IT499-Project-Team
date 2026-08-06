/**
 * CampusFoodLink+ — Admin Student Management Logic (admin-students.js)
 * Enables Dining Services administrators to manage student accounts.
 */

let selectedStudentId = null;

document.addEventListener('DOMContentLoaded', async function () {
    await renderStudentDirectory();

    // ========================================
    // ADD STUDENT THROUGH FLASK
    // ========================================
    const addStudentForm =
        document.getElementById('addStudentForm');

    if (addStudentForm) {
        addStudentForm.addEventListener(
            'submit',
            async function (event) {
                event.preventDefault();

                const firstName = document.getElementById('studentFirstName').value.trim();
                const lastName = document.getElementById('studentLastName').value.trim();
                const email = document.getElementById('studentEmail').value.trim();

                if (!firstName || !lastName || !email) {
                    alert('Please fill in all fields.');
                    return;
                }

                const submitButton =
                    addStudentForm.querySelector(
                        'button[type="submit"]'
                    );

                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Adding...';
                }

                try {
                    const response = await fetch(
                        '/api/admin/students',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                firstName: firstName,
                                lastName: lastName,
                                email: email
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            'Unable to create the student account.'
                        );
                    }

                    addStudentForm.reset();

                    alert(
                        `✅ Student "${result.student.firstName} ` +
                        `${result.student.lastName}" created successfully.`
                    );

                    await renderStudentDirectory();

                } catch (error) {
                    console.error(
                        'Unable to create student:',
                        error
                    );

                    alert(error.message);

                } finally {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent =
                            '➕ Add Student Account';
                    }
                }
            }
        );
    }
});

async function renderStudentDirectory() {
    const container = document.getElementById('studentDirectoryContainer');

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="vendorGridMessage">
            <p>Loading student accounts...</p>
        </div>
    `;

    let students = [];

    try {
        const response = await fetch('/api/admin/students');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Unable to load student accounts.'
            );
        }

        students = Array.isArray(result)
            ? result
            : [];

    } catch (error) {
        console.error(
            'Unable to load administrator student data:',
            error
        );

        container.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load student accounts.</p>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;

        return;
    }

    if (students.length === 0) {
        container.innerHTML = `
            <p style="color:var(--grey);">
                No students registered in the system.
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
                <tr style="border-bottom:2px solid var(--black);">
                    <th style="padding:10px;">ID</th>
                    <th style="padding:10px;">Name</th>
                    <th style="padding:10px;">Email</th>
                    <th style="padding:10px;">Balance</th>
                    <th style="padding:10px;">Status</th>
                    <th style="padding:10px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    students.forEach(student => {
        const statusBadge = student.isActive
            ? `
                <span
                    class="userBadge"
                    style="
                        background:var(--brand-white);
                        color:var(--brand-green);
                        border-color:var(--brand-green);
                    "
                >
                    🟢 Active
                </span>
            `
            : `
                <span
                    class="userBadge"
                    style="
                        background:var(--brand-white);
                        color:var(--brand-red);
                        border-color:var(--brand-red);
                    "
                >
                    🔴 Inactive
                </span>
            `;

        const actionButton = student.isActive
            ? `
                <button
                    class="secondaryButton suspendStudentBtn"
                    data-id="${student.id}"
                    data-name="${escapeHtml(
                `${student.firstName} ${student.lastName}`
            )}"
                    style="
                        padding:4px 12px;
                        font-size:0.85rem;
                    "
                >
                    Deactivate
                </button>
            `
            : `
                <button
                    class="secondaryButton activateStudentBtn"
                    data-id="${student.id}"
                    data-name="${escapeHtml(
                `${student.firstName} ${student.lastName}`
            )}"
                    style="
                        padding:4px 12px;
                        font-size:0.85rem;
                    "
                >
                    Activate
                </button>
            `;

        html += `
            <tr
                class="student-row"
                data-id="${student.id}"
                style="
                    border-bottom:1px solid var(--lightGrey);
                    cursor:pointer;
                "
            >
                <td style="padding:12px 10px; font-weight:600;">
                    #${student.id}
                </td>

                <td style="padding:12px 10px; font-weight:600;">
                    ${escapeHtml(student.firstName)}
                    ${escapeHtml(student.lastName)}
                </td>

                <td style="padding:12px 10px; color:var(--grey);">
                    ${escapeHtml(student.email)}
                </td>

                <td style="padding:12px 10px; font-weight:600;">
                    $${Number(student.balance).toFixed(2)}
                </td>

                <td style="padding:12px 10px;">
                    ${statusBadge}
                </td>

                <td style="padding:12px 10px;">
                    ${actionButton}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;

    document.querySelectorAll('.student-row').forEach(row => {
        row.addEventListener('click', async function () {
            selectedStudentId = Number(this.dataset.id);
            await renderStudentDetails(selectedStudentId);
        });
    });

    attachStudentActionListeners();

    if (selectedStudentId) {
        await renderStudentDetails(selectedStudentId);
    }
}

async function renderStudentDetails(studentId) {
    const container = document.getElementById('studentDetailContainer');

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="vendorGridMessage">
            <p>Loading student details...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/admin/students/${studentId}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Unable to load student details.'
            );
        }

        const student = result.student;
        const orders = Array.isArray(result.orders)
            ? result.orders
            : [];

        const transactions = Array.isArray(result.transactions)
            ? result.transactions
            : [];

        const combinedHistory = [];

        // Convert database-backed orders into display records.
        orders.forEach(order => {
            const itemsSummary = Array.isArray(order.items)
                ? order.items
                    .map(item =>
                        `${item.name} ×${item.quantity}`
                    )
                    .join(', ')
                : 'No items';

            combinedHistory.push({
                timestamp: parseDatabaseDate(order.orderDate),
                date: order.orderDate,
                type: 'Purchase',
                typeDisplay: '🛒 Purchase',
                amount: Number(order.total || 0),
                balanceBefore: null,
                balanceAfter: null,
                orderId: order.orderId,
                vendor: order.vendorName || 'Unknown Vendor',
                items: itemsSummary,
                subtotal: Number(order.subtotal || 0),
                tax: Number(order.tax || 0),
                status: order.currentStatus || 'Pending',
                createdByRole: 'Student',
                createdByName: 'Student (self)'
            });
        });

        // Convert SQLite transaction records into display records.
        transactions.forEach(transaction => {
            let typeDisplay = '🔧 Adjustment';

            if (transaction.transactionType === 'Deduction') {
                typeDisplay = '💳 Balance Deduction';
            } else if (
                transaction.transactionType === 'Refund'
            ) {
                typeDisplay = '↩️ Refund';
            } else if (
                transaction.transactionType === 'Adjustment' &&
                Number(transaction.amount) > 0
            ) {
                typeDisplay = '💰 Balance Adjustment';
            } else if (
                transaction.transactionType === 'Adjustment'
            ) {
                typeDisplay = '📝 Account Adjustment';
            }

            combinedHistory.push({
                timestamp: parseDatabaseDate(
                    transaction.createdAt
                ),
                date: transaction.createdAt,
                type: transaction.transactionType,
                typeDisplay: typeDisplay,
                amount: Number(transaction.amount || 0),
                balanceBefore: Number(
                    transaction.previousBalance || 0
                ),
                balanceAfter: Number(
                    transaction.postBalance || 0
                ),
                orderId: transaction.orderId,
                vendor: null,
                items: null,
                subtotal: null,
                tax: null,
                status: null,
                createdByRole: transaction.createdByRole,
                createdByName:
                    transaction.createdByRole === 'Student'
                        ? 'Student (self)'
                        : transaction.createdByName || 'System'
            });
        });

        combinedHistory.sort(
            (first, second) =>
                second.timestamp - first.timestamp
        );

        const statusText = student.isActive
            ? '🟢 Active'
            : '🔴 Inactive';

        let html = `
            <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:20px;
                margin-bottom:20px;
            ">
                <div style="
                    border:1px solid var(--lightGrey);
                    border-radius:8px;
                    padding:16px;
                    background:var(--white);
                ">
                    <h4 style="margin-bottom:8px;">
                        ${escapeHtml(student.firstName)}
                        ${escapeHtml(student.lastName)}
                    </h4>

                    <p style="
                        color:var(--grey);
                        font-size:0.9rem;
                    ">
                        Email:
                        ${escapeHtml(student.email)}
                    </p>

                    <p style="
                        color:var(--grey);
                        font-size:0.9rem;
                    ">
                        Student ID: #${student.id}
                    </p>

                    <p style="
                        font-weight:700;
                        font-size:1.2rem;
                        margin-top:8px;
                    ">
                        Balance:
                        $${Number(student.balance).toFixed(2)}
                    </p>

                    <p style="
                        color:var(--grey);
                        font-size:0.9rem;
                    ">
                        Status: ${statusText}
                    </p>

                    <p style="
                        color:var(--grey);
                        font-size:0.9rem;
                    ">
                        Total Orders: ${student.totalOrders}
                    </p>
                </div>

                <div style="
                    border:1px solid var(--lightGrey);
                    border-radius:8px;
                    padding:16px;
                    background:var(--white);
                ">
                    <h4 style="margin-bottom:8px;">
                        Add Funds
                    </h4>

                    <div style="
                        display:flex;
                        gap:10px;
                    ">
                        <input
                            type="number"
                            id="fundAmount"
                            placeholder="Amount"
                            min="0.01"
                            step="0.01"
                            style="
                                flex:1;
                                padding:8px;
                                border:1px solid var(--lightGrey);
                                border-radius:4px;
                            "
                        >

                        <button
                            id="addFundsBtn"
                            class="defaultButton"
                            style="
                                width:auto;
                                padding:8px 20px;
                            "
                        >
                            Add Funds
                        </button>
                    </div>

                    <p style="
                        color:var(--grey);
                        font-size:0.8rem;
                        margin-top:8px;
                    ">
                        Balance adjustments will be stored in
                        SQLite and recorded in the transaction log.
                    </p>
                </div>
            </div>

            <div style="
                border:1px solid var(--lightGrey);
                border-radius:8px;
                padding:16px;
                background:var(--white);
            ">
                <h4 style="margin-bottom:8px;">
                    Complete Transaction History
                </h4>
        `;

        if (combinedHistory.length === 0) {
            html += `
                <p style="color:var(--grey);">
                    No transactions or orders were found.
                </p>
            `;
        } else {
            html += `
                <div style="overflow-x:auto;">
                    <table style="
                        width:100%;
                        border-collapse:collapse;
                        text-align:left;
                        font-size:0.9rem;
                    ">
                        <thead>
                            <tr style="
                                border-bottom:2px solid var(--black);
                            ">
                                <th style="padding:8px;">
                                    Date/Time
                                </th>

                                <th style="padding:8px;">
                                    Type
                                </th>

                                <th style="padding:8px;">
                                    Details
                                </th>

                                <th style="padding:8px;">
                                    Amount
                                </th>

                                <th style="padding:8px;">
                                    Balance
                                </th>

                                <th style="padding:8px;">
                                    Order #
                                </th>

                                <th style="padding:8px;">
                                    Created By
                                </th>
                            </tr>
                        </thead>

                        <tbody>
            `;

            combinedHistory.forEach(entry => {
                let color = 'var(--brand-dark-grey)';
                let amountDisplay = '—';
                let detailsDisplay = '';

                if (entry.type === 'Purchase') {
                    color = 'var(--brand-red)';

                    amountDisplay =
                        `-$${entry.amount.toFixed(2)}`;

                    detailsDisplay = `
                        <strong>
                            ${escapeHtml(entry.vendor)}
                        </strong>
                        <br>

                        <span style="
                            font-size:0.8rem;
                            color:var(--grey);
                        ">
                            ${escapeHtml(entry.items)}
                        </span>
                        <br>

                        <span style="
                            font-size:0.8rem;
                            color:var(--grey);
                        ">
                            Subtotal:
                            $${entry.subtotal.toFixed(2)}
                            |
                            Tax:
                            $${entry.tax.toFixed(2)}
                            |
                            Status:
                            ${escapeHtml(entry.status)}
                        </span>
                    `;
                } else if (entry.type === 'Deduction') {
                    color = 'var(--brand-red)';

                    amountDisplay =
                        `-$${entry.amount.toFixed(2)}`;

                    detailsDisplay =
                        'Meal-plan balance deducted';
                } else if (entry.type === 'Refund') {
                    color = 'var(--brand-green)';

                    amountDisplay =
                        `+$${entry.amount.toFixed(2)}`;

                    detailsDisplay =
                        'Order payment refunded';
                } else if (
                    entry.type === 'Adjustment' &&
                    entry.amount > 0
                ) {
                    color = 'var(--brand-green)';

                    amountDisplay =
                        `+$${entry.amount.toFixed(2)}`;

                    detailsDisplay =
                        'Meal-plan balance adjusted';
                } else {
                    color = 'var(--brand-blue)';
                    amountDisplay = '—';
                    detailsDisplay =
                        'Student account adjustment';
                }

                const balanceDisplay =
                    entry.balanceBefore !== null &&
                        entry.balanceAfter !== null
                        ? (
                            `$${entry.balanceBefore.toFixed(2)}` +
                            ` → ` +
                            `$${entry.balanceAfter.toFixed(2)}`
                        )
                        : '—';

                html += `
                    <tr style="
                        border-bottom:1px solid var(--lightGrey);
                    ">
                        <td style="
                            padding:8px;
                            font-size:0.8rem;
                            white-space:nowrap;
                        ">
                            ${formatDatabaseDate(entry.date)}
                        </td>

                        <td style="
                            padding:8px;
                            font-weight:600;
                            color:${color};
                            white-space:nowrap;
                        ">
                            ${entry.typeDisplay}
                        </td>

                        <td style="
                            padding:8px;
                            max-width:300px;
                        ">
                            ${detailsDisplay}
                        </td>

                        <td style="
                            padding:8px;
                            font-weight:600;
                            color:${color};
                            white-space:nowrap;
                        ">
                            ${amountDisplay}
                        </td>

                        <td style="
                            padding:8px;
                            font-size:0.85rem;
                            white-space:nowrap;
                        ">
                            ${balanceDisplay}
                        </td>

                        <td style="
                            padding:8px;
                            font-weight:600;
                        ">
                            ${entry.orderId || '—'}
                        </td>

                        <td style="
                            padding:8px;
                            font-size:0.85rem;
                            color:var(--grey);
                        ">
                            ${escapeHtml(entry.createdByName)}
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        html += `
            </div>
        `;

        container.innerHTML = html;

        /*
         * The detail panel is now database-backed.
         * The Add Funds action will be connected to Flask next.
         */
        const addFundsBtn =
            document.getElementById('addFundsBtn');

        if (addFundsBtn) {
            addFundsBtn.addEventListener(
                'click',
                async function () {
                    const amountInput = document.getElementById('fundAmount');
                    const amount = Number.parseFloat(amountInput.value);

                    if (Number.isNaN(amount) || amount <= 0) {
                        alert(
                            'Please enter a valid positive amount.'
                        );
                        return;
                    }

                    this.disabled = true;
                    this.textContent = 'Adding...';

                    try {
                        const response = await fetch(
                            `/api/admin/students/${studentId}/funds`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    amount: amount
                                })
                            }
                        );

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                result.error ||
                                'Unable to add funds.'
                            );
                        }

                        alert(
                            `✅ Added $${Number(
                                result.student.amountAdded
                            ).toFixed(2)} to ` +
                            `${result.student.firstName}'s balance.\n` +
                            `New balance: $${Number(
                                result.student.newBalance
                            ).toFixed(2)}`
                        );

                        await renderStudentDirectory();
                        await renderStudentDetails(studentId);

                    } catch (error) {
                        console.error(
                            'Unable to add student funds:',
                            error
                        );

                        alert(error.message);

                        this.disabled = false;
                        this.textContent = 'Add Funds';
                    }
                }
            );
        }
    } catch (error) {
        console.error(
            'Unable to load student details:',
            error
        );

        container.innerHTML = `
            <div class="vendorGridMessage vendorGridError">
                <p>Unable to load student details.</p>
                <p>Please try again or refresh the page.</p>
            </div>
        `;
    }
}

function parseDatabaseDate(dateValue) {
    if (!dateValue) {
        return 0;
    }

    const parsedDate = new Date(String(dateValue).replace(' ', 'T') + 'Z');

    return Number.isNaN(parsedDate.getTime())
        ? 0
        : parsedDate.getTime();
}

function formatDatabaseDate(dateValue) {
    if (!dateValue) {
        return 'Date unavailable';
    }

    const parsedDate = new Date(String(dateValue).replace(' ', 'T') + 'Z');

    if (Number.isNaN(parsedDate.getTime())) {
        return escapeHtml(dateValue);
    }

    return parsedDate.toLocaleString();
}

function attachStudentActionListeners() {

    // ========================================
    // DEACTIVATE STUDENT
    // ========================================
    document.querySelectorAll('.suspendStudentBtn').forEach(button => {
        button.addEventListener('click', async function (event) {
            event.stopPropagation();

            const studentId = Number(this.dataset.id);
            const studentName = this.dataset.name;

            const confirmed = confirm(
                `Are you sure you want to deactivate "${studentName}"?\n\n` +
                'This student will no longer be able to place orders.'
            );

            if (!confirmed) {
                return;
            }

            await submitStudentStatusChange(
                studentId,
                studentName,
                'Inactive'
            );
        });
    });

    // ========================================
    // ACTIVATE STUDENT
    // ========================================
    document.querySelectorAll('.activateStudentBtn').forEach(button => {
        button.addEventListener('click', async function (event) {
            event.stopPropagation();

            const studentId = Number(this.dataset.id);
            const studentName = this.dataset.name;

            const confirmed = confirm(
                `Are you sure you want to activate "${studentName}"?\n\n` +
                'This student will be able to place orders again.'
            );

            if (!confirmed) {
                return;
            }

            await submitStudentStatusChange(
                studentId,
                studentName,
                'Active'
            );
        });
    });
}

async function submitStudentStatusChange(
    studentId,
    studentName,
    accountStatus
) {
    const actionButtons = document.querySelectorAll(
        `[data-id="${studentId}"] button`
    );

    actionButtons.forEach(button => {
        button.disabled = true;
    });

    try {
        const response = await fetch(
            `/api/admin/students/${studentId}/status`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accountStatus: accountStatus
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Unable to update the student account status.'
            );
        }

        alert(
            accountStatus === 'Active'
                ? `✅ "${studentName}" has been activated.`
                : `✅ "${studentName}" has been deactivated.`
        );

        await renderStudentDirectory();

        if (selectedStudentId === studentId) {
            await renderStudentDetails(studentId);
        }

    } catch (error) {
        console.error(
            'Unable to update student status:',
            error
        );

        alert(error.message);

        actionButtons.forEach(button => {
            button.disabled = false;
        });
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