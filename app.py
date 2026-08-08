import os
import re
import uuid

from werkzeug.utils import secure_filename
from flask import Flask, abort, jsonify, request, send_from_directory
from database import get_db_connection

app = Flask(__name__)

# --- NEW UPLOAD CONFIGURATION ---
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

ALLOWED_IMAGE_EXTENSIONS = {
    'png',
    'jpg',
    'jpeg'
}


def allowed_image_file(filename):
    """Return True if the uploaded file uses an allowed image extension."""
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS
    )

# Existing frontend files that Flask is allowed to serve.
ALLOWED_FRONTEND_FILES = {
    "index.html",
    "login.html",
    "login.js",
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

# Frontend routes
@app.route("/")
def home():
    """Serve the existing login page."""
    return send_from_directory(app.root_path, "index.html")

# Vendor API endpoints
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


# Admin-facing vendor management endpoints
@app.route("/api/admin/vendors")
def get_admin_vendors():
    """Return all vendors for administrator management."""

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
            ORDER BY VendorName
            """
        ).fetchall()

        return jsonify([
            {
                "id": vendor["VendorID"],
                "name": vendor["VendorName"],
                "location": vendor["Location"],
                "operatingHours": vendor["OperatingHours"],
                "isActive": (
                    vendor["OperatingStatus"] == "Active"
                ),
            }
            for vendor in vendors
        ])

    finally:
        connection.close()

# Admin-facing vendor creation endpoint
@app.route("/api/admin/vendors", methods=["POST"])
def create_admin_vendor():
    """Create a new campus vendor in SQLite."""

    # Read the JSON object sent by admin-vendors.js.
    vendor_data = request.get_json(silent=True)

    if not isinstance(vendor_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    # Normalize the submitted values.
    vendor_name = str(
        vendor_data.get("name", "")
    ).strip()

    location = str(
        vendor_data.get("location", "")
    ).strip()

    operating_hours = str(
        vendor_data.get(
            "operatingHours",
            "08:00 - 20:00"
        )
    ).strip()

    if not vendor_name:
        return jsonify({
            "error": "A vendor name is required"
        }), 400

    if not location:
        return jsonify({
            "error": "A campus location is required"
        }), 400

    # Validate the same 24-hour format used elsewhere in the application.
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

    opening_time, closing_time = [
        value.strip()
        for value in operating_hours.split("-", 1)
    ]

    normalized_hours = f"{opening_time} - {closing_time}"

    connection = get_db_connection()

    try:
        # Prevent duplicate vendor names in the development database.
        existing_vendor = connection.execute(
            """
            SELECT VendorID
            FROM Vendor
            WHERE LOWER(VendorName) = LOWER(?)
            """,
            (vendor_name,),
        ).fetchone()

        if existing_vendor is not None:
            return jsonify({
                "error": "A vendor with this name already exists"
            }), 409

        # New vendors begin as active.
        cursor = connection.execute(
            """
            INSERT INTO Vendor (
                VendorName,
                Location,
                OperatingHours,
                OperatingStatus
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                vendor_name,
                location,
                normalized_hours,
                "Active",
            ),
        )

        vendor_id = cursor.lastrowid

        next_vendor_user = connection.execute(
            """
            SELECT COALESCE(MAX(UserID), 200) + 1 AS NextVendorUserID
            FROM User
            WHERE Role = ?
                AND UserID BETWEEN 201 AND 299
            """,
            ("Vendor",),
        ).fetchone()

        vendor_user_id = next_vendor_user["NextVendorUserID"]

        if vendor_user_id > 299:
            return jsonify({
                "error": "No vendor user IDs are available"
            }), 400

        connection.execute(
            """
            INSERT INTO User (
                UserID,
                FirstName,
                LastName,
                Email,
                Password,
                Role,
                VendorID,
                MealPlanBalance,
                AccountStatus
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                vendor_user_id,
                vendor_name,
                "Vendor",
                f"vendor{vendor_id}@campusfoodlink.local",
                "simulated",
                "Vendor",
                vendor_id,
                0.00,
                "Active",
            ),
        )

        connection.commit()

        return jsonify({
            "message": "Vendor created successfully",
            "vendor": {
                "id": vendor_id,
                "name": vendor_name,
                "location": location,
                "operatingHours": normalized_hours,
                "isActive": True,
            },
            "vendorUser": {
                "id": vendor_user_id,
                "vendorId": vendor_id,
                "email": f"vendor{vendor_id}@campusfoodlink.local",
                "isActive": True,
            },
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# Admin-facing vendor status update endpoint
@app.route(
    "/api/admin/vendors/<int:vendor_id>/status",
    methods=["PATCH"]
)
def update_admin_vendor_status(vendor_id):
    """Activate or deactivate one vendor in SQLite."""

    # Read the JSON object sent by admin-vendors.js.
    status_data = request.get_json(silent=True)

    if not isinstance(status_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    is_active = status_data.get("isActive")

    if not isinstance(is_active, bool):
        return jsonify({
            "error": "isActive must be true or false"
        }), 400

    new_status = "Active" if is_active else "Inactive"

    connection = get_db_connection()

    try:
        # Confirm that the vendor exists.
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

        # Avoid unnecessary writes if the vendor already has this status.
        if vendor["OperatingStatus"] == new_status:
            return jsonify({
                "message": "Vendor status was already up to date",
                "vendor": {
                    "id": vendor_id,
                    "name": vendor["VendorName"],
                    "isActive": is_active,
                },
            })

        connection.execute(
            """
            UPDATE Vendor
            SET OperatingStatus = ?
            WHERE VendorID = ?
            """,
            (new_status, vendor_id),
        )

        connection.commit()

        return jsonify({
            "message": "Vendor status updated successfully",
            "vendor": {
                "id": vendor_id,
                "name": vendor["VendorName"],
                "isActive": is_active,
            },
        })

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# Admin-facing student retrieval endpoint
@app.route("/api/admin/students")
def get_admin_students():
    """Return all student accounts for administrator management."""

    connection = get_db_connection()

    try:
        students = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Email,
                MealPlanBalance,
                AccountStatus
            FROM User
            WHERE Role = ?
            ORDER BY LastName, FirstName, UserID
            """,
            ("Student",),
        ).fetchall()

        return jsonify([
            {
                "id": student["UserID"],
                "firstName": student["FirstName"],
                "lastName": student["LastName"],
                "email": student["Email"],
                "balance": float(student["MealPlanBalance"]),
                "accountStatus": student["AccountStatus"],
                "isActive": student["AccountStatus"] == "Active",
            }
            for student in students
        ])

    finally:
        connection.close()


