// File: wwwroot/js/modules/linkManager.js

document.addEventListener('DOMContentLoaded', function() {
    // Use event delegation for dynamically added button
    $(document).on('click', '#manageDynamicLinksBtn', function() {
        loadLinkData();
        const modal = new bootstrap.Modal(document.getElementById('dynamicLinksModal'));
        modal.show();
    });
    
    // Function to load all link data
    function loadLinkData() {
        // Load Shiplines
        $.getJSON('/api/shiplines', function(data) {
            let html = '';
            data.forEach(shipline => {
                html += `
                <tr data-id="${shipline.id}">
                    <td>${shipline.name}</td>
                    <td>
                        <input type="text" class="form-control form-control-sm shipline-link" 
                               value="${shipline.link || ''}" placeholder="https://example.com">
                    </td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input shipline-dynamic" type="checkbox" 
                                   id="shipline_${shipline.id}" ${shipline.isDynamicLink ? 'checked' : ''}>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary save-shipline-btn" data-id="${shipline.id}">
                            Save
                        </button>
                    </td>
                </tr>`;
            });
            $('#shiplineTable').html(html);
        });
        
        // Load Vessel Lines
        $.getJSON('/api/vessels/vessel-lines', function(data) {
            let html = '';
            data.forEach(vesselLine => {
                html += `
                <tr data-id="${vesselLine.id}">
                    <td>${vesselLine.name}</td>
                    <td>
                        <input type="text" class="form-control form-control-sm vesselline-link" 
                               value="${vesselLine.link || ''}" placeholder="https://example.com">
                    </td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input vesselline-dynamic" type="checkbox" 
                                   id="vesselline_${vesselLine.id}" ${vesselLine.isDynamicLink ? 'checked' : ''}>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary save-vesselline-btn" data-id="${vesselLine.id}">
                            Save
                        </button>
                    </td>
                </tr>`;
            });
            $('#vesselLineTable').html(html);
        });
        
        // Load Terminals (requires more complex handling as they're grouped by port)
        // This is a simplified version - you might need to adapt it
        let allTerminals = [];
        
        // Use your existing terminalOptions array which should be loaded from fetchAllTerminalsByPort
        if (window.terminalOptions && window.terminalOptions.length > 0) {
            renderTerminals(window.terminalOptions);
        } else {
            // If terminalOptions isn't available yet, wait a bit and try again
            setTimeout(() => {
                if (window.terminalOptions) {
                    renderTerminals(window.terminalOptions);
                } else {
                    $('#terminalTable').html('<tr><td colspan="3" class="text-center text-danger">Failed to load terminals</td></tr>');
                }
            }, 1000);
        }
    }
    
    function renderTerminals(terminals) {
        let html = '';
        terminals.forEach(terminal => {
            html += `
            <tr data-id="${terminal.terminalID}" data-port-id="${terminal.portID}">
                <td>${terminal.terminal}</td>
                <td>
                    <input type="text" class="form-control form-control-sm terminal-link" 
                           value="${terminal.link || ''}" placeholder="https://example.com">
                </td>
                <td>
                    <button class="btn btn-sm btn-primary save-terminal-btn" 
                            data-id="${terminal.terminalID}" data-port-id="${terminal.portID}">
                        Save
                    </button>
                </td>
            </tr>`;
        });
        $('#terminalTable').html(html);
    }
    
    // Handle individual save buttons
    $(document).on('click', '.save-shipline-btn', function() {
        const row = $(this).closest('tr');
        const id = $(this).data('id');
        const link = row.find('.shipline-link').val();
        const isDynamicLink = row.find('.shipline-dynamic').is(':checked');
        
        saveShiplineLink(id, link, isDynamicLink);
    });
    
    $(document).on('click', '.save-vesselline-btn', function() {
        const row = $(this).closest('tr');
        const id = $(this).data('id');
        const link = row.find('.vesselline-link').val();
        const isDynamicLink = row.find('.vesselline-dynamic').is(':checked');
        
        saveVesselLineLink(id, link, isDynamicLink);
    });
    
    $(document).on('click', '.save-terminal-btn', function() {
        const row = $(this).closest('tr');
        const id = $(this).data('id');
        const portId = $(this).data('port-id');
        const link = row.find('.terminal-link').val();
        
        saveTerminalLink(id, portId, link);
    });
    
    // Handle "Save All Changes" button
    $('#saveLinksBtn').on('click', function() {
        // Get active tab to know which entities we're saving
        const activeTab = $('#linksTabs .nav-link.active').attr('id');
        
        if (activeTab === 'shiplines-tab') {
            // Save all shiplines
            const updates = [];
            $('#shiplineTable tr[data-id]').each(function() {
                const row = $(this);
                const id = row.data('id');
                const link = row.find('.shipline-link').val();
                const isDynamicLink = row.find('.shipline-dynamic').is(':checked');
                
                updates.push({ id, link, isDynamicLink });
            });
            
            saveAllShiplineLinks(updates);
        }
        else if (activeTab === 'vessellines-tab') {
            // Save all vessel lines
            const updates = [];
            $('#vesselLineTable tr[data-id]').each(function() {
                const row = $(this);
                const id = row.data('id');
                const link = row.find('.vesselline-link').val();
                const isDynamicLink = row.find('.vesselline-dynamic').is(':checked');
                
                updates.push({ id, link, isDynamicLink });
            });
            
            saveAllVesselLineLinks(updates);
        }
        else if (activeTab === 'terminals-tab') {
            // Save all terminals
            const updates = [];
            $('#terminalTable tr[data-id]').each(function() {
                const row = $(this);
                const id = row.data('id');
                const portId = row.data('port-id');
                const link = row.find('.terminal-link').val();
                
                updates.push({ id, portId, link });
            });
            
            saveAllTerminalLinks(updates);
        }
    });
    
    // API functions for saving data
    function saveShiplineLink(id, link, isDynamicLink) {
        $.ajax({
            url: `/api/shiplines/${id}`,
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({ 
                link: link,
                isDynamicLink: isDynamicLink
            }),
            success: function() {
                showToast('Shipping line updated successfully', 'success');
                // Update our in-memory data
                const shipline = shiplineOptions.find(s => s.id === id);
                if (shipline) {
                    shipline.link = link;
                    shipline.isDynamicLink = isDynamicLink;
                }
            },
            error: function() {
                showToast('Failed to update shipping line', 'danger');
            }
        });
    }
    
    function saveVesselLineLink(id, link, isDynamicLink) {
        $.ajax({
            url: `/api/vessels/vessel-lines/${id}`,
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({ 
                link: link,
                isDynamicLink: isDynamicLink
            }),
            success: function() {
                showToast('Vessel line updated successfully', 'success');
                // Update our in-memory data
                const vesselLine = vesselLineOptions.find(v => v.id === id);
                if (vesselLine) {
                    vesselLine.link = link;
                    vesselLine.isDynamicLink = isDynamicLink;
                }
            },
            error: function() {
                showToast('Failed to update vessel line', 'danger');
            }
        });
    }
    
    function saveTerminalLink(id, portId, link) {
        $.ajax({
            url: `/api/terminals/${id}`,
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({ 
                portId: portId,
                link: link
            }),
            success: function() {
                showToast('Terminal updated successfully', 'success');
                // Update our in-memory data
                const terminal = terminalOptions.find(t => t.terminalID === id);
                if (terminal) {
                    terminal.link = link;
                }
            },
            error: function() {
                showToast('Failed to update terminal', 'danger');
            }
        });
    }
    
    // Batch update functions
    function saveAllShiplineLinks(updates) {
        $.ajax({
            url: '/api/shiplines/batch-update',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updates),
            success: function() {
                showToast('All shipping lines updated successfully', 'success');
                // Update our in-memory data
                updates.forEach(update => {
                    const shipline = shiplineOptions.find(s => s.id === update.id);
                    if (shipline) {
                        shipline.link = update.link;
                        shipline.isDynamicLink = update.isDynamicLink;
                    }
                });
            },
            error: function() {
                showToast('Failed to update shipping lines', 'danger');
            }
        });
    }
    
    function saveAllVesselLineLinks(updates) {
        $.ajax({
            url: '/api/vessels/vessel-lines/batch-update',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updates),
            success: function() {
                showToast('All vessel lines updated successfully', 'success');
                // Update our in-memory data
                updates.forEach(update => {
                    const vesselLine = vesselLineOptions.find(v => v.id === update.id);
                    if (vesselLine) {
                        vesselLine.link = update.link;
                        vesselLine.isDynamicLink = update.isDynamicLink;
                    }
                });
            },
            error: function() {
                showToast('Failed to update vessel lines', 'danger');
            }
        });
    }
    
    function saveAllTerminalLinks(updates) {
        $.ajax({
            url: '/api/terminals/batch-update',
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updates),
            success: function() {
                showToast('All terminals updated successfully', 'success');
                // Update our in-memory data
                updates.forEach(update => {
                    const terminal = terminalOptions.find(t => t.terminalID === update.id);
                    if (terminal) {
                        terminal.link = update.link;
                    }
                });
            },
            error: function() {
                showToast('Failed to update terminals', 'danger');
            }
        });
    }
});