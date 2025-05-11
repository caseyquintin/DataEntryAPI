// singleDelete.js
document.addEventListener('DOMContentLoaded', function () {
    // Container to store data during delete operation
    let containerToDelete = null;

    // Inline Delete button handler
    $('#ContainerList tbody').on('click', '.delete-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const containerID = $(this).data('id');
        
        // Get the container data from the table
        const table = $('#ContainerList').DataTable();
        const row = table.row($(this).closest('tr'));
        const data = row.data();
        
        // Store the container data for later
        containerToDelete = {
            id: containerID,
            row: row,
            data: data
        };

        // Display container info in the modal
        const containerInfo = `
            <strong>${data.containerNumber || 'N/A'}</strong>
        `;
        $('#singleContainerToDelete').html(containerInfo);
        
        // Show the confirmation modal with proper Bootstrap 5 initialization
        const modalElement = document.getElementById('confirmSingleDeleteModal');
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        modal.show();
    });

    // Delete confirmation button handler
    $(document).on('click', '#confirmSingleDeleteBtn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!containerToDelete) return;
        
        const containerID = containerToDelete.id;
        const row = containerToDelete.row;
        
        // Hide the modal
        const modalElement = document.getElementById('confirmSingleDeleteModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        }
        
        // Temporarily hide the row
        row.node().style.opacity = '0.5';

        // Show undo message
        const undoBanner = $(`
            <div class="alert alert-warning alert-dismissible fade show position-fixed bottom-0 end-0 m-4" style="z-index: 1055; min-width: 300px;">
                <strong>Container ${containerToDelete.data.containerNumber || containerID} deleted.</strong> 
                <button type="button" class="btn btn-sm btn-light ms-2 undo-delete-btn" data-id="${containerID}">Undo</button>
            </div>
        `).appendTo('body');

        // Save deleted row data to localStorage in case you want to restore later
        localStorage.setItem(`deleted-${containerID}`, JSON.stringify(row.data()));

        // Start delete timer
        deleteTimeouts[containerID] = setTimeout(() => {
            // Fade out row visually
            $(row.node()).fadeOut(500, function() {
                $.ajax({
                    url: `http://localhost:5062/api/containers/${containerID}`,
                    method: 'DELETE',
                    success: function() {
                        console.log(`✅ Container ${containerID} permanently deleted.`);
                        ContainerTable.ajax.reload(null, false);
                        undoBanner.alert('close');
                        localStorage.removeItem(`deleted-${containerID}`);
                    },
                    error: function(xhr, status, error) {
                        console.error(`❌ Failed to delete container ${containerID}:`, error);
                        showToast('❌ Failed to delete. Please try again.', 'danger');
                        $(row.node()).fadeIn(); // restore if error
                        undoBanner.alert('close');
                    }
                });
            });
        }, 10000);
        
        // Reset the containerToDelete
        containerToDelete = null;
    });

    // Undo Logic
    $('body').on('click', '.undo-delete-btn', function() {
        const containerID = $(this).data('id');

        clearTimeout(deleteTimeouts[containerID]);
        delete deleteTimeouts[containerID];

        const storedRow = localStorage.getItem(`deleted-${containerID}`);
        if (storedRow) {
            const rowData = JSON.parse(storedRow);
            currentEditRow = ContainerTable.row('#' + containerID);

            if (currentEditRow.node()) {
                $(currentEditRow.node()).fadeIn();
            }

            localStorage.removeItem(`deleted-${containerID}`);
            console.log(`🕓 Undo delete for container ${containerID}`);
        }

        $(this).closest('.alert').alert('close');
        $(currentEditRow.node()).css('opacity', '1');
    });
});