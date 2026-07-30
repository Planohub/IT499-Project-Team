// =========================================================================
// STORAGE.JS — Data Access Layer for CampusFoodLink+
// =========================================================================
//
// This is the ONLY file that handles data storage.
// All other JavaScript files call functions from here.
// When migrating to SQL/Python, ONLY this file needs to change.
//
// =========================================================================

// =========================================================================
// GLOBAL CONSTANTS
// =========================================================================

const CART_STORAGE_KEY = 'campusFoodLinkCart';
const ORDER_STORAGE_KEY = 'campusFoodLinkLatestOrder';
const VENDOR_STORAGE_KEY = 'campusFoodLinkSelectedVendor';
const BALANCE_STORAGE_KEY = 'campusFoodLinkMealPlanBalance';
const ALL_VENDORS_STORAGE_KEY = 'campusFoodLinkVendorsList';
const MENU_STORAGE_KEY = 'campusFoodLinkMenuItems';
const NEXT_ORDER_ID_KEY = 'campusFoodLinkNextOrderId';
const ACTIVE_VENDOR_SESSION_KEY = 'campusFoodLinkActiveVendorSession';
const STUDENTS_STORAGE_KEY = 'campusFoodLinkStudents';
const ACTIVE_STUDENT_SESSION_KEY = 'campusFoodLinkActiveStudentSession';
const ACTIVE_ADMIN_SESSION_KEY = 'campusFoodLinkActiveAdminSession';
const SEED_DATA_KEY = 'campusFoodLinkSeedDataLoaded';

// =========================================================================
// CART OPERATIONS
// =========================================================================

function getCart() {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart === null) {
        return [];
    }
    try {
        const cart = JSON.parse(savedCart);
        if (!Array.isArray(cart)) {
            console.error('Cart data in localStorage is not an array');
            return [];
        }
        return cart;
    } catch (e) {
        console.error('Unable to read cart from localStorage', e);
        return [];
    }
}

function saveCart(cart) {
    if (!Array.isArray(cart)) {
        console.error('Cart must be an array before it can be saved');
        return false;
    }
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return true;
    } catch (e) {
        console.error('Unable to save cart to localStorage', e);
        return false;
    }
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
}

function getCartCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
}

function calculateCartTotals() {
    const cart = getCart();
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    const taxRate = 0.075;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return {
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2))
    };
}

// =========================================================================
// ORDER OPERATIONS
// =========================================================================

function getOrdersHistory() {
    const savedOrders = localStorage.getItem('orders');
    if (!savedOrders) {
        return [];
    }
    try {
        const orders = JSON.parse(savedOrders);
        return Array.isArray(orders) ? orders : [];
    } catch (e) {
        console.error('Unable to read order history from localStorage', e);
        return [];
    }
}

function saveOrder(order) {
    try {
        const orders = getOrdersHistory();
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
        return true;
    } catch (e) {
        console.error('Error saving order:', e);
        return false;
    }
}

function getLatestOrder() {
    const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY);
    if (savedOrder === null) {
        return null;
    }
    try {
        return JSON.parse(savedOrder);
    } catch (e) {
        console.error('Unable to read order from localStorage', e);
        return null;
    }
}

function getOrderById(orderId) {
    const orders = getOrdersHistory();
    return orders.find(o => String(o.orderId) === String(orderId)) || null;
}

function updateOrderStatus(orderId, newStatus) {
    const orders = getOrdersHistory();
    const orderIndex = orders.findIndex(o => String(o.orderId) === String(orderId));

    if (orderIndex > -1) {
        orders[orderIndex].currentStatus = newStatus;
        if (newStatus === 'Complete') {
            orders[orderIndex].completedTime = new Date().toLocaleString();
        }
        localStorage.setItem('orders', JSON.stringify(orders));
        return true;
    }
    return false;
}

// =========================================================================
// STUDENT-SPECIFIC BALANCE OPERATIONS
// =========================================================================

function getStudentBalance(studentId) {
    const key = `campusFoodLinkBalance_${studentId}`;
    const savedBalance = localStorage.getItem(key);
    
    if (savedBalance === null) {
        const students = getStudents();
        const student = students.find(s => Number(s.userID) === Number(studentId));
        if (student) {
            return student.mealPlanBalance;
        }
        return 250.00;
    }
    
    const balance = Number(savedBalance);
    if (Number.isNaN(balance)) {
        return 250.00;
    }
    return balance;
}

