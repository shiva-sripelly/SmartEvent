from sqlalchemy import inspect, text
from app.database import engine


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


def table_exists(table_name: str) -> bool:
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def run_migration() -> None:
    print("Starting schema migration...")

    with engine.begin() as connection:
        if not column_exists("users", "role"):
            print("Adding users.role column...")
            connection.execute(
                text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'")
            )
        else:
            print("users.role already exists")

        if not column_exists("events", "organizer_id"):
            print("Adding events.organizer_id column...")
            connection.execute(
                text("ALTER TABLE events ADD COLUMN organizer_id INT NULL")
            )
        else:
            print("events.organizer_id already exists")

        print("Populating organizer_id from created_by where missing...")
        connection.execute(
            text(
                "UPDATE events SET organizer_id = created_by WHERE organizer_id IS NULL"
            )
        )

        print("Ensuring users.role has a default value...")
        connection.execute(
            text("UPDATE users SET role = 'USER' WHERE role IS NULL OR role = ''")
        )

        print("Normalizing legacy event status values...")
        connection.execute(text("UPDATE events SET status = 'UPCOMING' WHERE status = 'ACTIVE'"))
        connection.execute(text("UPDATE events SET status = 'COMPLETED' WHERE status = 'EXPIRED'"))
        connection.execute(text("UPDATE events SET status = 'CANCELLED' WHERE status = 'CANCELLED'"))

        if not table_exists("coupons"):
            print("Creating coupons table...")
            connection.execute(text("""
                CREATE TABLE coupons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    coupon_code VARCHAR(50) NOT NULL UNIQUE,
                    discount_type VARCHAR(20) NOT NULL,
                    discount_value FLOAT NOT NULL,
                    minimum_booking_amount FLOAT DEFAULT 0,
                    expiry_date DATETIME NOT NULL,
                    usage_limit INT NOT NULL,
                    used_count INT DEFAULT 0,
                    is_active INT DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """))
        else:
            print("coupons table already exists")

        if not table_exists("payments"):
            print("Creating payments table...")
            connection.execute(text("""
                CREATE TABLE payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    booking_id INT,
                    payment_method VARCHAR(50) NOT NULL,
                    payment_status VARCHAR(20) DEFAULT 'PENDING',
                    transaction_id VARCHAR(150) UNIQUE,
                    amount FLOAT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (booking_id) REFERENCES bookings(id)
                )
            """))
        else:
            print("payments table already exists")

        if not table_exists("reviews"):
            print("Creating reviews table...")
            connection.execute(text("""
                CREATE TABLE reviews (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    event_id INT,
                    rating INT NOT NULL,
                    review_text VARCHAR(1000),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (event_id) REFERENCES events(id)
                )
            """))
        else:
            print("reviews table already exists")

        if not table_exists("user_event_views"):
            print("Creating user_event_views table...")
            connection.execute(text("""
                CREATE TABLE user_event_views (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    event_id INT NOT NULL,
                    view_count INT DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_user_event_view UNIQUE (user_id, event_id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (event_id) REFERENCES events(id)
                )
            """))
        else:
            print("user_event_views table already exists")

        booking_columns = [
            ("coupon_id", "INT NULL"),
            ("discount_amount", "FLOAT DEFAULT 0"),
            ("final_amount", "FLOAT NULL"),
        ]
        for column_name, column_definition in booking_columns:
            if not column_exists("bookings", column_name):
                print(f"Adding bookings.{column_name} column...")
                connection.execute(
                    text(f"ALTER TABLE bookings ADD COLUMN {column_name} {column_definition}")
                )
            else:
                print(f"bookings.{column_name} already exists")

        print("Backfilling booking final_amount values...")
        connection.execute(
            text("UPDATE bookings SET final_amount = total_price WHERE final_amount IS NULL")
        )

        print("Ensuring demo coupon SMART20 exists...")
        connection.execute(text("""
            INSERT INTO coupons (
                coupon_code,
                discount_type,
                discount_value,
                minimum_booking_amount,
                expiry_date,
                usage_limit,
                used_count,
                is_active
            )
            SELECT
                'SMART20',
                'PERCENTAGE',
                20,
                100,
                '2027-12-31 23:59:59',
                500,
                0,
                1
            WHERE NOT EXISTS (
                SELECT 1 FROM coupons WHERE coupon_code = 'SMART20'
            )
        """))

        demo_coupons = [
            ("WELCOME10", "PERCENTAGE", 10, 50, "2027-12-31 23:59:59", 500),
            ("SAVE50", "FIXED", 50, 250, "2027-12-31 23:59:59", 300),
            ("MUSIC15", "PERCENTAGE", 15, 100, "2027-12-31 23:59:59", 250),
            ("FEST100", "FIXED", 100, 500, "2027-12-31 23:59:59", 200),
            ("VIP25", "PERCENTAGE", 25, 1000, "2027-12-31 23:59:59", 100),
        ]

        for coupon_code, discount_type, discount_value, minimum_amount, expiry_date, usage_limit in demo_coupons:
            print(f"Ensuring demo coupon {coupon_code} exists...")
            connection.execute(
                text("""
                    INSERT INTO coupons (
                        coupon_code,
                        discount_type,
                        discount_value,
                        minimum_booking_amount,
                        expiry_date,
                        usage_limit,
                        used_count,
                        is_active
                    )
                    SELECT
                        :coupon_code,
                        :discount_type,
                        :discount_value,
                        :minimum_amount,
                        :expiry_date,
                        :usage_limit,
                        0,
                        1
                    WHERE NOT EXISTS (
                        SELECT 1 FROM coupons WHERE coupon_code = :coupon_code
                    )
                """),
                {
                    "coupon_code": coupon_code,
                    "discount_type": discount_type,
                    "discount_value": discount_value,
                    "minimum_amount": minimum_amount,
                    "expiry_date": expiry_date,
                    "usage_limit": usage_limit,
                },
            )

    print("Schema migration complete.")


if __name__ == "__main__":
    run_migration()
