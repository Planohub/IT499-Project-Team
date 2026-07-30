/**
 * CampusFoodLink+ — Admin Student Management Logic (admin-students.js)
 * Enables Dining Services administrators to manage student accounts.
 */

let selectedStudentId = null;

document.addEventListener('DOMContentLoaded', function () {
    renderStudentDirectory();

    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const firstName = document.getElementById('studentFirstName').value.trim();
            const lastName = document.getElementById('studentLastName').value.trim();
            const email = document.getElementById('studentEmail').value.trim();

            if (!firstName || !lastName || !email) {
                alert('Please fill in all fields.');
                return;
            }

            const success = addStudent({
                firstName: firstName,
                lastName: lastName,
                email: email
            });

            if (success) {
                addStudentForm.reset();
                alert(`✅ Student "${firstName} ${lastName}" created successfully!`);
                renderStudentDirectory();
            } else {
                alert('❌ Failed to create student. Please try again.');
            }
        });
    }
});

function renderStudentDirectory() {
    const container = document.getElementById('studentDirectoryContainer');
    if (!container) return;

    const students = getStudents();

    if (students.length === 0) {
        container.innerHTML = '<p style="color: var(--grey);">No students registered in the system.</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 2px solid var(--black);">
                    <th style="padding: 10px;">ID</th>
                    <th style="padding: 10px;">Name</th>
                    <th style="padding: 10px;">Email</th>
                    <th style="padding: 10px;">Balance</th>
                    <th style="padding: 10px;">Status</th>
                    <th style="padding: 10px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    students.forEach(s => {
        const balance = getStudentBalance(s.userID);
        const isActive = s.accountStatus !== 'Suspended';
        const statusBadge = isActive
            ? '<span class="userBadge" style="background: #e6fffa; color: #007a5a; border-color: #007a5a;">🟢 Active</span>'
            : '<span class="userBadge" style="background: #ffe6e6; color: #cc0000; border-color: #cc0000;">🔴 Suspended</span>';

        const actionButton = isActive
            ? `<button class="secondaryButton suspendStudentBtn" data-id="${s.userID}" data-name="${s.firstName} ${s.lastName}" style="padding: 4px 12px; color: #cc0000; border-color: #cc0000; font-size: 0.85rem;">Suspend</button>`
            : `<button class="secondaryButton activateStudentBtn" data-id="${s.userID}" data-name="${s.firstName} ${s.lastName}" style="padding: 4px 12px; font-size: 0.85rem;">Activate</button>`;

        html += `
            <tr style="border-bottom: 1px solid var(--lightGrey); cursor: pointer;" class="student-row" data-id="${s.userID}">
                <td style="padding: 12px 10px; font-weight: 600;">#${s.userID}</td>
                <td style="padding: 12px 10px; font-weight: 600;">${s.firstName} ${s.lastName}</td>
                <td style="padding: 12px 10px; color: var(--grey);">${s.email}</td>
                <td style="padding: 12px 10px; font-weight: 600;">$${balance.toFixed(2)}</td>
                <td style="padding: 12px 10px;">${statusBadge}</td>
                <td style="padding: 12px 10px;">${actionButton}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    document.querySelectorAll('.student-row').forEach(row => {
        row.addEventListener('click', function () {
            const studentId = Number(this.dataset.id);
            selectedStudentId = studentId;
            renderStudentDetails(studentId);
        });
    });

    attachStudentActionListeners();

    if (selectedStudentId) {
        renderStudentDetails(selectedStudentId);
    }
}

function renderStudentDetails(studentId) {
    const container = document.getElementById('studentDetailContainer');
    if (!container) return;

    const students = getStudents();
    const student = students.find(s => Number(s.userID) === Number(studentId));

    if (!student) {
        container.innerHTML = '<p style="color: var(--grey);">Student not found.</p>';
        return;
    }

    const balance = getStudentBalance(studentId);
    const isActive = student.accountStatus !== 'Suspended';

    // Build complete transaction history
    const orders = getOrdersHistory();
    const studentOrders = orders.filter(o => Number(o.studentId) === Number(studentId));

    const transactionLog = JSON.parse(localStorage.getItem('campusFoodLinkTransactionLog')) || [];
    const studentAdminLogs = transactionLog.filter(t => Number(t.userID) === Number(studentId));

    let combinedHistory = [];

    studentOrders.forEach(order => {
        const orderDate = order.orderDate || new Date(order.timestamp).toISOString();
        const itemsSummary = order.items ? order.items.map(i => `${i.name} ×${i.quantity}`).join(', ') : 'No items';

        combinedHistory.push({
            timestamp: order.timestamp || new Date(orderDate).getTime(),
            date: orderDate,
            type: 'Purchase',
            typeDisplay: '🛒 Purchase',
            amount: order.total || 0,
            balanceBefore: null,
            balanceAfter: null,
            orderId: order.orderId,
            vendor: order.vendorName || 'Unknown Vendor',
            items: itemsSummary,
            subtotal: order.subtotal || 0,
            tax: order.tax || 0,
            total: order.total || 0,
            status: order.currentStatus || 'Pending',
            createdBy: 'Student',
            createdByName: 'Student (self)',
            notes: `Order #${order.orderId} from ${order.vendorName || 'Unknown Vendor'}`
        });
    });

    studentAdminLogs.forEach(log => {
        let typeDisplay = '🔧 Admin Action';
        let notes = log.notes || '';

        let adminName = 'System';
        if (log.createdBy) {
            const adminUser = getAdminById(log.createdBy);
            if (adminUser) {
                adminName = `${adminUser.firstName} ${adminUser.lastName}`;
            } else {
                adminName = `Admin ID: ${log.createdBy}`;
            }
        }

        if (log.transactionType === 'Adjustment' && log.amount > 0) {
            typeDisplay = '💰 Fund Added';
        } else if (log.transactionType === 'Adjustment' && log.amount === 0 && notes.toLowerCase().includes('suspend')) {
            typeDisplay = '🔴 Suspended';
        } else if (log.transactionType === 'Adjustment' && log.amount === 0 && notes.toLowerCase().includes('activ')) {
            typeDisplay = '🟢 Activated';
        } else if (log.transactionType === 'Adjustment' && log.amount === 0 && notes.toLowerCase().includes('created')) {
            typeDisplay = '📝 Account Created';
        }

        combinedHistory.push({
            timestamp: new Date(log.createdAt).getTime(),
            date: log.createdAt,
            type: log.transactionType || 'Adjustment',
            typeDisplay: typeDisplay,
            amount: log.amount || 0,
            balanceBefore: log.previousBalance || null,
            balanceAfter: log.postBalance || null,
            orderId: log.orderID || null,
            vendor: null,
            items: null,
            subtotal: null,
            tax: null,
            total: log.amount || 0,
            status: null,
            createdBy: log.createdBy ? 'Admin' : 'System',
            createdByName: adminName,
            notes: notes
        });
    });

    combinedHistory.sort((a, b) => b.timestamp - a.timestamp);

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="border: 1px solid var(--lightGrey); border-radius: 8px; padding: 16px; background: var(--white);">
                <h4 style="margin-bottom: 8px;">${student.firstName} ${student.lastName}</h4>
                <p style="color: var(--grey); font-size: 0.9rem;">Email: ${student.email}</p>
                <p style="color: var(--grey); font-size: 0.9rem;">Student ID: #${student.userID}</p>
                <p style="font-weight: 700; font-size: 1.2rem; margin-top: 8px;">Balance: $${balance.toFixed(2)}</p>
                <p style="color: var(--grey); font-size: 0.9rem;">Status: ${isActive ? '🟢 Active' : '🔴 Suspended'}</p>
                <p style="color: var(--grey); font-size: 0.9rem;">Total Orders: ${studentOrders.length}</p>
            </div>
            <div style="border: 1px solid var(--lightGrey); border-radius: 8px; padding: 16px; background: var(--white);">
                <h4 style="margin-bottom: 8px;">Add Funds</h4>
                <div style="display: flex; gap: 10px;">
                    <input type="number" id="fundAmount" placeholder="Amount" min="0.01" step="0.01" style="flex: 1; padding: 8px; border: 1px solid var(--lightGrey); border-radius: 4px;">
                    <button id="addFundsBtn" class="defaultButton" style="width: auto; padding: 8px 20px;">Add Funds</button>
                </div>
                <p style="color: var(--grey); font-size: 0.8rem; margin-top: 8px;">This will add funds to the student's meal-plan balance and log the admin action.</p>
            </div>
        </div>
        <div style="border: 1px solid var(--lightGrey); border-radius: 8px; padding: 16px; background: var(--white);">
            <h4 style="margin-bottom: 8px;">Complete Transaction History</h4>
            ${combinedHistory.length === 0 ? '<p style="color: var(--grey);">No transactions found.</p>' : `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--black);">
                                <th style="padding: 8px;">Date/Time</th>
                                <th style="padding: 8px;">Type</th>
                                <th style="padding: 8px;">Details</th>
                                <th style="padding: 8px;">Amount</th>
                                <th style="padding: 8px;">Balance</th>
                                <th style="padding: 8px;">Order #</th>
                                <th style="padding: 8px;">Admin</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${combinedHistory.map(t => {
                                let color = '#333';
                                let amountDisplay = '';
                                let detailsDisplay = '';

                                if (t.type === 'Purchase') {
                                    color = '#cc0000';
                                    amountDisplay = `-$${t.amount.toFixed(2)}`;
                                    detailsDisplay = `
                                        <strong>${t.vendor || 'Unknown'}</strong><br>
                                        <span style="font-size: 0.8rem; color: var(--grey);">${t.items || 'No items'}</span><br>
                                        <span style="font-size: 0.8rem; color: var(--grey);">Subtotal: $${(t.subtotal || 0).toFixed(2)} | Tax: $${(t.tax || 0).toFixed(2)}</span>
                                    `;
                                } else if (t.typeDisplay === '💰 Fund Added') {
                                    color = '#007a5a';
                                    amountDisplay = `+$${t.amount.toFixed(2)}`;
                                    detailsDisplay = `<span style="color: var(--grey); font-size: 0.85rem;">${t.notes || 'Funds added'}</span>`;
                                } else if (t.typeDisplay === '🔴 Suspended') {
                                    color = '#cc0000';
                                    amountDisplay = '—';
                                    detailsDisplay = `<span style="color: #cc0000; font-size: 0.85rem;">${t.notes || 'Account suspended'}</span>`;
                                } else if (t.typeDisplay === '🟢 Activated') {
                                    color = '#007a5a';
                                    amountDisplay = '—';
                                    detailsDisplay = `<span style="color: #007a5a; font-size: 0.85rem;">${t.notes || 'Account activated'}</span>`;
                                } else if (t.typeDisplay === '📝 Account Created') {
                                    color = '#0066cc';
                                    amountDisplay = '—';
                                    detailsDisplay = `<span style="color: #0066cc; font-size: 0.85rem;">${t.notes || 'Account created'}</span>`;
                                } else {
                                    amountDisplay = `$${t.amount.toFixed(2)}`;
                                    detailsDisplay = t.notes || 'Admin action';
                                }

                                const balanceDisplay = (t.balanceBefore !== null && t.balanceAfter !== null) 
                                    ? `$${t.balanceBefore.toFixed(2)} → $${t.balanceAfter.toFixed(2)}`
                                    : '—';

                                let adminDisplay = '—';
                                if (t.createdBy === 'Admin' && t.createdByName) {
                                    adminDisplay = t.createdByName;
                                } else if (t.createdBy === 'Student') {
                                    adminDisplay = 'Student (self)';
                                }

                                return `
                                    <tr style="border-bottom: 1px solid var(--lightGrey);">
                                        <td style="padding: 8px; font-size: 0.8rem; white-space: nowrap;">${new Date(t.date).toLocaleString()}</td>
                                        <td style="padding: 8px; font-weight: 600; color: ${color}; white-space: nowrap;">${t.typeDisplay}</td>
                                        <td style="padding: 8px; max-width: 300px;">${detailsDisplay}</td>
                                        <td style="padding: 8px; font-weight: 600; color: ${color}; white-space: nowrap;">${amountDisplay}</td>
                                        <td style="padding: 8px; font-size: 0.85rem;">${balanceDisplay}</td>
                                        <td style="padding: 8px; font-weight: 600;">${t.orderId || '—'}</td>
                                        <td style="padding: 8px; font-size: 0.85rem; color: var(--grey);">${adminDisplay}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;

    const addFundsBtn = document.getElementById('addFundsBtn');
    if (addFundsBtn) {
        addFundsBtn.addEventListener('click', function () {
            const amountInput = document.getElementById('fundAmount');
            const amount = parseFloat(amountInput.value);

            if (!amount || amount <= 0) {
                alert('Please enter a valid positive amount.');
                return;
            }

            const currentBalance = getStudentBalance(studentId);
            const newBalance = currentBalance + amount;

            saveStudentBalance(studentId, newBalance);

            const admin = getActiveAdminSession();
            const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'System Admin';

            const transactionLog = JSON.parse(localStorage.getItem('campusFoodLinkTransactionLog')) || [];

            transactionLog.push({
                transactionID: Date.now(),
                userID: studentId,
                orderID: null,
                transactionType: 'Adjustment',
                amount: amount,
                previousBalance: currentBalance,
                postBalance: newBalance,
                createdAt: new Date().toISOString(),
                createdBy: admin ? admin.userID : 301,
                notes: `Funds added by ${adminName}`
            });

            localStorage.setItem('campusFoodLinkTransactionLog', JSON.stringify(transactionLog));

            alert(`✅ Added $${amount.toFixed(2)} to ${student.firstName}'s balance.\nNew balance: $${newBalance.toFixed(2)}`);

            renderStudentDirectory();
            renderStudentDetails(studentId);
        });
    }
}

