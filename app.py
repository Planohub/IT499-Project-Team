from flask import Flask, abort, send_from_directory
from flask import Flask, abort, jsonify, send_from_directory
from database import get_db_connection


app = Flask(__name__)

# Existing frontend files that Flask is allowed to serve.
ALLOWED_FRONTEND_FILES = {
    "index.html",
    "login.html",
    "student-dashboard.html",
    "student-dashboard.js",
    "menu.html",
    "menu.js",
    "checkout.html",
    "checkout.js",
    "confirmation.html",
    "confirmation.js",
    "orders.html",
    "orders.js",
    "vendor-dashboard.html",
    "vendor-dashboard.js",
    "admin-dashboard.html",
    "admin-reports.html",
    "admin-reports.js",
    "admin-students.html",
    "admin-students.js",
    "admin-vendors.html",
    "admin-vendors.js",
    "storage.js",
    "script.js",
    "styles.css",
    "CFL-Logo.png",
}


@app.route("/")
def home():
    """Serve the existing login page."""
    return send_from_directory(app.root_path, "index.html")


@app.route("/api/vendors")
def get_vendors():
    """Return active vendors from SQLite."""
    connection = get_db_connection()

    try:
        vendors = connection.execute(
            """
            SELECT
                VendorID,
                VendorName,
                Location,
                OperatingHours,
                OperatingStatus
            FROM Vendor
            WHERE OperatingStatus = ?
            ORDER BY VendorName
            """,
            ("Active",),
        ).fetchall()

        return jsonify([
            {
                "id": vendor["VendorID"],
                "name": vendor["VendorName"],
                "location": vendor["Location"],
                "operatingHours": vendor["OperatingHours"],
                "isActive": vendor["OperatingStatus"] == "Active",
            }
            for vendor in vendors
        ])

    finally:
        connection.close()

@app.route("/api/vendors/<int:vendor_id>/menu")
def get_vendor_menu(vendor_id):
    """Return active menu items for one vendor."""
    connection = get_db_connection()

    try:
        vendor = connection.execute(
            """
            SELECT
                VendorID,
                VendorName,
                OperatingStatus
            FROM Vendor
            WHERE VendorID = ?
            """,
            (vendor_id,),
        ).fetchone()

        if vendor is None:
            return jsonify({"error": "Vendor not found"}), 404

        menu_items = connection.execute(
            """
            SELECT
                MenuItemID,
                VendorID,
                ItemName,
                Description,
                Price,
                IsAvailable,
                IsActive
            FROM MenuItem
            WHERE VendorID = ?
              AND IsActive = 1
            ORDER BY ItemName
            """,
            (vendor_id,),
        ).fetchall()

        return jsonify({
            "vendor": {
                "id": vendor["VendorID"],
                "name": vendor["VendorName"],
                "isActive": vendor["OperatingStatus"] == "Active",
            },
            "menuItems": [
                {
                    "id": item["MenuItemID"],
                    "vendorId": item["VendorID"],
                    "name": item["ItemName"],
                    "description": item["Description"],
                    "price": float(item["Price"]),
                    "isAvailable": bool(item["IsAvailable"]),
                    "isActive": bool(item["IsActive"]),
                }
                for item in menu_items
            ],
        })

    finally:
        connection.close()


@app.route("/<path:filename>")
def frontend_file(filename):
    """Serve only approved frontend pages and assets."""
    if filename not in ALLOWED_FRONTEND_FILES:
        abort(404)

    return send_from_directory(app.root_path, filename)


if __name__ == "__main__":
    app.run(debug=True)