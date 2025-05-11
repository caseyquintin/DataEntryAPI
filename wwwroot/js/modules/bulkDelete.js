// bulkDelete.js
function initializeBulkDelete(table) {
    // Bulk delete button click handler
    $('#bulkDeleteBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Bulk Delete button clicked');
        
        const selectedIDs = getSelectedContainerIDs();

        if (selectedIDs.length === 0) {
            showToast('🚫 No containers selected for deletion!', 'warning');
            return;
        }

        // Clear the existing list
        $('#containerListToDelete').empty();
        
        // Build container list for the modal
        selectedIDs.forEach(id => {
            const rowIndex = table.rows().eq(0).filter(function (rowIdx) {
                return table.row(rowIdx).data().containerID === id;
            });
            
            if (rowIndex.length > 0) {
                const data = table.row(rowIndex[0]).data();
                // Simpler list item format
                const listItem = `<li class="mb-2"><strong>${data.containerNumber || 'No Number'}</strong></li>`;
                $('#containerListToDelete').append(listItem);
            }
        });
        
        // Update modal title with count
        $('#confirmBulkDeleteModalLabel').text(`⚠️ Confirm Delete (${selectedIDs.length} containers)`);
        
        // Show the confirmation modal
        const modalElement = document.getElementById('confirmBulkDeleteModal');
        const existingModal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
        if (existingModal) {
            existingModal.hide();
        }
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    });
    
    // Confirmation button click handler
    $('#confirmBulkDeleteBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Hide the modal
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmBulkDeleteModal'));
        if (confirmModal) {
            confirmModal.hide();
        }
        
        const selectedIDs = getSelectedContainerIDs();
        
        if (selectedIDs.length === 0) return;

        // Save row data and temporarily hide each row
        selectedIDs.forEach(id => {
            const row = table.row('#' + id);
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
                table.ajax.reload(null, false);
                showToast('✅ Containers deleted successfully!', 'success');
            }).catch(err => {
                console.error('❌ Bulk delete error:', err);
                showToast('❌ Some deletions failed.', 'danger');
                table.ajax.reload(null, false);
            });
        }, 10000);

        // Undo button handler
        $('body').one('click', '#undoBulkDeleteBtn', function() {
            clearTimeout(bulkDeleteTimeout);
            undoBanner.alert('close');

            selectedIDs.forEach(id => {
                const row = table.row('#' + id);
                if (row.node()) {
                    $(row.node()).css('opacity', '1');
                }
                localStorage.removeItem(`deleted-${id}`);
            });

            showToast('🔄 Deletion cancelled', 'info');
            console.log(`🕓 Undo bulk delete for: ${selectedIDs.join(', ')}`);
        });
    });
}

// Make the function globally available
window.initializeBulkDelete = initializeBulkDelete;