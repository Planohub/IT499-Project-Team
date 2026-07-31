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
    """Return active menu items for one vendor."""
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

@app.route("/<path:filename>")
def frontend_file(filename):
    """Serve only approved frontend pages and assets."""
    if filename not in ALLOWED_FRONTEND_FILES:
        abort(404)

    return send_from_directory(app.root_path, filename)


if __name__ == "__main__":
    app.run(debug=True)