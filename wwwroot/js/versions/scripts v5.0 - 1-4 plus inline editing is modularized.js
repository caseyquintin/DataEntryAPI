/*!
 * Start Bootstrap - Simple Sidebar v6.0.6 (https://startbootstrap.com/template/simple-sidebar)
 * Copyright 2013-2023 Start Bootstrap
 * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-simple-sidebar/blob/master/LICENSE)
 */
// 
// Scripts
//

// simple options
let statusOptions = [];
let booleanOptions = [];
let containerSizeOptions = [];
let mainSourceOptions = [];
let actualOrEstimateOptions = [];

// more complicated down the line options
let carrierOptions = [];
let carrierIdByName = {};
let shiplineOptions = [];
let shiplineIdByName = {};
let portOptions = [];
let portIdByName = {};
let vesselLineOptions = [];
let vesselsByLine = {};
let terminalOptions = [];
let vesselNameOptions = [];
let vesselLineIdByName = {};

function fetchDropdownOptions() {
    return Promise.all([
        $.getJSON('http://localhost:5062/api/options/status').then(data => statusOptions = data),
        $.getJSON('http://localhost:5062/api/options/boolean').then(data => booleanOptions = data),
        $.getJSON('http://localhost:5062/api/options/containersize').then(data => containerSizeOptions = data),
        $.getJSON('http://localhost:5062/api/options/mainsource').then(data => mainSourceOptions = data),
        $.getJSON('http://localhost:5062/api/options/actualorestimate').then(data => actualOrEstimateOptions = data),
        $.getJSON('http://localhost:5062/api/options/carrier').then(data => {
            // Save the full carrier list
            carrierOptions = data.map(c => ({
                id: c.id,
                name: c.name
            }));

            // 🧠 Save carrier ID lookup map
            data.forEach(c => {
                carrierIdByName[c.name] = c.id;
            });

            console.log("🧠 Carrier Options:", carrierOptions);
            console.log("📦 Carrier ID by Name:", carrierIdByName);

            return carrierOptions;
        }),
        $.getJSON('http://localhost:5062/api/options/shipline').then(data => {
            // Save the full shipline list
            shiplineOptions = data.map(s => ({
                id: s.id,
                name: s.name
            }));

            // 🧠 Save shipline ID lookup map
            data.forEach(s => {
                shiplineIdByName[s.name] = s.id;
            });

            console.log("🧠 Shipline Options:", shiplineOptions);
            console.log("📦 Shipline ID by Name:", shiplineIdByName);

            return shiplineOptions;
        }),
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
        }),
        $.getJSON('http://localhost:5062/api/vessels/vessel-lines').then(data => {
            // Save the full vessel line list
            vesselLineOptions = data.map(v => ({
                id: v.id,
                name: v.name
            }));

            // 🧠 Save vessel line ID lookup map
            data.forEach(v => {
                vesselLineIdByName[v.name] = v.id;
            });

            console.log("🧠 Vessel Lines Options:", vesselLineOptions);
            console.log("📦 Vessel Line ID by Name:", vesselLineIdByName);

            return vesselLineOptions;
        }),
    ]).then(() => {
        console.log("✅ Dropdowns loaded:", { statusOptions, booleanOptions, containerSizeOptions, mainSourceOptions, shiplineOptions, carrierOptions, actualOrEstimateOptions, portOptions, vesselLineOptions});
    });
}

// Inline fetch functions
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

function fetchAllVesselNamesByVesselLine() {
    const promises = vesselLineOptions.map(vLine =>
        $.getJSON(`http://localhost:5062/api/vessels/by-line/${vLine.id}`)
            .then(vesselNames => vesselNames || [])
            .catch(err => {
                console.warn(`⚠️ Failed to fetch vessel names for port ${vLine.name}`, err);
                return [];
            })
    );

    return Promise.all(promises)
        .then(results => {
            vesselNameOptions = results.flat();
            window.vesselNameOptions = vesselNameOptions;
            console.log("🌐 Loaded all vessel names:", vesselNameOptions.length);
        });
} 

// Modal fetch functions
function fetchTerminalsByPortId(portId) {
    return $.getJSON(`http://localhost:5062/api/terminals/by-port/${portId}`);
}

function fetchVesselNamesByVesselLineId(vesselLineId) {
    return $.getJSON(`http://localhost:5062/api/vessels/by-line/${vesselLineId}`);
}


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

function preserveScrollPosition(action) {
    const scrollContainer = $('.dataTables_scrollBody');
    const pos = scrollContainer.scrollTop();
    action();
    scrollContainer.scrollTop(pos);
}

// function setCellDataAndInvalidate(table, cell, value, rowIndex) {
//     cell.data(value);
//     table.row(rowIndex).invalidate('dom');
// }

// async function patchField(containerID, field, value) {
//     try {
//         const payload = {
//             containerID,
//             field,
//             value
//         };

//         const response = await $.ajax({
//             url: 'http://localhost:5062/api/containers/update-field',
//             type: 'PATCH',
//             contentType: 'application/json',
//             data: JSON.stringify(payload)
//         });

