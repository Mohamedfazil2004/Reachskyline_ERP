from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

def fix_schema():
    with app.app_context():
        with db.engine.connect() as conn:
            # Handle activity_types
            try:
                conn.execute(text("ALTER TABLE activity_types ADD COLUMN code_id VARCHAR(10) UNIQUE"))
            except Exception: pass
            
            try:
                conn.execute(text("ALTER TABLE activity_types ADD COLUMN duration_minutes INTEGER DEFAULT 10"))
            except Exception: pass
            
            try:
                conn.execute(text("ALTER TABLE activity_types DROP COLUMN code"))
            except Exception: pass

            # Handle social_media_tasks
            try:
                conn.execute(text("ALTER TABLE social_media_tasks ADD COLUMN deadline DATE"))
            except Exception: pass
            
            try:
                conn.execute(text("ALTER TABLE social_media_tasks ADD COLUMN time_limit_minutes INTEGER DEFAULT 0"))
            except Exception: pass
            
            try:
                conn.execute(text("ALTER TABLE social_media_tasks ADD COLUMN actual_time_spent INTEGER DEFAULT 0"))
            except Exception: pass
            
            # Create system_settings table manually if it doesn't exist
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    `key` VARCHAR(50) UNIQUE NOT NULL,
                    `value` VARCHAR(255) NOT NULL,
                    description VARCHAR(255)
                )
            """))
            
            conn.commit()
            print("Database schema updated manually!")

if __name__ == '__main__':
    fix_schema()
