document.addEventListener('DOMContentLoaded', function () {
    const vendorLinks = document.querySelectorAll('.vendorBox[data-vendor-id]');

    vendorLinks.forEach(vendorLink => {
        vendorLink.addEventListener('click', function (event) {
            event.preventDefault();

            const selectedVendor = {
                vendorId: Number(vendorLink.dataset.vendorId),
                vendorName: vendorLink.dataset.vendorName
            };

            const wasSaved = saveSelectedVendor(selectedVendor);

            if(!wasSaved) {
                alert('Unable to select the vendor.');
                return;
            }

            window.location.href = vendorLink.getAttribute('href');
        });
    });
});