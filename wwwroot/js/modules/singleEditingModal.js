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
            originalContainerData = { ...data };

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
    
        const convertIdToString = (value) => {
            return value ? String(value) : null;
        };
        
        const containerID = $('#editContainerID').val();
        const changedFields = [];
        
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
        // When getting the selected vessel name, handle the [Blank] option
        const selectedVesselName = $('#editVesselNameSelect').find(':selected').text() === '[Blank]' 
            ? '' 
            : $('#editVesselNameSelect').find(':selected').data('name');
    
        const compareField = (field, newVal) => {
            const originalVal = originalContainerData[field];
            const cleanedNewVal = newVal === '' ? null : newVal;
    
            if (
                originalVal !== cleanedNewVal &&
                !(originalVal == null && cleanedNewVal === null)
            ) {
                changedFields.push({ field, value: cleanedNewVal });
            }
        };
    
        const getCheckboxValue = (checked) => {
            return checked ? 'Yes' : 'No';
        };
    
        // Validation section
        const originalVesselLineID = originalContainerData.vesselLineID;
        const originalPortID = originalContainerData.portID;
        
        // In the validation section, you might want to require "UNKNOWN" vessel name when "UNKNOWN" vessel line is selected
        const vesselLineText = $('#editVesselLineSelect').find(':selected').text().trim();
        if (vesselLineID !== String(originalVesselLineID) && 
            vesselLineID && 
            !vesselID &&
            vesselLineText !== 'UNKNOWN') {  // Still allow empty vessel name for UNKNOWN
            showToast('⚠️ When changing Vessel Line, you must also select a Vessel Name.', 'warning');
            return;
        }
        
        // Similar validation for Port/Terminal
        if (portID !== String(originalPortID) && portID && !terminalID) {
            showToast('⚠️ When changing Port of Entry, you must also select a Terminal.', 'warning');
            return;
        }

        // 👆 END OF VALIDATION
    
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
        compareField('LoadToRail', $('#editLoadToRailDate').val());
        compareField('RailDeparture', $('#editRailDepartureDate').val());
        compareField('RailETA', $('#editRailETADate').val());
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
        compareField('Sail', $('#editSailDate').val() || null);

        compareField('Arrival', $('#editArrivalDate').val() || null);
        compareField('Berth', $('#editBerthDate').val() || null);
        compareField('Offload', $('#editOffloadDate').val() || null);
    
        compareField('Available', $('#editAvailableDate').val() || null);
        compareField('PickupLFD', $('#editPickupLFDDate').val() || null);
        compareField('PortRailwayPickup', $('#editPortRailwayPickupDate').val() || null);
        compareField('ReturnLFD', $('#editReturnLFDDate').val() || null);
        compareField('Delivered', $('#editDeliveredDate').val() || null);
        compareField('Returned', $('#editReturnedDate').val() || null);
    
        compareField('Notes', $('#editNotes').val());
        compareField('LastUpdated', $('#editLastUpdatedDate').val() || null);
    
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
    
        if (changedFields.length === 0) {
            showToast("ℹ️ No changes to save.", "info");
            return;
        }
    
        // Send PATCH requests only for changed fields
        const patchCalls = changedFields.map(({ field, value }) => {
            return $.ajax({
                url: 'http://localhost:5062/api/containers/update-field',
                method: 'PATCH',
                contentType: 'application/json',
                data: JSON.stringify({ containerID, field, value })
            });
        });
    
        Promise.all(patchCalls)
            .then(() => {
                bootstrap.Modal.getInstance(document.getElementById('editContainerModal')).hide();
                $('#ContainerList').DataTable().ajax.reload(null, false);
                showToast("✅ Changes saved successfully!", "success");
            })
            .catch((err) => {
                console.error(err);
                showToast("❌ Failed to save changes.", "danger");
            });
    });
});

