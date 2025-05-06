/*!
 * Start Bootstrap - Simple Sidebar v6.0.6 (https://startbootstrap.com/template/simple-sidebar)
 * Copyright 2013-2023 Start Bootstrap
 * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-simple-sidebar/blob/master/LICENSE)
 */
// 
// Scripts
//

let statusOptions = [];
let shiplineOptions = [];
let portOptions = [];
let portIdByName = {};

function fetchDropdownOptions() {
    return Promise.all([
        $.getJSON('http://localhost:5062/api/options/status').then(data => statusOptions = data),
        $.getJSON('http://localhost:5062/api/options/shipline').then(data => shiplineOptions = data),
        $.getJSON('http://localhost:5062/api/ports').then(data => {
            // Save the full port list
            portOptions = data.map(p => ({
                id: p.id,
                name: p.name
            }));

            // 🧠 Save port ID lookup map
            data.forEach(p => {
                portIdByName[p.name] = p.id;
            });

            console.log("🧠 Port Options:", portOptions);
            console.log("📦 Port ID by Name:", portIdByName);

            return portOptions;
        })
    ]).then(() => {
        console.log("✅ Dropdowns loaded:", { statusOptions, shiplineOptions, portOptions });
    });
}

// Add this reusable toast function
function showToast(message, type = 'success') {
    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    const container = $('.toast-container');
    container.append(toastHtml);

    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
    bsToast.show();

    // Cleanup after toast fades
    $(toastEl).on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

window.addEventListener('DOMContentLoaded', event => {

    // Toggle the side navigation
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        // Uncomment Below to persist sidebar toggle between refreshes
        // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        //     document.body.classList.toggle('sb-sidenav-toggled');
        // }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

});

let deleteTimeouts = {};
function initializeDataTableAndHandlers () {

        let lastEditingCell = null // 
    
        const editedRows = {}; // Track changed rows
        let currentEditRow = null;

        // // 🌐 Inline Editing Handler with Cascading Dropdown
        // $('#ContainerList tbody').on('click', 'td.editable', function (e) {
        //     // 🧠 Only activate on left click (no right clicks, etc.)
        //     if (e.which !== 1) return;
        //     // e.preventDefault(); // ✅ Helps prevent browser from auto-focusing elsewhere

        //     const cell = table.cell(this);
        //     const colIndex = cell.index().column;
        //     const field = table.column(colIndex).dataSrc();
        //     const originalValue = cell.data();

        //     console.log("👋 Inline edit triggered for field:", field); // ✅ Add this line

        //     if (field === 'portOfEntry') {
        //         const $select = $('<select class="form-select form-select-sm"></select>');
        //         portOptions.forEach(opt => {
        //             $select.append(`<option value="${opt.name}">${opt.name}</option>`);
        //         });
        //         $select.val(originalValue);
        //         $(this).html($select);

        //         $select.trigger('focus'); // ✅ Make sure it's focused right after injection

        //         $select.on('change', function (e) {
        //             e.stopPropagation(); // ✅ Prevent dropdown from closing too early
        //             const selectedPort = $(this).val();

        //             console.log("✅ Port selected:", selectedPort); // ✅ Confirm selection

        //             setTimeout(() => {
        //                 cell.data(selectedPort).draw(false); // Delayed redraw
        //             }, 100);

        //             // 🌊 Cascading: Update Terminal dropdown via live API call
        //             const selectedPortId = portIdByName[selectedPort];
        //             console.log("🔍 Selected Port:", selectedPort, "→ Port ID:", selectedPortId);

        //             $.getJSON(`http://localhost:5062/api/terminals/by-port/${selectedPortId}`)
        //                 .done(function(terminals) {
        //                     console.log("✅ Fetched terminals for Port:", terminals);

        //                     const terminalColIdx = table.column('terminalID:name').index();
        //                     const terminalCell = table.cell(cell.index().row, terminalColIdx);

        //                     const $terminalSelect = $('<select class="form-select form-select-sm"></select>');
        //                     terminals.forEach(t =>
        //                         $terminalSelect.append(`<option value="${t.terminalID}">${t.terminal}</option>`)
        //                     );

        //                     terminalCell.node().innerHTML = '';
        //                     $(terminalCell.node()).append($terminalSelect);

        //                     $terminalSelect.on('change', function () {
        //                         const selectedText = $(this).find('option:selected').text();
        //                         terminalCell.data(selectedText).draw();
        //                     });
        //                 })
        //                 .fail(function(err) {
        //                     console.error("❌ Failed to load terminals for port:", err);
        //                     showToast('Failed to load terminal list for selected port.', 'danger');
        //                 });
        //         });
        //     }
        // });
    
        // Bulk select checkbox helper
        function getSelectedContainerIDs() {
            return $('.row-select:checked').map(function() {
                return $(this).data('id');
            }).get();
        }
    
        console.log(getSelectedContainerIDs());
    
        // Add bulk action buttons
        const bulkButtons = `
            <div class="d-flex gap-2">
            <button id="addContainerBtn" class="btn btn-outline-success btn-sm">➕ Add Container</button>
            <button id="bulkEditBtn" class="btn btn-outline-primary btn-sm">✏️ Bulk Edit</button>
            <button id="bulkDeleteBtn" class="btn btn-outline-danger btn-sm">🗑️ Bulk Delete</button>
            <button id="customColVisBtn" class="btn btn-outline-secondary btn-sm">🔧 Choose Columns</button>
            </div>
        `;
    
        // Datatable config
        const table = $('#ContainerList').DataTable({
            ajax: {
                url: 'http://localhost:5062/api/containers',
                dataSrc: function (json) {
                    console.log("🚀 API returned:", json);
                    return json;
                },
                error: function(xhr, status, error) {
                    console.error('🛑 Failed to load data:', status, error);
                    showToast('Failed to load table data!', 'danger');
                }
            },
            rowId: 'containerID',
            scrollY: '60vh', // or your existing calc height
            scrollX: true, // ✅ fix horizontal scroll issue
            autoWidth: true, // ✅ allow dynamic sizing once
            stateSave: true, // ✅ So it loads column sizes and visibility settings
            scroller: {
                loadingIndicator: true // helpful for debugging
            },
            deferRender: true,
            responsive: {
                details: false
            },
            scrollCollapse: false, // Disable unnecessary collapsing
            paging: true, // disables or enables pagination
            info: false, // hides X to Y of Z entries
            lengthChange: false, // hides the "Show X entries" dropdown
            pageLength: 100,
            order: [
                [1, 'desc']
            ],
            dom: '<"toolbar d-flex justify-content-between align-items-center mb-3"Bf>rt',
            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
            columns: [
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: '', // ✅ Leave it empty or use a custom class if needed
                    render: function(data, type, row) {
                        return `<input type="checkbox" class="row-select" data-id="${row.containerID}">`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: function(data, type, row, meta) {
                        return `
                        <button class="btn btn-sm btn-primary edit-modal-btn" data-id="${row.containerID}">✏️</button>
                        <button class="btn btn-sm btn-danger delete-btn ms-2" data-id="${row.containerID}">🗑️</button>
                    `;
                    }
                },
                {
                    data: 'containerID'
                },
                {
                    data: 'containerNumber',
                    className: 'editable'
                },
                {
                    data: 'arrival',
                    name: 'arrival',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'arrivalActual',
                    name: 'arrivalActual',
                    className: 'editable',
                    render: data => data ?? ''
                },
                {
                    data: 'available',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'berth',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'berthActual',
                    className: 'editable',
                    render: data => data ?? ''
                },
                {
                    data: 'bolBookingNumber',
                    className: 'editable'
                },
                {
                    data: 'carrier',
                    className: 'editable'
                },
                {
                    data: 'containerSize',
                    className: 'editable'
                },
                {
                    data: 'currentStatus',
                    name: 'currentStatus',
                    className: 'editable'
                },
                {
                    data: 'delivered',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'fpm',
                    className: 'editable'
                },
                {
                    data: 'lastUpdated',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'loadToRail',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'mainSource',
                    className: 'editable'
                },
                {
                    data: 'notes',
                    className: 'editable'
                },
                {
                    data: 'offload',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'offloadActual',
                    className: 'editable'
                },
                {
                    data: 'pickupLFD',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'poNumber',
                    className: 'editable'
                },
                {
                    data: 'portOfDeparture',
                    className: 'editable'
                },
                {
                    data: 'portOfEntry',
                    className: 'editable'
                },
                {
                    data: 'portRailwayPickup',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'projectNumber',
                    className: 'editable'
                },
                {
                    data: 'rail',
                    className: 'editable'
                },
                {
                    data: 'railDeparture',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'railDestination',
                    className: 'editable'
                },
                {
                    data: 'railETA',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'railPickupNumber',
                    className: 'editable'
                },
                {
                    data: 'railwayLine',
                    className: 'editable'
                },
                {
                    data: 'returned',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'returnLFD',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'sail',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'sailActual',
                    className: 'editable'
                },
                {
                    data: 'shipline',
                    className: 'editable'
                },
                {
                    data: 'shiplineID',
                    className: 'editable'
                },
                {
                    data: 'shipmentNumber',
                    className: 'editable'
                },
                // ✅ Terminal name (VISIBLE)
                {
                    data: 'terminal',
                    name: 'terminal',
                    className: 'editable'
                },

                // 🛑 Terminal ID (HIDDEN)
                {
                    data: 'terminalID',
                    name: 'terminalID',
                    visible: false // ✅ This keeps it out of view
                },
                {
                    data: 'transload',
                    className: 'editable'
                },
                {
                    data: 'vendor',
                    className: 'editable'
                },
                {
                    data: 'vendorIDNumber',
                    className: 'editable'
                },
                {
                    data: 'vesselID',
                    className: 'editable'
                },
                {
                    data: 'vesselLine',
                    className: 'editable'
                },
                {
                    data: 'vesselLineID',
                    className: 'editable'
                },
                {
                    data: 'vesselName',
                    name: 'vesselName',
                    className: 'editable'
                },
                {
                    data: 'voyage',
                    name: 'voyage',
                    className: 'editable'
                },
                {
                    data: 'portID',
                    name: 'portID',
                    visible: false // optional — hide it from view, keep in data
                }
                    
            ],
            initComplete: function() {
                const toolbar = $('.toolbar');
                const table = this.api();
  
            // 🌐 Read the status filter from the DOM (if any)
            const $tableEl = $('#ContainerList');
            const statusFilter = $tableEl.data('status-filter');
            const additionalFilters = $tableEl.data('filters') || {};
            const sortRules = $tableEl.data('sort') || [];
            
            const statusColIndex = table.column('currentStatus:name').index();
            if (statusFilter) {
                table.column(statusColIndex).search(`^${statusFilter}$`, true, false);
            }
            
            // Apply additional filters
            for (const [fieldName, value] of Object.entries(additionalFilters)) {
                const colIndex = table.column(`${fieldName}:name`).index();
                table.column(colIndex).search(`^${value}$`, true, false);
            }
            
            // Apply multi-column sort
            if (Array.isArray(sortRules) && sortRules.length > 0) {
                const sortArray = sortRules.map(rule => {
                    const colIndex = table.column(`${rule.column}:name`).index();
                    return [colIndex, rule.dir];
                });
                table.order(sortArray);
            }
            
            table.draw();
    
            // ✅ Only allow autoWidth once, then disable it to prevent layout thrash
            const settings = table.settings()[0];
            if (settings.oInit.autoWidth) {
                preserveScrollPosition(() => {
                    table.columns.adjust(); // ensure it's sized first
                });
                settings.oInit.autoWidth = false; // turn it off after first sizing
                settings.oFeatures.bAutoWidth = false;
            }
    
                if ($('#bulkEditBtn').length === 0) {
                    toolbar.prepend(bulkButtons);
                }
    
                $('#ContainerList').on('mouseenter', 'td', function() {
                    const cell = $(this);
                    if (this.offsetWidth < this.scrollWidth) {
                        cell.attr('title', cell.text());
                    } else {
                        cell.removeAttr('title');
                    }
                });

                $('#ContainerList tbody').on('click', 'td', function () {
                    console.log("✅ Clicked a cell! Classes:", this.className);
                });


            },
            rowCallback: function(row, data) {
                if (!data) return;
            
                const status = (data.currentStatus || '').trim().toUpperCase();
                $(row).removeClass('status-returned status-vessel status-appt');
            
                if (status === 'RETURNED') {
                    $(row).addClass('status-returned');
                } else if (status === 'ON VESSEL') {
                    $(row).addClass('status-vessel');
                } else if (status === 'DEL APPT SET') {
                    $(row).addClass('status-appt');
                }
            }
        });

                // 🧪 Bonus: Confirm jQuery is catching cell clicks
                $('#ContainerList tbody').on('click', 'td', function () {
                    console.log("✅ You clicked a cell! Classes:", this.className);
                });

                // ✅ INLINE EDITING HANDLER: Save changes to backend
                $('#ContainerList tbody').on('click', 'td.editable', async function () {
                    console.log("🖱️ Clicked on an editable cell!");
                    const cell = table.cell(this);
                    const originalValue = cell.data();
                    const rowData = table.row(this).data();
                    const fieldIndex = cell.index().column;
                    const fieldName = table.settings().init().columns[fieldIndex].data;
                    console.log("📌 Field name clicked:", fieldName);
                    const rowID = rowData.containerID;
            
                    // Don't re-enter editing mode
                    if ($(this).hasClass('editing')) return;
            
                    // 🧼 Close any open editing fields first
                    $('#ContainerList td.editing input').each(function () {
                        const td = $(this).closest('td');
                        const tempCell = table.cell(td);
                        const val = $(this).val();
                        tempCell.data(val).draw(false);
                        td.removeClass('editing');
                    });
            
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
                    } else if (fieldName === 'shipline') {
                        isDropdownField = shiplineOptions;
                    } else if (fieldName === 'portOfEntry') {
                        // Set dropdown options to available ports
                        isDropdownField = portOptions.map(p => p.name);
                    } else if (fieldName.toLowerCase() === 'terminal') {
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
                    }
                    
                    let inputHtml = '';
                    if (isDropdownField) {
                        console.log("🛠️ Dropdown options being rendered:", isDropdownField);
                    
                        inputHtml = `<select class="form-select form-select-sm">` +
                        isDropdownField.map(opt => {
                            const label = typeof opt === 'string' ? opt : opt.label;
                            const value = typeof opt === 'string' ? opt : opt.value;
                            const isSelected = label === originalValue ? 'selected' : '';
                            return `<option value="${value}" ${isSelected}>${label}</option>`;
                        }).join('') +
                    `</select>`;
                    
                    } else if (isDateField) {
                        const value = originalValue ? new Date(originalValue).toLocaleDateString('en-US') : '';
                        inputHtml = `<input type="text" class="form-control form-control-sm date-field" value="${value}">`;                
                    } else {
                        inputHtml = `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}">`;
                    }
                    console.log("📦 Final select HTML:", inputHtml);
                    cell.node().innerHTML = `<div style="min-width: 100px;">${inputHtml}</div>`;
                    console.log("📦 Cell content set to:", $(cell.node()).html());

                    // ✅ This goes AFTER the HTML is in the DOM
                    const input = $('input, select', this).focus().trigger('mousedown');

                    // 👇 ADD THIS - Save terminal on dropdown change
                    if (fieldName.toLowerCase() === 'terminal') {
                        input.on('change', function () {
                            const newValue = $(this).val();
                            const match = isDropdownField.find(opt => opt.value == newValue);
                            const terminalName = match ? match.label : '[Unknown Terminal]';

                            console.log("📌 Terminal dropdown change triggered:", { newValue, terminalName });

                            // Update terminal name (visible column)
                            const terminalColIndex = table.column('terminal:name').index();
                            const terminalCell = table.cell(cell.index().row, terminalColIndex);
                            terminalCell.data(terminalName).draw(false);

                            // Update terminal ID (hidden column)
                            const terminalIDColIndex = table.column('terminalID:name').index();
                            const terminalIDCell = table.cell(cell.index().row, terminalIDColIndex);
                            terminalIDCell.data(Number(newValue)).draw(false);

                            // Save both to backend
                            const patchRequests = [
                                fetch('http://localhost:5062/api/containers/update-field', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        containerID: rowID,
                                        field: 'TerminalID',
                                        value: String(newValue)
                                    })
                                })
                            ];

                            if (terminalName && terminalName !== '[Unknown Terminal]') {
                                patchRequests.push(
                                    fetch('http://localhost:5062/api/containers/update-field', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            containerID: rowID,
                                            field: 'Terminal',
                                            value: terminalName
                                        })
                                    })
                                );
                            }

                            Promise.all(patchRequests).then(() => {
                                console.log(`✅ Terminal + TerminalID PATCH complete for container ${rowID}`);
                                showToast('✅ Terminal updated', 'success');
                            }).catch(err => {
                                console.error(`❌ PATCH failed:`, err);
                                showToast('❌ Failed to update terminal info', 'danger');
                            });

                            $(cell.node()).removeClass('editing');
                            moveToNextEditable(cell.node());
                        });
                    }
                    
                    if (isDateField) {
                        flatpickr(input[0], {
                            dateFormat: 'm/d/Y', 
                            allowInput: true,
                            parceDate: (dateStr) => {
                                const d = new Date(dateStr);
                                return isNaN(d.getTime()) ? null : d;
                            }
                        });
                    }
            
                    const inputType = isDateField ? 'date' : 'text';
            
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
                    
                            const isTerminalField = fieldName.toLowerCase() === 'terminal';
                    
                            if (isDateField && newValue) {
                                const parsed = new Date(newValue);
                                newValue = isNaN(parsed.getTime()) ? originalValue : parsed.toISOString();
                            }
                    
                            const changed = newValue !== originalValue;
                    
                            const terminalOptions = dropdownOptions?.terminalOptions ?? [];

                            if (isTerminalField && Array.isArray(terminalOptions)) {
                                const match = isDropdownField.find(opt => opt.value == newValue);
                                const terminalName = match ? match.label : `[Unknown Terminal]`;
                    
                                console.log("📌 Dropdown selection result:", { newValue, match, terminalName });
                    
                                // ✅ Update terminal name (visible column)
                                const terminalColIndex = table.column('terminal:name').index();
                                const terminalCell = table.cell(cell.index().row, terminalColIndex);
                                terminalCell.data(terminalName).draw(false);
                    
                                // ✅ Update terminal ID (hidden column)
                                const terminalIDColIndex = table.column('terminalID:name').index();
                                const terminalIDCell = table.cell(cell.index().row, terminalIDColIndex);
                                terminalIDCell.data(Number(newValue)).draw(false);
                    
                                // ✅ PATCH both values
                                const patchRequests = [
                                    fetch('http://localhost:5062/api/containers/update-field', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            containerID: rowID,
                                            field: 'TerminalID',
                                            value: Number(newValue)
                                        })
                                    })
                                ];
                    
                                if (terminalName && terminalName !== '[Unknown Terminal]') {
                                    patchRequests.push(
                                        fetch('http://localhost:5062/api/containers/update-field', {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                containerID: rowID,
                                                field: 'Terminal',
                                                value: terminalName
                                            })
                                        })
                                    );
                                }
                    
                                Promise.all(patchRequests).then(() => {
                                    console.log(`✅ Terminal + TerminalID PATCH complete for container ${rowID}`);
                                    showToast('✅ Terminal updated', 'success');
                                }).catch(err => {
                                    console.error(`❌ PATCH failed:`, err);
                                    showToast('❌ Failed to update terminal info', 'danger');
                                });
                    
                                $(cell.node()).removeClass('editing');
                                moveToNextEditable(cell.node());
                                return;
                            }

                            // 🛑 Avoid PATCHing terminal again (it’s already handled above)
                            if (isTerminalField) {
                                console.warn("⚠️ Skipping fallback save — terminal already handled.");
                                return;
                            }

                            // 🔁 Fallback for other fields
                            if (changed && newValue !== '') {
                                cell.data(newValue).draw(false);
                                $(cell.node()).removeClass('editing');
                    
                                fetch('http://localhost:5062/api/containers/update-field', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        containerID: rowID,
                                        field: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
                                        value: newValue
                                    })
                                }).then(() => {
                                    showToast(`✅ ${fieldName} updated`, 'success');
                                }).catch(err => {
                                    console.error(`❌ Failed to save ${fieldName}`, err);
                                    showToast(`❌ Failed to update ${fieldName}`, 'danger');
                                });
                    
                                moveToNextEditable(cell.node());
                            } else {
                                cell.data(originalValue).draw(false);
                                $(cell.node()).removeClass('editing');
                            }
                        }
                    
                        if (e.key === 'Escape') {
                            preventBlur = true;
                            setTimeout(() => {
                                cell.data(originalValue).draw(false);
                                $(cell.node()).removeClass('editing');
                            }, 0);
                        }
                    });
  
                    input.on('blur', function () {
                        if (preventBlur) return;
                        if (fieldName.toLowerCase() === 'terminal') {
                            console.warn("⚠️ Skipping blur PATCH for terminal — already handled.");
                            $(cell.node()).removeClass('editing');
                            return;
                        }
                    
                        requestAnimationFrame(() => {
                            const $active = document.activeElement;
                            if ($(cell.node()).has($active).length) return;
                    
                            let newValue = input.val();
                            if (newValue != null) newValue = newValue.toString().trim();
                            let formattedValue = newValue;
                            let displayValue = originalValue;
                    
                            if (fieldName.toLowerCase() === 'terminal' && Array.isArray(isDropdownField)) {
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
                    
                            if (formattedValue !== originalValue) {
                                cell.data(displayValue);
                                table.row(cell.index().row).invalidate();
                    
                                fetch('http://localhost:5062/api/containers/update-field', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        containerID: rowID,
                                        field: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
                                        value: formattedValue
                                    })
                                }).catch(err => console.error(`❌ Failed to save ${fieldName}`, err));
                            } else {
                                cell.data(originalValue);
                                table.row(cell.index().row).invalidate();
                            }
                    
                            $(cell.node()).removeClass('editing');
                        });
                    });
                });
    
        // Keep layout aligned after ordering or filtering
        table.on('order.dt search.dt column-visibility.dt', function () {
            preserveScrollPosition(() => {
                table.columns.adjust(); // ❌ remove .draw(false)
            });
        });
    
        table.on('init', function() {
            setTimeout(() => {
                const dtSettings = table.settings()[0];
                if (dtSettings._colResize && typeof dtSettings._colResize.restore === 'function') {
                    table.on('order.dt search.dt', function () {
                        preserveScrollPosition(() => {
                            table.columns.adjust(); // ✅ no draw()
                        });
                    });
                }
                
            }, 200); // Small delay to make sure table is ready
        });
    
        new $.fn.dataTable.FixedHeader(table, {
            header: true,
            headerOffset: 56,
            scrollContainer: '#table-container' // 👈 This anchors the header
        });
    
        // 🔁 Reset "Select All" checkbox whenever the table redraws (pagination, search, etc.)
        table.on('draw', function() {
            $('#selectAll').prop('checked', false);
        });
    
        // Open the column chooser modal
        $(document).on('click', '#customColVisBtn', function() {
            const form = $('#columnVisibilityForm');
            form.empty(); // Clear previous items
    
            table.columns().every(function(index) {
                const column = this;
                const title = column.header().textContent.trim();
                const visible = column.visible();
    
                // ⛔ Skip the first column (the select checkbox column)
                if (index === 0 || title === '') return;
    
                form.append(`
                    <div class="col-12 mb-2">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" data-column="${index}" id="colToggle${index}" ${visible ? 'checked' : ''}>
                            <label class="form-check-label" for="colToggle${index}">${title}</label>
                        </div>
                    </div>
                `);
            });
    
            const modal = new bootstrap.Modal(document.getElementById('columnModal'));
            modal.show();
        });
    
        // Master select all checkbox control
        $(document).on('change', '#selectAll', function() {
            const checked = $(this).is(':checked');
            $('.row-select').prop('checked', checked);
        });
    
        // New Container Button Function
        $(document).on('click', '#addContainerBtn', function() {
            $('#addContainerForm')[0].reset(); // clear previous input
            new bootstrap.Modal(document.getElementById('addContainerModal')).show();
        });
    
        $('#addContainerForm').on('submit', function(e) {
            e.preventDefault();
    
            const containerNumber = $('#newContainerNumber').val().trim();
            const arrivalRaw = $('#newArrival').val();
            const arrival = arrivalRaw ? `${arrivalRaw}T00:00:00` : null;
            const status = $('#newStatus').val();
    
            const newContainer = {
                ContainerNumber: containerNumber,
                Arrival: arrival,
                CurrentStatus: status
            };
    
            $.ajax({
                url: 'http://localhost:5062/api/containers',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(newContainer),
                success: function() {
                    bootstrap.Modal.getInstance(document.getElementById('addContainerModal')).hide();
                    $('#ContainerList').DataTable().ajax.reload(null, false); // refresh table
                    showToast('✅ Container added!', 'success');
                },
                error: function(xhr, status, err) {
                    console.error('❌ Error adding container:', err);
                    showToast('❌ Failed to add container. Please check the data and try again.', 'danger');
                }
            });
        });
    
        // Choose Columns button
        $(document).on('click', '#applyColVis', function() {
            const $btn = $(this).prop('disabled', true).text('Applying...');
            const modalEl = document.getElementById('columnModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            const dtSettings = table.settings()[0];
        
            // Step 1: Apply column visibility (no redraw yet)
            $('#columnVisibilityForm input[type="checkbox"]').each(function() {
                const index = $(this).data('column');
                const isVisible = $(this).is(':checked');
                table.column(index).visible(isVisible, false); // batch update
            });
        
            // Step 2: Hide modal first (no redraw yet)
            modal.hide();
        
            // Step 3: After fade-out, defer redraw a bit longer
            $(modalEl).one('hidden.bs.modal', function () {
                // 🔁 Give time for fade-out to complete
                setTimeout(() => {
                    // ✅ Let browser decide when it's idle enough to run layout recalculation
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(() => {
                            preserveScrollPosition(() => {
                                table.columns.adjust();
                            }),
                            $btn.prop('disabled', false).text('Apply');
                        }, { timeout: 500 }); // fallback timeout
                    } else {
                        // Fallback for browsers that don’t support requestIdleCallback
                        requestAnimationFrame(() => {
                            preserveScrollPosition(() => {
                                table.columns.adjust();
                            });
                            $btn.prop('disabled', false).text('Apply');
                        });
                    }
                }, 200); // Can fine-tune this value
            });
        });

        function toIsoMidnight(date) {
            return new Date(date).toISOString().split('T')[0] + 'T00:00:00';
        }
        
        // Modal "Edit" button
        $('#ContainerList tbody').on('click', '.edit-modal-btn', function() {
            const containerID = $(this).data('id');
            currentEditRow = table.row('#' + containerID);
            const rowData = currentEditRow.data();
    
            $('#editID').val(rowData.containerID);
            $('#containerNumber').val(rowData.containerNumber);
            $('#arrival').val(rowData.arrival ? new Date(rowData.arrival).toISOString().split('T')[0] : '');
            $('#currentStatus').val(rowData.currentStatus);
    
            const modal = new bootstrap.Modal(document.getElementById('editModal'));
            modal.show();
        });
    
        // Bulk Edit Button function
        $(document).on('click', '#bulkEditBtn', function() {
            const selected = getSelectedContainerIDs();
            if (selected.length === 0) {
                showToast('⚠️ Please select at least one row to edit.', 'warning');
                return;
            }
    
            // Clear previous inputs
            $('#bulkStatus').val('');
            $('#bulkArrival').val('');
    
            const modal = new bootstrap.Modal(document.getElementById('bulkEditModal'));
            modal.show();
        });
    
        // Bulk Edit Modal Submission
        $('#bulkEditForm').on('submit', function(e) {
            e.preventDefault();
    
            const selectedIDs = getSelectedContainerIDs();
            if (selectedIDs.length === 0) return;
    
            const updates = {};
            const status = $('#bulkStatus').val();
            const arrival = $('#bulkArrival').val();
    
            function toSafeIsoDate(dateStr) {
                return dateStr ? `${dateStr}T00:00:00` : null;
            }
    
            updates.arrival = toSafeIsoDate($('#bulkArrival').val());
    
            const ajaxCalls = selectedIDs.map(id => {
                return Object.entries(updates).map(([field, value]) => {
                    return $.ajax({
                        url: 'http://localhost:5062/api/containers/update-field',
                        method: 'PATCH',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            containerID: id,
                            field: field.charAt(0).toUpperCase() + field.slice(1),
                            value
                        })
                    });
                });
            }).flat();
    
            Promise.all(ajaxCalls).then(() => {
                bootstrap.Modal.getInstance(document.getElementById('bulkEditModal')).hide();
                $('#ContainerList').DataTable().ajax.reload(null, false);
                showToast('✅ Bulk update complete!', 'success');
            }).catch(err => {
                console.error('❌ Error during bulk update:', err);
                showToast('❌ Some updates failed.', 'danger');
            });
        });
    
        // To keep checkboxes in sync after table redraws
        $('#ContainerList').on('draw.dt', function() {
            $('#selectAll').prop('checked', false); // reset master checkbox
        });
    
        // Inline Delete button
        $('#ContainerList tbody').on('click', '.delete-btn', function() {
            const containerID = $(this).data('id');
            const row = table.row('#' + containerID);
    
            // Temporarily hide the row
            row.node().style.opacity = '0.5';
    
            // Show undo message
            const undoBanner = $(`
                <div class="alert alert-warning alert-dismissible fade show position-fixed bottom-0 end-0 m-4" style="z-index: 1055; min-width: 300px;">
                    <strong>Container ${containerID} deleted.</strong> <button type="button" class="btn btn-sm btn-light ms-2 undo-delete-btn" data-id="${containerID}">Undo</button>
                </div>
            `).appendTo('body');
    
            // ✅ Save deleted row data to localStorage in case you want to restore later
            localStorage.setItem(`deleted-${containerID}`, JSON.stringify(row.data()));
    
            // Start delete timer
            deleteTimeouts[containerID] = setTimeout(() => {
                // Fade out row visually
                $(row.node()).fadeOut(500, function() {
                    $.ajax({
                        url: `http://localhost:5062/api/containers/${containerID}`,
                        method: 'DELETE',
                        success: function() {
                            console.log(`✅ Container ${containerID} permanently deleted.`);
                            table.ajax.reload(null, false);
                            undoBanner.alert('close');
                            localStorage.removeItem(`deleted-${containerID}`);
                        },
                        error: function(xhr, status, error) {
                            console.error(`❌ Failed to delete container ${containerID}:`, error);
                            showToast('❌ Failed to delete. Please try again.', 'danger');
                            $(row.node()).fadeIn(); // restore if error
                            undoBanner.alert('close');
                        }
                    });
                });
            }, 10000);
    
            // Undo Logic
            $('body').on('click', '.undo-delete-btn', function() {
                const containerID = $(this).data('id');
    
                clearTimeout(deleteTimeouts[containerID]);
                delete deleteTimeouts[containerID];
    
                const storedRow = localStorage.getItem(`deleted-${containerID}`);
                if (storedRow) {
                    const rowData = JSON.parse(storedRow);
                    currentEditRow = table.row('#' + containerID);
    
                    if (currentEditRow.node()) {
                        $(currentEditRow.node()).fadeIn();
                    }
    
                    localStorage.removeItem(`deleted-${containerID}`);
                    console.log(`🕓 Undo delete for container ${containerID}`);
                }
    
                $(this).closest('.alert').alert('close');
                $(currentEditRow.node()).css('opacity', '1');
            });
        }); // ✅ Closes the .delete-btn handler (inline)!
    
        // Bulk delete button
        $(document).on('click', '#bulkDeleteBtn', function() {
            const selectedIDs = getSelectedContainerIDs();
    
            if (selectedIDs.length === 0) {
                showToast('⚠️ No containers selected!', 'warning');
                return;
            }
    
            // Save row data and temporarily hide each row
            selectedIDs.forEach(id => {
                const row = table.row('#' + id);
                if (row.node()) {
                    $(row.node()).css('opacity', '0.5');
                    localStorage.setItem(`deleted-${id}`, JSON.stringify(row.data()));
                }
            });
    
            // Show undo banner
            const undoBanner = $(`
                <div class="alert alert-warning alert-dismissible fade show position-fixed bottom-0 end-0 m-4" style="z-index: 1055; min-width: 300px;">
                    <strong>Deleted ${selectedIDs.length} container(s).</strong>
                    <button type="button" class="btn btn-sm btn-light ms-2" id="undoBulkDeleteBtn">Undo</button>
                </div>
            `).appendTo('body');
    
            // Start timer to finalize deletion
            const bulkDeleteTimeout = setTimeout(() => {
                Promise.all(
                    selectedIDs.map(id =>
                        $.ajax({
                            url: `http://localhost:5062/api/containers/${id}`,
                            method: 'DELETE'
                        })
                    )
                ).then(() => {
                    undoBanner.alert('close');
                    selectedIDs.forEach(id => localStorage.removeItem(`deleted-${id}`));
                    table.ajax.reload(null, false);
                }).catch(err => {
                    console.error('❌ Bulk delete error:', err);
                    showToast('❌ Some deletions failed.', 'danger');
                    table.ajax.reload(null, false);
                });
            }, 10000);
    
            // Undo button handler
            $('body').one('click', '#undoBulkDeleteBtn', function() {
                clearTimeout(bulkDeleteTimeout);
                undoBanner.alert('close');
    
                selectedIDs.forEach(id => {
                    const row = table.row('#' + id);
                    if (row.node()) {
                        $(row.node()).css('opacity', '1');
                    }
                    localStorage.removeItem(`deleted-${id}`);
                });
    
                console.log(`🕓 Undo bulk delete for: ${selectedIDs.join(', ')}`);
            });
        });
    
        // Edit Modal form submit
        $('#editForm').on('submit', function(e) {
            e.preventDefault();
    
            const rawArrival = $('#arrival').val();
            const parsedArrival = rawArrival ? new Date(rawArrival) : null;
    
            const formData = {
                containerID: $('#editID').val(),
                containerNumber: $('#containerNumber').val(),
                arrival: parsedArrival instanceof Date && !isNaN(parsedArrival) ? parsedArrival.toISOString() : null,
                currentStatus: $('#currentStatus').val()
            };
    
            const fieldMap = {
                containerNumber: 'ContainerNumber',
                arrival: 'Arrival',
                currentStatus: 'CurrentStatus'
            };
    
            const ajaxCalls = Object.entries(fieldMap).map(([formKey, modelField]) => {
                const value = formData[formKey];
                console.log('Sending:', {
                    containerID: formData.containerID,
                    field: modelField,
                    value
                });
    
                return $.ajax({
                    url: 'http://localhost:5062/api/containers/update-field',
                    method: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        containerID: formData.containerID,
                        field: modelField,
                        value
                    }),
                    success: res => console.log(`✅ Saved ${modelField}:`, res),
                    error: err => console.error(`❌ Save error (${modelField}):`, err)
                });
            });
    
            Promise.all(ajaxCalls).then(() => {
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                table.ajax.reload(null, false); // ✅ reload after save
            });
        });
    
        // 🔁 Utility: move focus to next editable cell
        let moveLock = false; // 👈 Add this outside the function
    
        function moveToNextEditable(currentCell) {
            if (moveLock) return; // throttle rapid calls
        
            moveLock = true;
        
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
        
            setTimeout(() => moveLock = false, 50); // 🔁 allow next move after short delay
        }

        function preserveScrollPosition(action) {
            const container = $('.dataTables_scrollBody')[0]; // or your scroll container
            const scrollTop = container.scrollTop;
        
            action(); // perform your .data(), .draw(false), etc.
        
            // Restore scroll position after a tick
            requestAnimationFrame(() => {
                container.scrollTop = scrollTop;
            });
        }
    };

    let terminalOptions = [];

    function fetchAllTerminalsByPort() {
        const promises = portOptions.map(port =>
            $.getJSON(`http://localhost:5062/api/terminals/by-port/${port.id}`)
                .then(terminals => terminals || [])
                .catch(err => {
                    console.warn(`⚠️ Failed to fetch terminals for port ${port.name}`, err);
                    return [];
                })
        );
    
        return Promise.all(promises)
            .then(results => {
                terminalOptions = results.flat();
                window.terminalOptions = terminalOptions;
                console.log("🌐 Loaded all terminals:", terminalOptions.length);
            });
    }

    $(document).ready(function () {
        fetchDropdownOptions()
            .then(fetchAllTerminalsByPort) // <-- 💥 Add this line
            .then(() => {
                console.log("✅ Dropdowns loaded:", {
                    statusOptions,
                    shiplineOptions,
                    portOptions,
                    terminalOptions // ✅ Will now contain terminal data
                });
                fetchDropdownOptions().then(() => {
                    initializeDataTableAndHandlers();
                });
            })
            .catch(err => {
                console.error("❌ DROPDOWN FETCH ERROR DETAILS:", err);
                showToast("Failed to load dropdown data.", "danger");
            });

            // Populate port dropdown
            const $portDropdown = $('#portSelect');
            portOptions.forEach(port => {
                $portDropdown.append(`<option value="${port.id}">${port.name}</option>`);
            });

            // When a port is selected, load terminals
            $portDropdown.on('change', function () {
                const selectedPortId = $(this).val();
                const $terminalDropdown = $('#terminalSelect');
            
                console.log("📡 Port changed to:", selectedPortId); // 🔍 Check this logs
                if (!selectedPortId) {
                    $terminalDropdown.html('<option value="">Select a port first</option>');
                    return;
                }
            
                $.getJSON(`http://localhost:5062/api/terminals/by-port/${selectedPortId}`, function (data) {
                    console.log("✅ Terminal data received:", data); // 🔍 Check this logs
                    $terminalDropdown.empty().append('<option value="">Select Terminal</option>');
                    data.forEach(terminal => {
                        $terminalDropdown.append(
                            `<option value="${terminal.terminalID}">${terminal.terminal}</option>`
                        );
                    });
                }).fail(err => {
                    showToast("Failed to load terminals for selected port.", "danger");
                    console.error("❌ Error loading terminals by port:", err);
                });
            });
    });    