//         console.log(`✅ ${field} saved: ${value}`);
//     } catch (err) {
//         console.error(`❌ Failed to update ${field}:`, err);
//         showToast(`❌ Failed to update ${field}`, 'danger');
//     }
// }

window.addEventListener('DOMContentLoaded', async () => {
    let loadingDotsInterval;

    try {
        // 🌀 At the start, show spinner, hide table
        $('#ContainerList').hide();
        $('#tableSpinner').show();

        // 🔵 START loading dots animation NOW
        let dotCount = 0;
        loadingDotsInterval = setInterval(() => {
            const loadingText = document.getElementById('loadingText');
            if (!loadingText) return;

            dotCount = (dotCount + 1) % 4; // 0 → 1 → 2 → 3 → 0
            loadingText.textContent = 'Loading' + '.'.repeat(dotCount);
        }, 500);

        await fetchDropdownOptions();
        await fetchAllTerminalsByPort();
        await fetchAllVesselNamesByVesselLine();

        $('#ContainerList').show();

        initializeContainerTable(); // 💪 Build table here

        // ✅ Sidebar Toggle
        const sidebarToggle = document.body.querySelector('#sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', event => {
                event.preventDefault();
                document.body.classList.toggle('sb-sidenav-toggled');
                localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
            });
        }

    } catch (err) {
        console.error("❌ DROPDOWN FETCH ERROR:", err);
        showToast("Failed to load dropdown data.", "danger");
    } finally {
        // ✅ Hide spinner and remove it
        $('#tableSpinner').fadeOut(400);
    
        // ✅ Show the table
        $('#ContainerList').fadeIn();
    }
});

