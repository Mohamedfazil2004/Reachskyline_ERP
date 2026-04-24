from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

def migrate():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        
        # 1. Update automation_tasks
        columns = [c['name'] for c in inspector.get_columns('automation_tasks')]
        
        new_columns = [
            ('caption_text', 'TEXT'),
            ('submission_caption', 'TEXT'),
            ('video_editor_id', 'INTEGER'),
            ('final_video_path', 'VARCHAR(255)'),
            ('editor_notes', 'TEXT'),
            ('started_at', 'DATETIME')
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding column {col_name} to automation_tasks")
                db.session.execute(text(f"ALTER TABLE automation_tasks ADD COLUMN {col_name} {col_type}"))
        
        # 2. Add video_editor_id foreign key if it's new
        # Note: MySQL syntax for adding foreign key
        try:
            db.session.execute(text("ALTER TABLE automation_tasks ADD CONSTRAINT fk_video_editor FOREIGN KEY (video_editor_id) REFERENCES users(id)"))
        except Exception as e:
            print(f"Note: Could not add FK constraint (maybe already exists): {e}")

        # 3. Create activity_logs table if not exists
        if 'activity_logs' not in inspector.get_table_names():
            print("Creating activity_logs table")
            db.session.execute(text("""
                CREATE TABLE activity_logs (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    task_id INTEGER,
                    user_id INTEGER NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    details TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES automation_tasks(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """))
        
        db.session.commit()
        print("Workflow migration complete.")

if __name__ == "__main__":
    migrate()
