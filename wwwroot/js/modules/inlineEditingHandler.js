// inlineEditingHandler.js
// This file handles all inline editing functionality for the container table

/**
 * TableEditor - Main class to handle inline editing for DataTables
 */
class TableEditor {
    constructor(tableSelector) {
        this.tableSelector = tableSelector;
        this.lastEditingCell = null;
        this.moveLock = false;
        this.updateQueue = [];
        this.isProcessingQueue = false;
        this.preventBlur = false;
        
        // Non-editable fields that should be skipped in inline editing
        this.nonEditableFields = [
            'containerID',
            'shiplineID',
            'fpmID',
            'vesselLineID',
            'vesselID',
            'portID',
            'terminalID',
            'carrierID'
        ];
        
        // Lookup objects for ID mappings
        this.lookups = {
            vesselIdByName: {},
            terminalIdByName: {}
        };
        
        // Configuration for linked fields (fields that update related ID fields)
        this.linkedFieldHandlers = this.initLinkedFieldHandlers();
        
        // Date fields need special handling
        this.dateFields = [
            'arrival', 'available', 'berth', 'delivered', 'lastUpdated', 'loadToRail',
            'offload', 'pickupLFD', 'portRailwayPickup', 'railDeparture', 'railETA',
            'returned', 'returnLFD', 'sail'
        ];
    }
    
    /**
     * Initialize linked field handlers configuration
     * Each linked field has a display value and an ID value that must be kept in sync
     */
    initLinkedFieldHandlers() {
        return {
            carrier: {
                idColumn: 'carrierID',
                get idLookup() { return window.carrierIdByName; },  // Dynamic getter
                patchFields: ['Carrier', 'CarrierID']
            },
            fpm: {
                idColumn: 'fpmID',
                get idLookup() { return window.fpmIdByName; },  // Dynamic getter
                patchFields: ['FPM', 'FpmID']
            },
            shipline: {
                idColumn: 'shiplineID',
                get idLookup() { return window.shiplineIdByName; },  // Dynamic getter
                patchFields: ['Shipline', 'ShiplineID']
            },
            portOfEntry: {
                idColumn: 'portID',
                get idLookup() { return window.portIdByName; },  // Dynamic getter
                patchFields: ['PortOfEntry', 'PortID'],
                onPatchComplete: (table, rowID, rowIdx) => {
                    try {
                        // When port changes, we need to clear the terminal fields
                        const terminalColIdx = this.getColumnIndex(table, 'terminal');
                        const terminalIDColIdx = this.getColumnIndex(table, 'terminalID');
                        
                        if (terminalColIdx !== -1 && terminalIDColIdx !== -1) {
                            this.addToUpdateQueue(() => {
                                this.safeUpdateCell(table, rowIdx, terminalColIdx, '');
                                this.safeUpdateCell(table, rowIdx, terminalIDColIdx, '');
                            });
                        }
                    } catch (err) {
                        console.error("❌ Error in portOfEntry handler:", err);
                    }
                }
            },
            vesselLine: {
                idColumn: 'vesselLineID',
                get idLookup() { return window.vesselLineIdByName; },  // Dynamic getter
                patchFields: ['VesselLine', 'VesselLineID'],
                onPatchComplete: (table, rowID, rowIdx) => {
                    try {
                        // When vessel line changes, clear vessel name fields
                        const vesselNameColIdx = this.getColumnIndex(table, 'vesselName');
                        const vesselIDColIdx = this.getColumnIndex(table, 'vesselID');
                        
                        if (vesselNameColIdx !== -1 && vesselIDColIdx !== -1) {
                            this.addToUpdateQueue(() => {
                                this.safeUpdateCell(table, rowIdx, vesselNameColIdx, '');
                                this.safeUpdateCell(table, rowIdx, vesselIDColIdx, '');
                            });
                        }
                    } catch (err) {
                        console.error("❌ Error in vesselLine handler:", err);
                    }
                }
            },
            vesselName: {
                idColumn: 'vesselID',
                get idLookup() { return this.lookups.vesselIdByName; },
                patchFields: ['VesselName', 'VesselID']
            },
            terminal: {
                idColumn: 'terminalID',
                get idLookup() { return this.lookups.terminalIdByName; },
                patchFields: ['Terminal', 'TerminalID']
            }
        };
    }
    
