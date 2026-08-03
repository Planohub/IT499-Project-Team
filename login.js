document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const requestedRole = params.get('role');

    const roleConfig = {
        student: {
            title: 'Student Login',
            description: 'Select a student account to browse vendors and place orders.',
            icon: '🎓',
            sectionId: 'studentLoginSection'
        },
        vendor: {
            title: 'Vendor Login',
            description: 'Select a vendor account to manage menus and orders.',
            icon: '🏪',
            sectionId: 'vendorLoginSection'
        },
        admin: {
            title: 'Administrator Login',
            description: 'Select an administrator account to manage campus dining operations.',
            icon: '👔',
            sectionId: 'adminLoginSection'
        }
    };

    const role = roleConfig[requestedRole]
        ? requestedRole
        : 'student';

    const currentRole = roleConfig[role];

    document.getElementById('loginRoleTitle').textContent =
        currentRole.title;

    document.getElementById('loginRoleDescription').textContent =
        currentRole.description;

    document.getElementById('loginRoleIcon').textContent =
        currentRole.icon;

    document.getElementById(currentRole.sectionId).hidden = false;

    // -------------------------------------------------
    // Student accounts
    // -------------------------------------------------
    const studentSelect = document.getElementById('studentSelectDropdown');
    const studentLoginBtn = document.getElementById('studentLoginBtn');

    let students = [];

    try {
        const response = await fetch('/api/login/students');
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

        if (students.length > 0) {
            studentSelect.innerHTML = students.map(student => `
            <option value="${student.id}">
                ${student.firstName} ${student.lastName}
                — $${Number(student.balance).toFixed(2)}
            </option>
        `).join('');
        } else {
            studentSelect.innerHTML =
                '<option value="">No students available</option>';

            studentLoginBtn.disabled = true;
        }

    } catch (error) {
        console.error(
            'Unable to load student accounts:',
            error
        );

        studentSelect.innerHTML =
            '<option value="">Unable to load students</option>';

        studentLoginBtn.disabled = true;
    }

    studentLoginBtn.addEventListener('click', function () {
        const selectedId = Number(studentSelect.value);

        const selectedStudent = students.find(student =>
            Number(student.id) === selectedId
        );

        if (!selectedStudent) {
            alert('Please select a valid student.');
            return;
        }

        setActiveStudentSession(selectedStudent);
        window.location.href = 'student-dashboard.html';
    });
    // -------------------------------------------------
    // Vendor accounts
    // -------------------------------------------------
    const vendorSelect =
        document.getElementById('vendorSelectDropdown');

    const vendorLoginBtn =
        document.getElementById('vendorLoginBtn');

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

        if (vendors.length > 0) {
            vendorSelect.innerHTML = vendors.map(vendor => `
            <option value="${vendor.id}">
                ${vendor.name}${vendor.isActive ? '' : ' — Inactive'}
            </option>
        `).join('');
        } else {
            vendorSelect.innerHTML =
                '<option value="">No vendors available</option>';
        }

    } catch (error) {
        console.error('Unable to load vendor accounts:', error);

        vendorSelect.innerHTML =
            '<option value="">Unable to load vendors</option>';

        vendorLoginBtn.disabled = true;
    }

    vendorLoginBtn.addEventListener('click', function () {
        const selectedId = Number(vendorSelect.value);

        const selectedVendor = vendors.find(vendor =>
            Number(vendor.id) === selectedId
        );

        if (!selectedVendor) {
            alert('Please select a valid vendor.');
            return;
        }

        setActiveVendorSession(selectedVendor);
        window.location.href = 'vendor-dashboard.html';
    });

    // -------------------------------------------------
    // Administrator accounts
    // -------------------------------------------------
    const adminSelect = document.getElementById('adminSelectDropdown');
    const adminLoginBtn = document.getElementById('adminLoginBtn');

    let admins = [];

    try {
        const response = await fetch('/api/login/admins');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'Unable to load administrator accounts.'
            );
        }

        admins = Array.isArray(result)
            ? result
            : [];

        if (admins.length > 0) {
            adminSelect.innerHTML = admins.map(admin => `
            <option value="${admin.id}">
                ${admin.firstName} ${admin.lastName}
            </option>
        `).join('');
        } else {
            adminSelect.innerHTML =
                '<option value="">No administrators available</option>';

            adminLoginBtn.disabled = true;
        }

    } catch (error) {
        console.error(
            'Unable to load administrator accounts:',
            error
        );

        adminSelect.innerHTML =
            '<option value="">Unable to load administrators</option>';

        adminLoginBtn.disabled = true;
    }

    adminLoginBtn.addEventListener('click', function () {
        const selectedId = Number(adminSelect.value);

        const selectedAdmin = admins.find(admin =>
            Number(admin.id) === selectedId
        );

        if (!selectedAdmin) {
            alert('Please select a valid administrator.');
            return;
        }

        setActiveAdminSession(selectedAdmin);
        window.location.href = 'admin-dashboard.html';
    });
});