// bulkDelete.js
document.addEventListener('DOMContentLoaded', function () {
    // Bulk delete button handler
    $('#bulkDeleteBtn').on('click', function(e) {
        // Don't prevent default if using data-bs-toggle
        e.stopPropagation();
        
        console.log('Bulk Delete button clicked');
        
        const selectedIDs = getSelectedContainerIDs();

        if (selectedIDs.length === 0) {
            showToast('🚫 No containers selected for deletion!', 'warning');
            return;
        }

        // Populate the confirmation modal with selected containers
        const table = $('#ContainerList').DataTable();
        $('#containerListToDelete').empty();
        
        selectedIDs.forEach(id => {
            const rowIndex = table.rows().eq(0).filter(function (rowIdx) {
                return table.row(rowIdx).data().containerID === id;
            });
            
            if (rowIndex.length > 0) {
                const data = table.row(rowIndex[0]).data();
                const listItem = `
                    <li class="list-group-item">
                        <strong>${data.containerNumber || 'No Number'}</strong> - 
                        ID: ${id} - 
                        Status: ${data.currentStatus || 'N/A'}
                    </li>
                `;
                $('#containerListToDelete').append(listItem);
            }
        });
        
        $('#confirmBulkDeleteModalLabel').text(`⚠️ Confirm Delete (${selectedIDs.length} containers)`);
        
        // Option 1: If using data-bs-toggle on the button
        // Do nothing - Bootstrap will handle the modal
        
        // Option 2: If NOT using data-bs-toggle on the button
        const modal = new bootstrap.Modal(document.getElementById('confirmBulkDeleteModal'));
        modal.show();
    });
    
    // Confirmation button click handler
    $('#confirmBulkDeleteBtn').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Use Bootstrap's built-in method
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmBulkDeleteModal'));
        modal.hide();
        
        const selectedIDs = getSelectedContainerIDs();
        
        if (selectedIDs.length === 0) return;

        // Save row data and temporarily hide each row
        selectedIDs.forEach(id => {
            const row = ContainerTable.row('#' + id);
            if (row.node()) {
                $(row.node()).css('opacity', '0.5');
                localStorage.setItem(`deleted-${id}`, JSON.stringify(row.data()));
            }
        });

        // Show undo banner
        const undoBanner = $(`
            <div class="alert alert-warning alert-dismissible fade show position-fixed bottom-0 end-0 m-4" style="z-index: 1055; min-width: 300px;">
                <strong>Deleted ${selectedIDs.length} container(s).</strong>
                <button type="button" class="btn btn-sm btn-light ms-2" id="undoBulkDeleteBtn">Undo</button>
            </div>
        `).appendTo('body');

        // Start timer to finalize deletion
        const bulkDeleteTimeout = setTimeout(() => {
            Promise.all(
                selectedIDs.map(id =>
                    $.ajax({
                        url: `http://localhost:5062/api/containers/${id}`,
                        method: 'DELETE'
                    })
                )
            ).then(() => {
                undoBanner.alert('close');
                selectedIDs.forEach(id => localStorage.removeItem(`deleted-${id}`));
                ContainerTable.ajax.reload(null, false);
            }).catch(err => {
                console.error('❌ Bulk delete error:', err);
                showToast('❌ Some deletions failed.', 'danger');
                ContainerTable.ajax.reload(null, false);
            });
        }, 10000);

        // Undo button handler - use once to prevent multiple bindings
        $('body').one('click', '#undoBulkDeleteBtn', function() {
            clearTimeout(bulkDeleteTimeout);
            undoBanner.alert('close');

            selectedIDs.forEach(id => {
                const row = ContainerTable.row('#' + id);
                if (row.node()) {
                    $(row.node()).css('opacity', '1');
                }
                localStorage.removeItem(`deleted-${id}`);
            });

            console.log(`🕓 Undo bulk delete for: ${selectedIDs.join(', ')}`);
        });
    });
});