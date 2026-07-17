/**
 * CampusFoodLink+ — Storage & Data Access Helper (storage.js)
 * Manages cart state, student meal-plan balances, and validation checks.
 */

const STORAGE_KEYS = {
    CART: 'campusfoodlink_cart',
    BALANCE: 'campusfoodlink_meal_plan_balance',
    ACTIVE_ORDER: 'campusfoodlink_active_order'
};

// Initial simulated meal-plan balance
const DEFAULT_INITIAL_BALANCE = 250.00;

const StorageManager = {
    /**
     * Retrieves the student's current simulated meal-plan balance.
     */
    getMealPlanBalance: function () {
        const storedBalance = localStorage.getItem(STORAGE_KEYS.BALANCE);
        if (storedBalance === null) {
            this.setMealPlanBalance(DEFAULT_INITIAL_BALANCE);
            return DEFAULT_INITIAL_BALANCE;
        }
        return parseFloat(storedBalance) || 0.00;
    },

    /**
     * Updates the student's stored meal-plan balance.
     */
    setMealPlanBalance: function (newBalance) {
        const validBalance = Math.max(0, parseFloat(newBalance) || 0.00);
        localStorage.setItem(STORAGE_KEYS.BALANCE, validBalance.toFixed(2));
        this.updateGlobalUI();
        return validBalance;
    },

    /**
     * Retrieves the current cart array from localStorage.
     */
    getCart: function () {
        try {
            const cartData = localStorage.getItem(STORAGE_KEYS.CART);
            return cartData ? JSON.parse(cartData) : [];
        } catch (error) {
            console.error('Error parsing cart data from storage:', error);
            return [];
        }
    },

    /**
     * Saves the cart array to localStorage.
     */
    saveCart: function (cartArray) {
        if (!Array.isArray(cartArray)) {
            console.error('Invalid cart payload provided.');
            return;
        }
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartArray));
        this.updateGlobalUI();
    },

    /**
     * Validates menu item data prior to adding to cart.
     */
    validateMenuItem: function (item) {
        if (!item || typeof item !== 'object') {
            return { isValid: false, message: 'Invalid item payload object.' };
        }
        if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
            return { isValid: false, message: 'Missing or invalid menu item name.' };
        }
        const numericPrice = parseFloat(item.price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return { isValid: false, message: 'Price must be a positive number.' };
        }
        return { isValid: true, sanitizedItem: { name: item.name.trim(), price: numericPrice } };
    },

    /**
     * Adds an item to the cart or increments its quantity.
     */
    addToCart: function (rawItem, quantityToAdd = 1) {
        const validation = this.validateMenuItem(rawItem);
        if (!validation.isValid) {
            console.warn(`[Validation Guard] ${validation.message}`);
            alert(`Unable to add item: ${validation.message}`);
            return false;
        }

        const sanitized = validation.sanitizedItem;
        let cart = this.getCart();

        // Check if item already exists in cart
        const existingIndex = cart.findIndex(i => i.name === sanitized.name);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantityToAdd;
        } else {
            cart.push({
                name: sanitized.name,
                price: sanitized.price,
                quantity: quantityToAdd
            });
        }

        this.saveCart(cart);
        return true;
    },

    /**
     * Updates item quantity or removes item if quantity reaches 0.
     */
    updateQuantity: function (itemName, newQuantity) {
        let cart = this.getCart();
        const targetIndex = cart.findIndex(i => i.name === itemName);

        if (targetIndex > -1) {
            if (newQuantity <= 0) {
                cart.splice(targetIndex, 1);
            } else {
                cart[targetIndex].quantity = newQuantity;
            }
            this.saveCart(cart);
        }
    },

    /**
     * Clears cart items.
     */
    clearCart: function () {
        localStorage.removeItem(STORAGE_KEYS.CART);
        this.updateGlobalUI();
    },

    /**
     * Calculates total item count in cart.
     */
    getCartCount: function () {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.quantity || 0), 0);
    },

    /**
     * Calculates total cost of cart items.
     */
    getCartTotal: function () {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    /**
     * Saves an active order payload to pass to confirmation page.
     */
    saveActiveOrder: function (orderPayload) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ORDER, JSON.stringify(orderPayload));
    },

    /**
     * Retrieves the last submitted active order.
     */
    getActiveOrder: function () {
        try {
            const orderData = localStorage.getItem(STORAGE_KEYS.ACTIVE_ORDER);
            return orderData ? JSON.parse(orderData) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Synchronizes dynamic Cart count badges and Footer Meal-Plan Balance badges across pages.
     */
    updateGlobalUI: function () {
        // Update navigation Cart badge link
        const cartNavLinks = document.querySelectorAll('.navigationLinks a[href="checkout.html"], .navigationLinks a.active');
        const count = this.getCartCount();

        cartNavLinks.forEach(link => {
            if (link.getAttribute('href') === 'checkout.html' || link.textContent.includes('Cart')) {
                link.textContent = `Cart (${count})`;
            }
        });

        // Update footer Meal-Plan Balance badge
        const balanceBadges = document.querySelectorAll('.balanceBadge');
        const currentBalance = this.getMealPlanBalance();

        balanceBadges.forEach(badge => {
            badge.innerHTML = `Meal-Plan Balance:&nbsp;$${currentBalance.toFixed(2)}`;
        });
    }
};

// Auto-initialize UI badges when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    StorageManager.updateGlobalUI();
});