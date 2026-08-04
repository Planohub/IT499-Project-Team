# CampusFoodLink+

CampusFoodLink+ is a smart campus dining platform built for IT499, bringing students, vendors, and dining services administrators onto one shared platform instead of disconnected tools (paper menus, siloed campus apps, spreadsheets). The project began as a browser-only HTML/CSS/JavaScript prototype using `localStorage` and has since been migrated into an integrated Flask + SQLite application.

Flask serves the frontend and the API. SQLite is authoritative for users, vendors, menu items, orders, order-status history, meal-plan balances, transaction logs, and administrative reports. `localStorage` is retained only for the shopping cart, the selected vendor, and simulated per-role login sessions — all intentionally temporary, browser-local state.

## Table of contents

- [Main capabilities](#main-capabilities)
- [User roles and workflows](#user-roles-and-workflows)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Architecture](#architecture)
- [Local development setup](#local-development-setup)
- [Database table overview](#database-table-overview)
- [API endpoint summary](#api-endpoint-summary)
- [Data integrity and business rules](#data-integrity-and-business-rules)
- [Current status](#current-status)
- [Known limitations](#known-limitations)
- [Testing and verification status](#testing-and-verification-status)
- [Git and collaboration notes](#git-and-collaboration-notes)
- [Future enhancements](#future-enhancements)

## Running the Project Locally with SQLite DB

CampusFoodLink+ now uses Flask and SQLite, so it must be run through the Flask development server rather than GitHub Pages or by opening the HTML files directly.

### Clone the Repository

```bash
git clone https://github.com/Planohub/IT499-Project-Team.git
cd IT499-Project-Team
git switch main
git pull
```

### macOS / Linux Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

### Windows PowerShell Setup

```powershell
py -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
py app.py
```

### Open the Application

Once Flask starts successfully, open the application in your browser:

```text
http://127.0.0.1:5000
```

Flask serves all frontend pages and API endpoints, while SQLite provides the shared application data used by students, vendors, and administrators.

### Development Database

The repository includes a populated `campus_food_link.db` development database containing sample users, vendors, menu items, orders, and reports. Team members who pull the latest `main` branch should have access to the same development data immediately after starting the application.

If the database ever needs to be recreated, run `schema.sql` to rebuild the database structure and then execute `seed.py` to repopulate the development data.

### Important Notes

- Do **not** open the HTML files directly in your browser.
- GitHub Pages cannot run the Flask backend or SQLite database and is no longer used for testing this project.
- All development and testing should be performed through the local Flask development server.

## Main capabilities

- Landing page with role selection (Student, Vendor, Administrator), and simulated login for all three, with account lists loaded from SQLite.
- Student browsing of active vendors (with client-computed open/closed status) and vendor-specific menus, a client-side shopping cart, and a checkout workflow that submits the cart to Flask for order creation.
- Order creation with server-side revalidation of student/vendor status, item availability and price, and balance sufficiency; subtotal, 7.5% tax, and total are all server-computed. A successful order writes the order, its line items, order-status history, balance deduction, and a transaction-log entry in a single transaction.
- Order confirmation and full student order history.
- A vendor dashboard for order retrieval and status transitions (rejecting an order triggers an automatic meal-plan refund and transaction-log entry), menu management (add/activate/deactivate/toggle availability), and operating-hours updates. Inactive vendors are locked out of restricted actions.
- Administrator vendor management (directory, creation — which also creates a linked vendor-role user account — activation/deactivation, hours updates), student management (directory, creation, activation/deactivation, order/transaction history, balance top-ups), and a reporting page (revenue summary, vendor performance, top items, peak order hours).

## User roles and workflows

### Student

Starts at [index.html](index.html) → [login.html](login.html), where [login.js](login.js) loads active student accounts via `GET /api/login/students`. The dashboard ([student-dashboard.js](student-dashboard.js)) loads profile/balance and active vendors, then routes into [menu.html](menu.html) for browsing and a `localStorage` cart. [checkout.js](checkout.js) submits the cart to `POST /api/orders`, which is fully revalidated server-side before being persisted. [confirmation.js](confirmation.js) and [orders.js](orders.js) retrieve the resulting order and order history from SQLite.

### Vendor

Selected from [index.html](index.html) via [login.html](login.html); [login.js](login.js) loads vendor accounts through `GET /api/admin/vendors` (the same directory the admin page uses), flagging inactive vendors. [vendor-dashboard.js](vendor-dashboard.js) loads orders and menu data; inactive vendors see an account-deactivated message instead of the dashboard. Order cards drive status transitions through the state machine `Pending → Accepted/Rejected → Preparing → Ready → Complete` via `PATCH /api/orders/<order_id>/status`. Menu items and operating hours are managed through their own PATCH/POST endpoints (see [API endpoint summary](#api-endpoint-summary)).

### Dining Services Administrator

Selected from [index.html](index.html) via [login.html](login.html); [login.js](login.js) loads admin accounts through `GET /api/login/admins`. [admin-dashboard.html](admin-dashboard.html) is a static landing page linking to three database-backed sections: vendor management ([admin-vendors.html](admin-vendors.html)/[admin-vendors.js](admin-vendors.js)), student management ([admin-students.html](admin-students.html)/[admin-students.js](admin-students.js)), and reporting ([admin-reports.html](admin-reports.html)/[admin-reports.js](admin-reports.js)). Creating a vendor also creates its linked vendor-role user account so the vendor can log in immediately; adding student funds writes an `Adjustment` row to `TransactionLog`.

## Technology stack

**Backend:** Python 3.9, Flask, SQLite, `sqlite3`
**Frontend:** HTML5, CSS3, Vanilla JavaScript, Fetch API

## Repository structure

```text
.
├── index.html                  # Role-selection landing page
├── login.html                  # Simulated role-specific login page
├── student-dashboard.html      # Student vendor-selection page
├── menu.html                   # Vendor menu page
├── checkout.html                # Cart review and order placement
├── confirmation.html           # Order confirmation page
├── orders.html                 # Student order-history page
├── vendor-dashboard.html       # Vendor order, menu, and hours management
├── admin-dashboard.html        # Static administrator landing page (no API calls)
├── admin-reports.html          # Administrator reporting interface
├── admin-students.html         # Administrator student-management interface
├── admin-vendors.html          # Administrator vendor-management interface
│
├── *.js                         # One script per HTML page above, calling the matching Flask API routes
├── storage.js                   # Temporary cart, selected-vendor, and simulated session state only
├── styles.css                   # Shared application styles
├── CFL-Logo.png                 # CampusFoodLink+ logo
│
├── app.py                      # Flask application, frontend routes, and API endpoints
├── database.py                 # SQLite connection helper with foreign keys enabled
├── schema.sql                  # Recreates the SQLite database schema
├── seed.py                     # Loads development users, vendors, menus, orders, and logs
├── campus_food_link.db          # Local generated SQLite database; not committed
│
├── requirements.txt             # Pinned Python dependency versions
├── README.md
├── .vscode/
└── .gitignore
```

## Architecture

CampusFoodLink+ is a single integrated Flask application. Flask serves the HTML/CSS/JS/image files and exposes the database-backed API; the browser uses the Fetch API to call it. Not every page hits the API — some, like the admin landing page, are static links to other pages.

```text
┌────────────────────────────────────────────┐
│ Browser interface (HTML / CSS / JavaScript)│
│ localStorage: login session, cart, vendor  │
└──────────────────┬──────────────────────────┘
                   │ Fetch API requests
                   ▼
┌────────────────────────────────────────────┐
│ Flask application (app.py)                 │
│ Serves the frontend + database-backed API  │
│ for login, students, vendors, orders, and  │
│ admin vendor/student/reports management    │
└──────────────────┬──────────────────────────┘
                   │ Parameterized SQL queries
                   ▼
┌────────────────────────────────────────────┐
│ SQLite (campus_food_link.db)               │
│ Users, vendors, menu items, orders/items,  │
│ order-status history, balances, tx log     │
└────────────────────────────────────────────┘
```

## Local development setup

Run CampusFoodLink+ through the Flask development server rather than Live Server or GitHub Pages — several pages depend on Flask API routes and will not function correctly as standalone static files.

1. **Create and activate a virtual environment** from the repository root:
   ```bash
   python3 -m venv venv
   python -m venv venv # Windows only
   source venv/bin/activate   # macOS / Linux
   venv\Scripts\Activate.ps1  # Windows PowerShell
   ```
   `venv/` is excluded via `.gitignore` — each contributor creates their own.
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Initialize the SQLite database** (no Python script does this yet, so use the `sqlite3` CLI):
   ```bash
   sqlite3 campus_food_link.db < schema.sql
   sqlite3 campus_food_link.db ".read schema.sql" #Windows Only
   ```
   This creates/recreates `campus_food_link.db` in the repository root. It's listed in `.gitignore` and stays local to each contributor.
4. **Load development seed data:**
   ```bash
   python seed.py
   ```
   This clears existing rows and inserts sample users, vendors, menu items, orders, order-status records, and transaction records — only run it against a disposable local database.
5. **Start the server:**
   ```bash
   python app.py
   ```
   This starts the Flask dev server (debug mode enabled) at `http://127.0.0.1:5000/`. The built-in server is for local development only.

## Database table overview

`schema.sql` defines seven tables, with foreign keys enforced (`PRAGMA foreign_keys = ON`):

| Table | Purpose |
|---|---|
| **Vendor** | Campus dining vendors: name, location, operating hours, active/inactive status. |
| **User** | Accounts for all three roles, including meal-plan balance and account status. `VendorID` links vendor-role users to their vendor. |
| **MenuItem** | Vendor-specific menu items with price, availability, and active/inactive state. |
| **FoodOrder** | An order placed by a student at a vendor, with total and current status. |
| **OrderItem** | Line items (menu item, quantity, price) making up a `FoodOrder`. |
| **OrderStatus** | History log of status changes — who, when, and any notes. |
| **TransactionLog** | Ledger of balance changes (deductions, refunds, adjustments) tied to a user and, optionally, an order. |

Indexes on foreign-key columns (e.g. `idx_food_order_student`, `idx_menu_item_vendor`) keep common lookups fast. The development database is populated through `seed.py`.

## API endpoint summary

All endpoints are defined in [app.py](app.py) (frontend page routing omitted).

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/login/students` | Active student accounts for login |
| GET | `/api/login/admins` | Active administrator accounts for login |
| GET | `/api/students/<student_id>/profile` | Profile and meal-plan balance for an active student |
| GET | `/api/students/<student_id>/orders` | A student's full order history with line items |
| GET | `/api/vendors` | Active vendors for student browsing |
| GET | `/api/vendors/<vendor_id>/menu` | Menu items for one vendor (`?includeInactive=true` for management) |
| POST | `/api/vendors/<vendor_id>/menu` | Create a new menu item |
| PATCH | `/api/menu-items/<menu_item_id>` | Update a menu item's availability/active status |
| PATCH | `/api/vendors/<vendor_id>/hours` | Update a vendor's operating hours |
| GET | `/api/vendors/<vendor_id>/orders` | A vendor's orders with line items and latest status note |
| POST | `/api/orders` | Validate a cart and create a new order |
| GET | `/api/orders/<order_id>` | Retrieve one order and its line items |
| PATCH | `/api/orders/<order_id>/status` | Transition an order's status, with automatic refund on rejection |
| GET | `/api/admin/vendors` | Full vendor directory (also used by vendor login) |
| POST | `/api/admin/vendors` | Create a vendor and its linked vendor-role user account |
| PATCH | `/api/admin/vendors/<vendor_id>/status` | Activate or deactivate a vendor |
| GET | `/api/admin/students` | Full student directory |
| POST | `/api/admin/students` | Create a new student account |
| PATCH | `/api/admin/students/<student_id>/status` | Activate or deactivate a student account |
| GET | `/api/admin/students/<student_id>` | One student's profile, orders, and transaction history |
| POST | `/api/admin/students/<student_id>/funds` | Add funds to a student's meal-plan balance |
| GET | `/api/admin/reports` | Revenue summary, vendor performance, top items, peak order hours |

## Data integrity and business rules

- Inactive students cannot place orders; inactive vendors cannot accept new orders or perform restricted management actions.
- Rejected orders refund the student's balance in full and log a `Refund` row in `TransactionLog`.
- Order-status transitions are validated server-side against the fixed state machine; illegal transitions are rejected.
- Menu-item prices and order totals are recalculated and validated server-side — the client-submitted cart is never trusted for pricing.
- Student IDs are allocated in the 101–199 range, vendor IDs in 201–299, and administrator IDs in 301+.
- Foreign keys are enabled on every SQLite connection (`PRAGMA foreign_keys = ON` in [database.py](database.py)).

## Current status

The Flask/SQLite migration is complete for the implemented workflows: student ordering, vendor order/menu/hours management, and administrator vendor/student/reporting management are all backed by SQLite, per [Main capabilities](#main-capabilities) and [API endpoint summary](#api-endpoint-summary). The seven-table schema is implemented with foreign keys enabled, and development data loads through `seed.py`.

## Known limitations

- **Authentication remains simulated for every role** — users select seeded accounts from dropdowns; there is no password verification or Flask session management.
- **No role-based authorization middleware.** API calls accept user/vendor IDs supplied by the browser without verifying an authenticated session.
- **No real-time synchronization between open browser tabs or devices** — changes are only seen after the next fetch/reload.
- Running `schema.sql` drops and recreates every table; running `seed.py` replaces the local development data.
- The Flask development server is not suitable for production, and there is no production hardening (HTTPS, WSGI server, secrets management).
- This is a prototype/coursework implementation, not a production-ready system.

## Testing and verification status

The following have been manually verified against the running Flask application and SQLite database: student ordering and the resulting balance deduction; vendor order-status updates, including rejection triggering a refund; administrator vendor and student management (creation, activation/deactivation, hours/balance updates); automatic creation of a linked vendor user on vendor creation; administrator reports; data persistence after a page refresh; and foreign-key integrity enforcement. No automated test suite exists yet; see [Future enhancements](#future-enhancements).

## Git and collaboration notes

- `campus_food_link.db`, `venv/`, `__pycache__/`, `*.pyc`, and `.DS_Store` are excluded via `.gitignore`. Regenerate your local database from `schema.sql` rather than committing the `.db` file.
- `schema.sql` starts with `DROP TABLE IF EXISTS` statements — re-running it wipes and rebuilds all tables, so back up any data you want to keep first.
- Changes to `app.py`, API-consuming JavaScript files, the SQL schema, or seed data may affect the same feature and should be tested together before merging.
- If you add Python dependencies, update `requirements.txt` (`pip freeze > requirements.txt`) in the same change.

## Future enhancements

- Real authentication (password hashing, Flask session management, role-based authorization middleware).
- Replacing the remaining `localStorage` session/cart state with server-side session management.
- Real-time or near-real-time order-status updates (polling or WebSockets) instead of manual refresh.
- Exporting admin reports (CSV/PDF).
- Automated tests for the Flask routes and database logic.
- Production deployment hardening (WSGI server, HTTPS, secrets management).