# Admin-facing create student endpoint
@app.route("/api/admin/students", methods=["POST"])
def create_admin_student():
    """Create a new student account in SQLite."""

    # Read the JSON object sent by admin-students.js.
    student_data = request.get_json(silent=True)

    if not isinstance(student_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    first_name = str(
        student_data.get("firstName", "")
    ).strip()

    last_name = str(
        student_data.get("lastName", "")
    ).strip()

    email = str(
        student_data.get("email", "")
    ).strip()

    if not first_name:
        return jsonify({
            "error": "A first name is required"
        }), 400

    if not last_name:
        return jsonify({
            "error": "A last name is required"
        }), 400

    if not email:
        return jsonify({
            "error": "An email address is required"
        }), 400

    connection = get_db_connection()

    try:
        # Prevent duplicate accounts that use the same email address.
        existing_user = connection.execute(
            """
            SELECT UserID
            FROM User
            WHERE LOWER(Email) = LOWER(?)
            """,
            (email,),
        ).fetchone()

        if existing_user is not None:
            return jsonify({
                "error": "A user with this email address already exists"
            }), 409

        next_student = connection.execute(
            """
            SELECT COALESCE(MAX(UserID), 100) + 1 AS NextStudentID
            FROM User
            WHERE Role = ?
            AND UserID BETWEEN 101 AND 199
            """,
            ("Student",),
        ).fetchone()
        student_id = next_student["NextStudentID"]

        # New student accounts begin active with a zero balance.
        connection.execute(
            """
            INSERT INTO User (
                UserID,
                FirstName,
                LastName,
                Email,
                Password,
                Role,
                VendorID,
                MealPlanBalance,
                AccountStatus
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                student_id,
                first_name,
                last_name,
                email,
                "simulated",
                "Student",
                None,
                0.00,
                "Active",
            ),
        )

        # Record the account creation in the transaction log.
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
                student_id,
                None,
                "Adjustment",
                0.00,
                0.00,
                0.00,
                301,
            ),
        )

        connection.commit()

        return jsonify({
            "message": "Student account created successfully",
            "student": {
                "id": student_id,
                "firstName": first_name,
                "lastName": last_name,
                "email": email,
                "balance": 0.00,
                "accountStatus": "Active",
                "isActive": True,
            },
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# Admin-facing student status update endpoint
@app.route("/api/admin/students/<int:student_id>/status", methods=["PATCH"])
def update_admin_student_status(student_id):
    """Activate or deactivate one student account in SQLite."""

    status_data = request.get_json(silent=True)

    if not isinstance(status_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    account_status = status_data.get("accountStatus")

    if account_status not in ("Active", "Inactive"):
        return jsonify({
            "error": "Status must be Active or Inactive"
        }), 400

    connection = get_db_connection()

    try:
        # Confirm that the student exists before updating the account.
        student = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Email,
                MealPlanBalance,
                AccountStatus
            FROM User
            WHERE UserID = ?
              AND Role = ?
            """,
            (student_id, "Student"),
        ).fetchone()

        if student is None:
            return jsonify({
                "error": "Student not found"
            }), 404

        # Avoid an unnecessary database write.
        if student["AccountStatus"] == account_status:
            return jsonify({
                "message": "Student status was already up to date",
                "student": {
                    "id": student["UserID"],
                    "firstName": student["FirstName"],
                    "lastName": student["LastName"],
                    "email": student["Email"],
                    "balance": float(student["MealPlanBalance"]),
                    "accountStatus": student["AccountStatus"],
                    "isActive": (
                        student["AccountStatus"] == "Active"
                    ),
                },
            })

        connection.execute(
            """
            UPDATE User
            SET AccountStatus = ?
            WHERE UserID = ?
            """,
            (account_status, student_id),
        )

        connection.commit()

        return jsonify({
            "message": "Student status updated successfully",
            "student": {
                "id": student["UserID"],
                "firstName": student["FirstName"],
                "lastName": student["LastName"],
                "email": student["Email"],
                "balance": float(student["MealPlanBalance"]),
                "accountStatus": account_status,
                "isActive": account_status == "Active",
            },
        })

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

# Admin-facing student details endpoint
@app.route("/api/admin/students/<int:student_id>")
def get_admin_student_details(student_id):
    """Return one student, their orders, and transaction history."""

    connection = get_db_connection()

    try:
        # Retrieve the requested student account.
        student = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Email,
                MealPlanBalance,
                AccountStatus
            FROM User
            WHERE UserID = ?
              AND Role = ?
            """,
            (student_id, "Student"),
        ).fetchone()

        if student is None:
            return jsonify({
                "error": "Student not found"
            }), 404

        # Retrieve all orders placed by this student.
        orders = connection.execute(
            """
            SELECT
                FoodOrder.OrderID,
                FoodOrder.VendorID,
                Vendor.VendorName,
                FoodOrder.OrderDate,
                FoodOrder.OrderTotal,
                FoodOrder.CurrentStatus,
                FoodOrder.CompletedTime
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
            order_items = connection.execute(
                """
                SELECT
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

            subtotal = round(
                sum(
                    float(item["ItemTotal"])
                    for item in order_items
                ),
                2,
            )

            total = float(order["OrderTotal"])
            tax = round(total - subtotal, 2)

            order_results.append({
                "orderId": order["OrderID"],
                "vendorId": order["VendorID"],
                "vendorName": order["VendorName"],
                "orderDate": order["OrderDate"],
                "subtotal": subtotal,
                "tax": tax,
                "total": total,
                "currentStatus": order["CurrentStatus"],
                "completedTime": order["CompletedTime"],
                "items": [
                    {
                        "name": item["ItemName"],
                        "quantity": item["Quantity"],
                        "price": float(item["UnitPrice"]),
                        "total": float(item["ItemTotal"]),
                    }
                    for item in order_items
                ],
            })

        # Retrieve all balance transactions for this student.
        transactions = connection.execute(
            """
            SELECT
                TransactionLog.TransactionID,
                TransactionLog.OrderID,
                TransactionLog.TransactionType,
                TransactionLog.Amount,
                TransactionLog.PreviousBalance,
                TransactionLog.PostBalance,
                TransactionLog.CreatedAt,
                TransactionLog.CreatedBy,
                Creator.FirstName AS CreatorFirstName,
                Creator.LastName AS CreatorLastName,
                Creator.Role AS CreatorRole
            FROM TransactionLog
            JOIN User AS Creator
                ON Creator.UserID = TransactionLog.CreatedBy
            WHERE TransactionLog.UserID = ?
            ORDER BY TransactionLog.CreatedAt DESC,
                     TransactionLog.TransactionID DESC
            """,
            (student_id,),
        ).fetchall()

        return jsonify({
            "student": {
                "id": student["UserID"],
                "firstName": student["FirstName"],
                "lastName": student["LastName"],
                "email": student["Email"],
                "balance": float(student["MealPlanBalance"]),
                "accountStatus": student["AccountStatus"],
                "isActive": student["AccountStatus"] == "Active",
                "totalOrders": len(order_results),
            },
            "orders": order_results,
            "transactions": [
                {
                    "transactionId": transaction["TransactionID"],
                    "orderId": transaction["OrderID"],
                    "transactionType": (
                        transaction["TransactionType"]
                    ),
                    "amount": float(transaction["Amount"]),
                    "previousBalance": float(
                        transaction["PreviousBalance"]
                    ),
                    "postBalance": float(
                        transaction["PostBalance"]
                    ),
                    "createdAt": transaction["CreatedAt"],
                    "createdBy": transaction["CreatedBy"],
                    "createdByName": (
                        f"{transaction['CreatorFirstName']} "
                        f"{transaction['CreatorLastName']}"
                    ),
                    "createdByRole": transaction["CreatorRole"],
                }
                for transaction in transactions
            ],
        })

    finally:
        connection.close()

# Admin-facing student balance adjustment endpoint
@app.route(
    "/api/admin/students/<int:student_id>/funds",
    methods=["POST"]
)
def add_admin_student_funds(student_id):
    """Add funds to one student's meal-plan balance."""

    fund_data = request.get_json(silent=True)

    if not isinstance(fund_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    amount = fund_data.get("amount")

    if isinstance(amount, bool) or not isinstance(amount, (int, float)):
        return jsonify({
            "error": "A valid fund amount is required"
        }), 400

    amount = round(float(amount), 2)

    if amount <= 0:
        return jsonify({
            "error": "The fund amount must be greater than zero"
        }), 400

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
            return jsonify({
                "error": "Student not found"
            }), 404

        admin_user = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName
            FROM User
            WHERE Role = ?
              AND AccountStatus = ?
            ORDER BY UserID
            LIMIT 1
            """,
            (
                "Dining Services Administrator",
                "Active",
            ),
        ).fetchone()

        if admin_user is None:
            return jsonify({
                "error": "No active administrator account was found"
            }), 400

        previous_balance = float(
            student["MealPlanBalance"]
        )

        new_balance = round(
            previous_balance + amount,
            2,
        )

        connection.execute(
            """
            UPDATE User
            SET MealPlanBalance = ?
            WHERE UserID = ?
            """,
            (new_balance, student_id),
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
                student_id,
                None,
                "Adjustment",
                amount,
                previous_balance,
                new_balance,
                admin_user["UserID"],
            ),
        )

        connection.commit()

        return jsonify({
            "message": "Funds added successfully",
            "student": {
                "id": student_id,
                "firstName": student["FirstName"],
                "lastName": student["LastName"],
                "previousBalance": previous_balance,
                "amountAdded": amount,
                "newBalance": new_balance,
            },
            "createdBy": {
                "id": admin_user["UserID"],
                "name": (
                    f"{admin_user['FirstName']} "
                    f"{admin_user['LastName']}"
                ),
            },
        })

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

# Admin-facing operational reports endpoint
@app.route("/api/admin/reports")
def get_admin_reports():
    """Return operational reporting data from SQLite."""

    connection = get_db_connection()

    try:
        # --------------------------------------------------
        # OVERALL ORDER SUMMARY
        # --------------------------------------------------
        summary = connection.execute(
            """
            SELECT
                COUNT(*) AS TotalOrders,
                COALESCE(
                    SUM(
                        CASE
                            WHEN CurrentStatus != 'Rejected'
                            THEN OrderTotal
                            ELSE 0
                        END
                    ),
                    0
                ) AS TotalRevenue,
                COALESCE(
                    AVG(
                        CASE
                            WHEN CurrentStatus != 'Rejected'
                            THEN OrderTotal
                        END
                    ),
                    0
                ) AS AverageOrderValue
            FROM FoodOrder
            """
        ).fetchone()

        # --------------------------------------------------
        # VENDOR ORDER VOLUME AND PERFORMANCE
        # --------------------------------------------------
        vendor_rows = connection.execute(
            """
            SELECT
                Vendor.VendorID,
                Vendor.VendorName,
                COUNT(FoodOrder.OrderID) AS OrderCount,
                COALESCE(
                    SUM(
                        CASE
                            WHEN FoodOrder.CurrentStatus != 'Rejected'
                            THEN FoodOrder.OrderTotal
                            ELSE 0
                        END
                    ),
                    0
                ) AS TotalRevenue,
                COALESCE(
                    AVG(
                        CASE
                            WHEN FoodOrder.CurrentStatus != 'Rejected'
                            THEN FoodOrder.OrderTotal
                        END
                    ),
                    0
                ) AS AverageOrderValue
            FROM Vendor
            LEFT JOIN FoodOrder
                ON FoodOrder.VendorID = Vendor.VendorID
            GROUP BY
                Vendor.VendorID,
                Vendor.VendorName
            ORDER BY
                OrderCount DESC,
                Vendor.VendorName
            """
        ).fetchall()

        # --------------------------------------------------
        # TOP-SELLING MENU ITEMS
        # Rejected orders are excluded because they were refunded.
        # --------------------------------------------------
        item_rows = connection.execute(
            """
            SELECT
                MenuItem.MenuItemID,
                MenuItem.ItemName,
                SUM(OrderItem.Quantity) AS QuantitySold,
                SUM(OrderItem.ItemTotal) AS TotalRevenue
            FROM OrderItem
            JOIN FoodOrder
                ON FoodOrder.OrderID = OrderItem.OrderID
            JOIN MenuItem
                ON MenuItem.MenuItemID = OrderItem.MenuItemID
            WHERE FoodOrder.CurrentStatus != 'Rejected'
            GROUP BY
                MenuItem.MenuItemID,
                MenuItem.ItemName
            ORDER BY
                QuantitySold DESC,
                TotalRevenue DESC,
                MenuItem.ItemName
            """
        ).fetchall()

        # --------------------------------------------------
        # HOURLY ORDER DISTRIBUTION
        # SQLite returns the hour as 00 through 23.
        # --------------------------------------------------
        hourly_rows = connection.execute(
            """
            SELECT
                CAST(strftime('%H', OrderDate) AS INTEGER) AS OrderHour,
                COUNT(*) AS OrderCount
            FROM FoodOrder
            GROUP BY strftime('%H', OrderDate)
            ORDER BY OrderHour
            """
        ).fetchall()

        return jsonify({
            "summary": {
                "totalOrders": summary["TotalOrders"],
                "totalRevenue": float(summary["TotalRevenue"]),
                "averageOrderValue": float(
                    summary["AverageOrderValue"]
                ),
            },
            "vendorPerformance": [
                {
                    "vendorId": row["VendorID"],
                    "vendorName": row["VendorName"],
                    "orderCount": row["OrderCount"],
                    "totalRevenue": float(row["TotalRevenue"]),
                    "averageOrderValue": float(
                        row["AverageOrderValue"]
                    ),
                }
                for row in vendor_rows
            ],
            "buyingTrends": [
                {
                    "itemId": row["MenuItemID"],
                    "itemName": row["ItemName"],
                    "quantitySold": row["QuantitySold"],
                    "totalRevenue": float(row["TotalRevenue"]),
                }
                for row in item_rows
            ],
            "peakHours": [
                {
                    "hour": row["OrderHour"],
                    "orderCount": row["OrderCount"],
                }
                for row in hourly_rows
            ],
        })

    finally:
        connection.close()


# Vendor-facing menu retrieval endpoint
@app.route("/api/vendors/<int:vendor_id>/menu", methods=["GET"])
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

        # 🟢 Added ImageURL to the SELECT statement
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
                    IsActive,
                    ImageURL
                FROM MenuItem
                WHERE VendorID = ?
                ORDER BY ItemName
                """,
                (vendor_id,),
            ).fetchall()

        # 🟢 Added ImageURL to the SELECT statement
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
                    IsActive,
                    ImageURL
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
                    "imageUrl": item["ImageURL"] # 🟢 Tells the server to send the picture URL!
                }
                for item in menu_items
            ],
        })

    finally:
        connection.close()


