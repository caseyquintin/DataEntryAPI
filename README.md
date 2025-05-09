**DataEntryAPI: Container Management System**

**Frontend**

-   **HTML5 + Bootstrap 5.3** for responsive layout and modal components
-   **jQuery 3.7.0** for DOM manipulation and AJAX requests
-   **DataTables.net** for dynamic, editable, scrollable data tables with:

-   Inline editing
-   Column visibility controls
-   Fixed headers
-   Scroller + buttons extensions

-   **Flatpickr** for modern date pickers in inline-editable cells
-   **Dynamic dropdowns** (e.g., Port of Entry, Terminal, Shipline) populated via AJAX

**Frontend Logic Highlights**

-   Inline editable cells update via PATCH API calls
-   Dropdowns (status, ports, terminals) load from backend
-   Terminals are filtered based on selected PortID
-   Smart layout persistence (column visibility, scroll, etc.)
-   Custom toast notifications for user feedback
-   Undo feature for container deletion (with localStorage backup)

* * * * *

**Backend**

-   **ASP.NET Core Web API**
-   Controllers built using [ApiController] and [Route("api/...")]
-   **C#** used for building endpoints (e.g., PortsController.cs, OptionsController.cs, ContainerController.cs, TerminalsController.cs, VesselController.cs)
-   **SQL Server** for database with structure from CTHubDB.sql

-   Key Tables:

-   Containers -- core data model
-   Ports -- PortID + PortOfEntry
-   Terminals -- TerminalID, Terminal, LookupType, Link, PortID (FK)

-   **Dapper or ADO.NET** style SqlCommand usage (no Entity Framework here)
-   **Swagger UI** (for interactive API docs)

-   Accessible at: `http://localhost:5062/swagger`
-   Powered by: Swashbuckle.AspNetCore

-   Endpoints include:

-   /api/containers
-   /api/ports
-   /api/terminals/by-port/{portId}

* * * * *

**App Behavior**

-   Multiple-page admin dashboard with modals and full table controls
-   Supports bulk edit, delete, column selection
-   Designed for high usability
-   by logistics/admin staff

* * * * *

**File Tree**

DataEntryAPI
 ┣ Controllers
 ┃ ┣ CarriersController.cs
 ┃ ┣ ContainerController.cs
 ┃ ┣ FPMsController.cs
 ┃ ┣ OptionsController.cs
 ┃ ┣ PortsController.cs
 ┃ ┣ ShiplinesController.cs
 ┃ ┣ TerminalsController.cs
 ┃ ┗ VesselsController.cs
 ┣ DTOs
 ┃ ┣ FieldUpdateDto.cs
 ┃ ┗ VesselLineDto.cs
 ┣ Models
 ┃ ┣ Container.cs
 ┃ ┣ FPMs.cs
 ┃ ┣ Ports.cs
 ┃ ┣ Shiplines.cs
 ┃ ┣ Terminal.cs
 ┃ ┣ Vessel.cs
 ┃ ┗ VesselLine.cs
 ┣ Properties
 ┃ ┗ launchSettings.json
 ┣ wwwroot
 ┃ ┣ assets
 ┃ ┃ ┣ AuditLogistics_LOGO.png
 ┃ ┃ ┣ AuditLogistics_LOGO_invert.png
 ┃ ┃ ┣ AuditLogistics_LOGO_simple.png
 ┃ ┃ ┗ favicon.ico
 ┃ ┣ css
 ┃ ┃ ┗ styles.css
 ┃ ┣ js
 ┃ ┃ ┣ modules
 ┃ ┃ ┃ ┣ bulkDelete.js
 ┃ ┃ ┃ ┣ bulkEditingModal.js
 ┃ ┃ ┃ ┣ columnChooser.js
 ┃ ┃ ┃ ┣ inlineEditingHandler.js
 ┃ ┃ ┃ ┣ newContainerModal.js
 ┃ ┃ ┃ ┣ singleDelete.js
 ┃ ┃ ┃ ┗ singleEditingModal.js
 ┃ ┃ ┣ versions
 ┃ ┃ ┃ ┣ scripts v1.0 - Port of Entry and Terminal DDs Working.js
 ┃ ┃ ┃ ┣ scripts v2.0 - Inline tabbing works.js
 ┃ ┃ ┃ ┣ scripts v3.0 - 1-2 plus cascading dropdowns.js
 ┃ ┃ ┃ ┣ scripts v4.0 - 1-3 plus new container modal is modularized.js
 ┃ ┃ ┃ ┣ scripts v5.0 - 1-4 plus inline editing is modularized.js
 ┃ ┃ ┃ ┣ scripts v6.0 - 1-5 plus all of those modals etc are modularized.js
 ┃ ┃ ┃ ┗ scripts v7.0 - 1-6 plus modals mostly functional fullscreen vertical scroll.js
 ┃ ┃ ┗ scripts.js
 ┃ ┣ libs
 ┃ ┃ ┣ bootstrap
 ┃ ┃ ┣ datatables
 ┃ ┃ ┃ ┣ css
 ┃ ┃ ┃ ┃ ┣ datatables.css
 ┃ ┃ ┃ ┃ ┗ datatables.min.css
 ┃ ┃ ┃ ┣ datatables.js
 ┃ ┃ ┃ ┗ datatables.min.js
 ┃ ┃ ┗ flatpickr
 ┃ ┃ ┃ ┣ themes
 ┃ ┃ ┃ ┃ ┣ airbnb.css
 ┃ ┃ ┃ ┃ ┣ confetti.css
 ┃ ┃ ┃ ┃ ┣ dark.css
 ┃ ┃ ┃ ┃ ┣ light.css
 ┃ ┃ ┃ ┃ ┣ material_blue.css
 ┃ ┃ ┃ ┃ ┣ material_green.css
 ┃ ┃ ┃ ┃ ┣ material_orange.css
 ┃ ┃ ┃ ┃ ┗ material_red.css
 ┃ ┃ ┃ ┣ flatpickr.min.css
 ┃ ┃ ┃ ┗ flatpickr.min.js
 ┃ ┣ index v1.0 - Edits and Deletes are working - Bulk and Single.html
 ┃ ┣ index v2.0 - Edits Deletes New are working.html
 ┃ ┣ index.html
 ┃ ┣ index2.html
 ┃ ┣ nicescript.html
 ┃ ┣ notsailed.html
 ┃ ┣ onvessel-arrived.html
 ┃ ┣ onvessel-notarrived.html
 ┃ ┣ rail.html
 ┃ ┣ returned.html
 ┃ ┣ settopickup.html
 ┃ ┗ settoreturn.html
 ┣ .gitignore
 ┣ appsettings.Development.json
 ┣ appsettings.json
 ┣ DataContext.cs
 ┣ DataEntryAPI.csproj
 ┣ DataEntryAPI.http
 ┣ DataEntryAPI.sln
 ┣ FileStructure.txt
 ┣ package-lock.json
 ┣ package.json
 ┗ Program.cs
 
