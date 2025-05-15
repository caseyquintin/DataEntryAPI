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
let fpmOptions = [];
let fpmIdByName = {};
let portOptions = [];
let portIdByName = {};
let vesselLineOptions = [];
let vesselsByLine = {};
let terminalOptions = [];
let vesselNameOptions = [];
let vesselLineIdByName = {};

let railStylingApplied = false;

// Dynamic Link Processing
// Utility function to create link icons
function createLinkIcon(url, tooltip = 'Visit website', isDynamic = false) {
    if (!url) return '';
    
    // Use a different icon class for dynamic links
    const iconClass = isDynamic ? 'fas fa-search' : 'fas fa-external-link-alt';
    
    // Add a dynamic link class if applicable
    const dynamicClass = isDynamic ? 'dynamic-link' : '';
    
    return `<a href="${url}" target="_blank" class="ms-2 external-link ${dynamicClass}" 
              data-bs-toggle="tooltip" title="${tooltip}"
              onclick="event.stopPropagation();">
              <i class="${iconClass}"></i>
            </a>`;
}

// Process dynamic links that need container substitution
function getProcessedLink(entityType, entityName, containerNumber, voyageNumber) {
    if (!entityName) return '';
    
    let entity, isEntityWithDynamicLink;
    
    if (entityType === 'shipline') {
        entity = shiplineOptions.find(s => s.name === entityName);
        isEntityWithDynamicLink = entity?.isDynamicLink;
    } 
    else if (entityType === 'vesselLine') {
        entity = vesselLineOptions.find(v => v.name === entityName);
        isEntityWithDynamicLink = entity?.isDynamicLink;
    }
    else if (entityType === 'terminal') {
        entity = terminalOptions.find(t => t.terminal === entityName);
        isEntityWithDynamicLink = false;
    }
    
    // If no entity found or no link available, return empty string
    if (!entity || !entity.link) return '';
    
    // Process the link if it's dynamic
    if (isEntityWithDynamicLink) {
        // Get the raw link from our options
        let processedLink = entity.link;
        
        // Replace container placeholders if available
        if (containerNumber) {
            processedLink = processedLink
                .replace('{container}', containerNumber)
                .replace('{CONTAINER}', containerNumber)
                .replace('container=\\r', `container=${containerNumber}`);
        }
        
        // Replace voyage placeholders if available
        if (voyageNumber) {
            processedLink = processedLink
                .replace('{voyage}', voyageNumber)
                .replace('{VOYAGE}', voyageNumber)
                .replace('{voy}', voyageNumber)
                .replace('{VOY}', voyageNumber);
        }
        
        // If there are still placeholders but we don't have values,
        // return the base URL
        if ((processedLink.includes('{container}') || processedLink.includes('container=\\r')) && !containerNumber ||
            (processedLink.includes('{voyage}') || processedLink.includes('{voy}')) && !voyageNumber) {
            return processedLink.split('?')[0]; // Return base URL without query parameters
        }
        
        return processedLink;
    }
    
    // For non-dynamic links, return as-is
    return entity.link;
}

