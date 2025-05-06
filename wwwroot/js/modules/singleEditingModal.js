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

// Reusable: dropdown for object arrays (e.g., { id, name })
function populateDropdownFromObjects($select, items, selectedValue, valueKey = 'id', textKey = 'name') {
    $select.empty().append('<option value="">-- Choose --</option>');

    items.forEach(item => {
        const value = item[valueKey];
        const text = item[textKey];
        $select.append(`<option value="${value}">${text}</option>`);
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
                const vesselNames = await fetchVesselNamesByVesselLineId(data.vesselLineID);
                $vesselNameSelect.empty().append('<option value="">-- Select Vessel Name --</option>');
                vesselNames.forEach(v => {
                    const selected = v.vesselID === data.vesselID ? 'selected' : '';
                    $vesselNameSelect.append(`<option value="${v.vesselID}" data-name="${v.vesselName}" ${selected}>${v.vesselName}</option>`);
                });
                $vesselNameSelect.prop('disabled', false);
            } else {
                $vesselNameSelect.html('<option value="">Select a Vessel Line first...</option>').prop('disabled', true);
            }

            $('#editVesselLineSelect').off('change').on('change', async function () {
                const selectedId = $(this).val();
                $vesselNameSelect.empty().append('<option value="">Loading...</option>');
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
    
        const containerID = $('#editContainerID').val();
        const changedFields = [];
        const $shiplineSelect = $('#editShiplineSelect');
        const selectedShiplineID = $shiplineSelect.val();
        const selectedShiplineName = $shiplineSelect.find(':selected').data('name');
        const $fpmSelect = $('#editFPMSelect');
        const selectedFPMID = $fpmSelect.val();
        const selectedFPMName = $fpmSelect.find(':selected').data('name');
        const selectedVesselLineName = $('#editVesselLineSelect').find(':selected').data('name');
        const selectedVesselName = $('#editVesselNameSelect').find(':selected').data('name');
    
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
    
        // Compare all fields (use the same naming as your backend expects)
        compareField('ContainerNumber', $('#editContainerNumber').val());
        compareField('CurrentStatus', $('#editCurrentStatusSelect').val());
        compareField('ContainerSize', $('#editContainerSizeSelect').val());
        compareField('MainSource', $('#editMainSourceSelect').val());
        compareField('Transload', $('#editTransloadBoolean').is(':checked') ? 'Yes' : 'No');
        compareField('Shipline', selectedShiplineName);
        compareField('BOLBookingNumber', $('#editBOLBookingNumber').val());

        compareField('Rail', $('#editRailBoolean').is(':checked') ? 'Yes' : 'No');
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
        compareField('PortRailwayPickup', $('#editPickupDate').val() || null);
        compareField('ReturnLFD', $('#editReturnLFDDate').val() || null);
        compareField('Delivered', $('#editDeliveredDate').val() || null);
        compareField('Returned', $('#editReturnedDate').val() || null);
    
        compareField('Notes', $('#editNotes').val());
        compareField('LastUpdated', $('#editLastUpdatedDate').val() || null);
    
        compareField('ShiplineID', selectedShiplineID);
        compareField('FpmID', selectedFPMID);
        compareField('VesselLineID', $('#editVesselLineSelect').val());
        compareField('VesselID', $('#editVesselNameSelect').val());
        compareField('PortID', $('#editPortOfEntrySelect').val());
        compareField('TerminalID', $('#editTerminalSelect').val());
        compareField('CarrierID', $('#editCarrierSelect').val());
    
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

