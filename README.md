DataEntryAPI: Container Management System

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