# Vendor menu item creation endpoint
@app.route("/api/vendors/<int:vendor_id>/menu", methods=["POST"])
def add_menu_item(vendor_id):
    connection = get_db_connection()
    try:
        # 1. Get the text data from the form
        name = request.form.get("name")
        raw_price = request.form.get("price")
        description = request.form.get("description")
        
        # Validate inputs
        if not name or not raw_price:
            return jsonify({"error": "Name and price are required"}), 400
            
        try:
            price = float(raw_price)  # <-- This converts the price safely
        except ValueError:
            return jsonify({"error": "Invalid price format"}), 400

        # 2. Handle the optional image file.
        image_url = None

        if "image" in request.files:
            image_file = request.files["image"]

            if image_file and image_file.filename:

                if not allowed_image_file(image_file.filename):
                    return jsonify({
                        "error": "Only PNG and JPEG images are allowed"
                    }), 400

                original_filename = secure_filename(
                    image_file.filename
                )

                if not original_filename:
                    return jsonify({
                        "error": "Invalid image filename"
                    }), 400

                extension = os.path.splitext(
                    original_filename
                )[1].lower()

                filename = (
                    f"menu_new_"
                    f"{uuid.uuid4().hex}"
                    f"{extension}"
                )

                # Ensure uploads directory exists on every machine.
                os.makedirs(
                    app.config["UPLOAD_FOLDER"],
                    exist_ok=True
                )

                filepath = os.path.join(
                    app.config["UPLOAD_FOLDER"],
                    filename
                )

                image_file.save(filepath)

                image_url = (
                    f"/static/uploads/{filename}"
                )

        # 3. Insert into the database (including the new ImageURL)
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO MenuItem (VendorID, ItemName, Price, Description, ImageURL)
            VALUES (?, ?, ?, ?, ?)
            """,
            (vendor_id, name, price, description, image_url),
        )
        
        new_item_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Menu item added successfully",
            "menuItem": {
                "id": new_item_id,
                "name": name,
                "price": price,
                "description": description,
                "imageUrl": image_url
            }
        }), 201

    except Exception as e:
        connection.rollback()
        print(f"Error adding menu item: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500
    finally:
        connection.close()


# Image-update route
@app.route("/api/menu-items/<int:menu_item_id>/image", methods=["PATCH"])
def update_menu_item_image(menu_item_id):
    """Upload or replace the image for an existing menu item."""

    raw_vendor_id = request.form.get("vendorId")

    try:
        vendor_id = int(raw_vendor_id)
    except (TypeError, ValueError):
        return jsonify({
            "error": "A valid vendor ID is required"
        }), 400

    image_file = request.files.get("image")

    if not image_file or not image_file.filename:
        return jsonify({
            "error": "An image file is required"
        }), 400

    connection = get_db_connection()

    try:
        menu_item = connection.execute(
            """
            SELECT
                MenuItemID,
                VendorID,
                ImageURL
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
                "error": "This menu item does not belong to the selected vendor"
            }), 403

        if not allowed_image_file(image_file.filename):
            return jsonify({
                "error": "Only PNG and JPEG images are allowed"
            }), 400

        original_filename = secure_filename(image_file.filename)

        if not original_filename:
            return jsonify({
                "error": "Invalid image filename"
            }), 400

        extension = os.path.splitext(original_filename)[1].lower()

        filename = (
            f"menu_{menu_item_id}_"
            f"{uuid.uuid4().hex}"
            f"{extension}"
        )

        os.makedirs(
            app.config["UPLOAD_FOLDER"],
            exist_ok=True
        )

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )

        image_file.save(filepath)

        image_url = f"/static/uploads/{filename}"

        old_image_url = menu_item["ImageURL"]

        connection.execute(
            """
            UPDATE MenuItem
            SET ImageURL = ?
            WHERE MenuItemID = ?
            """,
            (
                image_url,
                menu_item_id,
            ),
        )

        connection.commit()

        # Remove the previous image if one existed and it is different.
        if old_image_url and old_image_url != image_url:
            old_filename = os.path.basename(old_image_url)

            old_filepath = os.path.join(
                app.config["UPLOAD_FOLDER"],
                old_filename
            )

            if os.path.exists(old_filepath):
                try:
                    os.remove(old_filepath)
                except OSError as error:
                    print(
                        f"Unable to remove old menu image: {error}"
                    )

        return jsonify({
            "message": "Menu item image updated successfully",
            "imageUrl": image_url
        })

    except Exception as error:
        connection.rollback()

        print(
            f"Error updating menu item image: {error}"
        )

        return jsonify({
            "error": "An internal server error occurred"
        }), 500

    finally:
        connection.close()

