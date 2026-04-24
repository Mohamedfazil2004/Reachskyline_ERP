from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Check if assignment_status exists
        db.session.execute(text("SELECT assignment_status FROM social_media_tasks LIMIT 1"))
        print("Column assignment_status already exists.")
    except Exception:
        print("Adding column assignment_status...")
        db.session.execute(text("ALTER TABLE social_media_tasks ADD COLUMN assignment_status VARCHAR(50) DEFAULT 'Required'"))
        db.session.commit()
        print("Column added successfully.")
