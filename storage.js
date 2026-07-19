// GLOBAL CONSTS - Keys used to identify saved data in localStorage (user's browser)
const CART_STORAGE_KEY = 'campusFoodLinkCart';
const ORDER_STORAGE_KEY = 'campusFoodLinkLatestOrder';
const VENDOR_STORAGE_KEY = 'campusFoodLinkSelectedVendor';


// Retrieve saved cart from localStorage
// Returns an empty array when no cart exists or saved data is invalid
function getCart() {
    // localStorage & getItem are built-in browser APIs to access stored data
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