// File: wwwroot/js/modules/advancedSearch.js

document.addEventListener('DOMContentLoaded', function() {
    // Get reference to the existing button in the HTML
    const searchBtn = document.getElementById('advancedSearchBtn');
    
    if (!searchBtn) {
        console.error('Advanced search button not found in HTML');
        return;
    }
    
    console.log('Found advanced search button, attaching handler');
    
    // Get reference to the DataTable
    const table = $('#ContainerList').DataTable();
    
    // Initialize the modal when button is clicked
    $(searchBtn).on('click', function(e) {
        console.log('Advanced search button clicked');
        e.preventDefault(); // Prevent any default behavior
        
        initializeSearchModal();
        
        // Check if modal element exists
        const modalElement = document.getElementById('advancedSearchModal');
        if (!modalElement) {
            console.error('Modal element not found! ID: advancedSearchModal');
            return;
        }
        
        // Create and show modal
        try {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log('Modal shown successfully');
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    });
    
    // Initialize the search form with dropdown options
    function initializeSearchModal() {
        console.log('Initializing search modal fields');
        
        // Populate status dropdown
        const $statusSelect = $('select[name="currentStatus"]');
        $statusSelect.empty().append('<option value="">Any Status</option>');
        statusOptions.forEach(status => {
            $statusSelect.append(`<option value="${status}">${status}</option>`);
        });
        
        // Populate shipline dropdown
        const $shiplineSelect = $('select[name="shipline"]');
        $shiplineSelect.empty().append('<option value="">Any Shipline</option>');
        shiplineOptions.forEach(shipline => {
            $shiplineSelect.append(`<option value="${shipline.name}">${shipline.name}</option>`);
        });
        
        // Populate port dropdown
        const $portSelect = $('select[name="portOfEntry"]');
        $portSelect.empty().append('<option value="">Any Port</option>');
        portOptions.forEach(port => {
            $portSelect.append(`<option value="${port.name}">${port.name}</option>`);
        });
    }
    
    // Clear form button handler
    $('#clearSearchBtn').on('click', function() {
        $('#advancedSearchForm')[0].reset();
    });
    
    // Apply search button handler
    $('#applySearchBtn').on('click', function() {
        // Get form data as an object
        const formData = {};
        const formElements = $('#advancedSearchForm').serializeArray();
        
        // Process form data
        formElements.forEach(item => {
            if (item.value.trim() !== '') {
                formData[item.name] = item.value.trim();
            }
        });
        
        // Check if we should use server-side search (more than 2 criteria or date filters)
        const hasDateFilters = formData.sailFrom || formData.sailTo || 
                              formData.arrivalFrom || formData.arrivalTo;
        const shouldUseServerSearch = Object.keys(formData).length > 2 || hasDateFilters;
        
        if (shouldUseServerSearch) {
            // Show loading indicator
            $('#tableSpinner').show();
            
            // Perform server-side search
            $.ajax({
                url: 'http://localhost:5062/api/containers/search',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                success: function(data) {
                    // Clear and reload the table with the filtered data
                    const table = $('#ContainerList').DataTable();
                    table.clear();
                    table.rows.add(data).draw();
                    
                    // Hide the modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('advancedSearchModal'));
                    modal.hide();
                    
                    // Show success message
                    const resultCount = data.length;
                    showToast(`Found ${resultCount} container${resultCount !== 1 ? 's' : ''}`, 'success');
                    
                    // Hide loading indicator
                    $('#tableSpinner').hide();
                },
                error: function(xhr, status, error) {
                    console.error('Search error:', error);
                    showToast('Error performing search', 'danger');
                    $('#tableSpinner').hide();
                }
            });
        } else {
            // Use client-side filtering for simple searches (1-2 criteria)
            const table = $('#ContainerList').DataTable();
            table.columns().search(''); // Clear existing searches
            
            Object.entries(formData).forEach(([key, value]) => {
                // Apply search to the appropriate column
                const colIdx = table.column(`${key}:name`).index();
                if (colIdx !== undefined) {
                    table.column(colIdx).search(value);
                }
            });
            
            // Apply all searches and redraw table
            table.draw();
            
            // Hide the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('advancedSearchModal'));
            modal.hide();
            
            // Show a search summary
            const criteria = Object.keys(formData).length;
            showToast(`Applied ${criteria} search ${criteria === 1 ? 'criterion' : 'criteria'}`, 'success');
        }
    });
});