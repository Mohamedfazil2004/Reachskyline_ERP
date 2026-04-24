from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

def migrate():
    with app.app_context():
        # Check if column exists first
        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN employee_id VARCHAR(20) UNIQUE"))
            print("Added employee_id")
        except:
            print("employee_id already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN efficiency_score INT DEFAULT 5"))
            print("Added efficiency_score")
        except:
            print("efficiency_score already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN max_daily_capacity INT DEFAULT 5"))
            print("Added max_daily_capacity")
        except:
            print("max_daily_capacity already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN current_workload INT DEFAULT 0"))
            print("Added current_workload")
        except:
            print("current_workload already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN availability_status VARCHAR(20) DEFAULT 'Available'"))
            print("Added availability_status")
        except:
            print("availability_status already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN is_video_editor BOOLEAN DEFAULT FALSE"))
            print("Added is_video_editor")
        except:
            print("is_video_editor already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN is_content_writer BOOLEAN DEFAULT FALSE"))
            print("Added is_content_writer")
        except:
            print("is_content_writer already exists or error")

        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN is_graphic_designer BOOLEAN DEFAULT FALSE"))
            print("Added is_graphic_designer")
        except:
            print("is_graphic_designer already exists or error")

        db.session.commit()
        
        # Also create new tables
        db.create_all()
        print("Done.")

if __name__ == '__main__':
    migrate()
