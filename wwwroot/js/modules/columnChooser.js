// columnChooser.js
document.addEventListener('DOMContentLoaded', function () {
    // Choose Columns button
    $(document).on('click', '#customColVisBtn', function () {
        console.log("🟢 customColVisBtn click triggered");
    
        if (typeof ContainerTable === 'undefined') {
            showToast("❌ DataTable not ready yet", "danger");
            return;
        }
    
        const form = $('#columnVisibilityForm');
        form.empty(); // Clear previous items
    
        ContainerTable.columns().every(function(index) {
            const column = this;
            const title = column.header().textContent.trim();
            const visible = column.visible();
    
            if (index === 0 || title === '') return;
    
            form.append(`
                <div class="col-md-6 mb-2">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" data-column="${index}" id="colToggle${index}" ${visible ? 'checked' : ''}>
                        <label class="form-check-label" for="colToggle${index}">${title}</label>
                    </div>
                </div>
            `);
        });
    
        const modalEl = document.getElementById('columnModal');
        if (!modalEl) {
            showToast("❌ Column modal not found in DOM", "danger");
            return;
        }
    
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
    
        modal.show();
    });

    // Ensure modal is attached to body
    const columnModal = document.getElementById('columnModal');
    if (columnModal && columnModal.parentElement !== document.body) {
    document.body.appendChild(columnModal);
    }
    

    // Open the column chooser modal
    $(document).on('click', '#customColVisBtn', function() {
        if (typeof ContainerTable === 'undefined') {
            showToast("❌ DataTable not ready yet", "danger");
            return;
        }
        const form = $('#columnVisibilityForm');
        form.empty(); // Clear previous items

        ContainerTable.columns().every(function(index) {
            const column = this;
            const title = column.header().textContent.trim();
            const visible = column.visible();
        
            console.log(`🔍 Column ${index}: ${title} → visible: ${visible}`);
        
            if (index === 0 || title === '') return;
        
            form.append(`
                <div class="col-md-4 mb-2">
                  <div class="form-check">
                    <input class="form-check-input" type="checkbox" data-column="${index}" id="colToggle${index}" ${visible ? 'checked' : ''}>
                    <label class="form-check-label" for="colToggle${index}">${title}</label>
                  </div>
                </div>
              `);              
        });

        const modalEl = document.getElementById('columnModal');

        if (!modalEl) {
            showToast("❌ Column modal not found in DOM", "danger");
            return;
        }

        let modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) {
            modal = new bootstrap.Modal(modalEl);
        }
        modal.show();
    });
});