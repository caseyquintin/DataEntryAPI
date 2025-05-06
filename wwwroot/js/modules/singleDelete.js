// singleDelete.js
document.addEventListener('DOMContentLoaded', function () {
    // Inline Delete button
    $('#ContainerList tbody').on('click', '.delete-btn', function() {
        const containerID = $(this).data('id');
        const row = ContainerTable.row('#' + containerID);

        // Temporarily hide the row
        row.node().style.opacity = '0.5';

        // Show undo message
        const undoBanner = $(`
            <div class="alert alert-warning alert-dismissible fade show position-fixed bottom-0 end-0 m-4" style="z-index: 1055; min-width: 300px;">
                <strong>Container ${containerID} deleted.</strong> <button type="button" class="btn btn-sm btn-light ms-2 undo-delete-btn" data-id="${containerID}">Undo</button>
            </div>
        `).appendTo('body');

        // ✅ Save deleted row data to localStorage in case you want to restore later
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
})