    /**
     * Initialize all event handlers on the table
     */
    initialize() {
        $(document).ready(() => {
            // Register click handler for editable cells
            $(this.tableSelector).on('click', 'td.editable', (e) => this.handleCellClick(e));
            
            // Cleanup stuck editing cells if user clicks outside too fast
            $(this.tableSelector).on('mousedown', (e) => this.cleanupStuckEditors(e));
            
            console.log("✅ TableEditor initialized on", this.tableSelector);
        });
    }
    
    /**
     * Main handler for clicking an editable cell
     */
    async handleCellClick(e) {
        console.log("🖱️ Editable cell clicked");
        
        // Fade any highlighted rows after a delay
        setTimeout(() => {
            this.fadeNewRowHighlights();
        }, 5000);

        // Find the cell that was clicked
        const cellElement = e.currentTarget;
        const table = $(this.tableSelector).DataTable();
        
        // Skip if we're already processing or cell is being processed
        if ($(`${this.tableSelector} td.editing`).length > 0 || $(cellElement).hasClass('processing-update')) {
            return;
        }
        
        const cell = table.cell(cellElement);
        const originalValue = cell.data();
        const rowData = table.row(cellElement).data();
        const fieldIndex = cell.index().column;
        const fieldName = table.settings().init().columns[fieldIndex].data;
        
        // Skip read-only fields
        if (this.nonEditableFields.includes(fieldName)) {
            console.log(`🔒 Skipping inline edit for read-only field: ${fieldName}`);
            return;
        }
        
        console.log("📌 Field name clicked:", fieldName);
        const rowID = rowData.containerID;

        // Don't re-enter editing mode
        if ($(cellElement).hasClass('editing')) return;

        // Close any open editors first
        this.closeOpenEditors(table);

        $(cellElement).addClass('editing');
        this.lastEditingCell = cellElement;

        // Determine field type and create appropriate input
        const isDateField = this.dateFields.includes(fieldName);
        const dropdownOptions = await this.getDropdownOptions(fieldName, cell);
        
        let inputHtml = this.createInputElement(fieldName, originalValue, isDateField, dropdownOptions);
        cell.node().innerHTML = `<div style="min-width: 100px;">${inputHtml}</div>`;

        // Get the new input element and focus it
        const input = $('input, select', cellElement);
        requestAnimationFrame(() => {
            input.focus().trigger('mousedown');
        });

        // Add specialized event handlers based on field type
        if (this.linkedFieldHandlers[fieldName]) {
            this.setupLinkedFieldHandlers(input, cell, table, fieldName, rowID);
        } else if (fieldName === 'terminal') {
            this.setupTerminalHandlers(input, cell, table, fieldName, rowID, dropdownOptions);
        } else if (fieldName === 'vesselName') {
            this.setupVesselNameHandlers(input, cell, table, fieldName, rowID, dropdownOptions);
        }

        // Setup date picker if needed
        if (isDateField) {
            this.setupDatePicker(input, originalValue, cell, table, fieldName, rowID);
        }

        // Add keyboard event handlers for all inputs
        this.setupKeyboardHandlers(input, originalValue, cell, table, fieldName, rowID, isDateField);
        
        // Setup blur handler for handling when user clicks outside
        this.setupBlurHandler(input, originalValue, cell, table, fieldName, rowID, isDateField);
    }
    
