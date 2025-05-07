// bulkEditingModal.js - update just the first part for the button handler
$(document).off('click', '#bulkEditBtn').on('click', '#bulkEditBtn', function (e) {
    // Prevent any default actions or event bubbling
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Bulk Edit button clicked'); // Debug log
    
    const selected = getSelectedContainerIDs();
    if (selected.length === 0) {
        showToast('🚫 Please select at least one row to edit.', 'warning');
        return;
    }

    // Reset form
    $('#bulkContainerForm').find('input, select, textarea').each(function () {
        const isCheckbox = this.type === 'checkbox';
        if (!isCheckbox || this.classList.contains('apply-field')) {
            $(this).val('').prop('checked', false);
        }
        if (!this.classList.contains('apply-field')) {
            $(this).prop('disabled', true);
        }
    });

    //  ✅ Populate dropdowns before modal opens
    populateBulkDropdowns();

    // Use proper Bootstrap 5 modal initialization
    const modalElement = document.getElementById('bulkContainerModal');
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true,
        focus: true
    });
    modal.show();
});

function populateBulkDropdowns() {
    // ---- Simple Dropdowns ----
    $('#bulkCurrentStatusSelect').empty().append('<option value="">-- Select Status --</option>');
    statusOptions.forEach(opt => {
        $('#bulkCurrentStatusSelect').append(`<option value="${opt}">${opt}</option>`);
    });

    $('#bulkContainerSizeSelect').empty().append('<option value="">-- Select Container Size --</option>');
    containerSizeOptions.forEach(opt => {
        $('#bulkContainerSizeSelect').append(`<option value="${opt}">${opt}</option>`);
    });

    $('#bulkMainSourceSelect').empty().append('<option value="">-- Select Main Source --</option>');
    mainSourceOptions.forEach(opt => {
        $('#bulkMainSourceSelect').append(`<option value="${opt}">${opt}</option>`);
    });

    $('#bulkShiplineSelect').empty().append('<option value="">-- Select Shipline --</option>');
    shiplineOptions.forEach(opt => {
        $('#bulkShiplineSelect').append(`<option value="${opt.id}" data-name="${opt.name}">${opt.name}</option>`);
    });

    $('#bulkFPMSelect').empty().append('<option value="">-- Select FPM --</option>');
    fpmOptions.forEach(opt => {
        $('#bulkFPMSelect').append(`<option value="${opt.id}" data-name="${opt.name}">${opt.name}</option>`);
    });

    $('#bulkVesselLineSelect').empty().append('<option value="">-- Select Vessel Line --</option>');
    vesselLineOptions.forEach(opt => {
        $('#bulkVesselLineSelect').append(`<option value="${opt.id}" data-name="${opt.name}">${opt.name}</option>`);
    });

    $('#bulkSailActualSelect, #bulkArrivalActualSelect, #bulkBerthActualSelect, #bulkOffloadActualSelect').each(function () {
        const $el = $(this).empty().append('<option value="">-- Choose --</option>');
        
        console.log("actualOrEstimateOptions:", actualOrEstimateOptions); // Debug line
        console.log("booleanOptions:", booleanOptions); // Debug line
        
        actualOrEstimateOptions.forEach(opt => $el.append(`<option value="${opt}">${opt}</option>`));
    });

    $('#bulkCarrierSelect').empty().append('<option value="">-- Select Carrier --</option>');
    carrierOptions.forEach(opt => {
        $('#bulkCarrierSelect').append(`<option value="${opt.id}" data-name="${opt.name}">${opt.name}</option>`);
    });

    $('#bulkPortOfEntrySelect').empty().append('<option value="">-- Select Port --</option>');
    portOptions.forEach(opt => {
        $('#bulkPortOfEntrySelect').append(`<option value="${opt.id}" data-name="${opt.name}">${opt.name}</option>`);
    });
}

$('#bulkVesselLineSelect').on('change', async function () {
    const vesselLineId = $(this).val();
    const $vesselNameSelect = $('#bulkVesselNameSelect');

    $vesselNameSelect.empty().append('<option value="">Loading...</option>');

    if (!vesselLineId) {
        $vesselNameSelect.html('<option value="">Select a Vessel Line first</option>').prop('disabled', true);
        return;
    }

    try {
        const vessels = await fetchVesselNamesByVesselLineId(vesselLineId);
        $vesselNameSelect.empty().append('<option value="">-- Select Vessel Name --</option>');
        vessels.forEach(v => {
            $vesselNameSelect.append(`<option value="${v.vesselID}" data-name="${v.vesselName}">${v.vesselName}</option>`);
        });
        $vesselNameSelect.prop('disabled', false);
    } catch (err) {
        console.error("❌ Error loading vessels:", err);
        $vesselNameSelect.html('<option value="">Error loading vessels</option>');
    }
});