* * * * *
 
⏲️🛠️**Short Term Development Goals**🛠️⏲️
 ⏹️ Set default Last Updated date to current when container is created or edited.
 ⏹️ Link generation for SSLs, Vessel Owners and Terminals
 ⏹️ Color coding for Actual/Estimate, Current Status and Main Source
 ⏹️ Make Search function more robust
 ⏹️ Filter table by status using pages and show only relevant columns
    ⏹️ All Active Containers
    ⏹️ Not Sailed
    ⏹️ On Vessel (Arrived)
    ⏹️ On Vessel (Not Arrived)
    ⏹️ Rail
    ⏹️ Set To Return
    ⏹️ Set To Pick Up
    ⏹️ Returned (1 year)
    
 ***New Container Modal***
 ⏹️ Add multiple containers with the same information
 
 ***Bulk Edit Modal***
 ⏹️ Remove non-essential or helpful fields
    ⏹️Shipment #
 
 ***Inline***
 ⏹️ Hide Rail details when Rail is set to "No"
 ⏹️ Dates should be able to be entered as 5/12 instead of 5/12/2025 (autocomplete year) [Single Edit does this already]
 ⏹️ Newly added rows stay yellow/orange until refresh - should go to normal as soon as a different row is selected.
 ⏹️ Allow more mobility in Inline Editor (move up or down a row using keyboard)

 ***Search Function***
 ⏹️ Make Search function more robust 

* * * * *

⏳🛠️**Long Term Development Goals**🛠️⏳
⏹️ Role restrictions
⏹️ Container Notes Timeline(?)
⏹️ Integrate with ALOT
   ⏹️ SN/DN system
   ⏹️ Internal Notes generation and application to shipments
⏹️ Container Tracking Report generation (Power Automate)

* * * * *

🪲**Current Bugs**🪲

***New Container Modal***
⏹️ Actual/Estimate dropdowns are using boolean.
 
***Inline***
⏹️ Date pickers don't work.
⏹️ When typing into DDs w/IDs attached the first option with that letter is picked and the next cell is selected.
⏹️ Cascading DDs are still malfunctioning if changed too quickly
 
***Single Edit***
⏹️ If field is cleared, old value remains instead of being submitted as NULL.
 
***Single and Bulk Delete Modal Windows***
✅ Debug Single Delete modal window
✅ Debug Bulk Delete modal window
 
***Search Function***
⏹️ Debug
