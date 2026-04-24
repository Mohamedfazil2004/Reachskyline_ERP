from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Add rework_count to automation_tasks
    try:
        db.session.execute(text("ALTER TABLE automation_tasks ADD COLUMN rework_count INT DEFAULT 0"))
        print("Added rework_count to automation_tasks")
    except Exception as e:
        print(f"rework_count might already exist: {e}")

    # Create Attendance table
    try:
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'Present',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY uq_user_date (user_id, date)
            )
        """))
        print("Created attendance table")
    except Exception as e:
        print(f"Error creating attendance table: {e}")

    db.session.commit()
