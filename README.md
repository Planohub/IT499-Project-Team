# CampusFoodLink+

CampusFoodLink+ is a smart campus dining platform being built for IT499. It is currently a **front-end prototype** — a set of static HTML pages backed by browser `localStorage` — that is in the process of being migrated to a **Flask + SQLite** application. This README explains what works today, what is still a placeholder, and how the two pieces of the codebase (the existing prototype and the in-progress backend) fit together.

If you're joining the project without deep familiarity with the code yet, read the [Current architecture](#current-architecture) and [Current development status](#current-development-status) sections first — they explain how the pieces connect before you dive into individual files.

## Table of contents

- [Purpose and problem addressed](#purpose-and-problem-addressed)
- [Current prototype capabilities](#current-prototype-capabilities)
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

## Current prototype capabilities

The prototype is a static multi-page site (plain HTML/CSS/JavaScript, no build step) that runs entirely in the browser. What currently works:

- **Login screen** ([index.html](index.html)) that routes to one of three dashboards based on the username entered.
- **Student ordering flow**: browsing a list of vendors, viewing a menu, adding items to a cart, adjusting quantities, and completing checkout.
- **Cart, order, and meal-plan balance persistence** using the browser's `localStorage` — data survives a page refresh but is local to that one browser.
- **Order confirmation page** that displays the order just placed, read back from `localStorage`.
- **Vendor dashboard shell** with navigation for Menu Management and Orders (pages/functionality not yet built — see [Known limitations](#known-limitations)).
- **Administrator dashboard and operational reports page** showing total revenue, total orders, average order value, per-vendor order volume/performance, top-selling menu items, and peak-demand time slots, computed from order data (see the note in [Known limitations](#known-limitations) about how this data is currently sourced).

## User roles and workflows

### Student

- Logs in from [index.html](index.html) and is routed to [student-dashboard.html](student-dashboard.html) (the vendor list).
- Selects a vendor, which opens [menu.html](menu.html) and stores the chosen vendor in `localStorage`.
- Adds menu items to a cart (handled by [script.js](script.js)), then proceeds to [checkout.html](checkout.html).
- [checkout.js](checkout.js) lets the student adjust quantities, remove items, clear the cart, and place the order. Placing an order deducts the total from a simulated meal-plan balance and redirects to [confirmation.html](confirmation.html), which reads the saved order back out of `localStorage` via [confirmation.js](confirmation.js).

### Vendor

- Logs in and is routed to [vendor-dashboard.html](vendor-dashboard.html).
- The dashboard shell includes navigation links for **Menu Management** and **Orders**, but these are placeholders (`href="#"`) — the underlying pages and functionality do not exist yet.
- Logout works and returns to the login screen.

### Dining Services administrator

- Logs in with the username `admin` and is routed to [admin-dashboard.html](admin-dashboard.html).
- The dashboard links to [admin-reports.html](admin-reports.html), which displays operational metrics computed by [admin-reports.js](admin-reports.js) (see [Known limitations](#known-limitations) for how "static" this data really is).
- The **Manage Vendors** and **Manage Students** links on the admin dashboard are placeholders and not yet implemented.

## Technology stack

**Current prototype**
- HTML5, CSS3 ([styles.css](styles.css)), and vanilla JavaScript (no frameworks, no build tooling, no package manager)
- Browser `localStorage` as the only data store

**In-progress backend**
- [Python 3](https://www.python.org/) (developed against Python 3.9)
- [Flask 3](https://flask.palletsprojects.com/) as the web framework
- [SQLite](https://www.sqlite.org/) as the database engine, accessed through Python's built-in `sqlite3` module

**Tooling**
- GitHub Actions workflow ([.github/workflows/static.yml](.github/workflows/static.yml)) that deploys the repository's static files to GitHub Pages on pushes to `main` — this currently serves the prototype pages directly and is unrelated to the Flask backend.

## Repository structure

```
.
├── index.html                # Login page (client-side role routing only)
├── student-dashboard.html    # Vendor list for students
├── menu.html                 # Menu for a selected vendor + "add to cart"
├── checkout.html             # Cart review and order placement
├── confirmation.html         # Order confirmation / receipt view
├── vendor-dashboard.html     # Vendor dashboard shell (mostly placeholder)
├── admin-dashboard.html      # Admin dashboard shell
├── admin-reports.html        # Admin operational reports page
├── script.js                 # Menu page logic (add items to cart)
├── vendors.js                # Vendor list page logic (select a vendor)
├── checkout.js               # Checkout page logic (cart, totals, place order)
├── confirmation.js           # Confirmation page logic (display placed order)
├── admin-reports.js          # Computes and renders the admin report tables
├── storage.js                # Shared localStorage helpers used by the pages above
├── styles.css                # Shared stylesheet for all prototype pages
│
├── app.py                    # Flask application entry point (currently minimal)
├── database.py                # SQLite connection helper used by the Flask app
├── schema.sql                 # SQL script that (re)creates all database tables
├── campus_food_link.db        # Local SQLite database file — generated, not committed
│
├── .github/workflows/static.yml  # GitHub Pages deployment workflow
├── .vscode/                      # Editor settings (VS Code Live Server recommendation, etc.)
└── .gitignore
```

A few notes on files that are easy to misread:

- **`storage.js`** is not a page by itself — it's a shared library of `localStorage` helper functions (`getCart`, `saveCart`, `getMealPlanBalance`, etc.) that every other prototype page's `<script>` tag depends on. It must be loaded before the page-specific script.
- **`database.py`** currently only opens a SQLite connection with foreign keys enabled and row-based results — it does not yet build the schema or seed data. That still has to be done by hand (see [Initializing the database](#initializing-the-sqlite-database-from-schemasql)).
- **`campus_food_link.db`** is the actual database file SQLite creates on disk. It is listed in `.gitignore` and should **never** be committed — everyone on the team generates their own copy locally from `schema.sql`.

## Current architecture

It helps to think of this repository as two systems that currently sit side by side rather than one integrated app:

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   Browser prototype          │        │   Flask / SQLite backend     │
│   (index.html, *.js, *.css) │        │   (app.py, database.py,      │
│                              │        │    schema.sql)                │
│  Reads/writes:               │        │  Reads/writes:                │
│   → browser localStorage     │        │   → campus_food_link.db      │
└──────────────────────────────┘        └──────────────────────────────┘
        ▲                                          ▲
        │ opened directly as static files           │ separate process,
        │ (e.g. via Live Server) or served           │ started with
        │ by GitHub Pages                            │ `python app.py`
```

**Nothing currently connects the two.** The HTML pages are not served by Flask, and none of the JavaScript talks to the Flask app or the SQLite database. Flask currently exposes a single route (`/`) that returns a plain text message confirming the server is running — it does not yet render any of the prototype's HTML pages or expose any data endpoints.

The [Planned Flask/SQLite refactor stages](#planned-flasksqlite-refactor-stages) section below describes how these two systems will be joined together over time.

## Local development setup

You can explore the browser prototype without installing anything beyond a browser and, optionally, a static file server (the VS Code "Live Server" extension is recommended in [.vscode/extensions.json](.vscode/extensions.json) since some browsers restrict `localStorage`/relative links when files are opened directly from disk).

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

The project currently depends on Flask. There is no `requirements.txt` in the repository yet, so install it directly:

```bash
pip install Flask
```

(The project was developed and tested against Flask 3.1.3. If a `requirements.txt` is added later, use `pip install -r requirements.txt` instead.)

### Starting the Flask development server

With the virtual environment active:

```bash
python app.py
```

This starts the Flask development server (with debug mode on) at `http://127.0.0.1:5000/`. Visiting that URL currently returns the plain text message `CampusFoodLink backend is running.` — this confirms Flask is installed and working, not that the full application is wired up yet.

### Initializing the SQLite database from schema.sql

There is currently no Python script that runs `schema.sql` for you, so it needs to be applied with the `sqlite3` command-line tool:

```bash
sqlite3 campus_food_link.db < schema.sql
```

This creates (or recreates — the script starts with `DROP TABLE IF EXISTS ...` for every table) `campus_food_link.db` in the repository root with the tables described below. This file is listed in `.gitignore` and should stay local to your machine.

## Database table overview

`schema.sql` defines seven tables, with foreign keys enforced (`PRAGMA foreign_keys = ON`):

| Table | Purpose |
|---|---|
| **Vendor** | Campus dining vendors — name, location, and whether they're currently active. |
| **User** | All accounts across all three roles (Student, Vendor, Dining Services administrator), including meal-plan balance and account status. A `VendorID` links vendor-role users to the vendor they belong to. |
| **MenuItem** | Menu items belonging to a vendor, with price and availability. |
| **FoodOrder** | An order placed by a student at a vendor, with its total and current status (`Pending` → `Accepted`/`Rejected` → `Preparing` → `Ready` → `Complete`). |
| **OrderItem** | The individual line items (menu item, quantity, price) that make up a `FoodOrder`. |
| **OrderStatus** | A history log of status changes for an order — who changed it, when, and any notes. |
| **TransactionLog** | A ledger of meal-plan balance changes (deductions, refunds, adjustments) tied to a user and, optionally, an order. |

Indexes are defined on the foreign-key columns (e.g. `idx_food_order_student`, `idx_menu_item_vendor`) to keep the common lookups (a student's orders, a vendor's menu, an order's line items) fast as data grows.

None of these tables are populated or queried by the application yet — the schema exists, but no seed data or query logic has been written.

## Current development status

- **Browser prototype:** Student ordering flow (browse → menu → cart → checkout → confirmation) works end-to-end against `localStorage`. Vendor and Admin dashboards exist as shells with placeholder navigation links for unbuilt features.
- **Flask backend:** Flask is installed and a minimal app starts successfully (`app.py`). No routes beyond `/` exist yet.
- **SQLite database:** `schema.sql` is written and creates all seven tables successfully. `database.py` provides a connection helper. No data has been seeded, and nothing in the app reads from or writes to the database yet.
- **Integration:** The frontend and backend are **not connected**. The prototype pages are not served by Flask, and no JavaScript makes requests to a Flask endpoint.

## Planned Flask/SQLite refactor stages

The refactor is being done in the sequence below rather than as a single rewrite, so that the team always has a working application at each step and can test one change at a time instead of debugging several at once:

1. **Establish the Flask application and SQLite connection.** *(done)* Get a minimal Flask app running and a working `sqlite3` connection helper, so later steps have a foundation to build on.
2. **Create and validate the database schema.** *(done)* Design and test `schema.sql` in isolation, before any application code depends on it, so schema mistakes are cheap to fix.
3. **Add development seed data.** Populate a few vendors, menu items, and test users so later stages have realistic data to query against instead of an empty database.
4. **Serve the existing frontend pages through Flask.** Have Flask return the current HTML pages (instead of opening the files directly in a browser), without changing their behavior yet. This proves the two systems can coexist before any data logic changes.
5. **Replace hard-coded vendor and menu data with database queries.** Swap the vendor list and menu items currently hard-coded in the HTML/JS for data pulled from the `Vendor` and `MenuItem` tables.
6. **Move cart and checkout processing away from localStorage.** Start handling cart state through Flask routes instead of purely in the browser, one page at a time.
7. **Store orders and order items in SQLite.** Persist placed orders into `FoodOrder` and `OrderItem` so orders are no longer lost when `localStorage` is cleared or a different device is used.
8. **Add order-status history and transaction logging.** Wire up `OrderStatus` (so status changes are tracked over time, not just the current value) and `TransactionLog` (so meal-plan balance changes are auditable).
9. **Connect vendor and administrator workflows.** Build the still-missing Menu Management, Orders, and reporting features against real database data, now that orders and menus are backed by SQLite.
10. **Remove obsolete localStorage logic only after database-backed workflows have been tested.** Cart, order, and balance code that reads/writes `localStorage` is only deleted once the equivalent database-backed flow has been verified to work — the goal is a gradual cutover, not a risky big-bang replacement.

## Known limitations

- **Login does not authenticate against the database.** [index.html](index.html) checks for the literal usernames `student`, `vendor`, or `admin` (case-insensitive) in client-side JavaScript and accepts any password. This matches the "demo credentials" shown on the login page but is not real authentication, and it does not consult the `User` table.
- **Menu items are not vendor-specific yet.** Selecting any vendor from the student dashboard opens the same fixed set of four menu items in [menu.html](menu.html); only the vendor name/location header text changes. Per-vendor menus are part of refactor stage 5 above.
- **Admin reports are computed from local order history, not a shared database — discrepancy to be aware of.** [admin-reports.js](admin-reports.js) calculates the report figures (revenue, order volume, top items, peak hours) from whatever orders exist in that browser's `localStorage`, and automatically seeds three mock orders if none exist yet. In other words, the numbers are *derived*, not hand-typed into the HTML — but because the underlying data is per-browser demo/mock data rather than a shared, persistent source, the reports behave like static/demo output today rather than a live operational dashboard. This will become genuinely dynamic once reporting is wired up to SQLite (refactor stage 9).
- **Vendor Menu Management and Orders are not implemented.** The links exist in [vendor-dashboard.html](vendor-dashboard.html) but point to `#` and have no backing pages or logic.
- **Admin "Manage Vendors" and "Manage Students" are not implemented.** Same placeholder pattern as above, in [admin-dashboard.html](admin-dashboard.html).
- **No `requirements.txt` exists yet.** Dependencies must currently be installed manually (see [Dependency installation](#dependency-installation)); adding one is a natural early step once more Python packages are introduced.
- **No automated database setup script.** `schema.sql` must be applied manually with the `sqlite3` CLI; there is no `init_db()`/seed script yet (planned as refactor stage 3).
- **The GitHub Pages workflow deploys the raw repository as static files.** It will serve the browser prototype correctly, but has no awareness of Flask or SQLite — it is not part of the backend refactor and would need to be reconsidered once the app depends on a running Flask server.

## Git and collaboration notes

- `campus_food_link.db`, the `venv/` directory, `__pycache__/`, `*.pyc` files, and `.DS_Store` are all excluded via `.gitignore`. Regenerate your local database from `schema.sql` rather than committing the `.db` file — everyone's local database is disposable and rebuilt from the same schema.
- Because `schema.sql` starts with `DROP TABLE IF EXISTS` statements, re-running it wipes and rebuilds all tables — don't run it against a database with data you want to keep without backing it up first.
- The prototype (HTML/CSS/JS) and the backend (Flask/SQLite) are being developed in the same repository but are largely independent right now. When opening a pull request, note in the description whether your change affects the prototype, the backend, or both, since the refactor is intentionally incremental (see [Planned Flask/SQLite refactor stages](#planned-flasksqlite-refactor-stages)).
- If you add new Python dependencies, consider generating a `requirements.txt` (`pip freeze > requirements.txt`) in the same change so other contributors can install the same versions.

## Future enhancements

Beyond completing the refactor stages above, ideas that have come up but are not yet planned in detail:

- Real authentication (password hashing, session management) once login is backed by the `User` table.
- Vendor-side menu editing (create/update/disable menu items) once Menu Management is implemented.
- Real-time or near-real-time order status updates for students and vendors.
- Exporting admin reports (CSV/PDF) once reporting is backed by SQLite.
- Automated tests for both the prototype JavaScript and the Flask routes/database logic.
