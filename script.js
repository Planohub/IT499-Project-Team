//////////////////////////////////////
//Menu buttons and interactions
/////////////////////////////////////

document.addEventListener('DOMContentLoaded', function() 
{
    // Add to Cart button
    const addButtons = document.querySelectorAll('.btn-add');
    
    addButtons.forEach(button => 
        {
        button.addEventListener('click', function() 
        {
            const itemName = this.closest('.menu-item-info').querySelector('h4').textContent;
            const itemPrice = this.closest('.menu-item-bottom').querySelector('.menu-itemPrice').textContent;
            
            // Change button to show added
            this.textContent = '✓ Added';
            this.classList.add('added');
            
            // Resets button after 1.5 seconds
            setTimeout(() => 
            {
                this.textContent = '+ Add to Cart';
                this.classList.remove('added');
            }, 500);
            
            console.log(`Added: ${itemName} (${itemPrice})`);
        });
    });
});