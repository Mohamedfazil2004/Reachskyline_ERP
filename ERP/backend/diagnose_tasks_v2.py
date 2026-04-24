from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask
from app.models.user import User

app = create_app()
with app.app_context():
    # List all users to find one to test with, or just check the whole table
    print("--- Database Diagnostics ---")
    users = User.query.filter(User.role.in_(['Content Writer', 'Video Editor'])).all()
    print(f"Found {len(users)} employees.")
    
    active_statuses = [
        'Assigned', 'In Progress', 'Assigned to Editor', 
        'Rework Required (Writer)', 'Rework Required (Editor)',
        'Submitted to BM', 'Video Submitted', 'Completed'
    ]
    
    for u in users:
        tasks = AutomationTask.query.filter(
            db.or_(
                AutomationTask.assigned_employee_id == u.id,
                AutomationTask.video_editor_id == u.id
            ),
            AutomationTask.status.in_(active_statuses)
        ).all()
        
        if len(tasks) > 0:
            print(f"User: {u.name} (ID: {u.id}, Role: {u.role}) has {len(tasks)} tasks.")
            for t in tasks:
                print(f"  - Task ID: {t.id} | Status: '{t.status}' | Date: {t.assigned_date}")
        else:
            # Check if there are ANY tasks for this user with DIFFERENT statuses
            any_tasks = AutomationTask.query.filter(
                db.or_(
                    AutomationTask.assigned_employee_id == u.id,
                    AutomationTask.video_editor_id == u.id
                )
            ).all()
            if any_tasks:
                print(f"User: {u.name} (ID: {u.id}) has {len(any_tasks)} tasks but NONE match active statuses.")
                for t in any_tasks:
                    print(f"    [Status Mismatch] ID: {t.id} | Status: '{t.status}'")

    print("\n--- Task Table Summary ---")
    total = AutomationTask.query.count()
    print(f"Total tasks in DB: {total}")
    status_counts = db.session.query(AutomationTask.status, db.func.count(AutomationTask.id)).group_by(AutomationTask.status).all()
    for s, c in status_counts:
        print(f"Status '{s}': {c}")