function saveStudentBalance(studentId, balance) {
    if (typeof balance !== 'number' || Number.isNaN(balance)) {
        console.error('Balance must be a valid number');
        return false;
    }
    const key = `campusFoodLinkBalance_${studentId}`;
    localStorage.setItem(key, String(balance.toFixed(2)));
    return true;
}

// =========================================================================
// STUDENT BALANCE OPERATIONS (Global)
// =========================================================================

function getMealPlanBalance() {
    const activeStudent = getActiveStudentSession();
    if (activeStudent && activeStudent.userID) {
        return getStudentBalance(activeStudent.userID);
    }
    const savedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
    if (savedBalance === null) {
        return 250.00;
    }
    const balance = Number(savedBalance);
    return Number.isNaN(balance) ? 250.00 : balance;
}

function saveMealPlanBalance(balance) {
    const activeStudent = getActiveStudentSession();
    if (activeStudent && activeStudent.userID) {
        return saveStudentBalance(activeStudent.userID, balance);
    }
    localStorage.setItem(BALANCE_STORAGE_KEY, String(balance.toFixed(2)));
    return true;
}

// =========================================================================
// STUDENT OPERATIONS
// =========================================================================

function getStudents() {
    const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
    let allUsers = [];

    if (stored) {
        try {
            allUsers = JSON.parse(stored);
        } catch (e) {
            console.error('Unable to parse students from localStorage', e);
        }
    }

    if (allUsers.length === 0) {
        seedSampleData();
        const refreshed = localStorage.getItem(STUDENTS_STORAGE_KEY);
        if (refreshed) {
            try {
                allUsers = JSON.parse(refreshed);
            } catch (e) {
                console.error('Unable to parse students after seeding', e);
            }
        }
    }

    const students = allUsers.filter(user => user.role === 'Student');
    console.log(`🎓 Found ${students.length} students`);
    return students;
}

function getStudentById(studentId) {
    const students = getStudents();
    return students.find(s => Number(s.userID) === Number(studentId)) || null;
}

function setActiveStudentSession(student) {
    if (!student || typeof student !== 'object') return false;
    try {
        localStorage.setItem(ACTIVE_STUDENT_SESSION_KEY, JSON.stringify(student));
        return true;
    } catch (e) {
        console.error('Failed to set active student session', e);
        return false;
    }
}

function getActiveStudentSession() {
    const saved = localStorage.getItem(ACTIVE_STUDENT_SESSION_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing active student session', e);
        }
    }
    return { userID: 101, firstName: 'Aydan', lastName: 'Karimova', mealPlanBalance: 75.50 };
}

// =========================================================================
// ADMIN OPERATIONS
// =========================================================================

function getAdmins() {
    const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
    let allUsers = [];

    if (stored) {
        try {
            allUsers = JSON.parse(stored);
        } catch (e) {
            console.error('Unable to parse users from localStorage', e);
        }
    }

    if (allUsers.length === 0) {
        seedSampleData();
        const refreshed = localStorage.getItem(STUDENTS_STORAGE_KEY);
        if (refreshed) {
            try {
                allUsers = JSON.parse(refreshed);
            } catch (e) {
                console.error('Unable to parse users after seeding', e);
            }
        }
    }

    const admins = allUsers.filter(user => user.role === 'Dining Services Administrator');
    console.log(`👔 Found ${admins.length} administrators`);
    return admins;
}

function getAdminById(adminId) {
    const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!stored) return null;
    try {
        const allUsers = JSON.parse(stored);
        return allUsers.find(u => Number(u.userID) === Number(adminId) && u.role === 'Dining Services Administrator');
    } catch (e) {
        console.error('Error getting admin:', e);
        return null;
    }
}

function setActiveAdminSession(admin) {
    if (!admin || typeof admin !== 'object') return false;
    try {
        localStorage.setItem(ACTIVE_ADMIN_SESSION_KEY, JSON.stringify(admin));
        return true;
    } catch (e) {
        console.error('Failed to set active admin session', e);
        return false;
    }
}

function getActiveAdminSession() {
    const saved = localStorage.getItem(ACTIVE_ADMIN_SESSION_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing active admin session', e);
        }
    }
    return { userID: 301, firstName: 'Kolab', lastName: 'Heng', role: 'Dining Services Administrator' };
}

