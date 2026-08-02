# CampusFoodLink+

CampusFoodLink+ is a smart campus dining platform being built for IT499. The project began as a browser-only HTML, CSS, and JavaScript prototype using `localStorage` and has since been migrated substantially into an integrated Flask + SQLite application. The core student ordering workflow, the vendor order and menu management workflow, and the administrator vendor-management workflow are now all database-backed. Student account selection, administrator student management, administrator reporting, authentication, and a few pieces of client-side session state (the shopping cart, the selected vendor, and the simulated login sessions) still use prototype `localStorage` logic.

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

The project was built in two phases:

1. A clickable **browser prototype** (done first) to validate the user experience for all three roles.
2. A **Flask + SQLite backend** (in progress) to replace the browser-only data storage with a real, shared database so that orders, menus, and reports are consistent across users and devices instead of living only in one person's browser.

The student ordering workflow, the vendor order/menu/hours workflow, and the administrator vendor-management workflow have completed this migration. Student account management, administrator student management, administrator reporting, and authentication remain on the original prototype logic.

## Current application capabilities

The application runs through Flask, with SQLite providing shared, persistent storage for vendors, menu items, users, orders, order status history, and meal-plan transactions. The browser interface continues to use HTML, CSS, and vanilla JavaScript, and calls Flask API routes with the Fetch API wherever the underlying data now lives in SQLite.

Current functionality includes:

- Landing page with role selection (Student, Vendor, Administrator)
- Simulated login for all three roles (vendor accounts are loaded from SQLite; student and administrator accounts are still loaded from seeded `localStorage` data)
- Student dashboard displaying active vendors retrieved from SQLite, with open/closed status computed from each vendor's stored operating hours
- Vendor-specific menus retrieved from SQLite, filtered to active and available items
- Shopping cart management (still client-side, in `localStorage`)
- Checkout workflow that submits the cart to Flask for order creation
- Order creation, validation, and persistence through the Flask API, including:
  - Orders and order line items
  - Order-status history
  - Meal-plan balance deductions and refunds
  - Transaction-log entries for every balance change
- Order confirmation and full student order history, both retrieved from SQLite
- A vendor dashboard backed entirely by SQLite: order retrieval, order-status transitions (with order rejection triggering an automatic meal-plan refund), menu retrieval, adding menu items, activating/deactivating menu items, toggling item availability, and updating operating hours
- Inactive vendors are locked out of the vendor dashboard and shown an account-deactivated message instead of their orders and menu
- An administrator vendor-management page backed by SQLite: viewing the full vendor directory, adding new vendors, activating/deactivating vendors, and updating vendor operating hours
- Administrator dashboard, reporting, and student-management pages, which still use prototype `localStorage` logic and have not yet been migrated

## User roles and workflows

### Student

- Begins at [index.html](index.html), selects the Student role, and continues to the simulated account-selection page in [login.html](login.html).
- [login.js](login.js) populates the student dropdown from `getStudents()` in [storage.js](storage.js), which still reads (and, if empty, seeds) student accounts from `localStorage` rather than the SQLite `User` table.
- Selecting a student account stores that account in `localStorage` as the active session and routes to [student-dashboard.html](student-dashboard.html).
- [student-dashboard.js](student-dashboard.js) retrieves active vendors from SQLite through `GET /api/vendors` and computes each vendor's open/closed status client-side from its stored operating hours.
- Selecting a vendor stores the selected vendor temporarily in `localStorage` and opens [menu.html](menu.html).
- [menu.js](menu.js) retrieves vendor-specific menu items through `GET /api/vendors/<vendor_id>/menu`, showing only items that are active and available.
- Menu items are added to a temporary shopping cart stored in `localStorage`.
- [checkout.js](checkout.js) sends the student ID, vendor ID, and cart item IDs/quantities to `POST /api/orders`.
- Flask re-validates the student's account status, the vendor's active status, each item's availability and database price, and the student's stored meal-plan balance before creating the order. It computes an authoritative subtotal, a 7.5% tax, and a total; if the total exceeds the stored balance, the order is rejected.
- On success, Flask writes the order, its line items, an initial `OrderStatus` row (`Pending`), the updated `MealPlanBalance`, and a `Deduction` row in `TransactionLog` in a single transaction, and returns the created order and new balance.
- [confirmation.js](confirmation.js) retrieves the completed order through `GET /api/orders/<order_id>`.
- [orders.js](orders.js) retrieves the student's full order history, with line items, through `GET /api/students/<student_id>/orders`.

### Vendor

