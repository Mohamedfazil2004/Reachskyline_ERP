from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Disable foreign key checks
        db.session.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        # Truncate/Delete from all relevant tables to ensure a fresh start
        tables = ['deliverables', 'monthly_plans', 'job_works', 'shoots', 'social_media_tasks', 'clients']
        for table in tables:
            try:
                db.session.execute(text(f"DELETE FROM {table}"))
                print(f"Cleared table: {table}")
            except Exception as tbl_err:
                print(f"Could not clear table {table} (might not exist): {tbl_err}")
        
        # Re-enable foreign key checks
        db.session.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        
        db.session.commit()
        print("Permanently deleted all clients and associated workflow data.")
    except Exception as e:
        db.session.rollback()
        print(f"Error during global deletion: {e}")