# Menu item update endpoint
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


# Vendor operating hours update endpoint
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


# Simulated student login accounts
@app.route("/api/login/students")
def get_student_login_accounts():
    """Return active student accounts for simulated login."""

    connection = get_db_connection()

    try:
        students = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Email,
                MealPlanBalance,
                AccountStatus
            FROM User
            WHERE Role = ?
              AND AccountStatus = ?
            ORDER BY LastName, FirstName, UserID
            """,
            (
                "Student",
                "Active",
            ),
        ).fetchall()

        return jsonify([
            {
                "id": student["UserID"],
                "firstName": student["FirstName"],
                "lastName": student["LastName"],
                "email": student["Email"],
                "balance": float(
                    student["MealPlanBalance"]
                ),
                "accountStatus": student["AccountStatus"],
                "isActive": True,
            }
            for student in students
        ])

    finally:
        connection.close()

# Simulated administrator login accounts
@app.route("/api/login/admins")
def get_admin_login_accounts():
    """Return active administrator accounts for simulated login."""

    connection = get_db_connection()

    try:
        admins = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Email,
                AccountStatus
            FROM User
            WHERE Role = ?
              AND AccountStatus = ?
            ORDER BY LastName, FirstName, UserID
            """,
            (
                "Dining Services Administrator",
                "Active",
            ),
        ).fetchall()

        return jsonify([
            {
                "id": admin["UserID"],
                "firstName": admin["FirstName"],
                "lastName": admin["LastName"],
                "email": admin["Email"],
                "accountStatus": admin["AccountStatus"],
                "isActive": True,
            }
            for admin in admins
        ])

    finally:
        connection.close()

