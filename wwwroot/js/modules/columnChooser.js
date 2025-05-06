// FRONTEND - columnChooser.js
// Fix for Apply button not working

// Make sure we're using document.ready to ensure DOM is loaded
$(document).ready(function() {
    // Initialize the column chooser functionality
    initColumnChooser();
    
    function initColumnChooser() {
        // This selector should match your "Apply" button in the column chooser modal
        // Check if this selector matches your actual button
        $('#columnChooserApplyBtn').off('click').on('click', function(e) {
            // Prevent default button behavior if it's a submit button
            e.preventDefault();
            
            console.log('Apply button clicked'); // Debug log
            
            // Get reference to the DataTable - make sure this matches your table ID!
            var table = $('#containersTable').DataTable();
            
            if (!table) {
                console.error('DataTable not found!');
                return;
            }
            
            // Get all checkboxes in the column chooser modal
            // Adjust the selector to match your actual checkboxes
            var checkboxes = $('.column-toggle-checkbox');
            
            console.log('Found checkboxes:', checkboxes.length); // Debug log
            
            // Process each checkbox
            checkboxes.each(function() {
                // Get column index from data attribute or value
                var columnIndex = $(this).data('column-index') || $(this).val();
                
                // Check if column should be visible
                var isVisible = $(this).prop('checked');
                
                console.log('Setting column', columnIndex, 'to', isVisible ? 'visible' : 'hidden'); // Debug
                
                // Set column visibility - make sure columnIndex is a number
                table.column(parseInt(columnIndex)).visible(isVisible);
            });
            
            // Adjust column widths and redraw table
            table.columns.adjust().draw();
            
            // Store column visibility state in localStorage for persistence
            saveColumnVisibilityState(table);
            
            // Close the modal (if using Bootstrap)
            $('#columnChooserModal').modal('hide');
            
            console.log('Column visibility updated'); // Debug log
        });
    }
    
    function saveColumnVisibilityState(table) {
        // Create array to store visibility state
        var visibilityState = [];
        
        // Loop through all columns and store their visibility state
        table.columns().every(function(index) {
            visibilityState.push({
                index: index,
                visible: this.visible()
            });
        });
        
        // Save to localStorage
        localStorage.setItem('containersTableColumnState', JSON.stringify(visibilityState));
    }
});