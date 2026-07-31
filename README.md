# CampusFoodLink+

CampusFoodLink+ is a smart campus dining platform being built for IT499. The project began as a browser-only HTML, CSS, and JavaScript prototype using `localStorage` and is now being migrated incrementally into an integrated Flask + SQLite application. Core student workflows—including vendor browsing, menu retrieval, checkout, order persistence, meal-plan balance updates, transaction logging, and order confirmation—are now database-backed, while several vendor and administrator workflows still use prototype storage logic.

If you're joining the project without deep familiarity with the code yet, read the [Current architecture](#current-architecture) and [Current development status](#current-development-status) sections first — they explain how the pieces connect before you dive into individual files.

## Table of contents

- [Purpose and problem addressed](#purpose-and-problem-addressed)
- [Current application capabilities](#current-application-capabilities)
- [User roles and workflows](#user-roles-and-workflows)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Current architecture](#current-architecture)
- [Local development setup](#local-development-setup)
- [Database table overview](#database-table-overview)
- [Current development status](#current-development-status)
- [Planned Flask/SQLite refactor stages](#planned-flasksqlite-refactor-stages)
- [Known limitations](#known-limitations)
- [Git and collaboration notes](#git-and-collaboration-notes)
- [Future enhancements](#future-enhancements)

## Purpose and problem addressed

College dining involves several groups that currently coordinate through disconnected tools (paper menus, campus apps that don't talk to POS systems, spreadsheets for reporting): students who want to browse vendors and order food using their meal plan, vendors who need to manage menus and fulfill orders, and dining services administrators who need visibility into sales and operations. CampusFoodLink+ aims to bring these three roles into a single platform with one shared data source, rather than three separate systems.

The project is being built in two phases:

1. A clickable **browser prototype** (done first) to validate the user experience for all three roles.
2. A **Flask + SQLite backend** (in progress) to replace the browser-only data storage with a real, shared database so that orders, menus, and reports are consistent across users and devices instead of living only in one person's browser.

## Current application capabilities

The application now runs through Flask, with SQLite providing shared persistent storage for core application data. The browser interface continues to use HTML, CSS, and vanilla JavaScript, while progressively replacing browser-only storage with database-backed API calls.

Current functionality includes:

- Landing page with role selection (Student, Vendor, Administrator)
- Simulated login for all three roles
- Student dashboard displaying vendors retrieved from SQLite
- Vendor-specific menus retrieved from SQLite
- Shopping cart management
- Checkout workflow
- Order creation through the Flask API
- Persistent storage of:
  - Orders
  - Order Items
  - Order Status history
  - Meal-plan balance updates
  - Transaction history
- Order confirmation displaying data retrieved from SQLite
- Vendor dashboard
- Administrator dashboard, reporting, student-management, and vendor-management pages (still primarily using prototype logic)

## User roles and workflows

### Student

- Begins at [index.html](index.html), selects the Student role, and continues to the simulated account-selection page in [login.html](login.html).
- Selects a seeded student account and is routed to [student-dashboard.html](student-dashboard.html).
- [student-dashboard.js](student-dashboard.js) retrieves active vendors from SQLite through `GET /api/vendors`.
- Selecting a vendor stores the selected vendor temporarily in `localStorage` and opens [menu.html](menu.html).
- [menu.js](menu.js) retrieves vendor-specific menu items through `GET /api/vendors/<vendor_id>/menu`.
- Menu items are added to a temporary shopping cart stored in `localStorage`.
- [checkout.js](checkout.js) sends menu-item IDs and quantities to `POST /api/orders`.
- Flask verifies the student, vendor, item availability, database prices, and meal-plan balance before creating the order.
- The order, order items, initial status, balance deduction, and transaction record are written to SQLite.
- [confirmation.js](confirmation.js) retrieves the completed order through `GET /api/orders/<order_id>`.

### Vendor

- Selects the Vendor role from [index.html](index.html) and chooses a simulated vendor account in [login.html](login.html).
- Uses [vendor-dashboard.html](vendor-dashboard.html) for order and menu management.
- Vendor workflows still rely primarily on prototype `localStorage` data and have not yet been migrated to Flask and SQLite.

### Dining Services Administrator

- Selects the Administrator role from [index.html](index.html) and chooses a simulated administrator account in [login.html](login.html).
- Uses the administrator dashboard, reports, student-management, and vendor-management pages.
- Administrator workflows still rely primarily on prototype data logic and have not yet been migrated to Flask and SQLite.

## Technology stack

### Backend

- Python 3.9
- Flask
- SQLite
- sqlite3

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

## Repository structure

```text
.
├── index.html                  # Role-selection landing page
├── login.html                  # Simulated role-specific login page
├── student-dashboard.html      # Student vendor-selection page
├── menu.html                   # Vendor menu page
├── checkout.html               # Cart review and order placement
├── confirmation.html           # Database-backed order confirmation
├── orders.html                 # Student order-history page
├── vendor-dashboard.html       # Vendor order and menu management interface
├── admin-dashboard.html        # Administrator dashboard
├── admin-reports.html          # Administrator reporting interface
├── admin-students.html         # Administrator student-management interface
├── admin-vendors.html          # Administrator vendor-management interface
│
├── student-dashboard.js        # Loads active vendors through the Flask API
├── menu.js                     # Loads vendor-specific menu items through Flask
├── checkout.js                 # Manages the cart and creates orders through Flask
├── confirmation.js             # Retrieves one confirmed order from SQLite
├── orders.js                   # Student order-history logic; migration still pending
├── vendor-dashboard.js         # Vendor order and menu management logic
├── admin-reports.js            # Administrator reporting logic
├── admin-students.js           # Administrator student-management logic
├── admin-vendors.js            # Administrator vendor-management logic
├── storage.js                  # Remaining localStorage data and session helpers
├── styles.css                  # Shared application styles
├── CFL-Logo.png                # CampusFoodLink+ logo
│
├── app.py                      # Flask application, frontend routes, and API endpoints
├── database.py                 # SQLite connection helper with foreign keys enabled
├── schema.sql                  # Recreates the SQLite database schema
├── seed.py                     # Loads development users, vendors, menus, orders, and logs
├── campus_food_link.db         # Local generated SQLite database; not committed
│
├── README.md                   # Project setup, architecture, and development status
├── .github/workflows/static.yml  # Legacy GitHub Pages workflow for static deployment
├── .vscode/                    # VS Code project settings
└── .gitignore
```

## Current architecture

CampusFoodLink+ is now a partially integrated Flask application rather than two separate systems.

Flask serves the existing HTML, CSS, JavaScript, and image files. The browser interface uses JavaScript and the Fetch API to request shared application data from Flask routes, and Flask reads from or writes to the SQLite database.

```text
┌──────────────────────────────┐
│ Browser interface            │
│ HTML / CSS / JavaScript      │
│                              │
│ Still uses localStorage for: │
│ • Simulated user sessions    │
│ • Temporary shopping cart    │
│ • Selected vendor            │
└──────────────┬───────────────┘
               │
               │ Fetch API requests
               ▼
┌──────────────────────────────┐
│ Flask application            │
│ app.py                       │
│                              │
│ Current API routes include:  │
│ • GET /api/vendors           │
│ • GET /api/vendors/<id>/menu │
│ • POST /api/orders           │
│ • GET /api/orders/<id>       │
└──────────────┬───────────────┘
               │
               │ Parameterized SQL queries
               ▼
┌──────────────────────────────┐
│ SQLite database              │
│ campus_food_link.db          │
│                              │
│ Stores:                      │
│ • Vendors and menu items     │
│ • Users and balances         │
│ • Orders and order items     │
│ • Order-status history       │
│ • Transaction records        │
└──────────────────────────────┘
```

## Local development setup

CampusFoodLink+ should now be run through the Flask development server rather than opened directly through Live Server or GitHub Pages. Database-backed pages call Flask API routes and will not function correctly when opened as standalone static files.

To work on the Flask/SQLite backend, follow the steps below.

### Python virtual environment setup

From the repository root:

```bash
python3 -m venv venv
```

Activate it:

```bash
# macOS / Linux
source venv/bin/activate

# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

The `venv/` directory is excluded from Git via `.gitignore` — each contributor creates their own local copy rather than committing it.

### Dependency installation

Install the project dependencies:

```bash
pip install -r requirements.txt
```

The dependency versions used by the project are recorded in `requirements.txt`.

### Starting the Flask development server

With the virtual environment active:

```bash
python app.py
```

This starts the Flask development server (with debug mode enabled) at `http://127.0.0.1:5000/`.

Visiting that URL opens the CampusFoodLink+ application. Flask serves the frontend assets and provides the API endpoints used by the database-backed student workflow. The built-in Flask server is intended for local development only.

### Initializing the SQLite database from schema.sql

There is currently no Python script that runs `schema.sql` for you, so it needs to be applied with the `sqlite3` command-line tool:

```bash
sqlite3 campus_food_link.db < schema.sql
```

### Loading development seed data

After recreating the schema, populate the local development database with:

```bash
python seed.py
```

The seed script loads sample users, vendors, menu items, orders, order-status records, and transaction records. It clears existing rows before inserting the development dataset, so it should only be run against a disposable local database.

Running `schema.sql` creates or recreates `campus_food_link.db` in the repository root. This file is listed in `.gitignore` and should remain local to each contributor's machine.

## Database table overview

`schema.sql` defines seven tables, with foreign keys enforced (`PRAGMA foreign_keys = ON`):

| Table | Purpose |
|---|---|
| **Vendor** | Campus dining vendors, including name, location, operating hours, and active/inactive status. |
| **User** | All accounts across all three roles (Student, Vendor, Dining Services administrator), including meal-plan balance and account status. A `VendorID` links vendor-role users to the vendor they belong to. |
| **MenuItem** | Vendor-specific menu items with price, availability, and active/inactive state. |
| **FoodOrder** | An order placed by a student at a vendor, with its total and current status (`Pending` → `Accepted`/`Rejected` → `Preparing` → `Ready` → `Complete`). |
| **OrderItem** | The individual line items (menu item, quantity, price) that make up a `FoodOrder`. |
| **OrderStatus** | A history log of status changes for an order — who changed it, when, and any notes. |
| **TransactionLog** | A ledger of meal-plan balance changes (deductions, refunds, adjustments) tied to a user and, optionally, an order. |

Indexes are defined on the foreign-key columns (e.g. `idx_food_order_student`, `idx_menu_item_vendor`) to keep the common lookups (a student's orders, a vendor's menu, an order's line items) fast as data grows.

The development database is populated through `seed.py`. The Flask application currently queries and updates these tables during vendor browsing, menu retrieval, checkout, order creation, balance deduction, transaction logging, and order confirmation.

## Current development status

- **Flask application:** Flask serves the browser interface and exposes database-backed API endpoints.
- **SQLite database:** The seven-table schema is implemented, foreign keys are enabled for application connections, and development data is loaded through `seed.py`.
- **Vendor browsing:** Active vendors are retrieved from SQLite through `GET /api/vendors`.
- **Menu browsing:** Vendor-specific menu items are retrieved through `GET /api/vendors/<vendor_id>/menu`.
- **Checkout:** The temporary cart remains in `localStorage`, but order submission is handled through `POST /api/orders`.
- **Order processing:** Flask validates database prices and availability, calculates authoritative totals, checks the student's stored balance, and writes the order, line items, initial status, balance change, and transaction record to SQLite.
- **Confirmation:** Individual order details are retrieved from SQLite through `GET /api/orders/<order_id>`.
- **Still pending:** Student order-history migration, vendor dashboard integration, administrator integration, database-backed authentication, and removal of obsolete `localStorage` logic.

## Planned Flask/SQLite refactor stages

The refactor is being done in the sequence below rather than as a single rewrite, so that the team always has a working application at each step and can test one change at a time instead of debugging several at once:

1. **Establish the Flask application and SQLite connection.** *(done)*
2. **Create and validate the database schema.** *(done)*
3. **Add development seed data.** *(done)*
4. **Serve the existing frontend pages through Flask.** *(done)*
5. **Replace hard-coded vendor and menu data with database queries.** *(done for the student workflow)*
6. **Move cart and checkout processing away from localStorage.** *(in progress — the cart remains local, but order submission is database-backed)*
7. **Store orders and order items in SQLite.** *(done)*
8. **Add order-status history and transaction logging.** *(done for order creation)*
9. **Connect student history, vendor, and administrator workflows.** *(in progress)*
10. **Remove obsolete localStorage logic after replacement workflows are tested.** *(pending)*

## Known limitations

- **Authentication remains simulated.** Users select seeded accounts from dropdowns. Password verification, password hashing, authorization enforcement, and Flask session management are not implemented.
- **The shopping cart remains in `localStorage`.**
- **Selected-vendor and simulated role sessions remain in `localStorage`.**
- **Student order history is not yet database-backed.** Individual confirmations read from SQLite, but the broader Orders page still needs migration.
- **Vendor workflows are not yet connected to SQLite.**
- **Administrator workflows are not yet connected to SQLite.**
- **Backend authorization is incomplete.** Current API calls accept user IDs supplied by the browser and do not verify an authenticated Flask session.
- **Running `schema.sql` drops and recreates every table.**
- **Running `seed.py` replaces the local development data.**
- **GitHub Pages cannot run the Flask and SQLite backend.**
- **The Flask development server is not suitable for production deployment.**

## Git and collaboration notes

- `campus_food_link.db`, the `venv/` directory, `__pycache__/`, `*.pyc` files, and `.DS_Store` are all excluded via `.gitignore`. Regenerate your local database from `schema.sql` rather than committing the `.db` file — everyone's local database is disposable and rebuilt from the same schema.
- Because `schema.sql` starts with `DROP TABLE IF EXISTS` statements, re-running it wipes and rebuilds all tables — don't run it against a database with data you want to keep without backing it up first.
- The frontend and backend now share an integrated student ordering workflow. Changes to `app.py`, API-consuming JavaScript files, the SQL schema, or seed data may affect the same feature and should be tested together before merging. When opening a pull request, note in the description whether your change affects the prototype, the backend, or both, since the refactor is intentionally incremental (see [Planned Flask/SQLite refactor stages](#planned-flasksqlite-refactor-stages)).
- If you add new Python dependencies, consider generating a `requirements.txt` (`pip freeze > requirements.txt`) in the same change so other contributors can install the same versions.

## Future enhancements

Beyond completing the refactor stages above, ideas that have come up but are not yet planned in detail:

- Real authentication (password hashing, session management) once login is backed by the `User` table.
- Vendor-side menu editing (create/update/disable menu items) once Menu Management is implemented.
- Real-time or near-real-time order status updates for students and vendors.
- Exporting admin reports (CSV/PDF) once reporting is backed by SQLite.
- Automated tests for both the prototype JavaScript and the Flask routes/database logic.
