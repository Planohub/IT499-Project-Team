// ========================================
// SCRIPT.JS — Menu Interactions
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Add to Cart buttons
    const addButtons = document.querySelectorAll('.btn-add');
    
    addButtons.forEach(button => {
        button.addEventListener('click', function() {
            const itemName = this.closest('.menu-item-info').querySelector('h4').textContent;
            const itemPrice = this.closest('.menu-item-bottom').querySelector('.menu-item-price').textContent;
            
            // Change button to show added
            this.textContent = '✓ Added';
            this.classList.add('added');
            
            // Reset after 2 seconds
            setTimeout(() => {
                this.textContent = '+ Add to Cart';
                this.classList.remove('added');
            }, 2000);
            
            console.log(`Added: ${itemName} (${itemPrice})`);
        });
    });
});