let deleteTimeouts = {};
function initializeContainerTable () {

        // let lastEditingCell = null
    
        // const editedRows = {}; // Track changed rows
        let currentEditRow = null;

        // Bulk select checkbox helper
        function getSelectedContainerIDs() {
            return $('.row-select:checked').map(function() {
                return $(this).data('id');
            }).get();
        }
    
        // Add bulk action buttons
        const bulkButtons = `
            <div class="d-flex gap-2">
            <button id="addContainerBtn" class="btn btn-success btn-sm">✨ Add Container</button>
            <button id="bulkEditBtn" class="btn btn-primary btn-sm">✏️ Bulk Edit</button>
            <button id="bulkDeleteBtn" class="btn btn-danger btn-sm">🗑️ Bulk Delete</button>
            <button id="customColVisBtn" class="btn btn-secondary btn-sm">🔧 Choose Columns</button>
            </div>
        `;
    
        // Datatable config
        const table = $('#ContainerList').DataTable({
            ajax: {
                url: 'http://localhost:5062/api/containers',
                dataSrc: function (json) {
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
            scroller: true,
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
            dom: 'rt',
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
                    name: 'containerNumber',
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
                    className: 'editable'
                },
                {
                    data: 'berth',
                    name: 'berth',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'berthActual',
                    name: 'berthActual',
                    className: 'editable'
                },
                {
                    data: 'offload',
                    name: 'offload',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'offloadActual',
                    name: 'offloadActual',
                    className: 'editable'
                },
                {
                    data: 'available',
                    name: 'available',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'bolBookingNumber',
                    name: 'bolBookingNumber',
                    className: 'editable'
                },
                {
                    data: 'carrier',
                    name: 'carrier',
                    className: 'editable'
                },
                {
                    data: 'carrierID',
                    name: 'carrierID',
                    className: 'editable'
                },
                {
                    data: 'containerSize',
                    name: 'containerSize',
                    className: 'editable'
                },
                {
                    data: 'currentStatus',
                    name: 'currentStatus',
                    className: 'editable'
                },
                {
                    data: 'delivered',
                    name: 'delivered',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'fpm',
                    name: 'fpm',
                    className: 'editable'
                },
                {
                    data: 'lastUpdated',
                    name: 'lastUpdated',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'loadToRail',
                    name: 'loadToRail',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'mainSource',
                    name: 'mainSource',
                    className: 'editable'
                },
                {
                    data: 'notes',
                    name: 'notes',
                    className: 'editable'
                },
                {
                    data: 'pickupLFD',
                    name: 'pickupLFD',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'poNumber',
                    name: 'poNumber',
                    className: 'editable'
                },
                {
                    data: 'portOfDeparture',
                    name: 'portOfDeparture',
                    className: 'editable'
                },
                {
                    data: 'portOfEntry',
                    name: 'portOfEntry',
                    className: 'editable'
                },
                {
                    data: 'portID',
                    name: 'portID',
                    visible: true // change to false after debugging
                },
                {
                    data: 'terminal',
                    name: 'terminal',
                    className: 'editable'
                },
                {
                    data: 'terminalID',
                    name: 'terminalID',
                    visible: true // change to false after debugging
                },
                {
                    data: 'portRailwayPickup',
                    name: 'portRailwayPickup',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'projectNumber',
                    name: 'projectNumber',
                    className: 'editable'
                },
                {
                    data: 'rail',
                    name: 'rail',
                    className: 'editable'
                },
                {
                    data: 'railDeparture',
                    name: 'railDeparture',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'railDestination',
                    name: 'railDestination',
                    className: 'editable'
                },
                {
                    data: 'railETA',
                    name: 'railETA',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'railPickupNumber',
                    name: 'railPickupNumber',
                    className: 'editable'
                },
                {
                    data: 'railwayLine',
                    name: 'railwayLine',
                    className: 'editable'
                },
                {
                    data: 'returned',
                    name: 'returned',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'returnLFD',
                    name: 'returnLFD',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'sail',
                    name: 'sail',
                    className: 'editable',
                    render: data => data ? new Date(data).toLocaleDateString() : ''
                },
                {
                    data: 'sailActual',
                    name: 'sailActual',
                    className: 'editable'
                },
                {
                    data: 'shipline',
                    name: 'shipline',
                    className: 'editable'
                },
                {
                    data: 'shiplineID',
                    name: 'shiplineID',
                    className: 'editable'
                },
                {
                    data: 'shipmentNumber',
                    name: 'shipmentNumber',
                    className: 'editable'
                },
                {
                    data: 'transload',
                    name: 'transload',
                    className: 'editable'
                },
                {
                    data: 'vendor',
                    name: 'vendor',
                    className: 'editable'
                },
                {
                    data: 'vendorIDNumber',
                    name: 'vendorIDNumber',
                    className: 'editable'
                },
                {
                    data: 'vesselLine',
                    name: 'vesselLine',
                    className: 'editable'
                },
                {
                    data: 'vesselLineID',
                    name: 'vesselLineID',
                    visible: true // change to false after debugging
                },
                {
                    data: 'vesselName',
                    name: 'vesselName',
                    className: 'editable'
                },
                {
                    data: 'vesselID',
                    name: 'vesselID',
                    visible: true // change to false after debugging
                },
                {
                    data: 'voyage',
                    name: 'voyage',
                    className: 'editable'
                }
                    
            ],
            
            initComplete: function() {
                const table = this.api();

                table.buttons().container().appendTo('.dt-buttons');

                initializeDataTableHandlers(table);
  
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
    
                $('#bulkButtons').html(bulkButtons);
    
                $('#ContainerList').on('mouseenter', 'td', function() {
                    const cell = $(this);
                    if (this.offsetWidth < this.scrollWidth) {
                        cell.attr('title', cell.text());
                    } else {
                        cell.removeAttr('title');
                    }
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

        // // ✅ INLINE EDITING HANDLER: Save changes to backend
        // $('#ContainerList tbody').on('click', 'td.editable', async function () {
        //     const cell = table.cell(this);
        //     const originalValue = cell.data();
        //     const rowData = table.row(this).data();
        //     const fieldIndex = cell.index().column;
        //     const fieldName = table.settings().init().columns[fieldIndex].data;
        //     console.log("📌 Field name clicked:", fieldName);
        //     const rowID = rowData.containerID;
    
        //     // Don't re-enter editing mode
        //     if ($(this).hasClass('editing')) return;
    
        //     // 🧼 Close any open editing fields first
        //     $('#ContainerList td.editing input').each(function () {
        //         const td = $(this).closest('td');
        //         const tempCell = table.cell(td);
        //         const val = $(this).val();
        //         tempCell.data(val).draw(false);
        //         td.removeClass('editing');
        //     });
    
        //     $(this).addClass('editing');
        //     lastEditingCell = this;
    
        //     const isDateField = [
        //         'arrival', 'available', 'berth', 'delivered', 'lastUpdated', 'loadToRail',
        //         'offload', 'pickupLFD', 'portRailwayPickup', 'railDeparture', 'railETA',
        //         'returned', 'returnLFD', 'sail'
        //     ].includes(fieldName);
            
        //     let isDropdownField = null;

        //     if (fieldName === 'currentStatus') {
        //         isDropdownField = statusOptions;
        //     } else if (fieldName === 'carrier') {
        //         isDropdownField = carrierOptions.map(c => c.name);
        //     } else if (['arrivalActual', 'berthActual', 'offloadActual', 'sailActual'].includes(fieldName)) {
        //         isDropdownField = actualOrEstimateOptions;
        //     } else if (['rail', 'transload'].includes(fieldName)) {
        //         isDropdownField = booleanOptions;
        //     } else if (fieldName === 'containerSize') {
        //         isDropdownField = containerSizeOptions;
        //     } else if (fieldName === 'mainSource') {
        //         isDropdownField = mainSourceOptions;
        //     } else if (fieldName === 'shipline') {
        //         // Set dropdown options to available shiplines
        //         isDropdownField = shiplineOptions.map(s => s.name);
        //     } else if (fieldName === 'portOfEntry') {
        //         // Set dropdown options to available ports
        //         isDropdownField = portOptions.map(p => p.name);
        //     } else if (fieldName === 'terminal') {
        //         const updatedRow = table.row(cell.index().row).data();
        //         let portId = updatedRow.portID;
                
        //         // 💡 Check if the user previously changed portOfEntry
        //         const portEntryName = updatedRow.portOfEntry;
        //         const matchedPort = portOptions.find(p => p.name === portEntryName);
                
        //         if (matchedPort) {
        //             portId = matchedPort.id;
        //             console.log("📌 Port override via name match:", portEntryName, "→", portId);
        //         } else {
        //             console.warn("⚠️ Could not match portOfEntry to a known port:", portEntryName);
        //         }
                
        //         if (portId) {
        //             try {
        //                 const data = await $.getJSON(`http://localhost:5062/api/terminals/by-port/${portId}`);
        //                 console.log("🧪 Terminal raw API data:", data);
                
        //                 // ✅ Proper mapping for dropdown
        //                 isDropdownField = data.map(t => {
        //                     console.log("🔬 Checking terminal mapping:", t);
        //                     return {
        //                         value: t.terminalID,
        //                         label: typeof t.terminal === 'string'
        //                         ? t.terminal
        //                         : (typeof t.terminal === 'object' && t.terminal.terminal)
        //                             ? t.terminal.terminal
        //                             : '[Missing Terminal Name]'
        //                     };
        //                 });
        //                 console.table(isDropdownField, ['value', 'label']);
                
        //                 console.log("🎯 Terminal dropdown options ready:", isDropdownField);
                
        //             } catch (err) {
        //                 console.error(`❌ Failed to fetch terminals for port ID ${portId}`, err);
        //                 showToast("❌ Failed to load terminals for selected port.", "danger");
        //                 isDropdownField = [];
        //             }
        //         } else {
        //             console.warn("⚠️ No portID available on this row");
        //             isDropdownField = [];
        //         }
        //     } else if (fieldName === 'vesselLine') {
        //         // Set dropdown options to available vessel lines
        //         isDropdownField = vesselLineOptions.map(v => v.name);
        //     } else if (fieldName === 'vesselName') {
        //         const updatedRow = table.row(cell.index().row).data();
        //         let vesselLineId = updatedRow.vesselLineID;
                
        //         // 💡 Check if the user previously changed vesselLine
        //         const vesselLineName = updatedRow.vesselLine;
        //         const matchedVesselLine = vesselLineOptions.find(v => v.name === vesselLineName);
                
        //         if (matchedVesselLine) {
        //             vesselLineId = matchedVesselLine.id;
        //             console.log("📌 Vessel Line override via name match:", vesselLineName, "→", vesselLineId);
        //         } else {
        //             console.warn("⚠️ Could not match vesselLine to a known Vessel Line:", vesselLineName);
        //         }
                
        //         if (vesselLineId) {
        //             try {
        //                 const data = await $.getJSON(`http://localhost:5062/api/vessels/by-line/${vesselLineId}`);
        //                 console.log("🧪 Vessel Name raw API data:", data);
                
        //                 // ✅ Proper mapping for dropdown
        //                 isDropdownField = data.map(n => {
        //                     console.log("🔬 Checking vessel name mapping:", n);
        //                     return {
        //                         value: n.vesselID,
        //                         label: typeof n.vesselName === 'string'
        //                         ? n.vesselName
        //                         : (typeof n.vesselName === 'object' && n.vesselName.vesselName)
        //                             ? n.vesselName.vesselName
        //                             : '[Missing Vessel Name]'
        //                     };
        //                 });
        //                 console.table(isDropdownField, ['value', 'label']);
                
        //                 console.log("🎯 Vessel Name dropdown options ready:", isDropdownField);
                
        //             } catch (err) {
        //                 console.error(`❌ Failed to fetch vessel name for vessel line ID ${vesselLineId}`, err);
        //                 showToast("❌ Failed to load vessel names for selected vessel line.", "danger");
        //                 isDropdownField = [];
        //             }
        //         } else {
        //             console.warn("⚠️ No vesselLineId available on this row");
        //             isDropdownField = [];
        //         }
        //     }
            
        //     let inputHtml = '';
        //     if (Array.isArray(isDropdownField) && isDropdownField.length > 0) {
        //         const normalizedOriginal = String(originalValue).trim();
                
        //         inputHtml = `<select class="form-select form-select-sm">` +
        //         isDropdownField.map(opt => {
        //             const label = typeof opt === 'string' ? opt : opt.label;
        //             const value = typeof opt === 'string' ? opt : opt.value;
        //             const isSelected = (String(label).trim() === normalizedOriginal || String(value).trim() === normalizedOriginal) ? 'selected' : '';

        //             return `<option value="${value}" ${isSelected}>${label}</option>`;
        //         }).join('') +
        //     `</select>`;
            
        //     } else if (Array.isArray(isDropdownField) && isDropdownField.length === 0) {
        //         console.warn("⚠️ No dropdown options found for field:", fieldName);
        //         inputHtml = `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}" placeholder="No options available">`;
        //     }
        //         else if (isDateField) {
        //         const value = originalValue ? new Date(originalValue).toLocaleDateString('en-US') : '';
        //         inputHtml = `<input type="text" class="form-control form-control-sm date-field" value="${value}">`;                
        //     } else {
        //         inputHtml = `<input type="text" class="form-control form-control-sm" value="${originalValue ?? ''}">`;
        //     }
        //     cell.node().innerHTML = `<div style="min-width: 100px;">${inputHtml}</div>`;

        //     // ✅ This goes AFTER the HTML is in the DOM
        //     const input = $('input, select', this).focus().trigger('mousedown');

        //     if (fieldName === 'carrier') {
        //         input.on('change', function () {
        //             const selectedCarrierName = $(this).val();
        //             const selectedCarrierId = carrierIdByName[selectedCarrierName];
                
        //             if (!selectedCarrierId) {
        //             console.warn("⚠️ Carrier name not recognized:", selectedCarrierName);
        //             return;
        //             }
                
        //             // 🧠 Update carrier (name)
        //             preserveScrollPosition(() => {
        //             setCellDataAndInvalidate(table, cell, selectedCarrierName, cell.index().row);
        //         });
                
        //             // 📌 Also update carrierID (hidden column)
        //             const carrierIDColIdx = table.column('carrierID:name').index();
        //             const carrierIDCell = table.cell(cell.index().row, carrierIDColIdx);
        //             setCellDataAndInvalidate(table, carrierIDCell, selectedCarrierId, cell.index().row);
                
        //             // 🔁 PATCH to backend
        //             const patchCarrierName = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'Carrier',
        //                 value: selectedCarrierName
        //             })
        //             });
                
        //             const patchCarrierID = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'CarrierID',
        //                 value: String(selectedCarrierId)
        //             })
        //             });
                
        //             Promise.all([patchCarrierName, patchCarrierID])
        //             .then(() => {
        //                 showToast('✅ Carrier updated', 'success');
        //             })
        //             .catch(err => {
        //                 console.error("❌ Failed to PATCH carrier change:", err);
        //                 showToast('❌ Failed to update carrier', 'danger');
        //             });
                
        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node());
        //         });
        //     }

        //     if (fieldName === 'shipline') {
        //         input.on('change', function () {
        //             const selectedShiplineName = $(this).val();
        //             const selectedShiplineId = shiplineIdByName[selectedShiplineName];
                
        //             if (!selectedShiplineId) {
        //             console.warn("⚠️ Shipline name not recognized:", selectedShiplineName);
        //             return;
        //             }
                
        //             // 🧠 Update shipline (name)
        //             preserveScrollPosition(() => {
        //             setCellDataAndInvalidate(table, cell, selectedShiplineName, cell.index().row);
        //         });
                
        //             // 📌 Also update shiplineID (hidden column)
        //             const shiplineIDColIdx = table.column('shiplineID:name').index();
        //             const shiplineIDCell = table.cell(cell.index().row, shiplineIDColIdx);
        //             setCellDataAndInvalidate(table, shiplineIDCell, selectedShiplineId, cell.index().row);
                
        //             // 🔁 PATCH to backend
        //             const patchShiplineName = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'Shipline',
        //                 value: selectedShiplineName
        //             })
        //             });
                
        //             const patchShiplineID = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'ShiplineID',
        //                 value: String(selectedShiplineId)
        //             })
        //             });
                
        //             Promise.all([patchShiplineName, patchShiplineID])
        //             .then(() => {
        //                 showToast('✅ Shipline updated', 'success');
        //             })
        //             .catch(err => {
        //                 console.error("❌ Failed to PATCH shipline change:", err);
        //                 showToast('❌ Failed to update shipline', 'danger');
        //             });
                
        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node());
        //         });
        //     }

        //     if (fieldName === 'portOfEntry') {
        //         input.on('change', function () {
        //             const selectedPortName = $(this).val();
        //             const selectedPortId = portIdByName[selectedPortName];
                
        //             if (!selectedPortId) {
        //             console.warn("⚠️ Port name not recognized:", selectedPortName);
        //             return;
        //             }
                
        //             // 🧠 Update portOfEntry (name)
        //             preserveScrollPosition(() => {
        //             setCellDataAndInvalidate(table, cell, selectedPortName, cell.index().row);
        //         });
                
        //             // 📌 Also update portID (hidden column)
        //             const portIDColIdx = table.column('portID:name').index();
        //             const portIDCell = table.cell(cell.index().row, portIDColIdx);
        //             setCellDataAndInvalidate(table, portIDCell, selectedPortId, cell.index().row);
                
        //             // 🔁 PATCH to backend
        //             const patchPortName = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'PortOfEntry',
        //                 value: selectedPortName
        //             })
        //             });
                
        //             const patchPortID = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'PortID',
        //                 value: String(selectedPortId)
        //             })
        //             });
                
        //             Promise.all([patchPortName, patchPortID])
        //             .then(() => {
        //                 showToast('✅ Port updated', 'success');
                
        //                 // 🎯 Optional: Reset terminal cell so it refreshes
        //                 const terminalColIdx = table.column('terminal:name').index();
        //                 const terminalCell = table.cell(cell.index().row, terminalColIdx);
        //                 preserveScrollPosition(() => {terminalCell.data('').draw(false)});
                
        //                 const terminalIDColIdx = table.column('terminalID:name').index();
        //                 const rowIdx = table.row(`#${rowID}`).index();
        //                 preserveScrollPosition(() => {
        //                 table.cell(rowIdx, terminalIDColIdx).data('').draw(false);
        //                 });
        //             })
        //             .catch(err => {
        //                 console.error("❌ Failed to PATCH port change:", err);
        //                 showToast('❌ Failed to update port', 'danger');
        //             });
                
        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node());
        //         });
        //     }

        //     if (fieldName === 'terminal') {
        //         input.on('change', function () {
        //             const newValue = $(this).val();
        //             const match = isDropdownField.find(opt => opt.value == newValue);
        //             const terminalName = match ? match.label : '[Unknown Terminal]';

        //             console.log("📌 Terminal dropdown change triggered:", { newValue, terminalName });

        //             // Update terminal name (visible column)
        //             const terminalColIndex = table.column('terminal:name').index();
        //             const terminalCell = table.cell(cell.index().row, terminalColIndex);
        //             preserveScrollPosition(() => {terminalCell.data(terminalName).draw(false)});

        //             // Update terminal ID (hidden column)
        //             const terminalIDColIndex = table.column('terminalID:name').index();
        //             const terminalIDCell = table.cell(cell.index().row, terminalIDColIndex);
        //             terminalIDCell.data(Number(newValue)).draw(false);

        //             // Save both to backend
        //             const patchRequests = [
        //                 fetch('http://localhost:5062/api/containers/update-field', {
        //                     method: 'PATCH',
        //                     headers: { 'Content-Type': 'application/json' },
        //                     body: JSON.stringify({
        //                         containerID: rowID,
        //                         field: 'TerminalID',
        //                         value: String(newValue)
        //                     })
        //                 })
        //             ];

        //             if (terminalName && terminalName !== '[Unknown Terminal]') {
        //                 patchRequests.push(
        //                     fetch('http://localhost:5062/api/containers/update-field', {
        //                         method: 'PATCH',
        //                         headers: { 'Content-Type': 'application/json' },
        //                         body: JSON.stringify({
        //                             containerID: rowID,
        //                             field: 'Terminal',
        //                             value: terminalName
        //                         })
        //                     })
        //                 );
        //             }

        //             Promise.all(patchRequests).then(() => {
        //                 console.log(`✅ Terminal + TerminalID PATCH complete for container ${rowID}`);
        //                 showToast('✅ Terminal updated', 'success');
        //             }).catch(err => {
        //                 console.error(`❌ PATCH failed:`, err);
        //                 showToast('❌ Failed to update terminal info', 'danger');
        //             });

        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node());
        //         });
        //     }

        //     if (fieldName === 'vesselLine') {
        //         input.on('change', function () {
        //             const selectedVesselLineName = $(this).val();
        //             const selectedVesselLineId = vesselLineIdByName[selectedVesselLineName];
                
        //             if (!selectedVesselLineId) {
        //             console.warn("⚠️ Vessel Line name not recognized:", selectedVesselLineName);
        //             return;
        //             }
                
        //             // 🧠 Update vesselLine (name)
        //             preserveScrollPosition(() => {
        //             setCellDataAndInvalidate(table, cell, selectedVesselLineName, cell.index().row);
        //         });
                
        //             // 📌 Also update vesselLineID (hidden column)
        //             const vesselLineIDColIdx = table.column('vesselLineID:name').index();
        //             const vesselLineIDCell = table.cell(cell.index().row, vesselLineIDColIdx);
        //             setCellDataAndInvalidate(table, vesselLineIDCell, selectedVesselLineId, cell.index().row);
                
        //             // 🔁 PATCH to backend
        //             const patchVesselLineName = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'vesselLine',
        //                 value: selectedVesselLineName
        //             })
        //             });
                
        //             const patchvesselLineID = fetch('http://localhost:5062/api/containers/update-field', {
        //             method: 'PATCH',
        //             headers: { 'Content-Type': 'application/json' },
        //             body: JSON.stringify({
        //                 containerID: rowID,
        //                 field: 'vesselLineID',
        //                 value: String(selectedVesselLineId)
        //             })
        //             });
                
        //             Promise.all([patchVesselLineName, patchvesselLineID])
        //             .then(() => {
        //                 showToast('✅ Vessel Line updated', 'success');
                
        //                 // 🎯 Optional: Reset vesselName cell so it refreshes
        //                 const vesselNameColIdx = table.column('vesselName:name').index();
        //                 const vesselNameCell = table.cell(cell.index().row, vesselNameColIdx);
        //                 preserveScrollPosition(() => {vesselNameCell.data('').draw(false)});
                
        //                 const vesselIDColIdx = table.column('vesselID:name').index();
        //                 const rowIdx = table.row(`#${rowID}`).index();
        //                 preserveScrollPosition(() => {
        //                 table.cell(rowIdx, vesselIDColIdx).data('').draw(false);
        //                 });
        //             })
        //             .catch(err => {
        //                 console.error("❌ Failed to PATCH port change:", err);
        //                 showToast('❌ Failed to update port', 'danger');
        //             });
                
        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node());
        //         });
        //         }

        //     if (fieldName === 'vesselName') {
        //         input.on('change', function () {
        //             const newValue = $(this).val();
        //             const match = isDropdownField.find(opt => opt.value == newValue);
        //             const vesselNameName = match ? match.label : '[Unknown vesselName]';

        //             console.log("📌 vesselName dropdown change triggered:", { newValue, vesselNameName });

        //             // Update vesselName name (visible column)
        //             const vesselNameColIndex = table.column('vesselName:name').index();
        //             const vesselNameCell = table.cell(cell.index().row, vesselNameColIndex);
        //             preserveScrollPosition(() => {vesselNameCell.data(vesselNameName).draw(false)});

        //             // Update terminal ID (hidden column)
        //             const vesselIDColIndex = table.column('vesselID:name').index();
        //             const vesselIDCell = table.cell(cell.index().row, vesselIDColIndex);
        //             vesselIDCell.data(Number(newValue)).draw(false);

        //             // Save both to backend
        //             const patchRequests = [
        //                 fetch('http://localhost:5062/api/containers/update-field', {
        //                     method: 'PATCH',
        //                     headers: { 'Content-Type': 'application/json' },
        //                     body: JSON.stringify({
        //                         containerID: rowID,
        //                         field: 'VesselID',
        //                         value: String(newValue)
        //                     })
        //                 })
        //             ];

        //             if (vesselNameName && vesselNameName !== '[Unknown Vessel Name]') {
        //                 patchRequests.push(
        //                     fetch('http://localhost:5062/api/containers/update-field', {
        //                         method: 'PATCH',
        //                         headers: { 'Content-Type': 'application/json' },
        //                         body: JSON.stringify({
        //                             containerID: rowID,
        //                             field: 'VesselName',
        //                             value: vesselNameName
        //                         })
        //                     })
        //                 );
        //             }

        //             Promise.all(patchRequests).then(() => {
        //                 console.log(`✅ VesselName + VesselID PATCH complete for container ${rowID}`);
        //                 showToast('✅ VesselName updated', 'success');
        //             }).catch(err => {
        //                 console.error(`❌ PATCH failed:`, err);
        //                 showToast('❌ Failed to update vessel name info', 'danger');
        //             });

        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node());
        //         });
        //     }
            
        //     if (isDateField) {
        //         flatpickr(input[0], {
        //             dateFormat: 'm/d/Y',
        //             allowInput: true,
        //             onChange: function(selectedDates, dateStr) {
        //                 // Trigger blur so your handler sees the change
        //                 input.trigger('blur');
        //             }
        //         });
        //     }
    
        //     let inputValue = originalValue;
        //     if (isDateField && originalValue) {
        //         const parsed = new Date(originalValue);
        //         inputValue = parsed.toISOString().split('T')[0];
        //     }
    
        //     if (inputValue == null) inputValue = '';
    
        //     let preventBlur = false;
    
        //     input.on('keydown', function (e) {
        //         if (e.key === 'Tab' || e.key === 'Enter') {
        //             e.preventDefault();
        //             preventBlur = true;
            
        //             let newValue = input.val().trim();
        //             if (newValue === 'null') newValue = '';
            
        //             if (isDateField && newValue) {
        //                 const parsed = new Date(newValue);
        //                 newValue = isNaN(parsed.getTime()) ? originalValue : parsed.toISOString();
        //             }
            
        //             const changed = newValue !== originalValue;
            
        //             // 🔁 Fallback for other fields
        //             if (changed) {
        //                 preserveScrollPosition(() => cell.data(newValue).draw(false));
        //                 fetch('http://localhost:5062/api/containers/update-field', {
        //                     method: 'PATCH',
        //                     headers: { 'Content-Type': 'application/json' },
        //                     body: JSON.stringify({
        //                         containerID: rowID,
        //                         field: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
        //                         value: newValue
        //                     })
        //                 }).catch(err => {
        //                     console.error(`❌ Failed to save ${fieldName}`, err);
        //                     showToast(`❌ Failed to update ${fieldName}`, 'danger');
        //                 });
        //             } else {
        //                 preserveScrollPosition(() => cell.data(originalValue).draw(false));
        //             }
                    
        //             $(cell.node()).removeClass('editing');
        //             moveToNextEditable(cell.node()); // ✅ Always move!
                    
        //         }
            
        //         if (e.key === 'Escape') {
        //             preventBlur = true;
        //             setTimeout(() => {
        //                 preserveScrollPosition(() => {
        //                     cell.data(originalValue).draw(false);
        //                     });
        //                     $(cell.node()).removeClass('editing');
        //             }, 0);
        //         }
        //     });

        //     input.on('blur', function () {
        //         if (preventBlur) return;
            
        //         requestAnimationFrame(() => {
        //             const $active = document.activeElement;
        //             if ($(cell.node()).has($active).length) return;
            
        //             let newValue = input.val();
        //             if (newValue != null) newValue = newValue.toString().trim();
        //             let formattedValue = newValue;
        //             let displayValue = originalValue;
            
        //             if (fieldName === 'terminal' && Array.isArray(isDropdownField)) {
        //                 const matchedOption = isDropdownField.find(opt => opt.value == newValue);
        //                 displayValue = matchedOption ? matchedOption.label : newValue;
        //             } else if (fieldName === 'vesselName' && Array.isArray(isDropdownField)) {
        //                 const matchedOption = isDropdownField.find(opt => opt.value == newValue);
        //                 displayValue = matchedOption ? matchedOption.label : newValue;
        //             } else if (isDateField && newValue) {
        //                 const parsed = new Date(newValue);
        //                 if (!isNaN(parsed.getTime())) {
        //                     formattedValue = parsed.toISOString();
        //                     displayValue = parsed.toLocaleDateString();
        //                 } else {
        //                     formattedValue = originalValue;
        //                 }
        //             } else if (!isDateField && newValue !== originalValue) {
        //                 displayValue = formattedValue = newValue;
        //             }
            
        //             if (formattedValue !== originalValue) {
        //                 cell.data(displayValue);
        //                 preserveScrollPosition(() => {table.row(cell.index().row).invalidate()});

        //                 // 🛑 Avoid PATCHing Carrier again (already handled in change handler)
        //                 if (fieldName === 'carrier') {
        //                     console.warn("⚠️ Skipping fallback PATCH — Carrier already patched on change.");
        //                     return;
        //                 }

        //                 // 🛑 Avoid PATCHing Shipline again (already handled in change handler)
        //                 if (fieldName === 'shipline') {
        //                     console.warn("⚠️ Skipping fallback PATCH — Shipline already patched on change.");
        //                     return;
        //                 }

        //                 // 🛑 Avoid PATCHing PortOfEntry again (already handled in change handler)
        //                 if (fieldName === 'portOfEntry') {
        //                     console.warn("⚠️ Skipping fallback PATCH — PortOfEntry already patched on change.");
        //                     return;
        //                 }
                        
        //                 if (fieldName === 'terminal') {
        //                     console.warn("⚠️ Skipping blur PATCH for terminal — already handled.");
        //                     $(cell.node()).removeClass('editing');
        //                     return;
        //                 }

        //                 // 🛑 Avoid PATCHing vesselLine again (already handled in change handler)
        //                 if (fieldName === 'vesselLine') {
        //                     console.warn("⚠️ Skipping fallback PATCH — vesselLine already patched on change.");
        //                     return;
        //                 }
                        
        //                 if (fieldName === 'vesselName') {
        //                     console.warn("⚠️ Skipping blur PATCH for vesselName — already handled.");
        //                     $(cell.node()).removeClass('editing');
        //                     return;
        //                 }

        //                 fetch('http://localhost:5062/api/containers/update-field', {
        //                     method: 'PATCH',
        //                     headers: { 'Content-Type': 'application/json' },
        //                     body: JSON.stringify({
        //                         containerID: rowID,
        //                         field: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
        //                         value: formattedValue
        //                     })
        //                 }).catch(err => console.error(`❌ Failed to save ${fieldName}`, err));
        //             } else {
        //                 cell.data(originalValue);
        //                 preserveScrollPosition(() => {table.row(cell.index().row).invalidate()});
        //             }
            
        //             $(cell.node()).removeClass('editing');
        //         });
        //     });
        // });
    
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

        // Choose Columns button
        $(document).on('click', '#applyColVis', function () {
            const $btn = $(this).prop('disabled', true).text('Applying...');
            const modalEl = document.getElementById('columnModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
        
            const updates = [];
        
            $('#columnVisibilityForm input[type="checkbox"]').each(function () {
                const index = $(this).data('column');
                const isVisible = $(this).is(':checked');
                if (table.column(index).visible() !== isVisible) {
                    updates.push(() => table.column(index).visible(isVisible, false));
                }
            });
        
            // Step 1: Hide modal
            modal.hide();
        
            // Step 2: Apply visibility in batch AFTER modal closes
            $(modalEl).one('hidden.bs.modal', function () {
                setTimeout(() => {
                    // Step 3: Apply changes
                    updates.forEach(fn => fn());
        
                    // Step 4: Adjust layout on next idle frame
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(() => {
                            preserveScrollPosition(() => 
                                table.columns.adjust(),
                            );
                            $btn.prop('disabled', false).text('Apply');
                        }, { timeout: 400 });
                    } else {
                        setTimeout(() => {
                            preserveScrollPosition(() => 
                                table.columns.adjust(),
                        );
                            $btn.prop('disabled', false).text('Apply');
                        }, 200);
                    }
                }, 100); // wait a bit after fade out
            });
        });
        
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
        // let moveLock = false; // 👈 Add this outside the function
    
        // function moveToNextEditable(currentCell) {
        //     if (moveLock) return; // throttle rapid calls
        
        //     moveLock = true;
        
        //     const $cells = $('#ContainerList td.editable:visible');
        //     const currentIndex = $cells.index(currentCell);
        //     const $next = $cells.eq(currentIndex + 1);
        
        //     if ($next.length) {
        //         $next.trigger('click');
        
        //         requestAnimationFrame(() => {
        //             const input = $next.find('input')[0];
        //             if (input) input.focus();
        //         });
        //     }
        
        //     setTimeout(() => moveLock = false, 50); // 🔁 allow next move after short delay
        // }

    };