$('#bulkPortOfEntrySelect').on('change', async function () {
    const portId = $(this).val();
    const $terminalSelect = $('#bulkTerminalSelect');

    $terminalSelect.empty().append('<option value="">Loading...</option>');

    if (!portId) {
        $terminalSelect.html('<option value="">Select a port first</option>').prop('disabled', true);
        return;
    }

    try {
        const terminals = await fetchTerminalsByPortId(portId);
        $terminalSelect.empty().append('<option value="">-- Select Terminal --</option>');
        terminals.forEach(t => {
            $terminalSelect.append(`<option value="${t.terminalID}" data-name="${t.terminal}">${t.terminal}</option>`);
        });
        $terminalSelect.prop('disabled', false);
    } catch (err) {
        console.error("❌ Error loading terminals:", err);
        $terminalSelect.html('<option value="">Error loading terminals</option>');
    }
});

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('bulkContainerForm');

    // Reset all bulk modal inputs and checkboxes
    $('#bulkContainerForm').find('input, select, textarea').each(function () {
        const isCheckbox = this.type === 'checkbox';

        // Reset value
        if (!isCheckbox || this.classList.contains('apply-field')) {
            $(this).val('').prop('checked', false);
        }

        // Disable input unless it's an apply checkbox
        if (!this.classList.contains('apply-field')) {
            $(this).prop('disabled', true);
        }
    });

    // Enable/disable target field based on matching data-target
    $('.apply-field').on('change', function () {
        const targetID = $(this).data('target');
        if (!targetID) {
            console.warn("⚠️ No data-target set for:", this.id);
            return;
        }

        const $target = $('#' + targetID);
        const shouldEnable = this.checked;

        $target.prop('disabled', !shouldEnable);

        // Special logic for cascaded fields
        if (targetID === 'bulkPortOfEntrySelect' && !shouldEnable) {
            $('#bulkTerminalSelect').prop('disabled', true).val('');
        }
        if (targetID === 'bulkVesselLineSelect' && !shouldEnable) {
            $('#bulkVesselNameSelect').prop('disabled', true).val('');
        }
    });

    // Handle form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedIDs = getSelectedContainerIDs(); // Make sure this exists!
        if (selectedIDs.length === 0) {
            showToast('⚠️ No containers selected.', 'warning');
            return;
        }

        const containerTemplate = {};

        $('.apply-field:checked').each(function () {
            const targetID = $(this).data('target');
            if (!targetID) {
                console.warn('⚠️ Missing data-target for checkbox:', this.id);
                return;
            }

            const input = document.getElementById(targetID);
            if (!input) {
                console.warn('⚠️ No matching input for:', targetID);
                return;
            }

            const name = input.name;
            if (!name) {
                console.warn('⚠️ Input missing name attribute:', input);
                return;
            }

            let value = input.value;
            let handled = false;

            // Handle paired ID/name selects (e.g., ShiplineID + Shipline)
            if (input.tagName === 'SELECT' && input.options[input.selectedIndex]) {
                const selectedOption = input.options[input.selectedIndex];
                const nameAttr = input.name;
            
                if (nameAttr === 'ShiplineID') {
                    containerTemplate['Shipline'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['ShiplineID'] = parseInt(value);
                    handled = true;
                }
            
                if (nameAttr === 'CarrierID') {
                    containerTemplate['Carrier'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['CarrierID'] = parseInt(value);
                    handled = true;
                }
            
                if (nameAttr === 'FpmID') {
                    containerTemplate['FPM'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['FpmID'] = parseInt(value);
                    handled = true;
                }
            
                if (nameAttr === 'PortID') {
                    containerTemplate['PortOfEntry'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['PortID'] = parseInt(value);
                    handled = true;
                }
            
                if (nameAttr === 'TerminalID') {
                    containerTemplate['Terminal'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['TerminalID'] = parseInt(value);
                    handled = true;
                }
            
                if (nameAttr === 'VesselLineID') {
                    containerTemplate['VesselLine'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['VesselLineID'] = parseInt(value);
                    handled = true;
                }
            
                if (nameAttr === 'VesselID') {
                    containerTemplate['VesselName'] = selectedOption.dataset.name || selectedOption.text;
                    containerTemplate['VesselID'] = parseInt(value);
                    handled = true;
                }
            }
            
            if (input.type === 'checkbox') {
                value = input.checked;
                
                // Special handling for boolean fields that need Yes/No conversion
                if (name === 'Transload' || name === 'Rail') {
                    if (booleanOptions && booleanOptions.length === 2) {
                        value = value ? booleanOptions[0] : booleanOptions[1];
                    } else {
                        value = value ? 'Yes' : 'No';
                    }
                }
            }
            
            if (!handled) {
            containerTemplate[input.name] = value;
            }            
        });

        if (Object.keys(containerTemplate).length === 0) {
            showToast('⚠️ No fields selected to update.', 'warning');
            return;
        }

        const payload = selectedIDs.map(id => ({
            containerID: id,
            ...containerTemplate
        }));

        try {
            const res = await fetch('http://localhost:5062/api/containers/batch-update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Server error');

            showToast(`✅ Updated ${selectedIDs.length} containers`, 'success');
            $('#bulkContainerModal').modal('hide');
            $('#ContainerList').DataTable().ajax.reload(null, false);

        } catch (err) {
            console.error('❌ Bulk update failed:', err);
            showToast('❌ Failed to apply bulk changes.', 'danger');
        }
    });
});