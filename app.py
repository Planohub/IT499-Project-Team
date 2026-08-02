# Require the existing 24-hour format used throughout the prototype.
import re

from flask import Flask, abort, jsonify, request, send_from_directory
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
    """Return menu items for one vendor."""

    # Vendor management can request inactive items also.
    include_inactive = (
        request.args.get("includeInactive", "false").lower() == "true"
    )

    connection = get_db_connection()

    try:
        vendor = connection.execute(
            """
            SELECT
                VendorID,
                VendorName,
                Location,
                OperatingHours,
                OperatingStatus
            FROM Vendor
            WHERE VendorID = ?
            """,
            (vendor_id,),
        ).fetchone()

        if vendor is None:
            return jsonify({"error": "Vendor not found"}), 404

        # Vendor management includes active and deactivated items.
        if include_inactive:
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
                ORDER BY ItemName
                """,
                (vendor_id,),
            ).fetchall()

        # Student-facing menus only include active items.
        else:
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
                "location": vendor["Location"],
                "operatingHours": vendor["OperatingHours"],
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


@app.route("/api/vendors/<int:vendor_id>/menu", methods=["POST"])
def create_vendor_menu_item(vendor_id):
    """Create a new menu item for one vendor in SQLite."""

    # Read the JSON object sent by vendor-dashboard.js.
    menu_data = request.get_json(silent=True)

    if not isinstance(menu_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    # Retrieve and normalize the submitted form values.
    item_name = str(menu_data.get("name", "")).strip()
    description = str(menu_data.get("description", "")).strip()
    price = menu_data.get("price")

    # Validate the required item name.
    if not item_name:
        return jsonify({
            "error": "An item name is required"
        }), 400

    # Reject Boolean values because Python treats them as integers.
    if isinstance(price, bool) or not isinstance(price, (int, float)):
        return jsonify({
            "error": "A valid menu-item price is required"
        }), 400

    price = round(float(price), 2)

    if price <= 0:
        return jsonify({
            "error": "The menu-item price must be greater than zero"
        }), 400

    connection = get_db_connection()

    try:
        # Confirm that the target vendor exists.
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
            return jsonify({
                "error": "Vendor not found"
            }), 404

        # Prevent an inactive vendor from creating new menu items.
        if vendor["OperatingStatus"] != "Active":
            return jsonify({
                "error": "Inactive vendors cannot add menu items"
            }), 403

        # Insert the menu item as active and available by default.
        cursor = connection.execute(
            """
            INSERT INTO MenuItem (
                VendorID,
                ItemName,
                Description,
                Price,
                IsAvailable,
                IsActive
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                vendor_id,
                item_name,
                description or None,
                price,
                1,
                1,
            ),
        )

        menu_item_id = cursor.lastrowid

        connection.commit()

        # Return the new record in the same format used by the GET route.
        return jsonify({
            "message": "Menu item created successfully",
            "menuItem": {
                "id": menu_item_id,
                "vendorId": vendor_id,
                "name": item_name,
                "description": description or None,
                "price": price,
                "isAvailable": True,
                "isActive": True,
            },
        }), 201

    except Exception:
        # Undo the insert if any database operation fails.
        connection.rollback()
        raise

    finally:
        connection.close()

