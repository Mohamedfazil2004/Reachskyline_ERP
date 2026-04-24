from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Add rough_cut_video_path to automation_tasks
    try:
        db.session.execute(text("ALTER TABLE automation_tasks ADD COLUMN rough_cut_video_path TEXT"))
        print("Added rough_cut_video_path to automation_tasks")
    except Exception as e:
        print(f"Column might already exist: {e}")

    # Add submission_thumbnail_path to automation_tasks (for the writer's image upload)
    try:
        db.session.execute(text("ALTER TABLE automation_tasks ADD COLUMN submission_thumbnail_path TEXT"))
        print("Added submission_thumbnail_path to automation_tasks")
    except Exception as e:
        print(f"Column might already exist: {e}")

    db.session.commit()
