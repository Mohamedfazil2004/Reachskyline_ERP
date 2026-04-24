from app.extensions import db
from app import create_app
from app.models.automation import AutomationTask
from datetime import date

app = create_app()
with app.app_context():
    # Find tasks that are "finished" but have work_date = None or March 01
    tasks = AutomationTask.query.filter(
        AutomationTask.status.in_(['Submitted to BM', 'Video Submitted', 'Completed', 'Done', 'Assigned to Editor']),
        db.or_(AutomationTask.work_date == None, AutomationTask.work_date == date(2026, 3, 1))
    ).all()
    
    print(f"Found {len(tasks)} candidate tasks.")
    for t in tasks:
        # If it was assigned on March 01 and it's currently finished, 
        # let's assume the user wants it on March 02 if they said "today one completed"
        if t.assigned_date == date(2026, 3, 1):
            print(f"Updating task {t.id} ({t.activity_code}) from March 01 to March 02")
            t.work_date = date(2026, 3, 2)
    
    db.session.commit()
    print("Update complete.")