    /**
     * Create the appropriate input element based on field type
     */
    createInputElement(fieldName, originalValue, isDateField, dropdownOptions) {
        if (Array.isArray(dropdownOptions) && dropdownOptions.length > 0) {
            const normalizedOriginal = String(originalValue).trim();
            
            return `<select class="form-select form-select-sm">` +
            dropdownOptions.map(opt => {
                const label = typeof opt === 'string' ? opt : opt.label;
                const value = typeof opt === 'string' ? opt : opt.value;
                const isSelected = (String(label).trim() === normalizedOriginal) ? 'selected' : '';
                return `<option value="${value}" ${isSelected}>${label}</option>`;
            }).join('') +
            `</select>`;
        } else if (Array.isArray(dropdownOptions) && dropdownOptions.length === 0) {
            console.warn("⚠️ No dropdown options found for field:", fieldName);
            return `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}" placeholder="No options available">`;
        } else if (isDateField) {
            const value = originalValue ? new Date(originalValue).toLocaleDateString('en-US') : '';
            return `<input type="text" class="form-control form-control-sm date-field" value="${value}">`;                
        } else {
            return `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}">`;
        }
    }
    
    /**
     * Fetch dropdown options for a field - may need to call APIs
     */
    async getDropdownOptions(fieldName, cell) {
        const table = $(this.tableSelector).DataTable();
        
        // For most fields, we can use the global options arrays
        if (fieldName === 'currentStatus') {
            return window.statusOptions;
        } else if (fieldName === 'carrier') {
            return window.carrierOptions.map(c => c.name);
        } else if (['arrivalActual', 'berthActual', 'offloadActual', 'sailActual'].includes(fieldName)) {
            return window.actualOrEstimateOptions;
        } else if (['rail', 'transload'].includes(fieldName)) {
            return window.booleanOptions;
        } else if (fieldName === 'containerSize') {
            return window.containerSizeOptions;
        } else if (fieldName === 'mainSource') {
            return window.mainSourceOptions;
        } else if (fieldName === 'fpm') {
            return window.fpmOptions.map(f => f.name);                
        } else if (fieldName === 'shipline') {
            return window.shiplineOptions.map(s => s.name);
        } else if (fieldName === 'portOfEntry') {
            return window.portOptions.map(p => p.name);
        } else if (fieldName === 'vesselLine') {
            return window.vesselLineOptions.map(v => v.name);
        } else if (fieldName === 'terminal') {
            return await this.fetchTerminalOptions(cell);
        } else if (fieldName === 'vesselName') {
            return await this.fetchVesselNameOptions(cell);
        }
        
        return null;
    }
    
