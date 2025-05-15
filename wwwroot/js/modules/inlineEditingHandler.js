// inlineEditingHandler.js

let railFieldsInitialized = false;

const navigationOptions = {
    saveOnArrowNavigation: true,   // Set to false if you only want to save on Tab/Enter
    wrapAtEdges: false,            // Set to true to wrap around at table edges
    skipHiddenColumns: true        // Whether to skip hidden columns when navigating
};

// Utility function to handle clicks on link icons
function handleLinkIconClick(event) {
    // If clicking a link icon, stop propagation to prevent inline editing
    if ($(event.target).closest('.external-link').length) {
        event.stopPropagation();
        return true; // Event was handled
    }
    return false; // Not a link icon, proceed with normal handling
}

function debugCell(cell, prefix = "Cell") {
    if (!cell) {
        console.log(`${prefix}: null`);
        return;
    }
    
    try {
        const table = $('#ContainerList').DataTable();
        const cellInfo = table.cell(cell).index();
        if (!cellInfo) {
            console.log(`${prefix}: Invalid cell, no index`);
            return;
        }
        
        const rowData = table.row(cellInfo.row).data();
        const colDef = table.settings()[0].aoColumns[cellInfo.column];
        
        console.log(`${prefix}: [${cellInfo.row},${cellInfo.column}] ${colDef.data}`);
    } catch (err) {
        console.log(`${prefix}: Error getting info: ${err.message}`);
    }
}