// =========================================================================
// VENDOR OPERATIONS
// =========================================================================

function getAllVendors() {
    const stored = localStorage.getItem(ALL_VENDORS_STORAGE_KEY);
    let vendors = [];

    if (stored) {
        try {
            vendors = JSON.parse(stored);
        } catch (e) {
            console.error('Unable to parse vendors from localStorage', e);
        }
    }

    if (vendors.length === 0) {
        seedSampleData();
        const refreshed = localStorage.getItem(ALL_VENDORS_STORAGE_KEY);
        if (refreshed) {
            try {
                vendors = JSON.parse(refreshed);
            } catch (e) {
                console.error('Unable to parse vendors after seeding', e);
            }
        }
    }

    return vendors;
}

function getVendorById(vendorId) {
    const vendors = getAllVendors();
    return vendors.find(v => Number(v.id) === Number(vendorId)) || null;
}

function addVendor(vendorData) {
    let vendors = getAllVendors();
    const newVendor = {
        id: Date.now(),
        name: vendorData.name,
        location: vendorData.location,
        operatingHours: vendorData.operatingHours || '08:00 - 20:00',
        isActive: true
    };
    vendors.push(newVendor);
    localStorage.setItem(ALL_VENDORS_STORAGE_KEY, JSON.stringify(vendors));
    return true;
}

function setVendorActiveState(vendorId, isActiveState) {
    let vendors = getAllVendors();
    const index = vendors.findIndex(v => Number(v.id) === Number(vendorId));

    if (index > -1) {
        vendors[index].isActive = isActiveState;
        localStorage.setItem(ALL_VENDORS_STORAGE_KEY, JSON.stringify(vendors));
        return true;
    }
    return false;
}

function reactivateVendor(vendorId) {
    return setVendorActiveState(vendorId, true);
}

// =========================================================================
// VENDOR SESSION OPERATIONS
// =========================================================================

function setActiveVendorSession(vendor) {
    if (!vendor || typeof vendor !== 'object') return false;
    try {
        localStorage.setItem(ACTIVE_VENDOR_SESSION_KEY, JSON.stringify(vendor));
        return true;
    } catch (e) {
        console.error('Failed to set active vendor session', e);
        return false;
    }
}

function getActiveVendorSession() {
    const saved = localStorage.getItem(ACTIVE_VENDOR_SESSION_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing active vendor session', e);
        }
    }
    return { id: 1, name: 'Quad Side Café', location: 'Student Union, Room 102' };
}

function getSelectedVendor() {
    const savedVendor = localStorage.getItem(VENDOR_STORAGE_KEY);
    if (savedVendor === null) {
        return null;
    }
    try {
        return JSON.parse(savedVendor);
    } catch (e) {
        console.error('Unable to read selected vendor', e);
        return null;
    }
}

function saveSelectedVendor(vendor) {
    if (!vendor || typeof vendor !== 'object') {
        console.error('A valid vendor must be provided');
        return false;
    }
    try {
        localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(vendor));
        return true;
    } catch (e) {
        console.error('Unable to save selected vendor', e);
        return false;
    }
}

// =========================================================================
// MENU ITEM OPERATIONS
// =========================================================================

function getVendorMenuItems(vendorId = 1) {
    const storedMenu = localStorage.getItem(MENU_STORAGE_KEY);
    let allItems = [];

    if (storedMenu) {
        try {
            allItems = JSON.parse(storedMenu);
        } catch (e) {
            console.error('Unable to parse menu items from storage', e);
        }
    }

    if (allItems.length === 0) {
        seedSampleData();
        const refreshed = localStorage.getItem(MENU_STORAGE_KEY);
        if (refreshed) {
            try {
                allItems = JSON.parse(refreshed);
            } catch (e) {
                console.error('Unable to parse menu items after seeding', e);
            }
        }
    }

    return allItems.filter(item => Number(item.vendorId) === Number(vendorId));
}

