from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask, MonthlyDeliverable

app = create_app()
with app.app_context():
    # Reset all completed_counts to 0 first
    deliverables = MonthlyDeliverable.query.all()
    for d in deliverables:
        d.completed_count = 0
    
    # Fetch all completed tasks from monthly source
    completed_tasks = AutomationTask.query.filter_by(status='Completed', source='monthly').all()
    print(f"Found {len(completed_tasks)} completed monthly tasks.")
    
    for task in completed_tasks:
        if task.month and task.year:
            deliverable = MonthlyDeliverable.query.filter_by(
                client_id=task.client_id,
                activity_type_id=task.activity_type_id,
                month=task.month,
                year=task.year
            ).first()
            if deliverable:
                deliverable.completed_count += 1
                print(f"Incremented for Client {task.client_id}, Activity {task.activity_type_id}, Month {task.month}")
            else:
                print(f"Warning: No deliverable found for Client {task.client_id}, Activity {task.activity_type_id}, Month {task.month}")

    db.session.commit()
    print("Sync complete.")
