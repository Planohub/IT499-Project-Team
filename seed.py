from database import get_db_connection


def seed_database():
    connection = get_db_connection()

    try:
        cursor = connection.cursor()

        # Clear existing data in reverse foreign-key order.
        cursor.execute("DELETE FROM TransactionLog")
        cursor.execute("DELETE FROM OrderStatus")
        cursor.execute("DELETE FROM OrderItem")
        cursor.execute("DELETE FROM FoodOrder")
        cursor.execute("DELETE FROM MenuItem")
        cursor.execute("DELETE FROM User")
        cursor.execute("DELETE FROM Vendor")

        # -------------------------------------------------
        # Vendors
        # -------------------------------------------------
        vendors = [
            (
                1,
                "Quad Side Café",
                "Student Union, Room 102",
                "07:00 - 20:00",
                "Active",
            ),
            (
                2,
                "Brick Oven Pizza",
                "Dining Hall North",
                "11:00 - 23:00",
                "Active",
            ),
            (
                3,
                "Campus Juice Bar",
                "Recreation Center",
                "09:00 - 17:00",
                "Inactive",
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO Vendor (
                VendorID,
                VendorName,
                Location,
                OperatingHours,
                OperatingStatus
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            vendors,
        )

        # -------------------------------------------------
        # Users
        # -------------------------------------------------
        users = [
            (
                101,
                "Aydan",
                "Karimova",
                "aydan@student.university.edu",
                "hashed",
                "Student",
                None,
                75.50,
                "Active",
            ),
            (
                102,
                "John",
                "Doe",
                "jdoe@student.university.edu",
                "hashed",
                "Student",
                None,
                3.20,
                "Active",
            ),
            (
                201,
                "Vilmer",
                "Martin",
                "martin@vendor.cafe.com",
                "hashed",
                "Vendor",
                1,
                0.00,
                "Active",
            ),
            (
                202,
                "Jane",
                "Smith",
                "jsmith@vendor.pizza.com",
                "hashed",
                "Vendor",
                2,
                0.00,
                "Active",
            ),
            (
                301,
                "Kolab",
                "Heng",
                "heng@admin.dining.edu",
                "hashed",
                "Dining Services Administrator",
                None,
                0.00,
                "Active",
            ),
        ]

        cursor.executemany(
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
            users,
        )

        # -------------------------------------------------
        # Menu items
        # -------------------------------------------------
        menu_items = [
            (
                501,
                1,
                "Breakfast Sandwich",
                "Eggs, cheese, and bacon on brioche",
                5.50,
                1,
                1,
            ),
            (
                502,
                1,
                "Cold Brew Coffee",
                "House blend slow-steeped iced coffee",
                4.00,
                1,
                1,
            ),
            (
                505,
                1,
                "Avocado Toast",
                "Smashed avocado on sourdough",
                7.00,
                0,
                1,
            ),
            (
                503,
                2,
                "Pepperoni Slice",
                "Classic NY style pepperoni pizza",
                3.75,
                1,
                1,
            ),
            (
                504,
                2,
                "Garlic Knots (4pc)",
                "Baked dough tied with garlic butter",
                4.50,
                1,
                1,
            ),
            (
                601,
                3,
                "Strawberry Smoothie",
                "Fresh strawberry smoothie",
                5.99,
                0,
                0,
            ),
            (
                602,
                3,
                "Green Detox Juice",
                "Kale, apple, cucumber, and ginger",
                6.49,
                0,
                0,
            ),
            (
                603,
                3,
                "Mango Tango",
                "Mango, pineapple, and orange juice",
                5.49,
                0,
                0,
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO MenuItem (
                MenuItemID,
                VendorID,
                ItemName,
                Description,
                Price,
                IsAvailable,
                IsActive
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            menu_items,
        )

        # -------------------------------------------------
        # Orders
        # -------------------------------------------------
        orders = [
            (
                9001,
                101,
                1,
                "2026-07-05 12:15:00",
                16.13,
                "Complete",
                "2026-07-05 12:35:00",
            ),
            (
                9002,
                101,
                1,
                "2026-07-05 19:30:00",
                10.21,
                "Preparing",
                None,
            ),
            (
                9003,
                101,
                2,
                "2026-07-05 20:10:00",
                8.87,
                "Pending",
                None,
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO FoodOrder (
                OrderID,
                StudentID,
                VendorID,
                OrderDate,
                OrderTotal,
                CurrentStatus,
                CompletedTime
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            orders,
        )

        # -------------------------------------------------
        # Order items
        # -------------------------------------------------
        order_items = [
            (1, 9001, 501, 2, 5.50, 11.00),
            (2, 9001, 502, 1, 4.00, 4.00),
            (3, 9002, 501, 1, 5.50, 5.50),
            (4, 9002, 502, 1, 4.00, 4.00),
            (5, 9003, 503, 1, 3.75, 3.75),
            (6, 9003, 504, 1, 4.50, 4.50),
        ]

        cursor.executemany(
            """
            INSERT INTO OrderItem (
                OrderItemID,
                OrderID,
                MenuItemID,
                Quantity,
                UnitPrice,
                ItemTotal
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            order_items,
        )

        # -------------------------------------------------
        # Order-status history
        # -------------------------------------------------
        order_statuses = [
            (1, 9001, "Pending", "2026-07-05 12:15:00", 101, None),
            (2, 9001, "Accepted", "2026-07-05 12:18:00", 201, None),
            (3, 9001, "Preparing", "2026-07-05 12:20:00", 201, None),
            (4, 9001, "Ready", "2026-07-05 12:30:00", 201, None),
            (5, 9001, "Complete", "2026-07-05 12:35:00", 201, None),
            (6, 9002, "Pending", "2026-07-05 19:30:00", 101, None),
            (7, 9002, "Accepted", "2026-07-05 19:32:00", 201, None),
            (8, 9002, "Preparing", "2026-07-05 19:35:00", 201, None),
            (9, 9003, "Pending", "2026-07-05 20:10:00", 101, None),
        ]

        cursor.executemany(
            """
            INSERT INTO OrderStatus (
                OrderStatusID,
                OrderID,
                Status,
                ChangedAt,
                ChangedBy,
                Notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            order_statuses,
        )

        # -------------------------------------------------
        # Transaction logs
        # -------------------------------------------------
        transactions = [
            (
                80001,
                101,
                None,
                "Adjustment",
                90.50,
                0.00,
                90.50,
                "2026-07-01 08:00:00",
                301,
            ),
            (
                80002,
                101,
                9001,
                "Deduction",
                15.00,
                90.50,
                75.50,
                "2026-07-05 12:15:00",
                301,
            ),
            (
                80003,
                102,
                None,
                "Adjustment",
                3.20,
                0.00,
                3.20,
                "2026-07-01 08:00:00",
                301,
            ),
        ]

        cursor.executemany(
            """
            INSERT INTO TransactionLog (
                TransactionID,
                UserID,
                OrderID,
                TransactionType,
                Amount,
                PreviousBalance,
                PostBalance,
                CreatedAt,
                CreatedBy
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            transactions,
        )

        connection.commit()
        print("Database seeded successfully.")

    except Exception as error:
        connection.rollback()
        print(f"Unable to seed database: {error}")
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    seed_database()