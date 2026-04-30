from sqlalchemy import inspect, text
from app.database import engine


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    return column_name in [col["name"] for col in inspector.get_columns(table_name)]


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

    print("Schema migration complete.")


if __name__ == "__main__":
    run_migration()
