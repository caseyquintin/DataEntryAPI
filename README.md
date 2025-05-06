CTHub: Container Management System

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

CTHub/
├── Controllers/                 # ASP.NET Core API controllers
│ ├── ContainerController.cs   # Core container management
│ ├── PortsController.cs       # Port data management
│ ├── ShiplinesController.cs   # Shipping line management
│ ├── TerminalsController.cs   # Terminal data management
│   └── VesselsController.cs     # Vessel data management
├── Models/                      # Data models
│ ├── Container.cs             # Main container data model
│ ├── Ports.cs                 # Port/location data model
│ ├── Shiplines.cs             # Shipping lines model
│   └── Terminal.cs              # Terminal data model
├── wwwroot/                     # Frontend assets
│ ├── css/                     # CSS stylesheets
│   │   └── styles.css           # Main styling
│ ├── js/                      # JavaScript files
│   │ ├── modules/             # Modularized JavaScript
│   │   │ ├── inlineEditingHandler.js  # Table inline editing (bug fixed)
│   │   │ ├── bulkEditingModal.js      # Bulk edit functionality
│   │   │   └── singleEditingModal.js    # Single item editing
│   │   └── scripts.js           # Main JavaScript file
│ ├── libs/                    # External libraries
│   │ ├── bootstrap/           # Bootstrap framework
│   │ ├── datatables/          # DataTables.net
│   │ ├── flatpickr/           # Date picker
│   │   └── jquery/              # jQuery library
│   └── index.html               # Main application page
├── DTOs/                        # Data Transfer Objects
│   └── FieldUpdateDto.cs        # Field update data transfer
├── Migrations/                  # Database migrations
├── appsettings.json             # Application settings
└── Program.cs                   # Application entry point
