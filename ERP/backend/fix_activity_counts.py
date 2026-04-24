from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask, MonthlyDeliverable
from datetime import date
import sqlalchemy as sa

def fix_db_and_tasks():
    app = create_app()
    with app.app_context():
        # 1. Add columns if they don't exist (MySQL)
        try:
            db.session.execute(sa.text("ALTER TABLE automation_tasks ADD COLUMN month INTEGER NULL"))
            db.session.execute(sa.text("ALTER TABLE automation_tasks ADD COLUMN year INTEGER NULL"))
            db.session.commit()
            print("Columns month and year added.")
        except Exception as e:
            db.session.rollback()
            print(f"Columns might already exist or error: {e}")

        # 2. Populate month/year from assigned_date
        tasks = AutomationTask.query.all()
        for t in tasks:
            if t.assigned_date:
                t.month = t.assigned_date.month
                t.year = t.assigned_date.year
        db.session.commit()
        print(f"Populated month/year for {len(tasks)} tasks.")

        # 3. One-time validation: Fix over-generated tasks
        # We find groups of (client, activity, month, year) that exceed target
        deliverables = MonthlyDeliverable.query.all()
        for d in deliverables:
            all_tasks = AutomationTask.query.filter_by(
                client_id=d.client_id,
                activity_type_id=d.activity_type_id,
                month=d.month,
                year=d.year
            ).order_by(AutomationTask.id.asc()).all()

            if len(all_tasks) > d.monthly_target:
                over = len(all_tasks) - d.monthly_target
                print(f"CRITICAL: Found {len(all_tasks)} tasks for {d.client_id} (Target: {d.monthly_target}). Deleting {over} excess tasks.")
                
                # Delete the LATEST tasks (keep the ones with lower IDs/seq)
                excess_tasks = all_tasks[d.monthly_target:]
                for et in excess_tasks:
                    db.session.delete(et)
        
        db.session.commit()
        print("Cleanup completed.")

if __name__ == "__main__":
    fix_db_and_tasks()