# Student-facing profile endpoint
@app.route("/api/students/<int:student_id>/profile")
def get_student_profile(student_id):
    """Return one active student's current profile and balance."""

    connection = get_db_connection()

    try:
        student = connection.execute(
            """
            SELECT
                UserID,
                FirstName,
                LastName,
                Email,
                MealPlanBalance,
                AccountStatus
            FROM User
            WHERE UserID = ?
              AND Role = ?
            """,
            (student_id, "Student"),
        ).fetchone()

        if student is None:
            return jsonify({
                "error": "Student not found"
            }), 404

        if student["AccountStatus"] != "Active":
            return jsonify({
                "error": "Student account is inactive"
            }), 403

        return jsonify({
            "id": student["UserID"],
            "firstName": student["FirstName"],
            "lastName": student["LastName"],
            "email": student["Email"],
            "balance": float(student["MealPlanBalance"]),
            "accountStatus": student["AccountStatus"],
            "isActive": True,
        })

    finally:
        connection.close()

# Student order creation endpoint
@app.route("/api/orders", methods=["POST"])
def create_order():
    """Validate a cart and create vendor-specific orders in SQLite."""

    order_data = request.get_json(silent=True)

    if not isinstance(order_data, dict):
        return jsonify({
            "error": "A valid JSON request body is required"
        }), 400

    student_id = order_data.get("studentId")
    cart_items = order_data.get("items")

    if not isinstance(student_id, int):
        return jsonify({
            "error": "A valid student ID is required"
        }), 400

    if not isinstance(cart_items, list) or len(cart_items) == 0:
        return jsonify({
            "error": "The order must contain at least one item"
        }), 400

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
            return jsonify({
                "error": "Student account is inactive"
            }), 403

        # Group validated items by their actual vendor in SQLite.
        vendor_groups = {}

        for cart_item in cart_items:
            if not isinstance(cart_item, dict):
                return jsonify({
                    "error": "Invalid cart item"
                }), 400

            menu_item_id = cart_item.get("itemId")
            quantity = cart_item.get("quantity")

            if not isinstance(menu_item_id, int):
                return jsonify({
                    "error":
                        "Every cart item must include a valid item ID"
                }), 400

            if not isinstance(quantity, int) or quantity <= 0:
                return jsonify({
                    "error":
                        "Every cart item must have a positive quantity"
                }), 400

            menu_item = connection.execute(
                """
                SELECT
                    MenuItem.MenuItemID,
                    MenuItem.VendorID,
                    MenuItem.ItemName,
                    MenuItem.Price,
                    MenuItem.IsAvailable,
                    MenuItem.IsActive,
                    Vendor.VendorName,
                    Vendor.OperatingStatus
                FROM MenuItem
                JOIN Vendor
                    ON Vendor.VendorID = MenuItem.VendorID
                WHERE MenuItem.MenuItemID = ?
                """,
                (menu_item_id,),
            ).fetchone()

            if menu_item is None:
                return jsonify({
                    "error":
                        f"Menu item {menu_item_id} was not found"
                }), 400

            if not menu_item["IsActive"] or not menu_item["IsAvailable"]:
                return jsonify({
                    "error":
                        f"{menu_item['ItemName']} is unavailable"
                }), 400

            if menu_item["OperatingStatus"] != "Active":
                return jsonify({
                    "error":
                        f"{menu_item['VendorName']} is inactive"
                }), 400

            vendor_id = menu_item["VendorID"]
            unit_price = float(menu_item["Price"])
            item_total = round(unit_price * quantity, 2)

            if vendor_id not in vendor_groups:
                vendor_groups[vendor_id] = {
                    "vendorId": vendor_id,
                    "vendorName": menu_item["VendorName"],
                    "items": [],
                    "subtotal": 0.0,
                }

            vendor_groups[vendor_id]["items"].append({
                "menuItemId": menu_item["MenuItemID"],
                "name": menu_item["ItemName"],
                "quantity": quantity,
                "unitPrice": unit_price,
                "itemTotal": item_total,
            })

            vendor_groups[vendor_id]["subtotal"] += item_total

        # Calculate each vendor-specific order.
        combined_total = 0.0

        for group in vendor_groups.values():
            group["subtotal"] = round(group["subtotal"], 2)
            group["tax"] = round(group["subtotal"] * 0.075, 2)
            group["total"] = round(
                group["subtotal"] + group["tax"],
                2
            )

            combined_total += group["total"]

        combined_total = round(combined_total, 2)

        previous_balance = float(student["MealPlanBalance"])

        if combined_total > previous_balance:
            return jsonify({
                "error": "Insufficient meal-plan balance"
            }), 400

        cursor = connection.cursor()
        created_orders = []
        running_balance = previous_balance

        for group in vendor_groups.values():
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
                (
                    student_id,
                    group["vendorId"],
                    group["total"],
                    "Pending",
                ),
            )

            order_id = cursor.lastrowid

            for item in group["items"]:
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

            balance_before_order = running_balance

            running_balance = round(
                running_balance - group["total"],
                2
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
                    group["total"],
                    balance_before_order,
                    running_balance,
                    student_id,
                ),
            )

            created_order = connection.execute(
                """
                SELECT OrderDate
                FROM FoodOrder
                WHERE OrderID = ?
                """,
                (order_id,),
            ).fetchone()

            created_orders.append({
                "orderId": order_id,
                "studentId": student_id,
                "vendorId": group["vendorId"],
                "vendorName": group["vendorName"],
                "orderDate": created_order["OrderDate"],
                "items": [
                    {
                        "itemId": item["menuItemId"],
                        "name": item["name"],
                        "price": item["unitPrice"],
                        "quantity": item["quantity"],
                        "total": item["itemTotal"],
                    }
                    for item in group["items"]
                ],
                "subtotal": group["subtotal"],
                "tax": group["tax"],
                "total": group["total"],
                "currentStatus": "Pending",
                "completedTime": None,
            })

        new_balance = running_balance

        cursor.execute(
            """
            UPDATE User
            SET MealPlanBalance = ?
            WHERE UserID = ?
            """,
            (new_balance, student_id),
        )

        connection.commit()

        return jsonify({
            "message": "Order created successfully",
            "newBalance": new_balance,
            "orders": created_orders,

            # Preserve compatibility with existing
            # single-order frontend code.
            "order": created_orders[0],
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

# Fetch single order by ID and return details/line items
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


# Fetch all orders for a specific student by ID
@app.route("/api/students/<int:student_id>/orders")
def get_student_orders(student_id):
    connection = get_db_connection()
    try:
        # 🟢 o.* safely grabs your order columns, no matter what you named them!
        orders = connection.execute(
            """
            SELECT
                o.*,
                v.VendorName,
                (SELECT Status FROM OrderStatus WHERE OrderID = o.OrderID ORDER BY OrderStatusID DESC LIMIT 1) AS CurrentStatus,
                (SELECT Notes FROM OrderStatus WHERE OrderID = o.OrderID ORDER BY OrderStatusID DESC LIMIT 1) AS LatestStatusNote
            FROM FoodOrder o
            JOIN Vendor v ON o.VendorID = v.VendorID
            WHERE o.StudentID = ?
            ORDER BY o.OrderID DESC
            """,
            (student_id,),
        ).fetchall()

        order_list = []
        for order in orders:
            # 🟢 Dynamically figure out what your Total column is called
            keys = order.keys()
            total_val = 0.0
            if "OrderTotal" in keys:
                total_val = order["OrderTotal"]
            elif "Total" in keys:
                total_val = order["Total"]
            elif "TotalAmount" in keys:
                total_val = order["TotalAmount"]
            elif "Amount" in keys:
                total_val = order["Amount"]

            # 🟢 Dynamically figure out what your Date column is called
            date_val = "Unknown Date"
            if "OrderDate" in keys: date_val = order["OrderDate"]
            elif "CreatedAt" in keys: date_val = order["CreatedAt"]
            elif "Date" in keys: date_val = order["Date"]

            # Safely get the items
            items = connection.execute(
                """
                SELECT
                    mi.ItemName,
                    oi.Quantity,
                    (oi.Quantity * mi.Price) AS Total
                FROM OrderItem oi
                JOIN MenuItem mi ON oi.MenuItemID = mi.MenuItemID
                WHERE oi.OrderID = ?
                """,
                (order["OrderID"],),
            ).fetchall()

            order_list.append({
                "orderId": order["OrderID"],
                "vendorId": order["VendorID"],
                "vendorName": order["VendorName"],
                "orderDate": date_val,
                "total": float(total_val),
                "currentStatus": order["CurrentStatus"],
                "latestStatusNote": order["LatestStatusNote"],  # 🟢 The missing ETA Note!
                "items": [
                    {
                        "name": item["ItemName"],
                        "quantity": item["Quantity"],
                        "total": float(item["Total"])
                    }
                    for item in items
                ]
            })

        return jsonify({"orders": order_list})
        
    except Exception as e:
        # 🟢 If anything goes wrong, this prints the EXACT error to your terminal to make it easy to see!
        print(f"Error fetching student orders: {e}")
        return jsonify({"error": f"Database Error: {str(e)}"}), 500
    finally:
        connection.close()


# Fetch all orders for a specific vendor by ID
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