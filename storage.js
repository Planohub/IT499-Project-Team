// GLOBAL CONSTS - Keys used to identify saved data in localStorage (user's browser)
const CART_STORAGE_KEY = 'campusFoodLinkCart';
const ORDER_STORAGE_KEY = 'campusFoodLinkLatestOrder';
const VENDOR_STORAGE_KEY = 'campusFoodLinkSelectedVendor';
const BALANCE_STORAGE_KEY = 'campusFoodLinkMealPlanBalance';


// Retrieve saved cart from localStorage
// Returns an empty array when no cart exists or saved data is invalid
function getCart() {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart === null) {
        return [];
    }
    // If savedCart exists, attempt to parse it into an array
    try {
        const cart = JSON.parse(savedCart);

        if (!Array.isArray(cart)) {
            console.error('Cart data in localStorage is not an array');
            // return empty array
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

function saveLatestOrder(order) {
    try {
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
        return true;
    } catch (e) {
        console.error('Unable to save order to localStorage', e);
        return false;
    }
}

function saveSelectedVendor(vendor) {
    if (!vendor || typeof vendor !== 'object') {
        console.error('A valid vendor must be provided');
        return false;
    }

    try {
        localStorage.setItem(
            VENDOR_STORAGE_KEY,
            JSON.stringify(vendor)
        );
        return true;
    } catch (e) {
        console.error('Unable to save selected vendor', e);
        return false;
    }
}

function getSelectedVendor() {
    const savedVendor = localStorage.getItem(VENDOR_STORAGE_KEY);

    if(savedVendor === null) {
        return null;
    }

    try {
        return JSON.parse(savedVendor);
    } catch (e) {
        console.error('Unable to read selected vendor', e);
        return null;
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

function getMealPlanBalance() {
    const savedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);

    if (savedBalance === null) {
        return 250.00;
    }

    const balance = Number(savedBalance);

    if (Number.isNaN(balance)) {
        return 250.00;
    }

    return balance;
}

function saveMealPlanBalance(balance) {
    if (typeof balance !== 'number' || Number.isNaN(balance)) {
        console.error('Meal-plan balance must be a valid number');
        return false;
    }

    try {
        localStorage.setItem(
            BALANCE_STORAGE_KEY,
            String(balance.toFixed(2))
        );
        return true;
    } catch (e) {
        console.error('Unable to save meal-plan balance', e);
        return false;
    }
}

// Add to the bottom of storage.js

/**
 * Retrieves the full order history array from localStorage.
 * Returns an empty array if no orders exist.
 */
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

/**
 * Clears or seeds initial mock order data for testing reports.
 */
function seedMockOrdersIfEmpty() {
    const existing = getOrdersHistory();
    if (existing.length > 0) return;

    // Seed mock data if no live orders exist yet
    const now = Date.now();
    const mockOrders = [
        {
            orderId: 9001,
            studentId: 101,
            vendorId: 1,
            vendorName: 'Campus Grill',
            orderDate: new Date(now - 3600000 * 4).toLocaleString(), // 4 hrs ago
            timestamp: now - 3600000 * 4,
            items: [{ name: 'Classic Burger', price: 10.25, quantity: 2, total: 20.50 }],
            subtotal: 20.50, tax: 1.54, total: 22.04,
            currentStatus: 'Complete'
        },
        {
            orderId: 9002,
            studentId: 102,
            vendorId: 2,
            vendorName: 'Brick Oven Pizza',
            orderDate: new Date(now - 3600000 * 2).toLocaleString(), // 2 hrs ago
            timestamp: now - 3600000 * 2,
            items: [
                { name: 'Pepperoni Slice', price: 3.75, quantity: 3, total: 11.25 },
                { name: 'Garlic Knots', price: 4.50, quantity: 1, total: 4.50 }
            ],
            subtotal: 15.75, tax: 1.18, total: 16.93,
            currentStatus: 'Complete'
        },
        {
            orderId: 9003,
            studentId: 101,
            vendorId: 1,
            vendorName: 'Campus Grill',
            orderDate: new Date(now - 1800000).toLocaleString(), // 30 mins ago
            timestamp: now - 1800000,
            items: [{ name: 'Milkshake', price: 4.75, quantity: 2, total: 9.50 }],
            subtotal: 9.50, tax: 0.71, total: 10.21,
            currentStatus: 'Ready'
        }
    ];

    localStorage.setItem('orders', JSON.stringify(mockOrders));
}

// =========================================================================
// VENDOR & MENU MANAGEMENT HELPERS (Add to bottom of storage.js)
// =========================================================================

const MENU_STORAGE_KEY = 'campusFoodLinkMenuItems';

/**
 * Retrieves the vendor menu items from localStorage.
 * Initializes default menu items for Vendor ID 1 (Campus Grill) if empty.
 */
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

    // Default seed items if no stored items exist
    if (allItems.length === 0) {
        allItems = [
            { id: 501, vendorId: 1, name: 'Classic Burger', price: 10.25, description: 'Angus beef patty with lettuce & tomato', isAvailable: true, isActive: true },
            { id: 502, vendorId: 1, name: 'Chicken Wrap', price: 7.50, description: 'Grilled chicken with ranch & greens', isAvailable: true, isActive: true },
            { id: 503, vendorId: 1, name: 'Onion Rings', price: 5.50, description: 'Crispy batter-dipped onion rings', isAvailable: true, isActive: true },
            { id: 504, vendorId: 1, name: 'Milkshake', price: 4.75, description: 'Hand-spun vanilla milk shake', isAvailable: true, isActive: true }
        ];
        localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(allItems));
    }

    // Filter items belonging to the active vendor and active soft-delete state
    return allItems.filter(item => Number(item.vendorId) === Number(vendorId) && item.isActive !== false);
}

/**
 * Saves or updates a menu item in localStorage.
 */
function saveMenuItem(menuItem) {
    const storedMenu = localStorage.getItem(MENU_STORAGE_KEY);
    let allItems = storedMenu ? JSON.parse(storedMenu) : [];

    if (menuItem.id) {
        // Update existing item
        const index = allItems.findIndex(i => i.id === menuItem.id);
        if (index > -1) {
            allItems[index] = { ...allItems[index], ...menuItem };
        }
    } else {
        // Create new menu item
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

/**
 * Updates the status of an order and logs the status change in order history.
 */
function updateOrderStatus(orderId, newStatus) {
    const ordersData = localStorage.getItem('orders');
    if (!ordersData) return false;

    try {
        let orders = JSON.parse(ordersData);
        const orderIndex = orders.findIndex(o => String(o.orderId) === String(orderId));

        if (orderIndex > -1) {
            orders[orderIndex].currentStatus = newStatus;
            
            // Log timestamp if order is complete
            if (newStatus === 'Complete') {
                orders[orderIndex].completedTime = new Date().toLocaleString();
            }

            localStorage.setItem('orders', JSON.stringify(orders));
            return true;
        }
    } catch (e) {
        console.error('Failed to update order status', e);
    }
    return false;
}

// =========================================================================
// ADMIN VENDOR MANAGEMENT HELPERS (Add to bottom of storage.js)
// =========================================================================

const ALL_VENDORS_STORAGE_KEY = 'campusFoodLinkVendorsList';

/**
 * Retrieves all vendor profiles from localStorage.
 * Initializes default campus vendors if storage is empty.
 */
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

    // Default seed vendors if none exist yet
    if (vendors.length === 0) {
        vendors = [
            { id: 1, name: 'Quad Side Café', location: 'Student Union, Room 102', operatingHours: '07:00 - 20:00', isActive: true },
            { id: 2, name: 'Brick Oven Pizza', location: 'Dining Hall North', operatingHours: '11:00 - 23:00', isActive: true },
            { id: 3, name: 'East Hall Market', location: 'Dining Hall East', operatingHours: '08:00 - 21:00', isActive: true },
            { id: 4, name: 'South Campus Kitchen', location: 'Dining Hall South', operatingHours: '10:00 - 20:00', isActive: true },
            { id: 5, name: 'West Hall Deli', location: 'Dining Hall West', operatingHours: '09:00 - 19:00', isActive: true }
        ];
        localStorage.setItem(ALL_VENDORS_STORAGE_KEY, JSON.stringify(vendors));
    }

    return vendors;
}

/**
 * Adds a new vendor profile to localStorage.
 */
function addVendor(vendorData) {
    let vendors = getAllVendors();

    const newVendor = {
        id: Date.now(), // Unique Timestamp ID
        name: vendorData.name,
        location: vendorData.location,
        operatingHours: vendorData.operatingHours || '08:00 - 20:00',
        isActive: true
    };

    vendors.push(newVendor);
    localStorage.setItem(ALL_VENDORS_STORAGE_KEY, JSON.stringify(vendors));
    return true;
}

/**
 * Deactivates (soft removes) or toggles the active state of a vendor.
 * Soft delete preserves historical order and transaction integrity.
 */
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

// =========================================================================
// ACTIVE VENDOR SESSION HELPERS
// =========================================================================
const ACTIVE_VENDOR_SESSION_KEY = 'campusFoodLinkActiveVendorSession';

/**
 * Saves the logged-in vendor profile to localStorage.
 */
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

/**
 * Retrieves the logged-in vendor profile.
 * Defaults to Vendor ID 1 (Quad Side Café / Campus Grill) if none is set.
 */
function getActiveVendorSession() {
    const saved = localStorage.getItem(ACTIVE_VENDOR_SESSION_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing active vendor session', e);
        }
    }
    // Default fallback vendor if nothing is selected yet
    return { id: 1, name: 'Quad Side Café', location: 'Student Union, Room 102' };
}