function saveMenuItem(menuItem) {
    const storedMenu = localStorage.getItem(MENU_STORAGE_KEY);
    let allItems = storedMenu ? JSON.parse(storedMenu) : [];

    if (menuItem.id) {
        const index = allItems.findIndex(i => i.id === menuItem.id);
        if (index > -1) {
            allItems[index] = { ...allItems[index], ...menuItem };
        }
    } else {
        const newItem = {
            id: Date.now(),
            vendorId: menuItem.vendorId || 1,
            name: menuItem.name,
            price: Number(menuItem.price),
            description: menuItem.description || '',
            isAvailable: true,
            isActive: true
        };
        allItems.push(newItem);
    }

    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(allItems));
    return true;
}

// =========================================================================
// ORDER ID OPERATIONS
// =========================================================================

function getNextOrderId() {
    const savedId = localStorage.getItem(NEXT_ORDER_ID_KEY);
    let nextOrderId = savedId ? Number(savedId) : 9004;
    localStorage.setItem(NEXT_ORDER_ID_KEY, String(nextOrderId + 1));
    return nextOrderId;
}

// =========================================================================
// SEED DATA — ONLY RUNS IF NO DATA EXISTS
// =========================================================================

function seedSampleData() {
    console.log('🌱 Checking if seed data is needed...');

    try {
        const existingStudents = localStorage.getItem(STUDENTS_STORAGE_KEY);
        if (existingStudents) {
            try {
                const parsed = JSON.parse(existingStudents);
                if (parsed.length > 0) {
                    console.log('✅ Student data already exists. Skipping seed.');
                    return;
                }
            } catch (e) {
                console.warn('⚠️ Existing student data found but corrupt. Re-seeding...');
            }
        }

        console.log('🌱 Seeding sample data...');

        // ========================================
        // 1. SEED STUDENTS (All Users)
        // ========================================
        const allUsers = [
            { userID: 101, firstName: 'Aydan', lastName: 'Karimova', email: 'aydan@student.university.edu', password: 'hashed', role: 'Student', vendorID: null, mealPlanBalance: 75.50, accountStatus: 'Active' },
            { userID: 102, firstName: 'John', lastName: 'Doe', email: 'jdoe@student.university.edu', password: 'hashed', role: 'Student', vendorID: null, mealPlanBalance: 3.20, accountStatus: 'Active' },
            { userID: 201, firstName: 'Vilmer', lastName: 'Martin', email: 'martin@vendor.cafe.com', password: 'hashed', role: 'Vendor', vendorID: 1, mealPlanBalance: 0.00, accountStatus: 'Active' },
            { userID: 202, firstName: 'Jane', lastName: 'Smith', email: 'jsmith@vendor.pizza.com', password: 'hashed', role: 'Vendor', vendorID: 2, mealPlanBalance: 0.00, accountStatus: 'Active' },
            { userID: 301, firstName: 'Kolab', lastName: 'Heng', email: 'heng@admin.dining.edu', password: 'hashed', role: 'Dining Services Administrator', vendorID: null, mealPlanBalance: 0.00, accountStatus: 'Active' }
        ];
        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(allUsers));

        // ========================================
        // 2. SEED VENDOR TABLE
        // ========================================
        const vendors = [
            { id: 1, name: 'Quad Side Café', location: 'Student Union, Room 102', operatingHours: '07:00 - 20:00', isActive: true },
            { id: 2, name: 'Brick Oven Pizza', location: 'Dining Hall North', operatingHours: '11:00 - 23:00', isActive: true },
            { id: 3, name: 'Campus Juice Bar', location: 'Recreation Center', operatingHours: '09:00 - 17:00', isActive: false }
        ];
        localStorage.setItem(ALL_VENDORS_STORAGE_KEY, JSON.stringify(vendors));

        // ========================================
        // 3. SEED MENU ITEMS
        // ========================================
        const menuItems = [
            { id: 501, vendorId: 1, name: 'Breakfast Sandwich', price: 5.50, description: 'Eggs, cheese, and bacon on brioche', isAvailable: true, isActive: true },
            { id: 502, vendorId: 1, name: 'Cold Brew Coffee', price: 4.00, description: 'House blend slow-steeped iced coffee', isAvailable: true, isActive: true },
            { id: 505, vendorId: 1, name: 'Avocado Toast', price: 7.00, description: 'Smashed avocado on sourdough', isAvailable: false, isActive: true },
            { id: 503, vendorId: 2, name: 'Pepperoni Slice', price: 3.75, description: 'Classic NY style pepperoni pizza', isAvailable: true, isActive: true },
            { id: 504, vendorId: 2, name: 'Garlic Knots (4pc)', price: 4.50, description: 'Baked dough tied with garlic butter', isAvailable: true, isActive: true },
            { id: 601, vendorId: 3, name: 'Strawberry Smoothie', price: 5.99, description: 'Fresh strawberry smoothie', isAvailable: false, isActive: false },
            { id: 602, vendorId: 3, name: 'Green Detox Juice', price: 6.49, description: 'Kale, apple, cucumber, and ginger', isAvailable: false, isActive: false },
            { id: 603, vendorId: 3, name: 'Mango Tango', price: 5.49, description: 'Mango, pineapple, and orange juice', isAvailable: false, isActive: false }
        ];
        localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuItems));

        // ========================================
        // 4. SEED ORDERS
        // ========================================
        const orders = [
            {
                orderId: 9001,
                studentId: 101,
                vendorId: 1,
                vendorName: 'Quad Side Café',
                orderDate: '2026-07-05T12:15:00Z',
                timestamp: new Date('2026-07-05T12:15:00Z').getTime(),
                items: [
                    { name: 'Breakfast Sandwich', price: 5.50, quantity: 2, total: 11.00 },
                    { name: 'Cold Brew Coffee', price: 4.00, quantity: 1, total: 4.00 }
                ],
                subtotal: 15.00,
                tax: 1.13,
                total: 16.13,
                currentStatus: 'Complete',
                completedTime: '2026-07-05T12:35:00Z'
            },
            {
                orderId: 9002,
                studentId: 101,
                vendorId: 1,
                vendorName: 'Quad Side Café',
                orderDate: '2026-07-05T19:30:00Z',
                timestamp: new Date('2026-07-05T19:30:00Z').getTime(),
                items: [
                    { name: 'Breakfast Sandwich', price: 5.50, quantity: 1, total: 5.50 },
                    { name: 'Cold Brew Coffee', price: 4.00, quantity: 1, total: 4.00 }
                ],
                subtotal: 9.50,
                tax: 0.71,
                total: 10.21,
                currentStatus: 'Preparing',
                completedTime: null
            },
            {
                orderId: 9003,
                studentId: 101,
                vendorId: 2,
                vendorName: 'Brick Oven Pizza',
                orderDate: '2026-07-05T20:10:00Z',
                timestamp: new Date('2026-07-05T20:10:00Z').getTime(),
                items: [
                    { name: 'Pepperoni Slice', price: 3.75, quantity: 1, total: 3.75 },
                    { name: 'Garlic Knots (4pc)', price: 4.50, quantity: 1, total: 4.50 }
                ],
                subtotal: 8.25,
                tax: 0.62,
                total: 8.87,
                currentStatus: 'Pending',
                completedTime: null
            }
        ];
        localStorage.setItem('orders', JSON.stringify(orders));

        // ========================================
        // 5. SEED INDIVIDUAL STUDENT BALANCES
        // ========================================
        saveStudentBalance(101, 75.50);
        saveStudentBalance(102, 3.20);

        // ========================================
        // 6. SEED ORDER ID COUNTER
        // ========================================
        if (!localStorage.getItem(NEXT_ORDER_ID_KEY)) {
            localStorage.setItem(NEXT_ORDER_ID_KEY, '9004');
        }

        // ========================================
        // 7. SEED TRANSACTION LOGS
        // ========================================
        const transactionLog = [
            {
                transactionID: 80001,
                userID: 101,
                orderID: null,
                transactionType: 'Adjustment',
                amount: 90.50,
                previousBalance: 0.00,
                postBalance: 90.50,
                createdAt: '2026-07-01T08:00:00Z',
                createdBy: 301,
                notes: 'Account created by Kolab Heng'
            },
            {
                transactionID: 80002,
                userID: 101,
                orderID: 9001,
                transactionType: 'Deduction',
                amount: 15.00,
                previousBalance: 90.50,
                postBalance: 75.50,
                createdAt: '2026-07-05T12:15:00Z',
                createdBy: null,
                notes: 'Order #9001 from Quad Side Café'
            },
            {
                transactionID: 80003,
                userID: 102,
                orderID: null,
                transactionType: 'Adjustment',
                amount: 3.20,
                previousBalance: 0.00,
                postBalance: 3.20,
                createdAt: '2026-07-01T08:00:00Z',
                createdBy: 301,
                notes: 'Account created by Kolab Heng'
            },
            {
                transactionID: 80004,
                userID: 101,
                orderID: null,
                transactionType: 'Adjustment',
                amount: 10.00,
                previousBalance: 75.50,
                postBalance: 85.50,
                createdAt: '2026-07-05T14:00:00Z',
                createdBy: 301,
                notes: 'Funds added by Kolab Heng'
            }
        ];
        localStorage.setItem('campusFoodLinkTransactionLog', JSON.stringify(transactionLog));

        console.log('✅ Sample data seeded successfully!');
        console.log(`🎓 ${allUsers.length} users loaded`);
        console.log(`🏪 ${vendors.length} vendors loaded`);
        console.log(`🍔 ${menuItems.length} menu items loaded`);
        console.log(`📦 ${orders.length} orders loaded`);
        console.log(`📋 ${transactionLog.length} transaction logs loaded`);

    } catch (error) {
        console.error('❌ Error seeding sample data:', error);
    }
}

