// inlineEditingHandler.js
document.addEventListener('DOMContentLoaded', function () {
    let lastEditingCell = null;
    let moveLock = false;
    // Add a queue to manage UI updates
    let updateQueue = [];
    let isProcessingQueue = false;

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
            idLookup: carrierIdByName,
            patchFields: ['Carrier', 'CarrierID']
        },
        fpm: {
            idColumn: 'fpmID',
            idLookup: fpmIdByName,
            patchFields: ['FPM', 'FpmID']
        },
        shipline: {
            idColumn: 'shiplineID',
            idLookup: shiplineIdByName,
            patchFields: ['Shipline', 'ShiplineID']
        },
        portOfEntry: {
            idColumn: 'portID',
            idLookup: portIdByName,
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
            idLookup: vesselLineIdByName,
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
        }
    };

    // Helper function to safely get column index by data name
    function getColumnIndex(table, columnName) {
        const columns = table.settings()[0].aoColumns;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].data === columnName) {
                return i;
            }
        }
        return -1; // Column not found
    }

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
                $next.trigger('click');
        
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
    
            console.log(`✅ ${field} saved: ${value}`);
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
        const newRows = $('#ContainerList tbody tr.new-row-highlight, #ContainerList tbody tr[style*="background-color: #f5f5dc"]');
        
        if (newRows.length > 0) {
            // Add a CSS class that triggers the transition
            newRows.addClass('fade-highlight');
            
            // Remove the highlight class and styles after transition
            setTimeout(() => {
                newRows.removeClass('new-row-highlight fade-highlight')
                    .css('background-color', '');
            }, 800);
        }
    }

    // ✅ INLINE EDITING HANDLER: Save changes to backend
    window.initializeDataTableHandlers = function (table) {
        $('#ContainerList tbody').on('click', 'td.editable', async function () {        
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
                
                        // ✅ Proper mapping for dropdown
                        isDropdownField = data.map(t => {
                            console.log("🔬 Checking terminal mapping:", t);
                            return {
                                value: t.terminalID,
                                label: typeof t.terminal === 'string'
                                ? t.terminal
                                : (typeof t.terminal === 'object' && t.terminal.terminal)
                                    ? t.terminal.terminal
                                    : '[Missing Terminal Name]'
                            };
                        });
                        console.table(isDropdownField, ['value', 'label']);
                
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
                
                        // ✅ Proper mapping for dropdown
                        isDropdownField = data.map(n => {
                            console.log("🔬 Checking vessel name mapping:", n);
                            return {
                                value: n.vesselID,
                                label: typeof n.vesselName === 'string'
                                ? n.vesselName
                                : (typeof n.vesselName === 'object' && n.vesselName.vesselName)
                                    ? n.vesselName.vesselName
                                    : '[Missing Vessel Name]'
                            };
                        });
                        console.table(isDropdownField, ['value', 'label']);
                
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
                isDropdownField.map(opt => {
                    const label = typeof opt === 'string' ? opt : opt.label;
                    const value = typeof opt === 'string' ? opt : opt.value;
                    const isSelected = (String(label).trim() === normalizedOriginal || String(value).trim() === normalizedOriginal) ? 'selected' : '';

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
                // Use a separate event handler and defer to prevent race conditions
                input.on('change', function() {
                    // Mark that we've registered this change
                    const $this = $(this);
                    if ($this.data('change-handled')) return;
                    $this.data('change-handled', true);
                    
                    // Process on next tick to avoid event overlap
                    setTimeout(() => {
                        handleLinkedDropdownChange(this, cell, table, fieldName, rowID);
                    }, 50);
                });
            }

            if (fieldName === 'terminal') {
                input.on('change', function () {
                    // Handle the same way as above to prevent duplicates
                    const $this = $(this);
                    if ($this.data('change-handled')) return;
                    $this.data('change-handled', true);
                    
                    setTimeout(() => {
                        const newValue = $this.val();
                        const match = isDropdownField.find(opt => opt.value == newValue);
                        const terminalName = match ? match.label : '[Unknown Terminal]';
    
                        console.log("📌 Terminal dropdown change triggered:", { newValue, terminalName });
    
                        // Update terminal name and ID using our safe helper methods 
                        const terminalColIdx = getColumnIndex(table, 'terminal');
                        const terminalIDColIdx = getColumnIndex(table, 'terminalID');
                        
                        // Disable automatic cell move on change
                        const prevMoveLock = moveLock;
                        moveLock = true;
                        
                        // Update data without redrawing yet
                        if (terminalColIdx !== -1) {
                            safeUpdateCell(table, cell.index().row, terminalColIdx, terminalName);
                        }
                        
                        if (terminalIDColIdx !== -1) {
                            safeUpdateCell(table, cell.index().row, terminalIDColIdx, Number(newValue));
                        }
                        
                        // Now we can draw once
                        preserveScrollPosition(() => {
                            try {
                                table.draw(false);
                            } catch (err) {
                                console.warn("⚠️ Terminal update draw failed:", err);
                            }
                        });
    
                        // Save both to backend
                        Promise.all([
                            patchField(rowID, 'TerminalID', String(newValue)),
                            terminalName && terminalName !== '[Unknown Terminal]' ? 
                                patchField(rowID, 'Terminal', terminalName) : Promise.resolve()
                        ]).then(() => {
                            console.log(`✅ Terminal + TerminalID PATCH complete for container ${rowID}`);
                            showToast('✅ Terminal updated', 'success');
                            
                            // Safely clean up cell state
                            $(cell.node()).removeClass('editing processing-update');
                            
                            // Restore move lock state and move to next field
                            moveLock = prevMoveLock;
                            setTimeout(() => moveToNextEditable(cell.node()), 100);
                            
                        }).catch(err => {
                            console.error(`❌ PATCH failed:`, err);
                            showToast('❌ Failed to update terminal info', 'danger');
                            
                            // Still clean up even on error
                            $(cell.node()).removeClass('editing processing-update');
                            moveLock = prevMoveLock;
                        });
                    }, 50);
                });
            }

            if (fieldName === 'vesselName') {
                input.on('change', function () {
                    // Handle the same way as above to prevent duplicates
                    const $this = $(this);
                    if ($this.data('change-handled')) return;
                    $this.data('change-handled', true);
                    
                    setTimeout(() => {
                        const newValue = $this.val();
                        const match = isDropdownField.find(opt => opt.value == newValue);
                        const vesselNameValue = match ? match.label : '[Unknown vesselName]';
    
                        console.log("📌 vesselName dropdown change triggered:", { newValue, vesselNameValue });
    
                        // Update vessel name and ID using our safe helper methods
                        const vesselNameColIdx = getColumnIndex(table, 'vesselName');
                        const vesselIDColIdx = getColumnIndex(table, 'vesselID');
                        
                        // Disable automatic cell move on change 
                        const prevMoveLock = moveLock;
                        moveLock = true;
                        
                        // Update data without redrawing yet
                        if (vesselNameColIdx !== -1) {
                            safeUpdateCell(table, cell.index().row, vesselNameColIdx, vesselNameValue);
                        }
                        
                        if (vesselIDColIdx !== -1) {
                            safeUpdateCell(table, cell.index().row, vesselIDColIdx, Number(newValue));
                        }
                        
                        // Now draw once
                        preserveScrollPosition(() => {
                            try {
                                table.draw(false);
                            } catch (err) {
                                console.warn("⚠️ Vessel name update draw failed:", err);
                            }
                        });
    
                        // Save both to backend
                        Promise.all([
                            patchField(rowID, 'VesselID', String(newValue)),
                            vesselNameValue && vesselNameValue !== '[Unknown Vessel Name]' ? 
                                patchField(rowID, 'VesselName', vesselNameValue) : Promise.resolve()
                        ]).then(() => {
                            console.log(`✅ VesselName + VesselID PATCH complete for container ${rowID}`);
                            showToast('✅ VesselName updated', 'success');
                            
                            // Safely clean up cell state
                            $(cell.node()).removeClass('editing processing-update');
                            
                            // Restore move lock state and move to next
                            moveLock = prevMoveLock;
                            setTimeout(() => moveToNextEditable(cell.node()), 100);
                            
                        }).catch(err => {
                            console.error(`❌ PATCH failed:`, err);
                            showToast('❌ Failed to update vessel name info', 'danger');
                            
                            // Still clean up even on error
                            $(cell.node()).removeClass('editing processing-update');
                            moveLock = prevMoveLock;
                        });
                    }, 50);
                });
            }
            
            if (isDateField) {
                flatpickr(input[0], {
                    dateFormat: 'm/d/Y',
                    allowInput: true,
                    onChange: function(selectedDates, dateStr) {
                        // Trigger blur so your handler sees the change
                        input.trigger('blur');
                    }
                });
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
                        const parsed = new Date(newValue);
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
                        const skipFields = ['carrier', 'shipline', 'fpm', 'portOfEntry', 'terminal', 'vesselLine', 'vesselName'];
                        if (!skipFields.includes(fieldName)) {
                            patchField(rowID, fieldName.charAt(0).toUpperCase() + fieldName.slice(1), newValue)
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
            });

            input.on('blur', function () {
                if (preventBlur) return;
                
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
            
                    if (fieldName === 'terminal' && Array.isArray(isDropdownField)) {
                        const matchedOption = isDropdownField.find(opt => opt.value == newValue);
                        displayValue = matchedOption ? matchedOption.label : newValue;
                    } else if (fieldName === 'vesselName' && Array.isArray(isDropdownField)) {
                        const matchedOption = isDropdownField.find(opt => opt.value == newValue);
                        displayValue = matchedOption ? matchedOption.label : newValue;
                    } else if (isDateField && newValue) {
                        const parsed = new Date(newValue);
                        if (!isNaN(parsed.getTime())) {
                            formattedValue = parsed.toISOString();
                            displayValue = parsed.toLocaleDateString();
                        } else {
                            formattedValue = originalValue;
                        }
                    } else if (!isDateField && newValue !== originalValue) {
                        displayValue = formattedValue = newValue;
                    }
            
                    // Skip all processing if handlers already took care of this field
                    const skipFields = ['carrier', 'shipline', 'fpm', 'portOfEntry', 'terminal', 'vesselLine', 'vesselName'];
                    if (skipFields.includes(fieldName) && formattedValue !== originalValue) {
                        console.warn(`⚠️ Skipping fallback PATCH — ${fieldName} already patched on change.`);
                        return;
                    }
                    
                    if (formattedValue !== originalValue) {
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
                                    })
                                    .catch(err => {
                                        console.error(`❌ Failed to save ${fieldName}`, err);
                                        $(cell.node()).removeClass('processing-update');
                                    });
                            }
                        });
                    } else {
                        // Just reset to original value if not changed
                        addToUpdateQueue(() => {
                            if (cell && cell.node() && document.body.contains(cell.node())) {
                                cell.data(originalValue);
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
        const selectedId = config.idLookup[selectedLabel];
    
        if (!selectedId) {
            console.warn(`⚠️ ${fieldName} name not recognized:`, selectedLabel);
            return;
        }
    
        const rowIdx = cell.index().row;
        const cellNode = cell.node();
    
        // Check if the cell is still attached to the DOM
        if (!cellNode || !document.body.contains(cellNode)) {
            console.warn(`⛔ Skipped update — cell DOM not in document for ${fieldName}`);
            return;
        }
    
        // Detach all event handlers and mark cell as being processed
        $(cellNode).off('blur change').addClass('processing-update');
    
        // Use a safer approach to update the visible cell
        // Just update data without redraw yet
        cell.data(selectedLabel);
    
        // Update the ID in the hidden column using direct index access
        const idColIdx = getColumnIndex(table, config.idColumn);
        if (idColIdx !== -1) {
            // Update data without redrawing yet
            table.cell(rowIdx, idColIdx).data(selectedId);
        }
    
        // Now prepare the PATCH requests, but don't send them until we've updated the DOM safely
        const patchRequests = config.patchFields.map((field, i) => {
            const value = i === 0 ? selectedLabel : String(selectedId);
            return {
                containerID: rowID,
                field: field,
                value: value
            };
        });
    
        // Remove editing state before we redraw
        $(cellNode).removeClass('editing');
    
        // Now that we've updated all the data, perform a single redraw in a way that preserves the scroll position
        preserveScrollPosition(() => {
            try {
                table.draw(false);
            } catch (err) {
                console.warn("⚠️ Draw failed, using safer approach:", err);
                
                // If the draw fails, try a gentler approach with invalidation
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
    
        // Now that the DOM is updated, send all the PATCH requests
        const sendPatchRequests = async () => {
            try {
                // Send all patch requests in sequence to avoid race conditions
                for (const payload of patchRequests) {
                    await fetch('http://localhost:5062/api/containers/update-field', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                
                showToast(`✅ ${fieldName} updated`, 'success');
                
                // Run any post-update handlers if needed
                if (config.onPatchComplete) {
                    // Use setTimeout to ensure this runs after the current event cycle
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
                // Always remove the processing class when done
                $(cellNode).removeClass('processing-update');
            }
        };
    
        // Use setTimeout to ensure DOM operations complete before network requests
        setTimeout(sendPatchRequests, 50);
    
        // Only call moveToNextEditable after everything else has settled
        setTimeout(() => {
            if (cellNode && document.body.contains(cellNode)) {
                moveToNextEditable(cellNode);
            }
        }, 100);
    }
});