- Selects the Vendor role from [index.html](index.html) and continues to [login.html](login.html).
- [login.js](login.js) loads the vendor dropdown through `GET /api/admin/vendors`, the same database-backed directory the administrator page uses, and labels deactivated vendors as `— Inactive`.
- Selecting a vendor account stores it as the active vendor session in `localStorage` and routes to [vendor-dashboard.html](vendor-dashboard.html).
- [vendor-dashboard.js](vendor-dashboard.js) loads the vendor's profile and orders through `GET /api/vendors/<vendor_id>/orders`. If the vendor is inactive, the dashboard replaces its content with an account-deactivated message and stops — the orders and menu tabs are never rendered.
- **Order management:** each order card shows the buttons valid for its current status, driven by the state machine `Pending → Accepted/Rejected → Preparing → Ready → Complete`. Every transition is submitted through `PATCH /api/orders/<order_id>/status` with the vendor ID, new status, and an optional note. Flask verifies the transition is legal, appends a row to `OrderStatus`, and — when the new status is `Rejected` — refunds the order's full total to the student's meal-plan balance and logs a `Refund` row in `TransactionLog`.
- **Menu management:** the menu tab loads all of the vendor's items (active and inactive) through `GET /api/vendors/<vendor_id>/menu?includeInactive=true`. Adding an item posts to `POST /api/vendors/<vendor_id>/menu`; toggling availability, deactivating, and reactivating an item all go through `PATCH /api/menu-items/<menu_item_id>`. Inactive vendors are blocked from adding menu items.
- **Operating hours:** the dashboard's hours panel updates the vendor's stored hours through `PATCH /api/vendors/<vendor_id>/hours` — the same endpoint used by the administrator vendor-management page. Inactive vendors cannot update their own hours.
- The open/closed status banner and the "no active menu items" warning banner are computed client-side from the operating hours and menu data Flask returns.

### Dining Services Administrator

- Selects the Administrator role from [index.html](index.html) and continues to [login.html](login.html).
- [login.js](login.js) populates the administrator dropdown from `getAdmins()` in [storage.js](storage.js), which still reads administrator accounts from seeded `localStorage` data rather than the SQLite `User` table.
- Selecting an administrator account stores it as the active session in `localStorage` and routes to [admin-dashboard.html](admin-dashboard.html), a static landing page linking to reporting, student management, and vendor management — it does not call any Flask API routes itself.
- **Vendor management** ([admin-vendors.html](admin-vendors.html) / [admin-vendors.js](admin-vendors.js)) is fully database-backed: the vendor directory loads through `GET /api/admin/vendors`; new vendors are created through `POST /api/admin/vendors`; activating/deactivating a vendor goes through `PATCH /api/admin/vendors/<vendor_id>/status`; and each row's operating-hours editor updates the vendor through `PATCH /api/vendors/<vendor_id>/hours`.
- **Reporting** ([admin-reports.html](admin-reports.html) / [admin-reports.js](admin-reports.js)) and **student management** ([admin-students.html](admin-students.html) / [admin-students.js](admin-students.js)) have not yet been migrated — both still read and write prototype data in `localStorage` and make no Flask API calls.

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
├── orders.html                 # Database-backed student order-history page
├── vendor-dashboard.html       # Database-backed vendor order and menu management interface
├── admin-dashboard.html        # Static administrator landing page (no API calls)
├── admin-reports.html          # Administrator reporting interface (prototype-backed)
├── admin-students.html         # Administrator student-management interface (prototype-backed)
├── admin-vendors.html          # Database-backed administrator vendor-management interface
│
├── login.js                    # Loads vendor accounts from Flask; students/admins still from localStorage
├── student-dashboard.js        # Loads active vendors through the Flask API
├── menu.js                     # Loads vendor-specific menu items through Flask
├── checkout.js                 # Manages the cart and creates orders through Flask
├── confirmation.js             # Retrieves one confirmed order from SQLite
├── orders.js                   # Loads a student's full order history through Flask
├── vendor-dashboard.js         # Database-backed vendor order, menu, and hours management logic
├── admin-vendors.js            # Database-backed administrator vendor-management logic
├── admin-reports.js            # Administrator reporting logic; migration still pending
├── admin-students.js           # Administrator student-management logic; migration still pending
├── storage.js                  # Remaining localStorage data, seed data, and session helpers
├── script.js                   # Unused legacy prototype script; no longer referenced by any page
├── styles.css                  # Shared application styles
├── CFL-Logo.png                # CampusFoodLink+ logo
│
├── app.py                      # Flask application, frontend routes, and API endpoints
├── database.py                 # SQLite connection helper with foreign keys enabled
├── schema.sql                  # Recreates the SQLite database schema
├── seed.py                     # Loads development users, vendors, menus, orders, and logs
├── campus_food_link.db         # Local generated SQLite database; not committed
│
├── requirements.txt            # Pinned Python dependency versions
├── README.md                   # Project setup, architecture, and development status
├── .github/workflows/static.yml  # Legacy GitHub Pages workflow for static deployment
├── .vscode/                    # VS Code project settings
└── .gitignore
```

## Current architecture

CampusFoodLink+ is now a single integrated Flask application rather than two separate systems. Flask serves the existing HTML, CSS, JavaScript, and image files, and the browser interface uses the Fetch API to request and update shared data. For the student, vendor, and administrator vendor-management workflows, Flask reads from and writes to the SQLite database; the remaining prototype workflows still read and write `localStorage` directly in the browser.

```text
┌────────────────────────────────────────────┐
│ Browser interface                          │
│ HTML / CSS / JavaScript                    │
│                                             │
│ Still uses localStorage for:               │
│ • Simulated login sessions (all roles)     │
│ • Student and administrator account lists  │
│ • Temporary shopping cart                  │
│ • Selected vendor                          │
│ • Administrator reporting & student mgmt   │
└──────────────────┬──────────────────────────┘
                   │
                   │ Fetch API requests
                   ▼
