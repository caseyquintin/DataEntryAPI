// FRONTEND - columnChooser.js
// Complete solution for column visibility control

$(document).ready(function() {
    // Check if we already have the modal in the DOM
    if ($('#columnChooserModal').length === 0) {
        // Create the modal if it doesn't exist
        createColumnChooserModal();
    }

    // Bind the button click event using the correct ID from scripts.js
    $(document).on('click', '#customColVisBtn', function() {
        console.log('Column chooser button clicked');
        populateColumnCheckboxes();
        $('#columnChooserModal').modal('show');
    });

    // Handle the apply button click
    $(document).on('click', '#columnChooserApplyBtn', function() {
        console.log('Apply button clicked');
        applyColumnVisibility();
    });

    function createColumnChooserModal() {
        // Create a Bootstrap modal for column selection
        const modalHtml = `
            <div class="modal fade" id="columnChooserModal" tabindex="-1" aria-labelledby="columnChooserModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="columnChooserModalLabel">Choose Columns</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="columnCheckboxContainer">
                                <!-- Checkboxes will be dynamically populated here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="columnChooserApplyBtn">Apply</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the modal to the document body
        $('body').append(modalHtml);
    }

    function populateColumnCheckboxes() {
        // Get the DataTable instance
        var table = $('#ContainerList').DataTable();
        
        if (!table) {
            console.error('DataTable not found!');
            return;
        }
        
        // Clear existing checkboxes
        $('#columnCheckboxContainer').empty();
        
        // Add a checkbox for each column
        table.columns().every(function(index) {
            // Skip the first two columns (checkbox and actions)
            if (index < 2) return;
            
            var column = this;
            var columnTitle = $(column.header()).text().trim();
            var isVisible = column.visible();
            
            // Create checkbox HTML
            var checkboxHtml = `
                <div class="form-check">
                    <input class="form-check-input column-toggle-checkbox" type="checkbox" 
                           id="column${index}" data-column-index="${index}" ${isVisible ? 'checked' : ''}>
                    <label class="form-check-label" for="column${index}">
                        ${columnTitle || `Column ${index}`}
                    </label>
                </div>
            `;
            
            // Add to container
            $('#columnCheckboxContainer').append(checkboxHtml);
        });
    }

    function applyColumnVisibility() {
        // Get table reference
        var table = $('#ContainerList').DataTable();
        
        if (!table) {
            console.error('DataTable not found!');
            return;
        }
        
        // Add debug logging
        console.log('Applying column visibility changes...');
        
        // Process each checkbox
        $('.column-toggle-checkbox').each(function() {
            var columnIndex = $(this).data('column-index');
            var isVisible = $(this).prop('checked');
            
            console.log(`Setting column ${columnIndex} to ${isVisible ? 'visible' : 'hidden'}`);
            
            // Apply visibility setting to the DataTable
            table.column(parseInt(columnIndex)).visible(isVisible, false);
        });
        
        // Adjust and redraw - this is critical!
        preserveScrollPosition(() => {
            table.columns.adjust().draw(false);
        });
        
        // Save state to localStorage
        saveColumnState(table);
        
        // Hide the modal
        $('#columnChooserModal').modal('hide');
        
        // Show success message
        showToast('Column visibility updated', 'success');
    }

    function saveColumnState(table) {
        var state = [];
        
        table.columns().every(function(index) {
            state.push({
                index: index,
                visible: this.visible()
            });
        });
        
        localStorage.setItem('ContainerListColumnState', JSON.stringify(state));
    }
});