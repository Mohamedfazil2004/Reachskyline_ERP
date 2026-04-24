from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask

app = create_app()
with app.app_context():
    tasks = AutomationTask.query.all()
    count = 0
    for task in tasks:
        if task.status:
            # Simple title-casing or mapping for major ones
            old_status = task.status
            if old_status == 'assigned': task.status = 'Assigned'
            elif old_status == 'pending': task.status = 'Pending'
            elif old_status == 'rework': task.status = 'Rework Required (Writer)'
            elif old_status == 'completed': task.status = 'Completed'
            elif old_status == 'submitted': task.status = 'Submitted to BM'
            
            if task.status != old_status:
                count += 1
    
    db.session.commit()
    print(f"Normalized {count} task statuses.")