function attachStudentActionListeners() {
    document.querySelectorAll('.suspendStudentBtn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const studentId = Number(this.dataset.id);
            const studentName = this.dataset.name;

            if (confirm(`⚠️ Are you sure you want to suspend "${studentName}"?\n\nThis student will no longer be able to place orders.`)) {
                const admin = getActiveAdminSession();
                const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'System Admin';

                const transactionLog = JSON.parse(localStorage.getItem('campusFoodLinkTransactionLog')) || [];
                const currentBalance = getStudentBalance(studentId);

                transactionLog.push({
                    transactionID: Date.now(),
                    userID: studentId,
                    orderID: null,
                    transactionType: 'Adjustment',
                    amount: 0,
                    previousBalance: currentBalance,
                    postBalance: currentBalance,
                    createdAt: new Date().toISOString(),
                    createdBy: admin ? admin.userID : 301,
                    notes: `Account suspended by ${adminName}`
                });

                localStorage.setItem('campusFoodLinkTransactionLog', JSON.stringify(transactionLog));

                setStudentActiveState(studentId, false);
                renderStudentDirectory();
                if (selectedStudentId === studentId) {
                    renderStudentDetails(studentId);
                }
                alert(`✅ "${studentName}" has been suspended.`);
            }
        });
    });

    document.querySelectorAll('.activateStudentBtn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const studentId = Number(this.dataset.id);
            const studentName = this.dataset.name;

            if (confirm(`✅ Are you sure you want to activate "${studentName}"?\n\nThis student will be able to place orders again.`)) {
                const admin = getActiveAdminSession();
                const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'System Admin';

                const transactionLog = JSON.parse(localStorage.getItem('campusFoodLinkTransactionLog')) || [];
                const currentBalance = getStudentBalance(studentId);

                transactionLog.push({
                    transactionID: Date.now(),
                    userID: studentId,
                    orderID: null,
                    transactionType: 'Adjustment',
                    amount: 0,
                    previousBalance: currentBalance,
                    postBalance: currentBalance,
                    createdAt: new Date().toISOString(),
                    createdBy: admin ? admin.userID : 301,
                    notes: `Account activated by ${adminName}`
                });

                localStorage.setItem('campusFoodLinkTransactionLog', JSON.stringify(transactionLog));

                setStudentActiveState(studentId, true);
                renderStudentDirectory();
                if (selectedStudentId === studentId) {
                    renderStudentDetails(studentId);
                }
                alert(`✅ "${studentName}" has been activated.`);
            }
        });
    });
}

