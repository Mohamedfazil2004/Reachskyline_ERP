from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Add assignment_time column to automation_job_works
    try:
        db.session.execute(text("ALTER TABLE automation_job_works ADD COLUMN assignment_time DATETIME"))
        db.session.commit()
        print("Successfully added assignment_time column to automation_job_works")
    except Exception as e:
        print(f"Error or already exists: {e}")
        db.session.rollback()
