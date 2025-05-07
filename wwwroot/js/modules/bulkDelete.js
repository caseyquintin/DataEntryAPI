// bulkDelete.js
document.addEventListener('DOMContentLoaded', function () {
    // Instead of $('#bulkDeleteBtn').on('click', ...) which looks for an existing button,
    // we use $(document).on('click', '#bulkDeleteBtn', ...) which watches for ANY button
    // with that ID, even if it's created later!
    
    $(document).on('click', '#bulkDeleteBtn', function(e) {
        e.stopPropagation();
        
        console.log('Bulk Delete button clicked'); // This helps us debug
        
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
                const containerInfo = `
                    <li class="list-group-item">
                        <strong>${data.containerNumber || 'No Number'}</strong>
                    </li>
                `;
                $('#containerListToDelete').append(containerInfo);
            }
        });
        
        $('#confirmBulkDeleteModalLabel').text(`⚠️ Confirm Delete (${selectedIDs.length} containers)`);
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('confirmBulkDeleteModal'));
        modal.show();
    });
    
    // Same pattern for the confirm button - use document delegation
    $(document).on('click', '#confirmBulkDeleteBtn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Hide the modal
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

        // Undo button handler
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