function setStudentActiveState(studentId, isActive) {
    let allUsers = JSON.parse(localStorage.getItem(STUDENTS_STORAGE_KEY)) || [];
    const index = allUsers.findIndex(u => Number(u.userID) === Number(studentId));
    if (index === -1) return false;
    allUsers[index].accountStatus = isActive ? 'Active' : 'Suspended';
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(allUsers));
    return true;
}

function addStudent(studentData) {
    let allUsers = JSON.parse(localStorage.getItem(STUDENTS_STORAGE_KEY)) || [];

    if (allUsers.some(u => u.email === studentData.email)) {
        alert('A student with this email already exists.');
        return false;
    }

    const maxId = allUsers.reduce((max, u) => Math.max(max, u.userID || 0), 0);
    const newId = maxId + 1;

    const newStudent = {
        userID: newId,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        password: 'hashed',
        role: 'Student',
        vendorID: null,
        mealPlanBalance: 0.00,
        accountStatus: 'Active'
    };

    allUsers.push(newStudent);
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(allUsers));

    saveStudentBalance(newId, 0.00);

    const admin = getActiveAdminSession();
    const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'System Admin';

    const transactionLog = JSON.parse(localStorage.getItem('campusFoodLinkTransactionLog')) || [];

    transactionLog.push({
        transactionID: Date.now(),
        userID: newId,
        orderID: null,
        transactionType: 'Adjustment',
        amount: 0.00,
        previousBalance: 0.00,
        postBalance: 0.00,
        createdAt: new Date().toISOString(),
        createdBy: admin ? admin.userID : 301,
        notes: `Account created by ${adminName}`
    });

    localStorage.setItem('campusFoodLinkTransactionLog', JSON.stringify(transactionLog));

    return true;
}