@app.route("/api/menu-items/<int:menu_item_id>", methods=["PATCH"])
def update_menu_item(menu_item_id):
    """Update availability or active status for one menu item."""

    # Read the JSON object sent by vendor-dashboard.js.
    menu_data = request.get_json(silent=True)

    if not isinstance(menu_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    vendor_id = menu_data.get("vendorId")
    is_available = menu_data.get("isAvailable")
    is_active = menu_data.get("isActive")

    # Require the active vendor ID so vendors cannot edit other menus.
    if not isinstance(vendor_id, int):
        return jsonify({
            "error": "A valid vendor ID is required"
        }), 400

    # Require at least one supported field.
    if is_available is None and is_active is None:
        return jsonify({
            "error": "At least one menu-item property must be provided"
        }), 400

    if is_available is not None and not isinstance(is_available, bool):
        return jsonify({
            "error": "isAvailable must be true or false"
        }), 400

    if is_active is not None and not isinstance(is_active, bool):
        return jsonify({
            "error": "isActive must be true or false"
        }), 400

    connection = get_db_connection()

    try:
        # Confirm the item exists and belongs to the selected vendor.
        menu_item = connection.execute(
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
            WHERE MenuItemID = ?
            """,
            (menu_item_id,),
        ).fetchone()

        if menu_item is None:
            return jsonify({
                "error": "Menu item not found"
            }), 404

        if menu_item["VendorID"] != vendor_id:
            return jsonify({
                "error": (
                    "This menu item does not belong to "
                    "the selected vendor"
                )
            }), 403

        # Begin with the current database values.
        updated_availability = bool(menu_item["IsAvailable"])
        updated_active_status = bool(menu_item["IsActive"])

        if is_available is not None:
            updated_availability = is_available

        if is_active is not None:
            updated_active_status = is_active

        # Deactivated items must also be unavailable.
        if updated_active_status is False:
            updated_availability = False

        connection.execute(
            """
            UPDATE MenuItem
            SET IsAvailable = ?,
                IsActive = ?
            WHERE MenuItemID = ?
            """,
            (
                1 if updated_availability else 0,
                1 if updated_active_status else 0,
                menu_item_id,
            ),
        )

        connection.commit()

        return jsonify({
            "message": "Menu item updated successfully",
            "menuItem": {
                "id": menu_item_id,
                "vendorId": vendor_id,
                "name": menu_item["ItemName"],
                "description": menu_item["Description"],
                "price": float(menu_item["Price"]),
                "isAvailable": updated_availability,
                "isActive": updated_active_status,
            },
        })

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

@app.route("/api/vendors/<int:vendor_id>/hours", methods=["PATCH"])
def update_vendor_hours(vendor_id):
    """Update one vendor's operating hours in SQLite."""

    # Read the JSON object sent by vendor-dashboard.js.
    hours_data = request.get_json(silent=True)

    if not isinstance(hours_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    operating_hours = hours_data.get("operatingHours")

    if not isinstance(operating_hours, str):
        return jsonify({
            "error": "Operating hours must be provided as text"
        }), 400

    operating_hours = operating_hours.strip()

    hours_pattern = re.compile(
        r"^(?:[01]\d|2[0-3]):[0-5]\d"
        r"\s*-\s*"
        r"(?:[01]\d|2[0-3]):[0-5]\d$"
    )

    if not hours_pattern.fullmatch(operating_hours):
        return jsonify({
            "error": (
                "Operating hours must use the format "
                "HH:MM - HH:MM"
            )
        }), 400

    # Normalize optional spaces around the hyphen.
    opening_time, closing_time = [
        value.strip()
        for value in operating_hours.split("-", 1)
    ]

    normalized_hours = f"{opening_time} - {closing_time}"

    connection = get_db_connection()

    try:
        # Confirm that the vendor exists before updating it.
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
            return jsonify({
                "error": "Vendor not found"
            }), 404

        # Only active vendors may manage their operating hours.
        if vendor["OperatingStatus"] != "Active":
            return jsonify({
                "error": "Inactive vendors cannot update operating hours"
            }), 403

        connection.execute(
            """
            UPDATE Vendor
            SET OperatingHours = ?
            WHERE VendorID = ?
            """,
            (normalized_hours, vendor_id),
        )

        connection.commit()

        return jsonify({
            "message": "Operating hours updated successfully",
            "vendor": {
                "id": vendor_id,
                "name": vendor["VendorName"],
                "operatingHours": normalized_hours,
                "isActive": True,
            },
        })

    except Exception:
        # Undo the update if a database operation fails.
        connection.rollback()
        raise

    finally:
        connection.close()


@app.route("/api/orders", methods=["POST"])
def create_order():
    """Validate and create a student order in SQLite."""
    order_data = request.get_json(silent=True)

    if not isinstance(order_data, dict):
        return jsonify({"error": "A valid JSON request body is required"}), 400

    student_id = order_data.get("studentId")
    vendor_id = order_data.get("vendorId")
    cart_items = order_data.get("items")

    if not isinstance(student_id, int):
        return jsonify({"error": "A valid student ID is required"}), 400

    if not isinstance(vendor_id, int):
        return jsonify({"error": "A valid vendor ID is required"}), 400

    if not isinstance(cart_items, list) or len(cart_items) == 0:
        return jsonify({"error": "The order must contain at least one item"}), 400

    connection = get_db_connection()

    try:
        student = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                MealPlanBalance,
                AccountStatus
            FROM User
            WHERE UserID = ?
              AND Role = ?
            """,
            (student_id, "Student"),
        ).fetchone()

        if student is None:
            return jsonify({"error": "Student not found"}), 404

        if student["AccountStatus"] != "Active":
            return jsonify({"error": "Student account is inactive"}), 403

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

        if vendor["OperatingStatus"] != "Active":
            return jsonify({"error": "Vendor is inactive"}), 400

        validated_items = []
        subtotal = 0.0

        for cart_item in cart_items:
            if not isinstance(cart_item, dict):
                return jsonify({"error": "Invalid cart item"}), 400

            menu_item_id = cart_item.get("itemId")
            quantity = cart_item.get("quantity")

            if not isinstance(menu_item_id, int):
                return jsonify({
                    "error": "Every cart item must include a valid item ID"
                }), 400

            if not isinstance(quantity, int) or quantity <= 0:
                return jsonify({
                    "error": "Every cart item must have a positive quantity"
                }), 400

            menu_item = connection.execute(
                """
                SELECT
                    MenuItemID,
                    VendorID,
                    ItemName,
                    Price,
                    IsAvailable,
                    IsActive
                FROM MenuItem
                WHERE MenuItemID = ?
                  AND VendorID = ?
                """,
                (menu_item_id, vendor_id),
            ).fetchone()

            if menu_item is None:
                return jsonify({
                    "error": f"Menu item {menu_item_id} was not found"
                }), 400

            if not menu_item["IsActive"] or not menu_item["IsAvailable"]:
                return jsonify({
                    "error": f"{menu_item['ItemName']} is unavailable"
                }), 400

            unit_price = float(menu_item["Price"])
            item_total = round(unit_price * quantity, 2)
            subtotal += item_total

            validated_items.append({
                "menuItemId": menu_item["MenuItemID"],
                "name": menu_item["ItemName"],
                "quantity": quantity,
                "unitPrice": unit_price,
                "itemTotal": item_total,
            })

        subtotal = round(subtotal, 2)
        tax = round(subtotal * 0.075, 2)
        order_total = round(subtotal + tax, 2)

        previous_balance = float(student["MealPlanBalance"])

        if order_total > previous_balance:
            return jsonify({"error": "Insufficient meal-plan balance"}), 400

        new_balance = round(previous_balance - order_total, 2)

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO FoodOrder (
                StudentID,
                VendorID,
                OrderTotal,
                CurrentStatus
            )
            VALUES (?, ?, ?, ?)
            """,
            (student_id, vendor_id, order_total, "Pending"),
        )

        order_id = cursor.lastrowid

        for item in validated_items:
            cursor.execute(
                """
                INSERT INTO OrderItem (
                    OrderID,
                    MenuItemID,
                    Quantity,
                    UnitPrice,
                    ItemTotal
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    order_id,
                    item["menuItemId"],
                    item["quantity"],
                    item["unitPrice"],
                    item["itemTotal"],
                ),
            )

        cursor.execute(
            """
            INSERT INTO OrderStatus (
                OrderID,
                Status,
                ChangedBy,
                Notes
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                order_id,
                "Pending",
                student_id,
                "Order placed by student",
            ),
        )

        cursor.execute(
            """
            UPDATE User
            SET MealPlanBalance = ?
            WHERE UserID = ?
            """,
            (new_balance, student_id),
        )

        cursor.execute(
            """
            INSERT INTO TransactionLog (
                UserID,
                OrderID,
                TransactionType,
                Amount,
                PreviousBalance,
                PostBalance,
                CreatedBy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                student_id,
                order_id,
                "Deduction",
                order_total,
                previous_balance,
                new_balance,
                student_id,
            ),
        )

        connection.commit()

        created_order = connection.execute(
            """
            SELECT OrderDate
            FROM FoodOrder
            WHERE OrderID = ?
            """,
            (order_id,),
        ).fetchone()

        return jsonify({
            "message": "Order created successfully",
            "newBalance": new_balance,
            "order": {
                "orderId": order_id,
                "studentId": student_id,
                "vendorId": vendor_id,
                "vendorName": vendor["VendorName"],
                "orderDate": created_order["OrderDate"],
                "items": [
                    {
                        "itemId": item["menuItemId"],
                        "name": item["name"],
                        "price": item["unitPrice"],
                        "quantity": item["quantity"],
                        "total": item["itemTotal"],
                    }
                    for item in validated_items
                ],
                "subtotal": subtotal,
                "tax": tax,
                "total": order_total,
                "currentStatus": "Pending",
                "completedTime": None,
            },
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

@app.route("/api/orders/<int:order_id>")
def get_order(order_id):
    """Return one order and its line items from SQLite."""
    connection = get_db_connection()

    try:
        order = connection.execute(
            """
            SELECT
                FoodOrder.OrderID,
                FoodOrder.StudentID,
                FoodOrder.VendorID,
                FoodOrder.OrderDate,
                FoodOrder.OrderTotal,
                FoodOrder.CurrentStatus,
                FoodOrder.CompletedTime,
                Vendor.VendorName
            FROM FoodOrder
            JOIN Vendor
                ON Vendor.VendorID = FoodOrder.VendorID
            WHERE FoodOrder.OrderID = ?
            """,
            (order_id,),
        ).fetchone()

        if order is None:
            return jsonify({"error": "Order not found"}), 404

        order_items = connection.execute(
            """
            SELECT
                OrderItem.MenuItemID,
                MenuItem.ItemName,
                OrderItem.Quantity,
                OrderItem.UnitPrice,
                OrderItem.ItemTotal
            FROM OrderItem
            JOIN MenuItem
                ON MenuItem.MenuItemID = OrderItem.MenuItemID
            WHERE OrderItem.OrderID = ?
            ORDER BY OrderItem.OrderItemID
            """,
            (order_id,),
        ).fetchall()

        subtotal = round(
            sum(float(item["ItemTotal"]) for item in order_items),
            2,
        )

        total = float(order["OrderTotal"])
        tax = round(total - subtotal, 2)

        return jsonify({
            "orderId": order["OrderID"],
            "studentId": order["StudentID"],
            "vendorId": order["VendorID"],
            "vendorName": order["VendorName"],
            "orderDate": order["OrderDate"],
            "items": [
                {
                    "itemId": item["MenuItemID"],
                    "name": item["ItemName"],
                    "quantity": item["Quantity"],
                    "price": float(item["UnitPrice"]),
                    "total": float(item["ItemTotal"]),
                }
                for item in order_items
            ],
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "currentStatus": order["CurrentStatus"],
            "completedTime": order["CompletedTime"],
        })

    finally:
        connection.close()

@app.route("/api/students/<int:student_id>/orders")
def get_student_orders(student_id):
    """Return all orders and line items for one student."""
    connection = get_db_connection()

    try:
        student = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Role
            FROM User
            WHERE UserID = ?
            """,
            (student_id,),
        ).fetchone()

        if student is None or student["Role"] != "Student":
            return jsonify({"error": "Student not found"}), 404

        orders = connection.execute(
            """
            SELECT
                FoodOrder.OrderID,
                FoodOrder.StudentID,
                FoodOrder.VendorID,
                FoodOrder.OrderDate,
                FoodOrder.OrderTotal,
                FoodOrder.CurrentStatus,
                FoodOrder.CompletedTime,
                Vendor.VendorName
            FROM FoodOrder
            JOIN Vendor
                ON Vendor.VendorID = FoodOrder.VendorID
            WHERE FoodOrder.StudentID = ?
            ORDER BY FoodOrder.OrderDate DESC,
                     FoodOrder.OrderID DESC
            """,
            (student_id,),
        ).fetchall()

        order_results = []

        for order in orders:
            items = connection.execute(
                """
                SELECT
                    OrderItem.MenuItemID,
                    MenuItem.ItemName,
                    OrderItem.Quantity,
                    OrderItem.UnitPrice,
                    OrderItem.ItemTotal
                FROM OrderItem
                JOIN MenuItem
                    ON MenuItem.MenuItemID = OrderItem.MenuItemID
                WHERE OrderItem.OrderID = ?
                ORDER BY OrderItem.OrderItemID
                """,
                (order["OrderID"],),
            ).fetchall()

            order_results.append({
                "orderId": order["OrderID"],
                "studentId": order["StudentID"],
                "vendorId": order["VendorID"],
                "vendorName": order["VendorName"],
                "orderDate": order["OrderDate"],
                "total": float(order["OrderTotal"]),
                "currentStatus": order["CurrentStatus"],
                "completedTime": order["CompletedTime"],
                "items": [
                    {
                        "itemId": item["MenuItemID"],
                        "name": item["ItemName"],
                        "quantity": item["Quantity"],
                        "price": float(item["UnitPrice"]),
                        "total": float(item["ItemTotal"]),
                    }
                    for item in items
                ],
            })

        return jsonify({
            "student": {
                "id": student["UserID"],
                "firstName": student["FirstName"],
                "lastName": student["LastName"],
            },
            "orders": order_results,
        })

    finally:
        connection.close()

@app.route("/api/vendors/<int:vendor_id>/orders")
def get_vendor_orders(vendor_id):
    """Return one vendor profile and its orders from SQLite."""
    connection = get_db_connection()

    try:
        # Confirm that the vendor exists.
        vendor = connection.execute(
            """
            SELECT
                VendorID,
                VendorName,
                Location,
                OperatingHours,
                OperatingStatus
            FROM Vendor
            WHERE VendorID = ?
            """,
            (vendor_id,),
        ).fetchone()

        if vendor is None:
            return jsonify({"error": "Vendor not found"}), 404

        # Retrieve this vendor's orders, newest first.
        orders = connection.execute(
            """
            SELECT
                FoodOrder.OrderID,
                FoodOrder.StudentID,
                FoodOrder.VendorID,
                FoodOrder.OrderDate,
                FoodOrder.OrderTotal,
                FoodOrder.CurrentStatus,
                FoodOrder.CompletedTime,
                User.FirstName,
                User.LastName
            FROM FoodOrder
            JOIN User
                ON User.UserID = FoodOrder.StudentID
            WHERE FoodOrder.VendorID = ?
            ORDER BY FoodOrder.OrderDate DESC,
                     FoodOrder.OrderID DESC
            """,
            (vendor_id,),
        ).fetchall()

        order_results = []

        for order in orders:
            # Retrieve the line items for this order.
            items = connection.execute(
                """
                SELECT
                    OrderItem.MenuItemID,
                    MenuItem.ItemName,
                    OrderItem.Quantity,
                    OrderItem.UnitPrice,
                    OrderItem.ItemTotal
                FROM OrderItem
                JOIN MenuItem
                    ON MenuItem.MenuItemID = OrderItem.MenuItemID
                WHERE OrderItem.OrderID = ?
                ORDER BY OrderItem.OrderItemID
                """,
                (order["OrderID"],),
            ).fetchall()

            # Retrieve the most recent status-history record.
            latest_status = connection.execute(
                """
                SELECT
                    Status,
                    ChangedAt,
                    ChangedBy,
                    Notes
                FROM OrderStatus
                WHERE OrderID = ?
                ORDER BY ChangedAt DESC,
                         OrderStatusID DESC
                LIMIT 1
                """,
                (order["OrderID"],),
            ).fetchone()

            order_results.append({
                "orderId": order["OrderID"],
                "studentId": order["StudentID"],
                "studentName": (
                    f"{order['FirstName']} {order['LastName']}"
                ),
                "vendorId": order["VendorID"],
                "orderDate": order["OrderDate"],
                "total": float(order["OrderTotal"]),
                "currentStatus": order["CurrentStatus"],
                "completedTime": order["CompletedTime"],
                "latestStatusNote": (
                    latest_status["Notes"]
                    if latest_status is not None
                    else None
                ),
                "items": [
                    {
                        "itemId": item["MenuItemID"],
                        "name": item["ItemName"],
                        "quantity": item["Quantity"],
                        "price": float(item["UnitPrice"]),
                        "total": float(item["ItemTotal"]),
                    }
                    for item in items
                ],
            })

        return jsonify({
            "vendor": {
                "id": vendor["VendorID"],
                "name": vendor["VendorName"],
                "location": vendor["Location"],
                "operatingHours": vendor["OperatingHours"],
                "isActive": (
                    vendor["OperatingStatus"] == "Active"
                ),
            },
            "orders": order_results,
        })

    finally:
        connection.close()

@app.route("/api/orders/<int:order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    """Update an order status and append an audit-history record."""
    status_data = request.get_json(silent=True)

    if not isinstance(status_data, dict):
        return jsonify({"error": "A valid JSON request body is required"}), 400

    vendor_id = status_data.get("vendorId")
    new_status = status_data.get("status")
    notes = status_data.get("notes")

    if not isinstance(vendor_id, int):
        return jsonify({"error": "A valid vendor ID is required"}), 400

    allowed_transitions = {
        "Pending": {"Accepted", "Rejected"},
        "Accepted": {"Preparing", "Rejected"},
        "Preparing": {"Ready"},
        "Ready": {"Complete"},
        "Complete": set(),
        "Rejected": set(),
    }

    connection = get_db_connection()

    try:
        order = connection.execute(
            """
            SELECT
                OrderID,
                StudentID,
                VendorID,
                OrderTotal,
                CurrentStatus
            FROM FoodOrder
            WHERE OrderID = ?
            """,
            (order_id,),
        ).fetchone()

        if order is None:
            return jsonify({"error": "Order not found"}), 404

        if order["VendorID"] != vendor_id:
            return jsonify({
                "error": "This order does not belong to the selected vendor"
            }), 403

        current_status = order["CurrentStatus"]
        valid_next_statuses = allowed_transitions.get(current_status, set())

        if new_status not in valid_next_statuses:
            return jsonify({
                "error": (
                    f"Order cannot move from {current_status} "
                    f"to {new_status}"
                )
            }), 400

        # Use the vendor's active user account as the audit user.
        vendor_user = connection.execute(
            """
            SELECT UserID
            FROM User
            WHERE VendorID = ?
              AND Role = ?
              AND AccountStatus = ?
            ORDER BY UserID
            LIMIT 1
            """,
            (vendor_id, "Vendor", "Active"),
        ).fetchone()

        if vendor_user is None:
            return jsonify({
                "error": "No active vendor user was found"
            }), 400

        changed_by = vendor_user["UserID"]

        completed_time_sql = (
            "CURRENT_TIMESTAMP"
            if new_status == "Complete"
            else "NULL"
        )

        connection.execute(
            f"""
            UPDATE FoodOrder
            SET CurrentStatus = ?,
                CompletedTime = {completed_time_sql}
            WHERE OrderID = ?
            """,
            (new_status, order_id),
        )

        connection.execute(
            """
            INSERT INTO OrderStatus (
                OrderID,
                Status,
                ChangedBy,
                Notes
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                order_id,
                new_status,
                changed_by,
                notes,
            ),
        )

        refund = None

        # Rejected orders return the full charged amount to the student.
        if new_status == "Rejected":
            student = connection.execute(
                """
                SELECT MealPlanBalance
                FROM User
                WHERE UserID = ?
                """,
                (order["StudentID"],),
            ).fetchone()

            previous_balance = float(student["MealPlanBalance"])
            refund_amount = float(order["OrderTotal"])
            new_balance = round(previous_balance + refund_amount, 2)

            connection.execute(
                """
                UPDATE User
                SET MealPlanBalance = ?
                WHERE UserID = ?
                """,
                (new_balance, order["StudentID"]),
            )

            connection.execute(
                """
                INSERT INTO TransactionLog (
                    UserID,
                    OrderID,
                    TransactionType,
                    Amount,
                    PreviousBalance,
                    PostBalance,
                    CreatedBy
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    order["StudentID"],
                    order_id,
                    "Refund",
                    refund_amount,
                    previous_balance,
                    new_balance,
                    changed_by,
                ),
            )

            refund = {
                "amount": refund_amount,
                "newBalance": new_balance,
            }

        connection.commit()

        return jsonify({
            "message": "Order status updated successfully",
            "orderId": order_id,
            "previousStatus": current_status,
            "currentStatus": new_status,
            "notes": notes,
            "refund": refund,
        })

    except Exception:
        connection.rollback()
        raise

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