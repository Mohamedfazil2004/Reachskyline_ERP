from app.extensions import db
from app import create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE automation_tasks ADD COLUMN work_date DATE"))
        db.session.commit()
        print("Successfully added work_date column to automation_tasks")
    except Exception as e:
        print(f"Error adding column: {e}")
