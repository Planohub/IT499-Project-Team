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