from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Check if assigned_to column exists in automation_job_works
    try:
        db.session.execute(text("ALTER TABLE automation_job_works ADD COLUMN assigned_to INTEGER REFERENCES users(id)"))
        db.session.commit()
        print("Columns added successfully")
    except Exception as e:
        print(f"Error or already exists: {e}")
        db.session.rollback()
