// FRONTEND - columnChooser.js
// Optimized version with 3-column layout and performance improvements

$(document).ready(function() {
    // Listen for clicks on the column chooser button
    $(document).on('click', '#customColVisBtn', function() {
        console.log('Column chooser button clicked');
        
        // Populate checkboxes
        populateColumnCheckboxes();
        
        // Show modal
        $('#columnChooserModal').addClass('show').css('display', 'block');
        $('body').addClass('modal-open');
        
        // Add backdrop if needed
        if ($('.modal-backdrop').length === 0) {
            $('body').append('<div class="modal-backdrop fade show"></div>');
        }
    });
    
    // Handle the Apply button click with performance improvements
    $(document).on('click', '#columnChooserApplyBtn', function() {
        console.log('Apply button clicked');
        
        // First, close the modal immediately for better UX
        closeModal();
        
        // Then apply changes (wrapped in setTimeout to allow UI to update first)
        setTimeout(function() {
            applyColumnVisibility();
        }, 50);
    });
    
    // Close on cancel button
    $(document).on('click', '[data-bs-dismiss="modal"], .modal-backdrop', function() {
        closeModal();
    });
    
    // Close on escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape' && $('#columnChooserModal').hasClass('show')) {
            closeModal();
        }
    });
    
    function closeModal() {
        $('#columnChooserModal').removeClass('show').css('display', 'none');
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');
    }
    
    function populateColumnCheckboxes() {
        // Get reference to the DataTable
        var table = $('#ContainerList').DataTable();
        
        if (!table) {
            console.error('DataTable not found!');
            return;
        }
        
        // Clear existing checkboxes
        $('#columnCheckboxContainer').empty();
        
        // Create a row div to hold columns
        var $row = $('<div class="row"></div>');
        $('#columnCheckboxContainer').append($row);
        
        // Create 3 column divs
        var $col1 = $('<div class="col-md-4"></div>');
        var $col2 = $('<div class="col-md-4"></div>');
        var $col3 = $('<div class="col-md-4"></div>');
        $row.append($col1, $col2, $col3);
        
        // Get all columns to distribute (skip first two)
        var columns = [];
        table.columns().every(function(index) {
            if (index < 2) return;
            
            var column = this;
            var columnTitle = $(column.header()).text().trim();
            var isVisible = column.visible();
            
            columns.push({
                index: index,
                title: columnTitle || `Column ${index}`,
                visible: isVisible
            });
        });
        
        // Calculate items per column
        var itemsPerColumn = Math.ceil(columns.length / 3);
        
        // Distribute columns evenly
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            var $targetCol;
            
            // Determine which column to put this in
            if (i < itemsPerColumn) {
                $targetCol = $col1;
            } else if (i < itemsPerColumn * 2) {
                $targetCol = $col2;
            } else {
                $targetCol = $col3;
            }
            
            // Create checkbox HTML
            var checkboxHtml = `
                <div class="form-check mb-2">
                    <input class="form-check-input column-toggle-checkbox" type="checkbox" 
                           id="column${col.index}" data-column-index="${col.index}" ${col.visible ? 'checked' : ''}>
                    <label class="form-check-label" for="column${col.index}">
                        ${col.title}
                    </label>
                </div>
            `;
            
            // Add to appropriate column
            $targetCol.append(checkboxHtml);
        }
        
        console.log('Checkboxes populated:', $('.column-toggle-checkbox').length);
    }
    
    function applyColumnVisibility() {
        // Get table reference
        var table = $('#ContainerList').DataTable();
        
        if (!table) {
            console.error('DataTable not found!');
            return;
        }
        
        console.log('Applying column visibility changes...');
        
        // Get all column visibility settings first
        var visibilitySettings = [];
        $('.column-toggle-checkbox').each(function() {
            var columnIndex = $(this).data('column-index');
            var isVisible = $(this).prop('checked');
            
            visibilitySettings.push({
                index: parseInt(columnIndex),
                visible: isVisible
            });
        });
        
        // Batch process visibility to improve performance
        table.columns().every(function(index) {
            // Skip first two columns
            if (index < 2) return;
            
            // Find setting for this column
            var setting = visibilitySettings.find(s => s.index === index);
            if (setting && table.column(index).visible() !== setting.visible) {
                table.column(index).visible(setting.visible, false);
            }
        });
        
        // Single redraw at the end (more efficient)
        preserveScrollPosition(() => {
            table.columns.adjust().draw(false);
        });
        
        // Save state to localStorage
        saveColumnState(table);
        
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