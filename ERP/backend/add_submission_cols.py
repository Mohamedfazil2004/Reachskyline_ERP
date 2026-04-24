from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

def migrate():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns('automation_tasks')]
        
        new_columns = [
            ('submission_title', 'VARCHAR(255)'),
            ('submission_description', 'TEXT'),
            ('submission_thumbnail', 'TEXT'),
            ('submission_reference', 'TEXT'),
            ('submission_file_path', 'VARCHAR(255)')
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding column {col_name} to automation_tasks")
                db.session.execute(text(f"ALTER TABLE automation_tasks ADD COLUMN {col_name} {col_type}"))
        
        db.session.commit()
        print("✅ Column migration successful.")

if __name__ == "__main__":
    migrate()