    /**
     * Fetch terminal options from the API based on selected port
     */
    async fetchTerminalOptions(cell) {
        const table = $(this.tableSelector).DataTable();
        const updatedRow = table.row(cell.index().row).data();
        let portId = updatedRow.portID;
        
        // Check if the user previously changed portOfEntry
        const portEntryName = updatedRow.portOfEntry;
        const matchedPort = window.portOptions.find(p => p.name === portEntryName);
        
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
                
                // Clear and populate the lookup object
                this.lookups.terminalIdByName = {};
                data.forEach(terminal => {
                    this.lookups.terminalIdByName[terminal.terminal] = terminal.terminalID;
                    console.log(`🔍 Adding terminal to lookup: "${terminal.terminal}" → ${terminal.terminalID}`);
                });
                
                // Create dropdown options
                return data.map(t => ({
                    value: t.terminal,
                    label: t.terminal
                }));
                
            } catch (err) {
                console.error(`❌ Failed to fetch terminals for port ID ${portId}`, err);
                showToast("❌ Failed to load terminals for selected port.", "danger");
                return [];
            }
        } else {
            console.warn("⚠️ No portID available on this row");
            return [];
        }
    }
    
    /**
     * Fetch vessel name options from the API based on selected vessel line
     */
    async fetchVesselNameOptions(cell) {
        const table = $(this.tableSelector).DataTable();
        const updatedRow = table.row(cell.index().row).data();
        let vesselLineId = updatedRow.vesselLineID;
        
        // Check if the user previously changed vesselLine
        const vesselLineName = updatedRow.vesselLine;
        const matchedVesselLine = window.vesselLineOptions.find(v => v.name === vesselLineName);
        
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
                
                // Clear and populate the lookup object
                this.lookups.vesselIdByName = {};
                data.forEach(vessel => {
                    this.lookups.vesselIdByName[vessel.vesselName] = vessel.vesselID;
                    console.log(`🔍 Adding vessel to lookup: "${vessel.vesselName}" → ${vessel.vesselID}`);
                });
                
                // Create dropdown options
                return data.map(n => ({
                    value: n.vesselName,
                    label: n.vesselName
                }));
                
            } catch (err) {
                console.error(`❌ Failed to fetch vessel name for vessel line ID ${vesselLineId}`, err);
                showToast("❌ Failed to load vessel names for selected vessel line.", "danger");
                return [];
            }
        } else {
            console.warn("⚠️ No vesselLineId available on this row");
            return [];
        }
    }
    
    /**
     * Set up event handlers for linked fields (fields that update related ID fields)
     */
    setupLinkedFieldHandlers(input, cell, table, fieldName, rowID) {
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
            }
        });
        
        // Only handle change if we're not in the middle of typing to search
        input.on('change', () => {
            // Skip if we're still typing to search
            if (isTypingToSearch) {
                return;
            }
            
            // Mark that we've registered this change
            const $input = $(input);
            if ($input.data('change-handled')) return;
            $input.data('change-handled', true);
            
            // Process on next tick to avoid event overlap
            setTimeout(() => {
                this.handleLinkedDropdownChange(input, cell, table, fieldName, rowID);
            }, 50);
        });
        
        // Add blur handler to catch selections made by typing
        input.on('blur', () => {
            const currentValue = $(input).val();
            
            // Check if the value changed from the original
            if (currentValue !== originalSelectedValue && !$(input).data('change-handled')) {
                // Mark as handled to prevent duplicate processing
                $(input).data('change-handled', true);
                
                // Process the change
                setTimeout(() => {
                    this.handleLinkedDropdownChange(input, cell, table, fieldName, rowID);
                }, 50);
            }
        });
    }
    
    /**
     * Set up event handlers for the terminal field
     */
    setupTerminalHandlers(input, cell, table, fieldName, rowID, dropdownOptions) {
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
        
        // Handle change events
        input.on('change', () => {
            // Skip if we're still typing to search
            if (isTypingToSearch) {
                return;
            }
            
            // Handle to prevent duplicates
            const $input = $(input);
            if ($input.data('change-handled')) return;
            $input.data('change-handled', true);
            
            setTimeout(() => {
                const newValue = $(input).val();
                const match = dropdownOptions.find(opt => opt.value == newValue);
                const terminalName = match ? match.label : '[Unknown Terminal]';
                
                // Update both Terminal and TerminalID
                const terminalId = this.lookups.terminalIdByName[terminalName];
                
                if (terminalId) {
                    // Send patches for both fields
                    Promise.all([
                        this.patchField(rowID, 'Terminal', terminalName),
                        this.patchField(rowID, 'TerminalID', terminalId)
                    ]).then(() => {
                        showToast(`✅ Terminal updated`, 'success');
                    });
                } else {
                    // Just update the terminal name without ID
                    this.patchField(rowID, 'Terminal', terminalName)
                        .then(() => {
                            showToast(`✅ Terminal updated`, 'success');
                        });
                }
            }, 50);
        });
        
        // Add blur handler
        input.on('blur', () => {
            const currentValue = $(input).val();
            
            // Check if the value changed and hasn't been handled yet
            if (currentValue !== originalSelectedValue && !$(input).data('change-handled')) {
                $(input).data('change-handled', true);
                
                setTimeout(() => {
                    const newValue = currentValue;
                    const match = dropdownOptions.find(opt => opt.value == newValue);
                    const terminalName = match ? match.label : '[Unknown Terminal]';
                    
                    // Update both Terminal and TerminalID
                    const terminalId = this.lookups.terminalIdByName[terminalName];
                    
                    if (terminalId) {
                        // Send patches for both fields
                        Promise.all([
                            this.patchField(rowID, 'Terminal', terminalName),
                            this.patchField(rowID, 'TerminalID', terminalId)
                        ]).then(() => {
                            showToast(`✅ Terminal updated`, 'success');
                        });
                    } else {
                        // Just update the terminal name without ID
                        this.patchField(rowID, 'Terminal', terminalName)
                            .then(() => {
                                showToast(`✅ Terminal updated`, 'success');
                            });
                    }
                }, 50);
            }
        });
    }
    
    /**
     * Set up event handlers for the vessel name field
     */
    setupVesselNameHandlers(input, cell, table, fieldName, rowID, dropdownOptions) {
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
        
        // Handle change events
        input.on('change', () => {
            // Skip if we're still typing to search
            if (isTypingToSearch) {
                return;
            }
            
            // Handle to prevent duplicates
            const $input = $(input);
            if ($input.data('change-handled')) return;
            $input.data('change-handled', true);
            
            setTimeout(() => {
                const newValue = $(input).val();
                const match = dropdownOptions.find(opt => opt.value == newValue);
                const vesselName = match ? match.label : '[Unknown Vessel]';
                
                // Update both VesselName and VesselID
                const vesselId = this.lookups.vesselIdByName[vesselName];
                
                if (vesselId) {
                    // Send patches for both fields
                    Promise.all([
                        this.patchField(rowID, 'VesselName', vesselName),
                        this.patchField(rowID, 'VesselID', vesselId)
                    ]).then(() => {
                        showToast(`✅ Vessel Name updated`, 'success');
                        // Update LastUpdated after both patches succeed
                        this.updateLastUpdatedField(rowID);
                    });
                } else {
                    // Just update the vessel name without ID
                    this.patchField(rowID, 'VesselName', vesselName)
                        .then(() => {
                            showToast(`✅ Vessel Name updated`, 'success');
                            this.updateLastUpdatedField(rowID);
                        });
                }
            }, 50);
        });
        
        // Add blur handler
        input.on('blur', () => {
            const currentValue = $(input).val();
            
            // Check if the value changed and hasn't been handled yet
            if (currentValue !== originalSelectedValue && !$(input).data('change-handled')) {
                $(input).data('change-handled', true);
                
                setTimeout(() => {
                    const newValue = currentValue;
                    const match = dropdownOptions.find(opt => opt.value == newValue);
                    const vesselName = match ? match.label : '[Unknown Vessel]';
                    
                    // Update both VesselName and VesselID
                    const vesselId = this.lookups.vesselIdByName[vesselName];
                    
                    if (vesselId) {
                        // Send patches for both fields
                        Promise.all([
                            this.patchField(rowID, 'VesselName', vesselName),
                            this.patchField(rowID, 'VesselID', vesselId)
                        ]).then(() => {
                            showToast(`✅ Vessel Name updated`, 'success');
                            this.updateLastUpdatedField(rowID);
                        });
                    } else {
                        // Just update the vessel name without ID
                        this.patchField(rowID, 'VesselName', vesselName)
                            .then(() => {
                                showToast(`✅ Vessel Name updated`, 'success');
                                this.updateLastUpdatedField(rowID);
                            });
                    }
                }, 50);
            }
        });
    }
    
    /**
     * Set up flatpickr date picker for date fields
     */
    setupDatePicker(input, originalValue, cell, table, fieldName, rowID) {
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
            onOpen: () => {
                flatpickrActive = true;
                this.preventBlur = true;
            },
            onChange: (selectedDates, dateStr, instance) => {
                if (selectedDates.length > 0) {
                    $(input).data('flatpickr-date', selectedDates[0]);
                    $(input).data('flatpickr-changed', true);
                }
            },
            onClose: (selectedDates, dateStr, instance) => {
                flatpickrActive = false;
                
                if (selectedDates.length > 0 && $(input).data('flatpickr-changed')) {
                    const selectedDate = selectedDates[0];
                    const formattedValue = selectedDate.toISOString();
                    const displayValue = selectedDate.toLocaleDateString('en-US');
                    
                    const originalIso = originalValue ? new Date(originalValue).toISOString() : '';
                    
                    if (formattedValue !== originalIso) {
                        cell.data(displayValue);
                        $(cell.node()).addClass('processing-update');
                        
                        this.patchField(rowID, fieldName.charAt(0).toUpperCase() + fieldName.slice(1), formattedValue)
                            .then(async (success) => {
                                if (success) {
                                    // Only update LastUpdated if we're not editing the LastUpdated field itself
                                    if (fieldName.toLowerCase() !== 'lastupdated') {
                                        try {
                                            await this.updateLastUpdatedField(rowID);
                                            console.log(`✅ LastUpdated field updated for date field ${fieldName}`);
                                        } catch (err) {
                                            console.error(`❌ Failed to update LastUpdated for date field:`, err);
                                        }
                                    }
                                }
                                
                                showToast(`✅ ${fieldName} updated`, 'success');
                                $(cell.node()).removeClass('processing-update');
                                
                                this.preserveScrollPosition(() => {
                                    try {
                                        table.draw(false);
                                    } catch (err) {
                                        console.warn("⚠️ Date update draw failed:", err);
                                    }
                                });
                                
                                $(cell.node()).removeClass('editing');
                                setTimeout(() => this.moveToNextEditable(cell.node()), 100);
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
                    $(input).removeData('flatpickr-changed');
                    $(input).removeData('flatpickr-date');
                }, 200);
                
                // Allow blur after a short delay
                setTimeout(() => {
                    this.preventBlur = false;
                }, 100);
            }
        });
        
        // Store the instance and flag
        $(input).data('flatpickr-instance', fp);
        $(input).data('is-flatpickr-active', () => flatpickrActive);
    }
    
    /**
     * Setup keyboard handlers for all input types
     */
    setupKeyboardHandlers(input, originalValue, cell, table, fieldName, rowID, isDateField) {
        let inputValue = originalValue;
        if (isDateField && originalValue) {
            const parsed = new Date(originalValue);
            inputValue = parsed.toISOString().split('T')[0];
        }

        if (inputValue == null) inputValue = '';

        input.on('keydown', (e) => {
            if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                this.preventBlur = true;

                let newValue = $(input).val().trim();
                if (newValue === 'null') newValue = '';

                if (isDateField && newValue) {
                    let parsed;
                    
                    // First check if there's a flatpickr instance
                    const fpInstance = $(input).data('flatpickr-instance');
                    const fpDate = $(input).data('flatpickr-date');
                    
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
                    this.preserveScrollPosition(() => {
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
                        
                        this.patchField(rowID, fieldNameForPatch, newValue)
                            .catch(err => {
                                console.error(`❌ Failed to save ${fieldName}`, err);
                                showToast(`❌ Failed to update ${fieldName}`, 'danger');
                            });
                    } else {
                        console.warn(`⚠️ Skipping fallback PATCH — ${fieldName} already patched on change.`);
                    }
                } else {
                    // Even if unchanged, just draw to ensure proper display
                    this.preserveScrollPosition(() => {
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
                    this.moveToNextEditable(cell.node());
                }, 100);
            }

            if (e.key === 'Escape') {
                this.preventBlur = true;
                
                // Use addToUpdateQueue to safely handle the update
                this.addToUpdateQueue(() => {
                    if (cell && cell.node() && document.body.contains(cell.node())) {
                        cell.data(originalValue);
                        $(cell.node()).removeClass('editing processing-update');
                    }
                });
            }
        });
    }
    
    /**
     * Handle blur events (clicking outside the input)
     */
    setupBlurHandler(input, originalValue, cell, table, fieldName, rowID, isDateField) {
        input.on('blur', () => {
            if (this.preventBlur) return;
            
            // Check if flatpickr is active
            const isActive = $(input).data('is-flatpickr-active');
            if (isDateField && isActive && isActive()) {
                return;
            }
            
            // For date fields, check if value changed and update LastUpdated
            if (isDateField && $(input).data('flatpickr-changed')) {
                // Get the stored flatpickr date
                const fpDate = $(input).data('flatpickr-date');
                const fpInstance = $(input).data('flatpickr-instance');
                
                if (fpDate && fpInstance) {
                    const formattedValue = fpDate.toISOString();
                    const originalIso = originalValue ? new Date(originalValue).toISOString() : '';
                    
                    if (formattedValue !== originalIso) {
                        // Only update LastUpdated if we're not editing the LastUpdated field itself
                        if (fieldName.toLowerCase() !== 'lastupdated') {
                            this.updateLastUpdatedField(rowID)
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
                $(input).removeData('flatpickr-changed');
                $(input).removeData('flatpickr-date');
                return;
            }
            
            // Prevent multiple blur handlers from firing
            const $input = $(input);
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
                } else if (fieldName === 'terminal' || fieldName === 'vesselName') {
                    // These are handled by their specialized handlers
                    return;
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
                    this.addToUpdateQueue(() => {
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
                            this.patchField(rowID, fieldName.charAt(0).toUpperCase() + fieldName.slice(1), formattedValue)
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
                    this.addToUpdateQueue(() => {
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
    }
    
    /**
     * Process a linked dropdown change (fields that update related ID fields)
     */
    handleLinkedDropdownChange(input, cell, table, fieldName, rowID) {
        const config = this.linkedFieldHandlers[fieldName];
        if (!config) return;

        const selectedLabel = $(input).val();
        const selectedId = config.idLookup[selectedLabel];

        if (!selectedId) {
            return;
        }

        // Create the patchRequests array
        const patchRequests = config.patchFields.map((field, i) => {
            const value = i === 0 ? selectedLabel : String(selectedId);
            return {
                field: field,
                value: value
            };
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
        const idColIdx = this.getColumnIndex(table, config.idColumn);
        if (idColIdx !== -1) {
            table.cell(rowIdx, idColIdx).data(selectedId);
        }

        // Remove editing state before we redraw
        $(cellNode).removeClass('editing');

        // Perform a single redraw that preserves the scroll position
        this.preserveScrollPosition(() => {
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
                    await this.patchField(rowID, patch.field, patch.value);
                }
                
                showToast(`✅ ${fieldName} updated`, 'success');
                
                // Run any post-update handlers if needed
                if (config.onPatchComplete) {
                    setTimeout(() => {
                        try {
                            // Bind this context to the handler
                            config.onPatchComplete.call(this, table, rowID, rowIdx);
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
    
    /**
     * Close any open editors in the table
     */
    closeOpenEditors(table) {
        const $openEditors = $(`${this.tableSelector} td.editing`);
        
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
        this.preserveScrollPosition(() => {
            try {
                table.draw(false);
            } catch (err) {
                console.warn("⚠️ Batch close cells draw failed:", err);
            }
        });
    }
    
    /**
     * Clean up any stuck editors when clicking elsewhere
     */
    cleanupStuckEditors(e) {
        // Don't process if clicking on an active editor or its children
        if ($(e.target).closest('td.editing').length > 0) return;
        
        const table = $(this.tableSelector).DataTable();
        $(`${this.tableSelector} td.editing`).each(function () {
            const td = $(this);
            const input = td.find('input, select');
    
            // Make sure the cell is still valid before updating
            try {
                if (document.body.contains(td[0])) {
                    const tempCell = table.cell(td);
                    if (tempCell && tempCell.node()) {
                        const val = input.val()?.trim() ?? '';
                        
                        // Add to update queue instead of immediate update
                        this.addToUpdateQueue(() => {
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
    }

    /**
     * Move to the next editable cell after finishing with the current one
     */
    moveToNextEditable(currentCell) {
        if (this.moveLock) return; // throttle rapid calls
    
        this.moveLock = true;
    
        // Wrap this in a setTimeout to ensure it happens after current operations
        setTimeout(() => {
            const $cells = $(`${this.tableSelector} td.editable:visible`);
            const currentIndex = $cells.index(currentCell);
            const $next = $cells.eq(currentIndex + 1);
        
            if ($next.length) {
                $next.trigger('click');
        
                requestAnimationFrame(() => {
                    const input = $next.find('input')[0];
                    if (input) input.focus();
                });
            }
        
            setTimeout(() => this.moveLock = false, 100); // 🔁 allow next move after longer delay
        }, 150);
    }
    
    /**
     * Patch a field to the backend API
     */
    async patchField(containerID, field, value) {
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
            
            // Update LastUpdated field (skip if we're already updating LastUpdated)
            // Check both camelCase and PascalCase variations
            if (field.toLowerCase() !== 'lastupdated') {
                // Add a small delay to ensure the main field update is processed first
                setTimeout(async () => {
                    try {
                        await this.updateLastUpdatedField(containerID);
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
    
    /**
     * Update the LastUpdated field of a container
     */
    async updateLastUpdatedField(containerID) {
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
            const table = $(this.tableSelector).DataTable();
            const rowIdx = table.rows().indexes().filter((idx) => {
                return table.row(idx).data().containerID === containerID;
            });
            
            if (rowIdx.length > 0) {
                const lastUpdatedColIdx = this.getColumnIndex(table, 'lastUpdated');
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
    
    /**
     * Add an update function to the queue for safe processing
     */
    addToUpdateQueue(updateFn) {
        this.updateQueue.push(updateFn);
        if (!this.isProcessingQueue) {
            this.processUpdateQueue();
        }
    }

    /**
     * Process the update queue one function at a time
     */
    processUpdateQueue() {
        if (this.updateQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }

        this.isProcessingQueue = true;
        const fn = this.updateQueue.shift();
        
        try {
            // Use preserveScrollPosition to maintain position during the update
            this.preserveScrollPosition(() => {
                fn();
            });

            // After each operation, wait a bit before the next one
            setTimeout(() => this.processUpdateQueue(), 50);
        } catch (err) {
            console.error("❌ Error in update queue:", err);
            this.isProcessingQueue = false;
        }
    }
    
    /**
     * Preserve scroll position during an update
     */
    preserveScrollPosition(action) {
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
    
    /**
     * Get column index by data name
     */
    getColumnIndex(table, columnName) {
        const columns = table.settings()[0].aoColumns;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].data === columnName) {
                return i;
            }
        }
        return -1; // Column not found
    }
    
    /**
     * Safely update a cell value
     */
    safeUpdateCell(table, rowIdx, colIdx, value) {
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
    
    /**
     * Fade out the yellow highlighting of new rows
     */
    fadeNewRowHighlights() {
        // Find rows with table-warning class
        const warningRows = $(`${this.tableSelector} tbody tr.table-warning`);
        
        if (warningRows.length > 0) {
            // Remove the class with a CSS transition
            warningRows.addClass('fade-out-warning');
            
            setTimeout(() => {
                warningRows.removeClass('table-warning fade-out-warning');
            }, 800);
        }
    }
}

// Initialize the table editor
document.addEventListener('DOMContentLoaded', function () {
    // Add CSS for the fade transition
    const style = document.createElement('style');
    style.textContent = `
    .fade-out-warning {
        transition: background-color 0.8s ease;
        background-color: transparent !important;
    }
    `;
    document.head.appendChild(style);
    
    // Create and initialize the table editor
    const editor = new TableEditor('#ContainerList');
    editor.initialize();
    
    // Make the editor accessible globally if needed
    window.tableEditor = editor;
});