// Fetch dropdown options
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
        $.getJSON('http://localhost:5062/api/shiplines').then(data => {
            // Save the full shipline list with links
            shiplineOptions = data.map(s => ({
                id: s.id,
                name: s.name,
                link: s.link,
                isDynamicLink: s.isDynamicLink
            }));

            // Keep the ID lookup map as before
            data.forEach(s => {
                shiplineIdByName[s.name] = s.id;
            });

            console.log("🧠 Shipline Options:", shiplineOptions);
            return shiplineOptions;
        }),
        $.getJSON('http://localhost:5062/api/FPMs').then(data => {
            // Save the full fpm list
            fpmOptions = data.map(f => ({
                id: f.id,
                name: f.name
            }));

            // 🧠 Save Fpm ID lookup map
            data.forEach(f => {
                fpmIdByName[f.name] = f.id;
            });

            console.log("🧠 Fpm Options:", fpmOptions);
            console.log("📦 Fpm ID by Name:", fpmIdByName);

            return fpmOptions;
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
            // Save the full vessel line list with links
            vesselLineOptions = data.map(v => ({
                id: v.id,
                name: v.name,
                link: v.link,
                isDynamicLink: v.isDynamicLink
            }));

            // Keep the ID lookup map as before
            data.forEach(v => {
                vesselLineIdByName[v.name] = v.id;
            });

            console.log("🧠 Vessel Lines Options:", vesselLineOptions);
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
            // Now terminalOptions will include link information
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

function alignCheckboxes() {
    // Get position of the first row checkbox
    const firstRowCheckbox = $('.row-select').first();
    if (firstRowCheckbox.length) {
        const rowPosition = firstRowCheckbox.position();
        
        // Adjust the "Select All" checkbox to match
        $('#selectAll').css({
        'position': 'relative',
        'top': (rowPosition.top > 0 ? 0 : '0px'),
        'margin': '0'
        });
    }
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

window.addEventListener('DOMContentLoaded', async () => {
    let loadingDotsInterval;

    try {
        $('#ContainerList').hide();
        $('#tableSpinner').show();

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

        initializeContainerTable();

        $(document).ready(function() {
            // Wait for DataTables to finish rendering
            setTimeout(alignCheckboxes, 100);
            
            // Also call when window resizes
            $(window).on('resize', alignCheckboxes);
            
        });

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

    console.log("🚀 initializeContainerTable called");
    
    // Prevent multiple initializations
    if ($.fn.DataTable.isDataTable('#ContainerList')) {
        console.log('⚠️ DataTable already initialized, skipping...');
        return $('#ContainerList').DataTable(); // Return existing instance
    }
    
    console.log('✅ Initializing new DataTable');

    let currentEditRow = null;

    function applyRailStyling() {
        console.log("⚙️ Manually applying rail styling to all rows");
        try {
            const table = $('#ContainerList').DataTable();
            
            // Loop through each row
            table.rows().every(function(rowIdx) {
                const rowData = this.data();
                const railValue = rowData.rail;
                
                // Check if rail is disabled
                const isDisabled = !railValue || 
                    railValue === 'No' || 
                    railValue === 'no' || 
                    railValue === 'NO' || 
                    railValue === 'n' || 
                    railValue === false ||
                    railValue === '0';
                
                console.log(`🛠️ Setting rail for row ${rowIdx}, value: ${railValue}, disabled: ${isDisabled}`);
                
                // List of rail-related fields
                const railFields = [
                    'railDestination', 
                    'railwayLine', 
                    'loadToRail', 
                    'railDeparture', 
                    'railETA', 
                    'railPickupNumber'
                ];
                
                // Apply styling to each field
                railFields.forEach(fieldName => {
                    // Get column index
                    const colIdx = table.column(`${fieldName}:name`).index();
                    if (colIdx !== undefined) {
                        const cell = table.cell(rowIdx, colIdx);
                        if (cell && cell.node()) {
                            const $cell = $(cell.node());
                            
                            if (isDisabled) {
                                // Just use the CSS class instead of inline styles
                                $cell.addClass('rail-field-disabled');
                                $cell.removeClass('editable');
                                $cell.data('rail-disabled', true);
                                $cell.attr('data-rail-disabled', 'true');
                            } else {
                                $cell.removeClass('rail-field-disabled');
                                $cell.addClass('editable');
                                $cell.data('rail-disabled', false);
                                $cell.removeAttr('data-rail-disabled');
                            }
                        }
                    }
                });
            });
            console.log("✅ Rail styling completed");
        } catch (err) {
            console.error("❌ Error applying rail styling:", err);
        }
    }

    // Bulk select checkbox helper
    function getSelectedContainerIDs() {
        return $('.row-select:checked').map(function() {
            return $(this).data('id');
        }).get();
    }

    // Make these global
    window.getSelectedContainerIDs = getSelectedContainerIDs;
    window.setCurrentEditRow = (row) => currentEditRow = row;
    window.getCurrentEditRow = () => currentEditRow;

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
        scrollY: '1000px', // or your existing calc height
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
        columnDefs: [
            {
                targets: 1, // Actions column
                width: "90px",
                className: "text-center"
            },
            {
                targets: 9, // Shipline column
                width: "120px",
                className: "text-center"
            }
        ],
        columns: [
            { data: null, orderable: false, searchable: false, className: '',
                render: function(data, type, row) {
                    return `<input type="checkbox" class="row-select" data-id="${row.containerID}">`;
                }
            },
            { data: null, orderable: false, searchable: false,
                render: function(data, type, row, meta) {
                    return `
                    <div style="min-width: 80px;">
                        <button class="btn btn-sm btn-primary edit-modal-btn" data-id="${row.containerID}">✏️</button>
                        <button class="btn btn-sm btn-danger delete-btn ms-2" data-id="${row.containerID}">🗑️</button>
                    </div>
                    `;
                }
            },
            { data: 'containerID' },
            { data: 'containerNumber', name: 'containerNumber', className: 'editable' },
            { data: 'currentStatus', name: 'currentStatus', className: 'editable' },
            { data: 'containerSize', name: 'containerSize', className: 'editable' },
            { data: 'mainSource', name: 'mainSource', className: 'editable' },
            { data: 'transload', name: 'transload', className: 'editable' },
            { 
                data: 'shipline', 
                name: 'shipline', 
                className: 'editable',
                render: function(data, type, row) {
                    if (type === 'display' && data) {
                        const shipline = shiplineOptions.find(s => s.name === data);
                        const isDynamic = shipline?.isDynamicLink || false;
                        const link = getProcessedLink('shipline', data, row.containerNumber);
                        const tooltipText = isDynamic ? `Track container ${row.containerNumber || ''}` : `Visit ${data} website`;
                        const iconHtml = link ? createLinkIcon(link, tooltipText, isDynamic) : '';
                        return data + iconHtml;
                    }
                    return data;
                }
            },
            { data: 'shiplineID', name: 'shiplineID' },
            { data: 'bolBookingNumber', name: 'bolBookingNumber', className: 'editable' },
            { data: 'rail', name: 'rail', className: 'editable' },
            { data: 'railDestination', name: 'railDestination', className: 'editable' },
            { data: 'railwayLine', name: 'railwayLine', className: 'editable' },
            { data: 'loadToRail', name: 'loadToRail', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'railDeparture', name: 'railDeparture', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'railETA', name: 'railETA', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'railPickupNumber', name: 'railPickupNumber', className: 'editable' },
            { data: 'fpm', name: 'fpm', className: 'editable' },
            { data: 'fpmID', name: 'fpmID' },
            { data: 'projectNumber', name: 'projectNumber', className: 'editable' },
            { data: 'shipmentNumber', name: 'shipmentNumber', className: 'editable' },
            { data: 'poNumber', name: 'poNumber', className: 'editable' },
            { data: 'vendor', name: 'vendor', className: 'editable' },
            { data: 'vendorIDNumber', name: 'vendorIDNumber', className: 'editable' },
            { 
                data: 'vesselLine', 
                name: 'vesselLine', 
                className: 'editable',
                render: function(data, type, row) {
                    if (type === 'display' && data) {
                        const vesselLine = vesselLineOptions.find(v => v.name === data);
                        const isDynamic = vesselLine?.isDynamicLink || false;
                        const link = getProcessedLink('vesselLine', data, row.containerNumber);
                        const tooltipText = isDynamic ? `Track container ${row.containerNumber || ''}` : `Visit ${data} website`;
                        const iconHtml = link ? createLinkIcon(link, tooltipText, isDynamic) : '';
                        return data + iconHtml;
                    }
                    return data;
                }
            },
            { data: 'vesselLineID', name: 'vesselLineID' },
            { data: 'vesselName', name: 'vesselName', className: 'editable' },
            { data: 'vesselID', name: 'vesselID' },
            { data: 'voyage', name: 'voyage', className: 'editable' },
            { data: 'portOfDeparture', name: 'portOfDeparture', className: 'editable' },
            { data: 'sail', name: 'sail', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'sailActual', name: 'sailActual', className: 'editable' },
            { data: 'portOfEntry', name: 'portOfEntry', className: 'editable' },
            { data: 'portID', name: 'portID' },
            { 
                data: 'terminal', 
                name: 'terminal', 
                className: 'editable',
                render: function(data, type, row) {
                    if (type === 'display' && data) {
                        const link = getProcessedLink('terminal', data, row.containerNumber);
                        const iconHtml = link ? createLinkIcon(link, `Visit ${data} website`) : '';
                        return data + iconHtml;
                    }
                    return data;
                }
            },
            { data: 'terminalID', name: 'terminalID' },
            { data: 'arrival', name: 'arrival', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'arrivalActual', name: 'arrivalActual', className: 'editable' },
            { data: 'berth', name: 'berth', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'berthActual', name: 'berthActual', className: 'editable' },
            { data: 'offload', name: 'offload', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'offloadActual', name: 'offloadActual', className: 'editable' },
            { data: 'carrier', name: 'carrier', className: 'editable' },
            { data: 'carrierID', name: 'carrierID' },
            { data: 'available', name: 'available', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'pickupLFD', name: 'pickupLFD', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'portRailwayPickup', name: 'portRailwayPickup', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'returnLFD', name: 'returnLFD', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'delivered', name: 'delivered', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'returned', name: 'returned', className: 'editable', render: data => data ? new Date(data).toLocaleDateString() : '' },
            { data: 'notes', name: 'notes', className: 'editable' }, 
            { 
                data: 'lastUpdated',
                name: 'lastUpdated',  // Add this too for consistency
                title: 'Last Updated',
                className: 'editable',  // ✅ This makes it editable!
                render: function(data, type, row) {
                      if (!data) return '';
                      const date = new Date(data);
                      return date.toLocaleDateString();   
                }
            }
        ],
        
        initComplete: function() {
            const table = this.api();
            window.ContainerTable = table;

            // Initialize tooltips for link icons
            function initTooltips() {
                const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                tooltips.forEach(tooltip => {
                    new bootstrap.Tooltip(tooltip);
                });
            }

            // CONSOLIDATED EVENT HANDLER - replace all separate event handlers
            $('#ContainerList').on('draw.dt', function(e, settings, json) {
                // Run tooltip and checkbox handlers every time
                initTooltips();
                alignCheckboxes();
                
                // Only apply rail styling if it's NOT the initial draw or we're redrawing later
                if (railStylingApplied) {
                    console.log("✅ Applying rail styling during table redraw");
                    applyRailStyling();
                }
                
                console.log("✅ Table redrawn - all handlers executed");
            });

            // Initialize tooltips on initial load
            initTooltips();

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

            const addBlankBtn = $(`<button class="btn btn-secondary btn-sm"><i class="fa fa-plus"></i> Add Blank Row</button>`);
            addBlankBtn.on('click', async function () {
                try {
                    const table = $('#ContainerList').DataTable();
            
                    const res = await $.ajax({
                        url: 'http://localhost:5062/api/containers',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            containerNumber: '',
                            currentStatus: '',
                            containerSize: '',
                            mainSource: '',
                            transload: '',
                            rail: '',
                            shipline: '',
                            bolBookingNumber: '',
                            vendor: '',
                            notes: '',
                            lastUpdated: new Date().toISOString()
                        })
                    });
            
                    const newId = res.containerID;
            
                    const blankRow = {
                        containerID: newId,
                        containerNumber: '',
                        currentStatus: '',
                        containerSize: '',
                        mainSource: '',
                        transload: '',
                        shipline: '',
                        shiplineID: null,
                        bolBookingNumber: '',
                        rail: '',
                        railDestination: '',
                        railwayLine: '',
                        loadToRail: '',
                        railDeparture: '',
                        railETA: '',
                        railPickupNumber: '',
                        fpm: '',
                        fpmID: null,
                        projectNumber: '',
                        shipmentNumber: '',
                        poNumber: '',
                        vendor: '',
                        vendorIDNumber: '',
                        vesselLine: '',
                        vesselLineID: null,
                        vesselName: '',
                        vesselID: null,
                        voyage: '',
                        portOfDeparture: '',
                        sail: '',
                        sailActual: '',
                        portOfEntry: '',
                        portID: null,
                        terminal: '',
                        terminalID: null,
                        arrival: '',
                        arrivalActual: '',
                        berth: '',
                        berthActual: '',
                        offload: '',
                        offloadActual: '',
                        carrier: '',
                        carrierID: null,
                        available: '',
                        pickupLFD: '',
                        portRailwayPickup: '',
                        returnLFD: '',
                        delivered: '',
                        returned: '',
                        notes: '',
                        lastUpdated: ''
                    };
            
                    const row = table.row.add(blankRow).draw(false);
                    const rowIndex = row.index(); // 🧠 get internal DataTables index
                    
                    // ✅ Scroll to the new row using Scroller plugin
                    table.row(rowIndex).scrollTo(false); // or true for animated scroll
                    
                    // Highlight + start editing once it’s in view
                    setTimeout(() => {
                        const rowNode = table.row(rowIndex).node();
                        $(rowNode).addClass('table-warning');
                    
                        const $firstEditableCell = $(rowNode).find('td.editable:first');
                        if ($firstEditableCell.length) {
                            $firstEditableCell.trigger('click');
                        }
                    }, 100); // short delay to let Scroller render the row
            
                    showToast("🆕 New container row added", "success");
            
                } catch (err) {
                    console.error("❌ Failed to create blank container:", err);
                    showToast("Failed to create new container", "danger");
                }
            });
    
    
            $('#bulkButtons').append(addBlankBtn);
        
            $('#ContainerList').on('mouseenter', 'td', function() {
                const cell = $(this);
                if (this.offsetWidth < this.scrollWidth) {
                    cell.attr('title', cell.text());
                } else {
                    cell.removeAttr('title');
                }
            });

            // APPLY RAIL STYLING JUST ONCE with a slight delay to ensure everything is ready
            setTimeout(function() {
                console.log("🚀 Initial rail styling application");
                applyRailStyling();
                railStylingApplied = true;  // Set the flag AFTER styling is applied
            }, 800);
            
            console.log("✅ initComplete finished");
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

    // Master select all checkbox control
    $(document).on('change', '#selectAll', function() {
        const checked = $(this).is(':checked');
        $('.row-select').prop('checked', checked);
    });
};