// =========================================================================
// STORAGE.JS — Client-Side Session and Cart State
// =========================================================================
//
// Persistent application data is stored in SQLite through Flask APIs.
//
// localStorage is retained only for temporary browser-side state:
// - Shopping cart
// - Selected vendor
// - Simulated student, vendor, and administrator sessions
//
// =========================================================================

// =========================================================================
// STORAGE KEYS
// =========================================================================

const CART_STORAGE_KEY = 'campusFoodLinkCart';
const SELECTED_VENDOR_STORAGE_KEY = 'campusFoodLinkSelectedVendor';
const ACTIVE_STUDENT_SESSION_KEY = 'campusFoodLinkActiveStudentSession';
const ACTIVE_VENDOR_SESSION_KEY = 'campusFoodLinkActiveVendorSession';
const ACTIVE_ADMIN_SESSION_KEY = 'campusFoodLinkActiveAdminSession';

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
            console.error(
                'Cart data in localStorage is not an array.'
            );

            return [];
        }

        return cart;

    } catch (error) {
        console.error(
            'Unable to read the cart from localStorage:',
            error
        );

        return [];
    }
}

function saveCart(cart) {
    if (!Array.isArray(cart)) {
        console.error(
            'Cart must be an array before it can be saved.'
        );

        return false;
    }

    try {
        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cart)
        );

        return true;

    } catch (error) {
        console.error(
            'Unable to save the cart to localStorage:',
            error
        );

        return false;
    }
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
}

function getCartCount() {
    const cart = getCart();

    return cart.reduce((total, item) => {
        const quantity = Number(item.quantity);

        return total + (
            Number.isFinite(quantity)
                ? quantity
                : 0
        );
    }, 0);
}

function calculateCartTotals() {
    const cart = getCart();

    const subtotal = cart.reduce((total, item) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);

        if (
            !Number.isFinite(price) ||
            !Number.isFinite(quantity)
        ) {
            return total;
        }

        return total + price * quantity;
    }, 0);

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
// SELECTED VENDOR STATE
// =========================================================================

function getSelectedVendor() {
    const savedVendor = localStorage.getItem(
        SELECTED_VENDOR_STORAGE_KEY
    );

    if (savedVendor === null) {
        return null;
    }

    try {
        return JSON.parse(savedVendor);

    } catch (error) {
        console.error(
            'Unable to read the selected vendor:',
            error
        );

        return null;
    }
}

function saveSelectedVendor(vendor) {
    if (!vendor || typeof vendor !== 'object') {
        console.error(
            'A valid vendor object must be provided.'
        );

        return false;
    }

    try {
        localStorage.setItem(
            SELECTED_VENDOR_STORAGE_KEY,
            JSON.stringify(vendor)
        );

        return true;

    } catch (error) {
        console.error(
            'Unable to save the selected vendor:',
            error
        );

        return false;
    }
}

function clearSelectedVendor() {
    localStorage.removeItem(
        SELECTED_VENDOR_STORAGE_KEY
    );
}

// =========================================================================
// STUDENT SESSION
// =========================================================================

function setActiveStudentSession(student) {
    if (!student || typeof student !== 'object') {
        return false;
    }

    try {
        localStorage.setItem(
            ACTIVE_STUDENT_SESSION_KEY,
            JSON.stringify(student)
        );

        return true;

    } catch (error) {
        console.error(
            'Unable to save the active student session:',
            error
        );

        return false;
    }
}

function getActiveStudentSession() {
    return getStoredSession(
        ACTIVE_STUDENT_SESSION_KEY,
        'student'
    );
}

function clearActiveStudentSession() {
    localStorage.removeItem(
        ACTIVE_STUDENT_SESSION_KEY
    );
}

// =========================================================================
// VENDOR SESSION
// =========================================================================

function setActiveVendorSession(vendor) {
    if (!vendor || typeof vendor !== 'object') {
        return false;
    }

    try {
        localStorage.setItem(
            ACTIVE_VENDOR_SESSION_KEY,
            JSON.stringify(vendor)
        );

        return true;

    } catch (error) {
        console.error(
            'Unable to save the active vendor session:',
            error
        );

        return false;
    }
}

function getActiveVendorSession() {
    return getStoredSession(
        ACTIVE_VENDOR_SESSION_KEY,
        'vendor'
    );
}

function clearActiveVendorSession() {
    localStorage.removeItem(
        ACTIVE_VENDOR_SESSION_KEY
    );
}

// =========================================================================
// ADMINISTRATOR SESSION
// =========================================================================

function setActiveAdminSession(admin) {
    if (!admin || typeof admin !== 'object') {
        return false;
    }

    try {
        localStorage.setItem(
            ACTIVE_ADMIN_SESSION_KEY,
            JSON.stringify(admin)
        );

        return true;

    } catch (error) {
        console.error(
            'Unable to save the active administrator session:',
            error
        );

        return false;
    }
}

function getActiveAdminSession() {
    return getStoredSession(
        ACTIVE_ADMIN_SESSION_KEY,
        'administrator'
    );
}

function clearActiveAdminSession() {
    localStorage.removeItem(
        ACTIVE_ADMIN_SESSION_KEY
    );
}

// =========================================================================
// SHARED SESSION HELPER
// =========================================================================

function getStoredSession(storageKey, sessionType) {
    const savedSession = localStorage.getItem(storageKey);

    if (!savedSession) {
        return null;
    }

    try {
        const session = JSON.parse(savedSession);

        if (!session || typeof session !== 'object') {
            return null;
        }

        return session;

    } catch (error) {
        console.error(
            `Unable to read the active ${sessionType} session:`,
            error
        );

        return null;
    }
}

// =========================================================================
// SESSION CLEANUP
// =========================================================================

function clearAllActiveSessions() {
    clearActiveStudentSession();
    clearActiveVendorSession();
    clearActiveAdminSession();
    clearSelectedVendor();
}

// =========================================================================
// GLOBAL EXPORTS
// =========================================================================

// Cart
window.getCart = getCart;
window.saveCart = saveCart;
window.clearCart = clearCart;
window.getCartCount = getCartCount;
window.calculateCartTotals = calculateCartTotals;

// Selected vendor
window.getSelectedVendor = getSelectedVendor;
window.saveSelectedVendor = saveSelectedVendor;
window.clearSelectedVendor = clearSelectedVendor;

// Student session
window.setActiveStudentSession = setActiveStudentSession;
window.getActiveStudentSession = getActiveStudentSession;
window.clearActiveStudentSession = clearActiveStudentSession;

// Vendor session
window.setActiveVendorSession = setActiveVendorSession;
window.getActiveVendorSession = getActiveVendorSession;
window.clearActiveVendorSession = clearActiveVendorSession;

// Administrator session
window.setActiveAdminSession = setActiveAdminSession;
window.getActiveAdminSession = getActiveAdminSession;
window.clearActiveAdminSession = clearActiveAdminSession;

// Shared cleanup
window.clearAllActiveSessions = clearAllActiveSessions;

console.log('📁 storage.js loaded for cart and simulated session state');