// Now modify your existing click event handler for editable cells
document.addEventListener('DOMContentLoaded', function () {
    let lastEditingCell = null;
    let moveLock = false;

    // Add a queue to manage UI updates
    let updateQueue = [];
    let isProcessingQueue = false;

    let vesselIdByName = {};
    let terminalIdByName = {};

    const nonEditableFields = [
        'containerID',
        'shiplineID',
        'fpmID',
        'vesselLineID',
        'vesselID',
        'portID',
        'terminalID',
        'carrierID'
    ];

    const linkedFieldHandlers = {
        carrier: {
            idColumn: 'carrierID',
            get idLookup() { return carrierIdByName; },  // Dynamic getter
            patchFields: ['Carrier', 'CarrierID']
        },
        fpm: {
            idColumn: 'fpmID',
            get idLookup() { return fpmIdByName; },  // Dynamic getter
            patchFields: ['FPM', 'FpmID']
        },
        shipline: {
            idColumn: 'shiplineID',
            get idLookup() { return shiplineIdByName; },  // Dynamic getter
            patchFields: ['Shipline', 'ShiplineID']
        },
        portOfEntry: {
            idColumn: 'portID',
            get idLookup() { return portIdByName; },  // Dynamic getter
            patchFields: ['PortOfEntry', 'PortID'],
            onPatchComplete: (table, rowID, rowIdx) => {
                try {
                    // Fix: proper column index lookup
                    const terminalColIdx = getColumnIndex(table, 'terminal');
                    const terminalIDColIdx = getColumnIndex(table, 'terminalID');
                    
                    if (terminalColIdx !== -1 && terminalIDColIdx !== -1) {
                        addToUpdateQueue(() => {
                            safeUpdateCell(table, rowIdx, terminalColIdx, '');
                            safeUpdateCell(table, rowIdx, terminalIDColIdx, '');
                        });
                    }
                } catch (err) {
                    console.error("❌ Error in portOfEntry handler:", err);
                }
            }
        },
        vesselLine: {
            idColumn: 'vesselLineID',
            get idLookup() { return vesselLineIdByName; },  // Dynamic getter
            patchFields: ['VesselLine', 'VesselLineID'],
            onPatchComplete: (table, rowID, rowIdx) => {
                try {
                    // Fix: proper column index lookup
                    const vesselNameColIdx = getColumnIndex(table, 'vesselName');
                    const vesselIDColIdx = getColumnIndex(table, 'vesselID');
                    
                    if (vesselNameColIdx !== -1 && vesselIDColIdx !== -1) {
                        addToUpdateQueue(() => {
                            safeUpdateCell(table, rowIdx, vesselNameColIdx, '');
                            safeUpdateCell(table, rowIdx, vesselIDColIdx, '');
                        });
                    }
                } catch (err) {
                    console.error("❌ Error in vesselLine handler:", err);
                }
            }
        },
        // Notice the dynamic getters for the new fields
        vesselName: {
            idColumn: 'vesselID',
            get idLookup() { return vesselIdByName; },  // Dynamic getter
            patchFields: ['VesselName', 'VesselID']
        },
        terminal: {
            idColumn: 'terminalID',
            get idLookup() { return terminalIdByName; },  // Dynamic getter
            patchFields: ['Terminal', 'TerminalID']
        }
    };

    $('#ContainerList').on('draw.dt', function(e, settings, json) {
        // Only run on redraw, not during initial draw
        if (railFieldsInitialized) {
            console.log("🔄 Refreshing rail fields after table redraw");
            window.updateRailFieldsForAllRows();
        }
    });

    function findAdjacentCell(currentCell, direction) {
        const table = $('#ContainerList').DataTable();
        const $cells = $('#ContainerList td.editable:visible');
        const currentIndex = $cells.index(currentCell);
        
        if (currentIndex === -1) return null;
        
        // Get the current cell's row and column indices
        const cellInfo = table.cell(currentCell).index();
        if (!cellInfo) return null;
        
        const currentRow = cellInfo.row;
        const currentCol = cellInfo.column;
        
        // Find visible rows (accounting for filtering/search)
        const visibleRows = table.rows({ search: 'applied' }).indexes().toArray();
        const currentRowIndex = visibleRows.indexOf(currentRow);
        
        // Get all visible columns that are editable
        const editableColIndexes = [];
        table.columns().every(function(colIdx) {
            // Get column definition directly
            const colDef = table.settings()[0].aoColumns[colIdx];
            // Check the className from the column definition
            if (colDef && (colDef.className || '').includes('editable')) {
                editableColIndexes.push(colIdx);
            }
        });
       
        // Find the current column's position in the editable columns array
        const currentEditableColIndex = editableColIndexes.indexOf(currentCol);
        
        let targetRow, targetCol;
        
        switch (direction) {
            case 'up':
                // Move up one row, same column
                if (currentRowIndex > 0) {
                    targetRow = visibleRows[currentRowIndex - 1];
                    targetCol = currentCol;
                }
                break;
            case 'down':
                // Move down one row, same column
                if (currentRowIndex < visibleRows.length - 1) {
                    targetRow = visibleRows[currentRowIndex + 1];
                    targetCol = currentCol;
                }
                break;
            case 'left':
                // Move left one column, same row
                if (currentEditableColIndex > 0) {
                    targetRow = currentRow;
                    targetCol = editableColIndexes[currentEditableColIndex - 1];
                }
                break;
            case 'right':
                // Move right one column, same row
                if (currentEditableColIndex < editableColIndexes.length - 1) {
                    targetRow = currentRow;
                    targetCol = editableColIndexes[currentEditableColIndex + 1];
                }
                break;
        }
        
        // If we found a valid target
        if (targetRow !== undefined && targetCol !== undefined) {
            const targetCell = table.cell(targetRow, targetCol).node();
            if (targetCell && $(targetCell).hasClass('editable')) {
                return targetCell;
            }
        }
        
        return null;
    }

    window.isRailDisabled = function(rowData) {
        if (!rowData) return true;
        
        const railValue = rowData.rail;
        // Check for all variations of "No"
        return !railValue || 
               railValue === 'No' || 
               railValue === 'no' || 
               railValue === 'NO' || 
               railValue === 'n' || 
               railValue === false ||
               railValue === '0';
    }
    
    window.updateRailFieldsForAllRows = function() {
        const table = $('#ContainerList').DataTable();
        
        // Add debug log to help track calls
        console.log("📊 updateRailFieldsForAllRows called");
        
        // Set the flag to true after first run
        railFieldsInitialized = true;
        
        table.rows().every(function(rowIdx) {
            const rowData = this.data();
            window.updateRailFieldsForRow(rowIdx, rowData);
        });
    }
    
    window.updateRailFieldsForRow = function(rowIdx, rowData) {
        const table = $('#ContainerList').DataTable();
        const isDisabled = window.isRailDisabled(rowData);
        
        // Log for debugging
        console.log(`🚂 Updating rail fields for row ${rowIdx}, rail value: ${rowData.rail}, disabled: ${isDisabled}`);
        
        // Get column indexes only once for performance
        const colIndexes = {};
        railRelatedFields.forEach(fieldName => {
            colIndexes[fieldName] = window.getColumnIndex(table, fieldName);
        });
        
        // Update each rail-related field
        railRelatedFields.forEach(fieldName => {
            const colIdx = colIndexes[fieldName];
            if (colIdx !== -1) {
                try {
                    const cell = table.cell(rowIdx, colIdx);
                    if (cell && cell.node()) {
                        const $cell = $(cell.node());
                        
                        if (isDisabled) {
                            // Apply more forcefully
                            $cell.addClass('rail-field-disabled');
                            $cell.removeClass('editable');
                            $cell.data('rail-disabled', true);
                            $cell.attr('data-rail-disabled', 'true'); 
                            
                            $cell.css({
                                'background-color': '#f8f9fa',
                                'color': '#adb5bd',
                                'cursor': 'not-allowed',
                                'pointer-events': 'none'
                            });
                        } else {
                            $cell.removeClass('rail-field-disabled');
                            $cell.addClass('editable');
                            $cell.data('rail-disabled', false);
                            $cell.removeAttr('data-rail-disabled');
                            
                            $cell.css({
                                'background-color': '',
                                'color': '',
                                'cursor': '',
                                'pointer-events': ''
                            });
                        }
                    }
                } catch (err) {
                    console.error(`❌ Error updating rail field ${fieldName}:`, err);
                }
            }
        });
    }
    
    // Helper function to safely get column index by data name
    window.getColumnIndex = function(table, columnName) {
        const columns = table.settings()[0].aoColumns;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].data === columnName) {
                return i;
            }
        }
        return -1; // Column not found
    }
    
    // Define railRelatedFields globally too
    const railRelatedFields = [
        'railDestination', 
        'railwayLine', 
        'loadToRail', 
        'railDeparture', 
        'railETA', 
        'railPickupNumber'
    ];

    // Helper function for safely updating a cell
    function safeUpdateCell(table, rowIdx, colIdx, value) {
        try {
            // Check if we have a valid row
            const row = table.row(rowIdx);
            if (!row || !row.node()) return;
            
            // Check if we have a valid cell
            const cell = table.cell(rowIdx, colIdx);
            if (!cell || !cell.node()) return;
            
            // Check if the node is still in the document
            if (!document.body.contains(cell.node())) return;
            
            // Now it's safe to update (without draw to avoid recursive issues)
            cell.data(value);
        } catch (err) {
            console.warn("⚠️ Safe cell update skipped:", err);
        }
    }

    // New queue system for UI updates
    function addToUpdateQueue(updateFn) {
        updateQueue.push(updateFn);
        if (!isProcessingQueue) {
            processUpdateQueue();
        }
    }

    function processUpdateQueue() {
        if (updateQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }

        isProcessingQueue = true;
        const fn = updateQueue.shift();
        
        try {
            // Use preserveScrollPosition to maintain position during the update
            preserveScrollPosition(() => {
                fn();
            });

            // After each operation, wait a bit before the next one
            setTimeout(processUpdateQueue, 50);
        } catch (err) {
            console.error("❌ Error in update queue:", err);
            isProcessingQueue = false;
        }
    }

    function preserveScrollPosition(action) {
        const scrollContainer = $('.dataTables_scrollBody');
        if (!scrollContainer.length) return action();
        
        const pos = scrollContainer.scrollTop();
        try {
            action();
        } catch (err) {
            console.error("❌ Error during scroll-preserved action:", err);
        } finally {
            // Ensure we restore scroll even if there was an error
            setTimeout(() => scrollContainer.scrollTop(pos), 0);
        }
    }
    
    function moveToNextEditable(currentCell) {
        if (moveLock) return; // throttle rapid calls
    
        moveLock = true;
    
        // Wrap this in a setTimeout to ensure it happens after current operations
        setTimeout(() => {
            const $cells = $('#ContainerList td.editable:visible');
            const currentIndex = $cells.index(currentCell);
            const $next = $cells.eq(currentIndex + 1);
        
            if ($next.length) {
                // Use jQuery trigger with empty event object to avoid undefined event
                $next.trigger('click', [{synthetic: true}]);  // <-- Pass an empty event object
        
                requestAnimationFrame(() => {
                    const input = $next.find('input')[0];
                    if (input) input.focus();
                });
            }
        
            setTimeout(() => moveLock = false, 100); // 🔁 allow next move after longer delay
        }, 150);
    }

    async function patchField(containerID, field, value) {
        try {

            // Add check for empty string vs null
            if (value === "") value = null;

            const payload = {
                containerID,
                field,
                value
            };

            const response = await fetch('http://localhost:5062/api/containers/update-field', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const result = await response.json();

            // Special handling for Rail field
            if (field.toLowerCase() === 'rail') {
                console.log(`🚂 Rail value updated to: ${value}`);
                // Refresh the rail-related fields in the table
                setTimeout(() => {
                    const table = $('#ContainerList').DataTable();
                    table.rows().every(function() {
                        const rowData = this.data();
                        if (rowData.containerID === containerID) {
                            updateRailFieldsForRow(this.index(), rowData);
                        }
                    });
                }, 300);
            }        

            // If server indicates no change was needed, don't update LastUpdated
            if (result.message === "No change needed.") {
                console.log(`⏭️ ${field} unchanged, skipping LastUpdated update`);
                return true;
            }

            console.log(`✅ ${field} saved: ${value}`);

            // Special handling for Rail field
            if (field.toLowerCase() === 'rail') {
                console.log(`🚂 Rail value updated to: ${value}`);
                // Refresh the rail-related fields in the table
                setTimeout(() => {
                    const table = $('#ContainerList').DataTable();
                    table.rows().every(function() {
                        const rowData = this.data();
                        if (rowData.containerID === containerID) {
                            // Update rowData with the new Rail value
                            rowData.rail = value;
                            updateRailFieldsForRow(this.index(), rowData);
                        }
                    });
                }, 300);
            }      

            // Update LastUpdated field (skip if we're already updating LastUpdated)
            // Check both camelCase and PascalCase variations
            if (field.toLowerCase() !== 'lastupdated') {
                // Add a small delay to ensure the main field update is processed first
                setTimeout(async () => {
                    try {
                        await updateLastUpdatedField(containerID);
                        console.log(`✅ LastUpdated automatically updated after ${field} change`);
                    } catch (err) {
                        console.error(`❌ Failed to auto-update LastUpdated after ${field} change:`, err);
                    }
                }, 100);
            } else {
                console.log(`✅ Skipping auto-update of LastUpdated since we're manually editing it`);
            }
            
            return true;
        } catch (err) {
            console.error(`❌ Failed to update ${field}:`, err);
            showToast(`❌ Failed to update ${field}`, 'danger');
            return false;
        }
    }

    function setCellDataAndInvalidate(table, cell, value, rowIndex) {
        try {
            // Enhanced check if the cell is still valid
            if (!cell || !cell.node() || !document.body.contains(cell.node())) {
                console.warn("⛔ Skipped invalidation: cell DOM no longer in document.");
                return;
            }
            
            // Add to the update queue instead of immediate update
            addToUpdateQueue(() => {
                // Use a safer approach to update the cell
                table.cell(cell.index()).data(value);
                
                // Don't draw right away, just update the data
                // The queue will handle drawing if needed
            });
            
        } catch (err) {
            console.error("❌ setCellDataAndInvalidate crashed:", err);
        }
    }

    function fadeNewRowHighlights() {
        
        // Find rows with table-warning class
        const warningRows = $('#ContainerList tbody tr.table-warning');
        
        if (warningRows.length > 0) {
            
            // Remove the class with a CSS transition
            warningRows.addClass('fade-out-warning');
            
            setTimeout(() => {
                warningRows.removeClass('table-warning fade-out-warning');
            }, 800);
        }
    }

    async function updateLastUpdatedField(containerID) {
        try {
            const now = new Date().toISOString();
            
            const payload = {
                containerID: containerID,
                field: 'LastUpdated',
                value: now
            };

            const response = await fetch('http://localhost:5062/api/containers/update-field', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            console.log(`✅ LastUpdated field updated for container ${containerID}`);
            
            // Update the DataTable cell if it exists in the current view
            const table = $('#ContainerList').DataTable();
            const rowIdx = table.rows().indexes().filter((idx) => {
                return table.row(idx).data().containerID === containerID;
            });
            
            if (rowIdx.length > 0) {
                const lastUpdatedColIdx = getColumnIndex(table, 'lastUpdated');
                if (lastUpdatedColIdx !== -1) {
                    const displayDate = new Date(now).toLocaleDateString('en-US');
                    table.cell(rowIdx[0], lastUpdatedColIdx).data(displayDate);
                }
            }
            
            return true;
        } catch (err) {
            console.error(`❌ Failed to update LastUpdated field:`, err);
            return false;
        }
    }

    // ✅ INLINE EDITING HANDLER: Save changes to backend
    window.initializeDataTableHandlers = function (table) {
        $('#ContainerList tbody').on('click', 'td.editable', async function (e, options) {
            // Check for synthetic events from options parameter that jQuery passes
            const isSyntheticEvent = options && options.synthetic;
            
            if (!isSyntheticEvent && handleLinkIconClick(e)) {
                return;
            }
            
            console.log("🖱️ Editable cell clicked", isSyntheticEvent ? "(synthetic)" : "");
            
            // Skip if this is a disabled rail field
            if ($(this).data('rail-disabled')) {
                console.log("🔒 Skipping edit for disabled rail field");
                return;
            }
            
            // Debug what happens before fade
            setTimeout(() => {
                fadeNewRowHighlights();
            }, 5000);

            // Skip if we're already processing a cell
            if ($('#ContainerList td.editing').length > 0 || $(this).hasClass('processing-update')) {
                return;
            }
            
            const cell = table.cell(this);
            const originalValue = cell.data();
            const rowData = table.row(this).data();
            const fieldIndex = cell.index().column;
            const fieldName = table.settings().init().columns[fieldIndex].data;
            if (nonEditableFields.includes(fieldName)) {
                console.log(`🔒 Skipping inline edit for read-only field: ${fieldName}`);
                return;
            }
            console.log("📌 Field name clicked:", fieldName);
            const rowID = rowData.containerID;

            // Don't re-enter editing mode
            if ($(this).hasClass('editing')) return;

            // 🧼 Close any open editing fields first
            if ($('#ContainerList td.editing').length > 0) {
                const $openEditors = $('#ContainerList td.editing');
                
                // Process all open editors in sequence
                for (let i = 0; i < $openEditors.length; i++) {
                    const td = $openEditors.eq(i);
                    const input = td.find('input, select');
                    
                    if (input.length) {
                        const tempCell = table.cell(td);
                        const val = input.val();
                        
                        // Just update data without redraw
                        if (tempCell && tempCell.node() && document.body.contains(tempCell.node())) {
                            tempCell.data(val);
                        }
                        
                        td.removeClass('editing');
                    }
                }
                
                // Now do a single redraw
                preserveScrollPosition(() => {
                    try {
                        table.draw(false);
                    } catch (err) {
                        console.warn("⚠️ Batch close cells draw failed:", err);
                    }
                });
            }

            $(this).addClass('editing');
            lastEditingCell = this;

            const isDateField = [
                'arrival', 'available', 'berth', 'delivered', 'lastUpdated', 'loadToRail',
                'offload', 'pickupLFD', 'portRailwayPickup', 'railDeparture', 'railETA',
                'returned', 'returnLFD', 'sail'
            ].includes(fieldName);
            
            let isDropdownField = null;

            if (fieldName === 'currentStatus') {
                isDropdownField = statusOptions;
            } else if (fieldName === 'carrier') {
                isDropdownField = carrierOptions.map(c => c.name);
            } else if (['arrivalActual', 'berthActual', 'offloadActual', 'sailActual'].includes(fieldName)) {
                isDropdownField = actualOrEstimateOptions;
            } else if (['rail', 'transload'].includes(fieldName)) {
                isDropdownField = booleanOptions;
            } else if (fieldName === 'containerSize') {
                isDropdownField = containerSizeOptions;
            } else if (fieldName === 'mainSource') {
                isDropdownField = mainSourceOptions;
            } else if (fieldName === 'fpm') {
                isDropdownField = fpmOptions.map(f => f.name);                
            } else if (fieldName === 'shipline') {
                isDropdownField = shiplineOptions.map(s => s.name);
            } else if (fieldName === 'portOfEntry') {
                isDropdownField = portOptions.map(p => p.name);
            } else if (fieldName === 'terminal') {
                const updatedRow = table.row(cell.index().row).data();
                let portId = updatedRow.portID;
                
                // 💡 Check if the user previously changed portOfEntry
                const portEntryName = updatedRow.portOfEntry;
                const matchedPort = portOptions.find(p => p.name === portEntryName);
                
                if (matchedPort) {
                    portId = matchedPort.id;
                    console.log("📌 Port override via name match:", portEntryName, "→", portId);
                } else {
                    console.warn("⚠️ Could not match portOfEntry to a known port:", portEntryName);
                }
                
                if (portId) {
                    try {
                        const data = await $.getJSON(`http://localhost:5062/api/terminals/by-port/${portId}`);
                        console.log("🧪 Terminal raw API data:", data);
                        
                        // IMPORTANT: Clear and populate the lookup object
                        terminalIdByName = {};  // Clear any existing data
                        data.forEach(terminal => {
                            terminalIdByName[terminal.terminal] = terminal.terminalID;
                            console.log(`🔍 Adding terminal to lookup: "${terminal.terminal}" → ${terminal.terminalID}`);
                        });
                        
                        // Log the complete lookup object to verify
                        console.log("📚 Complete terminalIdByName lookup:", terminalIdByName);
                        
                        // Create dropdown options - using name as value
                        isDropdownField = [
                            { value: '', label: '' },  // Add empty option as first item
                            ...data.map(t => {
                                return {
                                    value: t.terminal,  
                                    label: t.terminal
                                };
                            })
                        ];
                        
                        console.log("🎯 Terminal dropdown options ready:", isDropdownField);
                        
                    } catch (err) {
                        console.error(`❌ Failed to fetch terminals for port ID ${portId}`, err);
                        showToast("❌ Failed to load terminals for selected port.", "danger");
                        isDropdownField = [];
                    }
                } else {
                    console.warn("⚠️ No portID available on this row");
                    isDropdownField = [];
                }
            } else if (fieldName === 'vesselLine') {
                // Set dropdown options to available vessel lines
                isDropdownField = vesselLineOptions.map(v => v.name);
            } else if (fieldName === 'vesselName') {
                const updatedRow = table.row(cell.index().row).data();
                let vesselLineId = updatedRow.vesselLineID;
                
                // 💡 Check if the user previously changed vesselLine
                const vesselLineName = updatedRow.vesselLine;
                const matchedVesselLine = vesselLineOptions.find(v => v.name === vesselLineName);
                
                if (matchedVesselLine) {
                    vesselLineId = matchedVesselLine.id;
                    console.log("📌 Vessel Line override via name match:", vesselLineName, "→", vesselLineId);
                } else {
                    console.warn("⚠️ Could not match vesselLine to a known Vessel Line:", vesselLineName);
                }
                
                if (vesselLineId) {
                    try {
                        const data = await $.getJSON(`http://localhost:5062/api/vessels/by-line/${vesselLineId}`);
                        console.log("🧪 Vessel Name raw API data:", data);
                        
                        // IMPORTANT: Clear and populate the lookup object
                        vesselIdByName = {};  // Clear any existing data
                        data.forEach(vessel => {
                            vesselIdByName[vessel.vesselName] = vessel.vesselID;
                            console.log(`🔍 Adding vessel to lookup: "${vessel.vesselName}" → ${vessel.vesselID}`);
                        });
                        
                        // Log the complete lookup object to verify
                        console.log("📚 Complete vesselIdByName lookup:", vesselIdByName);
                        
                        // Create dropdown options - using name as value
                        isDropdownField = [
                            { value: '', label: '' },  // Add empty option as first item
                            ...data.map(n => {
                                return {
                                    value: n.vesselName,  
                                    label: n.vesselName
                                };
                            })
                        ];
                        
                        console.log("🎯 Vessel Name dropdown options ready:", isDropdownField);
                        
                    } catch (err) {
                        console.error(`❌ Failed to fetch vessel name for vessel line ID ${vesselLineId}`, err);
                        showToast("❌ Failed to load vessel names for selected vessel line.", "danger");
                        isDropdownField = [];
                    }
                } else {
                    console.warn("⚠️ No vesselLineId available on this row");
                    isDropdownField = [];
                }
            }
            
            let inputHtml = '';
            if (Array.isArray(isDropdownField) && isDropdownField.length > 0) {
                const normalizedOriginal = String(originalValue).trim();
                
                inputHtml = `<select class="form-select form-select-sm">` +
                // ADD THIS EMPTY OPTION - it will be selected when originalValue is empty
                `<option value="" ${normalizedOriginal === '' ? 'selected' : ''}></option>` +
                isDropdownField.map(opt => {
                    const label = typeof opt === 'string' ? opt : opt.label;
                    const value = typeof opt === 'string' ? opt : opt.value;
                    
                    // For linked fields, we want to match against the label/name, not the ID
                    const isSelected = (String(label).trim() === normalizedOriginal) ? 'selected' : '';
            
                    return `<option value="${value}" ${isSelected}>${label}</option>`;
                }).join('') +
                `</select>`;
            } else if (Array.isArray(isDropdownField) && isDropdownField.length === 0) {
                console.warn("⚠️ No dropdown options found for field:", fieldName);
                inputHtml = `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}" placeholder="No options available">`;
            }
                else if (isDateField) {
                const value = originalValue ? new Date(originalValue).toLocaleDateString('en-US') : '';
                inputHtml = `<input type="text" class="form-control form-control-sm date-field" value="${value}">`;                
            } else {
                inputHtml = `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}">`;
            }
            cell.node().innerHTML = `<div style="min-width: 100px;">${inputHtml}</div>`;

            // ✅ This goes AFTER the HTML is in the DOM
            const input = $('input, select', this);
            
            // Use requestAnimationFrame to ensure focus comes after DOM updates
            requestAnimationFrame(() => {
                input.focus().trigger('mousedown');
            });

            if (linkedFieldHandlers[fieldName]) {
                // Track if we're in the middle of typing to find an option
                let isTypingToSearch = false;
                let originalSelectedValue = $(input).val(); // Store the original value
                
                // Prevent change event from firing while typing letters to search
                input.on('keydown', function(e) {
                    // If it's a letter key, set our flag
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                        isTypingToSearch = true;
                        
                        // Reset the flag after a short delay 
                        // (allows for multiple quick keypresses)
                        setTimeout(() => {
                            isTypingToSearch = false;
                        }, 300);
                    }
                    
                    // If Enter or Tab is pressed, commit the selection
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        isTypingToSearch = false;
                        // Let the regular keydown handler deal with this
                    }
                });
                
                // Only handle change if we're not in the middle of typing to search
                input.on('change', function() {
                    // Skip if we're still typing to search
                    if (isTypingToSearch) {
                        return;
                    }
                    
                    // Mark that we've registered this change
                    const $this = $(this);
                    if ($this.data('change-handled')) return;
                    $this.data('change-handled', true);
                    
                    // Process on next tick to avoid event overlap
                    setTimeout(() => {
                        handleLinkedDropdownChange(this, cell, table, fieldName, rowID);
                    }, 50);
                });
                
                // Add blur handler to catch selections made by typing
                input.on('blur', function() {
                    const currentValue = $(this).val();
                    
                    // Check if the value changed from the original
                    if (currentValue !== originalSelectedValue && !$(this).data('change-handled')) {
                        // Mark as handled to prevent duplicate processing
                        $(this).data('change-handled', true);
                        
                        // Process the change
                        setTimeout(() => {
                            handleLinkedDropdownChange(this, cell, table, fieldName, rowID);
                        }, 50);
                    }
                });
            }

            if (fieldName === 'terminal') {
                let isTypingToSearch = false;
                let originalSelectedValue = $(input).val();
                
                // Add keydown handler to track typing
                input.on('keydown', function(e) {
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                        isTypingToSearch = true;
                        setTimeout(() => {
                            isTypingToSearch = false;
                        }, 300);
                    }
                    
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        isTypingToSearch = false;
                    }
                });
                
                input.on('change', function () {
                    // Skip if we're still typing to search
                    if (isTypingToSearch) {
                        return;
                    }
                    
                    // Handle the same way as above to prevent duplicates
                    const $this = $(this);
                    if ($this.data('change-handled')) return;
                    $this.data('change-handled', true);
                    
                    setTimeout(() => {
                        const newValue = $(this).val();
                        
                        // ADD THIS CODE: Check if clearing the field
                        if (!newValue || newValue === "") {
                            // Clear both name and ID
                            Promise.all([
                                patchField(rowID, 'Terminal', null),
                                patchField(rowID, 'TerminalID', null)
                            ]).then(() => {
                                showToast(`✅ Terminal cleared`, 'success');
                                updateLastUpdatedField(rowID);
                            });
                            return; // Important! Return early to skip the rest of the function
                        }

                        const match = isDropdownField.find(opt => opt.value == newValue);
                        const terminalName = match ? match.label : '[Unknown Terminal]';
                        
                        // Update both Terminal and TerminalID
                        const terminalId = terminalIdByName[terminalName];
                        
                        if (terminalId) {
                            // Send patches for both fields
                            Promise.all([
                                patchField(rowID, 'Terminal', terminalName),
                                patchField(rowID, 'TerminalID', terminalId)
                            ]).then(() => {
                                showToast(`✅ Terminal updated`, 'success');
                            });
                        } else {
                            // Just update the terminal name without ID
                            patchField(rowID, 'Terminal', terminalName)
                                .then(() => {
                                    showToast(`✅ Terminal updated`, 'success');
                                });
                        }
                    }, 50);
                });
                
                // Add blur handler for terminal too
                input.on('blur', function() {
                    const currentValue = $(this).val();
                    
                    // Check if the value changed and hasn't been handled yet
                    if (currentValue !== originalSelectedValue && !$(this).data('change-handled')) {
                        $(this).data('change-handled', true);
                        
                        setTimeout(() => {
                            const newValue = currentValue;
                            const match = isDropdownField.find(opt => opt.value == newValue);
                            const terminalName = match ? match.label : '[Unknown Terminal]';
                            
                            // Update both Terminal and TerminalID
                            const terminalId = terminalIdByName[terminalName];
                            
                            if (terminalId) {
                                // Send patches for both fields
                                Promise.all([
                                    patchField(rowID, 'Terminal', terminalName),
                                    patchField(rowID, 'TerminalID', terminalId)
                                ]).then(() => {
                                    showToast(`✅ Terminal updated`, 'success');
                                });
                            } else {
                                // Just update the terminal name without ID
                                patchField(rowID, 'Terminal', terminalName)
                                    .then(() => {
                                        showToast(`✅ Terminal updated`, 'success');
                                    });
                            }
                        }, 50);
                    }
                });
            }

            if (fieldName === 'vesselName') {
                let isTypingToSearch = false;
                let originalSelectedValue = $(input).val();
                
                // Add keydown handler to track typing
                input.on('keydown', function(e) {
                    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                        isTypingToSearch = true;
                        setTimeout(() => {
                            isTypingToSearch = false;
                        }, 300);
                    }
                    
                    if (e.key === 'Enter' || e.key === 'Tab') {
                        isTypingToSearch = false;
                    }
                });
                
                input.on('change', function () {
                    // Skip if we're still typing to search
                    if (isTypingToSearch) {
                        return;
                    }
                    
                    // Handle the same way as above to prevent duplicates
                    const $this = $(this);
                    if ($this.data('change-handled')) return;
                    $this.data('change-handled', true);
                    
                    setTimeout(() => {
                        const newValue = $(this).val();
                        
                        // ADD THIS CODE: Check if clearing the field
                        if (!newValue || newValue === "") {
                            // Clear both name and ID
                            Promise.all([
                                patchField(rowID, 'VesselName', null),
                                patchField(rowID, 'VesselID', null)
                            ]).then(() => {
                                showToast(`✅ Vessel Name cleared`, 'success');
                                updateLastUpdatedField(rowID);
                            });
                            return; // Important! Return early to skip the rest of the function
                        }

                        const match = isDropdownField.find(opt => opt.value == newValue);
                        const vesselName = match ? match.label : '[Unknown Vessel]';
                        
                        // Update both VesselName and VesselID
                        const vesselId = vesselIdByName[vesselName];
                        
                        if (vesselId) {
                            // Send patches for both fields
                            Promise.all([
                                patchField(rowID, 'VesselName', vesselName),
                                patchField(rowID, 'VesselID', vesselId)
                            ]).then(() => {
                                showToast(`✅ Vessel Name updated`, 'success');
                                // Update LastUpdated after both patches succeed
                                updateLastUpdatedField(rowID);
                            });
                        } else {
                            // Just update the vessel name without ID
                            patchField(rowID, 'VesselName', vesselName)
                                .then(() => {
                                    showToast(`✅ Vessel Name updated`, 'success');
                                    updateLastUpdatedField(rowID);
                                });
                        }
                    }, 50);
                });
                
                // Add blur handler for vesselName too
                input.on('blur', function() {
                    const currentValue = $(this).val();
                    
                    // Check if the value changed and hasn't been handled yet
                    if (currentValue !== originalSelectedValue && !$(this).data('change-handled')) {
                        $(this).data('change-handled', true);
                        
                        setTimeout(() => {
                            const newValue = currentValue;
                            const match = isDropdownField.find(opt => opt.value == newValue);
                            const vesselName = match ? match.label : '[Unknown Vessel]';
                            
                            // Update both VesselName and VesselID
                            const vesselId = vesselIdByName[vesselName];
                            
                            if (vesselId) {
                                // Send patches for both fields
                                Promise.all([
                                    patchField(rowID, 'VesselName', vesselName),
                                    patchField(rowID, 'VesselID', vesselId)
                                ]).then(() => {
                                    showToast(`✅ Vessel Name updated`, 'success');
                                    // Update LastUpdated after both patches succeed
                                    updateLastUpdatedField(rowID);
                                });
                            } else {
                                // Just update the vessel name without ID
                                patchField(rowID, 'VesselName', vesselName)
                                    .then(() => {
                                        showToast(`✅ Vessel Name updated`, 'success');
                                        updateLastUpdatedField(rowID);
                                    });
                            }
                        }, 50);
                    }
                });
            }
            
            if (isDateField) {
                // Set a flag to track if we're in the middle of a flatpickr interaction
                let flatpickrActive = false;
                
                const fp = flatpickr(input[0], {
                    dateFormat: 'm/d/Y',
                    allowInput: true,
                    defaultDate: originalValue ? new Date(originalValue) : null,
                    parseDate: function(datestr, format) {
                        if (datestr && datestr.includes('/')) {
                            const parts = datestr.split('/');
                            if (parts.length === 2) {
                                const currentYear = new Date().getFullYear();
                                datestr = `${parts[0]}/${parts[1]}/${currentYear}`;
                            }
                        }
                        return flatpickr.parseDate(datestr, format);
                    },
                    onOpen: function() {
                        flatpickrActive = true;
                        preventBlur = true;
                    },
                    onChange: function(selectedDates, dateStr, instance) {
                        if (selectedDates.length > 0) {
                            input.data('flatpickr-date', selectedDates[0]);
                            input.data('flatpickr-changed', true);
                        }
                    },
                    onClose: function(selectedDates, dateStr, instance) {
                        flatpickrActive = false;
                        
                        if (selectedDates.length > 0 && input.data('flatpickr-changed')) {
                            const selectedDate = selectedDates[0];
                            const formattedValue = selectedDate.toISOString();
                            const displayValue = selectedDate.toLocaleDateString('en-US');
                            
                            const originalIso = originalValue ? new Date(originalValue).toISOString() : '';
                            
                            if (formattedValue !== originalIso) {
                                
                                cell.data(displayValue);
                                $(cell.node()).addClass('processing-update');
                                
                                patchField(rowID, fieldName.charAt(0).toUpperCase() + fieldName.slice(1), formattedValue)
                                    .then(async (success) => {
                                        if (success) {
                                            // Only update LastUpdated if we're not editing the LastUpdated field itself
                                            if (fieldName.toLowerCase() !== 'lastupdated') {
                                                try {
                                                    await updateLastUpdatedField(rowID);
                                                    console.log(`✅ LastUpdated field updated for date field ${fieldName}`);
                                                } catch (err) {
                                                    console.error(`❌ Failed to update LastUpdated for date field:`, err);
                                                }
                                            }
                                        }
                                        
                                        showToast(`✅ ${fieldName} updated`, 'success');
                                        $(cell.node()).removeClass('processing-update');
                                        
                                        preserveScrollPosition(() => {
                                            try {
                                                table.draw(false);
                                            } catch (err) {
                                                console.warn("⚠️ Date update draw failed:", err);
                                            }
                                        });
                                        
                                        $(cell.node()).removeClass('editing');
                                        setTimeout(() => moveToNextEditable(cell.node()), 100);
                                    })
                                    .catch(err => {
                                        console.error(`❌ Failed to save ${fieldName}`, err);
                                        showToast(`❌ Failed to update ${fieldName}`, 'danger');
                                        $(cell.node()).removeClass('processing-update editing');
                                    });
                            }
                        }
                        
                        // Don't clear the flags here - let blur handler use them first
                        // Clear them after a delay to give blur handler time to run
                        setTimeout(() => {
                            input.removeData('flatpickr-changed');
                            input.removeData('flatpickr-date');
                        }, 200);
                        
                        // Allow blur after a short delay
                        setTimeout(() => {
                            preventBlur = false;
                        }, 100);
                    }
                });
                
                // Store the instance and flag
                input.data('flatpickr-instance', fp);
                input.data('is-flatpickr-active', () => flatpickrActive);
            }

            let inputValue = originalValue;
            if (isDateField && originalValue) {
                const parsed = new Date(originalValue);
                inputValue = parsed.toISOString().split('T')[0];
            }

            if (inputValue == null) inputValue = '';

            let preventBlur = false;

            input.on('keydown', function (e) {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    preventBlur = true;

                    let newValue = input.val().trim();
                    if (newValue === 'null') newValue = '';

                    if (isDateField && newValue) {
                        let parsed;
                        
                        // First check if there's a flatpickr instance
                        const fpInstance = input.data('flatpickr-instance');
                        const fpDate = input.data('flatpickr-date');
                        
                        if (fpInstance && fpDate) {
                            // Use the stored date from flatpickr
                            parsed = fpDate;
                        } else {
                            // Fallback to manual parsing
                            // Check if it's just month/day without year
                            if (newValue.match(/^\d{1,2}\/\d{1,2}$/)) {
                                const currentYear = new Date().getFullYear();
                                newValue = `${newValue}/${currentYear}`;
                            }
                            parsed = new Date(newValue);
                        }
                        
                        newValue = isNaN(parsed.getTime()) ? originalValue : parsed.toISOString();
                    }

                    const changed = newValue !== originalValue;
                    
                    // Mark cell as being processed
                    $(cell.node()).addClass('processing-update');

                    // Update data without immediate draw
                    if (changed) {
                        cell.data(newValue);
                        
                        // Draw with scroll position preserved
                        preserveScrollPosition(() => {
                            try {
                                table.draw(false);
                            } catch (err) {
                                console.warn("⚠️ Tab/Enter update draw failed:", err);
                            }
                        });
                        
                        // Skip certain fields that are handled elsewhere
                        const skipFields = ['carrier', 'shipline', 'fpm', 'portOfEntry', 'vesselLine'];
                        if (!skipFields.includes(fieldName)) {
                            // Use the exact field name for the patch
                            const fieldNameForPatch = fieldName === 'lastUpdated' ? 'LastUpdated' : 
                                                    fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                            
                            patchField(rowID, fieldNameForPatch, newValue)
                                .catch(err => {
                                    console.error(`❌ Failed to save ${fieldName}`, err);
                                    showToast(`❌ Failed to update ${fieldName}`, 'danger');
                                });
                        } else {
                            console.warn(`⚠️ Skipping fallback PATCH — ${fieldName} already patched on change.`);
                        }
                    } else {
                        // Even if unchanged, just draw to ensure proper display
                        preserveScrollPosition(() => {
                            try {
                                cell.data(originalValue);
                                table.draw(false);
                            } catch (err) {
                                console.warn("⚠️ Draw failed on unchanged value:", err);
                            }
                        });
                    }
                    
                    // Remove editing state
                    $(cell.node()).removeClass('editing processing-update');
                    
                    // Schedule move to next editable after a small delay
                    setTimeout(() => {
                        moveToNextEditable(cell.node());
                    }, 100);
                }

                if (e.key === 'Escape') {
                    preventBlur = true;
                    
                    // Use addToUpdateQueue to safely handle the update
                    addToUpdateQueue(() => {
                        if (cell && cell.node() && document.body.contains(cell.node())) {
                            cell.data(originalValue);
                            $(cell.node()).removeClass('editing processing-update');
                        }
                    });
                }

                // Only handle arrows with no modifiers (not shift, ctrl, alt)
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && 
                    !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    
                    e.preventDefault(); // Prevent default arrow key behaviors
                    
                    // Map the arrow key to a direction
                    const direction = {
                        'ArrowUp': 'up',
                        'ArrowDown': 'down',
                        'ArrowLeft': 'left',
                        'ArrowRight': 'right'
                    }[e.key];
                    
                    // Get current values
                    const currentValue = $(this).val().trim();
                    let shouldSave = navigationOptions.saveOnArrowNavigation;
                    
                    // Check if value changed - only save if changed AND saveOnArrowNavigation is true
                    if (navigationOptions.saveOnArrowNavigation && currentValue !== originalValue) {
                        shouldSave = true;
                    }
                    
                    // Find the next cell - store this so we can use it later
                    const targetCell = findAdjacentCell(cell.node(), direction);
                    
                    // Log info for debugging
                    console.log(`Navigation: ${direction}, Target found: ${!!targetCell}`);
                    
                    // If we found a valid target cell
                    if (targetCell) {
                        // Save current cell value if changed
                        if (shouldSave && currentValue !== originalValue) {
                            console.log(`Saving value before navigation: "${currentValue}"`);
                            
                            // Mark cell as being processed
                            $(cell.node()).addClass('processing-update');
                            
                            // Save the current value
                            cell.data(currentValue);
                            
                            // Get field info for PATCH request
                            const fieldIndex = cell.index().column;
                            const fieldName = table.settings().init().columns[fieldIndex].data;
                            const rowID = table.row(cell.index().row).data().containerID;
                            
                            // Format field name properly for API
                            const fieldNameForPatch = fieldName === 'lastUpdated' ? 'LastUpdated' : 
                                                    fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                            
                            // Send PATCH request
                            patchField(rowID, fieldNameForPatch, currentValue)
                                .catch(err => {
                                    console.error(`❌ Failed to save ${fieldName}:`, err);
                                    showToast(`❌ Failed to update ${fieldName}`, 'danger');
                                });
                        }
                        
                        // Cleanup all editing cells first (important!)
                        $('#ContainerList td.editing').not(cell.node()).removeClass('editing');
                        
                        // Remove editing classes from current cell
                        $(cell.node()).removeClass('editing processing-update');
                        
                        // Redraw the table before moving to ensure clean state
                        try {
                            preserveScrollPosition(() => {
                                table.draw(false);
                            });
                        } catch (err) {
                            console.warn("⚠️ Table redraw failed during navigation:", err);
                        }
                        
                        // Create a small delay to ensure DOM is stable
                        setTimeout(() => {
                            // Make sure target cell still exists and is in the document
                            if (targetCell && document.body.contains(targetCell)) {
                                console.log('Moving to cell:', $(targetCell).text());
                                
                                // Use a clean approach to trigger cell edit
                                $(targetCell).trigger('click', {synthetic: true});
                                
                                // Focus on the input after a brief delay
                                setTimeout(() => {
                                    const newInput = $(targetCell).find('input, select');
                                    if (newInput.length) {
                                        newInput.focus();
                                        
                                        // If it's a text input, place cursor at the end
                                        if (newInput.is('input:text')) {
                                            const length = newInput.val().length;
                                            newInput[0].setSelectionRange(length, length);
                                        }
                                    }
                                }, 50);
                            } else {
                                console.warn("Target cell is no longer available");
                            }
                        }, 100);
                    } else {
                        console.log(`No valid target found for direction: ${direction}`);
                        
                        // Optional: provide feedback that we can't move in that direction
                        if (navigationOptions.wrapAtEdges) {
                            // Implement wrapping at edges if needed
                            console.log("Edge wrapping not implemented yet");
                        }
                    }
                    
                    return false; // Prevent default behavior
                }
            });

            input.on('blur', function () {
                if (preventBlur) return;
                
                // Check if flatpickr is active
                const isActive = $(this).data('is-flatpickr-active');
                if (isDateField && isActive && isActive()) {
                    return;
                }
                
                // For date fields, check if value changed and update LastUpdated
                if (isDateField && $(this).data('flatpickr-changed')) {
                    // Get the stored flatpickr date
                    const fpDate = $(this).data('flatpickr-date');
                    const fpInstance = $(this).data('flatpickr-instance');
                    
                    if (fpDate && fpInstance) {
                        const formattedValue = fpDate.toISOString();
                        const originalIso = originalValue ? new Date(originalValue).toISOString() : '';
                        
                        if (formattedValue !== originalIso) {
                            // Only update LastUpdated if we're not editing the LastUpdated field itself
                            if (fieldName.toLowerCase() !== 'lastupdated') {
                                updateLastUpdatedField(rowID)
                                    .then(() => {
                                        console.log(`✅ LastUpdated updated via blur for date field ${fieldName}`);
                                    })
                                    .catch(err => {
                                        console.error(`❌ Failed to update LastUpdated via blur:`, err);
                                    });
                            }
                        }
                    }
                    
                    // Clear the flags after handling
                    $(this).removeData('flatpickr-changed');
                    $(this).removeData('flatpickr-date');
                    return;
                }
                
                // Prevent multiple blur handlers from firing
                const $input = $(this);
                if ($input.data('blur-handled')) return;
                $input.data('blur-handled', true);

                // Use requestAnimationFrame to wait for the next paint cycle
                requestAnimationFrame(() => {
                    const $active = document.activeElement;
                    if ($(cell.node()).has($active).length) {
                        $input.data('blur-handled', false); // Reset if we're still in the cell
                        return;
                    }

                    let newValue = $input.val();
                    if (newValue != null) newValue = newValue.toString().trim();
                    let formattedValue = newValue;
                    let displayValue = originalValue;

                    // Better date handling in blur
                    if (isDateField) {
                        let parsed;
                        
                        // First check if there's a flatpickr instance and date
                        const fpInstance = $input.data('flatpickr-instance');
                        const fpDate = $input.data('flatpickr-date');
                    
                        if (fpDate && fpInstance) {
                            // Use the stored date from flatpickr
                            parsed = fpDate;
                        } else if (newValue) {
                            // Fallback to manual parsing
                            // Check if it's just month/day without year
                            if (newValue.match(/^\d{1,2}\/\d{1,2}$/)) {
                                const currentYear = new Date().getFullYear();
                                newValue = `${newValue}/${currentYear}`;
                            }
                            parsed = new Date(newValue);
                        }
                        
                        if (parsed && !isNaN(parsed.getTime())) {
                            formattedValue = parsed.toISOString();
                            displayValue = parsed.toLocaleDateString('en-US');
                        } else {
                            // If parsing fails or no value, use empty or original
                            if (!newValue) {
                                formattedValue = '';
                                displayValue = '';
                            } else {
                                formattedValue = originalValue;
                                displayValue = originalValue ? new Date(originalValue).toLocaleDateString('en-US') : '';
                            }
                        }
                    } else if (fieldName === 'terminal' && Array.isArray(isDropdownField)) {
                        const matchedOption = isDropdownField.find(opt => opt.value == newValue);
                        displayValue = matchedOption ? matchedOption.label : newValue;
                    } else if (fieldName === 'vesselName' && Array.isArray(isDropdownField)) {
                        const matchedOption = isDropdownField.find(opt => opt.value == newValue);
                        displayValue = matchedOption ? matchedOption.label : newValue;
                    } else if (!isDateField && newValue !== originalValue) {
                        displayValue = formattedValue = newValue;
                    }

                    const skipFields = ['carrier', 'shipline', 'fpm', 'portOfEntry', 'terminal', 'vesselLine', 'vesselName'];
                    if (skipFields.includes(fieldName)) {
                        return;
                    }
                    
                    let valueChanged = false;
                    if (isDateField) {
                        const originalIso = originalValue ? new Date(originalValue).toISOString() : '';
                        valueChanged = formattedValue !== originalIso;
                    } else {
                        valueChanged = formattedValue !== originalValue;
                    }
                    
                    if (valueChanged) {
                        console.log('Value changed, sending patch...');
                        // Mark as processing
                        $(cell.node()).addClass('processing-update');
                        
                        // Add the update to our queue for safe processing
                        addToUpdateQueue(() => {
                            // Make sure we're working with a valid cell
                            if (cell && cell.node() && document.body.contains(cell.node())) {
                                cell.data(displayValue);
                                
                                try {
                                    const rowIdx = cell.index().row;
                                    if (rowIdx !== undefined) {
                                        const row = table.row(rowIdx);
                                        if (row && row.node() && document.body.contains(row.node())) {
                                            row.invalidate();
                                            table.draw(false);
                                        }
                                    }
                                } catch (err) {
                                    console.warn("⚠️ Row invalidation failed:", err);
                                }
                                
                                // Now safe to make the API call
                                patchField(rowID, fieldName.charAt(0).toUpperCase() + fieldName.slice(1), formattedValue)
                                    .then(() => {
                                        $(cell.node()).removeClass('processing-update');
                                        showToast(`✅ ${fieldName} updated`, 'success');
                                    })
                                    .catch(err => {
                                        console.error(`❌ Failed to save ${fieldName}`, err);
                                        $(cell.node()).removeClass('processing-update');
                                    });
                            }
                        });
                    } else {
                        console.log('Value not changed, skipping patch');
                        // Just reset to original value if not changed
                        addToUpdateQueue(() => {
                            if (cell && cell.node() && document.body.contains(cell.node())) {
                                const displayVal = isDateField && originalValue 
                                    ? new Date(originalValue).toLocaleDateString('en-US') 
                                    : originalValue || '';
                                cell.data(displayVal);
                                try {
                                    table.row(cell.index().row).invalidate().draw(false);
                                } catch (err) {
                                    console.warn("⚠️ Row invalidation failed:", err);
                                }
                            }
                        });
                    }

                    // Safe cleanup
                    const cellNode = cell.node();
                    if (cellNode && document.body.contains(cellNode)) {
                        $(cellNode).removeClass('editing');
                    }
                });
            });
        });
        
        // 🔁 Cleanup stuck .editing cells if user clicks outside too fast
        $('#ContainerList').on('mousedown', function (e) {
            // Don't process if clicking on an active editor or its children
            if ($(e.target).closest('td.editing').length > 0) return;
            
            $('#ContainerList td.editing').each(function () {
                const td = $(this);
                const input = td.find('input, select');
        
                // Make sure the cell is still valid before updating
                try {
                    if (document.body.contains(td[0])) {
                        const tempCell = table.cell(td);
                        if (tempCell && tempCell.node()) {
                            const val = input.val()?.trim() ?? '';
                            
                            // Add to update queue instead of immediate update
                            addToUpdateQueue(() => {
                                tempCell.data(val);
                                table.draw(false);
                            });
                        }
                        td.removeClass('editing processing-update');
                    }
                } catch (err) {
                    console.warn('⚠️ Skipped cell update due to DOM conflict:', err);
                }
            });
        });
    }

    function handleLinkedDropdownChange(input, cell, table, fieldName, rowID) {
        const config = linkedFieldHandlers[fieldName];
        if (!config) return;
    
        const selectedLabel = $(input).val();
        // Check if the dropdown was set to blank/empty
        const isClearing = selectedLabel === "" || selectedLabel === null;
        const selectedId = isClearing ? null : config.idLookup[selectedLabel];
    
        // Create the patchRequests array
        const patchRequests = config.patchFields.map((field, i) => {
            // If clearing, set both the name and ID to null
            if (isClearing) {
                return {
                    field: field,
                    value: null
                };
            } else {
                const value = i === 0 ? selectedLabel : String(selectedId);
                return {
                    field: field,
                    value: value
                };
            }
        });

        const rowIdx = cell.index().row;
        const cellNode = cell.node();

        // Check if the cell is still attached to the DOM
        if (!cellNode || !document.body.contains(cellNode)) {
            return;
        }

        // Detach all event handlers and mark cell as being processed
        $(cellNode).off('blur change').addClass('processing-update');

        // Use a safer approach to update the visible cell
        cell.data(selectedLabel);

        // Update the ID in the hidden column using direct index access
        const idColIdx = getColumnIndex(table, config.idColumn);
        if (idColIdx !== -1) {
            table.cell(rowIdx, idColIdx).data(selectedId);
        }

        // Remove editing state before we redraw
        $(cellNode).removeClass('editing');

        // Perform a single redraw that preserves the scroll position
        preserveScrollPosition(() => {
            try {
                table.draw(false);
            } catch (err) {
                console.warn("⚠️ Draw failed, using safer approach:", err);
                
                try {
                    const row = table.row(rowIdx);
                    if (row && row.node() && document.body.contains(row.node())) {
                        row.invalidate();
                    }
                } catch (innerErr) {
                    console.error("⛔ Row invalidation also failed:", innerErr);
                }
            }
        });

        const sendPatchRequests = async () => {
            try {
                // Send all patch requests using patchField function
                for (const patch of patchRequests) {
                    await patchField(rowID, patch.field, patch.value);
                }
                
                // Run any post-update handlers if needed
                if (config.onPatchComplete) {
                    setTimeout(() => {
                        try {
                            config.onPatchComplete(table, rowID, rowIdx);
                        } catch (err) {
                            console.error(`❌ Error in onPatchComplete handler for ${fieldName}:`, err);
                        }
                    }, 50);
                }
            } catch (err) {
                console.error(`❌ Failed to PATCH ${fieldName}:`, err);
                showToast(`❌ Failed to update ${fieldName}`, 'danger');
            } finally {
                $(cellNode).removeClass('processing-update');
            }
        };

        // Use setTimeout to ensure DOM operations complete before network requests
        setTimeout(sendPatchRequests, 50);
    }
});