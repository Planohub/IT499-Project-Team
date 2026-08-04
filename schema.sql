PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS TransactionLog;
DROP TABLE IF EXISTS OrderStatus;
DROP TABLE IF EXISTS OrderItem;
DROP TABLE IF EXISTS FoodOrder;
DROP TABLE IF EXISTS MenuItem;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Vendor;

CREATE TABLE Vendor (
    VendorID INTEGER PRIMARY KEY,
    VendorName TEXT NOT NULL,
    Location TEXT NOT NULL,
    OperatingHours TEXT NOT NULL DEFAULT '08:00 - 20:00',
    OperatingStatus TEXT NOT NULL
        CHECK (OperatingStatus IN ('Active', 'Inactive'))
);

CREATE TABLE User (
    UserID INTEGER PRIMARY KEY,
    FirstName TEXT NOT NULL,
    LastName TEXT NOT NULL,
    Email TEXT NOT NULL,
    Password TEXT NOT NULL,
    Role TEXT NOT NULL
        CHECK (Role IN (
            'Student',
            'Vendor',
            'Dining Services Administrator'
        )),
    VendorID INTEGER NULL,
    MealPlanBalance NUMERIC NOT NULL DEFAULT 0
        CHECK (MealPlanBalance >= 0),
    AccountStatus TEXT NOT NULL
        CHECK (AccountStatus IN ('Active', 'Inactive')),

    FOREIGN KEY (VendorID) REFERENCES Vendor(VendorID)
);

CREATE TABLE MenuItem (
    MenuItemID INTEGER PRIMARY KEY,
    VendorID INTEGER NOT NULL,
    ItemName TEXT NOT NULL,
    Description TEXT,
    Price NUMERIC NOT NULL
        CHECK (Price >= 0),
    ImageURL TEXT,             /* <--- ADDed this so that the vendor can upload images */
    IsAvailable INTEGER NOT NULL DEFAULT 0
        CHECK (IsAvailable IN (0, 1)),
    IsActive INTEGER NOT NULL DEFAULT 1
        CHECK (IsActive IN (0, 1)),

    FOREIGN KEY (VendorID) REFERENCES Vendor(VendorID)
);

CREATE TABLE FoodOrder (
    OrderID INTEGER PRIMARY KEY,
    StudentID INTEGER NOT NULL,
    VendorID INTEGER NOT NULL,
    OrderDate TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    OrderTotal NUMERIC NOT NULL
        CHECK (OrderTotal >= 0),
        CurrentStatus TEXT NOT NULL
            CHECK (
                CurrentStatus IN (
                    'Pending',
                    'Accepted',
                    'Rejected',
                    'Preparing',
                    'Ready',
                    'Complete'
                )
            ),
        CompletedTime TEXT NULL,

        FOREIGN KEY (StudentID) REFERENCES User(UserID),
        FOREIGN KEY (VendorID) REFERENCES Vendor(VendorID)
);

CREATE TABLE OrderItem (
    OrderItemID INTEGER PRIMARY KEY,
    OrderID INTEGER NOT NULL,
    MenuItemID INTEGER NOT NULL,
    Quantity INTEGER NOT NULL
        CHECK (Quantity > 0),
    UnitPrice NUMERIC NOT NULL
        CHECK (UnitPrice >= 0),
    ItemTotal NUMERIC NOT NULL
        CHECK (ItemTotal >= 0),
    
    FOREIGN KEY (OrderID) REFERENCES FoodOrder(OrderID),
    FOREIGN KEY (MenuItemID) REFERENCES MenuItem(MenuItemID)
);

CREATE TABLE OrderStatus (
    OrderStatusID INTEGER PRIMARY KEY,
    OrderID INTEGER NOT NULL,
    Status TEXT NOT NULL
        CHECK (
            Status IN (
                'Pending',
                'Accepted',
                'Rejected',
                'Preparing',
                'Ready',
                'Complete'
            )
        ),
    ChangedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ChangedBy INTEGER NOT NULL,
    Notes TEXT NULL,

    FOREIGN KEY (OrderID) REFERENCES FoodOrder(OrderID),
    FOREIGN KEY (ChangedBy) REFERENCES User(UserID)
);

CREATE TABLE TransactionLog (
    TransactionID INTEGER PRIMARY KEY,
    UserID INTEGER NOT NULL,
    OrderID INTEGER NULL,
    TransactionType TEXT NOT NULL
        CHECK (
            TransactionType IN (
                'Deduction',
                'Refund',
                'Adjustment'
            )
        ),
    Amount NUMERIC NOT NULL
        CHECK (Amount >= 0),
    PreviousBalance NUMERIC NOT NULL
        CHECK (PreviousBalance >= 0),
    PostBalance NUMERIC NOT NULL
        CHECK (PostBalance >= 0),
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CreatedBy INTEGER NOT NULL,

    FOREIGN KEY (UserID) REFERENCES User(UserID),
    FOREIGN KEY (OrderID) REFERENCES FoodOrder(OrderID),
    FOREIGN KEY (CreatedBy) REFERENCES User(UserID)
);

CREATE INDEX idx_user_vendor ON User(VendorID);
CREATE INDEX idx_menu_item_vendor ON MenuItem(VendorID);
CREATE INDEX idx_food_order_student ON FoodOrder(StudentID);
CREATE INDEX idx_food_order_vendor ON FoodOrder(VendorID);
CREATE INDEX idx_order_item_order ON OrderItem(OrderID);
CREATE INDEX idx_order_status_order ON OrderStatus(OrderID);
CREATE INDEX idx_transaction_user ON TransactionLog(UserID);