// =========================================================================
// RESET FUNCTION (For Testing)
// =========================================================================

function resetAndReseedData() {
    console.log('🔄 Resetting all data...');

    const keysToClear = [
        'orders',
        CART_STORAGE_KEY,
        ORDER_STORAGE_KEY,
        VENDOR_STORAGE_KEY,
        BALANCE_STORAGE_KEY,
        ALL_VENDORS_STORAGE_KEY,
        MENU_STORAGE_KEY,
        ACTIVE_VENDOR_SESSION_KEY,
        ACTIVE_STUDENT_SESSION_KEY,
        ACTIVE_ADMIN_SESSION_KEY,
        STUDENTS_STORAGE_KEY,
        NEXT_ORDER_ID_KEY,
        SEED_DATA_KEY,
        'campusFoodLinkTransactionLog',
        'campusFoodLinkLatestOrder'
    ];

    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (key.startsWith('campusFoodLinkBalance_')) {
            keysToClear.push(key);
        }
    });

    keysToClear.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed: ${key}`);
    });

    seedSampleData();
    console.log('✅ Data reset and reseeded!');
}

// =========================================================================
// AUTO-SEED ON PAGE LOAD
// =========================================================================
seedSampleData();

// =========================================================================
// EXPOSE FUNCTIONS GLOBALLY
// =========================================================================

// Cart functions
window.getCart = getCart;
window.saveCart = saveCart;
window.clearCart = clearCart;
window.getCartCount = getCartCount;
window.calculateCartTotals = calculateCartTotals;

// Order functions
window.getOrdersHistory = getOrdersHistory;
window.saveOrder = saveOrder;
window.getLatestOrder = getLatestOrder;
window.getOrderById = getOrderById;
window.updateOrderStatus = updateOrderStatus;

// Balance functions
window.getMealPlanBalance = getMealPlanBalance;
window.saveMealPlanBalance = saveMealPlanBalance;
window.getStudentBalance = getStudentBalance;
window.saveStudentBalance = saveStudentBalance;

// Student functions
window.getStudents = getStudents;
window.getStudentById = getStudentById;
window.setActiveStudentSession = setActiveStudentSession;
window.getActiveStudentSession = getActiveStudentSession;

// Admin functions
window.getAdmins = getAdmins;
window.getAdminById = getAdminById;
window.setActiveAdminSession = setActiveAdminSession;
window.getActiveAdminSession = getActiveAdminSession;

// Vendor functions
window.getAllVendors = getAllVendors;
window.getVendorById = getVendorById;
window.addVendor = addVendor;
window.setVendorActiveState = setVendorActiveState;
window.reactivateVendor = reactivateVendor;

// Vendor session functions
window.setActiveVendorSession = setActiveVendorSession;
window.getActiveVendorSession = getActiveVendorSession;
window.getSelectedVendor = getSelectedVendor;
window.saveSelectedVendor = saveSelectedVendor;

// Menu functions
window.getVendorMenuItems = getVendorMenuItems;
window.saveMenuItem = saveMenuItem;

// Order ID functions
window.getNextOrderId = getNextOrderId;

// Reset function
window.resetAndReseedData = resetAndReseedData;

console.log('📁 storage.js loaded with seed data support');