┌────────────────────────────────────────────┐
│ Flask application                          │
│ app.py                                     │
│                                             │
│ Serves Student, Vendor, and Administrator   │
│ (vendor-management) workflows, including:  │
│ • GET  /api/vendors                        │
│ • GET  /api/vendors/<id>/menu               │
│ • POST /api/vendors/<id>/menu               │
│ • PATCH /api/menu-items/<id>                │
│ • PATCH /api/vendors/<id>/hours             │
│ • POST /api/orders                         │
│ • GET  /api/orders/<id>                     │
│ • GET  /api/students/<id>/orders            │
│ • GET  /api/vendors/<id>/orders             │
│ • PATCH /api/orders/<id>/status             │
│ • GET  /api/admin/vendors                   │
│ • POST /api/admin/vendors                  │
│ • PATCH /api/admin/vendors/<id>/status      │
└──────────────────┬──────────────────────────┘
                   │
                   │ Parameterized SQL queries
                   ▼
┌────────────────────────────────────────────┐
│ SQLite database                            │
│ campus_food_link.db                        │
│                                             │
│ Stores:                                    │
│ • Vendors and menu items                   │
│ • Users and meal-plan balances             │
│ • Orders and order items                   │
│ • Order-status history                     │
│ • Transaction records                      │
└────────────────────────────────────────────┘
```

## Local development setup

CampusFoodLink+ should be run through the Flask development server rather than opened directly through Live Server or GitHub Pages. Database-backed pages call Flask API routes and will not function correctly when opened as standalone static files.

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

Visiting that URL opens the CampusFoodLink+ application. Flask serves the frontend assets and provides the API endpoints used by the database-backed student, vendor, and administrator vendor-management workflows. The built-in Flask server is intended for local development only.

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

The development database is populated through `seed.py`. The Flask application queries and updates these tables during vendor browsing, menu retrieval and management, checkout, order creation, order-status transitions and refunds, balance deduction, transaction logging, order confirmation and history, and vendor account management.

## Current development status

### Completed

- **Flask application:** serves the browser interface and exposes all of the database-backed API endpoints listed in [Current architecture](#current-architecture).
- **SQLite database:** the seven-table schema is implemented, foreign keys are enabled for application connections, and development data is loaded through `seed.py`.
- **Student ordering workflow:** vendor browsing, menu browsing, checkout submission, order validation (student status, vendor status, item availability/price, meal-plan balance), order/line-item/status/balance/transaction persistence, order confirmation, and full order history are all backed by SQLite.
- **Vendor workflow:** the vendor account list (at login), the vendor dashboard, order retrieval, order-status transitions with a validated state machine, order rejection with automatic meal-plan refunds, order-status history, menu retrieval, adding menu items, activating/deactivating/reactivating menu items, availability toggling, and operating-hours updates are all backed by SQLite. Inactive vendors are locked out of the dashboard.
- **Administrator vendor management:** the vendor directory, adding vendors, activating/deactivating vendors, and updating vendor operating hours are backed by SQLite.

### In progress

- **Removing duplicated client-side state:** some database-backed values (for example, the meal-plan balance shown in page headers) are still cached in `localStorage` alongside their authoritative SQLite values, rather than being read from Flask on every page load.

### Remaining

- **Student and administrator account management:** the account lists shown at login for these two roles are still seeded and read from `localStorage` rather than the SQLite `User` table.
- **Administrator student management:** activating/deactivating student accounts and adjusting balances (`admin-students.js`) is still prototype-backed.
- **Administrator reporting:** `admin-reports.js` is still prototype-backed.
- **Authentication and session management:** there is no password verification, password hashing, or Flask session management for any role.
- **Shopping cart and session storage:** the cart, the selected vendor, and the simulated per-role login sessions remain in `localStorage`.
- **Removal of obsolete localStorage logic** once the remaining workflows above are migrated and tested.

## Planned Flask/SQLite refactor stages

The refactor is being done in the sequence below rather than as a single rewrite, so that the team always has a working application at each step and can test one change at a time instead of debugging several at once:

1. **Establish the Flask application and SQLite connection.** *(done)*
2. **Create and validate the database schema.** *(done)*
3. **Add development seed data.** *(done)*
4. **Serve the existing frontend pages through Flask.** *(done)*
5. **Replace hard-coded vendor and menu data with database queries.** *(done)*
6. **Move checkout and order creation to Flask/SQLite.** *(done — the shopping cart itself remains in `localStorage`, but order submission, validation, and persistence are fully database-backed)*
7. **Store orders, order items, order-status history, and transaction logs in SQLite.** *(done)*
8. **Connect the student order-history and confirmation pages to SQLite.** *(done)*
9. **Connect the vendor dashboard (orders, menu, operating hours) to SQLite.** *(done)*
10. **Connect administrator vendor management to SQLite.** *(done)*
11. **Connect administrator student management and reporting to SQLite.** *(pending)*
12. **Move student/administrator account lists and authentication onto SQLite with real session management.** *(pending)*
13. **Remove obsolete localStorage logic after replacement workflows are tested.** *(pending)*

## Known limitations

- **Authentication remains simulated for every role.** Users select seeded accounts from dropdowns. Password verification, password hashing, authorization enforcement, and Flask session management are not implemented.
- **Backend authorization is incomplete.** Current API calls accept user and vendor IDs supplied by the browser and do not verify an authenticated Flask session.
- **Student and administrator account lists are not yet database-backed.** The login page's student and administrator dropdowns still read from seeded `localStorage` data in `storage.js`; only the vendor account dropdown loads from SQLite (`GET /api/admin/vendors`). Flask still validates student IDs against the SQLite `User` table during checkout and order-history retrieval, so the two data sources must stay in sync in the seed data.
- **Administrator student management and reporting are not yet connected to SQLite.** `admin-students.js` and `admin-reports.js` make no Flask API calls.
- **The shopping cart remains in `localStorage`.**
- **Selected-vendor and simulated role sessions remain in `localStorage`.**
- **Some database-backed values are still mirrored into `localStorage`** for display purposes (for example, the header meal-plan balance), even though the authoritative value lives in SQLite.
- **Running `schema.sql` drops and recreates every table.**
- **Running `seed.py` replaces the local development data.**
- **GitHub Pages cannot run the Flask and SQLite backend.**
- **The Flask development server is not suitable for production deployment.**
- **`script.js` is an unused legacy file** from the original prototype and is not referenced by any current page.

## Git and collaboration notes

- `campus_food_link.db`, the `venv/` directory, `__pycache__/`, `*.pyc` files, and `.DS_Store` are all excluded via `.gitignore`. Regenerate your local database from `schema.sql` rather than committing the `.db` file — everyone's local database is disposable and rebuilt from the same schema.
- Because `schema.sql` starts with `DROP TABLE IF EXISTS` statements, re-running it wipes and rebuilds all tables — don't run it against a database with data you want to keep without backing it up first.
- The frontend and backend now share integrated student, vendor, and administrator vendor-management workflows. Changes to `app.py`, API-consuming JavaScript files, the SQL schema, or seed data may affect the same feature and should be tested together before merging. When opening a pull request, note in the description whether your change affects a prototype-backed workflow, a database-backed workflow, or both, since the refactor is intentionally incremental (see [Planned Flask/SQLite refactor stages](#planned-flasksqlite-refactor-stages)).
- If you add new Python dependencies, update `requirements.txt` (`pip freeze > requirements.txt`) in the same change so other contributors can install the same versions.

## Future enhancements

Beyond completing the refactor stages above, ideas that have come up but are not yet planned in detail:

- Real authentication (password hashing, Flask session management) once every role's login reads from the `User` table.
- Migrating the student and administrator account lists at login onto SQLite, matching the vendor login flow.
- Migrating administrator student management (account status, balance adjustments) onto SQLite and `TransactionLog`.
- Migrating administrator reporting onto SQLite-backed aggregate queries.
- Replacing the remaining `localStorage` session/cart state with server-side session management.
- Real-time or near-real-time order-status updates for students and vendors.
- Exporting admin reports (CSV/PDF) once reporting is backed by SQLite.
- Automated tests for the Flask routes and database logic.
- Removing unused legacy files (such as `script.js`) once confirmed obsolete.
