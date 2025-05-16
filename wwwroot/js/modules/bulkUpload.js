// bulkUpload.js - Enhanced with progress tracking
document.addEventListener('DOMContentLoaded', function() {
    // Variables to track upload progress
    let totalRows = 0;
    let processedRows = 0;
    let uploadStartTime = null;
    let progressInterval = null; // Moved to global scope
    let simulationSpeed = 500;
    let progressPercentage = 0;

    // Register click handler for the upload button in the toolbar
    $(document).on('click', '#bulkUploadBtn', function() {
        // Reset form state
        $('#uploadForm')[0].reset();
        $('#uploadStatus').addClass('d-none');
        $('#uploadResults').addClass('d-none');
        $('#errorDetails').addClass('d-none');
        
        // Reset progress variables
        totalRows = 0;
        processedRows = 0;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('bulkUploadModal'));
        modal.show();
    });
    
    // Handle the template download (unchanged from your original code)
    $(document).on('click', '#downloadTemplate', function() {
        // Create CSV header based on container fields
        const headers = [
            "Container", "CurrentStatus", "ContainerSize", "MainSource", 
            "Transload", "Shipline", "BOLBookingNumber", "Rail", 
            "RailDestination", "RailwayLine", "LoadToRail", "RailDeparture", 
            "RailETA", "RailPickupNumber", "FPM", "ProjectNumber", 
            "ShipmentNumber", "PONumber", "Vendor", "VendorIDNumber", 
            "VesselLine", "VesselName", "Voyage", "PortOfDeparture", 
            "Sail", "SailActual", "PortOfEntry", "Terminal", 
            "Arrival", "ArrivalActual", "Berth", "BerthActual", 
            "Offload", "OffloadActual", "Carrier", "Available", 
            "PickupLFD", "PortRailwayPickup", "ReturnLFD", "Delivered", 
            "Returned", "Notes"
        ];
        
        // Create a simple CSV file with just the headers
        const csv = headers.join(',') + '\n';
        
        // Create a blob and trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'container_import_template.csv');
        link.click();
    });
    
    // Function to estimate total rows in a CSV file
    function estimateTotalRows(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const text = e.target.result;
                const lineCount = text.split('\n').length - 1; // -1 for header
                resolve(lineCount);
            };
            
            // Read only the first 1MB to estimate (for very large files)
            const chunk = file.slice(0, 1024 * 1024);
            reader.readAsText(chunk);
        });
    }
    
    // Function to update progress bar
    function updateProgress(current, total) {
        const percent = Math.min(Math.round((current / total) * 100), 100);
        $('#uploadProgressBar').css('width', percent + '%').attr('aria-valuenow', percent).text(percent + '%');
        $('#processedCount').text(`Processed: ${current} rows`);
        $('#totalCount').text(`Total: ${total} rows`);
        
        // Calculate and display estimated time remaining
        if (uploadStartTime && current > 0) {
            const elapsedMs = Date.now() - uploadStartTime;
            const msPerRow = elapsedMs / current;
            const remainingRows = total - current;
            const remainingMs = msPerRow * remainingRows;
            
            let timeText = '';
            if (remainingMs > 60000) {
                timeText = `~${Math.round(remainingMs / 60000)} min remaining`;
            } else {
                timeText = `~${Math.round(remainingMs / 1000)} sec remaining`;
            }
            
            $('#timeRemaining').text(timeText);
        }
    }
    
    // Function to smoothly complete final progress
    function smoothlyCompleteFinalProgress() {
        // Clear existing simulation
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        
        let finalProgress = parseFloat($('#uploadProgressBar').attr('aria-valuenow'));
        if (isNaN(finalProgress)) finalProgress = 95; // Default if parsing fails
        
        // Create a smooth transition from current progress to 100%
        const remainingSteps = Math.ceil((100 - finalProgress) / 1); // 1% increments
        const stepDelay = 120; // milliseconds between updates
        
        let step = 0;
        let finalInterval = setInterval(() => {
            step++;
            finalProgress = Math.min(100, finalProgress + 1);
            
            // Update the progress UI
            $('#uploadProgressBar').css('width', finalProgress + '%')
                .attr('aria-valuenow', finalProgress)
                .text(finalProgress + '%');
            
            // If we've reached 100%, clear the interval
            if (finalProgress >= 100 || step >= remainingSteps) {
                clearInterval(finalInterval);
                $('#timeRemaining').text('Complete!');
            } else {
                $('#timeRemaining').text('Finalizing...');
            }
        }, stepDelay);
        
        return remainingSteps * stepDelay; // Return the approximate completion time
    }
    
    // Handle the upload button click
    $(document).on('click', '#uploadBtn', function() {
        const fileInput = document.getElementById('csvFile');
        
        // Validate that a file is selected
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('Please select a CSV file to upload', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Basic validation - check file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showToast('Please select a valid CSV file', 'warning');
            return;
        }
        
        // Show upload status
        $('#uploadStatus').removeClass('d-none');
        $('#uploadResults').addClass('d-none');
        $('#errorDetails').addClass('d-none');
        
        // Reset progress bar
        $('#uploadProgressBar').css('width', '0%').attr('aria-valuenow', 0).text('0%');
        $('#processedCount').text('Processed: 0 rows');
        $('#timeRemaining').text('');
        
        // Estimate total rows and initialize progress
        estimateTotalRows(file).then(estimatedTotal => {
            totalRows = estimatedTotal;
            $('#totalCount').text(`Total: ~${totalRows} rows`);
            
            // Create FormData object
            const formData = new FormData();
            formData.append('file', file);
            formData.append('updateExisting', $('#updateExisting').is(':checked'));
            
            // Record start time for estimation
            uploadStartTime = Date.now();
            
            // Disable the upload button during processing
            $('#uploadBtn').prop('disabled', true);
            
            // Create a progress tracker with XHR
            const xhr = new XMLHttpRequest();
            
            // Start with determining simulation speed based on file size
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB < 1) {
                // Small file - fast simulation
                simulationSpeed = 300;
            } else if (fileSizeMB < 5) {
                // Medium file
                simulationSpeed = 500;
            } else {
                // Larger file - slower simulation
                simulationSpeed = 800;
            }

            // Initialize progress tracking
            processedRows = 0;
            progressPercentage = 5; // Start at 5%
            updateProgress(Math.floor(totalRows * 0.05), totalRows);

            // Clean up any existing interval
            if (progressInterval) {
                clearInterval(progressInterval);
            }

            // Create a realistic simulation that speeds up and slows down
            progressInterval = setInterval(() => {
                // Increase progress, but slow down as we approach completion
                if (progressPercentage < 30) {
                    // Initial phase - faster progress
                    progressPercentage += 3;
                } else if (progressPercentage < 60) {
                    // Middle phase - moderate progress
                    progressPercentage += 2;
                } else if (progressPercentage < 85) {
                    // Later phase - slower progress
                    progressPercentage += 1;
                } else if (progressPercentage < 95) {
                    // Final phase - very slow progress
                    progressPercentage += 0.3; // Slower increment
                }
                
                // Cap at 95% - the final 5% will be filled later
                progressPercentage = Math.min(95, progressPercentage);
                
                // Update the progress bar
                processedRows = Math.floor(totalRows * (progressPercentage / 100));
                updateProgress(processedRows, totalRows);
            }, simulationSpeed);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    // We'll handle the clean up of progressInterval in smoothlyCompleteFinalProgress
                    
                    if (xhr.status === 200) {
                        try {
                            // Success - process response
                            const response = JSON.parse(xhr.responseText);
                            console.log('Upload success:', response);
                            
                            // Smoothly complete the progress bar
                            const completionTime = smoothlyCompleteFinalProgress();
                            
                            // Hide status, show results AFTER the progress completes
                            setTimeout(() => {
                                $('#uploadStatus').addClass('d-none');
                                $('#uploadResults').removeClass('d-none');
                                
                                // Update counters
                                $('#recordsProcessed').text(response.totalProcessed);
                                $('#recordsSuccess').text(response.successCount);
                                $('#recordsFailed').text(response.errorCount);
                                
                                // Show errors if any
                                if (response.errorCount > 0 && response.errors && response.errors.length > 0) {
                                    $('#errorDetails').removeClass('d-none');
                                    
                                    // Clear previous errors
                                    $('.error-list').empty();
                                    
                                    // Add each error
                                    response.errors.forEach(function(error) {
                                        $('.error-list').append(`<div class="mb-2 p-2 border-start border-danger border-3 ps-2">
                                            <strong>Row ${error.row}:</strong> ${error.message}
                                        </div>`);
                                    });
                                }
                                
                                // Refresh the data table if any records were imported
                                if (response.successCount > 0) {
                                    $('#ContainerList').DataTable().ajax.reload(null, false);
                                }
                                
                                // Show toast
                                showToast(`Processed ${response.totalProcessed} records (${response.successCount} successful)`, 'success');
                                
                                // Re-enable upload button
                                $('#uploadBtn').prop('disabled', false);
                            }, completionTime + 300); // Wait for progress to complete
                        } catch (e) {
                            console.error('Error parsing response:', e);
                            if (progressInterval) {
                                clearInterval(progressInterval);
                            }
                            $('#timeRemaining').text('Error processing response');
                            $('#uploadBtn').prop('disabled', false);
                        }
                    } else {
                        // For errors, stop the progress simulation immediately
                        if (progressInterval) {
                            clearInterval(progressInterval);
                        }
                        
                        // Error handling
                        $('#uploadStatus').addClass('d-none');
                        
                        let errorMessage = 'Failed to upload file';
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response && response.message) {
                                errorMessage = response.message;
                            }
                        } catch (e) {
                            // If parsing fails, use xhr.statusText
                            errorMessage = xhr.statusText || errorMessage;
                        }
                        
                        showToast(`❌ ${errorMessage}`, 'danger');
                        console.error('Upload error:', xhr.status, xhr.statusText);
                        
                        // Re-enable upload button
                        $('#uploadBtn').prop('disabled', false);
                    }
                }
            };
            
            // Set up and send the request
            xhr.open('POST', 'http://localhost:5062/api/containers/bulk-upload', true);
            xhr.send(formData);
        });
    });
});