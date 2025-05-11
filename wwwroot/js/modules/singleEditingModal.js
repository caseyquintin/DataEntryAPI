// singleEditingModal.js

let originalContainerData = {};

// Reusable: dropdown for simple string arrays (e.g., ['Actual', 'Estimate'])
function populateDropdown($select, options, value) {
    $select.empty().append(`<option value="">-- Choose --</option>`);
    options.forEach(opt => {
        $select.append(`<option value="${opt}">${opt}</option>`);
    });
    $select.val(value || '');
}

// Update populateDropdownFromObjects to include data-name attribute
function populateDropdownFromObjects($select, items, selectedValue, valueKey = 'id', textKey = 'name') {
    $select.empty().append('<option value="">-- Choose --</option>');

    items.forEach(item => {
        const value = item[valueKey];
        const text = item[textKey];
        // Add data-name attribute
        $select.append(`<option value="${value}" data-name="${text}">${text}</option>`);
    });

    $select.val(selectedValue || '');
}

// Reusable: safely set checkbox from Yes/No string
function setCheckboxFromValue($checkbox, value) {
    const val = (value || '').toLowerCase();
    $checkbox.prop('checked', val === 'yes');
}

document.addEventListener('DOMContentLoaded', function () {

    // ⏱ Init all date fields using a class
    const dateFields = [
        "#editLoadToRailDate", "#editRailDepartureDate", "#editRailETADate",
        "#editSailDate", "#editArrivalDate", "#editBerthDate", "#editOffloadDate",
        "#editAvailableDate", "#editPickupLFDDate", "#editPortRailwayPickupDate",
        "#editReturnLFDDate", "#editDeliveredDate", "#editReturnedDate", "#editLastUpdatedDate"
    ];
    dateFields.forEach(sel => flatpickr(sel, {
        allowInput: true,
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "m/d/Y"
    }));

    $('#ContainerList').on('click', '.edit-modal-btn', async function () {
        const containerID = $(this).data('id');
        $('#editContainerForm')[0].reset();
        $('#editContainerID').val(containerID);
    
        try {
            const data = await $.get(`http://localhost:5062/api/containers/${containerID}`);
            console.log('🔍 DEBUG: Loaded container data:', data);
            console.log('🔍 DEBUG: Current LastUpdated value:', data.lastUpdated);
            
            originalContainerData = { ...data };
            console.log('🔍 DEBUG: Original container data stored:', originalContainerData);

            // Simple dropdowns
            populateDropdown($('#editCurrentStatusSelect'), statusOptions, data.currentStatus);
            populateDropdown($('#editContainerSizeSelect'), containerSizeOptions, data.containerSize);
            populateDropdown($('#editMainSourceSelect'), mainSourceOptions, data.mainSource);
            populateDropdown($('#editSailActualSelect'), actualOrEstimateOptions, data.sailActual);
            populateDropdown($('#editArrivalActualSelect'), actualOrEstimateOptions, data.arrivalActual);
            populateDropdown($('#editBerthActualSelect'), actualOrEstimateOptions, data.berthActual);
            populateDropdown($('#editOffloadActualSelect'), actualOrEstimateOptions, data.offloadActual);

            // Checkboxes
            setCheckboxFromValue($('#editTransloadBoolean'), data.transload);
            setCheckboxFromValue($('#editRailBoolean'), data.rail);

            // Shipline / FPM / Carrier dropdowns
            populateDropdownFromObjects($('#editShiplineSelect'), shiplineOptions, data.shiplineID);
            populateDropdownFromObjects($('#editFPMSelect'), fpmOptions, data.fpmID);
            populateDropdownFromObjects($('#editCarrierSelect'), carrierOptions, data.carrierID);

            // Vessel line
            populateDropdownFromObjects($('#editVesselLineSelect'), vesselLineOptions, data.vesselLineID);
            const $vesselNameSelect = $('#editVesselNameSelect');

            if (data.vesselLineID) {
                const vesselLineText = $('#editVesselLineSelect').find(':selected').text().trim();
                
                // If vessel line is "UNKNOWN", only show "UNKNOWN" as vessel name
                if (vesselLineText === 'UNKNOWN') {
                    $vesselNameSelect.empty()
                        .append('<option value="">-- Select Vessel Name --</option>')
                        .append('<option value="" data-name="UNKNOWN">UNKNOWN</option>');
                    
                    // If the vessel name is "UNKNOWN", select it
                    if (data.vesselName === 'UNKNOWN') {
                        $vesselNameSelect.val('');
                        $vesselNameSelect.find('option:contains("UNKNOWN")').prop('selected', true);
                    }
                    
                    $vesselNameSelect.prop('disabled', false);
                } else {
                    // Normal vessel line - load actual vessel names
                    try {
                        const vesselNames = await fetchVesselNamesByVesselLineId(data.vesselLineID);
                        $vesselNameSelect.empty().append('<option value="">-- Select Vessel Name --</option>');
                        
                        vesselNames.forEach(v => {
                            const selected = v.vesselID === data.vesselID ? 'selected' : '';
                            $vesselNameSelect.append(`<option value="${v.vesselID}" data-name="${v.vesselName}" ${selected}>${v.vesselName}</option>`);
                        });
                        
                        $vesselNameSelect.prop('disabled', false);
                    } catch (err) {
                        console.error("Error loading vessel names:", err);
                        $vesselNameSelect.html('<option value="">Error loading vessels</option>');
                    }
                }
            } else {
                $vesselNameSelect.html('<option value="">-- Select Vessel Name --</option>').prop('disabled', true);
            }

            $('#editVesselLineSelect').off('change').on('change', async function () {
                const selectedId = $(this).val();
                const selectedText = $(this).find(':selected').text().trim();
                
                $vesselNameSelect.empty();
                
                // Always start with the placeholder
                $vesselNameSelect.append('<option value="">-- Select Vessel Name --</option>');
                
                // If "UNKNOWN" vessel line is selected, only show "UNKNOWN" as vessel name option
                if (selectedText === 'UNKNOWN') {
                    $vesselNameSelect.append('<option value="" data-name="UNKNOWN">UNKNOWN</option>');
                    $vesselNameSelect.prop('disabled', false);
                    return;
                }
                
                if (!selectedId) {
                    $vesselNameSelect.prop('disabled', true);
                    return;
                }
                
                // For all other vessel lines, load the actual vessel names
                $vesselNameSelect.append('<option value="">Loading...</option>');
                
                try {
                    const names = await fetchVesselNamesByVesselLineId(selectedId);
                    $vesselNameSelect.empty().append('<option value="">-- Select Vessel Name --</option>');
                    
                    names.forEach(n => {
                        $vesselNameSelect.append(`<option value="${n.vesselID}" data-name="${n.vesselName}">${n.vesselName}</option>`);
                    });
                    $vesselNameSelect.prop('disabled', false);
                } catch (err) {
                    console.error("Error loading vessel names:", err);
                    $vesselNameSelect.html('<option value="">Error</option>');
                }
            });

            // Ports → Terminals
            const $portSelect = $('#editPortOfEntrySelect');
            const $terminalSelect = $('#editTerminalSelect');
            
            populateDropdownFromObjects($portSelect, portOptions, data.portID);
            
            $portSelect.off('change').on('change', async function () {
                const portId = $(this).val();
                $terminalSelect.empty().append('<option value="">Loading...</option>');
            
                if (!portId) {
                    $terminalSelect.html('<option value="">Select a port first...</option>').prop('disabled', true);
                    return;
                }
            
                try {
                    const terminals = await fetchTerminalsByPortId(portId);
                    populateDropdownFromObjects($terminalSelect, terminals, null, 'terminalID', 'terminal');
            
                    // 👇 Set selected Terminal after loading
                    const terminalIDToSet = (portId === data.portID) ? data.terminalID : '';
                    $terminalSelect.val(terminalIDToSet || '');
            
                    $terminalSelect.prop('disabled', false);
                } catch (err) {
                    console.error("Error loading terminals:", err);
                    $terminalSelect.html('<option value="">Error</option>');
                }
            });
            
            // Initial Terminal Load (if a port is pre-selected)
            if (data.portID) {
                $portSelect.trigger('change');
            } else {
                $terminalSelect.prop('disabled', true).html('<option value="">Select a port first...</option>');
            }

            // Plain inputs
            const mapFieldToSelector = {
                Container: '#editContainerNumber',
                bolBookingNumber: '#editBOLBookingNumber',
                railDestination: '#editRailDestination',
                railwayLine: '#editRailwayLine',
                railPickupNumber: '#editRailPickupNumber',
                projectNumber: '#editProjectNumber',
                shipmentNumber: '#editShipmentNumber',
                poNumber: '#editPONumber',
                vendor: '#editVendor',
                vendorIDNumber: '#editVendorIDNumber',
                voyage: '#editVoyage',
                portOfDeparture: '#editPortOfDeparture',
                notes: '#editNotes'
            };

            Object.entries(mapFieldToSelector).forEach(([key, sel]) => {
                $(sel).val(data[key] || '');
            });

            // Flatpickr fields
            dateFields.forEach(sel => {
                const field = sel.replace('#edit', '').replace('Date', '');
                const val = data[field.charAt(0).toLowerCase() + field.slice(1)] || null;
                if ($(sel)[0]._flatpickr) $(sel)[0]._flatpickr.setDate(val);
            });

            new bootstrap.Modal(document.getElementById('editContainerModal')).show();

        } catch (err) {
            console.error('Failed to load container:', err);
            showToast('❌ Could not load container data', 'danger');
        }
    });

    $('#editContainerForm').on('submit', function (e) {
        e.preventDefault();

        const getFlatpickrValue = (selector) => {
            const element = $(selector)[0];
            if (element && element._flatpickr) {
                const fp = element._flatpickr;
                if (fp.selectedDates && fp.selectedDates.length > 0) {
                    return fp.selectedDates[0].toISOString().split('T')[0]; // YYYY-MM-DD format
                }
            }
            return null;
        };
    
        console.log('🔍 DEBUG: Form submission started');
    
        const convertIdToString = (value) => {
            return value ? String(value) : null;
        };
        
        const containerID = $('#editContainerID').val();
        const changedFields = [];
        
        // ✅ NEW: Track if LastUpdated was manually changed
        let lastUpdatedManuallyChanged = false;
        
        // ✅ NEW: Helper function to get current date/time in SQL format
        const getCurrentDateTime = () => {
            const dateTime = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            console.log('🔍 DEBUG: getCurrentDateTime() returns:', dateTime);
            return dateTime;
        };
        
        // Define all the IDs early
        const vesselLineID = $('#editVesselLineSelect').val();
        const vesselID = $('#editVesselNameSelect').val();
        const portID = $('#editPortOfEntrySelect').val();
        const terminalID = $('#editTerminalSelect').val();
        
        // Get other select values
        const $shiplineSelect = $('#editShiplineSelect');
        const selectedShiplineID = $shiplineSelect.val();
        const selectedShiplineName = $shiplineSelect.find(':selected').data('name');
        const $fpmSelect = $('#editFPMSelect');
        const selectedFPMID = $fpmSelect.val();
        const selectedFPMName = $fpmSelect.find(':selected').data('name');
        const selectedVesselLineName = $('#editVesselLineSelect').find(':selected').data('name');
        const selectedVesselName = $('#editVesselNameSelect').find(':selected').text() === '[Blank]' 
            ? '' 
            : $('#editVesselNameSelect').find(':selected').data('name');
    
        // ✅ MODIFIED: Updated compareField function with debugging
        const compareField = (field, newVal) => {
            // Map the field names to match your data properties
            const fieldMapping = {
                'ContainerNumber': 'Container',
                'LastUpdated': 'lastUpdated',
                'CurrentStatus': 'currentStatus',
                'ContainerSize': 'containerSize',
                'MainSource': 'mainSource',
                'Transload': 'transload',
                'Shipline': 'shipline',
                'BOLBookingNumber': 'bolBookingNumber',
                'Rail': 'rail',
                'RailDestination': 'railDestination',
                'RailwayLine': 'railwayLine',
                'LoadToRail': 'loadToRail',
                'RailDeparture': 'railDeparture',
                'RailETA': 'railETA',
                'RailPickupNumber': 'railPickupNumber',
                'FPM': 'fpm',
                'ProjectNumber': 'projectNumber',
                'ShipmentNumber': 'shipmentNumber',
                'PONumber': 'poNumber',
                'Vendor': 'vendor',
                'VendorIDNumber': 'vendorIDNumber',
                'VesselLine': 'vesselLine',
                'VesselName': 'vesselName',
                'Voyage': 'voyage',
                'PortOfDeparture': 'portOfDeparture',
                'Sail': 'sail',
                'Arrival': 'arrival',
                'Berth': 'berth',
                'Offload': 'offload',
                'Available': 'available',
                'PickupLFD': 'pickupLFD',
                'PortRailwayPickup': 'portRailwayPickup',
                'ReturnLFD': 'returnLFD',
                'Delivered': 'delivered',
                'Returned': 'returned',
                'Notes': 'notes',
                'ShiplineID': 'shiplineID',
                'FpmID': 'fpmID',
                'VesselLineID': 'vesselLineID',
                'VesselID': 'vesselID',
                'PortID': 'portID',
                'TerminalID': 'terminalID',
                'CarrierID': 'carrierID',
                'Carrier': 'carrier',
                'SailActual': 'sailActual',
                'ArrivalActual': 'arrivalActual',
                'BerthActual': 'berthActual',
                'OffloadActual': 'offloadActual'
            };

            // Get the actual property name from your data
            const dataField = fieldMapping[field] || (field.charAt(0).toLowerCase() + field.slice(1));
            const originalVal = originalContainerData[dataField];
            
            // For string fields, treat empty string as a valid "cleared" value
            // Convert empty strings to null to match database expectations  
            const cleanedNewVal = (newVal === '' || newVal === null) ? null : newVal;

            // Compare values - consider both null and empty string as "empty"
            const isOriginalEmpty = originalVal === null || originalVal === '';
            const isNewEmpty = cleanedNewVal === null;
            
            // Debug logging for all fields
            console.log(`🔍 DEBUG: Comparing field '${field}' (data field: '${dataField}')`, {
                originalVal,
                newVal,
                cleanedNewVal,
                isOriginalEmpty,
                isNewEmpty,
                areEqual: isOriginalEmpty && isNewEmpty
            });
            
            // If both are empty, no change needed
            if (isOriginalEmpty && isNewEmpty) {
                return;
            }
            
            // If they're different, add to changed fields
            if (originalVal !== cleanedNewVal) {
                console.log(`✅ DEBUG: Field '${field}' has changed`);
                changedFields.push({ field, value: cleanedNewVal });
                
                // Track if LastUpdated itself was manually changed
                if (field === 'LastUpdated') {
                    console.log('🔍 DEBUG: LastUpdated was manually changed');
                    lastUpdatedManuallyChanged = true;
                }
            } else {
                console.log(`❌ DEBUG: Field '${field}' has NOT changed`);
            }
        };
        
        const getCheckboxValue = (checked) => {
            return checked ? 'Yes' : 'No';
        };
    
        // Validation section
        const originalVesselLineID = originalContainerData.vesselLineID;
        const originalPortID = originalContainerData.portID;
        
        const vesselLineText = $('#editVesselLineSelect').find(':selected').text().trim();
        if (vesselLineID !== String(originalVesselLineID) && 
            vesselLineID && 
            !vesselID &&
            vesselLineText !== 'UNKNOWN') {
            showToast('⚠️ When changing Vessel Line, you must also select a Vessel Name.', 'warning');
            return;
        }
        
        if (portID !== String(originalPortID) && portID && !terminalID) {
            showToast('⚠️ When changing Port of Entry, you must also select a Terminal.', 'warning');
            return;
        }
    
        console.log('🔍 DEBUG: Starting field comparisons...');
    
        // Now start comparing all fields...
        compareField('ContainerNumber', $('#editContainerNumber').val());
        compareField('CurrentStatus', $('#editCurrentStatusSelect').val());
        compareField('ContainerSize', $('#editContainerSizeSelect').val());
        compareField('MainSource', $('#editMainSourceSelect').val());
        compareField('Transload', getCheckboxValue($('#editTransloadBoolean').is(':checked')));
        compareField('Shipline', selectedShiplineName);
        compareField('BOLBookingNumber', $('#editBOLBookingNumber').val());
    
        compareField('Rail', getCheckboxValue($('#editRailBoolean').is(':checked')));
        compareField('RailDestination', $('#editRailDestination').val());
        compareField('RailwayLine', $('#editRailwayLine').val());
        compareField('LoadToRail', getFlatpickrValue('#editLoadToRailDate'));
        compareField('RailDeparture', getFlatpickrValue('#editRailDepartureDate'));
        compareField('RailETA', getFlatpickrValue('#editRailETADate'));
        compareField('RailPickupNumber', $('#editRailPickupNumber').val());
    
        compareField('FPM', selectedFPMName);
        compareField('ProjectNumber', $('#editProjectNumber').val());
        compareField('ShipmentNumber', $('#editShipmentNumber').val());
    
        compareField('PONumber', $('#editPONumber').val());
        compareField('Vendor', $('#editVendor').val());
        compareField('VendorIDNumber', $('#editVendorIDNumber').val());
    
        compareField('VesselLine', selectedVesselLineName);
        compareField('VesselName', selectedVesselName);
        compareField('Voyage', $('#editVoyage').val());
        compareField('PortOfDeparture', $('#editPortOfDeparture').val());
        compareField('Sail', getFlatpickrValue('#editSailDate'));
    
        compareField('Arrival', getFlatpickrValue('#editArrivalDate'));
        compareField('Berth', getFlatpickrValue('#editBerthDate'));
        compareField('Offload', getFlatpickrValue('#editOffloadDate'));
    
        compareField('Available', getFlatpickrValue('#editAvailableDate'));
        compareField('PickupLFD', getFlatpickrValue('#editPickupLFDDate'));
        compareField('PortRailwayPickup', getFlatpickrValue('#editPortRailwayPickupDate'));
        compareField('ReturnLFD', getFlatpickrValue('#editReturnLFDDate'));
        compareField('Delivered', getFlatpickrValue('#editDeliveredDate'));
        compareField('Returned', getFlatpickrValue('#editReturnedDate'));
    
        compareField('Notes', $('#editNotes').val());
        compareField('LastUpdated', getFlatpickrValue('#editLastUpdatedDate'));
    
        compareField('ShiplineID', convertIdToString(selectedShiplineID));
        compareField('FpmID', convertIdToString(selectedFPMID));
        compareField('VesselLineID', convertIdToString($('#editVesselLineSelect').val()));
        compareField('VesselID', convertIdToString($('#editVesselNameSelect').val()));
        compareField('PortID', convertIdToString($('#editPortOfEntrySelect').val()));
        compareField('TerminalID', convertIdToString($('#editTerminalSelect').val()));
        compareField('CarrierID', convertIdToString($('#editCarrierSelect').val()));
    
        compareField('SailActual', $('#editSailActualSelect').val());
        compareField('ArrivalActual', $('#editArrivalActualSelect').val());
        compareField('BerthActual', $('#editBerthActualSelect').val());
        compareField('OffloadActual', $('#editOffloadActualSelect').val());
    
        console.log('🔍 DEBUG: Field comparisons complete');
        console.log('🔍 DEBUG: Changed fields so far:', changedFields);
        console.log('🔍 DEBUG: lastUpdatedManuallyChanged:', lastUpdatedManuallyChanged);
    
        // ✅ NEW: Auto-update LastUpdated if any other field changed
        if (changedFields.length > 0 && !lastUpdatedManuallyChanged) {
            console.log('🔍 DEBUG: Auto-updating LastUpdated...');
            
            // Check if we already have LastUpdated in changedFields due to manual change
            const lastUpdatedIndex = changedFields.findIndex(f => f.field === 'LastUpdated');
            console.log('🔍 DEBUG: LastUpdated already in changedFields?', lastUpdatedIndex !== -1);
            
            // If LastUpdated wasn't manually changed, add/update it with current date
            if (lastUpdatedIndex === -1) {
                const newLastUpdatedValue = getCurrentDateTime();
                console.log('🔍 DEBUG: Adding LastUpdated with value:', newLastUpdatedValue);
                changedFields.push({ field: 'LastUpdated', value: newLastUpdatedValue });
            }
        }
    
        console.log('🔍 DEBUG: Final changedFields array:', changedFields);
    
        // ✅ NEW: Remove the automatic LastUpdated if it's the only change
        if (changedFields.length === 1 && changedFields[0].field === 'LastUpdated' && !lastUpdatedManuallyChanged) {
            console.log('🔍 DEBUG: Only LastUpdated changed automatically - skipping save');
            showToast("ℹ️ No changes to save.", "info");
            return;
        }
    
        if (changedFields.length === 0) {
            console.log('🔍 DEBUG: No changes detected');
            showToast("ℹ️ No changes to save.", "info");
            return;
        }
    
        console.log('🔍 DEBUG: Sending PATCH requests for:', changedFields);
    
        // Send PATCH requests only for changed fields
        const patchCalls = changedFields.map(({ field, value }) => {
            console.log(`🔍 DEBUG: Creating PATCH request for field '${field}' with value:`, value);
            return $.ajax({
                url: 'http://localhost:5062/api/containers/update-field',
                method: 'PATCH',
                contentType: 'application/json',
                data: JSON.stringify({ containerID, field, value })
            });
        });
    
        Promise.all(patchCalls)
            .then(() => {
                console.log('✅ DEBUG: All PATCH requests successful');
                bootstrap.Modal.getInstance(document.getElementById('editContainerModal')).hide();
                $('#ContainerList').DataTable().ajax.reload(null, false);
                showToast("✅ Changes saved successfully!", "success");
            })
            .catch((err) => {
                console.error('❌ DEBUG: PATCH request failed:', err);
                showToast("❌ Failed to save changes.", "danger");
            });
    });
});