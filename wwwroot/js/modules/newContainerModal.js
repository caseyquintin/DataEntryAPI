// newContainerModal.js
document.addEventListener('DOMContentLoaded', function () {

    // New Container Button Function
    $(document).on('click', '#addContainerBtn', function () {
        const modalEl = document.getElementById('addContainerModal');
    
        // ✅ Fully reset form and modal state
        $('#addContainerForm')[0].reset(); // clear inputs
        $('#addContainerForm').find('.is-invalid').removeClass('is-invalid'); // optional: clear validation styles
    
        // ✅ Remove stuck modal artifacts if needed
        modalEl.classList.remove('show');
        modalEl.removeAttribute('aria-hidden');
        modalEl.style.display = 'none'; // clear any inline display
    
        // ✅ Create a fresh modal instance and show
        const modal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: true
        });
    
        modal.show();
    
        console.log("🟢 Add Container modal opened");
    });

    // Inject New Container Modal Options When It Opens
    $('#addContainerModal').on('show.bs.modal', function () {

    // **Container Information**
        const $currentStatusSelect = $('#newCurrentStatusSelect');
        const $mainSourceSelect = $('#newMainSource');
        const $containerSizeSelect = $('#newContainerSizeSelect');
        const $transloadSwitch = $('#newTransloadBoolean');
        const $shiplineSelect = $('#newShiplineSelect');

        // Clear old options
        $currentStatusSelect.empty();
        $mainSourceSelect.empty();
        $containerSizeSelect.empty();
        $shiplineSelect.empty();

        // Simple Dropdowns
        // CurrentStatus
        $currentStatusSelect.append(`<option value="">-- Select Current Status --</option>`);
    
        statusOptions.forEach(option => {
            $currentStatusSelect.append(`<option value="${option}">${option}</option>`);
        });

        // ContainerSize
        $containerSizeSelect.append(`<option value="">-- Select Size --</option>`);
    
        containerSizeOptions.forEach(option => {
            $containerSizeSelect.append(`<option value="${option}">${option}</option>`);
        });

        // MainSource
        $mainSourceSelect.append(`<option value="">-- Select Source --</option>`);
    
        mainSourceOptions.forEach(option => {
            $mainSourceSelect.append(`<option value="${option}">${option}</option>`);
        });

        // Transload
        if (booleanOptions && booleanOptions.length > 0) {
            const defaultOption = booleanOptions[0].toLowerCase();
        
            if (defaultOption === 'no') {
                $transloadSwitch.prop('checked', true);
            } else {
                $transloadSwitch.prop('checked', false);
            }
        } else {
            $transloadSwitch.prop('checked', false);
        }

        // Shipline
        $shiplineSelect.append(`<option value="">-- Select Shipline --</option>`);

        shiplineOptions.forEach(option => {
            $shiplineSelect.append(`<option value="${option.id}" data-name="${option.name}">${option.name}</option>`);
        });

    // **Rail Details**

        const $railSwitch = $('#newRailBoolean');

        // Clear old options
        $railSwitch.empty();

        // Rail
        if (booleanOptions && booleanOptions.length > 0) {
            const defaultOption = booleanOptions[0].toLowerCase();
        
            if (defaultOption === 'no') {
                $railSwitch.prop('checked', true);
            } else {
                $railSwitch.prop('checked', false);
            }
        } else {
            $railSwitch.prop('checked', false);
        }

    // **Shipment Details**

        const $fpmSelect = $('#newFPMSelect');

        // Clear old options
        $fpmSelect.empty();

        // FPM
        $fpmSelect.append(`<option value="">-- Select FPM --</option>`);

        fpmOptions.forEach(option => {
            $fpmSelect.append(`<option value="${option.id}" data-name="${option.name}">${option.name}</option>`);
        });            

    // **Vendor Information** - All are STATIC fields - No code needed.
    // **Vessel Details**

            const $vesselLineSelect = $('#newVesselLineSelect');
            const $sailActualSelect = $('#newSailActualSelect');

            $vesselLineSelect.empty();
            $sailActualSelect.empty();

            // VesselLine and VesselName
            $vesselLineSelect.append(`<option value="">-- Select Vessel Line --</option>`);
        
            vesselLineOptions.forEach(option => {
                $vesselLineSelect.append(`<option value="${option.id}" data-name="${option.name}">${option.name}</option>`);
            });

            $('#newVesselLineSelect').on('change', async function () {
                const vesselLineId = $(this).val();
                const $vesselNameSelect = $('#newVesselNameSelect');
            
                $vesselNameSelect.empty().append('<option value="">Loading...</option>');
            
                if (!vesselLineId) {
                    $vesselNameSelect.html('<option value="">Select a Vessel Line first...</option>');
                    $vesselNameSelect.prop('disabled', true); // 🔒 Disable by default
                    return;
                }
            
                try {
                    const vesselNames = await fetchVesselNamesByVesselLineId(vesselLineId);
                    $vesselNameSelect.empty().append('<option value="">-- Select Vessel Name --</option>');
                    vesselNames.forEach(n => {
                        $vesselNameSelect.append(`<option value="${n.vesselID}" data-name="${n.vesselName}">${n.vesselName}</option>`);
                    });

                    $vesselNameSelect.prop('disabled', false); // ✅ Enable after loading
                } catch (err) {
                    console.error("❌ Error loading vessel names for vessel line:", vesselLineId, err);
                    $vesselNameSelect.html('<option value="">Error loading vessel names</option>');
                }
            });

            // Sail Actual
            $sailActualSelect.append(`<option value="">-- Choose --</option>`);
    
            booleanOptions.forEach(option => {
                $sailActualSelect.append(`<option value="${option}">${option}</option>`);
            });            

    // **Arrival & Offloading Details**

            const $portSelect = $('#newPortOfEntrySelect');
            const $arrivalActualSelect = $('#newArrivalActualSelect');
            const $berthActualSelect = $('#newBerthActualSelect');
            const $offloadActualSelect = $('#newOffloadActualSelect');

            $portSelect.empty();
            $arrivalActualSelect.empty();
            $berthActualSelect.empty();
            $offloadActualSelect.empty();

            // PortOfEntry and Terminal
            $portSelect.append(`<option value="">-- Select Port --</option>`);
        
            portOptions.forEach(option => {
                $portSelect.append(`<option value="${option.id}" data-name="${option.name}">${option.name}</option>`);
            });

            $('#newPortOfEntrySelect').on('change', async function () {
                const portId = $(this).val();
                const $terminalSelect = $('#newTerminalSelect');
            
                $terminalSelect.empty().append('<option value="">Loading...</option>');
            
                if (!portId) {
                    $terminalSelect.html('<option value="">Select a port first...</option>');
                    $terminalSelect.prop('disabled', true); // 🔒 Disable by default
                    return;
                }
            
                try {
                    const terminals = await fetchTerminalsByPortId(portId);
                    $terminalSelect.empty().append('<option value="">-- Select Terminal --</option>');
                    terminals.forEach(t => {
                        $terminalSelect.append(`<option value="${t.terminalID}" data-name="${t.terminal}">${t.terminal}</option>`);
                    });

                    $terminalSelect.prop('disabled', false); // ✅ Enable after loading
                } catch (err) {
                    console.error("❌ Error loading terminals for port:", portId, err);
                    $terminalSelect.html('<option value="">Error loading terminals</option>');
                }
            });

            // Arrival Actual
            $arrivalActualSelect.append(`<option value="">-- Choose --</option>`);
    
            booleanOptions.forEach(option => {
                $arrivalActualSelect.append(`<option value="${option}">${option}</option>`);
            });

            // Berth Actual
            $berthActualSelect.append(`<option value="">-- Choose --</option>`);
    
            booleanOptions.forEach(option => {
                $berthActualSelect.append(`<option value="${option}">${option}</option>`);
            });

            // Offload Actual
            $offloadActualSelect.append(`<option value="">-- Choose --</option>`);
    
            booleanOptions.forEach(option => {
                $offloadActualSelect.append(`<option value="${option}">${option}</option>`);
            });

    // **Pickup & Delivery Details**
            
            const $carrierSelect = $('#newCarrierSelect');

            // Clear old options
            $carrierSelect.empty();

            // Carrier
            $carrierSelect.append(`<option value="">-- Select Carrier --</option>`);

            carrierOptions.forEach(option => {
                $carrierSelect.append(`<option value="${option.id}" data-name="${option.name}">${option.name}</option>`);
            });       

    // **Notes & Additional Information** - All are STATIC fields - No code needed.


    // **End sections**
        });

    $('#addContainerForm').on('submit', function(e) {
        e.preventDefault();

        const newContainer = {};
        $(this).serializeArray().forEach(item => {
            newContainer[item.name] = item.value || null;
        });

        newContainer.Shipline = $('#newShiplineSelect option:selected').data('name') || null;
        newContainer.FPM = $('#newFPMSelect option:selected').data('name') || null;
        newContainer.PortOfEntry = $('#newPortOfEntrySelect option:selected').data('name') || null;
        newContainer.Terminal = $('#newTerminalSelect option:selected').data('name') || null;
        newContainer.VesselLine = $('#newVesselLineSelect option:selected').data('name') || null;
        newContainer.VesselName = $('#newVesselNameSelect option:selected').data('name') || null;
        newContainer.Carrier = $('#newCarrierSelect option:selected').data('name') || null;

        let transloadValue;
        if (booleanOptions && booleanOptions.length === 2) {
            transloadValue = $('#newTransloadBoolean').is(':checked') ? booleanOptions[0] : booleanOptions[1];
        } else {
            transloadValue = $('#newTransloadBoolean').is(':checked') ? 'Yes' : 'No';
        }
        newContainer.Transload = transloadValue;
        
        let railValue;
        if (booleanOptions && booleanOptions.length === 2) {
            railValue = $('#newRailBoolean').is(':checked') ? booleanOptions[0] : booleanOptions[1];
        } else {
            railValue = $('#newRailBoolean').is(':checked') ? 'Yes' : 'No';
        }
        newContainer.Rail = railValue;

        ["Carrier", "Shipline", "VesselLine", "VesselName", "PortOfEntry", "Terminal"].forEach(field => {
            if (newContainer[field] && newContainer[field].includes("-- Select")) {
                newContainer[field] = null;
            }
        })

        const shiplineId = parseInt($('#newShiplineSelect').val());

        if (!shiplineId) {
            showToast("❌ Please select a valid Shipline!", "danger");
            return; // cancel submission
        };

        const fpmId = parseInt($('#newFPMSelect').val());

        if (!fpmId) {
            showToast("❌ Please select a valid FPM!", "danger");
            return; // cancel submission
        };
        
        $.ajax({
            url: "http://localhost:5062/api/containers",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(newContainer),
            success: function (res) {
                showToast("✅ Container created successfully!", "success");
                $("#addContainerModal").modal("hide");
                $('#ContainerList').DataTable().ajax.reload(null, false);
            },
            error: function (xhr, status, error) {
                console.error(xhr.responseText);
                showToast("❌ Failed to add container. Check your input.", "danger");
            }
        });
    });
});