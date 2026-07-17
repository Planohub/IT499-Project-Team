// GLOBAL CONSTS - Keys used to identify saved data in localStorage (user's browser)
const CART_STORAGE_KEY = 'campusFoodLinkCart';
const ORDER_STORAGE_KEY = 'campusFoodLinkLatestOrder';


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

        if(!Array.isArray(cart)) {
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